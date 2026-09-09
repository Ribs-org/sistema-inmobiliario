import { describe, expect, it } from "vitest";
import { dentroDeRadio, distanciaM, metroCercano, minutosCaminando } from "./geo";
import { PROYECTOS } from "@/data/proyectos";

describe("distanciaM", () => {
  it("Baquedano → Los Leones ≈ 3,1 km", () => {
    const d = distanciaM({ lat: -33.437, lng: -70.6345 }, { lat: -33.4222, lng: -70.606 });
    expect(d).toBeGreaterThan(3000);
    expect(d).toBeLessThan(3250);
  });
});

describe("metroCercano", () => {
  it("Independencia 1250 queda junto a Hospitales (L3)", () => {
    const p = PROYECTOS.find((x) => x.id === "independencia-norte")!;
    const { actual, futura } = metroCercano(p);
    expect(actual?.estacion.nombre).toBe("Hospitales");
    expect(actual!.distanciaM).toBeLessThan(700);
    expect(futura).toBeNull();
  });

  it("Vista Estoril no tiene metro hoy pero sí con L7", () => {
    const p = PROYECTOS.find((x) => x.id === "vista-estoril")!;
    const { actual, futura } = metroCercano(p);
    expect(actual!.distanciaM).toBeGreaterThan(1500);
    expect(futura?.estacion.lineaId).toBe("L7");
    expect(futura!.distanciaM).toBeLessThan(600);
  });
});

describe("dentroDeRadio", () => {
  it("ordena por distancia y filtra por radio", () => {
    const r = dentroDeRadio({ lat: -33.4262, lng: -70.6472 }, PROYECTOS, 1500);
    expect(r[0].item.id).toBe("patronato-recoleta");
    expect(r.every((x) => x.distanciaM <= 1500)).toBe(true);
  });
});

describe("minutosCaminando", () => {
  it("800 m ≈ 10 min", () => {
    expect(minutosCaminando(800)).toBe(10);
  });
});
