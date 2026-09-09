"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { ETIQUETA_ESTADO, LINEAS, type EstacionConLinea } from "@/data/metro";
import type { ProyectoEnriquecido } from "@/lib/proyectos";
import { fmtUF } from "@/lib/format";
import { RADIO_CAMINABLE_M } from "@/lib/geo";

export type CapasMapa = {
  operativas: boolean;
  futuras: boolean;
  lineasOcultas: string[];
  radio: boolean;
  base: "gris" | "calles";
};

export type Enfoque = { lat: number; lng: number; zoom?: number; key: number };

type Props = {
  proyectos: ProyectoEnriquecido[];
  seleccionadoId: string | null;
  onSeleccionarProyecto: (id: string) => void;
  estacionSeleccionada: EstacionConLinea | null;
  onSeleccionarEstacion: (e: EstacionConLinea) => void;
  resaltados: Set<string>;
  capas: CapasMapa;
  enfoque: Enfoque | null;
};

const CENTRO: [number, number] = [-33.463, -70.63];

function ControlEnfoque({ enfoque }: { enfoque: Enfoque | null }) {
  const map = useMap();
  useEffect(() => {
    if (!enfoque) return;
    map.flyTo([enfoque.lat, enfoque.lng], enfoque.zoom ?? Math.max(map.getZoom(), 14), {
      duration: 0.7,
    });
    // Solo reaccionar a un nuevo pedido de enfoque (key), no a cambios de mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enfoque?.key]);
  return null;
}

function iconoProyecto(p: ProyectoEnriquecido, sel: boolean, hl: boolean, dim: boolean) {
  const clases = ["pin", sel && "pin--sel", hl && !sel && "pin--hl", dim && !sel && !hl && "pin--dim"]
    .filter(Boolean)
    .join(" ");
  return L.divIcon({
    className: clases,
    html: `<span class="pin__pill">${fmtUF(p.precioMinUF)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function Mapa({
  proyectos,
  seleccionadoId,
  onSeleccionarProyecto,
  estacionSeleccionada,
  onSeleccionarEstacion,
  resaltados,
  capas,
  enfoque,
}: Props) {
  const lineasVisibles = useMemo(
    () =>
      LINEAS.filter((l) => {
        if (capas.lineasOcultas.includes(l.id)) return false;
        return l.estado === "operativa" ? capas.operativas : capas.futuras;
      }),
    [capas],
  );

  const hayEstacion = !!estacionSeleccionada;

  return (
    <MapContainer
      center={CENTRO}
      zoom={12}
      minZoom={10}
      maxZoom={17}
      zoomControl={false}
      className="h-full w-full"
      maxBounds={[
        [-33.75, -70.95],
        [-33.25, -70.4],
      ]}
      maxBoundsViscosity={0.6}
    >
      {capas.base === "calles" ? (
        <TileLayer
          key="calles"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Metro: coordenadas aproximadas'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
        />
      ) : (
        <>
          <TileLayer
            key="gris"
            attribution="Tiles &copy; Esri · Metro: coordenadas aproximadas"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={16}
          />
          <Pane name="etiquetas" style={{ zIndex: 450, pointerEvents: "none" }}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={16}
              opacity={0.9}
            />
          </Pane>
        </>
      )}

      <ControlEnfoque enfoque={enfoque} />

      {/* Halo blanco bajo las líneas operativas para separarlas del mapa */}
      {lineasVisibles
        .filter((l) => l.estado === "operativa")
        .map((l) => (
          <Polyline
            key={`halo-${l.id}`}
            positions={l.estaciones.map((s) => [s.lat, s.lng] as [number, number])}
            pathOptions={{ color: "#fff", weight: 8, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
            interactive={false}
          />
        ))}

      {lineasVisibles.map((l) => {
        const futura = l.estado !== "operativa";
        return (
          <Polyline
            key={l.id}
            positions={l.estaciones.map((s) => [s.lat, s.lng] as [number, number])}
            pathOptions={{
              color: l.color,
              weight: futura ? 4 : 5,
              opacity: futura ? 0.85 : 0.95,
              dashArray: futura ? "10 9" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
            interactive={false}
          />
        );
      })}

      {estacionSeleccionada && capas.radio && (
        <Circle
          center={[estacionSeleccionada.lat, estacionSeleccionada.lng]}
          radius={RADIO_CAMINABLE_M}
          pathOptions={{
            color: estacionSeleccionada.color,
            weight: 1.5,
            dashArray: "4 5",
            fillColor: estacionSeleccionada.color,
            fillOpacity: 0.08,
          }}
          interactive={false}
        />
      )}

      {lineasVisibles.map((l) =>
        l.estaciones.map((s) => {
          const estacion: EstacionConLinea = {
            ...s,
            lineaId: l.id,
            lineaNombre: l.nombre,
            color: l.color,
            estado: l.estado,
            apertura: l.apertura,
          };
          const futura = l.estado !== "operativa";
          const sel = estacionSeleccionada?.nombre === s.nombre && estacionSeleccionada.lineaId === l.id;
          const combinacion = !!s.combina?.length;
          return (
            <CircleMarker
              key={`${l.id}-${s.nombre}`}
              center={[s.lat, s.lng]}
              radius={sel ? 8 : combinacion ? 5.5 : 4}
              pathOptions={{
                color: l.color,
                weight: sel ? 3 : 2,
                fillColor: sel ? l.color : "#fff",
                fillOpacity: 1,
                dashArray: futura && !sel ? "2 2" : undefined,
              }}
              eventHandlers={{ click: () => onSeleccionarEstacion(estacion) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <strong>{s.nombre}</strong>{" "}
                <span className="lt-line">
                  {l.nombre}
                  {futura ? ` · ${ETIQUETA_ESTADO[l.estado].toLowerCase()} ${l.apertura ?? ""}` : ""}
                </span>
              </Tooltip>
            </CircleMarker>
          );
        }),
      )}

      {proyectos.map((p) => {
        const sel = p.id === seleccionadoId;
        const hl = resaltados.has(p.id);
        const dim = hayEstacion && !hl;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={iconoProyecto(p, sel, hl, dim)}
            zIndexOffset={sel ? 1000 : hl ? 500 : 0}
            eventHandlers={{ click: () => onSeleccionarProyecto(p.id) }}
          >
            <Tooltip direction="top" offset={[0, -34]}>
              <strong>{p.nombre}</strong> <span className="lt-line">{p.comuna}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
