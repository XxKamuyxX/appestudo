"use client";

import { FormEvent, useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function MentorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mission, setMission] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mentor");
        const data = await res.json();
        if (!res.ok) return;
        if (data.conversationId) setConversationId(data.conversationId);
        const loaded = (data.messages ?? [])
          .filter(
            (m: { role: string }) =>
              m.role === "user" || m.role === "assistant"
          )
          .map((m: { role: "user" | "assistant"; content: string }) => ({
            role: m.role,
            content: m.content,
          }));
        setMessages(loaded);
        if (loaded.length === 0) {
          setLoading(true);
          const boot = await fetch("/api/mentor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bootstrap: true }),
          });
          const bootData = await boot.json();
          if (boot.ok) {
            setConversationId(bootData.conversationId);
            setName(bootData.displayName ?? null);
            setMission(bootData.missao_sugerida ?? null);
            setMessages([{ role: "assistant", content: bootData.resposta }]);
          }
          setLoading(false);
        }
      } catch {
        setError("Não foi possível carregar o mentor.");
      } finally {
        setBooted(true);
      }
    }
    void load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha no mentor.");
        return;
      }
      setConversationId(data.conversationId);
      setName(data.displayName ?? name);
      setMission(data.missao_sugerida ?? mission);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.resposta },
      ]);
    } catch {
      setError("Falha de conexão com o mentor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Mentor IA
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-teal-950">
          {name ? `Oi, ${name}` : "Seu mentor de estudos"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Ele acompanha XP, streak, PDFs e filas — e sugere o próximo passo do
          dia.
        </p>
        {mission ? (
          <p className="mt-3 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Missão sugerida: <strong>{mission}</strong>
          </p>
        ) : null}
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border border-zinc-100 bg-gradient-to-b from-zinc-50 to-white p-4">
        {!booted ? (
          <p className="text-sm text-zinc-500">Abrindo conversa...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500">Aguardando o mentor...</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "ml-10 bg-teal-700 text-white"
                  : "mr-6 border border-teal-900/10 bg-white text-zinc-800 shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Conte como foi estudar hoje, tire dúvida, peça um plano..."
          className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-teal-600 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? "..." : "Enviar"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
