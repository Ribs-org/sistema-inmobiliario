// Lista de vendedores (para reasignar clientes y filtrar el embudo). Solo admin.

import { NextResponse, type NextRequest } from "next/server";
import { clerkActivo, esAdmin, ID_ADMIN_LEGADO, obtenerSesion } from "@/lib/auth";
import { brokersDeClerk, type Usuario } from "@/lib/directorio";

export const dynamic = "force-dynamic";

export type { Usuario };

export async function GET(req: NextRequest) {
  const s = await obtenerSesion(req);
  if (!s) return NextResponse.json({ error: "Necesitas iniciar sesión" }, { status: 401 });
  if (!esAdmin(s))
    return NextResponse.json({ usuarios: [{ id: s.id, nombre: s.nombre, email: s.email, rol: s.rol }] });

  const usuarios: Usuario[] = [
    { id: ID_ADMIN_LEGADO, nombre: "Administración (clave de equipo)", email: "", rol: "admin" },
    ...(await brokersDeClerk()),
  ];
  return NextResponse.json({ usuarios, clerk: clerkActivo() });
}
