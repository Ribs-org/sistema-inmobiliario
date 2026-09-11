// Unidades: el detalle departamento por departamento de un proyecto.
// Si un proyecto tiene unidades cargadas, el stock sale de ellas; si no, del contador
// `disponibles` de cada tipología (proyectos simples o importados desde Excel).

import type { Proyecto, Tipologia } from "@/data/proyectos";
import { parseNumero } from "./format";

export const ESTADOS_UNIDAD = ["disponible", "reservada", "vendida", "bloqueada"] as const;
export type EstadoUnidad = (typeof ESTADOS_UNIDAD)[number];

export const ETIQUETA_ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  bloqueada: "Bloqueada",
};

export type Unidad = {
  /** Número visible, ej. "1201" */
  numero: string;
  piso: number;
  tipologiaId: string;
  estado: EstadoUnidad;
  /** Precio propio; si falta, se usa el de la tipología */
  precioUF?: number;
  orientacion?: string;
  /** Cliente que la tiene comprometida */
  clienteId?: string | null;
};

export const tieneUnidades = (p: Pick<Proyecto, "unidadesDetalle">) => (p.unidadesDetalle?.length ?? 0) > 0;

export function disponiblesDeTipologia(p: Proyecto, t: Tipologia): number {
  if (!tieneUnidades(p)) return t.disponibles;
  return p.unidadesDetalle!.filter((u) => u.tipologiaId === t.id && u.estado === "disponible").length;
}

export function disponiblesTotales(p: Proyecto): number {
  return tieneUnidades(p)
    ? p.unidadesDetalle!.filter((u) => u.estado === "disponible").length
    : p.tipologias.reduce((s, t) => s + t.disponibles, 0);
}

/** Precio de una unidad (el propio o el de su tipología). */
export function precioUnidad(p: Proyecto, u: Unidad): number {
  return u.precioUF ?? p.tipologias.find((t) => t.id === u.tipologiaId)?.precioUF ?? 0;
}

/**
 * Genera la grilla del edificio: `porPiso` unidades por piso, repartidas en orden entre las
 * tipologías indicadas. El número es piso + posición, ej. piso 12 → 1201, 1202.
 */
export function generarUnidades(
  pisos: number,
  porPiso: number,
  tipologiaIds: string[],
  desdePiso = 1,
): Unidad[] {
  const unidades: Unidad[] = [];
  if (pisos <= 0 || porPiso <= 0 || tipologiaIds.length === 0) return unidades;
  for (let piso = desdePiso; piso < desdePiso + pisos; piso++) {
    for (let i = 0; i < porPiso; i++) {
      unidades.push({
        numero: `${piso}${String(i + 1).padStart(2, "0")}`,
        piso,
        tipologiaId: tipologiaIds[i % tipologiaIds.length],
        estado: "disponible",
      });
    }
  }
  return unidades;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numero = (v: unknown, min: number, max: number, def: number) => {
  const n = parseNumero(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Valida las unidades recibidas por la API; descarta las que no tienen número o tipología. */
export function normalizarUnidades(entrada: unknown, tipologiaIds: string[]): Unidad[] | undefined {
  if (!Array.isArray(entrada)) return undefined;
  const vistas = new Set<string>();
  const unidades = entrada
    .slice(0, 2000)
    .map((e): Unidad | null => {
      if (!e || typeof e !== "object") return null;
      const u = e as Record<string, unknown>;
      const numeroUnidad = texto(u.numero, 12);
      const tipologiaId = texto(u.tipologiaId, 10);
      if (!numeroUnidad || !tipologiaIds.includes(tipologiaId) || vistas.has(numeroUnidad)) return null;
      vistas.add(numeroUnidad);
      const estado = ESTADOS_UNIDAD.includes(u.estado as EstadoUnidad)
        ? (u.estado as EstadoUnidad)
        : "disponible";
      const precio = numero(u.precioUF, 0, 1e6, 0);
      return {
        numero: numeroUnidad,
        piso: numero(u.piso, -5, 200, 1),
        tipologiaId,
        estado,
        precioUF: precio || undefined,
        orientacion: texto(u.orientacion, 40) || undefined,
        clienteId: texto(u.clienteId, 40) || null,
      };
    })
    .filter((u): u is Unidad => u !== null);
  return unidades.length ? unidades : undefined;
}

/** Ordena por piso y luego por número, como se leen en una lista de precios. */
export function ordenarUnidades(unidades: Unidad[]): Unidad[] {
  return [...unidades].sort(
    (a, b) => a.piso - b.piso || a.numero.localeCompare(b.numero, "es", { numeric: true }),
  );
}
