import { NextResponse } from "next/server";
import { chunkPagedText } from "@/lib/chunk-text";
import { embedText } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { sourceFileId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const sourceFileId = String(body.sourceFileId ?? "").trim();
  if (!sourceFileId) {
    return NextResponse.json(
      { error: "Arquivo fonte não informado." },
      { status: 400 }
    );
  }

  const { data: sourceFile, error: sourceError } = await supabase
    .from("source_files")
    .select("*")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (sourceError || !sourceFile) {
    return NextResponse.json(
      { error: "Arquivo fonte não encontrado." },
      { status: 404 }
    );
  }

  const text = String(sourceFile.extracted_text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { error: "Arquivo sem texto para indexar." },
      { status: 400 }
    );
  }

  await supabase
    .from("document_chunks")
    .delete()
    .eq("source_file_id", sourceFileId);

  const chunks = chunkPagedText(text).slice(0, 80);
  let inserted = 0;

  for (const chunk of chunks) {
    try {
      const embedding = await embedText(chunk.content);
      const { error } = await supabase.from("document_chunks").insert({
        deck_id: sourceFile.deck_id,
        source_file_id: sourceFile.id,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        page: chunk.page,
        embedding: `[${embedding.join(",")}]`,
      });
      if (error) {
        console.error("[embed] insert chunk", error);
      } else {
        inserted += 1;
      }
    } catch (error) {
      console.error("[embed] chunk falhou", error);
    }
  }

  return NextResponse.json({
    sourceFileId,
    chunks: inserted,
  });
}
