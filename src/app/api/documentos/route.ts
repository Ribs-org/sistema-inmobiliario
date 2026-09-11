// Archivos de la carpeta de un cliente, desde el área interna. El almacenamiento y sus
// reglas están en src/lib/documentos-archivo.ts; aquí solo va el control de acceso.
//
// El estado de cada documento (pendiente, recibido, observado…) se guarda por /api/clientes
// como un campo más del cliente.

import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion, puedeVer, type Sesion } from "@/lib/auth";
import { conDocumento, DOCUMENTOS } from "@/lib/documentos";
import { borrarArchivo, enSuCarpeta, esFallo, guardarArchivo, leerArchivo } from "@/lib/documentos-archivo";
import { almacenamientoDisponible, guardarCliente, listarClientes } from "@/lib/clientes-store";
import { nuevaInteraccion, type Cliente } from "@/lib/clientes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

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
  if (!enSuCarpeta(doc.ruta, ctx.cliente.id)) return error("Ruta de archivo inválida", 400);
  const archivo = await leerArchivo(doc.ruta);
  if (!archivo) return error("No se pudo leer el archivo", 502);
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

  const guardado = await guardarArchivo(cliente.id, definicion.id, form?.get("archivo"));
  if (esFallo(guardado)) return error(guardado.error, guardado.status);

  // El archivo nuevo reemplaza al anterior; el viejo se borra para no dejar copias sueltas.
  const rutaPrevia = cliente.documentos?.find((d) => d.id === definicion.id)?.ruta;
  if (rutaPrevia !== guardado.ruta) await borrarArchivo(rutaPrevia, cliente.id);

  return guardarYResponder(
    {
      ...cliente,
      documentos: conDocumento(cliente.documentos, definicion.id, {
        estado: "recibido",
        ruta: guardado.ruta,
        archivo: guardado.archivo,
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
  await borrarArchivo(doc.ruta, cliente.id);
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
