/** Monta texto com marcadores de página para a IA citar a página correta. */
export function buildPagedText(
  pages: Array<{ num?: number; text?: string }> | undefined,
  fallbackText: string
): string {
  if (!pages || pages.length === 0) {
    return fallbackText;
  }

  return pages
    .map((page, index) => {
      const num = page.num ?? index + 1;
      const body = String(page.text ?? "").trim();
      if (!body) return "";
      return `[Página ${num}]\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
