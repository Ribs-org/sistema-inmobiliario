"use client";

// Tabla de comparación de 2 o 3 proyectos con las mismas condiciones de crédito.
// La usan el comparador interactivo y la cotización comparativa pública.

import { etiquetaLinea } from "@/data/metro";
import { ETIQUETA_ESTADO_VENTA, type Tipologia } from "@/data/proyectos";
import { simularCredito } from "@/lib/credito";
import { fmtCLP, fmtM2, fmtUF } from "@/lib/format";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import { type ReactNode } from "react";

export type ColumnaComparativa = {
  proyecto: ProyectoEnriquecido | null;
  nombre: string;
  tipologia: Tipologia | null;
  tipologiaNombre: string | null;
  precioUF: number;
};

export type CondicionesComparativa = {
  piePct: number;
  plazoAnios: number;
  tasaAnualPct: number;
  valorUF: number;
  incluirSeguros: boolean;
};

type Props = {
  columnas: ColumnaComparativa[];
  condiciones: CondicionesComparativa;
  /** Celda extra bajo el nombre de cada columna (por ejemplo, selector de tipología o botón quitar) */
  cabeceraExtra?: (i: number) => ReactNode;
};

export default function TablaComparativa({ columnas, condiciones, cabeceraExtra }: Props) {
  const resultados = columnas.map((c) =>
    simularCredito({
      precioUF: c.precioUF,
      piePct: condiciones.piePct,
      bonoPiePct: c.proyecto?.bonoPiePct ?? 0,
      plazoAnios: condiciones.plazoAnios,
      tasaAnualPct: condiciones.tasaAnualPct,
      valorUF: condiciones.valorUF,
      incluirSeguros: condiciones.incluirSeguros,
    }),
  );
  const clp = (uf: number) => fmtCLP(uf * condiciones.valorUF);
  const mejorMin = (vals: (number | null)[]) => {
    const validos = vals.filter((v): v is number => v !== null);
    return validos.length > 1 ? Math.min(...validos) : null;
  };

  const ufM2 = columnas.map((c) => (c.tipologia ? c.precioUF / c.tipologia.m2Utiles : null));
  const minHoy = columnas.map((c) => c.proyecto?.metroActual?.minutos ?? null);
  const minFut = columnas.map((c) => c.proyecto?.minConFuturo ?? null);
  const dividendos = resultados.map((r) => r.dividendoTotalUF);
  const precios = columnas.map((c) => c.precioUF);

  const filas: {
    etiqueta: string;
    celdas: ReactNode[];
    mejor?: number | null;
    valores?: (number | null)[];
  }[] = [
    {
      etiqueta: "Ubicación",
      celdas: columnas.map((c) =>
        c.proyecto ? (
          <>
            <div>{c.proyecto.comuna}</div>
            <div className="text-xs text-ink-muted">{c.proyecto.direccion}</div>
          </>
        ) : (
          "—"
        ),
      ),
    },
    {
      etiqueta: "Estado y entrega",
      celdas: columnas.map((c) =>
        c.proyecto ? `${ETIQUETA_ESTADO_VENTA[c.proyecto.estado]} · ${c.proyecto.entrega}` : "—",
      ),
    },
    {
      etiqueta: "Tipología",
      celdas: columnas.map((c) =>
        c.tipologia ? (
          <>
            <div>{c.tipologia.nombre}</div>
            <div className="text-xs text-ink-muted">
              {fmtM2(c.tipologia.m2Utiles)} útiles + {fmtM2(c.tipologia.m2Terraza)} terraza
              {c.tipologia.orientacion ? ` · ${c.tipologia.orientacion}` : ""}
            </div>
          </>
        ) : (
          (c.tipologiaNombre ?? "—")
        ),
      ),
    },
    {
      etiqueta: "Precio",
      celdas: columnas.map((c) => (
        <>
          <div className="font-semibold">{fmtUF(c.precioUF)}</div>
          <div className="text-xs text-ink-muted">{clp(c.precioUF)}</div>
        </>
      )),
      valores: precios,
      mejor: mejorMin(precios),
    },
    {
      etiqueta: "UF por m² útil",
      celdas: ufM2.map((v) => (v === null ? "—" : `${fmtUF(Math.round(v))}/m²`)),
      valores: ufM2,
      mejor: mejorMin(ufM2),
    },
    {
      etiqueta: "Metro hoy",
      celdas: columnas.map((c) =>
        c.proyecto?.metroActual ? (
          <>
            <div>
              {c.proyecto.metroActual.estacion.nombre} (
              {etiquetaLinea(c.proyecto.metroActual.estacion.lineaId)})
            </div>
            <div className="text-xs text-ink-muted">{c.proyecto.metroActual.minutos} min a pie</div>
          </>
        ) : (
          "—"
        ),
      ),
      valores: minHoy,
      mejor: mejorMin(minHoy),
    },
    {
      etiqueta: "Metro con líneas futuras",
      celdas: columnas.map((c) =>
        c.proyecto?.metroFuturo ? (
          <>
            <div>
              {c.proyecto.metroFuturo.estacion.nombre} (
              {etiquetaLinea(c.proyecto.metroFuturo.estacion.lineaId)}{" "}
              {c.proyecto.metroFuturo.estacion.apertura})
            </div>
            <div className="text-xs text-ink-muted">{c.proyecto.metroFuturo.minutos} min a pie</div>
          </>
        ) : c.proyecto ? (
          <span className="text-xs text-ink-muted">Sin mejora</span>
        ) : (
          "—"
        ),
      ),
      valores: minFut,
      mejor: mejorMin(minFut),
    },
    {
      etiqueta: `Pie ${condiciones.piePct} %`,
      celdas: resultados.map((r) => (
        <>
          <div>{fmtUF(r.pieClienteUF)}</div>
          <div className="text-xs text-ink-muted">
            {r.bonoPieUF > 0 ? `${clp(r.pieClienteUF)} · bono ${fmtUF(r.bonoPieUF)}` : clp(r.pieClienteUF)}
          </div>
        </>
      )),
    },
    {
      etiqueta: "Crédito",
      celdas: resultados.map((r) => (
        <>
          <div>{fmtUF(r.montoCreditoUF)}</div>
          <div className="text-xs text-ink-muted">{clp(r.montoCreditoUF)}</div>
        </>
      )),
    },
    {
      etiqueta: `Dividendo a ${condiciones.plazoAnios} años${condiciones.incluirSeguros ? " con seguros" : ""}`,
      celdas: resultados.map((r) => (
        <>
          <div className="text-base font-semibold">{fmtUF(r.dividendoTotalUF, 2)}</div>
          <div className="text-xs text-ink-muted">{clp(r.dividendoTotalUF)}</div>
        </>
      )),
      valores: dividendos,
      mejor: mejorMin(dividendos),
    },
    {
      etiqueta: "Renta mínima",
      celdas: resultados.map((r) => fmtCLP(r.rentaMinimaCLP)),
    },
    {
      etiqueta: "Condiciones",
      celdas: columnas.map((c) =>
        c.proyecto
          ? [
              `Pie mínimo ${c.proyecto.pieMinimoPct} %`,
              c.proyecto.bonoPiePct ? `bono pie ${c.proyecto.bonoPiePct} %` : null,
              c.proyecto.pieEnCuotas ? "pie en cuotas" : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "—",
      ),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40 py-2 pr-3 text-left align-bottom text-xs font-medium text-ink-muted">
              {columnas.length} proyectos
            </th>
            {columnas.map((c, i) => (
              <th key={i} className="border-l border-line-soft px-3 py-2 text-left align-top">
                {c.proyecto?.imagenes?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.proyecto.imagenes[0]}
                    alt=""
                    className="mb-2 h-24 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                <div className="text-base font-semibold leading-tight">{c.nombre}</div>
                {c.proyecto && (
                  <div className="text-xs font-normal text-ink-muted">{c.proyecto.inmobiliaria}</div>
                )}
                {cabeceraExtra && <div className="mt-2 font-normal">{cabeceraExtra(i)}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.etiqueta} className="border-t border-line-soft">
              <th className="py-2 pr-3 text-left align-top text-xs font-medium text-ink-muted">
                {f.etiqueta}
              </th>
              {f.celdas.map((celda, i) => {
                const mejor = f.mejor !== null && f.mejor !== undefined && f.valores?.[i] === f.mejor;
                return (
                  <td
                    key={i}
                    className={`border-l border-line-soft px-3 py-2 align-top ${mejor ? "bg-ok/10" : ""}`}
                  >
                    {celda}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-faint">
        En verde, el mejor valor de cada fila (menor precio, UF/m², minutos o dividendo).
      </p>
    </div>
  );
}
