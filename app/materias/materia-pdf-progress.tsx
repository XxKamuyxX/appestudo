import {
  markPdfContentReviewed,
  markPdfLabPracticed,
} from "@/app/actions";
import { ProgressBar } from "@/app/materias/progress-bar";
import type { PdfProgress } from "@/lib/content-progress";

type Props = {
  materiaId: string;
  materiaPercent: number;
  completedPdfs: number;
  totalPdfs: number;
  pdfs: PdfProgress[];
};

export function MateriaPdfProgress({
  materiaId,
  materiaPercent,
  completedPdfs,
  totalPdfs,
  pdfs,
}: Props) {
  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Cobertura da matéria
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Meta: passar por <strong>100% dos PDFs</strong> (conteúdo + perguntas +
        laboratório) para o aprendizado ficar completo.
      </p>

      <div className="mt-4">
        <ProgressBar
          percent={materiaPercent}
          label={`${completedPdfs}/${totalPdfs} PDF(s) concluídos`}
        />
      </div>

      {pdfs.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          Nenhum PDF nesta matéria ainda. Envie ou importe as aulas.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {pdfs.map((pdf) => (
            <li
              key={pdf.sourceFileId}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {pdf.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {pdf.reviewedCards}/{pdf.totalCards} perguntas estudadas ·{" "}
                    {pdf.interactiveImages}/{pdf.totalImages} figuras no lab
                    {pdf.contentReviewed ? " · conteúdo marcado" : ""}
                    {pdf.labPracticed ? " · lab praticado" : ""}
                  </p>
                </div>
                {pdf.complete ? (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                    100%
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <ProgressBar percent={pdf.percent} compact />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={markPdfContentReviewed}>
                  <input type="hidden" name="materiaId" value={materiaId} />
                  <input
                    type="hidden"
                    name="sourceFileId"
                    value={pdf.sourceFileId}
                  />
                  <input
                    type="hidden"
                    name="value"
                    value={pdf.contentReviewed ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    {pdf.contentReviewed
                      ? "Desmarcar conteúdo"
                      : "Marquei que estudei este PDF"}
                  </button>
                </form>
                {!pdf.labPracticed && pdf.totalImages > 0 ? (
                  <form action={markPdfLabPracticed}>
                    <input type="hidden" name="materiaId" value={materiaId} />
                    <input
                      type="hidden"
                      name="sourceFileId"
                      value={pdf.sourceFileId}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-teal-700 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50"
                    >
                      Marquei prática no laboratório
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
