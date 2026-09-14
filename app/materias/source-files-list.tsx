import { EmbedButton } from "@/app/materias/embed-button";
import { GeneratePerguntasButton } from "@/app/materias/generate-perguntas-button";
import type { SourceFile } from "@/lib/types";

type Props = {
  arquivos: Omit<SourceFile, "extracted_text">[];
};

export function SourceFilesList({ arquivos }: Props) {
  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        PDFs da matéria ({arquivos.length})
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        No upload, o app já indexa e gera perguntas. Use regenerar só se
        precisar de mais questões.
      </p>

      {arquivos.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          Nenhum PDF ainda. Envie o primeiro acima.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {arquivos.map((arquivo) => (
            <li
              key={arquivo.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {arquivo.file_name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(arquivo.created_at).toLocaleString("pt-BR")} ·{" "}
                  {arquivo.pages} pág. ·{" "}
                  {arquivo.char_count.toLocaleString("pt-BR")} chars
                  {arquivo.char_count === 0
                    ? " · sem texto (possível PDF só imagem)"
                    : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-start">
                <EmbedButton sourceFileId={arquivo.id} />
                <GeneratePerguntasButton sourceFileId={arquivo.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
