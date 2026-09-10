import { describe, expect, it } from "vitest";
import { dentroDeRadio, distanciaM, metroCercano, minutosCaminando, minutosEstimados } from "./geo";
import { proyectosMuestra } from "@/data/proyectos-muestra";
import { ajustarAlTrazado, ESTACIONES, etiquetaLinea, LINEAS } from "@/data/metro";

const PROYECTOS = proyectosMuestra();

describe("distanciaM", () => {
  it("Baquedano → Los Leones ≈ 3,1 km", () => {
    const d = distanciaM({ lat: -33.437, lng: -70.6345 }, { lat: -33.4222, lng: -70.606 });
    expect(d).toBeGreaterThan(3000);
    expect(d).toBeLessThan(3250);
  });
});

describe("red de Metro importada", () => {
  it("las 7 líneas operativas vienen de OSM con trazado real", () => {
    const operativas = LINEAS.filter((l) => l.estado === "operativa");
    expect(operativas.map((l) => l.id)).toEqual(["L1", "L2", "L3", "L4", "L4A", "L5", "L6"]);
    for (const l of operativas) {
      expect(l.estaciones.length).toBeGreaterThan(5);
      expect(l.trazado!.length).toBeGreaterThan(l.estaciones.length);
    }
  });

  it("las combinaciones se deducen por nombre de estación", () => {
    const baquedanoL1 = ESTACIONES.find((s) => s.lineaId === "L1" && s.nombre === "Baquedano")!;
    expect(baquedanoL1.combina).toEqual(expect.arrayContaining(["L5", "L7"]));
    const l7 = LINEAS.find((l) => l.id === "L7")!;
    expect(l7.estaciones).toHaveLength(19);
    expect(l7.trazado!.length).toBeGreaterThan(100);
  });

  it("ajustarAlTrazado proyecta sobre el segmento más cercano", () => {
    const q = ajustarAlTrazado({ lat: -33.5, lng: -70.6 }, [
      [-33.4, -70.7],
      [-33.6, -70.7],
    ]);
    expect(q.lng).toBeCloseTo(-70.7, 5);
    expect(q.lat).toBeCloseTo(-33.5, 5);
  });

  it("etiquetaLinea acorta ids de tramos", () => {
    expect(etiquetaLinea("L6O")).toBe("L6");
    expect(etiquetaLinea("L9N")).toBe("L9");
    expect(etiquetaLinea("L4A")).toBe("L4A");
    expect(etiquetaLinea("LA")).toBe("LA");
  });
});

describe("metroCercano", () => {
  it("Independencia 1250 queda junto a Hospitales (L3), con ruta real por calle", () => {
    const p = PROYECTOS.find((x) => x.id === "independencia-norte")!;
    const { actual, futura } = metroCercano(p, p.caminatas);
    expect(actual?.estacion.nombre).toBe("Hospitales");
    expect(actual!.fuente).toBe("ruta");
    expect(actual!.caminataM).toBeGreaterThanOrEqual(actual!.distanciaM);
    expect(actual!.minutos).toBeLessThanOrEqual(5);
    expect(futura).toBeNull();
  });

  it("Vista Estoril no tiene metro hoy pero sí con L7", () => {
    const p = PROYECTOS.find((x) => x.id === "vista-estoril")!;
    const { actual, futura } = metroCercano(p, p.caminatas);
    expect(actual!.minutos).toBeGreaterThan(15);
    expect(futura?.estacion.lineaId).toBe("L7");
    expect(futura!.minutos).toBeLessThanOrEqual(10);
  });

  it("sin id de proyecto usa la estimación por factor de rodeo", () => {
    const { actual } = metroCercano({ lat: -33.437, lng: -70.6345 });
    expect(actual?.estacion.nombre).toBe("Baquedano");
    expect(actual!.fuente).toBe("estimada");
  });
});

describe("dentroDeRadio", () => {
  it("ordena por distancia y filtra por radio", () => {
    const r = dentroDeRadio({ lat: -33.4262, lng: -70.6472 }, PROYECTOS, 1500);
    expect(r[0].item.id).toBe("patronato-recoleta");
    expect(r.every((x) => x.distanciaM <= 1500)).toBe(true);
  });
});

describe("minutos", () => {
  it("800 m por calle ≈ 10 min; 800 m en línea recta ≈ 13 min", () => {
    expect(minutosCaminando(800)).toBe(10);
    expect(minutosEstimados(800)).toBe(13);
  });
});
