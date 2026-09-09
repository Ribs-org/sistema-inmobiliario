// Simulador de crédito hipotecario chileno. Todo en UF; la conversión a CLP
// se hace con el valor UF que entrega el usuario o la API.

export type ParametrosCredito = {
  precioUF: number;
  /** Pie como % del precio (0–100) */
  piePct: number;
  /** Bono pie de la inmobiliaria como % del precio (0–100). Reduce el pie que paga el cliente. */
  bonoPiePct?: number;
  plazoAnios: number;
  /** Tasa anual en UF, en % (ej. 4.4) */
  tasaAnualPct: number;
  valorUF: number;
  incluirSeguros?: boolean;
  /** Renta líquida mensual del comprador en CLP, opcional */
  rentaMensualCLP?: number;
};

export type Cuota = {
  n: number;
  cuotaUF: number;
  interesUF: number;
  amortizacionUF: number;
  saldoUF: number;
};

export type ResultadoCredito = {
  pieUF: number;
  bonoPieUF: number;
  pieClienteUF: number;
  montoCreditoUF: number;
  meses: number;
  tasaMensual: number;
  dividendoUF: number;
  seguroDesgravamenUF: number;
  seguroIncendioUF: number;
  dividendoTotalUF: number;
  totalPagadoUF: number;
  totalInteresesUF: number;
  gastosOperacionalesUF: number;
  /** Renta mínima para que el dividendo no supere el 25 % de la renta */
  rentaMinimaCLP: number;
  /** % de la renta que se lleva el dividendo, si se entregó renta */
  cargaRentaPct: number | null;
  tabla: Cuota[];
};

// Tasas referenciales de seguros (mensuales). Desgravamen sobre saldo insoluto,
// incendio + sismo sobre el valor de la propiedad.
export const TASA_DESGRAVAMEN_MENSUAL = 0.00011;
export const TASA_INCENDIO_SISMO_MENSUAL = 0.00018;
export const CARGA_MAXIMA_RENTA = 0.25;

/** Dividendo con amortización francesa. */
export function dividendo(montoUF: number, tasaMensual: number, meses: number): number {
  if (montoUF <= 0 || meses <= 0) return 0;
  if (tasaMensual === 0) return montoUF / meses;
  return (montoUF * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -meses));
}

/** Gastos operacionales aproximados: impuesto al mutuo 0,8 % del crédito + tasación, estudio de títulos, notaría y CBR. */
export function gastosOperacionales(montoCreditoUF: number): number {
  const impuestoMutuo = montoCreditoUF * 0.008;
  const fijos = 14; // tasación ~3, títulos ~5, notaría ~3, conservador ~3
  return impuestoMutuo + fijos;
}

export function simularCredito(p: ParametrosCredito): ResultadoCredito {
  const precio = Math.max(0, p.precioUF);
  const pieUF = (precio * clamp(p.piePct, 0, 100)) / 100;
  const bonoPieUF = Math.min(pieUF, (precio * clamp(p.bonoPiePct ?? 0, 0, 100)) / 100);
  const pieClienteUF = pieUF - bonoPieUF;
  const montoCreditoUF = precio - pieUF;
  const meses = Math.round(Math.max(1, p.plazoAnios) * 12);
  const tasaMensual = Math.max(0, p.tasaAnualPct) / 100 / 12;

  const dividendoUF = dividendo(montoCreditoUF, tasaMensual, meses);
  const incluirSeguros = p.incluirSeguros ?? true;
  const seguroDesgravamenUF = incluirSeguros ? montoCreditoUF * TASA_DESGRAVAMEN_MENSUAL : 0;
  const seguroIncendioUF = incluirSeguros ? precio * TASA_INCENDIO_SISMO_MENSUAL : 0;
  const dividendoTotalUF = dividendoUF + seguroDesgravamenUF + seguroIncendioUF;

  const tabla: Cuota[] = [];
  let saldo = montoCreditoUF;
  for (let n = 1; n <= meses; n++) {
    const interes = saldo * tasaMensual;
    let amortizacion = dividendoUF - interes;
    if (n === meses) amortizacion = saldo; // corrige redondeo en la última cuota
    saldo = Math.max(0, saldo - amortizacion);
    tabla.push({
      n,
      cuotaUF: interes + amortizacion,
      interesUF: interes,
      amortizacionUF: amortizacion,
      saldoUF: saldo,
    });
  }

  const totalPagadoUF = tabla.reduce((s, c) => s + c.cuotaUF, 0);
  const totalInteresesUF = totalPagadoUF - montoCreditoUF;
  const rentaMinimaCLP = (dividendoTotalUF * p.valorUF) / CARGA_MAXIMA_RENTA;
  const cargaRentaPct =
    p.rentaMensualCLP && p.rentaMensualCLP > 0
      ? ((dividendoTotalUF * p.valorUF) / p.rentaMensualCLP) * 100
      : null;

  return {
    pieUF,
    bonoPieUF,
    pieClienteUF,
    montoCreditoUF,
    meses,
    tasaMensual,
    dividendoUF,
    seguroDesgravamenUF,
    seguroIncendioUF,
    dividendoTotalUF,
    totalPagadoUF,
    totalInteresesUF,
    gastosOperacionalesUF: gastosOperacionales(montoCreditoUF),
    rentaMinimaCLP,
    cargaRentaPct,
    tabla,
  };
}

/** Pie en cuotas hasta la entrega: cuota mensual del pie del cliente. */
export function cuotaPie(pieClienteUF: number, mesesHastaEntrega: number): number {
  if (mesesHastaEntrega <= 0) return pieClienteUF;
  return pieClienteUF / mesesHastaEntrega;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
