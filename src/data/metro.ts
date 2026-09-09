// Red de Metro de Santiago.
// - Líneas operativas: estaciones y trazado real importados desde OpenStreetMap
//   (scripts/importar-metro-osm.mjs → metro-osm.json).
// - Líneas en construcción y proyectadas: metro-futuro.json (nombres oficiales,
//   coordenadas estimadas; las de L7 se ajustan al trazado real de OSM).
// Estado de la red a septiembre de 2026.

import osm from "./metro-osm.json" with { type: "json" };
import futuro from "./metro-futuro.json" with { type: "json" };

export type EstadoLinea = "operativa" | "construccion" | "proyectada";

export type Estacion = {
  nombre: string;
  lat: number;
  lng: number;
  /** Combinación con otras líneas (ids) */
  combina?: string[];
};

export type Linea = {
  id: string;
  nombre: string;
  color: string;
  estado: EstadoLinea;
  /** Año estimado de apertura para líneas no operativas */
  apertura?: number;
  nota?: string;
  estaciones: Estacion[];
  /** Trazado real de la vía [lat, lng][]; si falta, se dibuja estación a estación */
  trazado?: [number, number][];
};

export const ETIQUETA_ESTADO: Record<EstadoLinea, string> = {
  operativa: "Operativa",
  construccion: "En construcción",
  proyectada: "Proyectada",
};

const NOMBRES: Record<string, string> = {
  L1: "Línea 1",
  L2: "Línea 2",
  L3: "Línea 3",
  L4: "Línea 4",
  L4A: "Línea 4A",
  L5: "Línea 5",
  L6: "Línea 6",
};

type Coord = [number, number];

/** Punto más cercano a `p` sobre una polilínea (proyección sobre cada segmento). */
export function ajustarAlTrazado(
  p: { lat: number; lng: number },
  trazado: Coord[],
): { lat: number; lng: number } {
  if (trazado.length === 0) return p;
  const k = Math.cos((p.lat * Math.PI) / 180); // escala lng → misma unidad que lat
  let mejor = { lat: trazado[0][0], lng: trazado[0][1] };
  let mejorD = Infinity;
  for (let i = 0; i < trazado.length - 1; i++) {
    const [ay, ax] = trazado[i];
    const [by, bx] = trazado[i + 1];
    const vx = (bx - ax) * k;
    const vy = by - ay;
    const wx = (p.lng - ax) * k;
    const wy = p.lat - ay;
    const l2 = vx * vx + vy * vy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / l2));
    const qx = ax + (vx * t) / k;
    const qy = ay + vy * t;
    const d = Math.hypot((p.lng - qx) * k, p.lat - qy);
    if (d < mejorD) {
      mejorD = d;
      mejor = { lat: +qy.toFixed(6), lng: +qx.toFixed(6) };
    }
  }
  return mejor;
}

const operativas: Linea[] = Object.entries(osm.lineas).map(([id, l]) => ({
  id,
  nombre: NOMBRES[id] ?? l.nombre,
  color: l.color,
  estado: "operativa",
  estaciones: l.estaciones.map((e) => ({ nombre: e.nombre, lat: e.lat, lng: e.lng })),
  trazado: l.trazado as unknown as Coord[],
}));

const trazadosFuturos = osm.trazadosFuturos as unknown as Record<string, Coord[]>;

const futuras: Linea[] = futuro.lineas.map((l) => {
  const trazado = trazadosFuturos[l.id];
  return {
    id: l.id,
    nombre: l.nombre,
    color: l.color,
    estado: l.estado as EstadoLinea,
    apertura: l.apertura,
    nota: l.nota,
    estaciones: l.estaciones.map((e) => ({
      nombre: e.nombre,
      ...(trazado ? ajustarAlTrazado(e, trazado) : { lat: e.lat, lng: e.lng }),
      combina: "combina" in e ? (e.combina as string[]) : undefined,
    })),
    trazado,
  };
});

// Combinaciones: una estación combina con toda línea que tenga una estación del mismo nombre.
const lineasPorNombre = new Map<string, Set<string>>();
for (const l of [...operativas, ...futuras]) {
  for (const e of l.estaciones) {
    if (!lineasPorNombre.has(e.nombre)) lineasPorNombre.set(e.nombre, new Set());
    lineasPorNombre.get(e.nombre)!.add(l.id);
  }
}
for (const l of [...operativas, ...futuras]) {
  for (const e of l.estaciones) {
    const otras = [...(lineasPorNombre.get(e.nombre) ?? [])].filter((id) => id !== l.id);
    const declaradas = e.combina ?? [];
    const todas = [...new Set([...declaradas, ...otras])];
    e.combina = todas.length ? todas : undefined;
  }
}

export const LINEAS: Linea[] = [...operativas, ...futuras];
export const LINEAS_OPERATIVAS = LINEAS.filter((l) => l.estado === "operativa");
export const LINEAS_FUTURAS = LINEAS.filter((l) => l.estado !== "operativa");

export const FUENTE_METRO = {
  operativas: `OpenStreetMap (ODbL), ${String(osm.fecha ?? "").slice(0, 10)}`,
  futuras: "Metro S.A. / Wikipedia, sep. 2026; coordenadas estimadas",
};

export type EstacionConLinea = Estacion & {
  lineaId: string;
  lineaNombre: string;
  color: string;
  estado: EstadoLinea;
  apertura?: number;
};

/** Lista plana de todas las estaciones, con referencia a su línea. */
export const ESTACIONES: EstacionConLinea[] = LINEAS.flatMap((l) =>
  l.estaciones.map((s) => ({
    ...s,
    lineaId: l.id,
    lineaNombre: l.nombre,
    color: l.color,
    estado: l.estado,
    apertura: l.apertura,
  })),
);

/** Id estable de una estación dentro de su línea, usado por caminatas.json. */
export const claveEstacion = (s: { lineaId: string; nombre: string }) => `${s.lineaId}:${s.nombre}`;

/** Etiqueta corta de línea para la interfaz: L6O → L6, L9N → L9, L4A → L4A, LA → LA. */
export function etiquetaLinea(id: string): string {
  return /^(LA|L\d+A?)/.exec(id)?.[1] ?? id;
}
