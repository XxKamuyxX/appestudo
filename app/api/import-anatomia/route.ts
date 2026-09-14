import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { buildPagedText } from "@/lib/pdf-text";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const PRIORITY_FILES = [
  "Aula introdução.pdf",
  "Miologia.pdf",
  "Artrologia.pdf",
  "Artrologia (1).pdf",
  "Digestorio.pdf",
  "Respiratorio Aula Breno.pdf",
];

const MAX_IMAGES_PER_PDF = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { materiaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const materiaId = String(body.materiaId ?? "").trim();
  if (!materiaId) {
    return NextResponse.json(
      { error: "Matéria não informada." },
      { status: 400 }
    );
  }

  const { data: materia } = await supabase
    .from("decks")
    .select("id, title")
    .eq("id", materiaId)
    .maybeSingle();

  if (!materia) {
    return NextResponse.json(
      { error: "Matéria não encontrada." },
      { status: 404 }
    );
  }

  const baseDir = path.join(
    process.cwd(),
    "Base de conhecimento",
    "Anatomia"
  );

  let dirEntries: string[] = [];
  try {
    dirEntries = await fs.readdir(baseDir);
  } catch {
    return NextResponse.json(
      {
        error:
          "Pasta Base de conhecimento/Anatomia não encontrada no projeto.",
      },
      { status: 404 }
    );
  }

  const selected = PRIORITY_FILES.filter((name) =>
    dirEntries.some((entry) => entry.toLowerCase() === name.toLowerCase())
  ).map(
    (name) =>
      dirEntries.find((entry) => entry.toLowerCase() === name.toLowerCase())!
  );

  if (selected.length === 0) {
    return NextResponse.json(
      { error: "Nenhum PDF prioritário encontrado na pasta." },
      { status: 404 }
    );
  }

  const results: Array<{
    fileName: string;
    status: string;
    sourceFileId?: string;
    imagesSaved?: number;
  }> = [];

  for (const fileName of selected) {
    const filePath = path.join(baseDir, fileName);
    const buffer = await fs.readFile(filePath);
    const data = new Uint8Array(buffer);
    const contentHash = createHash("sha256").update(data).digest("hex");

    const { data: existing } = await supabase
      .from("source_files")
      .select("id")
      .eq("deck_id", materiaId)
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (existing) {
      results.push({
        fileName,
        status: "já existia",
        sourceFileId: existing.id,
      });
      continue;
    }

    const parser = new PDFParse({ data });
    try {
      const textResult = await parser.getText();
      const text = buildPagedText(
        textResult.pages,
        (textResult.text ?? "").trim()
      ).trim();
      const pages = textResult.total ?? textResult.pages?.length ?? 0;

      const { data: saved, error: saveError } = await supabase
        .from("source_files")
        .insert({
          deck_id: materiaId,
          user_id: user.id,
          file_name: fileName,
          content_hash: contentHash,
          pages,
          char_count: text.length,
          extracted_text: text,
        })
        .select("id")
        .single();

      if (saveError || !saved) {
        results.push({
          fileName,
          status: saveError?.message ?? "falha ao salvar",
        });
        continue;
      }

      let imagesSaved = 0;
      try {
        const imageResult = await parser.getImage({
          imageThreshold: 80,
          imageBuffer: true,
        });
        const flat: Array<{
          page: number;
          data?: Uint8Array;
          width?: number;
          height?: number;
          name?: string;
        }> = [];
        for (const pageImages of imageResult.pages ?? []) {
          for (const img of pageImages.images ?? []) {
            flat.push({
              page: pageImages.pageNumber,
              data: img.data,
              width: img.width,
              height: img.height,
              name: img.name,
            });
          }
        }

        for (const img of flat.slice(0, MAX_IMAGES_PER_PDF)) {
          if (!img.data || img.data.byteLength < 200) continue;
          const storagePath = `${user.id}/${materiaId}/${saved.id}/${Date.now()}-${imagesSaved}.png`;
          const { error: uploadError } = await supabase.storage
            .from("source-images")
            .upload(storagePath, img.data, {
              contentType: "image/png",
              upsert: false,
            });
          if (uploadError) continue;

          const { data: publicData } = supabase.storage
            .from("source-images")
            .getPublicUrl(storagePath);

          const { error: rowError } = await supabase.from("source_images").insert({
            deck_id: materiaId,
            source_file_id: saved.id,
            page: img.page || null,
            storage_path: storagePath,
            public_url: publicData.publicUrl,
            width: img.width ?? null,
            height: img.height ?? null,
            label: null,
            label_hint: img.name ?? null,
            is_interactive: false,
          });
          if (!rowError) imagesSaved += 1;
        }
      } catch (imageError) {
        console.warn("[import-anatomia] imagens", fileName, imageError);
      }

      results.push({
        fileName,
        status: "importado",
        sourceFileId: saved.id,
        imagesSaved,
      });
    } catch (error) {
      console.error("[import-anatomia]", fileName, error);
      results.push({ fileName, status: "erro na leitura" });
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  return NextResponse.json({ materiaId, results });
}
