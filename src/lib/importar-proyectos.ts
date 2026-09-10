// Importación masiva de proyectos desde CSV (una fila por tipología) o JSON.
// El CSV usa ";" o "," como separador (se detecta) y acepta decimales con coma.

export const COLUMNAS_CSV = [
  "proyecto_id",
  "proyecto",
  "inmobiliaria",
  "comuna",
  "direccion",
  "lat",
  "lng",
  "estado",
  "entrega",
  "pisos",
  "unidades",
  "pie_minimo_pct",
  "bono_pie_pct",
  "pie_en_cuotas",
  "descripcion",
  "amenidades",
  "tipologia",
  "dormitorios",
  "banos",
  "m2_utiles",
  "m2_terraza",
  "precio_uf",
  "orientacion",
  "disponibles",
] as const;

export type FilaCSV = Record<(typeof COLUMNAS_CSV)[number], string>;

/** Parsea CSV con comillas, saltos de línea dentro de comillas y separador ; o ,. */
export function parsearCSV(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeraLinea.match(/;/g)?.length ?? 0) >= (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (enComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else enComillas = false;
      } else campo += ch;
    } else if (ch === '"') enComillas = true;
    else if (ch === sep) {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.some((c) => c.trim() !== "")) filas.push(fila);
      fila = [];
    } else campo += ch;
  }
  fila.push(campo);
  if (fila.some((c) => c.trim() !== "")) filas.push(fila);
  return filas;
}

/** Número con formato chileno: "3.250" y "38,5" y "-33,4555" se leen bien. */
const num = (v: string | undefined) => {
  let s = (v ?? "").trim();
  if (!s) return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const si = (v: string | undefined) => /^(s[ií]|true|1|x)$/i.test((v ?? "").trim());

const ESTADOS: Record<string, string> = {
  "entrega-inmediata": "entrega-inmediata",
  "entrega inmediata": "entrega-inmediata",
  inmediata: "entrega-inmediata",
  "en-verde": "en-verde",
  "en verde": "en-verde",
  verde: "en-verde",
  "en-blanco": "en-blanco",
  "en blanco": "en-blanco",
  blanco: "en-blanco",
};

export type ProyectoImportado = Record<string, unknown> & {
  id: string;
  nombre: string;
  tipologias: Record<string, unknown>[];
};

/**
 * Convierte filas CSV (con cabecera) en proyectos: las filas con el mismo proyecto_id se
 * agrupan y sus campos de proyecto se toman de la primera fila que los tenga.
 */
export function proyectosDesdeCSV(texto: string): { proyectos: ProyectoImportado[]; errores: string[] } {
  return proyectosDesdeFilas(parsearCSV(texto));
}

/** Lee la primera hoja de un .xlsx (o .xls) y la trata como la plantilla CSV. */
export async function proyectosDesdeXLSX(
  datos: ArrayBuffer,
): Promise<{ proyectos: ProyectoImportado[]; errores: string[] }> {
  const XLSX = await import("xlsx");
  const libro = XLSX.read(datos, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames.find((n) => /proyecto/i.test(n)) ?? libro.SheetNames[0]];
  if (!hoja) return { proyectos: [], errores: ["El archivo no tiene hojas"] };
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: "" });
  return proyectosDesdeFilas(
    filas.map((f) => f.map((c) => (typeof c === "number" ? String(c) : String(c ?? "")))),
  );
}

/** Filas ya separadas (la primera es la cabecera). Los números pueden venir como "3.250", "38,5" o "38.5". */
export function proyectosDesdeFilas(filas: string[][]): {
  proyectos: ProyectoImportado[];
  errores: string[];
} {
  const errores: string[] = [];
  if (filas.length < 2) return { proyectos: [], errores: ["El archivo no tiene filas de datos"] };
  const cab = filas[0].map((c) => c.trim().toLowerCase());
  const faltan = ["proyecto", "tipologia", "precio_uf", "m2_utiles"].filter((c) => !cab.includes(c));
  if (faltan.length) return { proyectos: [], errores: [`Faltan columnas: ${faltan.join(", ")}`] };
  const idx = (c: string) => cab.indexOf(c);
  const celda = (f: string[], c: string) => (idx(c) >= 0 ? (f[idx(c)] ?? "").trim() : "");

  const porId = new Map<string, ProyectoImportado>();
  filas.slice(1).forEach((f, n) => {
    const nombre = celda(f, "proyecto");
    const id = celda(f, "proyecto_id") || nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    // Las filas siguientes de un proyecto pueden traer solo el id y la tipología.
    let p = id ? porId.get(id) : undefined;
    if (!p && !nombre) {
      errores.push(`Fila ${n + 2}: falta el nombre del proyecto`);
      return;
    }
    if (!p) {
      const estadoTexto = celda(f, "estado").toLowerCase();
      p = {
        id,
        nombre,
        inmobiliaria: celda(f, "inmobiliaria"),
        comuna: celda(f, "comuna"),
        direccion: celda(f, "direccion"),
        lat: num(celda(f, "lat")),
        lng: num(celda(f, "lng")),
        estado: ESTADOS[estadoTexto] ?? "en-verde",
        entrega: celda(f, "entrega"),
        pisos: num(celda(f, "pisos")),
        unidades: num(celda(f, "unidades")),
        pieMinimoPct: num(celda(f, "pie_minimo_pct")),
        bonoPiePct: num(celda(f, "bono_pie_pct")),
        pieEnCuotas: si(celda(f, "pie_en_cuotas")),
        descripcion: celda(f, "descripcion"),
        amenidades: celda(f, "amenidades"),
        tipologias: [],
      };
      porId.set(id, p);
    }
    const tip = celda(f, "tipologia");
    const precioUF = num(celda(f, "precio_uf"));
    const m2 = num(celda(f, "m2_utiles"));
    if (!tip || !precioUF || !m2) {
      errores.push(`Fila ${n + 2} (${p.nombre}): la tipología necesita nombre, precio_uf y m2_utiles`);
      return;
    }
    p.tipologias.push({
      id: String.fromCharCode(97 + p.tipologias.length),
      nombre: tip,
      dormitorios: num(celda(f, "dormitorios")) ?? 0,
      banos: num(celda(f, "banos")) ?? 1,
      m2Utiles: m2,
      m2Terraza: num(celda(f, "m2_terraza")) ?? 0,
      precioUF,
      orientacion: celda(f, "orientacion"),
      disponibles: num(celda(f, "disponibles")) ?? 0,
    });
  });

  const proyectos = [...porId.values()].filter((p) => {
    if (p.tipologias.length === 0) {
      errores.push(`${p.nombre}: sin tipologías válidas`);
      return false;
    }
    if (p.lat === undefined || p.lng === undefined) {
      errores.push(`${p.nombre}: faltan lat y lng`);
      return false;
    }
    return true;
  });
  return { proyectos, errores };
}

/** Acepta JSON con un arreglo de proyectos o {proyectos: [...]}. */
export function proyectosDesdeJSON(texto: string): { proyectos: ProyectoImportado[]; errores: string[] } {
  try {
    const j = JSON.parse(texto) as unknown;
    const lista = Array.isArray(j) ? j : (j as { proyectos?: unknown })?.proyectos;
    if (!Array.isArray(lista))
      return { proyectos: [], errores: ["El JSON debe ser un arreglo de proyectos"] };
    return { proyectos: lista as ProyectoImportado[], errores: [] };
  } catch {
    return { proyectos: [], errores: ["El archivo no es JSON válido"] };
  }
}
