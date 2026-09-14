"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sourceFileId: string;
};

export function GeneratePerguntasButton({ sourceFileId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setOkMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFileId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Falha ao gerar perguntas.");
        return;
      }

      setOkMessage(`${data.created} pergunta(s) prontas para o teste.`);
      router.refresh();
    } catch {
      setError("Não foi possível conectar à IA. Tente novamente.");
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
        className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        title="Cria novas perguntas de múltipla escolha a partir deste PDF"
      >
        {loading ? "Gerando..." : "Regenerar perguntas"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {okMessage ? <p className="text-xs text-teal-700">{okMessage}</p> : null}
    </div>
  );
}
