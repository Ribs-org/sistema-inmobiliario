import { describe, expect, it } from "vitest";
import { periodoDesdeFechaBCCh, ultimaObservacion } from "./tasa";

describe("tasa BCCh", () => {
  it("convierte la fecha dd-mm-yyyy a periodo", () => {
    expect(periodoDesdeFechaBCCh("01-08-2026")).toBe("2026-08");
    expect(periodoDesdeFechaBCCh("agosto")).toBeNull();
  });

  it("toma la última observación válida e ignora NaN", () => {
    const r = {
      Codigo: 0,
      Series: {
        Obs: [
          { indexDateString: "01-06-2026", value: "4.52" },
          { indexDateString: "01-07-2026", value: "4,41" },
          { indexDateString: "01-08-2026", value: "NaN", statusCode: "ND" },
        ],
      },
    };
    expect(ultimaObservacion(r)).toEqual({ valorPct: 4.41, periodo: "2026-07" });
    expect(ultimaObservacion({ Series: { Obs: [] } })).toBeNull();
  });
});
