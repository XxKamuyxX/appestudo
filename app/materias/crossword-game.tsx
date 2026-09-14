"use client";

import { useMemo, useState, useTransition } from "react";
import { awardGameXp } from "@/app/actions";

export type CrosswordWord = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
};

type Props = {
  materiaId: string;
  words: CrosswordWord[];
  sourceFileId?: string | null;
};

export function CrosswordGame({ materiaId, words, sourceFileId }: Props) {
  const size = useMemo(() => {
    let maxR = 0;
    let maxC = 0;
    for (const w of words) {
      const len = w.answer.length;
      if (w.direction === "across") {
        maxR = Math.max(maxR, w.row);
        maxC = Math.max(maxC, w.col + len - 1);
      } else {
        maxR = Math.max(maxR, w.row + len - 1);
        maxC = Math.max(maxC, w.col);
      }
    }
    return { rows: Math.max(maxR + 1, 5), cols: Math.max(maxC + 1, 5) };
  }, [words]);

  const cellMap = useMemo(() => {
    const map = new Map<string, { letter: string; number?: number }>();
    words.forEach((w, index) => {
      const answer = w.answer.toUpperCase().replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/gi, "");
      for (let i = 0; i < answer.length; i += 1) {
        const r = w.direction === "across" ? w.row : w.row + i;
        const c = w.direction === "across" ? w.col + i : w.col;
        const key = `${r}:${c}`;
        const existing = map.get(key);
        map.set(key, {
          letter: answer[i] ?? "",
          number: i === 0 ? index + 1 : existing?.number,
        });
      }
    });
    return map;
  }, [words]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [pending, startTransition] = useTransition();

  const allCorrect =
    checked &&
    [...cellMap.entries()].every(([key, cell]) => {
      return (values[key] ?? "").toUpperCase() === cell.letter;
    });

  function claimXp() {
    const formData = new FormData();
    formData.set("materiaId", materiaId);
    formData.set("gameType", "crossword");
    formData.set("score", String(words.length * 12));
    if (sourceFileId) formData.set("sourceFileId", sourceFileId);
    startTransition(async () => {
      await awardGameXp(formData);
    });
  }

  if (words.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Gere a cruzadinha abaixo a partir do material.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="inline-grid gap-0.5 rounded-xl border border-zinc-200 bg-zinc-100 p-2"
        style={{
          gridTemplateColumns: `repeat(${size.cols}, minmax(1.6rem, 1.8rem))`,
        }}
      >
        {Array.from({ length: size.rows }).map((_, r) =>
          Array.from({ length: size.cols }).map((__, c) => {
            const key = `${r}:${c}`;
            const cell = cellMap.get(key);
            if (!cell) {
              return (
                <div
                  key={key}
                  className="h-7 w-7 rounded-sm bg-teal-950/80 sm:h-8 sm:w-8"
                />
              );
            }
            const ok =
              checked &&
              (values[key] ?? "").toUpperCase() === cell.letter;
            const bad =
              checked &&
              (values[key] ?? "").toUpperCase() !== cell.letter;
            return (
              <div key={key} className="relative">
                {cell.number ? (
                  <span className="absolute left-0.5 top-0 text-[8px] text-zinc-500">
                    {cell.number}
                  </span>
                ) : null}
                <input
                  value={values[key] ?? ""}
                  maxLength={1}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [key]: e.target.value.toUpperCase(),
                    }))
                  }
                  className={`h-7 w-7 rounded-sm border text-center text-xs font-semibold uppercase outline-none sm:h-8 sm:w-8 ${
                    ok
                      ? "border-teal-600 bg-teal-50"
                      : bad
                        ? "border-red-400 bg-red-50"
                        : "border-zinc-300 bg-white"
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

      <ol className="space-y-2 text-sm text-zinc-700">
        {words.map((w, index) => (
          <li key={`${w.answer}-${index}`}>
            <strong>
              {index + 1}. ({w.direction === "across" ? "horiz." : "vert."})
            </strong>{" "}
            {w.clue}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChecked(true)}
          className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
        >
          Verificar
        </button>
        {allCorrect ? (
          <button
            type="button"
            disabled={pending}
            onClick={claimXp}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Receber XP da cruzadinha"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
