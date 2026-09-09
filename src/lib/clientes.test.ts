import { describe, expect, it } from "vitest";
import { normalizarCliente, nuevoCliente, ordenarPorSeguimiento } from "./clientes";

describe("normalizarCliente", () => {
  it("exige nombre y limpia campos", () => {
    expect(normalizarCliente({ nombre: "  " })).toBeNull();
    const c = normalizarCliente({
      nombre: " Ana Pérez ",
      etapa: "visita",
      proximoContacto: "2026-09-15",
      proyectoId: "macul-sur",
      tipologiaId: "b",
      notas: "Quiere 2D",
    })!;
    expect(c.nombre).toBe("Ana Pérez");
    expect(c.etapa).toBe("visita");
    expect(c.proximoContacto).toBe("2026-09-15");
    expect(c.id).toMatch(/^c_/);
  });

  it("descarta etapas y fechas inválidas", () => {
    const c = normalizarCliente({ nombre: "X", etapa: "loquesea", proximoContacto: "15/09/2026" })!;
    expect(c.etapa).toBe("nuevo");
    expect(c.proximoContacto).toBeNull();
  });
});

describe("ordenarPorSeguimiento", () => {
  it("fecha más próxima primero, sin fecha al final", () => {
    const lista = [
      nuevoCliente({ id: "sin", nombre: "Sin fecha", actualizadoEn: "2026-09-01T00:00:00Z" }),
      nuevoCliente({ id: "tarde", nombre: "Tarde", proximoContacto: "2026-09-20" }),
      nuevoCliente({ id: "pronto", nombre: "Pronto", proximoContacto: "2026-09-10" }),
    ];
    expect(ordenarPorSeguimiento(lista).map((c) => c.id)).toEqual(["pronto", "tarde", "sin"]);
  });
});
