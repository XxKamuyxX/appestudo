"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nextStatsAfterReview } from "@/lib/gamification";
import { applySm2 } from "@/lib/sm2";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createMateria(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("decks").insert({
    user_id: user.id,
    title,
    description: description || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/materias");
}

export async function deleteMateria(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  if (!materiaId) return;

  const supabase = await createClient();
  const { error } = await supabase.from("decks").delete().eq("id", materiaId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/materias");
  redirect("/materias");
}

export async function createPergunta(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const sourceExcerpt = String(formData.get("source_excerpt") ?? "").trim();

  if (!materiaId || !question || !answer) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("flashcards").insert({
    deck_id: materiaId,
    question,
    answer,
    source_excerpt: sourceExcerpt || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/materias/${materiaId}`);
}

export async function deletePergunta(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const perguntaId = String(formData.get("perguntaId") ?? "");

  if (!materiaId || !perguntaId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", perguntaId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/materias/${materiaId}`);
}

export async function approvePendingPergunta(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const pendingId = String(formData.get("pendingId") ?? "");

  if (!materiaId || !pendingId) return;

  const supabase = await createClient();
  const { data: pending, error: fetchError } = await supabase
    .from("pending_flashcards")
    .select("*")
    .eq("id", pendingId)
    .eq("deck_id", materiaId)
    .maybeSingle();

  if (fetchError || !pending) {
    throw new Error(fetchError?.message ?? "Pergunta pendente não encontrada.");
  }

  const { error: insertError } = await supabase.from("flashcards").insert({
    deck_id: materiaId,
    question: pending.question,
    answer: pending.answer,
    source_excerpt: pending.source_excerpt ?? null,
    source_file_name: pending.source_file_name ?? null,
    source_page: pending.source_page ?? null,
    source_file_id: pending.source_file_id ?? null,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: deleteError } = await supabase
    .from("pending_flashcards")
    .delete()
    .eq("id", pendingId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath(`/materias/${materiaId}`);
}

export async function approveAllPendingPerguntas(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  if (!materiaId) return;

  const supabase = await createClient();
  const { data: pending, error: fetchError } = await supabase
    .from("pending_flashcards")
    .select("*")
    .eq("deck_id", materiaId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const list = pending ?? [];
  if (list.length === 0) {
    revalidatePath(`/materias/${materiaId}`);
    return;
  }

  const { error: insertError } = await supabase.from("flashcards").insert(
    list.map((item) => ({
      deck_id: materiaId,
      question: item.question,
      answer: item.answer,
      source_excerpt: item.source_excerpt ?? null,
      source_file_name: item.source_file_name ?? null,
      source_page: item.source_page ?? null,
      source_file_id: item.source_file_id ?? null,
    }))
  );

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: deleteError } = await supabase
    .from("pending_flashcards")
    .delete()
    .eq("deck_id", materiaId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath(`/materias/${materiaId}`);
}

export async function discardPendingPergunta(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const pendingId = String(formData.get("pendingId") ?? "");

  if (!materiaId || !pendingId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_flashcards")
    .delete()
    .eq("id", pendingId)
    .eq("deck_id", materiaId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/materias/${materiaId}`);
}

export async function discardAllPendingPerguntas(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  if (!materiaId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_flashcards")
    .delete()
    .eq("deck_id", materiaId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/materias/${materiaId}`);
}

export async function reviewPergunta(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");
  const correctRaw = String(formData.get("correct") ?? "");
  const ratingRaw = String(formData.get("rating") ?? "");

  let rating: "again" | "hard" | "easy" | null =
    ratingRaw === "again" || ratingRaw === "hard" || ratingRaw === "easy"
      ? ratingRaw
      : null;

  if (!rating && (correctRaw === "true" || correctRaw === "false")) {
    rating = correctRaw === "true" ? "easy" : "again";
  }

  if (!materiaId || !cardId || !rating) return;

  const supabase = await createClient();
  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("id, ease_factor, interval_days, repetitions")
    .eq("id", cardId)
    .eq("deck_id", materiaId)
    .maybeSingle();

  if (fetchError || !card) {
    throw new Error(fetchError?.message ?? "Pergunta não encontrada.");
  }

  const next = applySm2(
    {
      ease_factor: Number(card.ease_factor) || 2.5,
      interval_days: Number(card.interval_days) || 0,
      repetitions: Number(card.repetitions) || 0,
    },
    rating
  );

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      next_review_at: next.next_review_at,
    })
    .eq("id", cardId)
    .eq("deck_id", materiaId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: stats } = await supabase
      .from("user_stats")
      .select("xp, streak_current, streak_best, last_study_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const nextStats = nextStatsAfterReview(stats, rating);

    const { error: statsError } = await supabase.from("user_stats").upsert({
      user_id: user.id,
      ...nextStats,
      updated_at: new Date().toISOString(),
    });

    if (statsError) {
      console.error("[review] falha ao atualizar XP/streak", statsError);
    }
  }

  revalidatePath(`/materias/${materiaId}/estudar`);
  revalidatePath(`/materias/${materiaId}`);
  revalidatePath("/materias");
  revalidatePath("/progresso");
}

export async function markLessonDone(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!materiaId || !lessonId) return;

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("study_lessons")
    .select("outline_item_id")
    .eq("id", lessonId)
    .eq("deck_id", materiaId)
    .maybeSingle();

  const { error } = await supabase
    .from("study_lessons")
    .update({ status: "done" })
    .eq("id", lessonId)
    .eq("deck_id", materiaId);

  if (error) throw new Error(error.message);

  if (lesson?.outline_item_id) {
    await supabase
      .from("content_outline_items")
      .update({ status: "done" })
      .eq("id", lesson.outline_item_id)
      .eq("deck_id", materiaId);
  }

  revalidatePath(`/materias/${materiaId}/aprender`);
  revalidatePath(`/materias/${materiaId}`);
}

export async function markOutlineItemDone(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const outlineItemId = String(formData.get("outlineItemId") ?? "");
  if (!materiaId || !outlineItemId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_outline_items")
    .update({ status: "done" })
    .eq("id", outlineItemId)
    .eq("deck_id", materiaId);

  if (error) throw new Error(error.message);

  await supabase
    .from("study_lessons")
    .update({ status: "done" })
    .eq("outline_item_id", outlineItemId)
    .eq("deck_id", materiaId);

  revalidatePath(`/materias/${materiaId}/aprender`);
  revalidatePath(`/materias/${materiaId}`);
}

export async function awardGameXp(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const gameTypeRaw = String(formData.get("gameType") ?? "");
  const score = Number(formData.get("score") ?? 0);
  const sourceFileId = String(formData.get("sourceFileId") ?? "").trim() || null;
  const gameType =
    gameTypeRaw === "memory" || gameTypeRaw === "crossword"
      ? gameTypeRaw
      : null;

  if (!materiaId || !gameType) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("game_sessions").insert({
    user_id: user.id,
    deck_id: materiaId,
    source_file_id: sourceFileId,
    game_type: gameType,
    score: Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0,
    completed_at: new Date().toISOString(),
  });

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, streak_current, streak_best, last_study_date")
    .eq("user_id", user.id)
    .maybeSingle();

  const nextStats = nextStatsAfterReview(stats, "hard");
  await supabase.from("user_stats").upsert({
    user_id: user.id,
    ...nextStats,
    updated_at: new Date().toISOString(),
  });

  revalidatePath(`/materias/${materiaId}/jogos`);
  revalidatePath(`/materias/${materiaId}`);
  revalidatePath("/progresso");
}

export async function saveImageLabel(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!materiaId || !imageId || !label) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("source_images")
    .update({ label })
    .eq("id", imageId)
    .eq("deck_id", materiaId);

  if (error) throw new Error(error.message);
  revalidatePath(`/materias/${materiaId}/aprender`);
  revalidatePath(`/materias/${materiaId}`);
}

export async function toggleImageInteractive(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  const value = String(formData.get("value") ?? "") === "true";
  if (!materiaId || !imageId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("source_images")
    .update({ is_interactive: value })
    .eq("id", imageId)
    .eq("deck_id", materiaId);

  if (error) throw new Error(error.message);
  revalidatePath(`/materias/${materiaId}/aprender`);
}

export async function createHotspot(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  const labelSimple = String(formData.get("label_simple") ?? "").trim();
  const labelTechnical = String(formData.get("label_technical") ?? "").trim();
  const odontologyUse = String(formData.get("odontology_use") ?? "").trim();
  const xPct = Number(formData.get("x_pct") ?? 50);
  const yPct = Number(formData.get("y_pct") ?? 50);

  if (!materiaId || !imageId || !labelSimple) return;

  const supabase = await createClient();
  const { error } = await supabase.from("image_hotspots").insert({
    deck_id: materiaId,
    source_image_id: imageId,
    x_pct: Math.min(100, Math.max(0, xPct)),
    y_pct: Math.min(100, Math.max(0, yPct)),
    label_simple: labelSimple,
    label_technical: labelTechnical || null,
    odontology_use: odontologyUse || null,
    sort_order: 0,
  });

  if (error) throw new Error(error.message);

  await supabase
    .from("source_images")
    .update({ is_interactive: true })
    .eq("id", imageId);

  revalidatePath(`/materias/${materiaId}/aprender`);
}

export async function updateHotspot(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const hotspotId = String(formData.get("hotspotId") ?? "");
  const labelSimple = String(formData.get("label_simple") ?? "").trim();
  const labelTechnical = String(formData.get("label_technical") ?? "").trim();
  const odontologyUse = String(formData.get("odontology_use") ?? "").trim();
  const xPct = Number(formData.get("x_pct"));
  const yPct = Number(formData.get("y_pct"));

  if (!materiaId || !hotspotId || !labelSimple) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("image_hotspots")
    .update({
      label_simple: labelSimple,
      label_technical: labelTechnical || null,
      odontology_use: odontologyUse || null,
      ...(Number.isFinite(xPct)
        ? { x_pct: Math.min(100, Math.max(0, xPct)) }
        : {}),
      ...(Number.isFinite(yPct)
        ? { y_pct: Math.min(100, Math.max(0, yPct)) }
        : {}),
    })
    .eq("id", hotspotId)
    .eq("deck_id", materiaId);

  if (error) throw new Error(error.message);
  revalidatePath(`/materias/${materiaId}/aprender`);
}

export async function deleteHotspot(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const hotspotId = String(formData.get("hotspotId") ?? "");
  if (!materiaId || !hotspotId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("image_hotspots")
    .delete()
    .eq("id", hotspotId)
    .eq("deck_id", materiaId);

  if (error) throw new Error(error.message);
  revalidatePath(`/materias/${materiaId}/aprender`);
}

export async function markPdfContentReviewed(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const sourceFileId = String(formData.get("sourceFileId") ?? "");
  const value = String(formData.get("value") ?? "true") === "true";
  if (!materiaId || !sourceFileId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("source_file_progress")
    .select("lab_practiced")
    .eq("user_id", user.id)
    .eq("source_file_id", sourceFileId)
    .maybeSingle();

  const { error } = await supabase.from("source_file_progress").upsert(
    {
      user_id: user.id,
      deck_id: materiaId,
      source_file_id: sourceFileId,
      content_reviewed: value,
      lab_practiced: existing?.lab_practiced ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source_file_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/materias/${materiaId}`);
  revalidatePath("/materias");
  revalidatePath("/progresso");
}

export async function markPdfLabPracticed(formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "");
  const sourceFileId = String(formData.get("sourceFileId") ?? "");
  if (!materiaId || !sourceFileId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("source_file_progress")
    .select("content_reviewed")
    .eq("user_id", user.id)
    .eq("source_file_id", sourceFileId)
    .maybeSingle();

  const { error } = await supabase.from("source_file_progress").upsert(
    {
      user_id: user.id,
      deck_id: materiaId,
      source_file_id: sourceFileId,
      content_reviewed: existing?.content_reviewed ?? false,
      lab_practiced: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source_file_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/materias/${materiaId}`);
  revalidatePath(`/materias/${materiaId}/aprender`);
  revalidatePath("/progresso");
}
