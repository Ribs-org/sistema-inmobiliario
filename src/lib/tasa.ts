// Tasa de referencia para el simulador: promedio de créditos hipotecarios en UF a más de
// 3 años (Banco Central de Chile, serie F022.VIV.TIP.MA03.UF.Z.M, mensual).
// La API del BCCh exige usuario y clave gratuitos (BCCH_USER / BCCH_PASS).
// Sin credenciales se usa TASA_REFERENCIA_UF o un valor fijo, y se indica la fuente.

export const SERIE_HIPOTECARIA_UF = "F022.VIV.TIP.MA03.UF.Z.M";
export const TASA_RESPALDO = 4.4;

export type InfoTasa = {
  valorPct: number;
  /** Mes al que corresponde el dato (YYYY-MM) o null si es un valor fijo */
  periodo: string | null;
  fuente: "bcentral" | "env" | "respaldo";
  descripcion: string;
};

type RespuestaBCCh = {
  Codigo?: number;
  Descripcion?: string;
  Series?: { descripEsp?: string; Obs?: { indexDateString: string; value: string; statusCode?: string }[] };
};

/** Convierte "01-08-2026" (dd-mm-yyyy) en "2026-08". */
export function periodoDesdeFechaBCCh(fecha: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(fecha);
  return m ? `${m[3]}-${m[2]}` : null;
}

/** Última observación numérica de la serie, o null si no hay. */
export function ultimaObservacion(r: RespuestaBCCh): { valorPct: number; periodo: string | null } | null {
  const obs = r.Series?.Obs ?? [];
  for (let i = obs.length - 1; i >= 0; i--) {
    const v = Number(String(obs[i].value).replace(",", "."));
    if (Number.isFinite(v) && v > 0)
      return { valorPct: v, periodo: periodoDesdeFechaBCCh(obs[i].indexDateString) };
  }
  return null;
}

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function obtenerTasa(): Promise<InfoTasa> {
  const user = process.env.BCCH_USER;
  const pass = process.env.BCCH_PASS;
  if (user && pass) {
    try {
      const hasta = new Date();
      const desde = new Date(hasta);
      desde.setMonth(desde.getMonth() - 6);
      const u = new URL("https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx");
      u.searchParams.set("user", user);
      u.searchParams.set("pass", pass);
      u.searchParams.set("firstdate", fechaISO(desde));
      u.searchParams.set("lastdate", fechaISO(hasta));
      u.searchParams.set("timeseries", SERIE_HIPOTECARIA_UF);
      u.searchParams.set("function", "GetSeries");
      const r = await fetch(u, { next: { revalidate: 86400 } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as RespuestaBCCh;
      if (j.Codigo !== 0) throw new Error(j.Descripcion ?? "respuesta con error");
      const ultima = ultimaObservacion(j);
      if (!ultima) throw new Error("serie sin datos");
      return {
        ...ultima,
        fuente: "bcentral",
        descripcion: "Promedio créditos hipotecarios en UF a más de 3 años, Banco Central de Chile",
      };
    } catch (err) {
      console.warn("Tasa BCCh no disponible:", err);
    }
  }
  const env = Number(process.env.TASA_REFERENCIA_UF);
  if (Number.isFinite(env) && env > 0) {
    return {
      valorPct: env,
      periodo: null,
      fuente: "env",
      descripcion: "Tasa definida en TASA_REFERENCIA_UF",
    };
  }
  return {
    valorPct: TASA_RESPALDO,
    periodo: null,
    fuente: "respaldo",
    descripcion: "Valor referencial fijo",
  };
}
