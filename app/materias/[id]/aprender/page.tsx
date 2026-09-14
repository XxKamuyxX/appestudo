import Link from "next/link";
import { notFound } from "next/navigation";
import { ImagesQuizPanel } from "@/app/materias/images-quiz-panel";
import { InteractiveLabPanel } from "@/app/materias/interactive-lab-panel";
import { SkullLab3D } from "@/app/materias/skull-lab-3d";
import { StudyPlanPanel } from "@/app/materias/study-plan-panel";
import { TutorChat } from "@/app/materias/tutor-chat";
import { createClient } from "@/lib/supabase/server";
import type { Deck, ImageHotspot } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AprenderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active =
    tab === "plano" || tab === "imagens" || tab === "laboratorio"
      ? tab
      : "tutor";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: materia } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!materia) notFound();
  const typedMateria = materia as Deck;

  const [
    { data: plan },
    { data: lessons },
    { data: images },
    { data: hotspots },
    { data: pdfs },
    { data: nextOutline },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("study_plans")
      .select("id, title, summary")
      .eq("deck_id", id)
      .maybeSingle(),
    supabase
      .from("study_lessons")
      .select("*")
      .eq("deck_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("source_images")
      .select(
        "id, public_url, page, label, label_hint, width, height, is_interactive"
      )
      .eq("deck_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("image_hotspots")
      .select("*")
      .eq("deck_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("source_files")
      .select("id, file_name")
      .eq("deck_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("content_outline_items")
      .select("title")
      .eq("deck_id", id)
      .neq("status", "done")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
    user
      ? supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const tabs = [
    { id: "tutor", label: "Aula guiada" },
    { id: "plano", label: "Plano completo" },
    { id: "imagens", label: "Imagens" },
    { id: "laboratorio", label: "Laboratório" },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href={`/materias/${typedMateria.id}`}
        className="text-sm text-teal-700 hover:underline"
      >
        ← Hub da matéria
      </Link>
      <div className="mt-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-teal-900">
          Aprender: {typedMateria.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Mentor explica item a item, plano completo, figuras e laboratório.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/materias/${typedMateria.id}/aprender?tab=${item.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              active === item.id
                ? "bg-teal-700 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {active === "tutor" ? (
          <TutorChat
            materiaId={typedMateria.id}
            displayName={profile?.display_name}
            nextItemTitle={nextOutline?.title ?? null}
          />
        ) : null}
        {active === "plano" ? (
          <StudyPlanPanel
            materiaId={typedMateria.id}
            planTitle={plan?.title ?? null}
            planSummary={plan?.summary ?? null}
            pdfs={(pdfs ?? []).map((p) => ({
              id: p.id,
              file_name: p.file_name,
            }))}
            lessons={(lessons ?? []).map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              explanation_simple: lesson.explanation_simple,
              technical_term: lesson.technical_term,
              activity_prompt: lesson.activity_prompt,
              activity_answer: lesson.activity_answer,
              practical_odontology: lesson.practical_odontology,
              status: lesson.status,
              source_file_id: lesson.source_file_id,
            }))}
          />
        ) : null}
        {active === "imagens" ? (
          <ImagesQuizPanel
            materiaId={typedMateria.id}
            images={(images ?? []).map((image) => ({
              id: image.id,
              public_url: image.public_url,
              page: image.page,
              label: image.label,
              label_hint: image.label_hint,
              width: image.width,
              height: image.height,
            }))}
          />
        ) : null}
        {active === "laboratorio" ? (
          <>
            <InteractiveLabPanel
              materiaId={typedMateria.id}
              images={(images ?? []).map((image) => ({
                id: image.id,
                public_url: image.public_url,
                page: image.page,
                label: image.label,
                is_interactive: Boolean(image.is_interactive),
              }))}
              hotspots={(hotspots ?? []) as ImageHotspot[]}
            />
            <SkullLab3D />
          </>
        ) : null}
      </div>
    </main>
  );
}
