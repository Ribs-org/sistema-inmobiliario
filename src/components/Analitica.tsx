"use client";

import { useMemo, useState } from "react";
import { fmtUF } from "@/lib/format";
import { MINUTOS_CERCA_METRO, type ProyectoEnriquecido } from "@/lib/proyectos";
import { Interruptor } from "./ui";

type Props = {
  proyectos: ProyectoEnriquecido[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
};

type Serie = "operativo" | "futuro" | "lejos";

const SERIES: Record<Serie, { nombre: string; color: string }> = {
  operativo: { nombre: `Metro operativo a ≤ ${MINUTOS_CERCA_METRO} min`, color: "#0F8FA6" },
  futuro: { nombre: "Llega a ≤ 10 min con una línea futura", color: "#D97A00" },
  lejos: { nombre: "Sin Metro a 10 min", color: "#8d95a1" },
};

const W = 640;
const H = 340;
const M = { l: 56, r: 20, t: 16, b: 44 };
const X_MAX = 30;

function serieDe(p: ProyectoEnriquecido): Serie {
  if (p.minActual <= MINUTOS_CERCA_METRO) return "operativo";
  if (p.minConFuturo <= MINUTOS_CERCA_METRO) return "futuro";
  return "lejos";
}

function mediana(xs: number[]) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function Analitica({ proyectos, seleccionadoId, onSeleccionar }: Props) {
  const [conFuturo, setConFuturo] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const puntos = useMemo(
    () =>
      proyectos.map((p) => ({
        p,
        x: Math.min(X_MAX, conFuturo ? p.minConFuturo : p.minActual),
        y: p.ufM2Prom,
        serie: serieDe(p),
      })),
    [proyectos, conFuturo],
  );

  const PASO_Y = 20;
  const yMin = Math.floor((Math.min(...puntos.map((d) => d.y)) - 5) / PASO_Y) * PASO_Y;
  const yMax = Math.ceil((Math.max(...puntos.map((d) => d.y)) + 5) / PASO_Y) * PASO_Y;
  const sx = (x: number) => M.l + (x / X_MAX) * (W - M.l - M.r);
  const sy = (y: number) => H - M.b - ((y - yMin) / (yMax - yMin)) * (H - M.t - M.b);

  const ticksY = useMemo(() => {
    return Array.from({ length: (yMax - yMin) / PASO_Y + 1 }, (_, i) => yMin + i * PASO_Y);
  }, [yMin, yMax]);
  const ticksX = [0, 5, 10, 15, 20, 25, 30];

  const buckets = [
    { nombre: "≤ 5 min", f: (x: number) => x <= 5 },
    { nombre: "6 a 10 min", f: (x: number) => x > 5 && x <= 10 },
    { nombre: "> 10 min", f: (x: number) => x > 10 },
  ].map((b) => {
    const vals = puntos.filter((d) => b.f(d.x)).map((d) => d.y);
    return { ...b, n: vals.length, mediana: mediana(vals) };
  });

  const cerca = buckets[0].mediana;
  const lejos = buckets[2].mediana;
  const diferenciaPct = cerca && lejos ? ((cerca - lejos) / lejos) * 100 : null;

  const extremos = useMemo(() => {
    const ordenados = [...puntos].sort((a, b) => a.y - b.y);
    return new Set([ordenados[0]?.p.id, ordenados[ordenados.length - 1]?.p.id]);
  }, [puntos]);

  const activo = puntos.find((d) => d.p.id === (hover ?? seleccionadoId));

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        <header className="mb-5">
          <h2 className="text-2xl font-semibold">Precio por m² según cercanía al Metro</h2>
          <p className="max-w-2xl text-sm text-ink-muted">
            Cada punto es un proyecto: su precio promedio por m² útil frente a los minutos caminando hasta la
            estación más cercana. Activa las líneas futuras para ver cuánto se acercan los proyectos que hoy
            quedan lejos.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-3 gap-3">
            {buckets.map((b) => (
              <div key={b.nombre} className="rounded-lg border border-line bg-panel px-3 py-2">
                <div className="text-xs text-ink-muted">{b.nombre}</div>
                <div className="text-lg font-semibold">
                  {b.mediana ? `${fmtUF(Math.round(b.mediana))}/m²` : "—"}
                </div>
                <div className="text-xs text-ink-faint">
                  mediana · {b.n} {b.n === 1 ? "proyecto" : "proyectos"}
                </div>
              </div>
            ))}
          </div>
          <div className="w-64">
            <Interruptor activo={conFuturo} onChange={setConFuturo} label="Contar líneas futuras" />
          </div>
        </div>

        {diferenciaPct !== null && (
          <p className="mb-4 text-sm">
            Los proyectos a menos de 5 minutos del Metro cuestan{" "}
            <strong>
              {Math.abs(diferenciaPct).toFixed(0)} % {diferenciaPct >= 0 ? "más" : "menos"}
            </strong>{" "}
            por m² que los que quedan a más de 10 minutos{conFuturo ? ", contando las líneas futuras" : ""}.
          </p>
        )}

        <div className="rounded-xl border border-line bg-panel p-3">
          <div className="relative">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label="Gráfico de dispersión UF por m² versus minutos al Metro"
            >
              {ticksY.map((t) => (
                <g key={t}>
                  <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="#e6e9ee" strokeWidth={1} />
                  <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="#5b6675">
                    {t}
                  </text>
                </g>
              ))}
              {ticksX.map((t) => (
                <g key={t}>
                  <text x={sx(t)} y={H - M.b + 18} textAnchor="middle" fontSize={11} fill="#5b6675">
                    {t === X_MAX ? `${t}+` : t}
                  </text>
                </g>
              ))}
              <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="#d5dae1" />
              <line
                x1={sx(MINUTOS_CERCA_METRO)}
                x2={sx(MINUTOS_CERCA_METRO)}
                y1={M.t}
                y2={H - M.b}
                stroke="#8d95a1"
                strokeDasharray="4 4"
              />
              <text x={sx(MINUTOS_CERCA_METRO) + 5} y={M.t + 10} fontSize={11} fill="#5b6675">
                10 min a pie
              </text>
              <text x={W / 2 + M.l / 2} y={H - 6} textAnchor="middle" fontSize={12} fill="#5b6675">
                Minutos caminando a la estación más cercana
              </text>
              <text
                x={14}
                y={H / 2}
                textAnchor="middle"
                fontSize={12}
                fill="#5b6675"
                transform={`rotate(-90 14 ${H / 2})`}
              >
                UF por m² útil
              </text>

              {puntos.map((d) => {
                const c = SERIES[d.serie].color;
                const sel = d.p.id === seleccionadoId;
                const hov = d.p.id === hover;
                const cx = sx(d.x);
                const cy = sy(d.y);
                const r = sel || hov ? 8 : 6;
                return (
                  <g
                    key={d.p.id}
                    onMouseEnter={() => setHover(d.p.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onSeleccionar(d.p.id)}
                    className="cursor-pointer"
                  >
                    <circle cx={cx} cy={cy} r={14} fill="transparent" />
                    {d.serie === "futuro" ? (
                      <rect
                        x={cx - r}
                        y={cy - r}
                        width={r * 2}
                        height={r * 2}
                        transform={`rotate(45 ${cx} ${cy})`}
                        fill={c}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ) : (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={d.serie === "lejos" ? "#fff" : c}
                        stroke={d.serie === "lejos" ? c : "#fff"}
                        strokeWidth={2}
                      />
                    )}
                    {(extremos.has(d.p.id) || sel) && !hov && (
                      <text x={cx + 11} y={cy + 4} fontSize={11} fill="#1b2430">
                        {d.p.nombre}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {activo && (
              <div
                className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 rounded-md border border-line bg-panel px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${(sx(activo.x) / W) * 100}%`,
                  top: `calc(${(sy(activo.y) / H) * 100}% - 12px)`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-semibold">{activo.p.nombre}</div>
                <div className="text-ink-muted">{activo.p.comuna}</div>
                <div className="mt-1">
                  {fmtUF(Math.round(activo.y))}/m² · {activo.x >= X_MAX ? "30+" : activo.x} min
                </div>
                {activo.p.metroActual && (
                  <div className="text-ink-muted">
                    Hoy: {activo.p.metroActual.estacion.nombre} ({activo.p.metroActual.estacion.lineaId})
                  </div>
                )}
                {activo.p.metroFuturo && (
                  <div className="text-ink-muted">
                    Futuro: {activo.p.metroFuturo.estacion.nombre} (
                    {activo.p.metroFuturo.estacion.lineaId.replace("X", "")}{" "}
                    {activo.p.metroFuturo.estacion.apertura})
                  </div>
                )}
              </div>
            )}
          </div>

          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-ink-muted">
            {(Object.keys(SERIES) as Serie[]).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3"
                  style={{
                    background: s === "lejos" ? "#fff" : SERIES[s].color,
                    border: `2px solid ${SERIES[s].color}`,
                    borderRadius: s === "futuro" ? 0 : 999,
                    transform: s === "futuro" ? "rotate(45deg) scale(0.85)" : undefined,
                  }}
                />
                {SERIES[s].nombre}
              </li>
            ))}
          </ul>
        </div>

        <table className="mt-6 w-full text-sm">
          <caption className="mb-2 text-left text-sm font-semibold">Detalle por proyecto</caption>
          <thead className="text-left text-xs text-ink-muted">
            <tr>
              <th className="py-1.5 font-medium">Proyecto</th>
              <th className="py-1.5 font-medium">Comuna</th>
              <th className="py-1.5 text-right font-medium">UF/m²</th>
              <th className="py-1.5 text-right font-medium">Min hoy</th>
              <th className="py-1.5 text-right font-medium">Min con futuras</th>
              <th className="py-1.5 font-medium">Estación más cercana</th>
            </tr>
          </thead>
          <tbody>
            {[...puntos]
              .sort((a, b) => b.y - a.y)
              .map((d) => (
                <tr
                  key={d.p.id}
                  onClick={() => onSeleccionar(d.p.id)}
                  className={`cursor-pointer border-t border-line-soft hover:bg-panel ${
                    d.p.id === seleccionadoId ? "bg-select-soft" : ""
                  }`}
                >
                  <td className="py-1.5 font-medium">{d.p.nombre}</td>
                  <td className="py-1.5 text-ink-muted">{d.p.comuna}</td>
                  <td className="py-1.5 text-right">{Math.round(d.y)}</td>
                  <td className="py-1.5 text-right">{d.p.minActual >= 99 ? "—" : d.p.minActual}</td>
                  <td className="py-1.5 text-right">{d.p.minConFuturo}</td>
                  <td className="py-1.5 text-ink-muted">
                    {d.p.metroActual?.estacion.nombre} ({d.p.metroActual?.estacion.lineaId})
                    {d.p.metroFuturo && (
                      <>
                        {" "}
                        → {d.p.metroFuturo.estacion.nombre} (
                        {d.p.metroFuturo.estacion.lineaId.replace("X", "")})
                      </>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
