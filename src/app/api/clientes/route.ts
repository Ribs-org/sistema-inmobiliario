import { NextResponse, type NextRequest } from "next/server";
import { esAdmin, obtenerSesion, puedeVer, type Sesion } from "@/lib/auth";
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
import { disponiblesDeTipologia, tieneUnidades } from "@/lib/unidades";

export const dynamic = "force-dynamic";

const noAutorizado = () => NextResponse.json({ error: "Necesitas iniciar sesión" }, { status: 401 });
const prohibido = () => NextResponse.json({ error: "Ese cliente es de otro broker" }, { status: 403 });
const sinAlmacenamiento = () =>
  NextResponse.json({ error: "Sin almacenamiento conectado", almacenamiento: "ninguno" }, { status: 503 });

/**
 * Stock: al entrar a reserva/promesa/escritura se descuenta una unidad de la tipología del
 * cliente; al salir de esas etapas (perdido o retroceso) se devuelve. Solo sobre proyectos guardados.
 */
async function ajustarStock(cliente: Cliente, previo: Cliente | undefined): Promise<Cliente> {
  const reservadoAntes = !!previo && ETAPAS_RESERVA.includes(previo.etapa);
  const reservadoAhora = ETAPAS_RESERVA.includes(cliente.etapa);
  const cambioUnidad = reservadoAhora && previo?.unidadNumero !== cliente.unidadNumero;
  if (reservadoAntes === reservadoAhora && !cambioUnidad) return cliente;
  if (!cliente.proyectoId || !cliente.tipologiaId) return cliente;
  const proyecto = (await listarProyectosGuardados()).find((p) => p.id === cliente.proyectoId);
  const tip = proyecto?.tipologias.find((t) => t.id === cliente.tipologiaId);
  if (!proyecto || !tip) return cliente;

  const notas: string[] = [];
  if (tieneUnidades(proyecto)) {
    // Con detalle de unidades: se marca la unidad concreta y se libera la anterior.
    const liberar = (numero: string | null | undefined) => {
      const u = proyecto.unidadesDetalle!.find((x) => x.numero === numero && x.clienteId === cliente.id);
      if (!u) return;
      u.estado = "disponible";
      u.clienteId = null;
      notas.push(`se libera la unidad ${u.numero}`);
    };
    if (!reservadoAhora || cambioUnidad) liberar(previo?.unidadNumero);
    if (reservadoAhora && cliente.unidadNumero) {
      const u = proyecto.unidadesDetalle!.find((x) => x.numero === cliente.unidadNumero);
      if (u && (u.estado === "disponible" || u.clienteId === cliente.id)) {
        u.estado = cliente.etapa === "escritura" ? "vendida" : "reservada";
        u.clienteId = cliente.id;
        notas.push(`${u.numero} queda ${u.estado}`);
      }
    }
  } else if (reservadoAntes !== reservadoAhora) {
    // Sin detalle: se mueve el contador de la tipología.
    tip.disponibles = Math.max(0, tip.disponibles + (reservadoAhora ? -1 : 1));
    notas.push(`${reservadoAhora ? "reserva" : "se libera"} ${tip.nombre}`);
  }
  if (notas.length === 0) return cliente;
  await guardarProyecto(proyecto);

  return {
    ...cliente,
    interacciones: [
      nuevaInteraccion({
        tipo: "stock",
        texto: `${proyecto.nombre}: ${notas.join(", ")}. Quedan ${disponiblesDeTipologia(proyecto, tip)} ${tip.nombre} disponibles`,
      }),
      ...cliente.interacciones,
    ],
  };
}

/** El admin ve todo; un broker ve lo suyo y lo que no tiene dueño. */
const visibles = (lista: Cliente[], s: Sesion) => lista.filter((c) => puedeVer(s, c.vendedorId));

export async function GET(req: NextRequest) {
  const s = await obtenerSesion(req);
  if (!s) return noAutorizado();
  if (!almacenamientoDisponible()) {
    return NextResponse.json({ clientes: [], almacenamiento: "ninguno", sesion: s });
  }
  return NextResponse.json({
    clientes: visibles(await listarClientes(), s),
    almacenamiento: "redis",
    sesion: s,
  });
}

export async function POST(req: NextRequest) {
  const s = await obtenerSesion(req);
  if (!s) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const recibido = normalizarCliente(await req.json().catch(() => null));
  if (!recibido)
    return NextResponse.json({ error: "El cliente necesita al menos un nombre" }, { status: 400 });

  const todos = await listarClientes();
  const previo = todos.find((c) => c.id === recibido.id);
  if (previo && !puedeVer(s, previo.vendedorId)) return prohibido();

  // El vendedor solo lo puede cambiar el admin; un broker siempre queda como dueño de lo suyo.
  const vendedorId = esAdmin(s)
    ? (recibido.vendedorId ?? previo?.vendedorId ?? null)
    : (previo?.vendedorId ?? s.id);
  const vendedorNombre = esAdmin(s)
    ? recibido.vendedorNombre || previo?.vendedorNombre || ""
    : (previo?.vendedorNombre ?? s.nombre);

  const cliente = await ajustarStock(
    reconciliarCliente({ ...recibido, vendedorId, vendedorNombre }, previo),
    previo,
  );
  return NextResponse.json({
    clientes: visibles(await guardarCliente(cliente), s),
    almacenamiento: "redis",
    sesion: s,
  });
}

export async function DELETE(req: NextRequest) {
  const s = await obtenerSesion(req);
  if (!s) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  const previo = (await listarClientes()).find((c) => c.id === id);
  if (previo && !puedeVer(s, previo.vendedorId)) return prohibido();
  return NextResponse.json({
    clientes: visibles(await eliminarCliente(id), s),
    almacenamiento: "redis",
    sesion: s,
  });
}
