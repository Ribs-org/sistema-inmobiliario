// Informe de conversión: en qué se convierte el trabajo del equipo y dónde se cae.
// Todo se deduce de los clientes guardados; no hay métricas aparte que mantener.

import {
  ETAPAS,
  ETAPAS_RESERVA,
  MOTIVOS_PERDIDA,
  ordenarInteracciones,
  transicion,
  type Cliente,
  type Etapa,
  type MotivoPerdida,
} from "./clientes";

const DIA = 86400000;

export type Fila = {
  clave: string;
  nombre: string;
  total: number;
  /** Llegaron a reserva, promesa o escritura */
  comprometidos: number;
  cerrados: number;
  perdidos: number;
  /** Cerrados sobre el total, en porcentaje */
  conversion: number;
};

const llegoA = (c: Cliente, etapas: Etapa[]) =>
  etapas.includes(c.etapa) || (c.interacciones ?? []).some((i) => etapas.includes(transicion(i)?.a as Etapa));

/** Agrupa los clientes por una clave (proyecto, vendedor…) y calcula la conversión de cada grupo. */
export function conversionPor(
  clientes: Cliente[],
  clave: (c: Cliente) => string,
  nombre: (k: string, c: Cliente) => string,
): Fila[] {
  const grupos = new Map<string, Cliente[]>();
  for (const c of clientes) {
    const k = clave(c);
    grupos.set(k, [...(grupos.get(k) ?? []), c]);
  }
  return [...grupos.entries()]
    .map(([k, lista]) => {
      const cerrados = lista.filter((c) => c.etapa === "escritura").length;
      return {
        clave: k,
        nombre: nombre(k, lista[0]),
        total: lista.length,
        comprometidos: lista.filter((c) => llegoA(c, ETAPAS_RESERVA)).length,
        cerrados,
        perdidos: lista.filter((c) => c.etapa === "perdido").length,
        conversion: lista.length === 0 ? 0 : Math.round((cerrados / lista.length) * 100),
      };
    })
    .sort((a, b) => b.cerrados - a.cerrados || b.total - a.total);
}

export function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Reconstruye cuánto duró cada etapa de un cliente. La entrada a "nuevo" es su creación y
 * cada cambio de etapa cierra la anterior; la etapa actual sigue corriendo, así que no cuenta.
 */
export function duracionesPorEtapa(c: Cliente): { etapa: Etapa; dias: number }[] {
  const cambios = ordenarInteracciones(c.interacciones ?? [])
    .reverse()
    .map((i) => ({ t: transicion(i), en: Date.parse(i.creadoEn) }))
    .filter((x): x is { t: { de: Etapa; a: Etapa }; en: number } => !!x.t && Number.isFinite(x.en));
  const salida: { etapa: Etapa; dias: number }[] = [];
  let etapa: Etapa = cambios[0]?.t.de ?? c.etapa;
  let desde = Date.parse(c.creadoEn);
  if (!Number.isFinite(desde)) return salida;
  for (const { t, en } of cambios) {
    if (en >= desde) salida.push({ etapa, dias: Math.max(0, Math.floor((en - desde) / DIA)) });
    etapa = t.a;
    desde = en;
  }
  return salida;
}

/** Cuántos días pasa un cliente típico en cada etapa, contando solo las etapas ya terminadas. */
export function diasPorEtapa(clientes: Cliente[]): { etapa: Etapa; dias: number | null; casos: number }[] {
  const acumulado = new Map<Etapa, number[]>();
  for (const c of clientes) {
    for (const { etapa, dias } of duracionesPorEtapa(c)) {
      acumulado.set(etapa, [...(acumulado.get(etapa) ?? []), dias]);
    }
  }
  return ETAPAS.filter((e) => e !== "perdido").map((etapa) => {
    const xs = acumulado.get(etapa) ?? [];
    return { etapa, dias: mediana(xs), casos: xs.length };
  });
}

/** Días desde que entró el cliente hasta que firmó, para los que cerraron. */
export function diasHastaCierre(clientes: Cliente[]): number | null {
  const dias = clientes
    .filter((c) => c.etapa === "escritura")
    .map((c) => {
      const inicio = Date.parse(c.creadoEn);
      const cierre = ordenarInteracciones(c.interacciones ?? []).find(
        (i) => transicion(i)?.a === "escritura",
      );
      const fin = cierre ? Date.parse(cierre.creadoEn) : Date.parse(c.etapaDesde ?? c.actualizadoEn);
      return Number.isFinite(inicio) && Number.isFinite(fin) ? Math.floor((fin - inicio) / DIA) : null;
    })
    .filter((d): d is number => d !== null && d >= 0);
  return mediana(dias);
}

export type MotivoConteo = { motivo: MotivoPerdida | "sin-registrar"; n: number; pct: number };

/** Por qué se cayeron los clientes perdidos. Los sin motivo se muestran aparte, no se esconden. */
export function motivosDePerdida(clientes: Cliente[]): { total: number; filas: MotivoConteo[] } {
  const perdidos = clientes.filter((c) => c.etapa === "perdido");
  const cuenta = (m: MotivoPerdida | "sin-registrar") =>
    perdidos.filter((c) => (c.motivoPerdida ?? "sin-registrar") === m).length;
  const filas = [...MOTIVOS_PERDIDA, "sin-registrar" as const]
    .map((motivo) => ({
      motivo,
      n: cuenta(motivo),
      pct: perdidos.length === 0 ? 0 : Math.round((cuenta(motivo) / perdidos.length) * 100),
    }))
    .filter((f) => f.n > 0)
    .sort((a, b) => b.n - a.n);
  return { total: perdidos.length, filas };
}
