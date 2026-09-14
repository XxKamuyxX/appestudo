type Props = {
  excerpt?: string | null;
  fileName?: string | null;
  page?: number | null;
};

export function SourceExcerpt({ excerpt, fileName, page }: Props) {
  const hasMeta = Boolean(fileName?.trim() || page);
  const hasExcerpt = Boolean(excerpt?.trim());

  if (!hasMeta && !hasExcerpt) return null;

  const metaParts: string[] = [];
  if (fileName?.trim()) metaParts.push(fileName.trim());
  if (page && page > 0) metaParts.push(`p. ${page}`);

  return (
    <blockquote className="mt-2 rounded-lg border-l-4 border-teal-600/40 bg-teal-50/70 px-3 py-2 text-xs leading-relaxed text-zinc-700">
      <p>
        <span className="font-semibold text-teal-900">Fonte: </span>
        {metaParts.length > 0 ? metaParts.join(" · ") : "Material da matéria"}
      </p>
      {hasExcerpt ? (
        <p className="mt-1 italic text-zinc-600">&ldquo;{excerpt!.trim()}&rdquo;</p>
      ) : null}
    </blockquote>
  );
}
