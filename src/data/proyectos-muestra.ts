// Proyectos de muestra con sus caminatas precalculadas (seguro para cliente y servidor).

import caminatasMuestra from "./caminatas.json" with { type: "json" };
import { PROYECTOS, type Proyecto } from "./proyectos";

const rutas = (caminatasMuestra as { rutas: Record<string, Proyecto["caminatas"]> }).rutas;

export function proyectosMuestra(): Proyecto[] {
  return PROYECTOS.map((p) => ({ ...p, caminatas: rutas[p.id] }));
}
