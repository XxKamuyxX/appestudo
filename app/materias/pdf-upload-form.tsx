"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  materiaId: string;
};

type Stage = "idle" | "extract" | "embed" | "generate" | "done";

export function PdfUploadForm({ materiaId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setStage("extract");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const ingestData = await ingestRes.json();
      if (!ingestRes.ok) {
        setError(ingestData.error ?? "Falha ao extrair o PDF.");
        return;
      }

      const sourceFileId = String(ingestData.sourceFileId ?? "");
      if (!sourceFileId) {
        setError("PDF salvo, mas sem ID para continuar o pipeline.");
        return;
      }

      setStage("embed");
      const embedRes = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFileId }),
      });
      const embedData = await embedRes.json();
      if (!embedRes.ok) {
        setError(
          embedData.error ??
            "Texto extraído, mas falhou ao indexar para o tutor."
        );
        router.refresh();
        return;
      }

      setStage("generate");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFileId }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) {
        setError(
          genData.error ??
            "Indexado, mas falhou ao gerar perguntas. Use Regenerar no Material."
        );
        router.refresh();
        return;
      }

      setStage("done");
      setSuccess(
        `“${ingestData.fileName}” pronto: ${embedData.chunks ?? 0} trechos indexados e ${genData.created ?? 0} perguntas de múltipla escolha.`
      );
      form.reset();
      router.refresh();
    } catch {
      setError("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setLoading(false);
      setStage("idle");
    }
  }

  const stageLabel =
    stage === "extract"
      ? "Extraindo texto do PDF..."
      : stage === "embed"
        ? "Indexando para o tutor..."
        : stage === "generate"
          ? "Gerando perguntas (múltipla escolha)..."
          : "Preparar PDF e perguntas";

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Enviar PDF da aula
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Ao enviar, o app extrai o texto, prepara o tutor e cria perguntas de
        teste automaticamente — sem curadoria.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input type="hidden" name="materiaId" value={materiaId} />
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          disabled={loading}
          className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-800 hover:file:bg-teal-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? stageLabel : "Subir PDF e preparar estudo"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? (
        <p className="mt-3 text-sm text-teal-800">{success}</p>
      ) : null}
    </section>
  );
}
