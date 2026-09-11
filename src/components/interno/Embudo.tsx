"use client";

import { useMemo } from "react";
import type { Proyecto } from "@/data/proyectos";
import { fmtCLP, fmtUF } from "@/lib/format";
import {
  diasEnEtapa,
  DIAS_ESTANCADO,
  ETAPAS,
  ETAPAS_ACTIVAS,
  ETIQUETA_ETAPA,
  ultimaInteraccion,
  type Cliente,
  type Etapa,
} from "@/lib/clientes";

type Props = {
  clientes: Cliente[];
  proyectos: Proyecto[];
  valorUF: number;
  onAbrir: (c: Cliente) => void;
};

/** Comisión por defecto cuando el proyecto no la define (% del precio). */
export const COMISION_POR_DEFECTO_PCT = 2.5;

export function comisionUF(c: Cliente, proyectos: Proyecto[]): number {
  const p = proyectos.find((x) => x.id === c.proyectoId);
  const t = p?.tipologias.find((x) => x.id === c.tipologiaId);
  if (!p || !t) return 0;
  return (t.precioUF * (p.comisionPct ?? COMISION_POR_DEFECTO_PCT)) / 100;
}

function mediana(xs: number[]) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export default function Embudo({ clientes, proyectos, valorUF, onAbrir }: Props) {
  const comisionProyectada = clientes
    .filter((c) => c.etapa === "reserva" || c.etapa === "promesa")
    .reduce((s, c) => s + comisionUF(c, proyectos), 0);
  const comisionCerrada = clientes
    .filter((c) => c.etapa === "escritura")
    .reduce((s, c) => s + comisionUF(c, proyectos), 0);
  const columnas = useMemo(
    () =>
      ETAPAS.map((etapa) => {
        const lista = clientes
          .filter((c) => c.etapa === etapa)
          .map((c) => ({ c, dias: diasEnEtapa(c) }))
          .sort((a, b) => b.dias - a.dias);
        return { etapa, lista, mediana: mediana(lista.map((x) => x.dias)) };
      }),
    [clientes],
  );

  const activos = clientes.filter((c) => ETAPAS_ACTIVAS.includes(c.etapa));
  const estancados = activos.filter((c) => diasEnEtapa(c) >= DIAS_ESTANCADO);
  const cerrados = clientes.filter((c) => c.etapa === "escritura").length;
  const perdidos = clientes.filter((c) => c.etapa === "perdido").length;
  const tasaCierre = cerrados + perdidos > 0 ? Math.round((cerrados / (cerrados + perdidos)) * 100) : null;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile etiqueta="En curso" valor={String(activos.length)} />
        <Tile
          etiqueta={`Estancados (≥ ${DIAS_ESTANCADO} días)`}
          valor={String(estancados.length)}
          alerta={estancados.length > 0}
        />
        <Tile etiqueta="Escrituras" valor={String(cerrados)} />
        <Tile
          etiqueta="Cierre sobre cerrados"
          valor={tasaCierre === null ? "—" : `${tasaCierre} %`}
          sub="escrituras / (escrituras + perdidos)"
        />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Tile
          etiqueta="Comisión proyectada"
          valor={fmtUF(Math.round(comisionProyectada))}
          sub={`${fmtCLP(comisionProyectada * valorUF)} · reservas y promesas`}
        />
        <Tile
          etiqueta="Comisión cerrada"
          valor={fmtUF(Math.round(comisionCerrada))}
          sub={`${fmtCLP(comisionCerrada * valorUF)} · escrituras`}
        />
      </div>

      <div className="scroll-thin overflow-x-auto pb-2">
        <div className="grid min-w-[980px] grid-cols-7 gap-3">
          {columnas.map(({ etapa, lista, mediana: med }) => (
            <section key={etapa} className="flex flex-col rounded-xl border border-line bg-panel">
              <header
                className={`border-b border-line-soft px-3 py-2 ${etapa === "perdido" ? "opacity-70" : ""}`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{ETIQUETA_ETAPA[etapa]}</h3>
                  <span className="display text-lg font-semibold">{lista.length}</span>
                </div>
                <div className="text-xs text-ink-muted">
                  {med === null ? "sin clientes" : `mediana ${med} ${med === 1 ? "día" : "días"} en etapa`}
                </div>
              </header>
              <ul className="flex-1 space-y-1.5 p-2">
                {lista.map(({ c, dias }) => {
                  const estancado = ETAPAS_ACTIVAS.includes(etapa) && dias >= DIAS_ESTANCADO;
                  const ultima = ultimaInteraccion(c);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onAbrir(c)}
                        className={`w-full rounded-md border px-2 py-1.5 text-left text-sm hover:border-ink ${
                          estancado ? "border-warn/40 bg-warn/5" : "border-line-soft bg-fondo/40"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">{c.nombre}</span>
                          <span
                            className={`shrink-0 text-xs ${estancado ? "font-semibold text-warn" : "text-ink-muted"}`}
                          >
                            {dias} d
                          </span>
                        </div>
                        {ultima && (
                          <div className="truncate text-xs text-ink-muted">
                            {ultima.fecha.slice(5)} · {ultima.texto}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
                {lista.length === 0 && <li className="px-1 py-3 text-center text-xs text-ink-faint">—</li>}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Los días cuentan desde el último cambio de etapa. Un cliente en curso con {DIAS_ESTANCADO} días o más
        sin avanzar se marca como estancado.
      </p>
    </div>
  );
}

function Tile({
  etiqueta,
  valor,
  sub,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  sub?: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${alerta ? "border-warn/40 bg-warn/5" : "border-line bg-panel"}`}
    >
      <div className="text-xs text-ink-muted">{etiqueta}</div>
      <div className={`display text-2xl font-semibold ${alerta ? "text-warn" : ""}`}>{valor}</div>
      {sub && <div className="text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

export type { Etapa };
