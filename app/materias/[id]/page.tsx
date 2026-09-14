import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMateria, signOut } from "@/app/actions";
import { MaterialSection } from "@/app/materias/material-section";
import { MateriaHub } from "@/app/materias/materia-hub";
import { loadMateriaPdfProgress } from "@/lib/load-materia-progress";
import { createClient } from "@/lib/supabase/server";
import type { Deck, SourceFile } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MateriaDetailPage({ params }: Props) {
  const { id } = await params;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: arquivos },
    { count: dueCount },
    coverage,
    { data: stats },
    { count: pendingLessons },
  ] = await Promise.all([
    supabase
      .from("source_files")
      .select(
        "id, deck_id, user_id, file_name, content_hash, pages, char_count, created_at"
      )
      .eq("deck_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", id)
      .lte("next_review_at", nowIso),
    loadMateriaPdfProgress(id),
    user
      ? supabase
          .from("user_stats")
          .select("xp, streak_current")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("study_lessons")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", id)
      .eq("status", "pending"),
  ]);

  const arquivosList = (arquivos ?? []) as Omit<SourceFile, "extracted_text">[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/materias"
          className="text-sm text-teal-700 hover:underline"
        >
          ← Matérias
        </Link>
        <div className="flex gap-2">
          <form action={deleteMateria}>
            <input type="hidden" name="materiaId" value={typedMateria.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
            >
              Excluir matéria
            </button>
          </form>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      <MateriaHub
        materiaId={typedMateria.id}
        title={typedMateria.title}
        description={typedMateria.description}
        xp={stats?.xp ?? 0}
        streak={stats?.streak_current ?? 0}
        coveragePercent={coverage.materiaPercent}
        completedPdfs={coverage.completedPdfs}
        totalPdfs={coverage.totalPdfs}
        dueCount={typeof dueCount === "number" ? dueCount : 0}
        pendingLessons={typeof pendingLessons === "number" ? pendingLessons : 0}
        pdfs={coverage.pdfs.map((pdf) => ({
          sourceFileId: pdf.sourceFileId,
          fileName: pdf.fileName,
          percent: pdf.percent,
        }))}
      />

      <div className="mt-8">
        <MaterialSection
          materiaId={typedMateria.id}
          arquivos={arquivosList}
        />
      </div>
    </main>
  );
}
