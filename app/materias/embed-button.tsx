"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sourceFileId: string;
};

export function EmbedButton({ sourceFileId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFileId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Falha ao indexar.");
        return;
      }
      setMessage(`Índice pronto (${data.chunks} trechos).`);
      router.refresh();
    } catch {
      setError("Não foi possível indexar o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
      >
        {loading ? "Indexando..." : "Gerar índice (RAG)"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {message ? <p className="text-xs text-teal-700">{message}</p> : null}
    </div>
  );
}
