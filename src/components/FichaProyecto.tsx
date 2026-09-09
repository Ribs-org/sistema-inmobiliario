"use client";

import { ETIQUETA_ESTADO, type EstacionConLinea } from "@/data/metro";
import type { Tipologia } from "@/data/proyectos";
import { fmtCLP, fmtDist, fmtM2, fmtUF } from "@/lib/format";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import { BadgeEstado, Dato, EtiquetaLinea } from "./ui";

type Props = {
  proyecto: ProyectoEnriquecido;
  valorUF: number;
  onVolver: () => void;
  onVerEnMapa: () => void;
  onSimular: (t: Tipologia) => void;
  onSeleccionarEstacion: (e: EstacionConLinea) => void;
};

export default function FichaProyecto({
  proyecto: p,
  valorUF,
  onVolver,
  onVerEnMapa,
  onSimular,
  onSeleccionarEstacion,
}: Props) {
  return (
    <div className="scroll-thin flex h-full flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-panel/95 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-fondo hover:text-ink"
        >
          ← Proyectos
        </button>
        <button
          type="button"
          onClick={onVerEnMapa}
          className="rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Centrar en el mapa
        </button>
      </div>

      <div className="space-y-5 px-4 py-4">
        <header>
          <div className="flex items-center gap-2">
            <BadgeEstado estado={p.estado} />
            <span className="text-xs text-ink-muted">Entrega: {p.entrega}</span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold leading-tight">{p.nombre}</h2>
          <p className="text-sm text-ink-muted">
            {p.direccion}, {p.comuna}
          </p>
          <p className="text-xs text-ink-faint">{p.inmobiliaria}</p>
        </header>

        <p className="text-sm leading-relaxed text-ink">{p.descripcion}</p>

        <section className="rounded-lg border border-line bg-fondo/60 p-3">
          <h3 className="text-sm font-semibold">Metro</h3>
          <ul className="mt-2 space-y-2">
            {p.metroActual && (
              <li>
                <FilaEstacion
                  estacion={p.metroActual.estacion}
                  distanciaM={p.metroActual.distanciaM}
                  minutos={p.minActual}
                  onClick={() => onSeleccionarEstacion(p.metroActual!.estacion)}
                />
              </li>
            )}
            {p.metroFuturo ? (
              <li>
                <FilaEstacion
                  estacion={p.metroFuturo.estacion}
                  distanciaM={p.metroFuturo.distanciaM}
                  minutos={p.minConFuturo}
                  onClick={() => onSeleccionarEstacion(p.metroFuturo!.estacion)}
                />
              </li>
            ) : (
              <li className="text-xs text-ink-muted">
                Ninguna línea futura acerca más el Metro a este proyecto.
              </li>
            )}
          </ul>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Tipologías</h3>
            <span className="text-xs text-ink-faint">UF a {fmtCLP(valorUF)}</span>
          </div>
          <ul className="mt-2 space-y-2">
            {p.tipologias.map((t) => (
              <li key={t.id} className="rounded-lg border border-line bg-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{t.nombre}</div>
                    <div className="text-xs text-ink-muted">
                      {fmtM2(t.m2Utiles)} útiles + {fmtM2(t.m2Terraza)} terraza · {t.orientacion}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold">{fmtUF(t.precioUF)}</div>
                    <div className="text-xs text-ink-faint">{fmtCLP(t.precioUF * valorUF)}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-ink-muted">
                    {fmtUF(Math.round(t.precioUF / t.m2Utiles))}/m² · {t.disponibles} disponibles
                  </span>
                  <button
                    type="button"
                    onClick={() => onSimular(t)}
                    className="rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-accent"
                  >
                    Simular crédito
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3">
          <Dato etiqueta="Pie mínimo" valor={`${p.pieMinimoPct} %`} />
          <Dato etiqueta="Bono pie" valor={p.bonoPiePct ? `${p.bonoPiePct} % del precio` : "Sin bono"} />
          <Dato etiqueta="Pie en cuotas" valor={p.pieEnCuotas ? "Sí, hasta la entrega" : "No"} />
          <Dato etiqueta="Edificio" valor={`${p.pisos} pisos · ${p.unidades} unidades`} />
        </section>

        <section>
          <h3 className="text-sm font-semibold">Espacios comunes</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {p.amenidades.map((a) => (
              <li key={a} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted">
                {a}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function FilaEstacion({
  estacion,
  distanciaM,
  minutos,
  onClick,
}: {
  estacion: EstacionConLinea;
  distanciaM: number;
  minutos: number;
  onClick: () => void;
}) {
  const futura = estacion.estado !== "operativa";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-panel"
    >
      <span className="flex min-w-0 items-center gap-2">
        <EtiquetaLinea id={estacion.lineaId} color={estacion.color} estado={estacion.estado} />
        <span className="min-w-0">
          <span className="block truncate text-sm">{estacion.nombre}</span>
          <span className="block text-xs text-ink-muted">
            {futura ? `${ETIQUETA_ESTADO[estacion.estado]} · ${estacion.apertura}` : "Operativa"}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        <span className="block font-semibold">{minutos} min</span>
        <span className="block text-xs text-ink-faint">{fmtDist(distanciaM)}</span>
      </span>
    </button>
  );
}
