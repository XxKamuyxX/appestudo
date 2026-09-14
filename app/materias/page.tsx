import Link from "next/link";
import { createMateria, deleteMateria, signOut } from "@/app/actions";
import { ProgressBar } from "@/app/materias/progress-bar";
import { loadMateriaPdfProgress } from "@/lib/load-materia-progress";
import { createClient } from "@/lib/supabase/server";
import type { Deck } from "@/lib/types";

export default async function MateriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: materias } = await supabase
    .from("decks")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (materias ?? []) as Deck[];
  const coverages = await Promise.all(
    list.map(async (materia) => ({
      id: materia.id,
      coverage: await loadMateriaPdfProgress(materia.id),
    }))
  );
  const coverageMap = new Map(
    coverages.map((item) => [item.id, item.coverage])
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-teal-900">
            Suas matérias
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Escolha uma matéria para a missão do dia. Conta: {user?.email}.
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Sair
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Nova matéria</h2>
        <form action={createMateria} className="mt-4 space-y-3">
          <input
            name="title"
            required
            placeholder="Nome da matéria (ex.: Anatomia)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Descrição (opcional)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Criar matéria
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">Suas matérias</h2>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Nenhuma matéria ainda. Crie a primeira acima.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {list.map((materia) => {
              const coverage = coverageMap.get(materia.id);
              return (
                <li
                  key={materia.id}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/materias/${materia.id}`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        {materia.title}
                      </Link>
                      {materia.description ? (
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {materia.description}
                        </p>
                      ) : null}
                      <div className="mt-2 max-w-md">
                        <ProgressBar
                          percent={coverage?.materiaPercent ?? 0}
                          label={`PDFs ${coverage?.completedPdfs ?? 0}/${coverage?.totalPdfs ?? 0}`}
                          compact
                        />
                      </div>
                    </div>
                    <form action={deleteMateria}>
                      <input type="hidden" name="materiaId" value={materia.id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
