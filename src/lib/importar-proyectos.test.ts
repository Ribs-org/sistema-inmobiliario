import { describe, expect, it } from "vitest";
import { parsearCSV, proyectosDesdeCSV, proyectosDesdeJSON } from "./importar-proyectos";

describe("parsearCSV", () => {
  it("detecta el separador y respeta comillas", () => {
    const filas = parsearCSV('a;b;c\n1;"x;y";"di""jo"\n');
    expect(filas).toEqual([
      ["a", "b", "c"],
      ["1", "x;y", 'di"jo'],
    ]);
    expect(parsearCSV("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("proyectosDesdeCSV", () => {
  const cab =
    "proyecto_id;proyecto;inmobiliaria;comuna;direccion;lat;lng;estado;entrega;pisos;unidades;pie_minimo_pct;bono_pie_pct;pie_en_cuotas;descripcion;amenidades;tipologia;dormitorios;banos;m2_utiles;m2_terraza;precio_uf;orientacion;disponibles";

  it("agrupa filas por proyecto y acepta decimales con coma", () => {
    const csv = [
      cab,
      "torre-a;Torre A;Inmo;Ñuñoa;Irarrázaval 100;-33,4555;-70,6215;En verde;2027;12;80;10;5;sí;Linda;Quincho, Gym;1D1B;1;1;38,5;4;3.250;Norte;5",
      "torre-a;;;;;;;;;;;;;;;;2D2B;2;2;62;8;5.100;Oriente;3",
    ].join("\n");
    const { proyectos, errores } = proyectosDesdeCSV(csv);
    expect(errores).toEqual([]);
    expect(proyectos).toHaveLength(1);
    const p = proyectos[0];
    expect(p.lat).toBe(-33.4555);
    expect(p.estado).toBe("en-verde");
    expect(p.pieEnCuotas).toBe(true);
    expect(p.tipologias).toHaveLength(2);
    expect(p.tipologias[0].m2Utiles).toBe(38.5);
    expect(p.tipologias[0].precioUF).toBe(3250);
    expect(p.tipologias[1].id).toBe("b");
  });

  it("informa filas inválidas sin abortar el resto", () => {
    const csv = [
      cab,
      "x;Sin coords;;;;;;;;;;;;;;;1D;1;1;30;0;2000;;1",
      "y;Bien;;;;-33,4;-70,6;;;;;;;;;;1D;1;1;30;0;2000;;1",
    ].join("\n");
    const { proyectos, errores } = proyectosDesdeCSV(csv);
    expect(proyectos.map((p) => p.nombre)).toEqual(["Bien"]);
    expect(errores[0]).toContain("Sin coords");
  });

  it("exige columnas mínimas", () => {
    expect(proyectosDesdeCSV("proyecto;lat\nA;1").errores[0]).toContain("Faltan columnas");
  });
});

describe("proyectosDesdeJSON", () => {
  it("acepta arreglo u objeto con proyectos", () => {
    expect(proyectosDesdeJSON('[{"id":"a","nombre":"A","tipologias":[]}]').proyectos).toHaveLength(1);
    expect(proyectosDesdeJSON('{"proyectos":[{"id":"a"}]}').proyectos).toHaveLength(1);
    expect(proyectosDesdeJSON("{no").errores).toHaveLength(1);
  });
});
