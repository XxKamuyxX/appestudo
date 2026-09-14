import Link from "next/link";
import { ProgressBar } from "@/app/materias/progress-bar";
import { SkillTree } from "@/app/progresso/skill-tree";
import { materiaMasteryPercent } from "@/lib/gamification";
import { loadMateriaPdfProgress } from "@/lib/load-materia-progress";
import { createClient } from "@/lib/supabase/server";
import type { Deck, UserStats } from "@/lib/types";

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: stats }, { data: materias }, { data: cards }] =
    await Promise.all([
      supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("decks")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase.from("flashcards").select("deck_id, repetitions"),
    ]);

  const typedStats = (stats as UserStats | null) ?? null;
  const list = (materias ?? []) as Deck[];
  const allCards = (cards ?? []) as Array<{
    deck_id: string;
    repetitions: number;
  }>;

  const coverages = await Promise.all(
    list.map(async (materia) => ({
      id: materia.id,
      coverage: await loadMateriaPdfProgress(materia.id),
    }))
  );
  const coverageMap = new Map(
    coverages.map((item) => [item.id, item.coverage])
  );

  const treeNodes = list.map((materia, index) => {
    const materiaCards = allCards.filter((card) => card.deck_id === materia.id);
    const mastery = materiaMasteryPercent(materiaCards);
    const prevCards =
      index === 0
        ? []
        : allCards.filter((card) => card.deck_id === list[index - 1].id);
    const prevMastery = materiaMasteryPercent(prevCards);
    const pdfCoverage = coverageMap.get(materia.id)?.materiaPercent ?? 0;

    return {
      id: materia.id,
      title: materia.title,
      mastery: Math.max(mastery, pdfCoverage),
      totalCards: materiaCards.length,
      unlocked:
        index === 0 ||
        materiaCards.length > 0 ||
        prevMastery >= 40 ||
        pdfCoverage > 0,
    };
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/materias"
            className="text-sm text-teal-700 hover:underline"
          >
            ← Matérias
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-teal-900">
            Progresso
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            XP, streak, cobertura dos PDFs e árvore de habilidades.
          </p>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-teal-900/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">XP</p>
          <p className="mt-1 font-serif text-3xl font-semibold text-teal-900">
            {typedStats?.xp ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Streak</p>
          <p className="mt-1 font-serif text-3xl font-semibold text-teal-900">
            {typedStats?.streak_current ?? 0}
            <span className="text-base font-normal text-zinc-500"> dias</span>
          </p>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Recorde
          </p>
          <p className="mt-1 font-serif text-3xl font-semibold text-teal-900">
            {typedStats?.streak_best ?? 0}
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Cobertura por matéria (PDFs)
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Ideal: 100% de cada PDF (conteúdo + perguntas + lab).
        </p>
        <ul className="mt-4 space-y-4">
          {list.map((materia) => {
            const coverage = coverageMap.get(materia.id);
            return (
              <li key={materia.id}>
                <Link
                  href={`/materias/${materia.id}`}
                  className="text-sm font-medium text-teal-800 hover:underline"
                >
                  {materia.title}
                </Link>
                <div className="mt-1">
                  <ProgressBar
                    percent={coverage?.materiaPercent ?? 0}
                    label={`${coverage?.completedPdfs ?? 0}/${coverage?.totalPdfs ?? 0} PDFs`}
                    compact
                  />
                </div>
              </li>
            );
          })}
          {list.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhuma matéria ainda.</p>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Árvore de habilidades
        </h2>
        {treeNodes.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Crie matérias e perguntas para montar sua árvore.
          </p>
        ) : (
          <SkillTree nodes={treeNodes} />
        )}
      </section>
    </main>
  );
}
