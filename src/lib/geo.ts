import { ESTACIONES, type EstacionConLinea } from "@/data/metro";

export type Punto = { lat: number; lng: number };

const R = 6371000; // m

/** Radio "caminable" alrededor de una estación. */
export const RADIO_CAMINABLE_M = 800;

/** Distancia en metros entre dos puntos (Haversine). */
export function distanciaM(a: Punto, b: Punto): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type EstacionCercana = { estacion: EstacionConLinea; distanciaM: number };

/** Estación más cercana dentro de un subconjunto de estaciones. */
export function estacionMasCercana(
  p: Punto,
  estaciones: EstacionConLinea[] = ESTACIONES,
): EstacionCercana | null {
  let mejor: EstacionCercana | null = null;
  for (const estacion of estaciones) {
    const d = distanciaM(p, estacion);
    if (!mejor || d < mejor.distanciaM) mejor = { estacion, distanciaM: d };
  }
  return mejor;
}

/** Estación operativa más cercana y estación futura más cercana (si mejora la actual). */
export function metroCercano(p: Punto) {
  const actual = estacionMasCercana(
    p,
    ESTACIONES.filter((s) => s.estado === "operativa"),
  );
  const futuraCandidata = estacionMasCercana(
    p,
    ESTACIONES.filter((s) => s.estado !== "operativa"),
  );
  const futura =
    futuraCandidata && (!actual || futuraCandidata.distanciaM < actual.distanciaM) ? futuraCandidata : null;
  return { actual, futura };
}

/** Minutos caminando a ~80 m/min (ritmo urbano). */
export function minutosCaminando(m: number): number {
  return Math.max(1, Math.round(m / 80));
}

/** Elementos con lat/lng dentro de un radio (m) alrededor de un punto. */
export function dentroDeRadio<T extends Punto>(centro: Punto, items: T[], radioM: number) {
  return items
    .map((item) => ({ item, distanciaM: distanciaM(centro, item) }))
    .filter((x) => x.distanciaM <= radioM)
    .sort((a, b) => a.distanciaM - b.distanciaM);
}
