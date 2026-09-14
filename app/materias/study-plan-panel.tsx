"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markLessonDone } from "@/app/actions";

export type LessonView = {
  id: string;
  title: string;
  explanation_simple: string;
  technical_term: string | null;
  activity_prompt: string;
  activity_answer: string | null;
  practical_odontology: string;
  status: string;
  source_file_id?: string | null;
};

type PdfOption = { id: string; file_name: string };

type Props = {
  materiaId: string;
  planTitle: string | null;
  planSummary: string | null;
  lessons: LessonView[];
  pdfs: PdfOption[];
};

export function StudyPlanPanel({
  materiaId,
  planTitle,
  planSummary,
  lessons,
  pdfs,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFileId, setSourceFileId] = useState(pdfs[0]?.id ?? "");
  const [openId, setOpenId] = useState<string | null>(
    lessons.find((l) => l.status !== "done")?.id ?? lessons[0]?.id ?? null
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const doneCount = lessons.filter((l) => l.status === "done").length;

  async function generatePlan() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          sourceFileId: sourceFileId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Falha ao gerar plano.");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível gerar o plano.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Plano completo (item a item)
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Um bloco por conceito do PDF — avance aos poucos no dia a dia.
            {lessons.length > 0
              ? ` Progresso: ${doneCount}/${lessons.length}.`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={generatePlan}
          disabled={loading || pdfs.length === 0}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading
            ? "Gerando itens..."
            : planTitle
              ? "Regenerar plano"
              : "Gerar plano completo"}
        </button>
      </div>

      {pdfs.length > 0 ? (
        <label className="mt-3 block text-sm text-zinc-700">
          PDF / submatéria
          <select
            value={sourceFileId}
            onChange={(e) => setSourceFileId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {pdfs.map((pdf) => (
              <option key={pdf.id} value={pdf.id}>
                {pdf.file_name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          Envie um PDF na matéria antes de gerar o plano.
        </p>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {planTitle ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="font-medium text-zinc-900">{planTitle}</p>
          {planSummary ? (
            <p className="mt-1 text-sm text-zinc-600">{planSummary}</p>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {lessons.map((lesson, index) => {
          const open = openId === lesson.id;
          return (
            <li
              key={lesson.id}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => setOpenId(open ? null : lesson.id)}
              >
                <span className="text-sm font-medium text-zinc-900">
                  {index + 1}. {lesson.title}
                  {lesson.status === "done" ? " ✓" : ""}
                </span>
                <span className="text-xs text-zinc-500">
                  {open ? "fechar" : "abrir"}
                </span>
              </button>

              {open ? (
                <div className="mt-3 space-y-3 text-sm text-zinc-700">
                  <div>
                    <p className="font-medium text-teal-900">Conceito</p>
                    <p className="mt-1">{lesson.explanation_simple}</p>
                    {lesson.technical_term ? (
                      <p className="mt-1 text-zinc-600">
                        Termo técnico:{" "}
                        <strong>{lesson.technical_term}</strong>
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-medium text-teal-900">Atividade</p>
                    <p className="mt-1">{lesson.activity_prompt}</p>
                    {lesson.activity_answer ? (
                      <>
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-teal-700 hover:underline"
                          onClick={() =>
                            setRevealed((prev) => ({
                              ...prev,
                              [lesson.id]: !prev[lesson.id],
                            }))
                          }
                        >
                          {revealed[lesson.id]
                            ? "Ocultar resposta"
                            : "Ver resposta"}
                        </button>
                        {revealed[lesson.id] ? (
                          <p className="mt-1 rounded-lg bg-teal-50 px-3 py-2 text-teal-900">
                            {lesson.activity_answer}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-medium text-teal-900">
                      Na prática (odontologia)
                    </p>
                    <p className="mt-1">{lesson.practical_odontology}</p>
                  </div>
                  {lesson.status !== "done" ? (
                    <form action={markLessonDone}>
                      <input type="hidden" name="materiaId" value={materiaId} />
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50"
                      >
                        Marcar item como dominado
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
