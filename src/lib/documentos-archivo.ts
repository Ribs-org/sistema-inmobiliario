// Archivos de la carpeta de documentos, en Vercel Blob con acceso privado.
//
// Viven en su propia tienda (pyxis-documentos, variable DOCS_READ_WRITE_TOKEN) porque una
// tienda pública no admite blobs privados y las fotos de proyecto sí tienen que ser públicas.
// Lo usan el área interna (/api/documentos) y el portal del cliente (/api/portal/subir).

import { del, get, put } from "@vercel/blob";
import { MAX_MB } from "./documentos";

const MAX_BYTES = MAX_MB * 1024 * 1024;

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const token = () => process.env.DOCS_READ_WRITE_TOKEN;

/** Carpeta de un cliente. Ningún archivo se lee ni se borra fuera de la suya. */
export const carpetaDe = (clienteId: string) => `documentos/${clienteId}/`;

export const enSuCarpeta = (ruta: string | undefined, clienteId: string) =>
  !!ruta && ruta.startsWith(carpetaDe(clienteId));

export type Fallo = { error: string; status: number };
export type Guardado = { ruta: string; archivo: string };

const esFallo = (x: unknown): x is Fallo => !!x && typeof x === "object" && "error" in x;
export { esFallo };

/** Valida y sube un archivo. Devuelve la ruta guardada o el motivo del rechazo. */
export async function guardarArchivo(
  clienteId: string,
  docId: string,
  archivo: unknown,
): Promise<Guardado | Fallo> {
  const t = token();
  if (!t) return { error: "Almacenamiento de documentos no configurado", status: 503 };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Falta el archivo", status: 400 };
  if (!EXT[archivo.type]) return { error: "Usa PDF, JPG, PNG o HEIC", status: 415 };
  if (archivo.size > MAX_BYTES) return { error: `El archivo supera los ${MAX_MB} MB`, status: 413 };
  const blob = await put(
    `${carpetaDe(clienteId)}${docId}.${EXT[archivo.type]}`,
    Buffer.from(await archivo.arrayBuffer()),
    { access: "private", addRandomSuffix: true, contentType: archivo.type, token: t },
  );
  return { ruta: blob.pathname, archivo: archivo.name.slice(0, 160) };
}

/** Borra un archivo anterior. Silencioso: que falle no debe tumbar la operación principal. */
export async function borrarArchivo(ruta: string | undefined, clienteId: string): Promise<void> {
  const t = token();
  if (!t || !enSuCarpeta(ruta, clienteId)) return;
  await del(ruta!, { token: t }).catch(() => {});
}

/** Abre un archivo para servirlo. null si no se puede leer. */
export async function leerArchivo(ruta: string) {
  const t = token();
  if (!t) return null;
  const r = await get(ruta, { access: "private", token: t }).catch(() => null);
  return r && r.statusCode === 200 ? r : null;
}
