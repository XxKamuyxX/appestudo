"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markOutlineItemDone } from "@/app/actions";

type Citation = {
  arquivo: string;
  pagina: number | null;
  trecho: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  citacoes?: Citation[];
};

type Props = {
  materiaId: string;
  displayName?: string | null;
  nextItemTitle?: string | null;
};

export function TutorChat({
  materiaId,
  displayName,
  nextItemTitle,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"guided" | "qa">("guided");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState<string | null>(
    nextItemTitle ?? null
  );
  const [canAdvance, setCanAdvance] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started || mode !== "guided") return;
    setStarted(true);
    const name = displayName?.trim() || "você";
    void sendMessage(
      `Olá! Sou ${name}. Pode começar a aula pelo próximo item do plano e me explicar com calma?`,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function sendMessage(question: string, silentUser = false) {
    if (!question || loading) return;
    setError(null);
    if (!silentUser) {
      setMessages((prev) => [...prev, { role: "user", content: question }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Quero começar a aula de hoje." },
      ]);
    }
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          question,
          mode,
          history,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Falha no tutor.");
        return;
      }
      if (data.itemAtual?.id) {
        setItemId(data.itemAtual.id);
        setItemTitle(data.itemAtual.title);
      }
      setCanAdvance(Boolean(data.pode_avancar));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.resposta,
          citacoes: data.citacoes ?? [],
        },
      ]);
    } catch {
      setError("Não foi possível falar com o tutor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    await sendMessage(question);
  }

  async function handleAdvance() {
    if (!itemId) return;
    const formData = new FormData();
    formData.set("materiaId", materiaId);
    formData.set("outlineItemId", itemId);
    await markOutlineItemDone(formData);
    setCanAdvance(false);
    setItemId(null);
    router.refresh();
    await sendMessage(
      "Marquei este item como entendido. Pode avançar para o próximo item do plano?"
    );
  }

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Aula com o mentor
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Ele explica item a item do PDF. Se você não souber, ele explica de
            novo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("guided");
              setStarted(false);
              setMessages([]);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              mode === "guided"
                ? "bg-teal-700 text-white"
                : "border border-zinc-200 text-zinc-700"
            }`}
          >
            Aula guiada
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("qa");
              setMessages([]);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              mode === "qa"
                ? "bg-teal-700 text-white"
                : "border border-zinc-200 text-zinc-700"
            }`}
          >
            Perguntas livres
          </button>
        </div>
      </div>

      {itemTitle ? (
        <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
          Item atual: <strong>{itemTitle}</strong>
        </p>
      ) : null}

      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {mode === "guided"
              ? "Iniciando a conversa com o próximo item do plano..."
              : "Pergunte qualquer coisa sobre o material indexado."}
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-8 bg-teal-700 text-white"
                  : "mr-8 bg-white text-zinc-800 shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.citacoes && message.citacoes.length > 0 ? (
                <div className="mt-2 space-y-1 border-t border-zinc-200 pt-2 text-xs text-zinc-600">
                  <p className="font-semibold text-teal-900">Fontes</p>
                  {message.citacoes.map((citation, cIndex) => (
                    <p key={cIndex}>
                      {citation.arquivo}
                      {citation.pagina ? ` · p. ${citation.pagina}` : ""}
                      {citation.trecho
                        ? ` — “${citation.trecho.slice(0, 160)}”`
                        : ""}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canAdvance && itemId ? (
        <button
          type="button"
          onClick={() => void handleAdvance()}
          className="mt-3 w-full rounded-lg border border-teal-700 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 hover:bg-teal-100"
        >
          Entendi — avançar para o próximo item (+ progresso)
        </button>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void sendMessage("Não sei a resposta, pode explicar de outro jeito?")}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Não sei — explique de novo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            mode === "guided"
              ? "Responda à pergunta do mentor..."
              : "Pergunte sobre o material..."
          }
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? "..." : "Enviar"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
