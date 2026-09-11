// Recibe un documento subido por el propio cliente desde /mi/<token>.
//
// Sin sesión: el token del enlace es la credencial. Por eso aquí solo se puede añadir, nunca
// borrar ni leer: un enlace reenviado por error no debe servir para ver ni destruir papeles.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { nuevaInteraccion } from "@/lib/clientes";
import { almacenamientoDisponible, guardarCliente, listarClientes } from "@/lib/clientes-store";
import { conDocumento } from "@/lib/documentos";
import { borrarArchivo, esFallo, guardarArchivo } from "@/lib/documentos-archivo";
import { listarProyectos } from "@/lib/proyectos-store";
import { porToken, subibles, vistaPortal } from "@/lib/portal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status });

export async function POST(req: NextRequest) {
  if (!almacenamientoDisponible()) return error("Sin almacenamiento conectado", 503);
  const form = await req.formData().catch(() => null);
  if (!form) return error("Petición inválida", 400);

  const cliente = porToken(await listarClientes(), String(form.get("token") ?? ""));
  // Mismo mensaje para token inválido y documento ajeno: no se confirma qué enlaces existen.
  if (!cliente) return error("Este enlace ya no está disponible", 404);

  const definicion = subibles(cliente).find((d) => d.id === String(form.get("doc") ?? ""));
  if (!definicion) return error("Ese documento no se puede subir desde aquí", 400);

  const guardado = await guardarArchivo(cliente.id, definicion.id, form.get("archivo"));
  if (esFallo(guardado)) return error(guardado.error, guardado.status);

  const rutaPrevia = cliente.documentos?.find((d) => d.id === definicion.id)?.ruta;
  if (rutaPrevia !== guardado.ruta) await borrarArchivo(rutaPrevia, cliente.id);

  const actualizado = {
    ...cliente,
    documentos: conDocumento(cliente.documentos, definicion.id, {
      estado: "recibido" as const,
      ruta: guardado.ruta,
      archivo: guardado.archivo,
      // Una observación anterior ya no aplica al archivo nuevo.
      nota: undefined,
    }),
    actualizadoEn: new Date().toISOString(),
    interacciones: [
      nuevaInteraccion({
        tipo: "nota",
        texto: `El cliente subió ${definicion.nombre.toLowerCase()} desde su portal`,
      }),
      ...(cliente.interacciones ?? []),
    ],
  };
  await guardarCliente(actualizado);

  const { proyectos } = await listarProyectos();
  return NextResponse.json({
    vista: vistaPortal(
      actualizado,
      proyectos.find((p) => p.id === actualizado.proyectoId),
    ),
  });
}
