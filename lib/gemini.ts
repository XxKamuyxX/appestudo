import { GoogleGenerativeAI } from "@google/generative-ai";

/** Embedding atual da Gemini API (text-embedding-004 retorna 404). */
const EMBEDDING_MODEL = "gemini-embedding-001";
/** Alinhado com `document_chunks.embedding vector(768)`. */
const EMBEDDING_DIMENSIONS = 768;
const CHAT_MODEL = "gemini-3.6-flash";

export function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }
  return key;
}

export function getGeminiClient() {
  return new GoogleGenerativeAI(requireGeminiKey());
}

export async function embedText(text: string): Promise<number[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const clipped = text.slice(0, 8000).trim() || " ";

  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: clipped }] },
    // @ts-expect-error SDK tipa embedContent de forma restrita; a API aceita outputDimensionality
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });

  const values = result.embedding.values;
  if (!values?.length) {
    throw new Error("Embedding vazio.");
  }

  if (values.length === EMBEDDING_DIMENSIONS) {
    return values;
  }
  if (values.length > EMBEDDING_DIMENSIONS) {
    return values.slice(0, EMBEDDING_DIMENSIONS);
  }
  return [...values, ...Array(EMBEDDING_DIMENSIONS - values.length).fill(0)];
}

export function getChatModel(systemInstruction: string) {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });
}

export const MASTER_TUTOR_PROMPT = `Você é um assistente acadêmico de odontologia.
Sua ÚNICA fonte de verdade é o contexto fornecido abaixo.
Se a resposta para a pergunta do aluno não estiver presente EXPLICITAMENTE no texto fornecido, você DEVE responder exatamente:
"Essa informação não consta no material fornecido para esta disciplina."
Sob nenhuma circunstância utilize seu conhecimento prévio sobre o tema.

Quando houver resposta no contexto:
- Explique em linguagem fácil e, entre parênteses, o termo técnico correspondente.
- Dê um exemplo prático de uso na odontologia/clínica quando o contexto permitir.
- Cite as fontes usadas (arquivo + página quando existir).

Responda APENAS JSON:
{
  "resposta": "...",
  "encontrado_no_material": true,
  "citacoes": [{"arquivo":"...","pagina":1,"trecho":"..."}]
}`;
