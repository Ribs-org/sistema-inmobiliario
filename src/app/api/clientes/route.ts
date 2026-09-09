import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import { normalizarCliente } from "@/lib/clientes";
import {
  almacenamientoDisponible,
  eliminarCliente,
  guardarCliente,
  listarClientes,
} from "@/lib/clientes-store";

function noAutorizado() {
  return NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
}

function autorizado(req: NextRequest) {
  return sesionValida(req.cookies.get(COOKIE_SESION)?.value);
}

function sinAlmacenamiento() {
  return NextResponse.json(
    { error: "Sin almacenamiento conectado", almacenamiento: "ninguno" },
    { status: 503 },
  );
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) {
    return NextResponse.json({ clientes: [], almacenamiento: "ninguno" });
  }
  return NextResponse.json({ clientes: await listarClientes(), almacenamiento: "redis" });
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const cliente = normalizarCliente(await req.json().catch(() => null));
  if (!cliente)
    return NextResponse.json({ error: "El cliente necesita al menos un nombre" }, { status: 400 });
  return NextResponse.json({ clientes: await guardarCliente(cliente), almacenamiento: "redis" });
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  return NextResponse.json({ clientes: await eliminarCliente(id), almacenamiento: "redis" });
}
