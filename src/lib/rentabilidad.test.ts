import { describe, expect, it } from "vitest";
import {
  arriendoEstimadoUF,
  calcularRentabilidad,
  contribucionesEstimadasUF,
  gastosComunesEstimadosUF,
} from "./rentabilidad";

describe("rentabilidad", () => {
  it("estima arriendo, gastos comunes y contribuciones en rangos razonables", () => {
    expect(arriendoEstimadoUF(4000)).toBe(18);
    expect(gastosComunesEstimadosUF(48)).toBeCloseTo(2.6, 1);
    expect(contribucionesEstimadasUF(4000)).toBeCloseTo(2.4, 1);
  });

  it("calcula rentabilidad bruta, neta y flujo con financiamiento", () => {
    const r = calcularRentabilidad({
      precioUF: 4000,
      arriendoUF: 18,
      dividendoUF: 18.7,
      pieClienteUF: 800,
      gastosComunesUF: 2.6,
      contribucionesUF: 2.4,
      vacancia: 0.05,
    });
    expect(r.rentabilidadBrutaAnualPct).toBeCloseTo(5.4, 2);
    expect(r.ingresoMensualUF).toBeCloseTo(17.1, 5);
    expect(r.rentabilidadNetaAnualPct).toBeCloseTo(((17.1 - 5) * 12 * 100) / 4000, 5);
    expect(r.flujoMensualUF).toBeCloseTo(17.1 - 5 - 18.7, 5);
    expect(r.coberturaDividendoPct).toBeCloseTo(((17.1 - 5) / 18.7) * 100, 5);
    expect(r.retornoSobrePiePct).toBeLessThan(0);
  });

  it("al contado no hay dividendo ni retorno sobre pie", () => {
    const r = calcularRentabilidad({
      precioUF: 3000,
      arriendoUF: 14,
      dividendoUF: 0,
      pieClienteUF: 0,
      gastosComunesUF: 2,
      contribucionesUF: 1.8,
      vacancia: 0,
    });
    expect(r.coberturaDividendoPct).toBeNull();
    expect(r.retornoSobrePiePct).toBeNull();
    expect(r.flujoMensualUF).toBeCloseTo(10.2, 5);
  });
});
