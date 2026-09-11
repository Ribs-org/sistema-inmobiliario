// Sesión y roles del área interna.
//
// Dos mecanismos conviven:
// 1. Clerk (cuando existen sus llaves): cada broker entra con su cuenta. El rol viene de
//    ADMIN_EMAILS (correos separados por coma) o de publicMetadata.role en Clerk.
// 2. Clave de equipo (CLAVE_INTERNA): sesión "legado" con rol admin, para la transición y
//    para scripts. Se puede apagar borrando CLAVE_INTERNA... o dejándola solo para el admin.

import type { NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "./acceso";

export type Rol = "admin" | "broker";

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  /** "clerk" o "clave" */
  origen: "clerk" | "clave";
};

export const ID_ADMIN_LEGADO = "admin";

export function clerkActivo(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
}

export function correosAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Rol a partir del correo y de la metadata pública de Clerk. */
export function rolDe(email: string | null | undefined, metadataRole: unknown): Rol {
  if (email && correosAdmin().includes(email.toLowerCase())) return "admin";
  return metadataRole === "admin" ? "admin" : "broker";
}

function sesionLegado(req: NextRequest): Sesion | null {
  if (!sesionValida(req.cookies.get(COOKIE_SESION)?.value)) return null;
  return { id: ID_ADMIN_LEGADO, nombre: "Administración", email: "", rol: "admin", origen: "clave" };
}

async function sesionClerk(): Promise<Sesion | null> {
  if (!clerkActivo()) return null;
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const u = await currentUser();
    const email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? "";
    const nombre = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.username || email || "Broker";
    return { id: userId, nombre, email, rol: rolDe(email, u?.publicMetadata?.role), origen: "clerk" };
  } catch (err) {
    console.warn("Clerk no disponible:", err);
    return null;
  }
}

/** Sesión actual: Clerk primero; si no, la clave de equipo. null si no hay sesión. */
export async function obtenerSesion(req: NextRequest): Promise<Sesion | null> {
  return (await sesionClerk()) ?? sesionLegado(req);
}

export const esAdmin = (s: Sesion | null): boolean => !!s && s.rol === "admin";

/** Un broker solo ve lo suyo; el admin, todo. */
export function puedeVer(s: Sesion, vendedorId: string | null | undefined): boolean {
  return s.rol === "admin" || !vendedorId || vendedorId === s.id;
}
