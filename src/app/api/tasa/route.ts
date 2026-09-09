// Tasa hipotecaria de referencia (Banco Central de Chile). Se cachea 24 h.

import { obtenerTasa } from "@/lib/tasa";

export const revalidate = 86400;

export async function GET() {
  return Response.json(await obtenerTasa());
}
