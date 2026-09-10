import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VistaCotizacion from "@/components/VistaCotizacion";
import { obtenerCotizacion } from "@/lib/cotizaciones-store";
import { enriquecer } from "@/lib/proyectos";
import { listarProyectos } from "@/lib/proyectos-store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  const c = await obtenerCotizacion(codigo);
  return {
    title: c ? `Cotización ${c.proyectoNombre} · Pyxis` : "Cotización no encontrada · Pyxis",
    robots: { index: false, follow: false },
  };
}

export default async function PaginaCotizacion({ params }: Props) {
  const { codigo } = await params;
  const cotizacion = await obtenerCotizacion(codigo);
  if (!cotizacion) notFound();
  const { proyectos } = await listarProyectos();
  const proyecto = proyectos.find((p) => p.id === cotizacion.proyectoId);
  const contacto = process.env.NEXT_PUBLIC_CONTACTO ?? "Pyxis · equipo comercial";
  return (
    <VistaCotizacion
      cotizacion={cotizacion}
      proyecto={proyecto ? enriquecer(proyecto) : null}
      contacto={contacto}
    />
  );
}
