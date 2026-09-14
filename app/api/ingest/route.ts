import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { buildPagedText } from "@/lib/pdf-text";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 24;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Formulário inválido." },
      { status: 400 }
    );
  }

  const materiaId = String(formData.get("materiaId") ?? "").trim();
  const file = formData.get("file");

  if (!materiaId) {
    return NextResponse.json(
      { error: "Matéria não informada." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Envie um arquivo PDF." },
      { status: 400 }
    );
  }

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { error: "Apenas arquivos PDF são aceitos." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "PDF muito grande (máximo 10 MB)." },
      { status: 400 }
    );
  }

  const { data: materia, error: materiaError } = await supabase
    .from("decks")
    .select("id, title")
    .eq("id", materiaId)
    .maybeSingle();

  if (materiaError || !materia) {
    return NextResponse.json(
      { error: "Matéria não encontrada." },
      { status: 404 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const contentHash = createHash("sha256").update(data).digest("hex");

  const { data: existing } = await supabase
    .from("source_files")
    .select("id, file_name")
    .eq("deck_id", materiaId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: `Este PDF já foi extraído nesta matéria (${existing.file_name}).`,
        duplicate: true,
        sourceFileId: existing.id,
      },
      { status: 409 }
    );
  }

  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const text = buildPagedText(
      result.pages,
      (result.text ?? "").trim()
    ).trim();
    const pages = result.total ?? result.pages?.length ?? 0;
    const charCount = text.length;

    const { data: saved, error: saveError } = await supabase
      .from("source_files")
      .insert({
        deck_id: materiaId,
        user_id: user.id,
        file_name: file.name,
        content_hash: contentHash,
        pages,
        char_count: charCount,
        extracted_text: text,
      })
      .select("id, file_name, pages, char_count, created_at")
      .single();

    if (saveError || !saved) {
      console.error("[ingest] falha ao salvar source_file", saveError);
      return NextResponse.json(
        {
          error:
            saveError?.message ??
            "Texto extraído, mas não foi possível salvar o arquivo.",
        },
        { status: 500 }
      );
    }

    let imagesSaved = 0;
    try {
      const imageResult = await parser.getImage({
        imageThreshold: 80,
        imageBuffer: true,
        imageDataUrl: false,
      });

      const flatImages: Array<{
        page: number;
        data?: Uint8Array;
        width?: number;
        height?: number;
        name?: string;
      }> = [];

      for (const pageImages of imageResult.pages ?? []) {
        const pageNum = pageImages.pageNumber ?? 0;
        for (const img of pageImages.images ?? []) {
          flatImages.push({
            page: pageNum,
            data: img.data,
            width: img.width,
            height: img.height,
            name: img.name,
          });
        }
      }

      for (const img of flatImages.slice(0, MAX_IMAGES)) {
        if (!img.data || img.data.byteLength < 200) continue;

        const path = `${user.id}/${materiaId}/${saved.id}/${Date.now()}-${imagesSaved}.png`;
        const { error: uploadError } = await supabase.storage
          .from("source-images")
          .upload(path, img.data, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          console.warn("[ingest] upload imagem falhou", uploadError.message);
          continue;
        }

        const { data: publicData } = supabase.storage
          .from("source-images")
          .getPublicUrl(path);

        const { error: imageRowError } = await supabase
          .from("source_images")
          .insert({
            deck_id: materiaId,
            source_file_id: saved.id,
            page: img.page || null,
            storage_path: path,
            public_url: publicData.publicUrl,
            width: img.width ?? null,
            height: img.height ?? null,
            label: null,
            label_hint: img.name ?? null,
          });

        if (!imageRowError) imagesSaved += 1;
      }
    } catch (imageError) {
      console.warn("[ingest] extração de imagens falhou", imageError);
    }

    console.log("[ingest] PDF extraído e salvo", {
      sourceFileId: saved.id,
      materiaId,
      materiaTitle: materia.title,
      fileName: file.name,
      pages,
      charCount,
      imagesSaved,
      preview: text.slice(0, 500),
    });

    return NextResponse.json({
      sourceFileId: saved.id,
      fileName: saved.file_name,
      pages: saved.pages,
      charCount: saved.char_count,
      text,
      imagesSaved,
      createdAt: saved.created_at,
    });
  } catch (error) {
    console.error("[ingest] falha ao extrair PDF", error);
    return NextResponse.json(
      { error: "Não foi possível ler o PDF." },
      { status: 500 }
    );
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
