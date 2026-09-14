"use client";

import { FormEvent, useMemo, useState } from "react";
import { saveImageLabel } from "@/app/actions";

export type ImageView = {
  id: string;
  public_url: string;
  page: number | null;
  label: string | null;
  label_hint: string | null;
  width: number | null;
  height: number | null;
};

type Props = {
  materiaId: string;
  images: ImageView[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ImagesQuizPanel({ materiaId, images }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    images[0]?.id ?? null
  );
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = useMemo(
    () => images.find((image) => image.id === selectedId) ?? null,
    [images, selectedId]
  );

  function checkGuess(event: FormEvent) {
    event.preventDefault();
    if (!selected?.label) {
      setFeedback("Defina o nome correto abaixo para treinar.");
      return;
    }
    const ok = normalize(guess) === normalize(selected.label);
    setFeedback(ok ? "Acertou!" : `Quase. Resposta: ${selected.label}`);
  }

  if (images.length === 0) {
    return (
      <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Imagens</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Nenhuma imagem embutida encontrada nos PDFs. (PDFs só com figuras
          vetoriais/scan podem não ter imagens extraíveis.)
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Imagens e nomenclatura
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Quiz 2D: digite o nome da estrutura. (Laboratório 3D fica para a próxima
        fase.)
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setSelectedId(image.id);
              setGuess("");
              setFeedback(null);
            }}
            className={`overflow-hidden rounded-xl border text-left ${
              selectedId === image.id
                ? "border-teal-600 ring-2 ring-teal-600/30"
                : "border-zinc-200"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.public_url}
              alt={image.label ?? "Figura do material"}
              className="h-28 w-full object-cover bg-zinc-100"
            />
            <p className="px-2 py-1 text-xs text-zinc-600">
              {image.page ? `p. ${image.page}` : "página ?"}
              {image.label ? ` · ${image.label}` : " · sem rótulo"}
            </p>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-4 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.public_url}
            alt={selected.label ?? "Figura selecionada"}
            className="max-h-80 w-full rounded-xl border border-zinc-200 object-contain bg-zinc-50"
          />

          <form onSubmit={checkGuess} className="flex flex-wrap gap-2">
            <input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Digite o nome da estrutura"
              className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Conferir
            </button>
          </form>
          {feedback ? (
            <p className="text-sm text-zinc-700">{feedback}</p>
          ) : null}

          <form action={saveImageLabel} className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
            <input type="hidden" name="materiaId" value={materiaId} />
            <input type="hidden" name="imageId" value={selected.id} />
            <input
              name="label"
              defaultValue={selected.label ?? ""}
              placeholder="Definir/corrigir nome oficial"
              className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Salvar rótulo
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
