// Directorio de brokers. Sale de Clerk cuando está configurado; si no, queda solo la
// sesión por clave de equipo. Lo usan la API de usuarios y el resumen diario.

import { clerkActivo, rolDe, type Rol } from "./auth";

export type Usuario = { id: string; nombre: string; email: string; rol: Rol };

/** Brokers registrados en Clerk. [] si Clerk no está activo o la consulta falla. */
export async function brokersDeClerk(): Promise<Usuario[]> {
  if (!clerkActivo()) return [];
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ limit: 200, orderBy: "-created_at" });
    return data.map((u) => {
      const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
      return {
        id: u.id,
        nombre: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || email || u.id,
        email,
        rol: rolDe(email, u.publicMetadata?.role),
      };
    });
  } catch (err) {
    console.warn("No se pudo listar usuarios de Clerk:", err);
    return [];
  }
}
