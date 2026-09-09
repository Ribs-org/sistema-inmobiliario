import { describe, expect, it } from "vitest";
import { dividendo, simularCredito } from "./credito";

describe("dividendo", () => {
  it("calcula amortización francesa (4000 UF, 4,5 % anual, 25 años ≈ 22,23 UF)", () => {
    const d = dividendo(4000, 0.045 / 12, 300);
    expect(d).toBeCloseTo(22.23, 1);
  });

  it("con tasa cero divide el monto en partes iguales", () => {
    expect(dividendo(1200, 0, 12)).toBe(100);
  });
});

describe("simularCredito", () => {
  const base = { precioUF: 5000, piePct: 20, plazoAnios: 25, tasaAnualPct: 4.5, valorUF: 40000 };

  it("separa pie, bono y crédito", () => {
    const r = simularCredito({ ...base, bonoPiePct: 10 });
    expect(r.pieUF).toBe(1000);
    expect(r.bonoPieUF).toBe(500);
    expect(r.pieClienteUF).toBe(500);
    expect(r.montoCreditoUF).toBe(4000);
    expect(r.meses).toBe(300);
  });

  it("la tabla termina con saldo cero y amortiza el monto completo", () => {
    const r = simularCredito(base);
    expect(r.tabla).toHaveLength(300);
    expect(r.tabla[299].saldoUF).toBeCloseTo(0, 6);
    const amortizado = r.tabla.reduce((s, c) => s + c.amortizacionUF, 0);
    expect(amortizado).toBeCloseTo(4000, 4);
    expect(r.totalInteresesUF).toBeGreaterThan(0);
  });

  it("renta mínima deja el dividendo en 25 % de la renta", () => {
    const r = simularCredito({ ...base, incluirSeguros: false });
    expect(r.rentaMinimaCLP).toBeCloseTo((r.dividendoUF * 40000) / 0.25, 2);
    expect(r.cargaRentaPct).toBeNull();
    const r2 = simularCredito({ ...base, incluirSeguros: false, rentaMensualCLP: r.rentaMinimaCLP });
    expect(r2.cargaRentaPct).toBeCloseTo(25, 6);
  });

  it("los seguros se suman al dividendo total", () => {
    const con = simularCredito(base);
    const sin = simularCredito({ ...base, incluirSeguros: false });
    expect(con.dividendoTotalUF).toBeGreaterThan(sin.dividendoTotalUF);
    expect(sin.dividendoTotalUF).toBeCloseTo(sin.dividendoUF, 10);
  });
});
