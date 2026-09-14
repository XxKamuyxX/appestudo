"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  materiaId: string;
};

export function ImportAnatomiaButton({ materiaId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setLoading(true);
    setError(null);
    setMessage("Importando PDFs da pasta Anatomia...");

    try {
      const response = await fetch("/api/import-anatomia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiaId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Falha ao importar.");
        return;
      }

      const results = (data.results ?? []) as Array<{
        fileName: string;
        status: string;
        sourceFileId?: string;
      }>;

      const toProcess = results.filter(
        (r) =>
          r.sourceFileId &&
          (r.status === "importado" || r.status === "já existia")
      );

      let questions = 0;
      let processed = 0;
      for (const item of toProcess) {
        if (!item.sourceFileId) continue;
        setMessage(
          `Preparando ${item.fileName} (${processed + 1}/${toProcess.length})...`
        );

        const embedRes = await fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceFileId: item.sourceFileId }),
        });
        if (!embedRes.ok) continue;

        // só gera perguntas se acabou de importar (evita duplicar em "já existia")
        if (item.status === "importado") {
          const genRes = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceFileId: item.sourceFileId }),
          });
          if (genRes.ok) {
            const genData = await genRes.json();
            questions += Number(genData.created ?? 0);
          }
        }
        processed += 1;
      }

      setMessage(
        `Importação concluída: ${processed} PDF(s) preparados, ${questions} perguntas novas.`
      );
      router.refresh();
    } catch {
      setError("Não foi possível importar os PDFs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleImport}
        disabled={loading}
        className="rounded-lg border border-teal-700 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
        title="Importa a pasta Base de conhecimento/Anatomia e gera perguntas"
      >
        {loading ? "Preparando Anatomia..." : "Importar pasta Anatomia"}
      </button>
      {message ? (
        <p className="mt-1 max-w-xs text-xs text-teal-800">{message}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
