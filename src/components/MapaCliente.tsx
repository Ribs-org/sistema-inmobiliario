"use client";

// Carga Leaflet solo en el navegador: el módulo "leaflet" toca `window` al evaluarse,
// así que el import dinámico ocurre dentro de un efecto y nunca durante el prerender.

import { useEffect, useState, type ComponentProps, type ComponentType } from "react";
import type Mapa from "./Mapa";

type Props = ComponentProps<typeof Mapa>;

export default function MapaCliente(props: Props) {
  const [Componente, setComponente] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    let vivo = true;
    import("./Mapa").then((m) => {
      if (vivo) setComponente(() => m.default);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!Componente) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">Cargando mapa…</div>
    );
  }
  return <Componente {...props} />;
}
