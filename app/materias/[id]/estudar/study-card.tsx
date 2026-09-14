"use client";

import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import {
  ArrowLeft,
  Flame,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPergunta } from "@/app/actions";
import type { Flashcard } from "@/lib/types";

type Props = {
  materiaId: string;
  materiaTitle: string;
  card: Flashcard;
  remaining: number;
  sessionTotal: number;
  xp: number;
  streak: number;
  backHref: string;
};

const springSoft = { type: "spring" as const, stiffness: 320, damping: 26 };
const springSnappy = { type: "spring" as const, stiffness: 420, damping: 28 };

function AnimatedXp({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("pt-BR"));
  const [label, setLabel] = useState(value.toLocaleString("pt-BR"));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on("change", (v) => setLabel(v));
  }, [display]);

  return <span className="tabular-nums">{label}</span>;
}

export function StudyCard({
  materiaId,
  materiaTitle,
  card,
  remaining,
  sessionTotal,
  xp,
  streak,
  backHref,
}: Props) {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [xpBump, setXpBump] = useState<number | null>(null);
  const [displayXp, setDisplayXp] = useState(xp);

  useEffect(() => {
    setFlipped(false);
    setXpBump(null);
  }, [card.id]);

  useEffect(() => {
    setDisplayXp(xp);
  }, [xp]);

  const progress =
    sessionTotal <= 0
      ? 0
      : Math.min(100, ((sessionTotal - remaining + 1) / sessionTotal) * 100);

  function submitRating(rating: "again" | "hard" | "easy") {
    if (pending) return;
    const gain = rating === "easy" ? 15 : rating === "hard" ? 10 : 3;
    setXpBump(gain);
    setDisplayXp((prev) => prev + gain);

    const formData = new FormData();
    formData.set("materiaId", materiaId);
    formData.set("cardId", card.id);
    formData.set("rating", rating);

    startTransition(async () => {
      await reviewPergunta(formData);
      router.refresh();
    });
  }

  return (
    <div className="relative min-h-[70vh]">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-32 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />

      <header className="relative mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Hub
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
              <Flame className="h-3.5 w-3.5" />
              {streak}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
              <Zap className="h-3.5 w-3.5" />
              <AnimatedXp value={displayXp} /> XP
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Flashcards
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {materiaTitle}
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Sessão
            </span>
            <span className="tabular-nums text-slate-300">
              {sessionTotal - remaining + 1}/{sessionTotal}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={springSoft}
            />
          </div>
          <AnimatePresence>
            {xpBump !== null ? (
              <motion.p
                key={xpBump}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-xs font-medium text-emerald-300"
              >
                +{xpBump} XP
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
          transition={springSoft}
          className="relative"
          style={{ perspective: 1400 }}
        >
          <button
            type="button"
            onClick={() => setFlipped((v) => !v)}
            className="relative block w-full text-left outline-none"
            style={{ transformStyle: "preserve-3d" }}
            aria-label={flipped ? "Ver pergunta" : "Virar e ver resposta"}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={springSnappy}
              className="relative min-h-[22rem] w-full"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Frente */}
              <div
                className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/12 via-white/6 to-cyan-500/10 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
                <div>
                  <span className="inline-flex rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Pergunta
                  </span>
                  <h2 className="mt-5 font-serif text-2xl font-semibold leading-snug text-white sm:text-[1.7rem]">
                    {card.question}
                  </h2>
                </div>
                <div className="mt-8 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Toque para revelar a resposta
                  </p>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-cyan-300">
                    <RotateCcw className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* Verso */}
              <div
                className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-white/8 to-slate-900/80 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div>
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    Resposta
                  </span>
                  <p className="mt-5 text-lg leading-relaxed text-slate-100 sm:text-xl">
                    {card.answer}
                  </p>
                  {card.source_excerpt ? (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Fonte
                        {card.source_file_name
                          ? ` · ${card.source_file_name}`
                          : ""}
                        {card.source_page ? ` · p. ${card.source_page}` : ""}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        “{card.source_excerpt}”
                      </p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-6 text-sm text-slate-400">
                  Como foi lembrar? Avalie abaixo.
                </p>
              </div>
            </motion.div>
          </button>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {flipped ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={springSoft}
            className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-3"
          >
            <FeedbackButton
              label="Errei"
              hint="+3 XP"
              disabled={pending}
              onClick={() => submitRating("again")}
              className="border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 hover:shadow-[0_0_28px_-6px_rgba(244,63,94,0.55)]"
            />
            <FeedbackButton
              label="Difícil"
              hint="+10 XP"
              disabled={pending}
              onClick={() => submitRating("hard")}
              className="border-amber-400/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:shadow-[0_0_28px_-6px_rgba(245,158,11,0.55)]"
            />
            <FeedbackButton
              label="Fácil"
              hint="+15 XP"
              disabled={pending}
              onClick={() => submitRating("easy")}
              className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 hover:shadow-[0_0_28px_-6px_rgba(16,185,129,0.55)]"
            />
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center text-xs text-slate-500"
          >
            {remaining} restante(s) nesta rodada
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackButton({
  label,
  hint,
  className,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  className: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.94 }}
      transition={springSnappy}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border px-2 py-4 text-center backdrop-blur-xl transition disabled:cursor-wait disabled:opacity-60 sm:px-3 ${className}`}
    >
      <span className="block text-sm font-semibold sm:text-base">{label}</span>
      <span className="mt-0.5 block text-[10px] font-medium opacity-80">
        {hint}
      </span>
    </motion.button>
  );
}
