import { NextResponse } from "next/server";
import { getChatModel } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("JSON inválido.");
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: {
    message?: string;
    conversationId?: string;
    bootstrap?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  const bootstrap = Boolean(body.bootstrap);
  if (!message && !bootstrap) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() ||
    profile?.email?.split("@")[0] ||
    "estudante";

  const [{ data: stats }, { data: decks }, { data: dueCards }, { data: pendingLessons }] =
    await Promise.all([
      supabase
        .from("user_stats")
        .select("xp, streak_current, streak_best, last_study_date")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("decks").select("id, title").order("created_at", {
        ascending: true,
      }),
      supabase
        .from("flashcards")
        .select("id, deck_id, question, repetitions")
        .lte("next_review_at", new Date().toISOString())
        .limit(20),
      supabase
        .from("study_lessons")
        .select("id, deck_id, title, status")
        .eq("status", "pending")
        .limit(20),
    ]);

  let conversationId = String(body.conversationId ?? "").trim() || null;

  if (!conversationId) {
    const { data: existing } = await supabase
      .from("mentor_conversations")
      .select("id")
      .eq("user_id", user.id)
      .is("deck_id", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      conversationId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from("mentor_conversations")
        .insert({
          user_id: user.id,
          title: `Mentor · ${displayName}`,
        })
        .select("id")
        .single();
      if (createError || !created) {
        return NextResponse.json(
          { error: createError?.message ?? "Falha ao abrir conversa." },
          { status: 500 }
        );
      }
      conversationId = created.id;
    }
  }

  const { data: historyRows } = await supabase
    .from("mentor_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30);

  const history = historyRows ?? [];

  const context = `
Nome da aluna: ${displayName}
XP: ${stats?.xp ?? 0}
Streak atual: ${stats?.streak_current ?? 0} (recorde ${stats?.streak_best ?? 0})
Último estudo: ${stats?.last_study_date ?? "nunca"}
Matérias: ${(decks ?? []).map((d) => d.title).join(", ") || "nenhuma"}
Perguntas na fila agora: ${(dueCards ?? []).length}
Lições pendentes no plano: ${(pendingLessons ?? []).length}
Exemplos de fila: ${(dueCards ?? [])
  .slice(0, 3)
  .map((c) => c.question)
  .join(" | ")}
Próximas lições: ${(pendingLessons ?? [])
  .slice(0, 3)
  .map((l) => l.title)
  .join(" | ")}
`.trim();

  const userText = bootstrap
    ? "Inicie a conversa: apresente-se como mentor, chame a aluna pelo nome e sugira a missão do dia (curta)."
    : message;

  if (!bootstrap) {
    await supabase.from("mentor_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: message,
    });
  }

  const system = `Você é o Mentor do App Estudo — capacitação em odontologia/faculdade.
Chame a aluna pelo nome (${displayName}). Seja caloroso, claro e interativo.
Você CONHECE o contexto de progresso abaixo e deve usá-lo.
Sugira missões curtas do dia (8–12 min): 1 item do plano + teste MCQ + jogo ocasional.
Nunca esgote todo o conteúdo de uma vez.
Se ela errar ou não souber, explique com paciência.
Responda APENAS JSON: {"resposta":"...","missao_sugerida":"..."}`;

  try {
    const model = getChatModel(system);
    const historyText = history
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const result = await model.generateContent(
      `Contexto do aluno:\n${context}\n\nHistórico:\n${historyText || "(primeira conversa)"}\n\nMensagem:\n${userText}`
    );
    const parsed = extractJson(result.response.text()) as {
      resposta?: string;
      missao_sugerida?: string;
    };
    const reply =
      parsed.resposta ??
      `Olá, ${displayName}! Sou seu mentor. Vamos estudar com calma hoje.`;

    await supabase.from("mentor_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: reply,
    });

    await supabase
      .from("mentor_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({
      conversationId,
      resposta: reply,
      missao_sugerida: parsed.missao_sugerida ?? null,
      displayName,
    });
  } catch (error) {
    console.error("[mentor]", error);
    return NextResponse.json(
      { error: "Falha ao falar com o mentor." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: conversation } = await supabase
    .from("mentor_conversations")
    .select("id")
    .eq("user_id", user.id)
    .is("deck_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  const { data: messages } = await supabase
    .from("mentor_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({
    conversationId: conversation.id,
    messages: messages ?? [],
  });
}
