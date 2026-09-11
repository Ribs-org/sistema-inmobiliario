import { describe, expect, it } from "vitest";
import type { Proyecto } from "@/data/proyectos";
import {
  disponiblesDeTipologia,
  disponiblesTotales,
  generarUnidades,
  normalizarUnidades,
  ordenarUnidades,
  precioUnidad,
  tieneUnidades,
} from "./unidades";

const proyecto = (unidades?: Proyecto["unidadesDetalle"]): Proyecto => ({
  id: "p",
  nombre: "P",
  inmobiliaria: "",
  comuna: "",
  direccion: "",
  lat: -33.4,
  lng: -70.6,
  estado: "en-verde",
  entrega: "",
  pisos: 3,
  unidadesDetalle: unidades,
  unidades: 0,
  pieMinimoPct: 10,
  descripcion: "",
  amenidades: [],
  tipologias: [
    {
      id: "a",
      nombre: "1D",
      dormitorios: 1,
      banos: 1,
      m2Utiles: 36,
      m2Terraza: 4,
      precioUF: 3000,
      orientacion: "",
      disponibles: 7,
    },
    {
      id: "b",
      nombre: "2D",
      dormitorios: 2,
      banos: 1,
      m2Utiles: 48,
      m2Terraza: 6,
      precioUF: 4000,
      orientacion: "",
      disponibles: 5,
    },
  ],
});

describe("generarUnidades", () => {
  it("arma la grilla numerando piso + posición y alternando tipologías", () => {
    const u = generarUnidades(2, 3, ["a", "b"], 10);
    expect(u.map((x) => x.numero)).toEqual(["1001", "1002", "1003", "1101", "1102", "1103"]);
    expect(u.map((x) => x.tipologiaId)).toEqual(["a", "b", "a", "a", "b", "a"]);
    expect(u.every((x) => x.estado === "disponible")).toBe(true);
  });

  it("no genera nada con parámetros vacíos", () => {
    expect(generarUnidades(0, 3, ["a"])).toEqual([]);
    expect(generarUnidades(3, 3, [])).toEqual([]);
  });
});

describe("stock", () => {
  it("sin unidades usa el contador de la tipología", () => {
    const p = proyecto();
    expect(tieneUnidades(p)).toBe(false);
    expect(disponiblesDeTipologia(p, p.tipologias[0])).toBe(7);
    expect(disponiblesTotales(p)).toBe(12);
  });

  it("con unidades cuenta solo las disponibles", () => {
    const p = proyecto([
      { numero: "101", piso: 1, tipologiaId: "a", estado: "disponible" },
      { numero: "102", piso: 1, tipologiaId: "a", estado: "vendida" },
      { numero: "201", piso: 2, tipologiaId: "b", estado: "reservada" },
      { numero: "202", piso: 2, tipologiaId: "b", estado: "disponible" },
    ]);
    expect(disponiblesDeTipologia(p, p.tipologias[0])).toBe(1);
    expect(disponiblesDeTipologia(p, p.tipologias[1])).toBe(1);
    expect(disponiblesTotales(p)).toBe(2);
  });

  it("el precio propio de la unidad manda sobre el de la tipología", () => {
    const p = proyecto();
    expect(precioUnidad(p, { numero: "1", piso: 1, tipologiaId: "a", estado: "disponible" })).toBe(3000);
    expect(
      precioUnidad(p, { numero: "1", piso: 1, tipologiaId: "a", estado: "disponible", precioUF: 3300 }),
    ).toBe(3300);
  });
});

describe("normalizarUnidades", () => {
  it("descarta sin número, con tipología inexistente y repetidas", () => {
    const u = normalizarUnidades(
      [
        { numero: "101", piso: "1", tipologiaId: "a" },
        { numero: "", piso: 1, tipologiaId: "a" },
        { numero: "102", piso: 1, tipologiaId: "z" },
        { numero: "101", piso: 2, tipologiaId: "b" },
        { numero: "201", piso: 2, tipologiaId: "b", estado: "vendida", precioUF: "4.200" },
      ],
      ["a", "b"],
    )!;
    expect(u.map((x) => x.numero)).toEqual(["101", "201"]);
    expect(u[0].piso).toBe(1);
    expect(u[1].estado).toBe("vendida");
    expect(u[1].precioUF).toBe(4200);
  });

  it("sin arreglo devuelve undefined", () => {
    expect(normalizarUnidades(undefined, ["a"])).toBeUndefined();
    expect(normalizarUnidades([], ["a"])).toBeUndefined();
  });
});

describe("ordenarUnidades", () => {
  it("ordena por piso y número", () => {
    const u = ordenarUnidades([
      { numero: "1002", piso: 10, tipologiaId: "a", estado: "disponible" },
      { numero: "201", piso: 2, tipologiaId: "a", estado: "disponible" },
      { numero: "1001", piso: 10, tipologiaId: "a", estado: "disponible" },
    ]);
    expect(u.map((x) => x.numero)).toEqual(["201", "1001", "1002"]);
  });
});
