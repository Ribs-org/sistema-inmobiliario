"use client";

// Mapa pequeño para ubicar un proyecto: pin arrastrable + clic para mover.
// Se importa dinámicamente (Leaflet necesita `window`).

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LINEAS_OPERATIVAS } from "@/data/metro";

type Props = {
  lat: number;
  lng: number;
  onMover: (lat: number, lng: number) => void;
};

const icono = L.divIcon({
  className: "pin",
  html: '<span class="pin__pill pin__pill--punto"></span>',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function Seguir({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.4 });
  }, [lat, lng, map]);
  return null;
}

function ClicParaMover({ onMover }: { onMover: Props["onMover"] }) {
  useMapEvents({
    click: (e) => onMover(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)),
  });
  return null;
}

export default function MiniMapa({ lat, lng, onMover }: Props) {
  const lineas = useMemo(() => LINEAS_OPERATIVAS, []);
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      zoomControl={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
      />
      {lineas.map((l) => (
        <Polyline
          key={l.id}
          positions={l.trazado ?? l.estaciones.map((s) => [s.lat, s.lng] as [number, number])}
          pathOptions={{ color: l.color, weight: 3, opacity: 0.8 }}
          interactive={false}
        />
      ))}
      <Marker
        position={[lat, lng]}
        icon={icono}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onMover(+p.lat.toFixed(6), +p.lng.toFixed(6));
          },
        }}
      />
      <ClicParaMover onMover={onMover} />
      <Seguir lat={lat} lng={lng} />
    </MapContainer>
  );
}
