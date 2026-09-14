import Link from "next/link";
import { notFound } from "next/navigation";
import { GamesPanel } from "@/app/materias/games-panel";
import { createClient } from "@/lib/supabase/server";
import type { Deck } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JogosPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: materia } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!materia) notFound();
  const typedMateria = materia as Deck;

  const [{ data: cards }, { data: pdfs }] = await Promise.all([
    supabase
      .from("flashcards")
      .select("id, question, answer, source_file_id")
      .eq("deck_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("source_files")
      .select("id, file_name")
      .eq("deck_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const pairs = (cards ?? []).map((card) => ({
    id: card.id,
    term: card.answer.slice(0, 48),
    definition: card.question.slice(0, 120),
    sourceFileId: card.source_file_id as string | null,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href={`/materias/${typedMateria.id}`}
        className="text-sm text-teal-700 hover:underline"
      >
        ← Hub da matéria
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-teal-900">
        Jogos: {typedMateria.title}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Memória e cruzadinha para fixar com calma.
      </p>
      <div className="mt-6">
        <GamesPanel
          materiaId={typedMateria.id}
          pairs={pairs}
          pdfs={(pdfs ?? []).map((p) => ({
            id: p.id,
            file_name: p.file_name,
          }))}
        />
      </div>
    </main>
  );
}
