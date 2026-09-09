"use client";

import { useMemo, useState } from "react";
import { CARGA_MAXIMA_RENTA, cuotaPie, simularCredito } from "@/lib/credito";
import { fmtCLP, fmtPct, fmtUF } from "@/lib/format";
import type { InfoUF } from "@/lib/uf";
import { Interruptor } from "./ui";

export type PresetSimulador = {
  id: string;
  etiqueta: string;
  precioUF: number;
  piePct: number;
  bonoPiePct: number;
  pieEnCuotas: boolean;
};

type Props = {
  valorUF: number;
  infoUF: InfoUF;
  onCambiarUF: (v: number) => void;
  preset: PresetSimulador | null;
  onQuitarPreset: () => void;
};

const PLAZOS = [15, 20, 25, 30];
const TASA_REFERENCIA = 4.4;

export default function Simulador({ valorUF, infoUF, onCambiarUF, preset, onQuitarPreset }: Props) {
  const [precioUF, setPrecioUF] = useState(preset?.precioUF ?? 4000);
  const [piePct, setPiePct] = useState(preset?.piePct ?? 20);
  const [bonoPiePct, setBonoPiePct] = useState(preset?.bonoPiePct ?? 0);
  const [pieEnCuotas, setPieEnCuotas] = useState(preset?.pieEnCuotas ?? false);
  const [mesesEntrega, setMesesEntrega] = useState(18);
  const [plazoAnios, setPlazo] = useState(25);
  const [tasaAnualPct, setTasa] = useState(TASA_REFERENCIA);
  const [incluirSeguros, setSeguros] = useState(true);
  const [rentaCLP, setRenta] = useState<number | "">("");
  const [vistaTabla, setVistaTabla] = useState<"anual" | "mensual">("anual");

  const params = useMemo(
    () => ({
      precioUF,
      piePct,
      bonoPiePct,
      plazoAnios,
      tasaAnualPct,
      valorUF,
      incluirSeguros,
      rentaMensualCLP: rentaCLP === "" ? undefined : rentaCLP,
    }),
    [precioUF, piePct, bonoPiePct, plazoAnios, tasaAnualPct, valorUF, incluirSeguros, rentaCLP],
  );
  const r = useMemo(() => simularCredito(params), [params]);

  const comparacion = useMemo(
    () => PLAZOS.map((anios) => ({ anios, r: simularCredito({ ...params, plazoAnios: anios }) })),
    [params],
  );

  const porAnio = useMemo(() => {
    const filas: { anio: number; interesUF: number; amortizacionUF: number; saldoUF: number }[] = [];
    for (let i = 0; i < r.tabla.length; i += 12) {
      const grupo = r.tabla.slice(i, i + 12);
      filas.push({
        anio: i / 12 + 1,
        interesUF: grupo.reduce((s, c) => s + c.interesUF, 0),
        amortizacionUF: grupo.reduce((s, c) => s + c.amortizacionUF, 0),
        saldoUF: grupo[grupo.length - 1].saldoUF,
      });
    }
    return filas;
  }, [r.tabla]);

  const clp = (uf: number) => fmtCLP(uf * valorUF);
  const cuotaPieUF = cuotaPie(r.pieClienteUF, mesesEntrega);
  const cargaOk = r.cargaRentaPct !== null && r.cargaRentaPct <= CARGA_MAXIMA_RENTA * 100;

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Simulador de crédito hipotecario</h2>
            <p className="text-sm text-ink-muted">
              Amortización francesa en UF. Valores referenciales, no constituyen una oferta.
            </p>
          </div>
          {preset && (
            <div className="flex items-center gap-2 rounded-full border border-select bg-select-soft px-3 py-1 text-xs">
              <span>{preset.etiqueta}</span>
              <button type="button" onClick={onQuitarPreset} className="font-semibold hover:underline">
                Quitar
              </button>
            </div>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ---------------- formulario ---------------- */}
          <form
            className="space-y-5 rounded-xl border border-line bg-panel p-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <Campo etiqueta="Precio de la propiedad" ayuda={clp(precioUF)}>
              <EntradaNumero valor={precioUF} onChange={setPrecioUF} prefijo="UF" min={500} step={50} />
            </Campo>

            <Campo etiqueta={`Pie ${piePct} %`} ayuda={`${fmtUF(r.pieUF)} · ${clp(r.pieUF)}`}>
              <input
                type="range"
                min={10}
                max={50}
                step={1}
                value={piePct}
                onChange={(e) => setPiePct(Number(e.target.value))}
                className="w-full"
                aria-label="Pie como porcentaje del precio"
              />
            </Campo>

            <Campo
              etiqueta={`Bono pie de la inmobiliaria ${bonoPiePct} %`}
              ayuda={bonoPiePct ? `Cubre ${fmtUF(r.bonoPieUF)} del pie` : "Sin bono"}
            >
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={bonoPiePct}
                onChange={(e) => setBonoPiePct(Number(e.target.value))}
                className="w-full"
                aria-label="Bono pie como porcentaje del precio"
              />
            </Campo>

            <div className="space-y-2 rounded-lg bg-fondo/70 p-3">
              <Interruptor
                activo={pieEnCuotas}
                onChange={setPieEnCuotas}
                label="Pagar el pie en cuotas hasta la entrega"
              />
              {pieEnCuotas && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <span className="text-ink-muted">Meses</span>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={mesesEntrega}
                      onChange={(e) => setMesesEntrega(Math.max(1, Number(e.target.value)))}
                      className="w-16 rounded-md border border-line px-2 py-1 text-right"
                    />
                  </label>
                  <span className="text-right">
                    <span className="block font-semibold">{fmtUF(cuotaPieUF, 2)} / mes</span>
                    <span className="block text-xs text-ink-faint">{clp(cuotaPieUF)}</span>
                  </span>
                </div>
              )}
            </div>

            <Campo etiqueta="Plazo">
              <div
                className="grid grid-cols-4 gap-1 rounded-md bg-fondo p-1"
                role="radiogroup"
                aria-label="Plazo en años"
              >
                {PLAZOS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={plazoAnios === a}
                    onClick={() => setPlazo(a)}
                    className={`rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                      plazoAnios === a ? "bg-panel text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {a} años
                  </button>
                ))}
              </div>
            </Campo>

            <div className="space-y-5">
              <Campo etiqueta="Tasa anual en UF" ayuda={`Referencia mercado ${TASA_REFERENCIA} %`}>
                <EntradaNumero
                  valor={tasaAnualPct}
                  onChange={setTasa}
                  sufijo="%"
                  min={0}
                  max={15}
                  step={0.1}
                />
              </Campo>
              <Campo
                etiqueta="Valor UF"
                ayuda={
                  infoUF.fuente === "mindicador.cl"
                    ? `mindicador.cl · ${infoUF.fecha?.slice(0, 10) ?? ""}`
                    : infoUF.fuente === "manual"
                      ? "Editado a mano"
                      : "Valor de respaldo"
                }
              >
                <EntradaNumero valor={valorUF} onChange={onCambiarUF} prefijo="$" min={1000} step={10} />
              </Campo>
            </div>

            <Interruptor
              activo={incluirSeguros}
              onChange={setSeguros}
              label="Incluir seguros de desgravamen e incendio"
              descripcion="Tasas referenciales sobre saldo y valor de la propiedad"
            />

            <Campo
              etiqueta="Renta líquida mensual del comprador"
              ayuda="Opcional, para revisar la carga del dividendo"
            >
              <EntradaNumero
                valor={rentaCLP === "" ? 0 : rentaCLP}
                onChange={(v) => setRenta(v > 0 ? v : "")}
                prefijo="$"
                min={0}
                step={50000}
                placeholder="0"
              />
            </Campo>
          </form>

          {/* ---------------- resultados ---------------- */}
          <div className="space-y-5">
            <section className="rounded-xl bg-ink p-5 text-white">
              <div className="text-sm text-white/70">
                Dividendo mensual{incluirSeguros ? " con seguros" : ""}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="display text-4xl font-semibold tracking-tight">
                  {fmtUF(r.dividendoTotalUF, 2)}
                </span>
                <span className="text-xl text-white/85">{clp(r.dividendoTotalUF)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Hecho t="Crédito" v={fmtUF(r.montoCreditoUF)} s={clp(r.montoCreditoUF)} oscuro />
                <Hecho t="Pie del cliente" v={fmtUF(r.pieClienteUF)} s={clp(r.pieClienteUF)} oscuro />
                <Hecho
                  t="Renta mínima"
                  v={fmtCLP(r.rentaMinimaCLP)}
                  s={`dividendo ≤ ${CARGA_MAXIMA_RENTA * 100} % de la renta`}
                  oscuro
                />
                <Hecho t="Solo dividendo" v={fmtUF(r.dividendoUF, 2)} s={clp(r.dividendoUF)} oscuro />
                <Hecho
                  t="Seguros"
                  v={fmtUF(r.seguroDesgravamenUF + r.seguroIncendioUF, 2)}
                  s={`desgravamen ${fmtUF(r.seguroDesgravamenUF, 2)} · incendio ${fmtUF(r.seguroIncendioUF, 2)}`}
                  oscuro
                />
                <Hecho
                  t="Gastos operacionales"
                  v={fmtUF(r.gastosOperacionalesUF)}
                  s={`${clp(r.gastosOperacionalesUF)} aprox. una vez`}
                  oscuro
                />
              </dl>
              {r.cargaRentaPct !== null && (
                <p
                  className={`mt-4 rounded-md px-3 py-2 text-sm ${
                    cargaOk ? "bg-white/10 text-white" : "bg-select text-ink"
                  }`}
                >
                  El dividendo equivale al {fmtPct(r.cargaRentaPct)} de la renta indicada.{" "}
                  {cargaOk
                    ? "Está dentro del rango que suelen aceptar los bancos."
                    : `Supera el ${CARGA_MAXIMA_RENTA * 100} % habitual: conviene más pie, más plazo o complementar renta.`}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-line bg-panel p-4">
              <h3 className="text-sm font-semibold">Comparación por plazo</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-muted">
                    <tr>
                      <th className="py-1.5 font-medium">Plazo</th>
                      <th className="py-1.5 font-medium">Dividendo</th>
                      <th className="py-1.5 font-medium">En pesos</th>
                      <th className="py-1.5 font-medium">Intereses totales</th>
                      <th className="py-1.5 font-medium">Total pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparacion.map(({ anios, r: c }) => (
                      <tr
                        key={anios}
                        className={`border-t border-line-soft ${anios === plazoAnios ? "bg-select-soft font-semibold" : ""}`}
                      >
                        <td className="py-1.5">{anios} años</td>
                        <td className="py-1.5">{fmtUF(c.dividendoTotalUF, 2)}</td>
                        <td className="py-1.5">{clp(c.dividendoTotalUF)}</td>
                        <td className="py-1.5">{fmtUF(c.totalInteresesUF)}</td>
                        <td className="py-1.5">{fmtUF(c.totalPagadoUF)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Tabla de amortización</h3>
                <div className="flex gap-1 rounded-md bg-fondo p-0.5 text-xs">
                  {(["anual", "mensual"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVistaTabla(v)}
                      className={`rounded px-2 py-1 ${vistaTabla === v ? "bg-panel shadow-sm" : "text-ink-muted"}`}
                    >
                      {v === "anual" ? "Por año" : "Primeros 24 meses"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="scroll-thin mt-2 max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-panel text-left text-xs text-ink-muted">
                    <tr>
                      <th className="py-1.5 font-medium">{vistaTabla === "anual" ? "Año" : "Mes"}</th>
                      <th className="py-1.5 font-medium">Interés</th>
                      <th className="py-1.5 font-medium">Amortización</th>
                      <th className="py-1.5 font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistaTabla === "anual"
                      ? porAnio.map((f) => (
                          <tr key={f.anio} className="border-t border-line-soft">
                            <td className="py-1">{f.anio}</td>
                            <td className="py-1">{fmtUF(f.interesUF, 2)}</td>
                            <td className="py-1">{fmtUF(f.amortizacionUF, 2)}</td>
                            <td className="py-1">{fmtUF(f.saldoUF, 2)}</td>
                          </tr>
                        ))
                      : r.tabla.slice(0, 24).map((c) => (
                          <tr key={c.n} className="border-t border-line-soft">
                            <td className="py-1">{c.n}</td>
                            <td className="py-1">{fmtUF(c.interesUF, 2)}</td>
                            <td className="py-1">{fmtUF(c.amortizacionUF, 2)}</td>
                            <td className="py-1">{fmtUF(c.saldoUF, 2)}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-xs text-ink-faint">
              Supuestos: tasa fija en UF, seguros de desgravamen 0,011 % mensual sobre saldo e incendio y
              sismo 0,018 % mensual sobre el valor de la propiedad, gastos operacionales con impuesto al mutuo
              de 0,8 %. Cada banco aplica sus propias condiciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{etiqueta}</span>
        {ayuda && <span className="truncate text-xs text-ink-muted">{ayuda}</span>}
      </div>
      {children}
    </div>
  );
}

function EntradaNumero({
  valor,
  onChange,
  prefijo,
  sufijo,
  min,
  max,
  step,
  placeholder,
}: {
  valor: number;
  onChange: (v: number) => void;
  prefijo?: string;
  sufijo?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center rounded-md border border-line bg-panel focus-within:border-accent">
      {prefijo && <span className="pl-2.5 text-sm text-ink-muted">{prefijo}</span>}
      <input
        type="number"
        value={valor === 0 && placeholder ? "" : valor}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full bg-transparent px-2 py-1.5 text-right text-sm outline-none"
      />
      {sufijo && <span className="pr-2.5 text-sm text-ink-muted">{sufijo}</span>}
    </div>
  );
}

function Hecho({ t, v, s, oscuro }: { t: string; v: string; s?: string; oscuro?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={`text-xs ${oscuro ? "text-white/60" : "text-ink-muted"}`}>{t}</dt>
      <dd className="font-semibold">{v}</dd>
      {s && <dd className={`text-xs ${oscuro ? "text-white/60" : "text-ink-faint"}`}>{s}</dd>}
    </div>
  );
}
