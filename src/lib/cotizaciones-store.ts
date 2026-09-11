// Cotizaciones guardadas: una simulación congelada para un cliente, con enlace público /c/<codigo>.

import { randomBytes } from "node:crypto";
import { escribirLista, leerLista } from "./redis";

const CLAVE = "pyxis:cotizaciones";
export const DIAS_VIGENCIA = 15;

export type ParametrosCotizacion = {
  precioUF: number;
  piePct: number;
  bonoPiePct: number;
  plazoAnios: number;
  tasaAnualPct: number;
  valorUF: number;
  incluirSeguros: boolean;
  pieEnCuotas: boolean;
  mesesEntrega: number;
};

/** Un proyecto dentro de una cotización comparativa. */
export type ItemCotizacion = {
  proyectoId: string;
  tipologiaId: string | null;
  proyectoNombre: string;
  tipologiaNombre: string | null;
  precioUF: number;
};

export type Cotizacion = {
  codigo: string;
  /** Comparativa de 2 o 3 proyectos; si existe, proyectoId/tipologiaId apuntan al primero */
  items?: ItemCotizacion[];
  proyectoId: string;
  tipologiaId: string | null;
  /** Copia del nombre del proyecto y la tipología por si cambian después */
  proyectoNombre: string;
  tipologiaNombre: string | null;
  clienteId: string | null;
  clienteNombre: string;
  clienteEmail: string;
  /** Broker que la emitió; aparece en el pie del documento público */
  vendedorId?: string | null;
  vendedorNombre?: string;
  vendedorEmail?: string;
  parametros: ParametrosCotizacion;
  nota: string;
  creadaEn: string;
  validaHasta: string;
};

export function generarCodigo(): string {
  // 8 caracteres legibles, sin ambigüedades (sin 0/O, 1/l).
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export function listarCotizaciones(): Promise<Cotizacion[]> {
  return leerLista<Cotizacion>(CLAVE);
}

export async function obtenerCotizacion(codigo: string): Promise<Cotizacion | null> {
  return (await listarCotizaciones()).find((c) => c.codigo === codigo) ?? null;
}

export async function guardarCotizacion(c: Cotizacion): Promise<Cotizacion> {
  const lista = await listarCotizaciones();
  lista.push(c);
  await escribirLista(CLAVE, lista);
  return c;
}

export async function eliminarCotizacion(codigo: string): Promise<void> {
  await escribirLista(
    CLAVE,
    (await listarCotizaciones()).filter((c) => c.codigo !== codigo),
  );
}

const num = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export function normalizarParametros(e: unknown): ParametrosCotizacion | null {
  if (!e || typeof e !== "object") return null;
  const p = e as Record<string, unknown>;
  const precioUF = Number(p.precioUF);
  if (!Number.isFinite(precioUF) || precioUF <= 0 || precioUF > 1e6) return null;
  return {
    precioUF,
    piePct: num(p.piePct, 0, 100, 20),
    bonoPiePct: num(p.bonoPiePct, 0, 100, 0),
    plazoAnios: num(p.plazoAnios, 1, 40, 25),
    tasaAnualPct: num(p.tasaAnualPct, 0, 30, 4.4),
    valorUF: num(p.valorUF, 1000, 1e6, 40000),
    incluirSeguros: p.incluirSeguros !== false,
    pieEnCuotas: !!p.pieEnCuotas,
    mesesEntrega: num(p.mesesEntrega, 1, 60, 18),
  };
}
