// Persistencia de clientes en Upstash Redis. Si no hay credenciales, la API lo
// informa y la UI guarda en el navegador.

import type { Cliente } from "./clientes";
import { escribirLista, leerLista } from "./redis";

export { almacenamientoDisponible } from "./redis";

const CLAVE = "ribs:clientes";

export function listarClientes(): Promise<Cliente[]> {
  return leerLista<Cliente>(CLAVE);
}

export async function guardarCliente(c: Cliente): Promise<Cliente[]> {
  const lista = await listarClientes();
  const i = lista.findIndex((x) => x.id === c.id);
  if (i >= 0) lista[i] = { ...c, creadoEn: lista[i].creadoEn };
  else lista.push(c);
  await escribirLista(CLAVE, lista);
  return lista;
}

export async function eliminarCliente(id: string): Promise<Cliente[]> {
  const lista = (await listarClientes()).filter((x) => x.id !== id);
  await escribirLista(CLAVE, lista);
  return lista;
}
