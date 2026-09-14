import { createClient } from "@/lib/supabase/server";
import {
  computeMateriaCoverage,
  computePdfProgress,
  type PdfProgress,
} from "@/lib/content-progress";

export async function loadMateriaPdfProgress(materiaId: string): Promise<{
  pdfs: PdfProgress[];
  materiaPercent: number;
  completedPdfs: number;
  totalPdfs: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: files }, { data: cards }, { data: images }, { data: progress }] =
    await Promise.all([
      supabase
        .from("source_files")
        .select("id, file_name")
        .eq("deck_id", materiaId)
        .order("created_at", { ascending: true }),
      supabase
        .from("flashcards")
        .select("id, source_file_id, repetitions")
        .eq("deck_id", materiaId),
      supabase
        .from("source_images")
        .select("id, source_file_id, is_interactive")
        .eq("deck_id", materiaId),
      user
        ? supabase
            .from("source_file_progress")
            .select("source_file_id, content_reviewed, lab_practiced")
            .eq("deck_id", materiaId)
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

  const progressMap = new Map(
    (progress ?? []).map((row) => [
      row.source_file_id as string,
      {
        contentReviewed: Boolean(row.content_reviewed),
        labPracticed: Boolean(row.lab_practiced),
      },
    ])
  );

  const pdfs = (files ?? []).map((file) => {
    const fileCards = (cards ?? []).filter(
      (card) => card.source_file_id === file.id
    );
    const fileImages = (images ?? []).filter(
      (image) => image.source_file_id === file.id
    );
    const prog = progressMap.get(file.id);

    return computePdfProgress({
      sourceFileId: file.id,
      fileName: file.file_name,
      totalCards: fileCards.length,
      reviewedCards: fileCards.filter(
        (card) => Number(card.repetitions) >= 1
      ).length,
      totalImages: fileImages.length,
      interactiveImages: fileImages.filter((image) => image.is_interactive)
        .length,
      contentReviewed: prog?.contentReviewed ?? false,
      labPracticed: prog?.labPracticed ?? false,
    });
  });

  const coverage = computeMateriaCoverage(pdfs);
  return {
    pdfs,
    materiaPercent: coverage.percent,
    completedPdfs: coverage.completedPdfs,
    totalPdfs: coverage.totalPdfs,
  };
}
