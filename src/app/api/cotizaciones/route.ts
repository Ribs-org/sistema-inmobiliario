import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import {
  DIAS_VIGENCIA,
  eliminarCotizacion,
  generarCodigo,
  guardarCotizacion,
  listarCotizaciones,
  normalizarParametros,
  type Cotizacion,
} from "@/lib/cotizaciones-store";
import { listarProyectos } from "@/lib/proyectos-store";
import { almacenamientoDisponible } from "@/lib/redis";

export const dynamic = "force-dynamic";

const autorizado = (req: NextRequest) => sesionValida(req.cookies.get(COOKIE_SESION)?.value);
const noAutorizado = () => NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Interno: lista de cotizaciones, opcionalmente de un cliente (?cliente=id). */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  const clienteId = req.nextUrl.searchParams.get("cliente");
  const todas = await listarCotizaciones();
  const lista = clienteId ? todas.filter((c) => c.clienteId === clienteId) : todas;
  return NextResponse.json({
    cotizaciones: lista.sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)),
  });
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  if (!almacenamientoDisponible()) {
    return NextResponse.json({ error: "Sin almacenamiento conectado" }, { status: 503 });
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const parametros = normalizarParametros(b?.parametros);
  const proyectoId = texto(b?.proyectoId, 60);
  const clienteNombre = texto(b?.clienteNombre, 120);
  if (!parametros || !proyectoId || !clienteNombre) {
    return NextResponse.json({ error: "Faltan proyecto, cliente o parámetros" }, { status: 400 });
  }
  const { proyectos } = await listarProyectos();
  const proyecto = proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const tipologiaId = texto(b?.tipologiaId, 10) || null;
  const tipologia = proyecto.tipologias.find((t) => t.id === tipologiaId) ?? null;

  const dias = Math.min(90, Math.max(1, Number(b?.diasVigencia) || DIAS_VIGENCIA));
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + dias * 86400000);
  const c: Cotizacion = {
    codigo: generarCodigo(),
    proyectoId,
    tipologiaId: tipologia?.id ?? null,
    proyectoNombre: proyecto.nombre,
    tipologiaNombre: tipologia?.nombre ?? null,
    clienteId: texto(b?.clienteId, 40) || null,
    clienteNombre,
    clienteEmail: texto(b?.clienteEmail, 120),
    parametros,
    nota: texto(b?.nota, 500),
    creadaEn: ahora.toISOString(),
    validaHasta: hasta.toISOString().slice(0, 10),
  };
  await guardarCotizacion(c);
  return NextResponse.json({ cotizacion: c, url: `/c/${c.codigo}` });
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return noAutorizado();
  const codigo = req.nextUrl.searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  await eliminarCotizacion(codigo);
  return NextResponse.json({ ok: true });
}
