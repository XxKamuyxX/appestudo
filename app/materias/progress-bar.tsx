export function ProgressBar({
  percent,
  label,
  compact = false,
}: {
  percent: number;
  label?: string;
  compact?: boolean;
}) {
  const safe = Math.min(100, Math.max(0, percent));
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-600">
        <span>{label ?? "Progresso"}</span>
        <span className="font-medium text-teal-800">{safe}%</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-zinc-200 ${
          compact ? "h-1.5" : "h-2.5"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all ${
            safe >= 100 ? "bg-teal-700" : "bg-teal-500"
          }`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
