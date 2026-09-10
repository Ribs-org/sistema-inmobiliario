import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import { calcularCaminatas } from "@/lib/caminatas";
import {
  eliminarProyecto,
  guardarProyecto,
  guardarProyectos,
  listarProyectos,
  listarProyectosGuardados,
  normalizarProyecto,
  proyectosMuestra,
} from "@/lib/proyectos-store";
import { almacenamientoDisponible } from "@/lib/redis";

export const dynamic = "force-dynamic";

const autorizado = (req: NextRequest) => sesionValida(req.cookies.get(COOKIE_SESION)?.value);
const noAutorizado = () => NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
const sinAlmacenamiento = () => NextResponse.json({ error: "Sin almacenamiento conectado" }, { status: 503 });

/** Público: la lista que ve el mapa. */
export async function GET() {
  const { proyectos, origen } = await listarProyectos();
  return NextResponse.json({ proyectos, origen }, { headers: { "cache-control": "no-store" } });
}

/** Interno: crear o actualizar. Con {importarMuestra: true} copia los proyectos de ejemplo a Redis. */
export async function POST(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.importarMuestra) {
    const lista = await guardarProyectos(proyectosMuestra());
    return NextResponse.json({ proyectos: lista, origen: "redis" });
  }

  const proyecto = normalizarProyecto(body);
  if (!proyecto) {
    return NextResponse.json(
      { error: "El proyecto necesita nombre, ubicación y al menos una tipología con precio y m²" },
      { status: 400 },
    );
  }
  // Caminatas: se reutilizan si la ubicación no cambió; si cambió, se recalculan.
  const previo = (await listarProyectosGuardados()).find((x) => x.id === proyecto.id);
  const mismaUbicacion = previo && previo.lat === proyecto.lat && previo.lng === proyecto.lng;
  proyecto.caminatas = await calcularCaminatas(proyecto, mismaUbicacion ? (previo.caminatas ?? {}) : {});

  const lista = await guardarProyecto(proyecto);
  return NextResponse.json({ proyectos: lista, origen: "redis", guardado: proyecto });
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  const lista = await eliminarProyecto(id);
  return NextResponse.json({ proyectos: lista, origen: lista.length ? "redis" : "muestra" });
}
