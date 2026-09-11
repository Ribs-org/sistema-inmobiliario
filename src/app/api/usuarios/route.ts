// Lista de vendedores (para reasignar clientes y filtrar el embudo). Solo admin.

import { NextResponse, type NextRequest } from "next/server";
import { clerkActivo, esAdmin, ID_ADMIN_LEGADO, obtenerSesion, rolDe } from "@/lib/auth";

export const dynamic = "force-dynamic";

export type Usuario = { id: string; nombre: string; email: string; rol: "admin" | "broker" };

export async function GET(req: NextRequest) {
  const s = await obtenerSesion(req);
  if (!s) return NextResponse.json({ error: "Necesitas iniciar sesión" }, { status: 401 });
  if (!esAdmin(s))
    return NextResponse.json({ usuarios: [{ id: s.id, nombre: s.nombre, email: s.email, rol: s.rol }] });

  const usuarios: Usuario[] = [
    { id: ID_ADMIN_LEGADO, nombre: "Administración (clave de equipo)", email: "", rol: "admin" },
  ];
  if (clerkActivo()) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const lista = await client.users.getUserList({ limit: 200, orderBy: "-created_at" });
      for (const u of lista.data) {
        const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
        usuarios.push({
          id: u.id,
          nombre: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || email || u.id,
          email,
          rol: rolDe(email, u.publicMetadata?.role),
        });
      }
    } catch (err) {
      console.warn("No se pudo listar usuarios de Clerk:", err);
    }
  }
  return NextResponse.json({ usuarios, clerk: clerkActivo() });
}
