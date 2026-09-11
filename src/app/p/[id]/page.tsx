import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VistaProyecto from "@/components/VistaProyecto";
import { enriquecer } from "@/lib/proyectos";
import { listarProyectos } from "@/lib/proyectos-store";
import { obtenerTasa } from "@/lib/tasa";
import { UF_RESPALDO } from "@/lib/uf";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function valorUFActual(): Promise<number> {
  try {
    const r = await fetch("https://mindicador.cl/api/uf", { next: { revalidate: 3600 } });
    const j = (await r.json()) as { serie?: { valor: number }[] };
    return j.serie?.[0]?.valor ?? UF_RESPALDO;
  } catch {
    return UF_RESPALDO;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { proyectos } = await listarProyectos();
  const p = proyectos.find((x) => x.id === id);
  return {
    title: p ? `${p.nombre} · Pyxis` : "Proyecto no encontrado · Pyxis",
    description: p ? `${p.direccion}, ${p.comuna}. ${p.descripcion}` : undefined,
    openGraph: p?.imagenes?.[0] ? { images: [p.imagenes[0]] } : undefined,
  };
}

export default async function PaginaProyecto({ params }: Props) {
  const { id } = await params;
  const { proyectos } = await listarProyectos();
  const p = proyectos.find((x) => x.id === id);
  if (!p) notFound();
  const [valorUF, tasa] = await Promise.all([valorUFActual(), obtenerTasa()]);
  const contacto = process.env.NEXT_PUBLIC_CONTACTO ?? "Pyxis · equipo comercial";
  return (
    <VistaProyecto
      proyecto={enriquecer(p)}
      valorUF={valorUF}
      tasaAnualPct={tasa.valorPct}
      contacto={contacto}
    />
  );
}
