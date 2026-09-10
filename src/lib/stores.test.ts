import { describe, expect, it } from "vitest";
import { generarCodigo, normalizarParametros } from "./cotizaciones-store";
import { normalizarProyecto, slug } from "./proyectos-store";

describe("normalizarProyecto", () => {
  it("rechaza proyectos sin nombre, ubicación o tipologías válidas", () => {
    expect(normalizarProyecto(null)).toBeNull();
    expect(normalizarProyecto({ nombre: "X", lat: -33.4, lng: -70.6, tipologias: [] })).toBeNull();
    expect(
      normalizarProyecto({
        nombre: "X",
        lat: "abc",
        lng: -70.6,
        tipologias: [{ nombre: "1D", precioUF: 3000, m2Utiles: 40 }],
      }),
    ).toBeNull();
  });

  it("genera id, limpia números y acepta amenidades como texto", () => {
    const p = normalizarProyecto({
      nombre: "Edificio Ñuñoa Sur",
      lat: "-33.45",
      lng: "-70.60",
      estado: "otro",
      amenidades: "Quincho, Gimnasio ,, ",
      pieMinimoPct: "15",
      tipologias: [
        { nombre: "1D1B", precioUF: "3.500", m2Utiles: 40, dormitorios: 1 },
        { nombre: "", precioUF: 1, m2Utiles: 1 },
      ],
    })!;
    expect(p.id).toMatch(/^edificio-nunoa-sur-/);
    expect(p.lat).toBe(-33.45);
    expect(p.estado).toBe("en-verde");
    expect(p.amenidades).toEqual(["Quincho", "Gimnasio"]);
    expect(p.pieMinimoPct).toBe(15);
    expect(p.tipologias).toHaveLength(1);
    expect(p.tipologias[0].precioUF).toBe(3.5);
  });

  it("conserva el id al editar", () => {
    const p = normalizarProyecto({
      id: "macul-sur",
      nombre: "Macul Sur",
      lat: -33.5,
      lng: -70.6,
      tipologias: [{ nombre: "2D", precioUF: 4000, m2Utiles: 50 }],
    })!;
    expect(p.id).toBe("macul-sur");
  });

  it("slug quita tildes y símbolos", () => {
    expect(slug("Av. Irarrázaval 3.300 · Ñuñoa")).toBe("av-irarrazaval-3-300-nunoa");
  });
});

describe("cotizaciones", () => {
  it("normaliza parámetros con valores por defecto", () => {
    const p = normalizarParametros({ precioUF: 4000, plazoAnios: 99, incluirSeguros: false })!;
    expect(p.piePct).toBe(20);
    expect(p.plazoAnios).toBe(40);
    expect(p.incluirSeguros).toBe(false);
    expect(normalizarParametros({ precioUF: 0 })).toBeNull();
  });

  it("genera códigos de 8 caracteres sin ambigüedades", () => {
    const c = generarCodigo();
    expect(c).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);
    expect(generarCodigo()).not.toBe(c);
  });
});
