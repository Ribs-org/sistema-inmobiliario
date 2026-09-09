import { afterEach, describe, expect, it } from "vitest";
import { claveCorrecta, sesionValida, tokenSesion } from "./acceso";

const original = process.env.CLAVE_INTERNA;
afterEach(() => {
  if (original === undefined) delete process.env.CLAVE_INTERNA;
  else process.env.CLAVE_INTERNA = original;
});

describe("acceso", () => {
  it("acepta la clave configurada y rechaza otras", () => {
    process.env.CLAVE_INTERNA = "secreta-123";
    expect(claveCorrecta("secreta-123")).toBe(true);
    expect(claveCorrecta(" secreta-123 ")).toBe(true);
    expect(claveCorrecta("otra")).toBe(false);
    expect(claveCorrecta("")).toBe(false);
  });

  it("la sesión depende de la clave: cambiarla invalida cookies anteriores", () => {
    process.env.CLAVE_INTERNA = "a";
    const cookie = tokenSesion();
    expect(sesionValida(cookie)).toBe(true);
    process.env.CLAVE_INTERNA = "b";
    expect(sesionValida(cookie)).toBe(false);
    expect(sesionValida(undefined)).toBe(false);
  });
});
