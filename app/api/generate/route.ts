import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_CHARS = 120_000;

type GeneratedPergunta = {
  pergunta: string;
  resposta: string;
  opcoes: string[];
  indice_correto: number;
  fonte: string;
  pagina: number | null;
};

function extractJsonObject(raw: string): unknown {
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
    throw new Error("Resposta da IA não é JSON válido.");
  }
}

function parsePage(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      const n = Number(match[0]);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

function normalizeOptions(
  item: Record<string, unknown>,
  resposta: string
): { opcoes: string[]; indice_correto: number } | null {
  let opcoes: string[] = [];
  if (Array.isArray(item.opcoes)) {
    opcoes = item.opcoes.map((o) => String(o ?? "").trim()).filter(Boolean);
  }

  let indice =
    typeof item.indice_correto === "number"
      ? Math.round(item.indice_correto)
      : Number(item.indice_correto);

  if (opcoes.length !== 4) {
    // fallback: resposta + 3 distractors genéricos se a IA falhar
    if (!resposta) return null;
    opcoes = [
      resposta,
      "Nenhuma das alternativas anteriores",
      "Conceito não abordado no material",
      "Todas as estruturas citadas",
    ];
    indice = 0;
  }

  if (!Number.isFinite(indice) || indice < 0 || indice > 3) {
    const found = opcoes.findIndex(
      (o) => o.toLowerCase() === resposta.toLowerCase()
    );
    indice = found >= 0 ? found : 0;
    if (found < 0) {
      opcoes[0] = resposta;
      indice = 0;
    }
  }

  // garante que a resposta correta está nas opções
  if (
    !opcoes.some((o) => o.toLowerCase() === resposta.toLowerCase()) &&
    resposta
  ) {
    opcoes[indice] = resposta;
  }

  return { opcoes, indice_correto: indice };
}

function parsePerguntas(payload: unknown): GeneratedPergunta[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("JSON inválido.");
  }

  const perguntas = (payload as { perguntas?: unknown }).perguntas;
  if (!Array.isArray(perguntas)) {
    throw new Error('Campo "perguntas" ausente.');
  }

  const parsed: GeneratedPergunta[] = [];
  for (const item of perguntas) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const pergunta = String(row.pergunta ?? "").trim();
    const resposta = String(row.resposta ?? "").trim();
    const fonte = String(row.fonte ?? "").trim();
    const pagina = parsePage(row.pagina);
    const normalized = normalizeOptions(row, resposta);
    if (pergunta && resposta && normalized) {
      parsed.push({
        pergunta,
        resposta,
        opcoes: normalized.opcoes,
        indice_correto: normalized.indice_correto,
        fonte,
        pagina,
      });
    }
  }

  if (parsed.length === 0) {
    throw new Error("A IA não retornou perguntas válidas.");
  }

  return parsed;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { sourceFileId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const sourceFileId = String(body.sourceFileId ?? "").trim();
  if (!sourceFileId) {
    return NextResponse.json(
      { error: "Arquivo fonte não informado." },
      { status: 400 }
    );
  }

  const { data: sourceFile, error: sourceError } = await supabase
    .from("source_files")
    .select("*")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (sourceError || !sourceFile) {
    return NextResponse.json(
      { error: "Arquivo fonte não encontrado." },
      { status: 404 }
    );
  }

  const text = String(sourceFile.extracted_text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      {
        error:
          "Este PDF não tem texto extraível (pode ser só imagem). Não é possível gerar perguntas.",
      },
      { status: 400 }
    );
  }

  const clipped =
    text.length > MAX_TEXT_CHARS
      ? `${text.slice(0, MAX_TEXT_CHARS)}\n\n[texto truncado]`
      : text;

  const fileName = String(sourceFile.file_name);

  const systemPrompt = `Você é um assistente acadêmico de odontologia.
Sua ÚNICA fonte de verdade é o texto do material fornecido pelo usuário.
Sob nenhuma circunstância use conhecimento prévio fora desse texto.
O material vem marcado com [Página N]. Use esse marcador para preencher "pagina".
Gere perguntas de múltipla escolha (4 alternativas) estritamente baseadas no material.
Para cada item:
- "pergunta": enunciado claro
- "resposta": texto da alternativa correta (igual a uma das opcoes)
- "opcoes": array com EXATAMENTE 4 strings (distratores plausíveis do mesmo tema)
- "indice_correto": número 0 a 3 indicando a opção correta
- "fonte": trecho LITERAL curto (1–3 frases) copiado do material
- "pagina": número da página (obrigatório se houver [Página N])
Se não houver trecho literal claro, omita essa pergunta.
Responda APENAS com JSON válido neste formato exato:
{"perguntas":[{"pergunta":"...","resposta":"...","opcoes":["A","B","C","D"],"indice_correto":0,"fonte":"...","pagina":1}]}
Gere entre 8 e 15 perguntas, conforme a riqueza do texto.
Em português. O arquivo de origem se chama: ${fileName}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.25,
      },
    });

    const result = await model.generateContent([
      { text: systemPrompt },
      {
        text: `Material da disciplina (arquivo: ${fileName}):\n\n${clipped}`,
      },
    ]);

    const raw = result.response.text();
    const perguntas = parsePerguntas(extractJsonObject(raw));

    const rows = perguntas.map((item) => ({
      deck_id: sourceFile.deck_id,
      source_file_id: sourceFile.id,
      question: item.pergunta,
      answer: item.resposta,
      options: item.opcoes,
      correct_index: item.indice_correto,
      source_excerpt: item.fonte || null,
      source_file_name: fileName,
      source_page: item.pagina,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("flashcards")
      .insert(rows)
      .select("id");

    if (insertError) {
      console.error("[generate] falha ao salvar flashcards", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      created: inserted?.length ?? rows.length,
      sourceFileId: sourceFile.id,
    });
  } catch (error) {
    console.error("[generate] falha Gemini", error);
    const message =
      error instanceof Error ? error.message : "Falha ao gerar perguntas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
