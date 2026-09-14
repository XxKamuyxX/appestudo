export type PdfProgressInput = {
  sourceFileId: string;
  fileName: string;
  totalCards: number;
  reviewedCards: number;
  totalImages: number;
  interactiveImages: number;
  contentReviewed: boolean;
  labPracticed: boolean;
};

export type PdfProgress = PdfProgressInput & {
  percent: number;
  complete: boolean;
};

/**
 * Cobertura de um PDF:
 * - 50% perguntas estudadas (pelo menos 1 revisão)
 * - 25% prática no laboratório / figuras
 * - 25% marcou que revisou o conteúdo do PDF
 * Se não houver perguntas ou imagens, os pesos redistribuem.
 */
export function computePdfProgress(input: PdfProgressInput): PdfProgress {
  const parts: Array<{ weight: number; value: number }> = [];

  if (input.totalCards > 0) {
    parts.push({
      weight: 0.5,
      value: input.reviewedCards / input.totalCards,
    });
  }

  if (input.totalImages > 0) {
    const labValue = input.labPracticed
      ? 1
      : input.interactiveImages / input.totalImages;
    parts.push({ weight: 0.25, value: Math.min(1, labValue) });
  }

  parts.push({
    weight: input.totalCards > 0 || input.totalImages > 0 ? 0.25 : 1,
    value: input.contentReviewed ? 1 : 0,
  });

  // Se faltou perguntas, sobe peso do conteúdo+lab
  if (input.totalCards === 0 && input.totalImages > 0) {
    return finalize(input, [
      { weight: 0.4, value: input.contentReviewed ? 1 : 0 },
      {
        weight: 0.6,
        value: input.labPracticed
          ? 1
          : input.interactiveImages / input.totalImages,
      },
    ]);
  }

  if (input.totalCards === 0 && input.totalImages === 0) {
    return finalize(input, [
      { weight: 1, value: input.contentReviewed ? 1 : 0 },
    ]);
  }

  if (input.totalImages === 0 && input.totalCards > 0) {
    return finalize(input, [
      { weight: 0.7, value: input.reviewedCards / input.totalCards },
      { weight: 0.3, value: input.contentReviewed ? 1 : 0 },
    ]);
  }

  return finalize(input, parts);
}

function finalize(
  input: PdfProgressInput,
  parts: Array<{ weight: number; value: number }>
): PdfProgress {
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0) || 1;
  const score =
    parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weightSum;
  const percent = Math.min(100, Math.round(score * 100));
  return {
    ...input,
    percent,
    complete: percent >= 100,
  };
}

export function computeMateriaCoverage(pdfs: PdfProgress[]): {
  percent: number;
  completedPdfs: number;
  totalPdfs: number;
} {
  if (pdfs.length === 0) {
    return { percent: 0, completedPdfs: 0, totalPdfs: 0 };
  }
  const percent = Math.round(
    pdfs.reduce((sum, pdf) => sum + pdf.percent, 0) / pdfs.length
  );
  return {
    percent,
    completedPdfs: pdfs.filter((pdf) => pdf.complete).length,
    totalPdfs: pdfs.length,
  };
}
