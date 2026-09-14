"use client";

import { useState } from "react";
import { ImportAnatomiaButton } from "@/app/materias/import-anatomia-button";
import { PdfUploadForm } from "@/app/materias/pdf-upload-form";
import { SourceFilesList } from "@/app/materias/source-files-list";
import type { SourceFile } from "@/lib/types";

type Props = {
  materiaId: string;
  arquivos: Omit<SourceFile, "extracted_text">[];
};

export function MaterialSection({ materiaId, arquivos }: Props) {
  const [open, setOpen] = useState(arquivos.length === 0);

  return (
    <section className="rounded-2xl border border-dashed border-teal-900/20 bg-white/70 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Material</h2>
          <p className="text-sm text-zinc-600">
            Enviar PDFs, importar Anatomia e regenerar perguntas
          </p>
        </div>
        <span className="text-sm font-medium text-teal-700">
          {open ? "Recolher" : "Abrir"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <ImportAnatomiaButton materiaId={materiaId} />
          </div>
          <PdfUploadForm materiaId={materiaId} />
          <SourceFilesList arquivos={arquivos} />
        </div>
      ) : null}
    </section>
  );
}
