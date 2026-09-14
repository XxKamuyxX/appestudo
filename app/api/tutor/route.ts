import { NextResponse } from "next/server";
import { embedText, getChatModel, MASTER_TUTOR_PROMPT } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type MatchRow = {
  id: string;
  content: string;
  page: number | null;
  source_file_id: string;
  similarity: number;
};

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
    throw new Error("JSON inválido da IA.");
  }
}

const GUIDED_PROMPT = `Você é um mentor de odontologia em aula guiada.
Use APENAS o material/contexto e o item atual do plano.
Fluxo:
1) Explique o item em linguagem fácil (termo técnico entre parênteses).
2) Faça UMA pergunta de checagem curta.
3) Se o aluno disser que não sabe, errou ou pediu explicação: explique de novo com analogia e exemplo clínico, sem humilhar.
4) Se o aluno acertou o essencial: confirme e diga que pode avançar.
Nunca invente fora do material. Se faltar no material, diga isso.
Responda APENAS JSON:
{
  "resposta": "...",
  "encontrado_no_material": true,
  "pode_avancar": false,
  "citacoes": [{"arquivo":"...","pagina":1,"trecho":"..."}]
}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: {
    materiaId?: string;
    question?: string;
    mode?: string;
    history?: Array<{ role: string; content: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const materiaId = String(body.materiaId ?? "").trim();
  const question = String(body.question ?? "").trim();
  const mode = body.mode === "guided" ? "guided" : "qa";
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  if (!materiaId || !question) {
    return NextResponse.json(
      { error: "Matéria e pergunta são obrigatórias." },
      { status: 400 }
    );
  }

  const { data: materia } = await supabase
    .from("decks")
    .select("id, title")
    .eq("id", materiaId)
    .maybeSingle();

  if (!materia) {
    return NextResponse.json(
      { error: "Matéria não encontrada." },
      { status: 404 }
    );
  }

  let currentItem: {
    id: string;
    title: string;
    summary: string | null;
    page: number | null;
    explanation?: string;
    sourceFileId?: string | null;
  } | null = null;

  if (mode === "guided") {
    const { data: nextOutline } = await supabase
      .from("content_outline_items")
      .select("id, title, summary, page, source_file_id")
      .eq("deck_id", materiaId)
      .neq("status", "done")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextOutline) {
      const { data: lesson } = await supabase
        .from("study_lessons")
        .select("explanation_simple, practical_odontology, technical_term")
        .eq("outline_item_id", nextOutline.id)
        .maybeSingle();

      currentItem = {
        id: nextOutline.id,
        title: nextOutline.title,
        summary: nextOutline.summary,
        page: nextOutline.page,
        explanation: [
          lesson?.explanation_simple,
          lesson?.technical_term
            ? `Termo técnico: ${lesson.technical_term}`
            : null,
          lesson?.practical_odontology
            ? `Na clínica: ${lesson.practical_odontology}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
        sourceFileId: nextOutline.source_file_id,
      };

      await supabase
        .from("content_outline_items")
        .update({ status: "in_progress" })
        .eq("id", nextOutline.id)
        .eq("status", "pending");
    } else {
      // Sem outline: usa próxima lição pendente do plano
      const { data: nextLesson } = await supabase
        .from("study_lessons")
        .select(
          "id, title, explanation_simple, practical_odontology, technical_term, source_file_id"
        )
        .eq("deck_id", materiaId)
        .eq("status", "pending")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextLesson) {
        currentItem = {
          id: nextLesson.id,
          title: nextLesson.title,
          summary: nextLesson.explanation_simple?.slice(0, 200) ?? null,
          page: null,
          explanation: [
            nextLesson.explanation_simple,
            nextLesson.technical_term
              ? `Termo técnico: ${nextLesson.technical_term}`
              : null,
            nextLesson.practical_odontology
              ? `Na clínica: ${nextLesson.practical_odontology}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          sourceFileId: nextLesson.source_file_id,
        };
      }
    }
  }

  let rows: MatchRow[] = [];
  let ragUnavailable = false;

  try {
    const embedQuery = currentItem
      ? `${currentItem.title}. ${question}`
      : question;
    const queryEmbedding = await embedText(embedQuery);
    const { data: matches, error: matchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_deck_id: materiaId,
        match_count: 6,
      }
    );

    if (matchError) {
      console.error("[tutor] match", matchError);
      ragUnavailable = true;
    } else {
      rows = (matches ?? []) as MatchRow[];
    }
  } catch (error) {
    console.error("[tutor] embed", error);
    ragUnavailable = true;
  }

  // Fallback textual quando embedding/RAG falha (aula guiada não pode travar)
  let fallbackText = "";
  if ((rows.length === 0 || ragUnavailable) && currentItem?.sourceFileId) {
    const { data: file } = await supabase
      .from("source_files")
      .select("file_name, extracted_text")
      .eq("id", currentItem.sourceFileId)
      .maybeSingle();
    if (file?.extracted_text) {
      fallbackText = `Arquivo: ${file.file_name}\n${String(file.extracted_text).slice(0, 20000)}`;
    }
  }

  if (rows.length === 0 && !fallbackText && !currentItem?.explanation) {
    const { data: files } = await supabase
      .from("source_files")
      .select("file_name, extracted_text")
      .eq("deck_id", materiaId)
      .order("created_at", { ascending: true })
      .limit(2);
    fallbackText = (files ?? [])
      .map((f) => `Arquivo: ${f.file_name}\n${String(f.extracted_text ?? "").slice(0, 12000)}`)
      .filter((t) => t.length > 20)
      .join("\n\n");
  }

  if (rows.length === 0 && !currentItem && !fallbackText.trim()) {
    return NextResponse.json({
      resposta:
        "Ainda não há material indexado nesta matéria. Envie um PDF no hub (Material) e gere o plano de estudo.",
      encontrado_no_material: false,
      citacoes: [],
      pode_avancar: false,
      itemAtual: null,
    });
  }

  const fileIds = [...new Set(rows.map((row) => row.source_file_id))];
  const { data: files } = fileIds.length
    ? await supabase.from("source_files").select("id, file_name").in("id", fileIds)
    : { data: [] };

  const fileMap = new Map(
    (files ?? []).map((file) => [file.id, file.file_name as string])
  );

  const context = [
    currentItem
      ? `[Item atual do plano]
Título: ${currentItem.title}
Resumo: ${currentItem.summary ?? ""}
Página: ${currentItem.page ?? "?"}
Explicação base: ${currentItem.explanation ?? ""}`
      : "",
    ...rows.map((row, index) => {
      const arquivo = fileMap.get(row.source_file_id) ?? "material.pdf";
      return `[Trecho ${index + 1} | arquivo: ${arquivo} | página: ${row.page ?? "?"}]
${row.content}`;
    }),
    fallbackText
      ? `[Trechos do PDF (busca textual)]\n${fallbackText}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const historyText = history
    .map((m) => `${m.role === "user" ? "Aluno" : "Mentor"}: ${m.content}`)
    .join("\n");

  try {
    const model = getChatModel(
      mode === "guided" ? GUIDED_PROMPT : MASTER_TUTOR_PROMPT
    );
    const result = await model.generateContent(
      `${historyText ? `Histórico recente:\n${historyText}\n\n` : ""}Mensagem do aluno: ${question}\n\nContexto:\n${context}`
    );
    const parsed = extractJson(result.response.text()) as {
      resposta?: string;
      encontrado_no_material?: boolean;
      pode_avancar?: boolean;
      citacoes?: Array<{
        arquivo?: string;
        pagina?: number | null;
        trecho?: string;
      }>;
    };

    const citacoes =
      parsed.citacoes?.map((item) => ({
        arquivo: item.arquivo ?? "material.pdf",
        pagina: item.pagina ?? null,
        trecho: item.trecho ?? "",
      })) ??
      rows.slice(0, 3).map((row) => ({
        arquivo: fileMap.get(row.source_file_id) ?? "material.pdf",
        pagina: row.page,
        trecho: row.content.slice(0, 220),
      }));

    return NextResponse.json({
      resposta:
        parsed.resposta ??
        "Essa informação não consta no material fornecido para esta disciplina.",
      encontrado_no_material: Boolean(parsed.encontrado_no_material),
      pode_avancar: Boolean(parsed.pode_avancar),
      citacoes,
      itemAtual: currentItem
        ? {
            id: currentItem.id,
            title: currentItem.title,
            page: currentItem.page,
          }
        : null,
    });
  } catch (error) {
    console.error("[tutor] gemini", error);
    return NextResponse.json(
      { error: "Falha ao consultar o tutor." },
      { status: 500 }
    );
  }
}
