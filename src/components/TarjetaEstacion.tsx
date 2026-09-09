"use client";

import { ETIQUETA_ESTADO, etiquetaLinea, type EstacionConLinea } from "@/data/metro";
import { fmtDist, fmtUF } from "@/lib/format";
import { minutosEstimados } from "@/lib/geo";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import { EtiquetaLinea } from "./ui";

type Props = {
  estacion: EstacionConLinea;
  cercanos: { item: ProyectoEnriquecido; distanciaM: number }[];
  radioM: number;
  onCerrar: () => void;
  onSeleccionarProyecto: (id: string) => void;
};

export default function TarjetaEstacion({
  estacion,
  cercanos,
  radioM,
  onCerrar,
  onSeleccionarProyecto,
}: Props) {
  const futura = estacion.estado !== "operativa";
  return (
    <div className="w-72 rounded-lg border border-line bg-panel/95 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <EtiquetaLinea id={estacion.lineaId} color={estacion.color} estado={estacion.estado} />
            <span className="truncate text-sm font-semibold">{estacion.nombre}</span>
          </div>
          <div className="text-xs text-ink-muted">
            {estacion.lineaNombre}
            {futura ? ` · ${ETIQUETA_ESTADO[estacion.estado]} ${estacion.apertura ?? ""}` : ""}
            {estacion.combina?.length
              ? ` · combina con ${estacion.combina.map(etiquetaLinea).join(", ")}`
              : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="rounded px-1.5 text-ink-muted hover:bg-fondo hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="border-t border-line-soft px-3 py-2 text-xs">
        {cercanos.length === 0 ? (
          <p className="text-ink-muted">Ningún proyecto de la lista a menos de {fmtDist(radioM)}.</p>
        ) : (
          <>
            <p className="mb-1 text-ink-muted">
              {cercanos.length} {cercanos.length === 1 ? "proyecto" : "proyectos"} a menos de{" "}
              {fmtDist(radioM)}
            </p>
            <ul className="space-y-1">
              {cercanos.map(({ item, distanciaM }) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSeleccionarProyecto(item.id)}
                    className="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left hover:bg-fondo"
                  >
                    <span className="truncate">
                      <span className="font-medium">{item.nombre}</span>{" "}
                      <span className="text-ink-muted">desde {fmtUF(item.precioMinUF)}</span>
                    </span>
                    <span className="shrink-0 text-ink-muted">{minutosEstimados(distanciaM)} min</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
