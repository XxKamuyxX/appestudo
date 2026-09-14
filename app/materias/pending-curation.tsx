import {
  approveAllPendingPerguntas,
  approvePendingPergunta,
  discardAllPendingPerguntas,
  discardPendingPergunta,
} from "@/app/actions";
import { SourceExcerpt } from "@/app/materias/source-excerpt";
import type { PendingFlashcard } from "@/lib/types";

type Props = {
  materiaId: string;
  pendentes: PendingFlashcard[];
};

export function PendingCuration({ materiaId, pendentes }: Props) {
  if (pendentes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Curadoria ({pendentes.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            <strong>Aprovar</strong> publica no estudo.{" "}
            <strong>Descartar</strong> apaga o rascunho da IA.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={approveAllPendingPerguntas}>
            <input type="hidden" name="materiaId" value={materiaId} />
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
            >
              Aprovar todas
            </button>
          </form>
          <form action={discardAllPendingPerguntas}>
            <input type="hidden" name="materiaId" value={materiaId} />
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Descartar todas
            </button>
          </form>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {pendentes.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-amber-200/80 bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {item.question}
                </p>
                <p className="mt-1 text-sm text-zinc-600">{item.answer}</p>
                <SourceExcerpt
                  excerpt={item.source_excerpt}
                  fileName={item.source_file_name}
                  page={item.source_page}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <form action={approvePendingPergunta}>
                  <input type="hidden" name="materiaId" value={materiaId} />
                  <input type="hidden" name="pendingId" value={item.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    Aprovar
                  </button>
                </form>
                <form action={discardPendingPergunta}>
                  <input type="hidden" name="materiaId" value={materiaId} />
                  <input type="hidden" name="pendingId" value={item.id} />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:underline"
                  >
                    Descartar
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
