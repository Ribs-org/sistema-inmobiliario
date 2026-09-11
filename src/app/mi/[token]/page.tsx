import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalCliente from "@/components/PortalCliente";
import { listarClientes } from "@/lib/clientes-store";
import { porToken, vistaPortal } from "@/lib/portal";
import { listarProyectos } from "@/lib/proyectos-store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Tus documentos · Pyxis",
  // El enlace es privado: no debe llegar a ningún buscador.
  robots: { index: false, follow: false },
};

export default async function PaginaPortal({ params }: Props) {
  const { token } = await params;
  const cliente = porToken(await listarClientes(), token);
  if (!cliente) notFound();
  const { proyectos } = await listarProyectos();
  return (
    <PortalCliente
      token={token}
      inicial={vistaPortal(
        cliente,
        proyectos.find((p) => p.id === cliente.proyectoId),
      )}
      contacto={process.env.NEXT_PUBLIC_CONTACTO ?? "Pyxis · equipo comercial"}
    />
  );
}
