"use client";

// Documento público de cotización (solo lectura, imprimible).

import Link from "next/link";
import { useMemo } from "react";
import { ETIQUETA_ESTADO, etiquetaLinea } from "@/data/metro";
import { ETIQUETA_ESTADO_VENTA } from "@/data/proyectos";
import type { Cotizacion } from "@/lib/cotizaciones-store";
import { CARGA_MAXIMA_RENTA, cuotaPie, simularCredito } from "@/lib/credito";
import { fmtCLP, fmtDist, fmtM2, fmtUF } from "@/lib/format";
import type { ProyectoEnriquecido } from "@/lib/proyectos";

type Props = {
  cotizacion: Cotizacion;
  proyecto: ProyectoEnriquecido | null;
  contacto: string;
};

const PLAZOS = [15, 20, 25, 30];

function fechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function VistaCotizacion({ cotizacion: c, proyecto: p, contacto }: Props) {
  const pr = c.parametros;
  const r = useMemo(() => simularCredito(pr), [pr]);
  const comparacion = useMemo(
    () => PLAZOS.map((anios) => ({ anios, r: simularCredito({ ...pr, plazoAnios: anios }) })),
    [pr],
  );
  const tipologia = p?.tipologias.find((t) => t.id === c.tipologiaId) ?? null;
  const clp = (uf: number) => fmtCLP(uf * pr.valorUF);
  const vencida = c.validaHasta < new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-full bg-fondo print:bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="no-print mb-4 flex items-center justify-between text-sm">
          <Link href={`/?p=${c.proyectoId}`} className="text-ink-muted hover:text-ink">
            ← Ver el proyecto en el mapa
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent"
          >
            Imprimir o guardar PDF
          </button>
        </div>

        <article className="rounded-xl border border-line bg-panel p-6 shadow-sm print:rounded-none print:border-0 print:shadow-none sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <div className="display text-xl font-bold tracking-tight">Pyxis</div>
              <h1 className="mt-1 text-2xl font-semibold">Cotización</h1>
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

          <section className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold">{c.proyectoNombre}</h2>
              {p ? (
                <>
                  <p className="text-sm text-ink-muted">
                    {p.direccion}, {p.comuna}
                  </p>
                  <p className="text-xs text-ink-faint">{p.inmobiliaria}</p>
                  <p className="mt-2 text-sm">
                    {ETIQUETA_ESTADO_VENTA[p.estado]} · Entrega: {p.entrega}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Proyecto ya no disponible en el catálogo.</p>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold">{c.tipologiaNombre ?? "Departamento"}</h2>
              {tipologia && (
                <p className="text-sm text-ink-muted">
                  {fmtM2(tipologia.m2Utiles)} útiles + {fmtM2(tipologia.m2Terraza)} terraza
                  {tipologia.orientacion ? ` · ${tipologia.orientacion}` : ""}
                </p>
              )}
              <p className="mt-2 text-lg font-semibold">
                {fmtUF(pr.precioUF)}{" "}
                <span className="text-sm font-normal text-ink-muted">{clp(pr.precioUF)}</span>
              </p>
              <p className="text-xs text-ink-faint">UF a {fmtCLP(pr.valorUF)} del día de emisión</p>
            </div>
          </section>

          {p && (p.metroActual || p.metroFuturo) && (
            <section className="mt-6 rounded-lg bg-fondo/70 p-4">
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
            <h3 className="text-sm font-semibold">Simulación de crédito hipotecario</h3>
            <div className="mt-2 rounded-xl bg-ink p-5 text-white">
              <div className="text-sm text-white/70">
                Dividendo mensual{pr.incluirSeguros ? " con seguros" : ""}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4">
                <span className="display text-4xl font-semibold">{fmtUF(r.dividendoTotalUF, 2)}</span>
                <span className="text-xl text-white/85">{clp(r.dividendoTotalUF)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Hecho t="Pie" v={`${pr.piePct} % · ${fmtUF(r.pieUF)}`} s={clp(r.pieUF)} />
                {r.bonoPieUF > 0 && (
                  <Hecho
                    t="Bono pie inmobiliaria"
                    v={fmtUF(r.bonoPieUF)}
                    s={`${pr.bonoPiePct} % del precio`}
                  />
                )}
                <Hecho t="Pie del cliente" v={fmtUF(r.pieClienteUF)} s={clp(r.pieClienteUF)} />
                <Hecho t="Crédito" v={fmtUF(r.montoCreditoUF)} s={clp(r.montoCreditoUF)} />
                <Hecho t="Plazo y tasa" v={`${pr.plazoAnios} años · ${pr.tasaAnualPct} % anual UF`} />
                <Hecho
                  t="Renta mínima"
                  v={fmtCLP(r.rentaMinimaCLP)}
                  s={`dividendo ≤ ${CARGA_MAXIMA_RENTA * 100} % de la renta`}
                />
                {pr.pieEnCuotas && (
                  <Hecho
                    t="Pie en cuotas"
                    v={`${fmtUF(cuotaPie(r.pieClienteUF, pr.mesesEntrega), 2)} / mes`}
                    s={`${pr.mesesEntrega} cuotas hasta la entrega`}
                  />
                )}
                <Hecho
                  t="Gastos operacionales"
                  v={fmtUF(r.gastosOperacionalesUF)}
                  s={`${clp(r.gastosOperacionalesUF)} aprox.`}
                />
              </dl>
            </div>

            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs text-ink-muted">
                <tr>
                  <th className="py-1.5 font-medium">Plazo</th>
                  <th className="py-1.5 font-medium">Dividendo</th>
                  <th className="py-1.5 font-medium">En pesos</th>
                  <th className="py-1.5 font-medium">Intereses totales</th>
                </tr>
              </thead>
              <tbody>
                {comparacion.map(({ anios, r: x }) => (
                  <tr
                    key={anios}
                    className={`border-t border-line-soft ${anios === pr.plazoAnios ? "font-semibold" : ""}`}
                  >
                    <td className="py-1.5">{anios} años</td>
                    <td className="py-1.5">{fmtUF(x.dividendoTotalUF, 2)}</td>
                    <td className="py-1.5">{clp(x.dividendoTotalUF)}</td>
                    <td className="py-1.5">{fmtUF(x.totalInteresesUF)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {c.nota && (
            <section className="mt-6">
              <h3 className="text-sm font-semibold">Nota</h3>
              <p className="mt-1 whitespace-pre-line text-sm">{c.nota}</p>
            </section>
          )}

          <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
            <p>
              Valores referenciales calculados con amortización francesa en UF, seguros de desgravamen e
              incendio estimados y gastos operacionales aproximados. No constituye oferta ni aprobación de
              crédito; las condiciones definitivas las fija cada banco. Precios sujetos a disponibilidad.
            </p>
            <p className="mt-2 text-ink-muted">{contacto}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Hecho({ t, v, s }: { t: string; v: string; s?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-white/60">{t}</dt>
      <dd className="font-semibold">{v}</dd>
      {s && <dd className="text-xs text-white/60">{s}</dd>}
    </div>
  );
}
