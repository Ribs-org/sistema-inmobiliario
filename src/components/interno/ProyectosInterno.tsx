"use client";

import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { ETIQUETA_ESTADO_VENTA, type EstadoVenta, type Proyecto, type Tipologia } from "@/data/proyectos";
import { fmtUF } from "@/lib/format";
import { proyectosDesdeCSV, proyectosDesdeJSON, proyectosDesdeXLSX } from "@/lib/importar-proyectos";
import { BadgeEstado } from "@/components/ui";

type Props = {
  proyectos: Proyecto[];
  origen: "redis" | "muestra";
  onCambio: (lista: Proyecto[], origen: "redis" | "muestra") => void;
  onBloqueado: () => void;
};

type MiniMapaProps = { lat: number; lng: number; onMover: (lat: number, lng: number) => void };

const INPUT = "w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm focus:border-accent";
const CENTRO_SANTIAGO = { lat: -33.4489, lng: -70.6693 };

function tipologiaVacia(i: number): Tipologia {
  return {
    id: String.fromCharCode(97 + i),
    nombre: "",
    dormitorios: 1,
    banos: 1,
    m2Utiles: 0,
    m2Terraza: 0,
    precioUF: 0,
    orientacion: "",
    disponibles: 0,
  };
}

function proyectoVacio(): Proyecto {
  return {
    id: "",
    nombre: "",
    inmobiliaria: "",
    comuna: "",
    direccion: "",
    lat: CENTRO_SANTIAGO.lat,
    lng: CENTRO_SANTIAGO.lng,
    estado: "en-verde",
    entrega: "",
    pisos: 0,
    unidades: 0,
    pieMinimoPct: 10,
    bonoPiePct: undefined,
    pieEnCuotas: false,
    descripcion: "",
    amenidades: [],
    tipologias: [tipologiaVacia(0)],
  };
}

export default function ProyectosInterno({ proyectos, origen, onCambio, onBloqueado }: Props) {
  const [editando, setEditando] = useState<Proyecto | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const llamar = async (init: RequestInit, url = "/api/proyectos") => {
    const r = await fetch(url, init);
    if (r.status === 401) {
      onBloqueado();
      throw new Error("Sesión vencida");
    }
    const j = (await r.json()) as { proyectos?: Proyecto[]; origen?: "redis" | "muestra"; error?: string };
    if (!r.ok || !j.proyectos) throw new Error(j.error ?? "No se pudo guardar");
    onCambio(j.proyectos, j.origen ?? "redis");
  };

  const importarMuestra = async () => {
    setOcupado("importar");
    setAviso(null);
    try {
      await llamar({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importarMuestra: true }),
      });
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Error");
    } finally {
      setOcupado(null);
    }
  };

  const guardar = async (p: Proyecto) => {
    setOcupado("guardar");
    setAviso(null);
    try {
      await llamar({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      });
      setEditando(null);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Error");
    } finally {
      setOcupado(null);
    }
  };

  const [resultadoImport, setResultadoImport] = useState<{ importados: number; errores: string[] } | null>(
    null,
  );

  const importarArchivo = async (archivo: File) => {
    setOcupado("archivo");
    setAviso(null);
    setResultadoImport(null);
    try {
      const nombre = archivo.name.toLowerCase();
      const { proyectos: lista, errores } = /\.xlsx?$/.test(nombre)
        ? await proyectosDesdeXLSX(await archivo.arrayBuffer())
        : nombre.endsWith(".json")
          ? proyectosDesdeJSON(await archivo.text())
          : proyectosDesdeCSV(await archivo.text());
      if (lista.length === 0) {
        setResultadoImport({
          importados: 0,
          errores: errores.length ? errores : ["El archivo no tiene proyectos"],
        });
        return;
      }
      const r = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importar: lista }),
      });
      if (r.status === 401) {
        onBloqueado();
        return;
      }
      const j = (await r.json()) as {
        proyectos?: Proyecto[];
        origen?: "redis" | "muestra";
        importados?: number;
        errores?: string[];
        error?: string;
      };
      if (!r.ok || !j.proyectos) throw new Error(j.error ?? "No se pudo importar");
      onCambio(j.proyectos, j.origen ?? "redis");
      setResultadoImport({ importados: j.importados ?? 0, errores: [...errores, ...(j.errores ?? [])] });
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo importar");
    } finally {
      setOcupado(null);
    }
  };

  const exportar = () => {
    const datos = JSON.stringify(
      {
        proyectos: proyectos.map((p) => {
          const copia: Partial<Proyecto> = { ...p };
          delete copia.caminatas;
          return copia;
        }),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([datos], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `proyectos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const eliminar = async (p: Proyecto) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"? Las cotizaciones guardadas seguirán mostrando sus datos.`))
      return;
    setOcupado("eliminar");
    try {
      await llamar({ method: "DELETE" }, `/api/proyectos?id=${encodeURIComponent(p.id)}`);
      setEditando(null);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Error");
    } finally {
      setOcupado(null);
    }
  };

  const ordenados = useMemo(
    () =>
      [...proyectos].sort(
        (a, b) => a.comuna.localeCompare(b.comuna, "es") || a.nombre.localeCompare(b.nombre, "es"),
      ),
    [proyectos],
  );

  return (
    <div>
      {origen === "muestra" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-select bg-select-soft px-3 py-2 text-sm">
          <span>
            El mapa está mostrando los {proyectos.length} proyectos de muestra. Impórtalos para editarlos o
            crea el primero real; en cuanto guardes uno, el mapa mostrará solo los tuyos.
          </span>
          <button
            type="button"
            onClick={importarMuestra}
            disabled={ocupado !== null}
            className="rounded-md border border-ink px-3 py-1 text-xs font-medium hover:bg-ink hover:text-white disabled:opacity-50"
          >
            {ocupado === "importar" ? "Importando…" : "Importar muestra"}
          </button>
        </div>
      )}
      {aviso && <p className="mb-4 rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{aviso}</p>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          {proyectos.length} {proyectos.length === 1 ? "proyecto" : "proyectos"}
          {origen === "redis" ? " guardados" : " de muestra"}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a href="/proyectos-muestra.xlsx" download className="text-accent hover:underline">
            Excel de muestra
          </a>
          <a href="/plantilla-proyectos.csv" download className="text-accent hover:underline">
            Plantilla CSV
          </a>
          <a href="/plantilla-proyectos.json" download className="text-accent hover:underline">
            Plantilla JSON
          </a>
          <button type="button" onClick={exportar} className="text-accent hover:underline">
            Exportar JSON
          </button>
          <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm hover:border-ink">
            {ocupado === "archivo" ? "Importando…" : "Importar archivo"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
              disabled={ocupado !== null}
              onChange={(e) => {
                const a = e.target.files?.[0];
                e.target.value = "";
                if (a) importarArchivo(a);
              }}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => setEditando(proyectoVacio())}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent"
          >
            Nuevo proyecto
          </button>
        </div>
      </div>
      {resultadoImport && (
        <div className="mb-4 rounded-md border border-line bg-panel px-3 py-2 text-sm">
          <p>
            {resultadoImport.importados}{" "}
            {resultadoImport.importados === 1 ? "proyecto importado" : "proyectos importados"}
            {resultadoImport.errores.length ? ` · ${resultadoImport.errores.length} con problemas:` : "."}
          </p>
          {resultadoImport.errores.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-warn">
              {resultadoImport.errores.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={`grid gap-5 ${editando ? "xl:grid-cols-[1fr_520px]" : ""}`}>
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead className="bg-fondo/70 text-left text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Comuna</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Desde</th>
                <th className="hidden px-3 py-2 text-right font-medium md:table-cell">Tipologías</th>
                <th className="px-3 py-2 text-right font-medium">Disponibles</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setEditando(structuredClone(p))}
                  className={`cursor-pointer border-t border-line-soft hover:bg-fondo/60 ${
                    editando?.id === p.id ? "bg-select-soft" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-ink-muted">{p.direccion}</div>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">{p.comuna}</td>
                  <td className="px-3 py-2.5">
                    <BadgeEstado estado={p.estado} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {fmtUF(Math.min(...p.tipologias.map((t) => t.precioUF)))}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right md:table-cell">{p.tipologias.length}</td>
                  <td className="px-3 py-2.5 text-right">
                    {(() => {
                      const total = p.tipologias.reduce((s, t) => s + t.disponibles, 0);
                      const pocas = p.tipologias.filter((t) => t.disponibles <= 3);
                      return (
                        <>
                          <span className={total <= 3 ? "font-semibold text-warn" : ""}>{total}</span>
                          {pocas.length > 0 && total > 3 && (
                            <span className="block text-xs text-warn">
                              {pocas.map((t) => `${t.nombre}: ${t.disponibles}`).join(" · ")}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editando && (
          <FormularioProyecto
            key={editando.id || "nuevo"}
            inicial={editando}
            existente={origen === "redis" && proyectos.some((p) => p.id === editando.id)}
            ocupado={ocupado === "guardar"}
            onGuardar={guardar}
            onEliminar={() => eliminar(editando)}
            onCancelar={() => setEditando(null)}
          />
        )}
      </div>
    </div>
  );
}

function FormularioProyecto({
  inicial,
  existente,
  ocupado,
  onGuardar,
  onEliminar,
  onCancelar,
}: {
  inicial: Proyecto;
  existente: boolean;
  ocupado: boolean;
  onGuardar: (p: Proyecto) => void;
  onEliminar: () => void;
  onCancelar: () => void;
}) {
  const [p, setP] = useState<Proyecto>(inicial);
  const [amenidadesTexto, setAmenidadesTexto] = useState(inicial.amenidades.join(", "));
  const [buscando, setBuscando] = useState(false);
  const [MiniMapa, setMiniMapa] = useState<ComponentType<MiniMapaProps> | null>(null);
  const set = (parte: Partial<Proyecto>) => setP((prev) => ({ ...prev, ...parte }));

  useEffect(() => {
    let vivo = true;
    import("@/components/MiniMapa").then((m) => vivo && setMiniMapa(() => m.default));
    return () => {
      vivo = false;
    };
  }, []);

  const setTip = (i: number, parte: Partial<Tipologia>) =>
    setP((prev) => ({
      ...prev,
      tipologias: prev.tipologias.map((t, j) => (j === i ? { ...t, ...parte } : t)),
    }));

  const geocodificar = async () => {
    const q = [p.direccion, p.comuna, "Santiago, Chile"].filter(Boolean).join(", ");
    if (!p.direccion) return;
    setBuscando(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`,
        { headers: { "accept-language": "es" } },
      );
      const j = (await r.json()) as { lat: string; lon: string }[];
      if (j[0]) set({ lat: +Number(j[0].lat).toFixed(6), lng: +Number(j[0].lon).toFixed(6) });
      else window.alert("No se encontró la dirección. Mueve el pin a mano.");
    } catch {
      window.alert("No se pudo consultar la dirección.");
    } finally {
      setBuscando(false);
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onGuardar({
      ...p,
      amenidades: amenidadesTexto
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      tipologias: p.tipologias.filter((t) => t.nombre && t.precioUF > 0 && t.m2Utiles > 0),
    });
  };

  const valido = p.nombre.trim() && p.tipologias.some((t) => t.nombre && t.precioUF > 0 && t.m2Utiles > 0);

  return (
    <form onSubmit={enviar} className="h-fit space-y-4 rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{existente ? "Editar proyecto" : "Nuevo proyecto"}</h2>
        <button type="button" onClick={onCancelar} className="text-sm text-ink-muted hover:text-ink">
          Cerrar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombre" ancho>
          <input
            required
            value={p.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            className={INPUT}
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Inmobiliaria">
          <input
            value={p.inmobiliaria}
            onChange={(e) => set({ inmobiliaria: e.target.value })}
            className={INPUT}
          />
        </Campo>
        <Campo etiqueta="Comuna">
          <input value={p.comuna} onChange={(e) => set({ comuna: e.target.value })} className={INPUT} />
        </Campo>
        <Campo etiqueta="Dirección" ancho>
          <div className="flex gap-2">
            <input
              value={p.direccion}
              onChange={(e) => set({ direccion: e.target.value })}
              className={INPUT}
            />
            <button
              type="button"
              onClick={geocodificar}
              disabled={buscando || !p.direccion}
              className="shrink-0 rounded-md border border-line px-2.5 text-xs hover:border-ink disabled:opacity-50"
            >
              {buscando ? "Buscando…" : "Ubicar"}
            </button>
          </div>
        </Campo>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
          <span>Ubicación: arrastra el pin o haz clic en el mapa</span>
          <span>
            {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
          </span>
        </div>
        <div className="h-56 overflow-hidden rounded-md border border-line">
          {MiniMapa ? (
            <MiniMapa lat={p.lat} lng={p.lng} onMover={(lat, lng) => set({ lat, lng })} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-ink-muted">
              Cargando mapa…
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Campo etiqueta="Estado">
          <select
            value={p.estado}
            onChange={(e) => set({ estado: e.target.value as EstadoVenta })}
            className={INPUT}
          >
            {(Object.keys(ETIQUETA_ESTADO_VENTA) as EstadoVenta[]).map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_VENTA[e]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Entrega">
          <input
            value={p.entrega}
            onChange={(e) => set({ entrega: e.target.value })}
            className={INPUT}
            placeholder="Segundo semestre 2027"
          />
        </Campo>
        <Campo etiqueta="Pie mínimo %">
          <input
            type="number"
            min={0}
            max={100}
            value={p.pieMinimoPct}
            onChange={(e) => set({ pieMinimoPct: Number(e.target.value) })}
            className={INPUT}
          />
        </Campo>
        <Campo etiqueta="Bono pie % del precio">
          <input
            type="number"
            min={0}
            max={50}
            value={p.bonoPiePct ?? 0}
            onChange={(e) => set({ bonoPiePct: Number(e.target.value) || undefined })}
            className={INPUT}
          />
        </Campo>
        <Campo etiqueta="Pisos">
          <input
            type="number"
            min={0}
            value={p.pisos}
            onChange={(e) => set({ pisos: Number(e.target.value) })}
            className={INPUT}
          />
        </Campo>
        <Campo etiqueta="Comisión broker %">
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={p.comisionPct ?? ""}
            onChange={(e) => set({ comisionPct: Number(e.target.value) || undefined })}
            placeholder="2,5"
            className={INPUT}
          />
        </Campo>
        <Campo etiqueta="Unidades">
          <input
            type="number"
            min={0}
            value={p.unidades}
            onChange={(e) => set({ unidades: Number(e.target.value) })}
            className={INPUT}
          />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!p.pieEnCuotas}
          onChange={(e) => set({ pieEnCuotas: e.target.checked })}
          className="accent-accent"
        />
        Acepta pie en cuotas hasta la entrega
      </label>

      <Campo etiqueta="Descripción">
        <textarea
          value={p.descripcion}
          onChange={(e) => set({ descripcion: e.target.value })}
          rows={3}
          className={INPUT}
        />
      </Campo>

      <Fotos
        imagenes={p.imagenes ?? []}
        carpeta={`proyectos/${p.id || "nuevo"}/fotos`}
        onCambio={(imagenes) => set({ imagenes })}
      />
      <Campo etiqueta="Espacios comunes (separados por coma)">
        <input
          value={amenidadesTexto}
          onChange={(e) => setAmenidadesTexto(e.target.value)}
          className={INPUT}
          placeholder="Quincho, Gimnasio, Bicicletero"
        />
      </Campo>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-muted">Tipologías</span>
          <button
            type="button"
            onClick={() =>
              setP((prev) => ({
                ...prev,
                tipologias: [...prev.tipologias, tipologiaVacia(prev.tipologias.length)],
              }))
            }
            className="text-xs text-accent hover:underline"
          >
            + Agregar tipología
          </button>
        </div>
        <div className="space-y-2">
          {p.tipologias.map((t, i) => (
            <div
              key={t.id}
              className="grid grid-cols-4 gap-2 rounded-md border border-line-soft bg-fondo/50 p-2 sm:grid-cols-8"
            >
              <input
                value={t.nombre}
                onChange={(e) => setTip(i, { nombre: e.target.value })}
                placeholder="2D1B"
                className={`${INPUT} col-span-2`}
              />
              <Num v={t.dormitorios} on={(v) => setTip(i, { dormitorios: v })} ph="Dorm" />
              <Num v={t.banos} on={(v) => setTip(i, { banos: v })} ph="Baños" />
              <Num v={t.m2Utiles} on={(v) => setTip(i, { m2Utiles: v })} ph="m² út." />
              <Num v={t.m2Terraza} on={(v) => setTip(i, { m2Terraza: v })} ph="m² terr." />
              <Num v={t.precioUF} on={(v) => setTip(i, { precioUF: v })} ph="UF" />
              <div className="flex gap-1">
                <Num v={t.disponibles} on={(v) => setTip(i, { disponibles: v })} ph="Disp." />
                <button
                  type="button"
                  onClick={() =>
                    setP((prev) => ({ ...prev, tipologias: prev.tipologias.filter((_, j) => j !== i) }))
                  }
                  disabled={p.tipologias.length === 1}
                  aria-label="Quitar tipología"
                  className="rounded px-1.5 text-ink-faint hover:text-warn disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
              <Plano
                url={t.plano}
                carpeta={`proyectos/${p.id || "nuevo"}/planos`}
                onCambio={(plano) => setTip(i, { plano })}
              />
              <input
                value={t.orientacion}
                onChange={(e) => setTip(i, { orientacion: e.target.value })}
                placeholder="Orientación"
                className={`${INPUT} col-span-3 sm:col-span-6`}
              />
              <input
                type="number"
                min={0}
                step="any"
                value={t.arriendoUF || ""}
                onChange={(e) => setTip(i, { arriendoUF: Number(e.target.value) || undefined })}
                placeholder="Arriendo UF/mes"
                title="Arriendo mensual estimado en UF (opcional; si falta se estima)"
                className={`${INPUT} col-span-1 sm:col-span-2`}
              />
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-faint">
          Columnas: nombre, dormitorios, baños, m² útiles, m² terraza, precio UF, disponibles.
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        {existente ? (
          <button type="button" onClick={onEliminar} className="text-sm text-warn hover:underline">
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={ocupado || !valido}
          className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
        >
          {ocupado ? "Guardando y calculando caminatas…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function Num({ v, on, ph }: { v: number; on: (v: number) => void; ph: string }) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={v || ""}
      onChange={(e) => on(Number(e.target.value))}
      placeholder={ph}
      title={ph}
      className={INPUT}
    />
  );
}

function Campo({
  etiqueta,
  children,
  ancho,
}: {
  etiqueta: string;
  children: React.ReactNode;
  ancho?: boolean;
}) {
  return (
    <label className={`block ${ancho ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-ink-muted">{etiqueta}</span>
      {children}
    </label>
  );
}

/** Sube un archivo a Vercel Blob a través de la API interna y devuelve su URL. */
async function subirArchivo(archivo: File, carpeta: string): Promise<string> {
  const datos = new FormData();
  datos.set("archivo", archivo);
  datos.set("carpeta", carpeta);
  const r = await fetch("/api/imagenes", { method: "POST", body: datos });
  const j = (await r.json()) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error(j.error ?? "No se pudo subir");
  return j.url;
}

function borrarArchivo(url: string) {
  return fetch(`/api/imagenes?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => {});
}

function Fotos({
  imagenes,
  carpeta,
  onCambio,
}: {
  imagenes: string[];
  carpeta: string;
  onCambio: (imagenes: string[]) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setSubiendo(true);
    setError(null);
    const nuevas: string[] = [];
    for (const a of Array.from(archivos).slice(0, 12 - imagenes.length)) {
      try {
        nuevas.push(await subirArchivo(a, carpeta));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo subir");
      }
    }
    onCambio([...imagenes, ...nuevas]);
    setSubiendo(false);
  };

  const quitar = (url: string) => {
    onCambio(imagenes.filter((u) => u !== url));
    borrarArchivo(url);
  };

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= imagenes.length) return;
    const copia = [...imagenes];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onCambio(copia);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">Fotos (la primera es la principal)</span>
        <label className="cursor-pointer text-xs text-accent hover:underline">
          {subiendo ? "Subiendo…" : "+ Subir fotos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={subiendo || imagenes.length >= 12}
            onChange={(e) => {
              subir(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="mb-1 text-xs text-warn">{error}</p>}
      {imagenes.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-3 py-3 text-center text-xs text-ink-faint">
          Sin fotos. JPG, PNG o WebP de hasta 8 MB.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imagenes.map((u, i) => (
            <li key={u} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-20 w-full rounded-md object-cover" loading="lazy" />
              {i === 0 && (
                <span className="absolute top-1 left-1 rounded bg-ink/80 px-1 text-[10px] text-white">
                  Principal
                </span>
              )}
              <div className="absolute right-1 bottom-1 flex gap-0.5 rounded bg-panel/90 text-xs opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  title="Mover antes"
                  className="px-1 hover:text-accent"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  title="Mover después"
                  className="px-1 hover:text-accent"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => quitar(u)}
                  title="Quitar"
                  className="px-1 hover:text-warn"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Plano({
  url,
  carpeta,
  onCambio,
}: {
  url?: string;
  carpeta: string;
  onCambio: (url: string | undefined) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  return (
    <div className="col-span-4 flex items-center gap-2 text-xs sm:col-span-8">
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Ver plano
          </a>
          <button
            type="button"
            onClick={() => {
              onCambio(undefined);
              borrarArchivo(url);
            }}
            className="text-ink-muted hover:text-warn"
          >
            Quitar plano
          </button>
        </>
      ) : (
        <label className="cursor-pointer text-accent hover:underline">
          {subiendo ? "Subiendo plano…" : "+ Plano (imagen o PDF)"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
            disabled={subiendo}
            onChange={async (e) => {
              const a = e.target.files?.[0];
              e.target.value = "";
              if (!a) return;
              setSubiendo(true);
              try {
                onCambio(await subirArchivo(a, carpeta));
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "No se pudo subir el plano");
              } finally {
                setSubiendo(false);
              }
            }}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
