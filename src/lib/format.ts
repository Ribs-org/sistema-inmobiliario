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
