"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ProgressBar } from "@/app/materias/progress-bar";

export type HubPdfProgress = {
  sourceFileId: string;
  fileName: string;
  percent: number;
};

type Props = {
  materiaId: string;
  title: string;
  description: string | null;
  xp: number;
  streak: number;
  coveragePercent: number;
  completedPdfs: number;
  totalPdfs: number;
  dueCount: number;
  pendingLessons: number;
  pdfs: HubPdfProgress[];
};

export function MateriaHub({
  materiaId,
  title,
  description,
  xp,
  streak,
  coveragePercent,
  completedPdfs,
  totalPdfs,
  dueCount,
  pendingLessons,
  pdfs,
}: Props) {
  const missionHref =
    pendingLessons > 0
      ? `/materias/${materiaId}/aprender?tab=plano`
      : dueCount > 0
        ? `/materias/${materiaId}/estudar`
        : `/materias/${materiaId}/jogos`;

  const missionLabel =
    pendingLessons > 0
      ? "Continuar a lição do plano"
      : dueCount > 0
        ? "Fazer o teste de hoje"
        : "Jogar e reforçar";

  const missionHint =
    pendingLessons > 0
      ? `${pendingLessons} item(ns) do plano ainda pendente(s)`
      : dueCount > 0
        ? `${dueCount} pergunta(s) na fila (sessão curta)`
        : "Memória ou cruzadinha para fixar sem cansar";

  const cards = [
    {
      href: `/materias/${materiaId}/aprender?tab=tutor`,
      title: "Aprender com o mentor",
      desc: "Aula conversacional: explica cada item do PDF e tira dúvidas.",
      cta: "Abrir aula guiada",
    },
    {
      href: `/materias/${materiaId}/estudar`,
      title: "Teste seu conhecimento",
      desc: "Múltipla escolha (4 opções). Fonte do PDF só depois de responder.",
      cta: dueCount > 0 ? `Testar agora (${dueCount})` : "Ver fila",
    },
    {
      href: `/materias/${materiaId}/jogos`,
      title: "Jogos",
      desc: "Memória e cruzadinha com termos da matéria.",
      cta: "Jogar",
    },
    {
      href: `/materias/${materiaId}/aprender?tab=laboratorio`,
      title: "Laboratório",
      desc: "Figuras do PDF com hotspots e crânio 3D.",
      cta: "Entrar no lab",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-teal-900/10 bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 px-6 py-8 text-white shadow-md">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">
            Hub do dia
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-xl text-sm text-teal-50/90">{description}</p>
          ) : (
            <p className="mt-2 max-w-xl text-sm text-teal-50/90">
              Missões curtas: aprenda um bloco, teste e jogue — sem esgotar tudo
              de uma vez.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur">
              {xp} XP
            </span>
            <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur">
              Streak {streak} dia(s)
            </span>
            <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur">
              PDFs {completedPdfs}/{totalPdfs} em 100%
            </span>
          </div>
          <div className="mt-4 max-w-md space-y-1">
            <div className="flex justify-between text-xs text-teal-50/90">
              <span>Cobertura da matéria</span>
              <span>{coveragePercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.min(100, coveragePercent)}%` }}
              />
            </div>
          </div>
          <Link
            href={missionHref}
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-teal-900 shadow-sm hover:bg-teal-50"
          >
            Missão de hoje: {missionLabel}
          </Link>
          <p className="mt-2 text-xs text-teal-100">{missionHint}</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={card.href}
              className="block h-full rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600/40 hover:shadow-md"
            >
              <h2 className="font-serif text-xl font-semibold text-teal-950">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{card.desc}</p>
              <p className="mt-4 text-sm font-medium text-teal-700">{card.cta} →</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {pdfs.length > 0 ? (
        <section className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Progresso por PDF (submatéria)
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Escolha um PDF para ver onde está melhor e testar só aquele
            conteúdo.
          </p>
          <ul className="mt-4 space-y-3">
            {pdfs.map((pdf) => (
              <li key={pdf.sourceFileId}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {pdf.fileName}
                  </p>
                  <Link
                    href={`/materias/${materiaId}/estudar?pdf=${pdf.sourceFileId}`}
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Testar este PDF
                  </Link>
                </div>
                <div className="mt-1">
                  <ProgressBar percent={pdf.percent} compact />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
