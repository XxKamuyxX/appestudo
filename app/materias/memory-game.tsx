"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { awardGameXp } from "@/app/actions";

type Pair = { id: string; term: string; definition: string };

type Card = {
  key: string;
  pairId: string;
  text: string;
  side: "term" | "def";
};

type Props = {
  materiaId: string;
  pairs: Pair[];
  sourceFileId?: string | null;
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function MemoryGame({ materiaId, pairs, sourceFileId }: Props) {
  const cards = useMemo(() => {
    const built: Card[] = pairs.flatMap((pair) => [
      {
        key: `${pair.id}-t`,
        pairId: pair.id,
        text: pair.term,
        side: "term" as const,
      },
      {
        key: `${pair.id}-d`,
        pairId: pair.id,
        text: pair.definition,
        side: "def" as const,
      },
    ]);
    return shuffle(built);
  }, [pairs]);

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleFlip(key: string) {
    if (lock || matched.includes(key) || flipped.includes(key) || done) return;
    const next = [...flipped, key];
    setFlipped(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    setLock(true);
    const [aKey, bKey] = next;
    const a = cards.find((c) => c.key === aKey);
    const b = cards.find((c) => c.key === bKey);
    if (a && b && a.pairId === b.pairId && a.side !== b.side) {
      const nextMatched = [...matched, aKey, bKey];
      setMatched(nextMatched);
      setFlipped([]);
      setLock(false);
      if (nextMatched.length === cards.length) {
        setDone(true);
      }
    } else {
      window.setTimeout(() => {
        setFlipped([]);
        setLock(false);
      }, 700);
    }
  }

  function claimXp() {
    const formData = new FormData();
    formData.set("materiaId", materiaId);
    formData.set("gameType", "memory");
    formData.set("score", String(Math.max(1, pairs.length * 10 - moves)));
    if (sourceFileId) formData.set("sourceFileId", sourceFileId);
    startTransition(async () => {
      await awardGameXp(formData);
    });
  }

  if (pairs.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Ainda não há pares. Envie um PDF para gerar perguntas e volte aqui.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-600">
        Encontre o termo e a definição. Jogadas: {moves}
        {done ? " · completo!" : ""}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((card) => {
          const show =
            flipped.includes(card.key) || matched.includes(card.key);
          return (
            <motion.button
              key={card.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleFlip(card.key)}
              className={`min-h-24 rounded-xl border px-3 py-3 text-left text-xs font-medium transition ${
                matched.includes(card.key)
                  ? "border-teal-600 bg-teal-50 text-teal-900"
                  : show
                    ? "border-teal-300 bg-white text-zinc-800"
                    : "border-teal-900/20 bg-teal-800 text-teal-50"
              }`}
            >
              {show ? card.text : "?"}
            </motion.button>
          );
        })}
      </div>
      {done ? (
        <button
          type="button"
          disabled={pending}
          onClick={claimXp}
          className="mt-4 w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Receber XP da memória (+10)"}
        </button>
      ) : null}
    </div>
  );
}
