"use client";

// Ranking del equipo: quién tiene más clientes activos, reservas y comisión proyectada.

import { useMemo } from "react";
import type { Proyecto } from "@/data/proyectos";
import { ETAPAS_ACTIVAS, type Cliente } from "@/lib/clientes";
import { fmtCLP, fmtUF } from "@/lib/format";
import { comisionUF } from "./Embudo";

type Props = {
  clientes: Cliente[];
  proyectos: Proyecto[];
  valorUF: number;
  /** Nombres por id de vendedor, para los que aún no tienen clientes */
  nombres: Record<string, string>;
};

export default function RankingVendedores({ clientes, proyectos, valorUF, nombres }: Props) {
  const filas = useMemo(() => {
    const por = new Map<
      string,
      { nombre: string; activos: number; comprometidos: number; cerradas: number; comision: number }
    >();
    for (const c of clientes) {
      const id = c.vendedorId ?? "sin";
      const nombre = c.vendedorNombre || nombres[id] || (id === "sin" ? "Sin asignar" : id);
      const f = por.get(id) ?? { nombre, activos: 0, comprometidos: 0, cerradas: 0, comision: 0 };
      if (ETAPAS_ACTIVAS.includes(c.etapa)) f.activos++;
      if (c.etapa === "reserva" || c.etapa === "promesa") {
        f.comprometidos++;
        f.comision += comisionUF(c, proyectos);
      }
      if (c.etapa === "escritura") {
        f.cerradas++;
        f.comision += comisionUF(c, proyectos);
      }
      por.set(id, f);
    }
    return [...por.values()].sort((a, b) => b.comision - a.comision || b.activos - a.activos);
  }, [clientes, proyectos, nombres]);

  if (filas.length < 2) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-line bg-panel">
      <table className="w-full text-sm">
        <thead className="bg-fondo/70 text-left text-xs text-ink-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Vendedor</th>
            <th className="px-3 py-2 text-right font-medium">Activos</th>
            <th className="px-3 py-2 text-right font-medium">Reservas y promesas</th>
            <th className="px-3 py-2 text-right font-medium">Escrituras</th>
            <th className="px-3 py-2 text-right font-medium">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre} className="border-t border-line-soft">
              <td className="px-4 py-2 font-medium">{f.nombre}</td>
              <td className="px-3 py-2 text-right">{f.activos}</td>
              <td className="px-3 py-2 text-right">{f.comprometidos}</td>
              <td className="px-3 py-2 text-right">{f.cerradas}</td>
              <td className="px-3 py-2 text-right">
                <span className="font-semibold">{fmtUF(Math.round(f.comision))}</span>
                <span className="block text-xs text-ink-faint">{fmtCLP(f.comision * valorUF)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
