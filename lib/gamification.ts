import type { ReviewRating, UserStats } from "@/lib/types";

export function xpForRating(rating: ReviewRating): number {
  if (rating === "easy") return 15;
  if (rating === "hard") return 10;
  return 3;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function nextStatsAfterReview(
  current: Pick<
    UserStats,
    "xp" | "streak_current" | "streak_best" | "last_study_date"
  > | null,
  rating: ReviewRating,
  now = new Date()
): Omit<UserStats, "user_id" | "updated_at"> {
  const today = toDateOnly(now);
  const xp = (current?.xp ?? 0) + xpForRating(rating);
  const last = current?.last_study_date ?? null;

  let streakCurrent = current?.streak_current ?? 0;
  if (!last) {
    streakCurrent = 1;
  } else {
    const diff = daysBetween(last, today);
    if (diff === 0) {
      // mesmo dia: mantém streak
    } else if (diff === 1) {
      streakCurrent += 1;
    } else {
      streakCurrent = 1;
    }
  }

  const streakBest = Math.max(current?.streak_best ?? 0, streakCurrent);

  return {
    xp,
    streak_current: streakCurrent,
    streak_best: streakBest,
    last_study_date: today,
  };
}

/** Progresso 0–100 baseado em repetições médias das perguntas. */
export function materiaMasteryPercent(
  cards: Array<{ repetitions: number }>
): number {
  if (cards.length === 0) return 0;
  const avg =
    cards.reduce((sum, card) => sum + Number(card.repetitions || 0), 0) /
    cards.length;
  return Math.min(100, Math.round((avg / 5) * 100));
}
