"use client";

// Informe de conversión: qué pasa con los clientes del equipo y dónde se caen.
// Todo sale del historial que ya se guarda en cada cliente.

import { useMemo } from "react";
import type { Proyecto } from "@/data/proyectos";
import { ETIQUETA_ETAPA, ETIQUETA_MOTIVO, type Cliente } from "@/lib/clientes";
import { conversionPor, diasHastaCierre, diasPorEtapa, motivosDePerdida, type Fila } from "@/lib/informe";

type Props = {
  clientes: Cliente[];
  proyectos: Proyecto[];
  nombres: Record<string, string>;
};

function Tabla({ titulo, filas, vacio }: { titulo: string; filas: Fila[]; vacio: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <h3 className="border-b border-line-soft px-3 py-2 text-sm font-semibold">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-ink-muted">{vacio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-line-soft/60 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 text-right font-medium">Clientes</th>
                <th className="px-3 py-2 text-right font-medium">Comprometidos</th>
                <th className="px-3 py-2 text-right font-medium">Cerrados</th>
                <th className="px-3 py-2 text-right font-medium">Perdidos</th>
                <th className="px-3 py-2 text-right font-medium">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.clave} className="border-t border-line-soft">
                  <td className="px-3 py-2">{f.nombre}</td>
                  <td className="px-3 py-2 text-right">{f.total}</td>
                  <td className="px-3 py-2 text-right text-ink-muted">{f.comprometidos}</td>
                  <td className="px-3 py-2 text-right text-ok">{f.cerrados}</td>
                  <td className="px-3 py-2 text-right text-ink-muted">{f.perdidos}</td>
                  <td className="px-3 py-2 text-right font-medium">{f.conversion} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Tile({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2">
      <div className="text-xs text-ink-muted">{etiqueta}</div>
      <div className="display text-2xl font-semibold">{valor}</div>
      {nota && <div className="text-[11px] text-ink-faint">{nota}</div>}
    </div>
  );
}

export default function Informe({ clientes, proyectos, nombres }: Props) {
  const porProyecto = useMemo(
    () =>
      conversionPor(
        clientes,
        (c) => c.proyectoId ?? "sin",
        (k) => proyectos.find((p) => p.id === k)?.nombre ?? "Sin proyecto",
      ),
    [clientes, proyectos],
  );

  const porVendedor = useMemo(
    () =>
      conversionPor(
        clientes,
        (c) => c.vendedorId ?? "sin",
        (k, c) => nombres[k] ?? c.vendedorNombre ?? (k === "sin" ? "Sin asignar" : k),
      ),
    [clientes, nombres],
  );

  const motivos = useMemo(() => motivosDePerdida(clientes), [clientes]);
  const etapas = useMemo(() => diasPorEtapa(clientes), [clientes]);
  const ciclo = useMemo(() => diasHastaCierre(clientes), [clientes]);

  const cerrados = clientes.filter((c) => c.etapa === "escritura").length;
  const cierre = clientes.length === 0 ? 0 : Math.round((cerrados / clientes.length) * 100);

  if (clientes.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-panel px-4 py-10 text-center text-sm text-ink-muted">
        El informe se arma con los clientes cargados. Todavía no hay ninguno.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile etiqueta="Clientes" valor={String(clientes.length)} />
        <Tile etiqueta="Escrituras" valor={String(cerrados)} />
        <Tile etiqueta="Tasa de cierre" valor={`${cierre} %`} nota="sobre el total de clientes" />
        <Tile
          etiqueta="Ciclo de venta"
          valor={ciclo === null ? "—" : `${ciclo} días`}
          nota="mediana, de ingreso a escritura"
        />
      </div>

      <Tabla titulo="Por proyecto" filas={porProyecto} vacio="Sin clientes asociados a proyectos." />
      <Tabla titulo="Por broker" filas={porVendedor} vacio="Sin clientes asignados." />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-line bg-panel">
          <h3 className="border-b border-line-soft px-3 py-2 text-sm font-semibold">
            Por qué se pierden ({motivos.total})
          </h3>
          {motivos.filas.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-ink-muted">
              Ningún cliente marcado como perdido.
            </p>
          ) : (
            <ul className="space-y-2 px-3 py-3">
              {motivos.filas.map((f) => (
                <li key={f.motivo}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={f.motivo === "sin-registrar" ? "text-ink-faint" : ""}>
                      {f.motivo === "sin-registrar" ? "Sin motivo registrado" : ETIQUETA_MOTIVO[f.motivo]}
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {f.n} · {f.pct} %
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className={`h-full rounded-full ${f.motivo === "sin-registrar" ? "bg-line" : "bg-accent"}`}
                      style={{ width: `${f.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-panel">
          <h3 className="border-b border-line-soft px-3 py-2 text-sm font-semibold">
            Cuánto dura cada etapa
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {etapas.map((e) => (
                <tr key={e.etapa} className="border-b border-line-soft last:border-b-0">
                  <td className="px-3 py-1.5">{ETIQUETA_ETAPA[e.etapa]}</td>
                  <td className="px-3 py-1.5 text-right">
                    {e.dias === null ? "—" : `${e.dias} ${e.dias === 1 ? "día" : "días"}`}
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs text-ink-faint">
                    {e.casos === 0 ? "sin casos" : `${e.casos} ${e.casos === 1 ? "caso" : "casos"}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line-soft px-3 py-2 text-[11px] text-ink-faint">
            Mediana de días, contando solo las etapas que el cliente ya dejó atrás. La etapa actual sigue
            corriendo y no entra en el cálculo.
          </p>
        </section>
      </div>
    </div>
  );
}
