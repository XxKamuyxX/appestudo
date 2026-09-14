import { chunkPagedText } from "@/lib/chunk-text";
import { embedText } from "@/lib/gemini";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Indexa um source_file em document_chunks (RAG). */
export async function embedSourceFile(
  supabase: SupabaseClient,
  sourceFileId: string
): Promise<{ chunks: number }> {
  const { data: sourceFile, error: sourceError } = await supabase
    .from("source_files")
    .select("*")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (sourceError || !sourceFile) {
    throw new Error("Arquivo fonte não encontrado.");
  }

  const text = String(sourceFile.extracted_text ?? "").trim();
  if (!text) {
    throw new Error("Arquivo sem texto para indexar.");
  }

  await supabase.from("document_chunks").delete().eq("source_file_id", sourceFileId);

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
      if (!error) inserted += 1;
    } catch (error) {
      console.error("[embedSourceFile] chunk falhou", error);
    }
  }

  return { chunks: inserted };
}
