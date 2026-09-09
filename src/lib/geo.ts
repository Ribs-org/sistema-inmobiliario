import { claveEstacion, ESTACIONES, type EstacionConLinea } from "@/data/metro";
import caminatas from "@/data/caminatas.json" with { type: "json" };

export type Punto = { lat: number; lng: number };

const R = 6371000; // m

/** Radio "caminable" alrededor de una estación. */
export const RADIO_CAMINABLE_M = 800;
/** Metros por minuto caminando (≈ 4,8 km/h). */
export const RITMO_M_POR_MIN = 80;
/** Cuánto más larga es una caminata por calle que la línea recta, cuando no hay ruta calculada. */
export const FACTOR_RODEO = 1.25;

/** Distancia en metros entre dos puntos (Haversine). */
export function distanciaM(a: Punto, b: Punto): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Minutos para caminar `m` metros de ruta real. */
export function minutosCaminando(m: number): number {
  return Math.max(1, Math.round(m / RITMO_M_POR_MIN));
}

/** Minutos estimados a partir de una distancia en línea recta. */
export function minutosEstimados(rectaM: number): number {
  return minutosCaminando(rectaM * FACTOR_RODEO);
}

export type EstacionCercana = {
  estacion: EstacionConLinea;
  /** Línea recta, m */
  distanciaM: number;
  /** Caminata por calle, m (ruta real o estimada) */
  caminataM: number;
  minutos: number;
  fuente: "ruta" | "estimada";
};

type Caminatas = Record<string, Record<string, { metros: number }>>;
const CAMINATAS = (caminatas as { rutas: Caminatas }).rutas;

function evaluar(p: Punto, estacion: EstacionConLinea, proyectoId?: string): EstacionCercana {
  const recta = distanciaM(p, estacion);
  const ruta = proyectoId ? CAMINATAS[proyectoId]?.[claveEstacion(estacion)] : undefined;
  const caminataM = ruta ? ruta.metros : recta * FACTOR_RODEO;
  return {
    estacion,
    distanciaM: recta,
    caminataM,
    minutos: minutosCaminando(caminataM),
    fuente: ruta ? "ruta" : "estimada",
  };
}

/**
 * Estación más cercana caminando dentro de un subconjunto. Preselecciona las más
 * próximas en línea recta y las reordena por caminata real cuando existe.
 */
export function estacionMasCercana(
  p: Punto,
  estaciones: EstacionConLinea[] = ESTACIONES,
  proyectoId?: string,
): EstacionCercana | null {
  if (estaciones.length === 0) return null;
  const candidatas = estaciones
    .map((e) => ({ e, d: distanciaM(p, e) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map(({ e }) => evaluar(p, e, proyectoId));
  return candidatas.sort((a, b) => a.caminataM - b.caminataM)[0];
}

/** Estación operativa más cercana y estación futura más cercana (si mejora la actual). */
export function metroCercano(p: Punto, proyectoId?: string) {
  const actual = estacionMasCercana(
    p,
    ESTACIONES.filter((s) => s.estado === "operativa"),
    proyectoId,
  );
  const futuraCandidata = estacionMasCercana(
    p,
    ESTACIONES.filter((s) => s.estado !== "operativa"),
    proyectoId,
  );
  const futura =
    futuraCandidata && (!actual || futuraCandidata.caminataM < actual.caminataM) ? futuraCandidata : null;
  return { actual, futura };
}

/** Elementos con lat/lng dentro de un radio (m, línea recta) alrededor de un punto. */
export function dentroDeRadio<T extends Punto>(centro: Punto, items: T[], radioM: number) {
  return items
    .map((item) => ({ item, distanciaM: distanciaM(centro, item) }))
    .filter((x) => x.distanciaM <= radioM)
    .sort((a, b) => a.distanciaM - b.distanciaM);
}
