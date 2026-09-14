"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";

type Bone = {
  id: string;
  simple: string;
  technical: string;
  use: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

const BONES: Bone[] = [
  {
    id: "frontal",
    simple: "osso da testa",
    technical: "frontal",
    use: "Referência em trauma facial e avaliação de seio frontal.",
    position: [0, 1.15, 0.35],
    size: [1.4, 0.7, 0.7],
    color: "#0f766e",
  },
  {
    id: "parietal",
    simple: "osso do topo da cabeça",
    technical: "parietal",
    use: "Orientação em radiografias e anatomia do calvário.",
    position: [0, 1.35, -0.15],
    size: [1.5, 0.55, 1.1],
    color: "#0d9488",
  },
  {
    id: "temporal",
    simple: "osso da têmpora",
    technical: "temporal",
    use: "Importante na ATM e em bloqueios anestésicos da face.",
    position: [0.95, 0.55, 0],
    size: [0.45, 0.7, 0.9],
    color: "#14b8a6",
  },
  {
    id: "occipital",
    simple: "osso da nuca",
    technical: "occipital",
    use: "Base do crânio; referência em trauma e postura.",
    position: [0, 0.55, -0.95],
    size: [1.1, 0.8, 0.55],
    color: "#2dd4bf",
  },
  {
    id: "zigomatico",
    simple: "osso da maçã do rosto",
    technical: "zigomático",
    use: "Contorno facial; fraturas de malar em odontologia/trauma.",
    position: [0.75, 0.35, 0.55],
    size: [0.45, 0.4, 0.4],
    color: "#5eead4",
  },
  {
    id: "maxila",
    simple: "osso da arcada superior",
    technical: "maxila",
    use: "Suporte dos dentes superiores, seio maxilar e implantes.",
    position: [0, 0.05, 0.55],
    size: [1.1, 0.45, 0.7],
    color: "#99f6e4",
  },
  {
    id: "mandibula",
    simple: "osso da arcada inferior",
    technical: "mandíbula",
    use: "ATM, anestesia do nervo alveolar inferior, fraturas.",
    position: [0, -0.55, 0.35],
    size: [1.2, 0.4, 0.75],
    color: "#ccfbf1",
  },
];

function BoneMesh({
  bone,
  selected,
  onSelect,
}: {
  bone: Bone;
  selected: boolean;
  onSelect: (bone: Bone) => void;
}) {
  return (
    <mesh
      position={bone.position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(bone);
      }}
    >
      <boxGeometry args={bone.size} />
      <meshStandardMaterial
        color={bone.color}
        transparent
        opacity={selected ? 1 : 0.85}
        emissive={selected ? "#134e4a" : "#000000"}
        emissiveIntensity={selected ? 0.35 : 0}
      />
      {selected ? (
        <Html distanceFactor={8} position={[0, bone.size[1] / 2 + 0.2, 0]}>
          <div className="rounded bg-white/95 px-2 py-1 text-[10px] font-medium text-teal-900 shadow">
            {bone.technical}
          </div>
        </Html>
      ) : null}
    </mesh>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function SkullLab3D() {
  const [selected, setSelected] = useState<Bone | null>(BONES[0]);
  const [mode, setMode] = useState<"explore" | "quiz">("explore");
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const quizBone = BONES[quizIndex % BONES.length];

  function startQuiz() {
    setMode("quiz");
    setFeedback(null);
    setGuess("");
    setQuizIndex(Math.floor(Math.random() * BONES.length));
  }

  function checkGuess() {
    const target = mode === "quiz" ? quizBone : selected;
    if (!target) return;
    const ok =
      normalize(guess) === normalize(target.simple) ||
      normalize(guess) === normalize(target.technical);
    setFeedback(
      ok
        ? "Acertou!"
        : `Resposta: ${target.simple} (${target.technical})`
    );
  }

  return (
    <section className="rounded-2xl border border-teal-900/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Crânio 3D (complementar)
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Modelo didático esquemático para treinar ossos — não substitui as
            figuras do PDF da aula.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("explore");
              setFeedback(null);
              setGuess("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              mode === "explore"
                ? "bg-teal-700 text-white"
                : "border border-zinc-300"
            }`}
          >
            Explorar
          </button>
          <button
            type="button"
            onClick={startQuiz}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              mode === "quiz"
                ? "bg-teal-700 text-white"
                : "border border-zinc-300"
            }`}
          >
            Quiz
          </button>
        </div>
      </div>

      <div className="mt-4 h-80 overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-100 to-zinc-200">
        <Canvas camera={{ position: [2.8, 1.4, 3.2], fov: 42 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 2]} intensity={1.1} />
          <Environment preset="city" />
          <group>
            {BONES.map((bone) => (
              <BoneMesh
                key={bone.id}
                bone={bone}
                selected={
                  mode === "explore"
                    ? selected?.id === bone.id
                    : quizBone.id === bone.id && Boolean(feedback)
                }
                onSelect={(item) => {
                  if (mode === "explore") {
                    setSelected(item);
                    setFeedback(null);
                  }
                }}
              />
            ))}
          </group>
          <OrbitControls enablePan makeDefault />
        </Canvas>
      </div>

      {mode === "explore" && selected ? (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-sm">
          <p className="font-semibold text-teal-950">{selected.simple}</p>
          <p className="mt-1 text-zinc-700">
            Termo técnico: <strong>{selected.technical}</strong>
          </p>
          <p className="mt-1 text-zinc-700">Na odontologia: {selected.use}</p>
        </div>
      ) : null}

      {mode === "quiz" ? (
        <div className="mt-4 space-y-2 rounded-xl border border-zinc-200 px-4 py-3">
          <p className="text-sm text-zinc-700">
            Clique e gire o crânio. Qual o nome do osso destacado ao conferir?
            (Dica visual: peça aleatória da lista)
          </p>
          <p className="text-xs text-zinc-500">
            Peça sorteada agora: região #{BONES.findIndex((b) => b.id === quizBone.id) + 1}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Ex.: mandíbula"
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={checkGuess}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
            >
              Conferir
            </button>
          </div>
          {feedback ? (
            <p className="text-sm text-zinc-700">{feedback}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
