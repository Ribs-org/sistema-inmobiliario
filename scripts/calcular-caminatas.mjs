// Calcula la distancia caminando por calle desde cada proyecto a sus estaciones de Metro
// más cercanas usando Valhalla (servidor público de OSM, perfil peatón, sin API key) y
// escribe src/data/caminatas.json. Solo recalcula pares que no existan (usa --todo para forzar).
//
// Uso: node --experimental-strip-types scripts/calcular-caminatas.mjs [--todo]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { PROYECTOS } from "../src/data/proyectos.ts";
import { ESTACIONES, claveEstacion } from "../src/data/metro.ts";

const VALHALLA = "https://valhalla1.openstreetmap.de/route";
const CANDIDATAS_OPERATIVAS = 4;
const CANDIDATAS_FUTURAS = 3;
const destino = new URL("../src/data/caminatas.json", import.meta.url);
const forzar = process.argv.includes("--todo");

const distancia = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const s =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
};

async function rutaPeaton(desde, hasta) {
  const json = JSON.stringify({
    locations: [
      { lat: desde.lat, lon: desde.lng },
      { lat: hasta.lat, lon: hasta.lng },
    ],
    costing: "pedestrian",
    units: "kilometers",
  });
  const r = await fetch(`${VALHALLA}?json=${encodeURIComponent(json)}`, {
    headers: { "user-agent": "pyxis-demo/1.0" },
  });
  if (!r.ok) throw new Error(`Valhalla HTTP ${r.status}`);
  const j = await r.json();
  return Math.round(j.trip.summary.length * 1000);
}

const previo = existsSync(destino) && !forzar ? (JSON.parse(readFileSync(destino, "utf8")).rutas ?? {}) : {};
const rutas = { ...previo };
let llamadas = 0;

for (const p of PROYECTOS) {
  rutas[p.id] = { ...(rutas[p.id] ?? {}) };
  const ordenadas = (estado) =>
    ESTACIONES.filter((s) => (estado === "operativa" ? s.estado === "operativa" : s.estado !== "operativa"))
      .map((s) => ({ s, d: distancia(p, s) }))
      .sort((a, b) => a.d - b.d);
  const candidatas = [
    ...ordenadas("operativa").slice(0, CANDIDATAS_OPERATIVAS),
    ...ordenadas("futura").slice(0, CANDIDATAS_FUTURAS),
  ];
  for (const { s, d } of candidatas) {
    const clave = claveEstacion(s);
    if (rutas[p.id][clave]) continue;
    try {
      const metros = await rutaPeaton(p, s);
      rutas[p.id][clave] = { metros, rectaM: Math.round(d) };
      llamadas++;
      console.log(`${p.nombre} → ${clave}: ${metros} m por calle (${Math.round(d)} m recta)`);
      await new Promise((ok) => setTimeout(ok, 400)); // respeto al servidor público
    } catch (err) {
      console.warn(`  ${p.nombre} → ${clave}: ${err.message}`);
    }
  }
}

writeFileSync(
  destino,
  JSON.stringify(
    {
      fuente: "Valhalla (OpenStreetMap), perfil peatón",
      fecha: new Date().toISOString().slice(0, 10),
      rutas,
    },
    null,
    1,
  ),
);
console.log(`Listo: ${llamadas} rutas nuevas. Escrito ${destino.pathname}`);
