// Importa la red operativa del Metro de Santiago desde OpenStreetMap (Overpass) y
// escribe src/data/metro-osm.json con estaciones (en orden) y el trazado real de la vía.
//
// Uso:  node scripts/importar-metro-osm.mjs [archivo-overpass.json]
// Sin argumento consulta Overpass en vivo. Con un archivo, usa esa respuesta ya descargada.

import { readFileSync, writeFileSync } from "node:fs";

// Trazados de líneas en construcción cuya geometría ya está en OSM (sin estaciones).
const TRAZADOS_FUTUROS = { L7: 17824814 };

// Una relación por línea (sentido de ida). Las líneas futuras no vienen de aquí.
const RELACIONES = {
  L1: 2943868,
  L2: 3636603,
  L3: 2193874,
  L4: 444961,
  L4A: 444982,
  L5: 444964,
  L6: 444976,
};

const CONSULTA = `[out:json][timeout:180];
rel(id:${[...Object.values(RELACIONES), ...Object.values(TRAZADOS_FUTUROS)].join(",")});
out body;
>;
out body;`;

const SERVIDORES = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function obtenerDatos() {
  const archivo = process.argv[2];
  if (archivo) return JSON.parse(readFileSync(archivo, "utf8"));
  for (const servidor of SERVIDORES) {
    try {
      const r = await fetch(servidor, { method: "POST", body: new URLSearchParams({ data: CONSULTA }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texto = await r.text();
      if (!texto.trimStart().startsWith("{")) throw new Error("respuesta no JSON (servidor ocupado)");
      console.log("Datos desde", servidor);
      return JSON.parse(texto);
    } catch (err) {
      console.warn(`Falló ${servidor}: ${err.message}`);
    }
  }
  throw new Error("Ningún servidor Overpass respondió");
}

/** Une los ways de la relación en una sola polilínea, invirtiendo los que vienen al revés. */
function unirWays(ways, nodos) {
  const segmentos = ways.map((w) => w.nodes.map((id) => nodos.get(id)).filter(Boolean));
  if (segmentos.length === 0) return [];
  const ruta = [...segmentos[0]];
  const pendientes = segmentos.slice(1);
  const mismo = (a, b) => a && b && a.id === b.id;
  const cerca = (a, b) => a && b && Math.hypot(a.lat - b.lat, a.lon - b.lon) < 0.0005;
  while (pendientes.length) {
    const fin = ruta[ruta.length - 1];
    let idx = pendientes.findIndex((s) => mismo(s[0], fin) || cerca(s[0], fin));
    let invertir = false;
    if (idx < 0) {
      idx = pendientes.findIndex((s) => mismo(s[s.length - 1], fin) || cerca(s[s.length - 1], fin));
      invertir = true;
    }
    if (idx < 0) {
      // No conecta con el final: probar con el inicio de la ruta.
      const inicio = ruta[0];
      let i2 = pendientes.findIndex((s) => mismo(s[s.length - 1], inicio) || cerca(s[s.length - 1], inicio));
      if (i2 >= 0) {
        ruta.unshift(...pendientes.splice(i2, 1)[0].slice(0, -1));
        continue;
      }
      i2 = pendientes.findIndex((s) => mismo(s[0], inicio) || cerca(s[0], inicio));
      if (i2 >= 0) {
        ruta.unshift(...pendientes.splice(i2, 1)[0].slice(1).reverse());
        continue;
      }
      // Segmento suelto: se agrega igual (deja un salto) para no perder trazado.
      ruta.push(...pendientes.shift());
      continue;
    }
    const seg = pendientes.splice(idx, 1)[0];
    ruta.push(...(invertir ? [...seg].reverse() : seg).slice(1));
  }
  return ruta;
}

const datos = await obtenerDatos();
const nodos = new Map(datos.elements.filter((e) => e.type === "node").map((n) => [n.id, n]));
const ways = new Map(datos.elements.filter((e) => e.type === "way").map((w) => [w.id, w]));
const relaciones = new Map(datos.elements.filter((e) => e.type === "relation").map((r) => [r.id, r]));

const salida = {};
for (const [id, relId] of Object.entries(RELACIONES)) {
  const rel = relaciones.get(relId);
  if (!rel) throw new Error(`Falta la relación ${relId} (${id})`);
  const estaciones = rel.members
    .filter((m) => m.type === "node" && /stop/.test(m.role))
    .map((m) => nodos.get(m.ref))
    .filter((n) => n && n.tags?.name)
    .map((n) => ({ nombre: n.tags.name, lat: +n.lat.toFixed(6), lng: +n.lon.toFixed(6) }));
  const trazado = unirWays(
    rel.members.filter((m) => m.type === "way" && ways.has(m.ref)).map((m) => ways.get(m.ref)),
    nodos,
  ).map((n) => [+n.lat.toFixed(6), +n.lon.toFixed(6)]);
  salida[id] = { nombre: rel.tags.name.replace(/:.*$/, ""), color: rel.tags.colour, estaciones, trazado };
  console.log(`${id}: ${estaciones.length} estaciones, ${trazado.length} puntos de trazado`);
}

const trazadosFuturos = {};
for (const [id, relId] of Object.entries(TRAZADOS_FUTUROS)) {
  const rel = relaciones.get(relId);
  if (!rel) continue;
  trazadosFuturos[id] = unirWays(
    rel.members.filter((m) => m.type === "way" && ways.has(m.ref)).map((m) => ways.get(m.ref)),
    nodos,
  ).map((n) => [+n.lat.toFixed(6), +n.lon.toFixed(6)]);
  console.log(`${id} (trazado futuro): ${trazadosFuturos[id].length} puntos`);
}

const destino = new URL("../src/data/metro-osm.json", import.meta.url);
writeFileSync(
  destino,
  JSON.stringify(
    {
      fuente: "OpenStreetMap (ODbL)",
      fecha: datos.osm3s?.timestamp_osm_base,
      lineas: salida,
      trazadosFuturos,
    },
    null,
    1,
  ),
);
console.log("Escrito", destino.pathname);
