import { PROYECTOS, type Proyecto } from "@/data/proyectos";
import { metroCercano, minutosCaminando, type EstacionCercana } from "@/lib/geo";

export type ProyectoEnriquecido = Proyecto & {
  precioMinUF: number;
  precioMaxUF: number;
  ufM2Min: number;
  ufM2Prom: number;
  metroActual: EstacionCercana | null;
  metroFuturo: EstacionCercana | null;
  /** Minutos caminando a la estación operativa más cercana */
  minActual: number;
  /** Minutos caminando considerando también estaciones futuras */
  minConFuturo: number;
};

export const PROYECTOS_ENRIQUECIDOS: ProyectoEnriquecido[] = PROYECTOS.map((p) => {
  const { actual, futura } = metroCercano(p);
  const precios = p.tipologias.map((t) => t.precioUF);
  const ufm2 = p.tipologias.map((t) => t.precioUF / t.m2Utiles);
  const minActual = actual ? minutosCaminando(actual.distanciaM) : 99;
  const minFuturo = futura ? minutosCaminando(futura.distanciaM) : minActual;
  return {
    ...p,
    precioMinUF: Math.min(...precios),
    precioMaxUF: Math.max(...precios),
    ufM2Min: Math.min(...ufm2),
    ufM2Prom: ufm2.reduce((a, b) => a + b, 0) / ufm2.length,
    metroActual: actual,
    metroFuturo: futura,
    minActual,
    minConFuturo: Math.min(minActual, minFuturo),
  };
});

export type Filtros = {
  comuna: string | "todas";
  dormitorios: number | "todos"; // 0 = estudio, 3 = 3+
  precioMaxUF: number;
  soloCercaMetro: boolean;
  considerarFuturo: boolean;
};

export const FILTROS_INICIALES: Filtros = {
  comuna: "todas",
  dormitorios: "todos",
  precioMaxUF: 21000,
  soloCercaMetro: false,
  considerarFuturo: true,
};

export const MINUTOS_CERCA_METRO = 10;

export function aplicarFiltros(lista: ProyectoEnriquecido[], f: Filtros): ProyectoEnriquecido[] {
  return lista.filter((p) => {
    if (f.comuna !== "todas" && p.comuna !== f.comuna) return false;
    const tips = p.tipologias.filter((t) => {
      if (t.precioUF > f.precioMaxUF) return false;
      if (f.dormitorios === "todos") return true;
      if (f.dormitorios === 3) return t.dormitorios >= 3;
      return t.dormitorios === f.dormitorios;
    });
    if (tips.length === 0) return false;
    if (f.soloCercaMetro) {
      const min = f.considerarFuturo ? p.minConFuturo : p.minActual;
      if (min > MINUTOS_CERCA_METRO) return false;
    }
    return true;
  });
}
