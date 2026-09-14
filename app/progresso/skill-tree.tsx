"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Node = {
  id: string;
  title: string;
  mastery: number;
  totalCards: number;
  unlocked: boolean;
};

type Props = {
  nodes: Node[];
};

export function SkillTree({ nodes }: Props) {
  return (
    <div className="relative space-y-4">
      {nodes.map((node, index) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06, duration: 0.35 }}
          className={`rounded-2xl border px-5 py-4 ${
            node.unlocked
              ? "border-teal-700/20 bg-white shadow-sm"
              : "border-zinc-200 bg-zinc-100/80 opacity-70"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {node.unlocked ? "Desbloqueada" : "Bloqueada"}
              </p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-teal-950">
                {node.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600">
                {node.totalCards} pergunta(s) · domínio {node.mastery}%
              </p>
            </div>
            {node.unlocked ? (
              <Link
                href={`/materias/${node.id}/estudar`}
                className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
              >
                Estudar
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-500">
                Crie perguntas
              </span>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <motion.div
              className="h-full rounded-full bg-teal-600"
              initial={{ width: 0 }}
              animate={{ width: `${node.mastery}%` }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
            />
          </div>
          {index < nodes.length - 1 ? (
            <div className="mx-auto mt-4 h-6 w-px bg-teal-700/30" aria-hidden />
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
