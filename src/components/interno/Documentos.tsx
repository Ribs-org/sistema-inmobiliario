"use client";

// Carpeta de documentos de un cliente. Los archivos se suben y se leen por /api/documentos,
// nunca por una URL pública: llevan cédulas y liquidaciones de sueldo.

import { useMemo, useRef, useState } from "react";
import {
  ESTADOS_DOCUMENTO,
  ETIQUETA_ESTADO_DOC,
  ETIQUETA_RENTA,
  TIPOS_RENTA,
  type Cliente,
  type EstadoDoc,
  type EstadoDocumento,
  type TipoRenta,
} from "@/lib/clientes";
import {
  documentosDe,
  estadoDe,
  ETIQUETA_RESPONSABLE,
  FORMATOS_ACEPTADOS,
  progresoDocumentos,
  type DocumentoDef,
} from "@/lib/documentos";

type Props = {
  cliente: Cliente;
  /** true si el cliente ya está guardado: sin eso no hay enlace de portal que generar */
  existente: boolean;
  guardando: boolean;
  /** Cambia el estado o la nota de un documento y guarda el cliente */
  onEstado: (docId: string, parte: Partial<Omit<EstadoDocumento, "id">>) => void;
  onSubir: (docId: string, archivo: File) => void;
  onQuitar: (docId: string) => void;
  onCambioRenta: (t: TipoRenta) => void;
};

const COLOR: Record<EstadoDoc, string> = {
  pendiente: "bg-line-soft text-ink-muted",
  recibido: "bg-ok/10 text-ok",
  observado: "bg-warn/10 text-warn",
  "no-aplica": "bg-line-soft text-ink-faint",
};

const ETIQUETA_GRUPO: Record<DocumentoDef["etapa"], string> = {
  reserva: "Para la reserva y el crédito",
  promesa: "Para la promesa",
  escritura: "Para la escritura y la entrega",
};

const GRUPOS = ["reserva", "promesa", "escritura"] as const;

export default function Documentos({
  cliente,
  existente,
  guardando,
  onEstado,
  onSubir,
  onQuitar,
  onCambioRenta,
}: Props) {
  const [verTodos, setVerTodos] = useState(false);
  const [enlace, setEnlace] = useState<{ url: string; copiado: boolean } | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const entradas = useRef<Record<string, HTMLInputElement | null>>({});

  /** Pide el enlace del portal (lo crea si no existía) y lo deja en el portapapeles. */
  async function pedirEnlace(rotar = false) {
    setPidiendo(true);
    try {
      const r = await fetch("/api/portal/enlace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cliente: cliente.id, rotar }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) {
        setEnlace({ url: j.error ?? "No se pudo generar el enlace.", copiado: false });
        return;
      }
      let copiado = false;
      try {
        await navigator.clipboard.writeText(j.url);
        copiado = true;
      } catch {
        /* sin permiso de portapapeles: queda el enlace a la vista para copiarlo a mano */
      }
      setEnlace({ url: j.url, copiado });
    } catch {
      setEnlace({ url: "No se pudo conectar con el servidor.", copiado: false });
    } finally {
      setPidiendo(false);
    }
  }

  const aplican = useMemo(() => documentosDe(cliente, !verTodos), [cliente, verTodos]);
  const progreso = progresoDocumentos(cliente);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-muted">Carpeta de documentos</span>
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>Renta</span>
          <select
            value={cliente.tipoRenta ?? "dependiente"}
            onChange={(e) => onCambioRenta(e.target.value as TipoRenta)}
            className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-xs"
          >
            {TIPOS_RENTA.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_RENTA[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {progreso.total === 0 ? (
        <p className="mb-2 text-xs text-ink-faint">
          La carpeta se arma al pasar a reserva. Mientras tanto puedes mirar la lista completa del proceso más
          abajo.
        </p>
      ) : (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">
              {progreso.listos} de {progreso.total} listos
            </span>
            <span className={progreso.pct === 100 ? "text-ok" : "text-ink-muted"}>{progreso.pct} %</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft">
            <div
              className={`h-full rounded-full ${progreso.pct === 100 ? "bg-ok" : "bg-accent"}`}
              style={{ width: `${progreso.pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {GRUPOS.map((grupo) => {
          const docs = aplican.filter((d) => d.etapa === grupo);
          if (docs.length === 0) return null;
          return (
            <div key={grupo}>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">
                {ETIQUETA_GRUPO[grupo]}
              </p>
              <ul className="space-y-1">
                {docs.map((d) => {
                  const est = estadoDe(cliente, d.id);
                  const estado = est?.estado ?? "pendiente";
                  return (
                    <li key={d.id} className="rounded-md border border-line-soft px-2 py-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-sm">{d.nombre}</span>
                          <span className="block text-[11px] text-ink-faint">
                            {ETIQUETA_RESPONSABLE[d.responsable]}
                            {d.ayuda ? ` · ${d.ayuda}` : ""}
                          </span>
                        </div>
                        <select
                          value={estado}
                          disabled={guardando}
                          onChange={(e) => onEstado(d.id, { estado: e.target.value as EstadoDoc })}
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${COLOR[estado]}`}
                          aria-label={`Estado de ${d.nombre}`}
                        >
                          {ESTADOS_DOCUMENTO.map((s) => (
                            <option key={s} value={s}>
                              {ETIQUETA_ESTADO_DOC[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        {est?.ruta ? (
                          <>
                            <a
                              href={`/api/documentos?cliente=${encodeURIComponent(cliente.id)}&doc=${encodeURIComponent(d.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline"
                            >
                              Ver {est.archivo ?? "archivo"}
                            </a>
                            <button
                              type="button"
                              onClick={() => onQuitar(d.id)}
                              disabled={guardando}
                              className="text-ink-faint hover:text-warn disabled:opacity-50"
                            >
                              Quitar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => entradas.current[d.id]?.click()}
                            disabled={guardando}
                            className="text-accent hover:underline disabled:opacity-50"
                          >
                            Adjuntar archivo
                          </button>
                        )}
                        {est?.nota && <span className="text-ink-faint">{est.nota}</span>}
                        <input
                          ref={(el) => {
                            entradas.current[d.id] = el;
                          }}
                          type="file"
                          accept={FORMATOS_ACEPTADOS}
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) onSubir(d.id, f);
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setVerTodos((v) => !v)}
        className="mt-2 text-xs text-ink-muted hover:text-ink"
      >
        {verTodos ? "Ver solo los que ya corresponden" : "Ver todos los documentos del proceso"}
      </button>

      {existente && (
        <div className="mt-3 rounded-md border border-line-soft px-2 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-muted">Que los suba el cliente</span>
            <button
              type="button"
              onClick={() => pedirEnlace()}
              disabled={pidiendo || guardando}
              className="rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:border-ink hover:text-ink disabled:opacity-50"
            >
              {pidiendo ? "Generando…" : "Copiar enlace para el cliente"}
            </button>
          </div>
          {enlace && (
            <p className="mt-1.5 break-all text-[11px] text-ink-faint">
              {enlace.copiado ? "Copiado. " : ""}
              {enlace.url}
              {enlace.url.includes("/mi/") && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("El enlace anterior dejará de funcionar. ¿Emitir uno nuevo?"))
                      pedirEnlace(true);
                  }}
                  disabled={pidiendo}
                  className="ml-1 whitespace-nowrap text-ink-muted underline hover:text-warn"
                >
                  Renovar
                </button>
              )}
            </p>
          )}
          <p className="mt-1 text-[11px] text-ink-faint">
            Abre una página privada donde el cliente ve lo que falta y sube sus archivos. Desde ahí no puede
            ver ni borrar nada más.
          </p>
        </div>
      )}

      <p className="mt-2 text-[11px] text-ink-faint">
        Los archivos quedan privados: solo se abren desde aquí y con la sesión iniciada.
      </p>
    </div>
  );
}
