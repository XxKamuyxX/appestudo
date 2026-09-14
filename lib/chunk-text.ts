/** Divide texto com marcadores [Página N] em chunks utilizáveis no RAG. */
export type TextChunk = {
  content: string;
  page: number | null;
  chunkIndex: number;
};

const MAX_CHUNK_CHARS = 1200;

export function chunkPagedText(text: string): TextChunk[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let chunkIndex = 0;
  const parts = normalized.split(/\[Página\s+(\d+)\]/i);

  if (parts[0]?.trim()) {
    for (const part of splitBySize(parts[0].trim(), MAX_CHUNK_CHARS)) {
      chunks.push({ content: part, page: null, chunkIndex: chunkIndex++ });
    }
  }

  for (let i = 1; i < parts.length; i += 2) {
    const page = Number(parts[i]);
    const content = (parts[i + 1] ?? "").trim();
    if (!content) continue;
    for (const part of splitBySize(content, MAX_CHUNK_CHARS)) {
      chunks.push({
        content: part,
        page: Number.isFinite(page) ? page : null,
        chunkIndex: chunkIndex++,
      });
    }
  }

  return chunks;
}

function splitBySize(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const soft = text.lastIndexOf("\n", end);
      if (soft > start + size * 0.5) end = soft;
    }
    parts.push(text.slice(start, end).trim());
    start = end;
  }
  return parts.filter(Boolean);
}
