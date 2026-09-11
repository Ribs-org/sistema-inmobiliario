// Rentabilidad para inversionista: arriendo estimado, rentabilidad bruta y neta, flujo mensual.
// Supuestos referenciales para departamentos nuevos en Santiago (2026); todos editables en la UI.

/** Arriendo mensual como fracción del precio (≈ 5,4 % bruto anual). */
export const TASA_ARRIENDO_MENSUAL = 0.0045;
/** Gastos comunes típicos, UF por m² útil al mes. */
export const GASTOS_COMUNES_UF_M2 = 0.055;
/** Contribuciones: 1,2 % anual sobre avalúo fiscal (≈ 60 % del precio), en fracción mensual del precio. */
export const CONTRIBUCIONES_MENSUAL = (0.012 * 0.6) / 12;
/** Vacancia esperada (meses sin arriendo sobre el año). */
export const VACANCIA = 0.05;

export type ParametrosRentabilidad = {
  precioUF: number;
  arriendoUF: number;
  /** Dividendo mensual total (con seguros) si se financia; 0 si se compra al contado */
  dividendoUF: number;
  /** Pie del cliente (capital propio invertido) */
  pieClienteUF: number;
  gastosComunesUF: number;
  contribucionesUF: number;
  vacancia: number;
};

export type ResultadoRentabilidad = {
  ingresoMensualUF: number;
  egresosMensualUF: number;
  flujoMensualUF: number;
  rentabilidadBrutaAnualPct: number;
  rentabilidadNetaAnualPct: number;
  /** Retorno anual sobre el capital propio (pie), considerando el flujo después del dividendo */
  retornoSobrePiePct: number | null;
  /** Qué parte del dividendo cubre el arriendo neto */
  coberturaDividendoPct: number | null;
};

export function arriendoEstimadoUF(precioUF: number): number {
  return Math.round(precioUF * TASA_ARRIENDO_MENSUAL * 10) / 10;
}

export function gastosComunesEstimadosUF(m2Utiles: number): number {
  return Math.round(m2Utiles * GASTOS_COMUNES_UF_M2 * 10) / 10;
}

export function contribucionesEstimadasUF(precioUF: number): number {
  return Math.round(precioUF * CONTRIBUCIONES_MENSUAL * 10) / 10;
}

export function calcularRentabilidad(p: ParametrosRentabilidad): ResultadoRentabilidad {
  const ingreso = p.arriendoUF * (1 - p.vacancia);
  const egresosOperacion = p.gastosComunesUF + p.contribucionesUF;
  const netoOperacion = ingreso - egresosOperacion;
  const flujo = netoOperacion - p.dividendoUF;
  return {
    ingresoMensualUF: ingreso,
    egresosMensualUF: egresosOperacion + p.dividendoUF,
    flujoMensualUF: flujo,
    rentabilidadBrutaAnualPct: p.precioUF > 0 ? ((p.arriendoUF * 12) / p.precioUF) * 100 : 0,
    rentabilidadNetaAnualPct: p.precioUF > 0 ? ((netoOperacion * 12) / p.precioUF) * 100 : 0,
    retornoSobrePiePct: p.pieClienteUF > 0 ? ((flujo * 12) / p.pieClienteUF) * 100 : null,
    coberturaDividendoPct: p.dividendoUF > 0 ? (netoOperacion / p.dividendoUF) * 100 : null,
  };
}
