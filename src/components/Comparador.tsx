"use client";

import { useMemo, useState } from "react";
import type { InfoTasa } from "@/lib/tasa";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import GuardarCotizacion from "./GuardarCotizacion";
import TablaComparativa, { type ColumnaComparativa } from "./TablaComparativa";

type Props = {
  proyectos: ProyectoEnriquecido[];
  valorUF: number;
  infoTasa: InfoTasa;
  autorizado: boolean;
  onQuitar: (id: string) => void;
  onVerFicha: (id: string) => void;
};

const PLAZOS = [15, 20, 25, 30];
const INPUT = "rounded-md border border-line bg-panel px-2 py-1 text-sm focus:border-accent";

export default function Comparador({
  proyectos,
  valorUF,
  infoTasa,
  autorizado,
  onQuitar,
  onVerFicha,
}: Props) {
  const [piePct, setPiePct] = useState(20);
  const [plazoAnios, setPlazo] = useState(25);
  const [tasaManual, setTasa] = useState<number | null>(null);
  const [incluirSeguros, setSeguros] = useState(true);
  const [tipologias, setTipologias] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const tasaAnualPct = tasaManual ?? infoTasa.valorPct;

  const columnas: ColumnaComparativa[] = useMemo(
    () =>
      proyectos.map((p) => {
        const tip =
          p.tipologias.find((t) => t.id === tipologias[p.id]) ??
          [...p.tipologias].sort((a, b) => a.precioUF - b.precioUF)[0];
        return {
          proyecto: p,
          nombre: p.nombre,
          tipologia: tip,
          tipologiaNombre: tip?.nombre ?? null,
          precioUF: tip?.precioUF ?? 0,
        };
      }),
    [proyectos, tipologias],
  );

  if (proyectos.length < 2) {
    return (
      <div className="scroll-thin h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold">Comparar proyectos</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Marca la casilla de comparar en dos o tres proyectos de la lista para verlos lado a lado con las
            mismas condiciones de crédito.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Comparar proyectos</h2>
            <p className="text-sm text-ink-muted">
              Mismas condiciones de crédito para todos. Cambia la tipología en cada columna.
            </p>
          </div>
          {autorizado && (
            <button
              type="button"
              onClick={() => setGuardando(true)}
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent"
            >
              Guardar comparativa
            </button>
          )}
        </header>

        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl border border-line bg-panel p-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">Pie {piePct} %</span>
            <input
              type="range"
              min={10}
              max={50}
              value={piePct}
              onChange={(e) => setPiePct(Number(e.target.value))}
              className="w-36"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">Plazo</span>
            <select value={plazoAnios} onChange={(e) => setPlazo(Number(e.target.value))} className={INPUT}>
              {PLAZOS.map((a) => (
                <option key={a} value={a}>
                  {a} años
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">Tasa anual UF</span>
            <input
              type="number"
              step={0.1}
              min={0}
              max={15}
              value={tasaAnualPct}
              onChange={(e) => setTasa(Number(e.target.value))}
              className={`${INPUT} w-24 text-right`}
            />
          </label>
          <label className="flex items-center gap-2 pb-1">
            <input
              type="checkbox"
              checked={incluirSeguros}
              onChange={(e) => setSeguros(e.target.checked)}
              className="accent-accent"
            />
            Con seguros
          </label>
        </div>

        <div className="rounded-xl border border-line bg-panel p-3">
          <TablaComparativa
            columnas={columnas}
            condiciones={{ piePct, plazoAnios, tasaAnualPct, valorUF, incluirSeguros }}
            cabeceraExtra={(i) => {
              const p = proyectos[i];
              return (
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={columnas[i].tipologia?.id ?? ""}
                    onChange={(e) => setTipologias((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className={INPUT}
                  >
                    {p.tipologias.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onVerFicha(p.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuitar(p.id)}
                    className="text-xs text-ink-muted hover:text-warn"
                  >
                    Quitar
                  </button>
                </div>
              );
            }}
          />
        </div>
      </div>

      {guardando && (
        <GuardarCotizacion
          proyectoId={columnas[0].proyecto!.id}
          proyectoNombre={columnas.map((c) => c.nombre).join(" vs ")}
          tipologiaId={null}
          tipologiaNombre={null}
          items={columnas.map((c) => ({ proyectoId: c.proyecto!.id, tipologiaId: c.tipologia?.id ?? null }))}
          parametros={{
            precioUF: columnas[0].precioUF,
            piePct,
            bonoPiePct: 0,
            plazoAnios,
            tasaAnualPct,
            valorUF,
            incluirSeguros,
            pieEnCuotas: false,
            mesesEntrega: 18,
          }}
          onCerrar={() => setGuardando(false)}
        />
      )}
    </div>
  );
}
