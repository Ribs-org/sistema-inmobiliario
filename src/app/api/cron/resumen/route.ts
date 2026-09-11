// Resumen diario de seguimiento. Lo dispara el cron de Vercel (ver vercel.json) y también
// se puede ver a mano desde el área interna con ?dry=1 (no envía correos).

import { NextResponse, type NextRequest } from "next/server";
import { esAdmin, obtenerSesion } from "@/lib/auth";
import { listarClientes } from "@/lib/clientes-store";
import { brokersDeClerk } from "@/lib/directorio";
import { almacenamientoDisponible } from "@/lib/redis";
import { correoResumen, enviarCorreo, resumenPorBroker } from "@/lib/resumen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** El cron de Vercel manda `Authorization: Bearer CRON_SECRET`. */
function vieneDelCron(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  return !!secreto && req.headers.get("authorization") === `Bearer ${secreto}`;
}

/** Nombre y correo de cada broker, indexados por id de sesión. */
async function directorio(): Promise<Record<string, { nombre: string; email: string }>> {
  const brokers = await brokersDeClerk();
  return Object.fromEntries(brokers.map((u) => [u.id, { nombre: u.nombre, email: u.email }]));
}

export async function GET(req: NextRequest) {
  const soloVista = req.nextUrl.searchParams.get("dry") === "1";
  if (!vieneDelCron(req)) {
    // Fuera del cron, solo un administrador puede mirarlo, y sin enviar correos.
    const s = await obtenerSesion(req);
    if (!esAdmin(s)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!soloVista) return NextResponse.json({ error: "Usa ?dry=1 para la vista previa" }, { status: 400 });
  }
  if (!almacenamientoDisponible()) {
    return NextResponse.json({ error: "Sin almacenamiento conectado" }, { status: 503 });
  }

  const base = process.env.NEXT_PUBLIC_SITIO ?? `https://${req.headers.get("host") ?? "localhost:3000"}`;
  const resumenes = resumenPorBroker(await listarClientes(), await directorio());
  const conTrabajo = resumenes.filter((r) => !r.vacio);

  const envios = soloVista
    ? []
    : await Promise.all(
        conTrabajo.map(async (r) => {
          if (!r.email) return { broker: r.nombre, estado: "sin correo" };
          const { asunto, html } = correoResumen(r, base);
          return { broker: r.nombre, estado: await enviarCorreo(r.email, asunto, html) };
        }),
      );

  return NextResponse.json({
    fecha: new Date().toISOString().slice(0, 10),
    brokers: resumenes.map((r) => ({
      nombre: r.nombre,
      email: r.email,
      atrasados: r.atrasados.length,
      hoy: r.hoy.length,
      estancados: r.estancados.length,
    })),
    ...(soloVista ? { detalle: conTrabajo } : { envios }),
  });
}
