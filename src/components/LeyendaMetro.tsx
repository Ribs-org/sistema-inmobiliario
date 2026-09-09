"use client";

import { useState } from "react";
import { ETIQUETA_ESTADO, LINEAS_FUTURAS, LINEAS_OPERATIVAS, type Linea } from "@/data/metro";
import type { CapasMapa } from "./Mapa";
import { PuntoLinea } from "./ui";

type Props = { capas: CapasMapa; onCapas: (c: CapasMapa) => void };

export default function LeyendaMetro({ capas, onCapas }: Props) {
  const [abierta, setAbierta] = useState(true);

  const alternarLinea = (id: string) => {
    const ocultas = capas.lineasOcultas.includes(id)
      ? capas.lineasOcultas.filter((x) => x !== id)
      : [...capas.lineasOcultas, id];
    onCapas({ ...capas, lineasOcultas: ocultas });
  };

  return (
    <div className="w-60 rounded-lg border border-line bg-panel/95 text-xs shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        Red de Metro
        <span className="text-ink-faint">{abierta ? "Ocultar" : "Mostrar"}</span>
      </button>
      {abierta && (
        <div className="space-y-3 border-t border-line-soft px-3 py-2">
          <Grupo
            titulo="Operativas"
            activo={capas.operativas}
            onActivo={(v) => onCapas({ ...capas, operativas: v })}
            lineas={LINEAS_OPERATIVAS}
            ocultas={capas.lineasOcultas}
            onLinea={alternarLinea}
          />
          <Grupo
            titulo="En construcción y proyectadas"
            activo={capas.futuras}
            onActivo={(v) => onCapas({ ...capas, futuras: v })}
            lineas={LINEAS_FUTURAS}
            ocultas={capas.lineasOcultas}
            onLinea={alternarLinea}
          />
          <label className="flex items-center gap-2 border-t border-line-soft pt-2">
            <input
              type="checkbox"
              checked={capas.radio}
              onChange={(e) => onCapas({ ...capas, radio: e.target.checked })}
              className="accent-accent"
            />
            Radio de 800 m al elegir una estación
          </label>
          <div className="flex items-center justify-between border-t border-line-soft pt-2">
            <span className="text-ink-muted">Fondo</span>
            <div
              className="flex gap-0.5 rounded-md bg-fondo p-0.5"
              role="radiogroup"
              aria-label="Fondo del mapa"
            >
              {(["gris", "calles"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={capas.base === b}
                  onClick={() => onCapas({ ...capas, base: b })}
                  className={`rounded px-2 py-0.5 ${capas.base === b ? "bg-panel shadow-sm" : "text-ink-muted"}`}
                >
                  {b === "gris" ? "Plano" : "Calles"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  activo,
  onActivo,
  lineas,
  ocultas,
  onLinea,
}: {
  titulo: string;
  activo: boolean;
  onActivo: (v: boolean) => void;
  lineas: Linea[];
  ocultas: string[];
  onLinea: (id: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => onActivo(e.target.checked)}
          className="accent-accent"
        />
        {titulo}
      </label>
      <ul className={`mt-1 space-y-0.5 pl-1 ${activo ? "" : "opacity-40"}`}>
        {lineas.map((l) => {
          const visible = !ocultas.includes(l.id);
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onLinea(l.id)}
                disabled={!activo}
                aria-pressed={visible}
                className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-fondo ${
                  visible ? "" : "line-through opacity-50"
                }`}
              >
                <PuntoLinea color={l.color} estado={l.estado} />
                <span className="flex-1 truncate">{l.nombre}</span>
                {l.estado !== "operativa" && (
                  <span className="text-ink-faint">
                    {l.apertura} · {ETIQUETA_ESTADO[l.estado].toLowerCase()}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
