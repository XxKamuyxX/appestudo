import Link from "next/link";
import { notFound } from "next/navigation";
import { StudyCard } from "@/app/materias/[id]/estudar/study-card";
import { createClient } from "@/lib/supabase/server";
import type { Deck, Flashcard, SourceFile } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pdf?: string }>;
};

export default async function EstudarPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { pdf } = await searchParams;
  const supabase = await createClient();

  const { data: materia } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!materia) {
    notFound();
  }

  const typedMateria = materia as Deck;
  const nowIso = new Date().toISOString();
  const pdfFilter = pdf?.trim() || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dueQuery = supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", id)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(8);

  if (pdfFilter) {
    dueQuery = dueQuery.eq("source_file_id", pdfFilter);
  }

  const [{ data: dueCards }, { data: stats }, { data: arquivos }] =
    await Promise.all([
      dueQuery,
      user
        ? supabase
            .from("user_stats")
            .select("xp, streak_current")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("source_files")
        .select("id, file_name")
        .eq("deck_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const queue = (dueCards ?? []) as Flashcard[];
  const current = queue[0] ?? null;
  const pdfs = (arquivos ?? []) as Pick<SourceFile, "id" | "file_name">[];
  const sessionTotal = Math.max(queue.length, 1);

  return (
    <main className="relative flex-1 overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.1),_transparent_45%)]" />

      <div className="relative mx-auto w-full max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
        {pdfs.length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-2">
            <Link
              href={`/materias/${typedMateria.id}/estudar`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur ${
                !pdfFilter
                  ? "border border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              Todos
            </Link>
            {pdfs.map((file) => (
              <Link
                key={file.id}
                href={`/materias/${typedMateria.id}/estudar?pdf=${file.id}`}
                className={`max-w-[11rem] truncate rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur ${
                  pdfFilter === file.id
                    ? "border border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                    : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                }`}
                title={file.file_name}
              >
                {file.file_name.replace(/\.pdf$/i, "")}
              </Link>
            ))}
          </div>
        ) : null}

        {!current ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
            <p className="font-serif text-2xl font-semibold text-white">
              Sessão completa
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {pdfFilter
                ? "Neste PDF não há cards na fila agora."
                : "Nada para revisar neste momento. Volte depois ou envie mais material."}
            </p>
            <Link
              href={`/materias/${typedMateria.id}`}
              className="mt-8 inline-flex rounded-2xl border border-cyan-400/30 bg-cyan-500/20 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
            >
              Voltar ao hub
            </Link>
          </section>
        ) : (
          <StudyCard
            materiaId={typedMateria.id}
            materiaTitle={typedMateria.title}
            card={current}
            remaining={queue.length}
            sessionTotal={sessionTotal}
            xp={stats?.xp ?? 0}
            streak={stats?.streak_current ?? 0}
            backHref={`/materias/${typedMateria.id}`}
          />
        )}
      </div>
    </main>
  );
}
