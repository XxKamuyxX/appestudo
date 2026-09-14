"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createHotspot,
  deleteHotspot,
  toggleImageInteractive,
} from "@/app/actions";
import type { ImageHotspot } from "@/lib/types";

export type LabImage = {
  id: string;
  public_url: string;
  page: number | null;
  label: string | null;
  is_interactive: boolean;
};

type Props = {
  materiaId: string;
  images: LabImage[];
  hotspots: ImageHotspot[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function InteractiveLabPanel({ materiaId, images, hotspots }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    images.find((image) => image.is_interactive)?.id ?? images[0]?.id ?? null
  );
  const [mode, setMode] = useState<"explore" | "quiz">("explore");
  const [activePin, setActivePin] = useState<ImageHotspot | null>(null);
  const [zoom, setZoom] = useState(1);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);
  const [pinX, setPinX] = useState(50);
  const [pinY, setPinY] = useState(50);
  const stageRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => images.find((image) => image.id === selectedId) ?? null,
    [images, selectedId]
  );

  const pins = useMemo(
    () =>
      hotspots
        .filter((pin) => pin.source_image_id === selectedId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [hotspots, selectedId]
  );

  async function suggestPins() {
    if (!selected) return;
    setSuggesting(true);
    setSuggestMsg(null);
    try {
      const response = await fetch("/api/hotspots/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: selected.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSuggestMsg(data.error ?? "Falha ao sugerir pins.");
        return;
      }
      setSuggestMsg(
        data.created
          ? `${data.created} pin(s) sugerido(s).`
          : data.message ?? "Nenhum pin sugerido."
      );
      router.refresh();
    } catch {
      setSuggestMsg("Não foi possível sugerir pins.");
    } finally {
      setSuggesting(false);
    }
  }

  function handleStageClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!selected || !stageRef.current) return;
    if ((event.target as HTMLElement).dataset.pin === "true") return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setActivePin(null);
    setPinX(Math.round(x * 10) / 10);
    setPinY(Math.round(y * 10) / 10);
  }

  function checkQuiz(event: FormEvent, pin: ImageHotspot) {
    event.preventDefault();
    const guess = guesses[pin.id] ?? "";
    const ok =
      normalize(guess) === normalize(pin.label_simple) ||
      (pin.label_technical
        ? normalize(guess) === normalize(pin.label_technical)
        : false);
    setFeedback((prev) => ({
      ...prev,
      [pin.id]: ok
        ? "Acertou!"
        : `Resposta: ${pin.label_simple}${
            pin.label_technical ? ` (${pin.label_technical})` : ""
          }`,
    }));
  }

  if (images.length === 0) {
    return (
      <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Laboratório</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Nenhuma figura do PDF ainda. Importe as aulas de Anatomia ou envie um
          PDF.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Laboratório (figuras da aula)
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Mesmas imagens do PDF — explorar pins ou digitar os nomes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("explore")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              mode === "explore"
                ? "bg-teal-700 text-white"
                : "border border-zinc-300 text-zinc-700"
            }`}
          >
            Explorar
          </button>
          <button
            type="button"
            onClick={() => setMode("quiz")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              mode === "quiz"
                ? "bg-teal-700 text-white"
                : "border border-zinc-300 text-zinc-700"
            }`}
          >
            Quiz
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setSelectedId(image.id);
              setActivePin(null);
            }}
            className={`overflow-hidden rounded-lg border text-left ${
              selectedId === image.id
                ? "border-teal-600 ring-2 ring-teal-600/30"
                : "border-zinc-200"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.public_url}
              alt=""
              className="h-20 w-full object-cover bg-zinc-100"
            />
            <p className="px-2 py-1 text-[11px] text-zinc-600">
              {image.page ? `p. ${image.page}` : "p. ?"}
              {image.is_interactive ? " · interativa" : ""}
            </p>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            >
              −
            </button>
            <span className="text-xs text-zinc-500">
              Zoom {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
            >
              +
            </button>
            <button
              type="button"
              onClick={suggestPins}
              disabled={suggesting}
              className="rounded-lg border border-teal-700 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
            >
              {suggesting ? "Sugerindo..." : "Sugerir pins (IA)"}
            </button>
            <form action={toggleImageInteractive}>
              <input type="hidden" name="materiaId" value={materiaId} />
              <input type="hidden" name="imageId" value={selected.id} />
              <input
                type="hidden"
                name="value"
                value={selected.is_interactive ? "false" : "true"}
              />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1 text-xs text-zinc-700"
              >
                {selected.is_interactive
                  ? "Remover do lab"
                  : "Marcar interativa"}
              </button>
            </form>
          </div>
          {suggestMsg ? (
            <p className="text-xs text-zinc-600">{suggestMsg}</p>
          ) : null}

          <div className="overflow-auto rounded-xl border border-zinc-200 bg-zinc-50">
            <div
              ref={stageRef}
              onClick={handleStageClick}
              className="relative mx-auto origin-top-left cursor-crosshair"
              style={{
                width: `${zoom * 100}%`,
                maxWidth: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.public_url}
                alt={selected.label ?? "Figura da aula"}
                className="block w-full select-none"
                draggable={false}
              />
              {pins.map((pin) => (
                <button
                  key={pin.id}
                  type="button"
                  data-pin="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActivePin(pin);
                  }}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-600 shadow"
                  style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
                  title={pin.label_simple}
                />
              ))}
            </div>
          </div>

          {mode === "explore" && activePin ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm">
              <p className="font-semibold text-teal-950">
                {activePin.label_simple}
              </p>
              {activePin.label_technical ? (
                <p className="mt-1 text-zinc-700">
                  Termo técnico: <strong>{activePin.label_technical}</strong>
                </p>
              ) : null}
              {activePin.odontology_use ? (
                <p className="mt-1 text-zinc-700">
                  Na odontologia: {activePin.odontology_use}
                </p>
              ) : null}
              <form action={deleteHotspot} className="mt-2">
                <input type="hidden" name="materiaId" value={materiaId} />
                <input type="hidden" name="hotspotId" value={activePin.id} />
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  Excluir pin
                </button>
              </form>
            </div>
          ) : null}

          {mode === "quiz" ? (
            <ul className="space-y-2">
              {pins.map((pin, index) => (
                <li
                  key={pin.id}
                  className="rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <form
                    onSubmit={(event) => checkQuiz(event, pin)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="text-xs text-zinc-500">#{index + 1}</span>
                    <input
                      value={guesses[pin.id] ?? ""}
                      onChange={(event) =>
                        setGuesses((prev) => ({
                          ...prev,
                          [pin.id]: event.target.value,
                        }))
                      }
                      placeholder="Digite o nome"
                      className="min-w-[180px] flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded bg-teal-700 px-2 py-1 text-xs text-white"
                    >
                      Conferir
                    </button>
                  </form>
                  {feedback[pin.id] ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      {feedback[pin.id]}
                    </p>
                  ) : null}
                </li>
              ))}
              {pins.length === 0 ? (
                <p className="text-sm text-zinc-600">
                  Sem pins nesta figura. Use “Sugerir pins” ou clique na imagem
                  para criar.
                </p>
              ) : null}
            </ul>
          ) : null}

          <form
            id="new-hotspot-form"
            action={createHotspot}
            className="grid gap-2 rounded-xl border border-dashed border-zinc-300 p-3 sm:grid-cols-2"
          >
            <p className="sm:col-span-2 text-xs text-zinc-500">
              Clique na figura para preencher a posição ({pinX}% × {pinY}%),
              depois salve o pin.
            </p>
            <input type="hidden" name="materiaId" value={materiaId} />
            <input type="hidden" name="imageId" value={selected.id} />
            <input type="hidden" name="x_pct" value={pinX} />
            <input type="hidden" name="y_pct" value={pinY} />
            <input
              name="label_simple"
              required
              placeholder="Nome fácil"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              name="label_technical"
              placeholder="Termo técnico"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              name="odontology_use"
              placeholder="Uso na odontologia"
              className="sm:col-span-2 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="sm:col-span-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white"
            >
              Salvar pin
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
