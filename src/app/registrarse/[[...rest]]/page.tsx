// Alta de brokers con Clerk. Sin Clerk configurado no hay cuentas que crear, así que
// manda al área interna, que pedirá la clave de equipo.

import { redirect } from "next/navigation";
import Marca from "@/components/Marca";
import RegistroClerk from "@/components/RegistroClerk";

export const dynamic = "force-dynamic";

export default function Registrarse() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/interno");
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-negro p-6">
      <Marca tamano="lg" />
      <RegistroClerk />
      <p className="text-xs text-white/50">Acceso para el equipo comercial de Broker Capital.</p>
    </div>
  );
}
