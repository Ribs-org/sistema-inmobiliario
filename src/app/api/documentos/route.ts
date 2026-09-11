// Archivos de la carpeta de un cliente. Van a Vercel Blob con acceso PRIVADO: llevan cédulas
// y liquidaciones de sueldo, así que nunca quedan en una URL pública. Se leen por esta misma
// ruta, que verifica la sesión y que el cliente sea de quien pide.
//
// El estado de cada documento (pendiente, recibido, observado…) se guarda por /api/clientes
// como un campo más del cliente. Aquí solo viven los archivos.

import { del, get, put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion, puedeVer, type Sesion } from "@/lib/auth";
import { conDocumento, DOCUMENTOS } from "@/lib/documentos";
import { almacenamientoDisponible, guardarCliente, listarClientes } from "@/lib/clientes-store";
import { nuevaInteraccion, type Cliente } from "@/lib/clientes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

/**
 * Los documentos viven en su propia tienda de Blob (pyxis-documentos), creada con acceso
 * privado. Las fotos de proyecto siguen en la tienda pública, que no admite blobs privados.
 */
const tokenDocumentos = () => process.env.DOCS_READ_WRITE_TOKEN;

/** Carpeta de un cliente dentro del almacén. Ningún archivo se lee fuera de la suya. */
const carpetaDe = (clienteId: string) => `documentos/${clienteId}/`;

/** Busca el cliente y comprueba que quien pide lo puede ver. */
async function contexto(
  req: NextRequest,
  id: string | null,
): Promise<NextResponse | { cliente: Cliente; sesion: Sesion }> {
  const sesion = await obtenerSesion(req);
  if (!sesion) return error("Necesitas iniciar sesión", 401);
  if (!almacenamientoDisponible()) return error("Sin almacenamiento conectado", 503);
  if (!id) return error("Falta el cliente", 400);
  const cliente = (await listarClientes()).find((c) => c.id === id);
  if (!cliente) return error("Cliente no encontrado", 404);
  if (!puedeVer(sesion, cliente.vendedorId)) return error("Ese cliente es de otro broker", 403);
  return { cliente, sesion };
}

/** Guarda y responde con la misma forma que /api/clientes, para refrescar la lista igual. */
async function guardarYResponder(nuevo: Cliente, sesion: Sesion) {
  const lista = await guardarCliente(nuevo);
  return NextResponse.json({
    clientes: lista.filter((c) => puedeVer(sesion, c.vendedorId)),
    almacenamiento: "redis",
    sesion,
  });
}

/** Descarga: /api/documentos?cliente=<id>&doc=<id>. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const ctx = await contexto(req, q.get("cliente"));
  if (ctx instanceof NextResponse) return ctx;
  const doc = ctx.cliente.documentos?.find((d) => d.id === q.get("doc"));
  if (!doc?.ruta) return error("Ese documento no tiene archivo", 404);
  // La ruta viaja dentro del cliente, así que se comprueba que apunte a su propia carpeta.
  if (!doc.ruta.startsWith(carpetaDe(ctx.cliente.id))) return error("Ruta de archivo inválida", 400);
  const token = tokenDocumentos();
  if (!token) return error("Almacenamiento de documentos no configurado", 503);
  const archivo = await get(doc.ruta, { access: "private", token }).catch(() => null);
  if (!archivo || archivo.statusCode !== 200) return error("No se pudo leer el archivo", 502);
  return new NextResponse(archivo.stream, {
    headers: {
      "content-type": archivo.blob.contentType,
      "content-disposition": `inline; filename="${(doc.archivo ?? doc.id).replace(/["\r\n]/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}

/** Sube el archivo de un documento y lo marca como recibido. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const ctx = await contexto(req, String(form?.get("cliente") ?? "") || null);
  if (ctx instanceof NextResponse) return ctx;
  const { cliente, sesion } = ctx;

  const definicion = DOCUMENTOS.find((d) => d.id === String(form?.get("doc") ?? ""));
  if (!definicion) return error("Documento desconocido", 400);

  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return error("Falta el archivo", 400);
  const token = tokenDocumentos();
  if (!token) return error("Almacenamiento de documentos no configurado", 503);
  if (!EXT[archivo.type]) return error("Usa PDF, JPG, PNG o HEIC", 415);
  if (archivo.size > MAX_BYTES) return error("El archivo supera los 15 MB", 413);

  const blob = await put(
    `${carpetaDe(cliente.id)}${definicion.id}.${EXT[archivo.type]}`,
    Buffer.from(await archivo.arrayBuffer()),
    { access: "private", addRandomSuffix: true, contentType: archivo.type, token },
  );
  // El archivo nuevo reemplaza al anterior; el viejo se borra para no dejar copias sueltas.
  const rutaPrevia = cliente.documentos?.find((d) => d.id === definicion.id)?.ruta;
  if (rutaPrevia && rutaPrevia !== blob.pathname) await del(rutaPrevia, { token }).catch(() => {});

  return guardarYResponder(
    {
      ...cliente,
      documentos: conDocumento(cliente.documentos, definicion.id, {
        estado: "recibido",
        ruta: blob.pathname,
        archivo: archivo.name.slice(0, 160),
      }),
      actualizadoEn: new Date().toISOString(),
      interacciones: [
        nuevaInteraccion({ tipo: "nota", texto: `${definicion.nombre}: archivo recibido` }),
        ...(cliente.interacciones ?? []),
      ],
    },
    sesion,
  );
}

/** Borra el archivo de un documento y lo deja pendiente otra vez. */
export async function DELETE(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const ctx = await contexto(req, q.get("cliente"));
  if (ctx instanceof NextResponse) return ctx;
  const { cliente, sesion } = ctx;
  const doc = cliente.documentos?.find((d) => d.id === q.get("doc"));
  if (!doc) return error("Ese documento no está en la carpeta", 404);
  const token = tokenDocumentos();
  if (doc.ruta?.startsWith(carpetaDe(cliente.id)) && token) await del(doc.ruta, { token }).catch(() => {});
  return guardarYResponder(
    {
      ...cliente,
      documentos: conDocumento(cliente.documentos, doc.id, {
        estado: "pendiente",
        ruta: undefined,
        archivo: undefined,
      }),
      actualizadoEn: new Date().toISOString(),
    },
    sesion,
  );
}
