"use client";

import { etiquetaLinea } from "@/data/metro";
import { COMUNAS } from "@/data/proyectos";
import { fmtCLP, fmtUF } from "@/lib/format";
import { MINUTOS_CERCA_METRO, type Filtros, type ProyectoEnriquecido } from "@/lib/proyectos";
import { BadgeEstado, Chip, Interruptor, PuntoLinea } from "./ui";

type Props = {
  proyectos: ProyectoEnriquecido[];
  total: number;
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  resaltados: Set<string>;
  valorUF: number;
};

const DORMS: { v: Filtros["dormitorios"]; label: string }[] = [
  { v: "todos", label: "Todos" },
  { v: 0, label: "Estudio" },
  { v: 1, label: "1D" },
  { v: 2, label: "2D" },
  { v: 3, label: "3D+" },
];

export default function PanelProyectos({
  proyectos,
  total,
  filtros,
  onFiltros,
  seleccionadoId,
  onSeleccionar,
  resaltados,
  valorUF,
}: Props) {
  const set = (parte: Partial<Filtros>) => onFiltros({ ...filtros, ...parte });
  const millones = (uf: number) => `≈ $${Math.round((uf * valorUF) / 1e6)} M`;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 border-b border-line-soft px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Proyectos</h2>
          <span className="text-xs text-ink-muted">
            {proyectos.length} de {total}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">Comuna</span>
            <select
              value={filtros.comuna}
              onChange={(e) => set({ comuna: e.target.value })}
              className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm"
            >
              <option value="todas">Todas</option>
              {COMUNAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink-muted">
              Hasta {fmtUF(filtros.precioMaxUF)}{" "}
              <span className="text-ink-faint">{millones(filtros.precioMaxUF)}</span>
            </span>
            <input
              type="range"
              min={1500}
              max={21000}
              step={250}
              value={filtros.precioMaxUF}
              onChange={(e) => set({ precioMaxUF: Number(e.target.value) })}
              className="mt-2 w-full"
              aria-label="Precio máximo en UF"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dormitorios">
          {DORMS.map((d) => (
            <Chip
              key={String(d.v)}
              activo={filtros.dormitorios === d.v}
              onClick={() => set({ dormitorios: d.v })}
            >
              {d.label}
            </Chip>
          ))}
        </div>

        <div className="space-y-2">
          <Interruptor
            activo={filtros.soloCercaMetro}
            onChange={(v) => set({ soloCercaMetro: v })}
            label={`A ${MINUTOS_CERCA_METRO} min a pie del Metro`}
          />
          {filtros.soloCercaMetro && (
            <Interruptor
              activo={filtros.considerarFuturo}
              onChange={(v) => set({ considerarFuturo: v })}
              label="Contar líneas en construcción y proyectadas"
            />
          )}
        </div>
      </div>

      <ul className="scroll-thin flex-1 overflow-y-auto">
        {proyectos.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">
            Ningún proyecto cumple estos filtros. Sube el precio máximo o quita el filtro de Metro.
          </li>
        )}
        {proyectos.map((p) => {
          const sel = p.id === seleccionadoId;
          const hl = resaltados.has(p.id);
          const dim = resaltados.size > 0 && !hl;
          return (
            <li key={p.id} className={dim ? "opacity-45" : ""}>
              <button
                type="button"
                onClick={() => onSeleccionar(p.id)}
                aria-current={sel ? "true" : undefined}
                className={`block w-full border-b border-line-soft px-4 py-3 text-left transition-colors hover:bg-fondo ${
                  sel ? "bg-select-soft hover:bg-select-soft" : hl ? "bg-accent-soft/60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.nombre}</div>
                    <div className="truncate text-xs text-ink-muted">
                      {p.comuna} · {p.inmobiliaria}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">desde {fmtUF(p.precioMinUF)}</div>
                    <div className="text-xs text-ink-faint">{millones(p.precioMinUF)}</div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 space-y-0.5 text-xs">
                    {p.metroActual && (
                      <div className="flex items-center gap-1.5 truncate">
                        <PuntoLinea color={p.metroActual.estacion.color} estado="operativa" />
                        <span className="truncate">
                          {p.metroActual.estacion.nombre}{" "}
                          <span className="text-ink-muted">
                            {p.metroActual.estacion.lineaId} · {p.minActual} min a pie
                          </span>
                        </span>
                      </div>
                    )}
                    {p.metroFuturo && (
                      <div className="flex items-center gap-1.5 truncate">
                        <PuntoLinea
                          color={p.metroFuturo.estacion.color}
                          estado={p.metroFuturo.estacion.estado}
                        />
                        <span className="truncate">
                          {p.metroFuturo.estacion.nombre}{" "}
                          <span className="text-ink-muted">
                            {etiquetaLinea(p.metroFuturo.estacion.lineaId)} {p.metroFuturo.estacion.apertura}{" "}
                            · {p.minConFuturo} min
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                  <BadgeEstado estado={p.estado} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line-soft px-4 py-2 text-[11px] text-ink-faint">
        Precios en UF convertidos a {fmtCLP(valorUF)} por UF.
      </div>
    </div>
  );
}
