import { describe, expect, it } from "vitest";
import { nuevoCliente, sumarDiasISO, type Cliente, type Etapa } from "./clientes";
import { correoResumen, resumenPorBroker } from "./resumen";

const HOY = "2026-03-10";
const haceDias = (n: number) => sumarDiasISO(HOY, -n);

function cliente(p: {
  nombre: string;
  etapa?: Etapa;
  proximoContacto?: string | null;
  vendedorId?: string | null;
  diasEnEtapa?: number;
}): Cliente {
  const etapaDesde = `${haceDias(p.diasEnEtapa ?? 0)}T09:00:00.000Z`;
  return nuevoCliente({
    nombre: p.nombre,
    etapa: p.etapa ?? "contactado",
    proximoContacto: p.proximoContacto ?? null,
    vendedorId: p.vendedorId ?? null,
    etapaDesde,
    creadoEn: etapaDesde,
  });
}

const nombres = {
  u1: { nombre: "Camila Rojas", email: "camila@demo.cl" },
  u2: { nombre: "Diego Soto", email: "diego@demo.cl" },
};

describe("resumenPorBroker", () => {
  it("separa atrasados, los de hoy y los estancados por vendedor", () => {
    const clientes = [
      cliente({ nombre: "Atrasada", proximoContacto: haceDias(3), vendedorId: "u1" }),
      cliente({ nombre: "De hoy", proximoContacto: HOY, vendedorId: "u1" }),
      cliente({ nombre: "Futura", proximoContacto: sumarDiasISO(HOY, 4), vendedorId: "u1" }),
      cliente({ nombre: "Quieta", vendedorId: "u1", diasEnEtapa: 30 }),
      cliente({ nombre: "De Diego", proximoContacto: HOY, vendedorId: "u2" }),
    ];
    const r = resumenPorBroker(clientes, nombres, HOY);
    const camila = r.find((x) => x.vendedorId === "u1")!;
    expect(camila.nombre).toBe("Camila Rojas");
    expect(camila.atrasados.map((l) => l.nombre)).toEqual(["Atrasada"]);
    expect(camila.hoy.map((l) => l.nombre)).toEqual(["De hoy"]);
    expect(camila.estancados.map((l) => l.nombre)).toEqual(["Quieta"]);
    expect(camila.vacio).toBe(false);
    expect(r.find((x) => x.vendedorId === "u2")!.hoy).toHaveLength(1);
  });

  it("un cliente atrasado no se cuenta además como estancado", () => {
    const clientes = [
      cliente({
        nombre: "Vieja y atrasada",
        proximoContacto: haceDias(2),
        vendedorId: "u1",
        diasEnEtapa: 40,
      }),
    ];
    const [r] = resumenPorBroker(clientes, nombres, HOY);
    expect(r.atrasados).toHaveLength(1);
    expect(r.estancados).toHaveLength(0);
  });

  it("ignora las etapas cerradas y marca vacío cuando no hay nada que hacer", () => {
    const clientes = [
      cliente({ nombre: "Escriturada", etapa: "escritura", proximoContacto: haceDias(5), vendedorId: "u1" }),
      cliente({ nombre: "Perdida", etapa: "perdido", proximoContacto: haceDias(5), vendedorId: "u1" }),
    ];
    const [r] = resumenPorBroker(clientes, nombres, HOY);
    expect(r.vacio).toBe(true);
  });

  it("agrupa los clientes sin vendedor y ordena por atrasados", () => {
    const clientes = [
      cliente({ nombre: "Sin dueño", proximoContacto: haceDias(1) }),
      cliente({ nombre: "A", proximoContacto: haceDias(1), vendedorId: "u1" }),
      cliente({ nombre: "B", proximoContacto: haceDias(2), vendedorId: "u1" }),
    ];
    const r = resumenPorBroker(clientes, nombres, HOY);
    expect(r[0].vendedorId).toBe("u1");
    expect(r[1].nombre).toBe("Sin asignar");
  });
});

describe("correoResumen", () => {
  it("nombra los atrasados en el asunto y escapa el HTML", () => {
    const clientes = [
      cliente({ nombre: 'Ana <script>"x"', proximoContacto: haceDias(1), vendedorId: "u1" }),
      cliente({ nombre: "Hoy uno", proximoContacto: HOY, vendedorId: "u1" }),
    ];
    const [r] = resumenPorBroker(clientes, nombres, HOY);
    const { asunto, html } = correoResumen(r, "https://pyxis.cl", HOY);
    expect(asunto).toBe("Pyxis: 1 cliente atrasado y 1 para hoy");
    expect(html).toContain("Camila");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("https://pyxis.cl/interno");
  });

  it("sin atrasados el asunto habla solo de las gestiones de hoy", () => {
    const clientes = [cliente({ nombre: "Único", proximoContacto: HOY, vendedorId: "u1" })];
    const [r] = resumenPorBroker(clientes, nombres, HOY);
    expect(correoResumen(r, "https://pyxis.cl", HOY).asunto).toBe("Pyxis: 1 gestión para hoy");
  });
});
