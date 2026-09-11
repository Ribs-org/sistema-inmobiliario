import { describe, expect, it } from "vitest";
import { parseNumero } from "./format";

describe("parseNumero", () => {
  it("lee el punto como separador de miles", () => {
    expect(parseNumero("4.200")).toBe(4200);
    expect(parseNumero("1.234.567")).toBe(1234567);
    expect(parseNumero("-1.500")).toBe(-1500);
  });

  it("lee la coma como decimal, con y sin miles", () => {
    expect(parseNumero("38,5")).toBe(38.5);
    expect(parseNumero("4.200,25")).toBe(4200.25);
    expect(parseNumero("-33,4555")).toBe(-33.4555);
  });

  it("trata el punto como decimal cuando no agrupa de a tres", () => {
    expect(parseNumero("4.2")).toBe(4.2);
    expect(parseNumero("-70.6501")).toBe(-70.6501);
  });

  it("acepta números y espacios; lo demás es NaN", () => {
    expect(parseNumero(3300)).toBe(3300);
    expect(parseNumero(" 1.200 ")).toBe(1200);
    expect(parseNumero("")).toBeNaN();
    expect(parseNumero("mil")).toBeNaN();
    expect(parseNumero(null)).toBeNaN();
    expect(parseNumero(undefined)).toBeNaN();
  });
});
