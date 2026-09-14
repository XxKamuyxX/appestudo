import { NextResponse } from "next/server";
import { getChatModel } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;

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

type LessonJson = {
  titulo: string;
  explicacao_simples: string;
  termo_tecnico: string;
  atividade: string;
  resposta_atividade: string;
  pratica_odontologia: string;
  pagina?: number | null;
  resumo_item?: string;
};

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
    return NextResponse.json(
      { error: "Matéria não informada." },
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

  let materialText = "";
  let fileLabel = "vários PDFs";

  if (sourceFileId) {
    const { data: file } = await supabase
      .from("source_files")
      .select("extracted_text, file_name")
      .eq("id", sourceFileId)
      .eq("deck_id", materiaId)
      .maybeSingle();
    materialText = String(file?.extracted_text ?? "").slice(0, 60000);
    fileLabel = file?.file_name ?? "PDF";
  } else {
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, page")
      .eq("deck_id", materiaId)
      .order("chunk_index", { ascending: true })
      .limit(50);

    materialText = (chunks ?? [])
      .map((chunk) => chunk.content)
      .join("\n\n")
      .trim();

    if (!materialText) {
      const { data: files } = await supabase
        .from("source_files")
        .select("extracted_text, file_name")
        .eq("deck_id", materiaId)
        .order("created_at", { ascending: false })
        .limit(5);

      materialText = (files ?? [])
        .map((file) => file.extracted_text)
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 60000);
    }
  }

  if (!materialText.trim()) {
    return NextResponse.json(
      { error: "Envie PDFs antes de gerar o plano." },
      { status: 400 }
    );
  }

  const system = `Você é um pedagogo de odontologia.
Use APENAS o material fornecido. Não invente fatos fora do texto.
Crie um plano COMPLETO: um item/lição para CADA conceito ou seção importante do material.
Objetivo: não deixar nada para trás. Prefira muitas lições curtas (8 a 20) a poucas longas.
Cada lição = um item do PDF (tópico). Linguagem fácil + termo técnico.
Responda APENAS JSON:
{
  "titulo": "...",
  "resumo": "...",
  "licoes": [
    {
      "titulo": "...",
      "explicacao_simples": "...",
      "termo_tecnico": "...",
      "atividade": "pergunta curta de checagem",
      "resposta_atividade": "...",
      "pratica_odontologia": "exemplo na clínica",
      "pagina": 1,
      "resumo_item": "1 frase do que o aluno precisa dominar"
    }
  ]
}
Arquivo em foco: ${fileLabel}`;

  try {
    const model = getChatModel(system);
    const result = await model.generateContent(
      `Matéria: ${materia.title}\n\nMaterial:\n${materialText}`
    );
    const parsed = extractJson(result.response.text()) as {
      titulo?: string;
      resumo?: string;
      licoes?: LessonJson[];
    };

    const lessons = (parsed.licoes ?? []).filter(
      (lesson) =>
        lesson.titulo &&
        lesson.explicacao_simples &&
        lesson.atividade &&
        lesson.pratica_odontologia
    );

    if (lessons.length === 0) {
      return NextResponse.json(
        { error: "A IA não retornou lições válidas." },
        { status: 500 }
      );
    }

    // limpa plano anterior
    await supabase.from("study_plans").delete().eq("deck_id", materiaId);
    if (sourceFileId) {
      await supabase
        .from("content_outline_items")
        .delete()
        .eq("deck_id", materiaId)
        .eq("source_file_id", sourceFileId);
    } else {
      await supabase
        .from("content_outline_items")
        .delete()
        .eq("deck_id", materiaId);
    }

    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        deck_id: materiaId,
        title: parsed.titulo ?? `Plano: ${materia.title}`,
        summary: parsed.resumo ?? null,
      })
      .select("id, title, summary")
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: planError?.message ?? "Falha ao salvar plano." },
        { status: 500 }
      );
    }

    const outlineRows = lessons.map((lesson, index) => ({
      deck_id: materiaId,
      source_file_id: sourceFileId,
      title: lesson.titulo,
      page:
        typeof lesson.pagina === "number" && lesson.pagina > 0
          ? Math.round(lesson.pagina)
          : null,
      summary: lesson.resumo_item || lesson.explicacao_simples.slice(0, 240),
      sort_order: index,
      status: "pending" as const,
    }));

    // se não há sourceFileId, usa o primeiro PDF da matéria
    let resolvedSourceId = sourceFileId;
    if (!resolvedSourceId) {
      const { data: firstFile } = await supabase
        .from("source_files")
        .select("id")
        .eq("deck_id", materiaId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedSourceId = firstFile?.id ?? null;
    }

    if (!resolvedSourceId) {
      return NextResponse.json(
        { error: "É necessário pelo menos um PDF para o plano." },
        { status: 400 }
      );
    }

    const outlineWithFile = outlineRows.map((row) => ({
      ...row,
      source_file_id: resolvedSourceId!,
    }));

    const { data: outlineInserted, error: outlineError } = await supabase
      .from("content_outline_items")
      .insert(outlineWithFile)
      .select("id, sort_order");

    if (outlineError || !outlineInserted) {
      return NextResponse.json(
        { error: outlineError?.message ?? "Falha ao salvar itens do PDF." },
        { status: 500 }
      );
    }

    const outlineByOrder = new Map(
      outlineInserted.map((row) => [row.sort_order, row.id])
    );

    const lessonRows = lessons.map((lesson, index) => ({
      plan_id: plan.id,
      deck_id: materiaId,
      sort_order: index,
      title: lesson.titulo,
      explanation_simple: lesson.explicacao_simples,
      technical_term: lesson.termo_tecnico || null,
      activity_prompt: lesson.atividade,
      activity_answer: lesson.resposta_atividade || null,
      practical_odontology: lesson.pratica_odontologia,
      status: "pending",
      source_file_id: resolvedSourceId,
      topic_key: `item-${index}`,
      outline_item_id: outlineByOrder.get(index) ?? null,
    }));

    const { error: lessonsError } = await supabase
      .from("study_lessons")
      .insert(lessonRows);

    if (lessonsError) {
      return NextResponse.json(
        { error: lessonsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      planId: plan.id,
      title: plan.title,
      lessons: lessonRows.length,
      outlineItems: outlineInserted.length,
    });
  } catch (error) {
    console.error("[study-plan]", error);
    const message =
      error instanceof Error ? error.message : "Falha ao gerar plano.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
