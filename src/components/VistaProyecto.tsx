"use client";

// Brochure público de un proyecto: fotos, datos, Metro, tipologías con planos y rentabilidad estimada.

import Link from "next/link";
import { ETIQUETA_ESTADO, etiquetaLinea } from "@/data/metro";
import { ETIQUETA_ESTADO_VENTA } from "@/data/proyectos";
import { simularCredito } from "@/lib/credito";
import { fmtCLP, fmtDist, fmtM2, fmtUF } from "@/lib/format";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import { arriendoEstimadoUF } from "@/lib/rentabilidad";
import Galeria from "./Galeria";
import Marca from "./Marca";

type Props = {
  proyecto: ProyectoEnriquecido;
  valorUF: number;
  tasaAnualPct: number;
  contacto: string;
};

export default function VistaProyecto({ proyecto: p, valorUF, tasaAnualPct, contacto }: Props) {
  const clp = (uf: number) => fmtCLP(uf * valorUF);
  return (
    <div className="min-h-full bg-fondo print:bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="no-print mb-4 flex items-center justify-between text-sm">
          <Link href={`/?p=${p.id}`} className="text-ink-muted hover:text-ink">
            ← Ver en el mapa
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
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Marca tono="negro" tamano="lg" />
              <h1 className="mt-2 text-3xl font-semibold leading-tight">{p.nombre}</h1>
              <p className="text-sm text-ink-muted">
                {p.direccion}, {p.comuna}
              </p>
              <p className="text-xs text-ink-faint">{p.inmobiliaria}</p>
            </div>
            <div className="text-right text-sm">
              <div className="inline-block rounded bg-select-soft px-2 py-0.5 text-xs font-medium">
                {ETIQUETA_ESTADO_VENTA[p.estado]}
              </div>
              <div className="mt-1 text-ink-muted">Entrega: {p.entrega}</div>
              <div className="text-ink-muted">
                {p.pisos} pisos · {p.unidades} unidades
              </div>
            </div>
          </header>

          {p.imagenes && p.imagenes.length > 0 && (
            <div className="mt-5">
              <Galeria imagenes={p.imagenes} titulo={p.nombre} />
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed">{p.descripcion}</p>

          {(p.metroActual || p.metroFuturo) && (
            <section className="mt-5 rounded-lg bg-fondo/70 p-4">
              <h3 className="text-sm font-semibold">Metro</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {p.metroActual && (
                  <li>
                    <strong>{p.metroActual.estacion.nombre}</strong> (
                    {etiquetaLinea(p.metroActual.estacion.lineaId)}, operativa): {p.metroActual.minutos} min a
                    pie · {fmtDist(p.metroActual.caminataM)}
                  </li>
                )}
                {p.metroFuturo && (
                  <li>
                    <strong>{p.metroFuturo.estacion.nombre}</strong> (
                    {etiquetaLinea(p.metroFuturo.estacion.lineaId)},{" "}
                    {ETIQUETA_ESTADO[p.metroFuturo.estacion.estado].toLowerCase()}{" "}
                    {p.metroFuturo.estacion.apertura}): {p.metroFuturo.minutos} min a pie
                  </li>
                )}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Tipologías</h2>
              <span className="text-xs text-ink-faint">
                UF a {fmtCLP(valorUF)} · dividendo referencial pie {p.pieMinimoPct} %, 25 años, {tasaAnualPct}{" "}
                %
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {p.tipologias.map((t) => {
                const r = simularCredito({
                  precioUF: t.precioUF,
                  piePct: p.pieMinimoPct,
                  bonoPiePct: p.bonoPiePct ?? 0,
                  plazoAnios: 25,
                  tasaAnualPct,
                  valorUF,
                });
                const arriendo = t.arriendoUF ?? arriendoEstimadoUF(t.precioUF);
                return (
                  <li
                    key={t.id}
                    className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-[1fr_180px]"
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-base font-semibold">{t.nombre}</h3>
                        <div className="text-right">
                          <div className="text-base font-semibold">{fmtUF(t.precioUF)}</div>
                          <div className="text-xs text-ink-muted">{clp(t.precioUF)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-ink-muted">
                        {fmtM2(t.m2Utiles)} útiles + {fmtM2(t.m2Terraza)} terraza
                        {t.orientacion ? ` · ${t.orientacion}` : ""} · {t.disponibles} disponibles
                      </p>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-ink-muted">Dividendo ref.</dt>
                          <dd className="font-semibold">{fmtUF(r.dividendoTotalUF, 2)}</dd>
                          <dd className="text-xs text-ink-faint">{clp(r.dividendoTotalUF)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-muted">Arriendo estimado</dt>
                          <dd className="font-semibold">{fmtUF(arriendo, 2)}</dd>
                          <dd className="text-xs text-ink-faint">{clp(arriendo)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-muted">Rentabilidad bruta</dt>
                          <dd className="font-semibold">
                            {(((arriendo * 12) / t.precioUF) * 100).toFixed(1).replace(".", ",")} %
                          </dd>
                          <dd className="text-xs text-ink-faint">anual</dd>
                        </div>
                      </dl>
                    </div>
                    {t.plano && (
                      <a href={t.plano} target="_blank" rel="noreferrer" className="block">
                        {/\.pdf($|\?)/i.test(t.plano) ? (
                          <span className="text-xs text-accent hover:underline">Ver plano (PDF)</span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.plano}
                            alt={`Plano ${t.nombre}`}
                            className="h-32 w-full rounded-md border border-line-soft object-contain"
                            loading="lazy"
                          />
                        )}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line p-4 text-sm">
              <h3 className="font-semibold">Condiciones comerciales</h3>
              <ul className="mt-1 space-y-0.5 text-ink-muted">
                <li>Pie mínimo {p.pieMinimoPct} %</li>
                <li>
                  {p.bonoPiePct
                    ? `Bono pie de la inmobiliaria: ${p.bonoPiePct} % del precio`
                    : "Sin bono pie"}
                </li>
                <li>{p.pieEnCuotas ? "Pie en cuotas hasta la entrega" : "Pie al contado"}</li>
              </ul>
            </div>
            {p.amenidades.length > 0 && (
              <div className="rounded-lg border border-line p-4 text-sm">
                <h3 className="font-semibold">Espacios comunes</h3>
                <p className="mt-1 text-ink-muted">{p.amenidades.join(" · ")}</p>
              </div>
            )}
          </section>

          <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
            <p>
              Valores referenciales. Dividendo con amortización francesa en UF y seguros estimados; arriendo y
              rentabilidad estimados sobre promedios de mercado, sin considerar impuestos personales. Precios
              y disponibilidad sujetos a cambio.
            </p>
            <p className="mt-2 text-ink-muted">{contacto}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
