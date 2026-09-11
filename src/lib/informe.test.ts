import { describe, expect, it } from "vitest";
import { nuevoCliente, reconciliarCliente, type Cliente, type Etapa } from "./clientes";
import {
  conversionPor,
  diasHastaCierre,
  diasPorEtapa,
  duracionesPorEtapa,
  motivosDePerdida,
} from "./informe";

const DIA = 86400000;
const base = Date.parse("2026-01-01T10:00:00.000Z");
const enDias = (n: number) => new Date(base + n * DIA).toISOString();

/** Construye un cliente que pasó por una serie de etapas en los días indicados. */
function recorrido(pasos: [Etapa, number][], extra: Partial<Cliente> = {}): Cliente {
  let c = nuevoCliente({ nombre: "Cliente", creadoEn: enDias(0), etapaDesde: enDias(0), ...extra });
  for (const [etapa, dia] of pasos) {
    const previo = c;
    c = reconciliarCliente({ ...c, etapa }, previo);
    // reconciliarCliente fecha el cambio con el reloj real; aquí se reescribe para la prueba.
    c = {
      ...c,
      interacciones: c.interacciones.map((i, idx) => (idx === 0 ? { ...i, creadoEn: enDias(dia) } : i)),
    };
  }
  return c;
}

describe("duracionesPorEtapa", () => {
  it("mide cada etapa cerrada y deja fuera la actual", () => {
    const c = recorrido([
      ["contactado", 2],
      ["visita", 7],
      ["reserva", 10],
    ]);
    expect(duracionesPorEtapa(c)).toEqual([
      { etapa: "nuevo", dias: 2 },
      { etapa: "contactado", dias: 5 },
      { etapa: "visita", dias: 3 },
    ]);
  });

  it("un cliente que nunca se movió no aporta duraciones", () => {
    expect(duracionesPorEtapa(nuevoCliente({ nombre: "Quieto" }))).toEqual([]);
  });
});

describe("diasPorEtapa", () => {
  it("devuelve la mediana por etapa y cuántos casos la sostienen", () => {
    const clientes = [
      recorrido([
        ["contactado", 2],
        ["visita", 4],
      ]),
      recorrido([
        ["contactado", 6],
        ["visita", 8],
      ]),
    ];
    const filas = diasPorEtapa(clientes);
    const nuevo = filas.find((f) => f.etapa === "nuevo")!;
    expect(nuevo).toMatchObject({ dias: 4, casos: 2 });
    expect(filas.find((f) => f.etapa === "escritura")).toMatchObject({ dias: null, casos: 0 });
    expect(filas.some((f) => f.etapa === "perdido")).toBe(false);
  });
});

describe("diasHastaCierre", () => {
  it("mide desde que entró el cliente hasta que firmó", () => {
    const clientes = [
      recorrido([
        ["reserva", 10],
        ["escritura", 40],
      ]),
      recorrido([["escritura", 60]]),
      recorrido([["contactado", 3]]),
    ];
    expect(diasHastaCierre(clientes)).toBe(50);
  });

  it("sin escrituras no hay ciclo que medir", () => {
    expect(diasHastaCierre([recorrido([["contactado", 3]])])).toBeNull();
  });
});

describe("conversionPor", () => {
  it("cuenta comprometidos aunque el cliente ya no esté en esa etapa", () => {
    const clientes = [
      recorrido([["reserva", 5]], { proyectoId: "p1" }),
      recorrido(
        [
          ["reserva", 5],
          ["perdido", 9],
        ],
        { proyectoId: "p1" },
      ),
      recorrido([["contactado", 2]], { proyectoId: "p1" }),
      recorrido([["escritura", 30]], { proyectoId: "p2" }),
    ];
    const filas = conversionPor(
      clientes,
      (c) => c.proyectoId ?? "sin",
      (k) => k,
    );
    const p1 = filas.find((f) => f.clave === "p1")!;
    expect(p1).toMatchObject({ total: 3, comprometidos: 2, cerrados: 0, perdidos: 1, conversion: 0 });
    expect(filas.find((f) => f.clave === "p2")).toMatchObject({ cerrados: 1, conversion: 100 });
    // El que más cerró va primero.
    expect(filas[0].clave).toBe("p2");
  });

  it("agrupa por la clave que se le pase", () => {
    const clientes = [
      recorrido([["escritura", 20]], { vendedorId: "u1" }),
      recorrido([["contactado", 2]], { vendedorId: null }),
    ];
    const filas = conversionPor(
      clientes,
      (c) => c.vendedorId ?? "sin",
      (k) => (k === "sin" ? "Sin asignar" : k),
    );
    expect(filas.map((f) => f.nombre)).toEqual(["u1", "Sin asignar"]);
  });
});

describe("motivosDePerdida", () => {
  it("ordena por frecuencia y muestra aparte los sin motivo", () => {
    const perdido = (motivo?: "precio" | "competencia") =>
      recorrido([["perdido", 5]], { motivoPerdida: motivo ?? null });
    const r = motivosDePerdida([
      perdido("precio"),
      perdido("precio"),
      perdido("competencia"),
      perdido(),
      recorrido([["escritura", 30]]),
    ]);
    expect(r.total).toBe(4);
    expect(r.filas[0]).toMatchObject({ motivo: "precio", n: 2, pct: 50 });
    expect(r.filas.map((f) => f.motivo)).toContain("sin-registrar");
  });

  it("sin perdidos no hay filas", () => {
    expect(motivosDePerdida([recorrido([["escritura", 10]])])).toMatchObject({ total: 0, filas: [] });
  });
});
