const nfUF = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const nfUF2 = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const nfNum = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

export function fmtUF(v: number, decimales: 0 | 2 = 0): string {
  return `UF ${decimales === 2 ? nfUF2.format(v) : nfUF.format(v)}`;
}

export function fmtCLP(v: number): string {
  return nfCLP.format(Math.round(v));
}

export function fmtNum(v: number): string {
  return nfNum.format(v);
}

export function fmtM2(v: number): string {
  return `${nfNum.format(v)} m²`;
}

export function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${nfNum.format(m / 1000)} km`;
}

export function fmtPct(v: number, decimales = 1): string {
  return `${v.toFixed(decimales).replace(".", ",")} %`;
}

/**
 * Lee un número escrito como se escribe en Chile: el punto separa miles y la coma decimales.
 * "4.200" es cuatro mil doscientos y "4.200,5" lleva medio más. Si no hay coma, un punto
 * solo agrupa miles cuando deja grupos de tres ("1.234"); si no, es decimal ("4.2").
 * Devuelve NaN cuando el texto no es un número.
 */
export function parseNumero(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  return Number(s);
}
