// Persistencia de clientes en Upstash Redis (integración de Vercel Marketplace).
// Si no hay credenciales, la API lo informa y la UI guarda en el navegador.

import { Redis } from "@upstash/redis";
import type { Cliente } from "./clientes";

const CLAVE = "ribs:clientes";

function credenciales() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

let cliente: Redis | null = null;
function redis(): Redis | null {
  const c = credenciales();
  if (!c) return null;
  if (!cliente) cliente = new Redis(c);
  return cliente;
}

export function almacenamientoDisponible(): boolean {
  return credenciales() !== null;
}

export async function listarClientes(): Promise<Cliente[]> {
  const r = redis();
  if (!r) return [];
  const datos = await r.get<Cliente[]>(CLAVE);
  return Array.isArray(datos) ? datos : [];
}

export async function guardarCliente(c: Cliente): Promise<Cliente[]> {
  const r = redis();
  if (!r) throw new Error("Sin almacenamiento");
  const lista = await listarClientes();
  const i = lista.findIndex((x) => x.id === c.id);
  if (i >= 0) lista[i] = { ...c, creadoEn: lista[i].creadoEn };
  else lista.push(c);
  await r.set(CLAVE, lista);
  return lista;
}

export async function eliminarCliente(id: string): Promise<Cliente[]> {
  const r = redis();
  if (!r) throw new Error("Sin almacenamiento");
  const lista = (await listarClientes()).filter((x) => x.id !== id);
  await r.set(CLAVE, lista);
  return lista;
}
