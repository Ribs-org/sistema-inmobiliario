/** Valor UF de respaldo cuando la API no responde (referencial, sep. 2026). */
export const UF_RESPALDO = 40350;

export type InfoUF = { valor: number; fecha: string | null; fuente: "mindicador.cl" | "respaldo" | "manual" };
