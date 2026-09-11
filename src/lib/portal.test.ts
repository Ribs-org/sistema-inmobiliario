import { describe, expect, it } from "vitest";
import type { Proyecto } from "@/data/proyectos";
import { nuevoCliente, type Cliente, type Etapa } from "./clientes";
import { nuevoTokenPortal, porToken, subibles, vistaPortal } from "./portal";

const proyecto = {
  id: "p1",
  nombre: "Edificio Prueba",
  tipologias: [
    { id: "a", nombre: "2D1B", precioUF: 3000, m2Utiles: 50, dormitorios: 2, banos: 1, disponibles: 4 },
  ],
} as unknown as Proyecto;

const cliente = (etapa: Etapa, extra: Partial<Cliente> = {}) =>
  nuevoCliente({
    nombre: "Camila Rojas Pérez",
    telefono: "+56 9 1234 5678",
    email: "camila@ejemplo.cl",
    notas: "Ojo: su tope real es menor al que declara",
    proyectoId: "p1",
    tipologiaId: "a",
    etapa,
    tipoRenta: "dependiente",
    vendedorNombre: "Tomás Reyes",
    ...extra,
  });

describe("nuevoTokenPortal", () => {
  it("genera llaves largas y distintas cada vez", () => {
    const tokens = new Set(Array.from({ length: 50 }, nuevoTokenPortal));
    expect(tokens.size).toBe(50);
    for (const t of tokens) expect(t.length).toBeGreaterThanOrEqual(32);
  });
});

describe("porToken", () => {
  it("encuentra al dueño del token y a nadie más", () => {
    const a = cliente("reserva", { tokenPortal: nuevoTokenPortal() });
    const b = cliente("reserva", { tokenPortal: nuevoTokenPortal() });
    expect(porToken([a, b], a.tokenPortal!)?.id).toBe(a.id);
    expect(porToken([a, b], "otro-token-cualquiera-largo")).toBeUndefined();
  });

  it("nunca calza con clientes sin portal generado", () => {
    const sinPortal = cliente("reserva");
    expect(porToken([sinPortal], "")).toBeUndefined();
    expect(porToken([sinPortal], "corto")).toBeUndefined();
  });
});

describe("vistaPortal", () => {
  it("no deja salir datos internos del cliente", () => {
    const c = cliente("reserva", { proximoContacto: "2026-04-01", motivoPerdida: null });
    const v = vistaPortal(c, proyecto);
    const texto = JSON.stringify(v);
    expect(texto).not.toContain("Ojo: su tope real");
    expect(texto).not.toContain("+56 9 1234 5678");
    expect(texto).not.toContain("camila@ejemplo.cl");
    expect(texto).not.toContain("2026-04-01");
    // La lista de campos es cerrada a propósito: si alguien agrega uno, esta prueba lo delata.
    expect(Object.keys(v).sort()).toEqual([
      "broker",
      "documentos",
      "listos",
      "nombre",
      "pct",
      "proyecto",
      "tipologia",
      "total",
    ]);
    expect(v).not.toHaveProperty("etapa");
    expect(v).not.toHaveProperty("id");
  });

  it("muestra el proyecto, la tipología y el broker", () => {
    const v = vistaPortal(cliente("reserva"), proyecto);
    expect(v.proyecto).toBe("Edificio Prueba");
    expect(v.tipologia).toBe("2D1B");
    expect(v.broker).toBe("Tomás Reyes");
  });

  it("esconde los documentos marcados como no aplica", () => {
    const c = cliente("reserva", {
      documentos: [{ id: "liquidaciones", estado: "no-aplica", actualizadoEn: "2026-03-01T00:00:00.000Z" }],
    });
    const v = vistaPortal(c, proyecto);
    expect(v.documentos.some((d) => d.id === "liquidaciones")).toBe(false);
  });

  it("marca quién sube cada documento y traslada la observación", () => {
    const c = cliente("reserva", {
      documentos: [
        {
          id: "cedula",
          estado: "observado",
          nota: "La foto salió cortada",
          actualizadoEn: "2026-03-01T00:00:00.000Z",
        },
      ],
    });
    const v = vistaPortal(c, proyecto);
    const cedula = v.documentos.find((d) => d.id === "cedula")!;
    expect(cedula.loSubeElCliente).toBe(true);
    expect(cedula.observacion).toBe("La foto salió cortada");
    // La preaprobación la pide el banco: el cliente no tiene que subirla.
    expect(v.documentos.find((d) => d.id === "preaprobacion")!.loSubeElCliente).toBe(false);
  });

  it("una nota que no es observación no viaja al portal", () => {
    const c = cliente("reserva", {
      documentos: [
        {
          id: "cedula",
          estado: "recibido",
          nota: "revisar con legal",
          actualizadoEn: "2026-03-01T00:00:00.000Z",
        },
      ],
    });
    const cedula = vistaPortal(c, proyecto).documentos.find((d) => d.id === "cedula")!;
    expect(cedula.observacion).toBeUndefined();
  });

  it("antes de la reserva el portal no pide nada", () => {
    expect(vistaPortal(cliente("contactado"), proyecto).documentos).toHaveLength(0);
  });
});

describe("subibles", () => {
  it("solo acepta documentos que le corresponden al cliente", () => {
    const ids = subibles(cliente("reserva")).map((d) => d.id);
    expect(ids).toContain("cedula");
    expect(ids).toContain("liquidaciones");
    // Del banco y de etapas que aún no llegan, no.
    expect(ids).not.toContain("preaprobacion");
    expect(ids).not.toContain("promesa-firmada");
  });

  it("no acepta los marcados como no aplica", () => {
    const c = cliente("reserva", {
      documentos: [{ id: "cedula", estado: "no-aplica", actualizadoEn: "2026-03-01T00:00:00.000Z" }],
    });
    expect(subibles(c).map((d) => d.id)).not.toContain("cedula");
  });
});
