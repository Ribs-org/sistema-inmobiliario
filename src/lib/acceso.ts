// Cerradura interna: una clave compartida (CLAVE_INTERNA) que abre el área de clientes.
// La sesión es una cookie httpOnly con un HMAC derivado de la clave, así cambiar la
// clave en Vercel invalida todas las sesiones.

import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_SESION = "ribs_sesion";
export const DIAS_SESION = 30;
const CLAVE_POR_DEFECTO = "ribs2026";

export function claveInterna(): string {
  return process.env.CLAVE_INTERNA?.trim() || CLAVE_POR_DEFECTO;
}

export function usaClavePorDefecto(): boolean {
  return !process.env.CLAVE_INTERNA?.trim();
}

export function tokenSesion(clave = claveInterna()): string {
  return createHmac("sha256", clave).update("ribs:sesion:v1").digest("hex");
}

function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function claveCorrecta(intento: string): boolean {
  return igualSeguro(intento.trim(), claveInterna());
}

export function sesionValida(cookie: string | undefined): boolean {
  return !!cookie && igualSeguro(cookie, tokenSesion());
}
