// Genera (o devuelve) el enlace privado del portal de un cliente. Solo con sesión interna:
// el token nunca se acepta desde una petición, así que esta es la única forma de crearlo.

import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion, puedeVer } from "@/lib/auth";
import { almacenamientoDisponible, guardarCliente, listarClientes } from "@/lib/clientes-store";
import { nuevoTokenPortal } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sesion = await obtenerSesion(req);
  if (!sesion) return NextResponse.json({ error: "Necesitas iniciar sesión" }, { status: 401 });
  if (!almacenamientoDisponible())
    return NextResponse.json({ error: "Sin almacenamiento conectado" }, { status: 503 });

  const { cliente: id, rotar } = ((await req.json().catch(() => ({}))) ?? {}) as {
    cliente?: string;
    rotar?: boolean;
  };
  const cliente = (await listarClientes()).find((c) => c.id === id);
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  if (!puedeVer(sesion, cliente.vendedorId))
    return NextResponse.json({ error: "Ese cliente es de otro broker" }, { status: 403 });

  // Rotar emite una llave nueva y deja muerta la anterior, por si el enlace llegó a quien no debía.
  const token = rotar || !cliente.tokenPortal ? nuevoTokenPortal() : cliente.tokenPortal;
  if (token !== cliente.tokenPortal) {
    await guardarCliente({ ...cliente, tokenPortal: token, actualizadoEn: new Date().toISOString() });
  }
  const host = req.headers.get("host") ?? "localhost:3000";
  const protocolo = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_SITIO ?? `${protocolo}://${host}`;
  return NextResponse.json({ url: `${base}/mi/${token}` });
}
