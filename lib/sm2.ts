import type { ReviewRating } from "@/lib/types";

type Sm2State = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

/**
 * SM-2 adaptado para 3 botões: Errei / Difícil / Fácil.
 */
export function applySm2(
  current: Sm2State,
  rating: ReviewRating,
  now = new Date()
): Sm2State & { next_review_at: string } {
  let ease = Number(current.ease_factor) || 2.5;
  let interval = Number(current.interval_days) || 0;
  let repetitions = Number(current.repetitions) || 0;

  if (rating === "again") {
    repetitions = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else if (rating === "hard") {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.max(1, Math.round(interval * Math.max(1.2, ease - 0.15)));
    }
    ease = Math.max(1.3, ease - 0.15);
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 4;
    } else {
      interval = Math.max(1, Math.round(interval * ease));
    }
    ease = ease + 0.1;
  }

  const next = new Date(now);
  next.setDate(next.getDate() + interval);

  return {
    ease_factor: Math.round(ease * 100) / 100,
    interval_days: interval,
    repetitions,
    next_review_at: next.toISOString(),
  };
}
