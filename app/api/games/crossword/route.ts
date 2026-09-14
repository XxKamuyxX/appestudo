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

  let body: { materiaId?: string; sourceFileId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const materiaId = String(body.materiaId ?? "").trim();
  const sourceFileId = String(body.sourceFileId ?? "").trim() || null;
  if (!materiaId) {
    return NextResponse.json({ error: "Matéria não informada." }, { status: 400 });
  }

  let query = supabase
    .from("flashcards")
    .select("question, answer")
    .eq("deck_id", materiaId)
    .limit(20);

  if (sourceFileId) {
    query = query.eq("source_file_id", sourceFileId);
  }

  const { data: cards } = await query;
  const material =
    (cards ?? [])
      .map((c) => `Q: ${c.question}\nR: ${c.answer}`)
      .join("\n\n")
      .slice(0, 12000) || "";

  if (!material) {
    return NextResponse.json(
      { error: "Gere perguntas da matéria antes da cruzadinha." },
      { status: 400 }
    );
  }

  const system = `Crie uma cruzadinha pequena em português com 6 a 8 palavras do material.
Respostas só com letras (sem espaços), maiúsculas, 3–12 letras.
Posicione na grade começando em row/col 0.
direction: "across" ou "down".
Responda APENAS JSON:
{"words":[{"answer":"OSSO","clue":"...","row":0,"col":0,"direction":"across"}]}`;

  try {
    const model = getChatModel(system);
    const result = await model.generateContent(material);
    const parsed = extractJson(result.response.text()) as {
      words?: Array<{
        answer?: string;
        clue?: string;
        row?: number;
        col?: number;
        direction?: string;
      }>;
    };

    const words = (parsed.words ?? [])
      .map((w) => ({
        answer: String(w.answer ?? "")
          .toUpperCase()
          .replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/gi, ""),
        clue: String(w.clue ?? "").trim(),
        row: Math.max(0, Math.round(Number(w.row) || 0)),
        col: Math.max(0, Math.round(Number(w.col) || 0)),
        direction: w.direction === "down" ? ("down" as const) : ("across" as const),
      }))
      .filter((w) => w.answer.length >= 3 && w.clue);

    if (words.length < 3) {
      return NextResponse.json(
        { error: "A IA não montou uma cruzadinha válida." },
        { status: 500 }
      );
    }

    return NextResponse.json({ words });
  } catch (error) {
    console.error("[crossword]", error);
    return NextResponse.json(
      { error: "Falha ao gerar cruzadinha." },
      { status: 500 }
    );
  }
}
