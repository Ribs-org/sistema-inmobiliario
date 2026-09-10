// Distancias caminando por calle (Valhalla, servidor público de OSM, perfil peatón).
// Se calculan para las estaciones más cercanas en línea recta a un punto.

import { claveEstacion, ESTACIONES } from "@/data/metro";
import { distanciaM, type Punto } from "./geo";

const VALHALLA = "https://valhalla1.openstreetmap.de/route";
const CANDIDATAS_OPERATIVAS = 4;
const CANDIDATAS_FUTURAS = 3;

export type Caminatas = Record<string, { metros: number; rectaM?: number }>;

export async function rutaPeatonM(desde: Punto, hasta: Punto): Promise<number> {
  const json = JSON.stringify({
    locations: [
      { lat: desde.lat, lon: desde.lng },
      { lat: hasta.lat, lon: hasta.lng },
    ],
    costing: "pedestrian",
    units: "kilometers",
  });
  const r = await fetch(`${VALHALLA}?json=${encodeURIComponent(json)}`, {
    headers: { "user-agent": "pyxis-inmobiliario/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`Valhalla HTTP ${r.status}`);
  const j = (await r.json()) as { trip?: { summary?: { length?: number } } };
  const km = j.trip?.summary?.length;
  if (typeof km !== "number") throw new Error("Valhalla sin ruta");
  return Math.round(km * 1000);
}

/** Estaciones candidatas (las más cercanas en línea recta, operativas y futuras). */
export function estacionesCandidatas(p: Punto) {
  const ordenar = (futuras: boolean) =>
    ESTACIONES.filter((s) => (futuras ? s.estado !== "operativa" : s.estado === "operativa"))
      .map((s) => ({ s, d: distanciaM(p, s) }))
      .sort((a, b) => a.d - b.d);
  return [...ordenar(false).slice(0, CANDIDATAS_OPERATIVAS), ...ordenar(true).slice(0, CANDIDATAS_FUTURAS)];
}

/**
 * Calcula las caminatas de un punto a sus estaciones candidatas. Las rutas que fallan
 * se omiten (la UI cae a la estimación por línea recta).
 */
export async function calcularCaminatas(p: Punto, previas: Caminatas = {}): Promise<Caminatas> {
  const resultado: Caminatas = {};
  const candidatas = estacionesCandidatas(p);
  await Promise.all(
    candidatas.map(async ({ s, d }) => {
      const clave = claveEstacion(s);
      if (previas[clave]) {
        resultado[clave] = previas[clave];
        return;
      }
      try {
        resultado[clave] = { metros: await rutaPeatonM(p, s), rectaM: Math.round(d) };
      } catch (err) {
        console.warn(`Caminata ${clave} no calculada:`, err);
      }
    }),
  );
  return resultado;
}
