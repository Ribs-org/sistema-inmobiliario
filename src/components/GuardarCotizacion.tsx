"use client";

// Diálogo para guardar una simulación como cotización con enlace público.

import { useEffect, useState, type FormEvent } from "react";
import type { Cliente } from "@/lib/clientes";
import type { ParametrosCotizacion } from "@/lib/cotizaciones-store";

type Props = {
  proyectoId: string;
  proyectoNombre: string;
  tipologiaId: string | null;
  tipologiaNombre: string | null;
  parametros: ParametrosCotizacion;
  /** Comparativa: 2 o 3 proyectos con su tipología elegida */
  items?: { proyectoId: string; tipologiaId: string | null }[];
  onCerrar: () => void;
};

const INPUT = "w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm focus:border-accent";

export default function GuardarCotizacion({
  proyectoId,
  proyectoNombre,
  tipologiaId,
  tipologiaNombre,
  parametros,
  items,
  onCerrar,
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [nota, setNota] = useState("");
  const [dias, setDias] = useState(15);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => (r.ok ? r.json() : { clientes: [] }))
      .then((j: { clientes: Cliente[] }) => setClientes(j.clientes ?? []))
      .catch(() => {});
  }, []);

  const elegirCliente = (id: string) => {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setNombre(c.nombre);
      setEmail(c.email);
    }
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      const r = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proyectoId,
          tipologiaId,
          items,
          clienteId: clienteId || null,
          clienteNombre: nombre,
          clienteEmail: email,
          nota,
          diasVigencia: dias,
          parametros,
        }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? "No se pudo guardar");
      setUrl(`${window.location.origin}${j.url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setOcupado(false);
    }
  };

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el usuario puede copiar a mano */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal
    >
      <form
        onSubmit={enviar}
        className="w-full max-w-md space-y-4 rounded-xl border border-line bg-panel p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{items ? "Guardar comparativa" : "Guardar cotización"}</h2>
            <p className="text-sm text-ink-muted">
              {proyectoNombre}
              {tipologiaNombre ? ` · ${tipologiaNombre}` : ""}
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="text-sm text-ink-muted hover:text-ink">
            Cerrar
          </button>
        </div>

        {url ? (
          <div className="space-y-3">
            <p className="text-sm">Cotización guardada. Este es el enlace para el cliente:</p>
            <div className="flex gap-2">
              <input readOnly value={url} className={INPUT} onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                onClick={copiar}
                className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent"
              >
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Abrir cotización
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola ${nombre}, te dejo la cotización de ${proyectoNombre}: ${url}`)}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <>
            {clientes.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Cliente existente</span>
                <select value={clienteId} onChange={(e) => elegirCliente(e.target.value)} className={INPUT}>
                  <option value="">Prospecto nuevo</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Nombre</span>
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={INPUT}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Nota para el cliente</span>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                className={INPUT}
                placeholder="Incluye estacionamiento y bodega…"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Vigencia (días)</span>
              <input
                type="number"
                min={1}
                max={90}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className={INPUT}
              />
            </label>
            {error && <p className="text-sm text-warn">{error}</p>}
            <button
              type="submit"
              disabled={ocupado || !nombre.trim()}
              className="w-full rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
            >
              {ocupado ? "Guardando…" : "Guardar y generar enlace"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
