import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import {
  ETAPAS_RESERVA,
  normalizarCliente,
  nuevaInteraccion,
  reconciliarCliente,
  type Cliente,
} from "@/lib/clientes";
import {
  almacenamientoDisponible,
  eliminarCliente,
  guardarCliente,
  listarClientes,
} from "@/lib/clientes-store";
import { guardarProyecto, listarProyectosGuardados } from "@/lib/proyectos-store";

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

/**
 * Stock: al entrar a reserva/promesa/escritura se descuenta una unidad de la tipología del
 * cliente; al salir de esas etapas (perdido o retroceso) se devuelve. Solo sobre proyectos guardados.
 */
async function ajustarStock(cliente: Cliente, previo: Cliente | undefined): Promise<Cliente> {
  const reservadoAntes = !!previo && ETAPAS_RESERVA.includes(previo.etapa);
  const reservadoAhora = ETAPAS_RESERVA.includes(cliente.etapa);
  if (reservadoAntes === reservadoAhora || !cliente.proyectoId || !cliente.tipologiaId) return cliente;
  const delta = reservadoAhora ? -1 : 1;
  const proyecto = (await listarProyectosGuardados()).find((p) => p.id === cliente.proyectoId);
  const tip = proyecto?.tipologias.find((t) => t.id === cliente.tipologiaId);
  if (!proyecto || !tip) return cliente;
  tip.disponibles = Math.max(0, tip.disponibles + delta);
  await guardarProyecto(proyecto);
  return {
    ...cliente,
    interacciones: [
      nuevaInteraccion({
        tipo: "stock",
        texto: `${delta < 0 ? "Reserva" : "Se libera"} ${tip.nombre} en ${proyecto.nombre}: quedan ${tip.disponibles} disponibles`,
      }),
      ...cliente.interacciones,
    ],
  };
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
  const recibido = normalizarCliente(await req.json().catch(() => null));
  if (!recibido)
    return NextResponse.json({ error: "El cliente necesita al menos un nombre" }, { status: 400 });
  const previo = (await listarClientes()).find((c) => c.id === recibido.id);
  const cliente = await ajustarStock(reconciliarCliente(recibido, previo), previo);
  return NextResponse.json({ clientes: await guardarCliente(cliente), almacenamiento: "redis" });
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  return NextResponse.json({ clientes: await eliminarCliente(id), almacenamiento: "redis" });
}
