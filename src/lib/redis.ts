// Cliente Upstash Redis compartido (integración de Vercel Marketplace).

import { Redis } from "@upstash/redis";

function credenciales() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

let instancia: Redis | null = null;

export function redis(): Redis | null {
  const c = credenciales();
  if (!c) return null;
  if (!instancia) instancia = new Redis(c);
  return instancia;
}

export function almacenamientoDisponible(): boolean {
  return credenciales() !== null;
}

/** Lee una lista JSON guardada bajo una clave; [] si no existe. */
export async function leerLista<T>(clave: string): Promise<T[]> {
  const r = redis();
  if (!r) return [];
  const datos = await r.get<T[]>(clave);
  return Array.isArray(datos) ? datos : [];
}

export async function escribirLista<T>(clave: string, lista: T[]): Promise<void> {
  const r = redis();
  if (!r) throw new Error("Sin almacenamiento");
  await r.set(clave, lista);
}
