// Valor UF del día desde mindicador.cl (sin API key). Se cachea 1 hora.

export const revalidate = 3600;

import { UF_RESPALDO } from "@/lib/uf";

export async function GET() {
  try {
    const r = await fetch("https://mindicador.cl/api/uf", { next: { revalidate: 3600 } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { serie?: { fecha: string; valor: number }[] };
    const hoy = j.serie?.[0];
    if (!hoy || typeof hoy.valor !== "number") throw new Error("Respuesta sin serie");
    return Response.json({ valor: hoy.valor, fecha: hoy.fecha, fuente: "mindicador.cl" });
  } catch (err) {
    return Response.json(
      { valor: UF_RESPALDO, fecha: null, fuente: "respaldo", error: String(err) },
      { status: 200 },
    );
  }
}
