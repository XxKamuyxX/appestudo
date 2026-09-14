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

function pageTextFromExtracted(fullText: string, page: number | null): string {
  if (!page) return fullText.slice(0, 8000);
  const parts = fullText.split(/\[Página\s+(\d+)\]/i);
  for (let i = 1; i < parts.length; i += 2) {
    if (Number(parts[i]) === page) {
      return (parts[i + 1] ?? "").trim().slice(0, 8000);
    }
  }
  return fullText.slice(0, 8000);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { imageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const imageId = String(body.imageId ?? "").trim();
  if (!imageId) {
    return NextResponse.json({ error: "Imagem não informada." }, { status: 400 });
  }

  const { data: image, error: imageError } = await supabase
    .from("source_images")
    .select("*")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError || !image) {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  }

  const { data: sourceFile } = await supabase
    .from("source_files")
    .select("extracted_text, file_name")
    .eq("id", image.source_file_id)
    .maybeSingle();

  const pageContext = pageTextFromExtracted(
    String(sourceFile?.extracted_text ?? ""),
    image.page
  );

  if (!pageContext.trim()) {
    return NextResponse.json(
      {
        error:
          "Sem texto da página para sugerir pins com segurança. Adicione pins manualmente.",
      },
      { status: 400 }
    );
  }

  const system = `Você é um anatomista pedagógico de odontologia.
Sua ÚNICA fonte é o texto da página do material.
Sugira pins (hotspots) para uma figura dessa página.
Só inclua estruturas EXPLICITAMENTE nomeadas no texto.
Posicione x_pct e y_pct (0-100) de forma razoável na figura (estimativa).
Responda APENAS JSON:
{
  "pins": [
    {
      "x_pct": 40,
      "y_pct": 30,
      "label_simple": "nome fácil",
      "label_technical": "termo técnico",
      "odontology_use": "onde usa na clínica odontológica"
    }
  ]
}
Máximo 8 pins. Se nada estiver claro no texto, retorne {"pins":[]}.`;

  try {
    const model = getChatModel(system);
    const result = await model.generateContent(
      `Arquivo: ${sourceFile?.file_name ?? "material.pdf"}
Página: ${image.page ?? "?"}
Texto da página:
${pageContext}`
    );

    const parsed = extractJson(result.response.text()) as {
      pins?: Array<{
        x_pct?: number;
        y_pct?: number;
        label_simple?: string;
        label_technical?: string;
        odontology_use?: string;
      }>;
    };

    const pins = (parsed.pins ?? [])
      .filter((pin) => pin.label_simple?.trim())
      .slice(0, 8)
      .map((pin, index) => ({
        source_image_id: image.id,
        deck_id: image.deck_id,
        x_pct: Math.min(100, Math.max(0, Number(pin.x_pct) || 50)),
        y_pct: Math.min(100, Math.max(0, Number(pin.y_pct) || 50)),
        label_simple: String(pin.label_simple).trim(),
        label_technical: pin.label_technical?.trim() || null,
        odontology_use: pin.odontology_use?.trim() || null,
        sort_order: index,
      }));

    if (pins.length === 0) {
      return NextResponse.json({
        created: 0,
        message: "Nenhuma estrutura clara no texto da página.",
      });
    }

    await supabase
      .from("source_images")
      .update({ is_interactive: true })
      .eq("id", image.id);

    const { data: inserted, error: insertError } = await supabase
      .from("image_hotspots")
      .insert(pins)
      .select("id");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ created: inserted?.length ?? pins.length });
  } catch (error) {
    console.error("[hotspots/suggest]", error);
    const message =
      error instanceof Error ? error.message : "Falha ao sugerir pins.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
