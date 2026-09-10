"use client";

// Galería de fotos con visor: clic abre el visor, flechas y teclado para navegar, Esc cierra.

import { useCallback, useEffect, useState } from "react";

type Props = {
  imagenes: string[];
  titulo: string;
};

export default function Galeria({ imagenes, titulo }: Props) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const total = imagenes.length;

  const mover = useCallback(
    (delta: number) => setAbierta((i) => (i === null ? null : (i + delta + total) % total)),
    [total],
  );

  useEffect(() => {
    if (abierta === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [abierta, mover]);

  if (total === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierta(0)}
        className="block w-full overflow-hidden rounded-lg"
        aria-label={`Ver fotos de ${titulo}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenes[0]}
          alt={titulo}
          className="h-44 w-full object-cover transition-transform hover:scale-[1.02]"
        />
      </button>
      {total > 1 && (
        <div className="scroll-thin mt-1.5 flex gap-1.5 overflow-x-auto">
          {imagenes.slice(1).map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setAbierta(i + 1)}
              className="shrink-0 overflow-hidden rounded-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-14 w-20 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {abierta !== null && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-ink/90 p-4"
          role="dialog"
          aria-modal
          aria-label={`Foto ${abierta + 1} de ${total}`}
          onClick={() => setAbierta(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenes[abierta]}
            alt={`${titulo}, foto ${abierta + 1}`}
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setAbierta(null)}
            aria-label="Cerrar"
            className="absolute top-3 right-3 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Cerrar ✕
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
            {abierta + 1} / {total}
          </div>
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  mover(-1);
                }}
                aria-label="Anterior"
                className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  mover(1);
                }}
                aria-label="Siguiente"
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
