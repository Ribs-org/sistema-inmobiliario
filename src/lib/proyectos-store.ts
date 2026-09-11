// Proyectos editables en Upstash Redis. Mientras la lista esté vacía, la app usa los
// proyectos de muestra de src/data/proyectos.ts.

import type { EstadoVenta, Proyecto, Tipologia } from "@/data/proyectos";
import { proyectosMuestra } from "@/data/proyectos-muestra";
import { parseNumero } from "./format";
import { normalizarUnidades } from "./unidades";
import { almacenamientoDisponible, escribirLista, leerLista } from "./redis";

const CLAVE = "pyxis:proyectos";
const ESTADOS: EstadoVenta[] = ["entrega-inmediata", "en-verde", "en-blanco"];

export type OrigenProyectos = "redis" | "muestra";

export { proyectosMuestra };

export async function listarProyectosGuardados(): Promise<Proyecto[]> {
  return leerLista<Proyecto>(CLAVE);
}

/** Lista que ve el público: la de Redis si tiene algo, si no la de muestra. */
export async function listarProyectos(): Promise<{ proyectos: Proyecto[]; origen: OrigenProyectos }> {
  if (almacenamientoDisponible()) {
    const guardados = await listarProyectosGuardados();
    if (guardados.length > 0) return { proyectos: guardados, origen: "redis" };
  }
  return { proyectos: proyectosMuestra(), origen: "muestra" };
}

export async function guardarProyecto(p: Proyecto): Promise<Proyecto[]> {
  const lista = await listarProyectosGuardados();
  const i = lista.findIndex((x) => x.id === p.id);
  if (i >= 0) lista[i] = p;
  else lista.push(p);
  await escribirLista(CLAVE, lista);
  return lista;
}

export async function guardarProyectos(ps: Proyecto[]): Promise<Proyecto[]> {
  const lista = await listarProyectosGuardados();
  for (const p of ps) {
    const i = lista.findIndex((x) => x.id === p.id);
    if (i >= 0) lista[i] = p;
    else lista.push(p);
  }
  await escribirLista(CLAVE, lista);
  return lista;
}

export async function eliminarProyecto(id: string): Promise<Proyecto[]> {
  const lista = (await listarProyectosGuardados()).filter((x) => x.id !== id);
  await escribirLista(CLAVE, lista);
  return lista;
}

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const texto = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Acepta solo URLs https de nuestro almacenamiento de imágenes (Vercel Blob). */
export function urlImagen(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com")
      ? u.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
const numero = (v: unknown, min: number, max: number, def = 0) => {
  const n = parseNumero(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

function normalizarTipologia(entrada: unknown, i: number): Tipologia | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const nombre = texto(e.nombre, 40);
  const precioUF = numero(e.precioUF, 1, 1e6);
  const m2Utiles = numero(e.m2Utiles, 1, 2000);
  if (!nombre || !precioUF || !m2Utiles) return null;
  return {
    id: texto(e.id, 10) || String.fromCharCode(97 + i),
    nombre,
    dormitorios: numero(e.dormitorios, 0, 10),
    banos: numero(e.banos, 0, 10, 1),
    m2Utiles,
    m2Terraza: numero(e.m2Terraza, 0, 500),
    precioUF,
    orientacion: texto(e.orientacion, 40),
    disponibles: numero(e.disponibles, 0, 5000),
    plano: urlImagen(e.plano),
    arriendoUF: numero(e.arriendoUF, 0, 10000) || undefined,
  };
}

/** Valida un proyecto recibido por la API. Devuelve null si falta lo esencial. */
export function normalizarProyecto(entrada: unknown): Proyecto | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const nombre = texto(e.nombre, 80);
  const lat = numero(e.lat, -90, 90, NaN);
  const lng = numero(e.lng, -180, 180, NaN);
  if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const tipologias = (Array.isArray(e.tipologias) ? e.tipologias : [])
    .map(normalizarTipologia)
    .filter((t): t is Tipologia => t !== null);
  if (tipologias.length === 0) return null;
  const id = texto(e.id, 60) || `${slug(nombre)}-${Date.now().toString(36).slice(-4)}`;
  const amenidades = Array.isArray(e.amenidades)
    ? e.amenidades.map((a) => texto(a, 40)).filter(Boolean)
    : texto(e.amenidades, 500)
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
  const estado = ESTADOS.includes(e.estado as EstadoVenta) ? (e.estado as EstadoVenta) : "en-verde";
  const bono = numero(e.bonoPiePct, 0, 50);
  return {
    id,
    nombre,
    inmobiliaria: texto(e.inmobiliaria, 80),
    comuna: texto(e.comuna, 40) || "Sin comuna",
    direccion: texto(e.direccion, 120),
    lat,
    lng,
    estado,
    entrega: texto(e.entrega, 60) || (estado === "entrega-inmediata" ? "Inmediata" : "Por definir"),
    pisos: numero(e.pisos, 0, 100),
    unidades: numero(e.unidades, 0, 5000),
    pieMinimoPct: numero(e.pieMinimoPct, 0, 100, 10),
    bonoPiePct: bono || undefined,
    pieEnCuotas: !!e.pieEnCuotas,
    descripcion: texto(e.descripcion, 1000),
    amenidades,
    tipologias,
    caminatas:
      e.caminatas && typeof e.caminatas === "object" ? (e.caminatas as Proyecto["caminatas"]) : undefined,
    comisionPct: numero(e.comisionPct, 0, 20) || undefined,
    unidadesDetalle: normalizarUnidades(
      e.unidadesDetalle,
      tipologias.map((t) => t.id),
    ),
    imagenes: Array.isArray(e.imagenes)
      ? e.imagenes
          .map(urlImagen)
          .filter((u): u is string => !!u)
          .slice(0, 12)
      : undefined,
  };
}
