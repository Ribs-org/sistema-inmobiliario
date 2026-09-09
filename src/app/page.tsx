"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ESTACIONES, type EstacionConLinea } from "@/data/metro";
import type { Tipologia } from "@/data/proyectos";
import { dentroDeRadio, RADIO_CAMINABLE_M } from "@/lib/geo";
import { fmtCLP } from "@/lib/format";
import { aplicarFiltros, FILTROS_INICIALES, PROYECTOS_ENRIQUECIDOS, type Filtros } from "@/lib/proyectos";
import { UF_RESPALDO, type InfoUF } from "@/lib/uf";
import Analitica from "@/components/Analitica";
import FichaProyecto from "@/components/FichaProyecto";
import LeyendaMetro from "@/components/LeyendaMetro";
import Mapa from "@/components/MapaCliente";
import type { CapasMapa, Enfoque } from "@/components/Mapa";
import PanelProyectos from "@/components/PanelProyectos";
import Simulador, { type PresetSimulador } from "@/components/Simulador";
import TarjetaEstacion from "@/components/TarjetaEstacion";

type Pestana = "mapa" | "analisis" | "simulador";

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "mapa", nombre: "Mapa" },
  { id: "analisis", nombre: "Precio vs Metro" },
  { id: "simulador", nombre: "Simulador" },
];

const CAPAS_INICIALES: CapasMapa = {
  operativas: true,
  futuras: true,
  lineasOcultas: [],
  radio: true,
  base: "gris",
};

export default function Home() {
  const [pestana, setPestana] = useState<Pestana>("mapa");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [estacion, setEstacion] = useState<EstacionConLinea | null>(null);
  const [capas, setCapas] = useState<CapasMapa>(CAPAS_INICIALES);
  const [enfoque, setEnfoque] = useState<Enfoque | null>(null);
  const [infoUF, setInfoUF] = useState<InfoUF>({
    valor: UF_RESPALDO,
    fecha: null,
    fuente: "respaldo",
  });
  const [preset, setPreset] = useState<PresetSimulador | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/uf")
      .then((r) => r.json())
      .then((j: InfoUF) => {
        if (vivo && j && typeof j.valor === "number") setInfoUF(j);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Enlaces compartibles: ?p=<proyecto>&e=<línea>:<estación>&tab=<pestaña>
  const urlLeida = useRef(false);
  useEffect(() => {
    // Se lee la URL en una microtarea para no cambiar estado de forma síncrona dentro del efecto.
    queueMicrotask(() => {
      const q = new URLSearchParams(window.location.search);
      const p = q.get("p");
      const e = q.get("e");
      const tab = q.get("tab") as Pestana | null;
      if (p && PROYECTOS_ENRIQUECIDOS.some((x) => x.id === p)) setSeleccionadoId(p);
      if (e) {
        const [lineaId, nombre] = e.split(":");
        const est = ESTACIONES.find((s) => s.lineaId === lineaId && s.nombre === nombre);
        if (est) setEstacion(est);
      }
      if (tab && PESTANAS.some((t) => t.id === tab)) setPestana(tab);
      urlLeida.current = true;
    });
  }, []);

  useEffect(() => {
    if (!urlLeida.current) return;
    const q = new URLSearchParams();
    if (seleccionadoId) q.set("p", seleccionadoId);
    if (estacion) q.set("e", `${estacion.lineaId}:${estacion.nombre}`);
    if (pestana !== "mapa") q.set("tab", pestana);
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [seleccionadoId, estacion, pestana]);

  const filtrados = useMemo(() => aplicarFiltros(PROYECTOS_ENRIQUECIDOS, filtros), [filtros]);
  const seleccionado = useMemo(
    () => PROYECTOS_ENRIQUECIDOS.find((p) => p.id === seleccionadoId) ?? null,
    [seleccionadoId],
  );
  const cercanos = useMemo(
    () => (estacion ? dentroDeRadio(estacion, filtrados, RADIO_CAMINABLE_M) : []),
    [estacion, filtrados],
  );
  const resaltados = useMemo(() => new Set(cercanos.map((c) => c.item.id)), [cercanos]);

  const enfocar = (lat: number, lng: number, zoom?: number) =>
    setEnfoque({ lat, lng, zoom, key: Date.now() });

  const seleccionarProyecto = (id: string) => {
    setSeleccionadoId(id);
    setPestana("mapa");
    const p = PROYECTOS_ENRIQUECIDOS.find((x) => x.id === id);
    if (p) enfocar(p.lat, p.lng, 15);
  };

  const seleccionarEstacion = (e: EstacionConLinea) => {
    setEstacion(e);
    setPestana("mapa");
    enfocar(e.lat, e.lng, 15);
  };

  const simular = (t: Tipologia) => {
    if (!seleccionado) return;
    setPreset({
      id: `${seleccionado.id}-${t.id}-${Date.now()}`,
      etiqueta: `${seleccionado.nombre} · ${t.nombre}`,
      precioUF: t.precioUF,
      piePct: seleccionado.pieMinimoPct,
      bonoPiePct: seleccionado.bonoPiePct ?? 0,
      pieEnCuotas: !!seleccionado.pieEnCuotas,
    });
    setPestana("simulador");
  };

  const cambiarUF = (v: number) => setInfoUF({ valor: v, fecha: null, fuente: "manual" });

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4">
        <div className="flex items-baseline gap-2">
          <span className="display text-lg font-bold tracking-tight">Ribs</span>
          <span className="hidden text-sm text-ink-muted sm:inline">Proyectos y Metro · Santiago</span>
        </div>
        <nav
          className="flex min-w-0 shrink gap-1 overflow-x-auto rounded-md bg-fondo p-0.5"
          aria-label="Secciones"
        >
          {PESTANAS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPestana(t.id)}
              aria-current={pestana === t.id ? "page" : undefined}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                pestana === t.id ? "bg-panel text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </nav>
        <div className="hidden text-right text-xs sm:block" title={`Fuente: ${infoUF.fuente}`}>
          <span className="text-ink-muted">UF hoy </span>
          <span className="font-semibold">{fmtCLP(infoUF.valor)}</span>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col-reverse md:flex-row">
        <aside className="h-[45vh] min-w-0 shrink-0 border-t border-line bg-panel md:h-auto md:w-[380px] md:border-r md:border-t-0">
          {seleccionado ? (
            <FichaProyecto
              key={seleccionado.id}
              proyecto={seleccionado}
              valorUF={infoUF.valor}
              onVolver={() => setSeleccionadoId(null)}
              onVerEnMapa={() => {
                setPestana("mapa");
                enfocar(seleccionado.lat, seleccionado.lng, 15);
              }}
              onSimular={simular}
              onSeleccionarEstacion={seleccionarEstacion}
            />
          ) : (
            <PanelProyectos
              proyectos={filtrados}
              total={PROYECTOS_ENRIQUECIDOS.length}
              filtros={filtros}
              onFiltros={setFiltros}
              seleccionadoId={seleccionadoId}
              onSeleccionar={seleccionarProyecto}
              resaltados={resaltados}
              valorUF={infoUF.valor}
            />
          )}
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1">
          <div className="absolute inset-0 isolate z-0">
            <Mapa
              proyectos={filtrados}
              seleccionadoId={seleccionadoId}
              onSeleccionarProyecto={seleccionarProyecto}
              estacionSeleccionada={estacion}
              onSeleccionarEstacion={seleccionarEstacion}
              resaltados={resaltados}
              capas={capas}
              enfoque={enfoque}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
            <div className="flex items-start justify-end">
              {estacion && (
                <div className="pointer-events-auto">
                  <TarjetaEstacion
                    estacion={estacion}
                    cercanos={cercanos}
                    radioM={RADIO_CAMINABLE_M}
                    onCerrar={() => setEstacion(null)}
                    onSeleccionarProyecto={seleccionarProyecto}
                  />
                </div>
              )}
            </div>
            <div className="hidden items-end justify-between sm:flex">
              <div className="pointer-events-auto">
                <LeyendaMetro capas={capas} onCapas={setCapas} />
              </div>
            </div>
          </div>

          {pestana !== "mapa" && (
            <div className="absolute inset-0 z-20 bg-fondo">
              {pestana === "analisis" ? (
                <Analitica
                  proyectos={filtrados}
                  seleccionadoId={seleccionadoId}
                  onSeleccionar={seleccionarProyecto}
                />
              ) : (
                <Simulador
                  key={preset?.id ?? "libre"}
                  valorUF={infoUF.valor}
                  infoUF={infoUF}
                  onCambiarUF={cambiarUF}
                  preset={preset}
                  onQuitarPreset={() => setPreset(null)}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
