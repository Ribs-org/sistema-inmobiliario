import { describe, expect, it } from "vitest";
import { nuevoCliente, type Cliente, type Etapa, type TipoRenta } from "./clientes";
import { conDocumento, documentosDe, DOCUMENTOS, progresoDocumentos, resumenFaltantes } from "./documentos";

const cliente = (etapa: Etapa, tipoRenta?: TipoRenta, documentos?: Cliente["documentos"]) =>
  nuevoCliente({ nombre: "Prueba", etapa, tipoRenta, documentos });

describe("documentosDe", () => {
  it("antes de la reserva no corresponde ningún documento", () => {
    expect(documentosDe(cliente("contactado"))).toHaveLength(0);
    expect(documentosDe(cliente("visita"))).toHaveLength(0);
  });

  it("cada etapa suma los papeles de las anteriores", () => {
    const reserva = documentosDe(cliente("reserva"));
    const promesa = documentosDe(cliente("promesa"));
    const escritura = documentosDe(cliente("escritura"));
    expect(reserva.every((d) => d.etapa === "reserva")).toBe(true);
    expect(promesa.length).toBeGreaterThan(reserva.length);
    expect(escritura.length).toBeGreaterThan(promesa.length);
    expect(escritura.map((d) => d.id)).toEqual(expect.arrayContaining(reserva.map((d) => d.id)));
  });

  it("pide liquidaciones a quien tiene contrato y carpeta tributaria al independiente", () => {
    const ids = (t: TipoRenta) => documentosDe(cliente("reserva", t)).map((d) => d.id);
    expect(ids("dependiente")).toContain("liquidaciones");
    expect(ids("dependiente")).not.toContain("carpeta-sii");
    expect(ids("independiente")).toContain("carpeta-sii");
    expect(ids("independiente")).not.toContain("liquidaciones");
  });

  it("sin filtrar por etapa devuelve el proceso completo del tipo de renta", () => {
    const todos = documentosDe(cliente("nuevo", "dependiente"), false);
    expect(todos.length).toBe(DOCUMENTOS.filter((d) => d.renta !== "independiente").length);
  });
});

describe("progresoDocumentos", () => {
  const marcados = (pares: [string, string][]) =>
    pares.map(([id, estado]) => ({
      id,
      estado: estado as "recibido" | "no-aplica" | "observado" | "pendiente",
      actualizadoEn: "2026-03-10T12:00:00.000Z",
    }));

  it("cuenta recibidos y 'no aplica' como resueltos", () => {
    const c = cliente(
      "reserva",
      "dependiente",
      marcados([
        ["cedula", "recibido"],
        ["liquidaciones", "no-aplica"],
        ["deudas-cmf", "observado"],
      ]),
    );
    const p = progresoDocumentos(c);
    expect(p.listos).toBe(2);
    expect(p.faltantes.map((d) => d.id)).toContain("deudas-cmf");
    expect(p.observados.map((d) => d.id)).toEqual(["deudas-cmf"]);
  });

  it("una carpeta completa llega a 100 y no deja faltantes", () => {
    const ids = documentosDe(cliente("reserva", "dependiente")).map((d) => d.id);
    const c = cliente("reserva", "dependiente", marcados(ids.map((id) => [id, "recibido"])));
    const p = progresoDocumentos(c);
    expect(p.pct).toBe(100);
    expect(p.faltantes).toHaveLength(0);
  });

  it("sin documentos que correspondan el porcentaje es cero y no hay resumen", () => {
    const c = cliente("nuevo");
    expect(progresoDocumentos(c)).toMatchObject({ total: 0, pct: 0 });
    expect(resumenFaltantes(c)).toBeNull();
  });

  it("el resumen nombra el primer faltante y cuenta el resto", () => {
    const c = cliente("reserva", "dependiente");
    const texto = resumenFaltantes(c)!;
    expect(texto).toMatch(/^Faltan \d+ documentos: cédula/);
  });
});

describe("conDocumento", () => {
  it("agrega el documento si no estaba y conserva los otros", () => {
    const lista = conDocumento(undefined, "cedula", { estado: "recibido" });
    const dos = conDocumento(lista, "deudas-cmf", { estado: "observado" });
    expect(dos.map((d) => d.id)).toEqual(["cedula", "deudas-cmf"]);
    expect(dos[0].estado).toBe("recibido");
  });

  it("al editar mantiene los campos que no se tocan", () => {
    const lista = conDocumento(undefined, "cedula", { estado: "recibido", ruta: "documentos/c1/cedula.pdf" });
    const editado = conDocumento(lista, "cedula", { nota: "ilegible", estado: "observado" });
    expect(editado).toHaveLength(1);
    expect(editado[0]).toMatchObject({
      estado: "observado",
      nota: "ilegible",
      ruta: "documentos/c1/cedula.pdf",
    });
  });

  it("puede borrar la ruta al quitar el archivo", () => {
    const lista = conDocumento(undefined, "cedula", { estado: "recibido", ruta: "documentos/c1/cedula.pdf" });
    const vacio = conDocumento(lista, "cedula", { estado: "pendiente", ruta: undefined });
    expect(vacio[0].ruta).toBeUndefined();
  });
});
