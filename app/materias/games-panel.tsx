"use client";

import { useState } from "react";
import {
  CrosswordGame,
  type CrosswordWord,
} from "@/app/materias/crossword-game";
import { MemoryGame } from "@/app/materias/memory-game";

type Pair = {
  id: string;
  term: string;
  definition: string;
  sourceFileId?: string | null;
};
type PdfOption = { id: string; file_name: string };

type Props = {
  materiaId: string;
  pairs: Pair[];
  pdfs: PdfOption[];
};

export function GamesPanel({ materiaId, pairs, pdfs }: Props) {
  const [tab, setTab] = useState<"memory" | "crossword">("memory");
  const [pdfId, setPdfId] = useState<string>("");
  const [words, setWords] = useState<CrosswordWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPairs = (
    pdfId
      ? pairs.filter((p) => p.sourceFileId === pdfId)
      : pairs
  ).slice(0, 6);

  async function generateCrossword() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/games/crossword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          sourceFileId: pdfId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Falha ao gerar.");
        return;
      }
      setWords(data.words ?? []);
    } catch {
      setError("Não foi possível gerar a cruzadinha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <h2 className="font-serif text-2xl font-semibold text-teal-950">
        Jogos de fixação
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Sessões curtas para reforçar sem esgotar o conteúdo.
      </p>

      {pdfs.length > 0 ? (
        <label className="mt-4 block text-sm text-zinc-700">
          Filtrar por PDF
          <select
            value={pdfId}
            onChange={(e) => setPdfId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {pdfs.map((pdf) => (
              <option key={pdf.id} value={pdf.id}>
                {pdf.file_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("memory")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "memory"
              ? "bg-teal-700 text-white"
              : "border border-zinc-200 text-zinc-700"
          }`}
        >
          Jogo da memória
        </button>
        <button
          type="button"
          onClick={() => setTab("crossword")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "crossword"
              ? "bg-teal-700 text-white"
              : "border border-zinc-200 text-zinc-700"
          }`}
        >
          Cruzadinha
        </button>
      </div>

      <div className="mt-5">
        {tab === "memory" ? (
          <MemoryGame
            materiaId={materiaId}
            pairs={filteredPairs}
            sourceFileId={pdfId || null}
          />
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void generateCrossword()}
              disabled={loading}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? "Montando cruzadinha..." : "Gerar cruzadinha com a IA"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <CrosswordGame
              materiaId={materiaId}
              words={words}
              sourceFileId={pdfId || null}
            />
          </div>
        )}
      </div>
    </section>
  );
}
