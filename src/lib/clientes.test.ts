import { describe, expect, it } from "vitest";
import {
  diasEnEtapa,
  normalizarCliente,
  nuevoCliente,
  ordenarPorSeguimiento,
  reconciliarCliente,
  ultimaInteraccion,
} from "./clientes";

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
    expect(c.interacciones).toEqual([]);
  });

  it("descarta etapas y fechas inválidas", () => {
    const c = normalizarCliente({ nombre: "X", etapa: "loquesea", proximoContacto: "15/09/2026" })!;
    expect(c.etapa).toBe("nuevo");
    expect(c.proximoContacto).toBeNull();
  });

  it("normaliza interacciones y descarta las vacías", () => {
    const c = normalizarCliente({
      nombre: "X",
      interacciones: [
        { tipo: "llamada", fecha: "2026-09-01", texto: "Llamé, no contestó" },
        { tipo: "inventado", fecha: "ayer", texto: "sin tipo válido" },
        { tipo: "nota", texto: "   " },
      ],
    })!;
    expect(c.interacciones).toHaveLength(2);
    expect(c.interacciones[0].tipo).toBe("llamada");
    expect(c.interacciones[1].tipo).toBe("nota");
    expect(c.interacciones[1].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("reconciliarCliente", () => {
  it("registra el cambio de etapa y reinicia etapaDesde", () => {
    const previo = nuevoCliente({
      id: "a",
      nombre: "A",
      etapa: "nuevo",
      etapaDesde: "2026-08-01T00:00:00Z",
      creadoEn: "2026-07-01T00:00:00Z",
    });
    const nuevo = nuevoCliente({ id: "a", nombre: "A", etapa: "visita", creadoEn: "2026-09-09T00:00:00Z" });
    const r = reconciliarCliente(nuevo, previo);
    expect(r.creadoEn).toBe("2026-07-01T00:00:00Z");
    expect(r.interacciones[0].tipo).toBe("etapa");
    expect(r.interacciones[0].texto).toBe("Nuevo → Visita agendada");
    expect(Date.parse(r.etapaDesde!)).toBeGreaterThan(Date.parse("2026-08-01T00:00:00Z"));
  });

  it("sin cambio de etapa conserva etapaDesde y no agrega interacciones", () => {
    const previo = nuevoCliente({
      id: "a",
      nombre: "A",
      etapa: "visita",
      etapaDesde: "2026-08-01T00:00:00Z",
    });
    const r = reconciliarCliente(nuevoCliente({ id: "a", nombre: "A", etapa: "visita" }), previo);
    expect(r.etapaDesde).toBe("2026-08-01T00:00:00Z");
    expect(r.interacciones).toEqual([]);
  });
});

describe("diasEnEtapa y última interacción", () => {
  it("cuenta días completos desde etapaDesde, o desde creadoEn si falta", () => {
    const ahora = Date.parse("2026-09-10T12:00:00Z");
    expect(diasEnEtapa(nuevoCliente({ etapaDesde: "2026-09-01T00:00:00Z" }), ahora)).toBe(9);
    const sin = nuevoCliente({ creadoEn: "2026-09-08T00:00:00Z" });
    delete sin.etapaDesde;
    expect(diasEnEtapa(sin, ahora)).toBe(2);
  });

  it("la última interacción es la de fecha más reciente", () => {
    const c = nuevoCliente({
      interacciones: [
        { id: "1", tipo: "llamada", fecha: "2026-09-01", texto: "a", creadoEn: "2026-09-01T10:00:00Z" },
        { id: "2", tipo: "visita", fecha: "2026-09-05", texto: "b", creadoEn: "2026-09-05T10:00:00Z" },
      ],
    });
    expect(ultimaInteraccion(c)?.id).toBe("2");
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
