"use client";

// Cotización comparativa pública: 2 o 3 proyectos con las mismas condiciones.

import Link from "next/link";
import type { Cotizacion } from "@/lib/cotizaciones-store";
import { fmtCLP } from "@/lib/format";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import Marca from "./Marca";
import TablaComparativa from "./TablaComparativa";

type Props = {
  cotizacion: Cotizacion;
  proyectos: (ProyectoEnriquecido | null)[];
  contacto: string;
  fechaLarga: (iso: string) => string;
};

export default function VistaComparativa({ cotizacion: c, proyectos, contacto, fechaLarga }: Props) {
  const items = c.items ?? [];
  const pr = c.parametros;
  const vencida = c.validaHasta < new Date().toISOString().slice(0, 10);
  const columnas = items.map((it, i) => {
    const p = proyectos[i] ?? null;
    return {
      proyecto: p,
      nombre: it.proyectoNombre,
      tipologia: p?.tipologias.find((t) => t.id === it.tipologiaId) ?? null,
      tipologiaNombre: it.tipologiaNombre,
      precioUF: it.precioUF,
    };
  });

  return (
    <div className="min-h-full bg-fondo print:bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="no-print mb-4 flex items-center justify-between text-sm">
          <Link href="/" className="text-ink-muted hover:text-ink">
            ← Ver los proyectos en el mapa
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent"
          >
            Imprimir o guardar PDF
          </button>
        </div>

        <article className="rounded-xl border border-line border-t-4 border-t-oro bg-panel p-6 shadow-sm print:rounded-none print:border-0 print:shadow-none sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-oro/40 pb-5">
            <div>
              <Marca tono="negro" tamano="lg" />
              <h1 className="mt-1 text-2xl font-semibold">Cotización comparativa</h1>
              <p className="text-sm text-ink-muted">
                Para {c.clienteNombre}
                {c.clienteEmail ? ` · ${c.clienteEmail}` : ""}
              </p>
            </div>
            <dl className="text-right text-sm">
              <dt className="text-xs text-ink-muted">Código</dt>
              <dd className="font-mono font-semibold">{c.codigo}</dd>
              <dt className="mt-1 text-xs text-ink-muted">Emitida</dt>
              <dd>{fechaLarga(c.creadaEn)}</dd>
              <dt className="mt-1 text-xs text-ink-muted">Válida hasta</dt>
              <dd className={vencida ? "font-semibold text-warn" : ""}>{fechaLarga(c.validaHasta)}</dd>
            </dl>
          </header>

          {vencida && (
            <p className="mt-4 rounded-md bg-select-soft px-3 py-2 text-sm">
              Esta cotización venció. Los precios y la UF pueden haber cambiado; pide una actualizada.
            </p>
          )}

          <p className="mt-5 text-sm text-ink-muted">
            Condiciones iguales para todos: pie {pr.piePct} %, {pr.plazoAnios} años, tasa {pr.tasaAnualPct} %
            anual en UF{pr.incluirSeguros ? ", con seguros" : ""}. UF a {fmtCLP(pr.valorUF)} del día de
            emisión.
          </p>

          <div className="mt-4">
            <TablaComparativa
              columnas={columnas}
              condiciones={{
                piePct: pr.piePct,
                plazoAnios: pr.plazoAnios,
                tasaAnualPct: pr.tasaAnualPct,
                valorUF: pr.valorUF,
                incluirSeguros: pr.incluirSeguros,
              }}
            />
          </div>

          {c.nota && (
            <section className="mt-6">
              <h3 className="text-sm font-semibold">Nota</h3>
              <p className="mt-1 whitespace-pre-line text-sm">{c.nota}</p>
            </section>
          )}

          <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
            <p>
              Valores referenciales calculados con amortización francesa en UF, seguros estimados y gastos
              aproximados. No constituye oferta ni aprobación de crédito; las condiciones definitivas las fija
              cada banco. Precios sujetos a disponibilidad.
            </p>
            <p className="mt-2 text-ink-muted">{c.vendedorNombre ? `` : contacto}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
