import { NextResponse, type NextRequest } from "next/server";
import type { Proyecto } from "@/data/proyectos";
import { esAdmin, obtenerSesion } from "@/lib/auth";
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

/** Editar el catálogo es solo del admin; los brokers lo leen desde el GET público. */
const autorizado = async (req: NextRequest) => esAdmin(await obtenerSesion(req));
const noAutorizado = () =>
  NextResponse.json({ error: "Solo un administrador puede editar proyectos" }, { status: 403 });
const sinAlmacenamiento = () => NextResponse.json({ error: "Sin almacenamiento conectado" }, { status: 503 });

/** Público: la lista que ve el mapa. */
export async function GET() {
  const { proyectos, origen } = await listarProyectos();
  return NextResponse.json({ proyectos, origen }, { headers: { "cache-control": "no-store" } });
}

/** Interno: crear o actualizar. Con {importarMuestra: true} copia los proyectos de ejemplo a Redis. */
export async function POST(req: NextRequest) {
  if (!(await autorizado(req))) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.importarMuestra) {
    const lista = await guardarProyectos(proyectosMuestra());
    return NextResponse.json({ proyectos: lista, origen: "redis" });
  }

  // Importación masiva: {importar: [...]} con proyectos en el formato de la plantilla.
  if (Array.isArray(body?.importar)) {
    const errores: string[] = [];
    const validos: Proyecto[] = [];
    const guardados = await listarProyectosGuardados();
    for (const [i, entrada] of (body.importar as unknown[]).slice(0, 100).entries()) {
      const p = normalizarProyecto(entrada);
      if (!p) {
        const nombre = (entrada as { nombre?: string })?.nombre ?? `fila ${i + 1}`;
        errores.push(`${nombre}: faltan nombre, ubicación o tipologías válidas`);
        continue;
      }
      const previo = guardados.find((x) => x.id === p.id);
      const misma = previo && previo.lat === p.lat && previo.lng === p.lng;
      p.caminatas = await calcularCaminatas(p, misma ? (previo.caminatas ?? {}) : {});
      if (previo) {
        p.imagenes = p.imagenes ?? previo.imagenes;
        p.tipologias = p.tipologias.map((t) => ({
          ...t,
          plano: t.plano ?? previo.tipologias.find((x) => x.id === t.id || x.nombre === t.nombre)?.plano,
        }));
      }
      validos.push(p);
    }
    const lista = validos.length ? await guardarProyectos(validos) : guardados;
    return NextResponse.json({
      proyectos: lista,
      origen: lista.length ? "redis" : "muestra",
      importados: validos.length,
      errores,
    });
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
  if (!(await autorizado(req))) return noAutorizado();
  if (!almacenamientoDisponible()) return sinAlmacenamiento();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  const lista = await eliminarProyecto(id);
  return NextResponse.json({ proyectos: lista, origen: lista.length ? "redis" : "muestra" });
}
