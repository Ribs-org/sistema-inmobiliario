// Inicio de sesión de brokers con Clerk. Si Clerk no está configurado, manda al área interna
// (que pedirá la clave de equipo).

import { redirect } from "next/navigation";
import Marca from "@/components/Marca";
import IngresoClerk from "@/components/IngresoClerk";

export const dynamic = "force-dynamic";

export default function Ingresar() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/interno");
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-negro p-6">
      <Marca tamano="lg" />
      <IngresoClerk />
      <p className="text-xs text-white/50">Acceso para el equipo comercial de Broker Capital.</p>
    </div>
  );
}
