// Genera public/proyectos-muestra.xlsx con los proyectos de muestra en el formato de importación
// (hoja "Proyectos", una fila por tipología) y una hoja "Instrucciones".
//
// Uso: node --experimental-strip-types scripts/generar-excel-muestra.mjs

import { writeFileSync } from "node:fs";
import XLSX from "xlsx";
import { PROYECTOS } from "../src/data/proyectos.ts";

const CAB = [
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
];

const ESTADO = { "entrega-inmediata": "Entrega inmediata", "en-verde": "En verde", "en-blanco": "En blanco" };

const filas = [CAB];
for (const p of PROYECTOS) {
  p.tipologias.forEach((t, i) => {
    const cabecera = i === 0;
    filas.push([
      p.id,
      cabecera ? p.nombre : "",
      cabecera ? p.inmobiliaria : "",
      cabecera ? p.comuna : "",
      cabecera ? p.direccion : "",
      cabecera ? p.lat : "",
      cabecera ? p.lng : "",
      cabecera ? ESTADO[p.estado] : "",
      cabecera ? p.entrega : "",
      cabecera ? p.pisos : "",
      cabecera ? p.unidades : "",
      cabecera ? p.pieMinimoPct : "",
      cabecera ? (p.bonoPiePct ?? 0) : "",
      cabecera ? (p.pieEnCuotas ? "sí" : "no") : "",
      cabecera ? p.descripcion : "",
      cabecera ? p.amenidades.join(", ") : "",
      t.nombre,
      t.dormitorios,
      t.banos,
      t.m2Utiles,
      t.m2Terraza,
      t.precioUF,
      t.orientacion,
      t.disponibles,
    ]);
  });
}

const instrucciones = [
  ["Cómo llenar esta planilla"],
  [""],
  [
    "Una fila por tipología. Las filas de un mismo proyecto comparten el proyecto_id; los datos del proyecto van solo en la primera fila.",
  ],
  [
    "proyecto_id",
    "Identificador corto sin espacios (ej. torre-nunoa). Si ya existe, el proyecto se actualiza y conserva sus fotos y planos.",
  ],
  ["proyecto", "Nombre comercial."],
  ["comuna, direccion", "Texto libre. La dirección se usa para mostrar, no para ubicar."],
  [
    "lat, lng",
    "Coordenadas decimales (ej. -33,4561 y -70,6098). Se obtienen con clic derecho en Google Maps.",
  ],
  ["estado", "Entrega inmediata, En verde o En blanco."],
  ["entrega", "Texto libre, ej. Segundo semestre 2027 o Inmediata."],
  ["pie_minimo_pct, bono_pie_pct", "Porcentajes del precio. Bono 0 si no hay."],
  ["pie_en_cuotas", "sí o no."],
  ["amenidades", "Separadas por coma."],
  ["tipologia", "Nombre corto: Estudio, 1D1B, 2D2B, 3D2B…"],
  ["m2_utiles, m2_terraza, precio_uf", "Números. Se aceptan decimales con coma."],
  ["disponibles", "Unidades disponibles de esa tipología."],
  [""],
  ["Luego, en Pyxis → Área interna → Proyectos → Importar archivo, elige este .xlsx (o guárdalo como CSV)."],
];

const libro = XLSX.utils.book_new();
const hoja = XLSX.utils.aoa_to_sheet(filas);
hoja["!cols"] = CAB.map((c) => ({ wch: Math.max(12, Math.min(40, c.length + 4)) }));
hoja["!cols"][14] = { wch: 60 };
hoja["!cols"][15] = { wch: 40 };
XLSX.utils.book_append_sheet(libro, hoja, "Proyectos");
const hojaI = XLSX.utils.aoa_to_sheet(instrucciones);
hojaI["!cols"] = [{ wch: 34 }, { wch: 110 }];
XLSX.utils.book_append_sheet(libro, hojaI, "Instrucciones");

const destino = new URL("../public/proyectos-muestra.xlsx", import.meta.url);
writeFileSync(destino, XLSX.write(libro, { type: "buffer", bookType: "xlsx" }));
console.log(`Escrito ${destino.pathname}: ${filas.length - 1} filas, ${PROYECTOS.length} proyectos`);
