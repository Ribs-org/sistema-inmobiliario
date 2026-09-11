"use client";

// Portal del cliente: la persona que está comprando ve qué papeles le faltan y los sube.
// Pensado para el teléfono, que es donde va a llegar el enlace por WhatsApp.

import { useRef, useState } from "react";
import { FORMATOS_ACEPTADOS, MAX_MB } from "@/lib/documentos";
import type { DocumentoPortal, VistaPortal } from "@/lib/portal";
import Marca from "./Marca";

type Props = { token: string; inicial: VistaPortal; contacto: string };

const ETIQUETA_GRUPO: Record<DocumentoPortal["etapa"], string> = {
  reserva: "Para tu crédito",
  promesa: "Para la promesa",
  escritura: "Para la escritura y la entrega",
};

const GRUPOS = ["reserva", "promesa", "escritura"] as const;

function Estado({ doc }: { doc: DocumentoPortal }) {
  if (doc.estado === "recibido")
    return <span className="shrink-0 text-xs font-medium text-ok">Recibido</span>;
  if (doc.estado === "observado")
    return <span className="shrink-0 text-xs font-medium text-warn">Hay que reemplazarlo</span>;
  if (!doc.loSubeElCliente)
    return <span className="shrink-0 text-xs text-ink-faint">Lo gestionamos nosotros</span>;
  return <span className="shrink-0 text-xs text-ink-muted">Pendiente</span>;
}

export default function PortalCliente({ token, inicial, contacto }: Props) {
  const [vista, setVista] = useState(inicial);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const entradas = useRef<Record<string, HTMLInputElement | null>>({});

  async function subir(doc: DocumentoPortal, archivo: File) {
    setSubiendo(doc.id);
    setFallo(null);
    setListo(null);
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("doc", doc.id);
      form.set("archivo", archivo);
      const r = await fetch("/api/portal/subir", { method: "POST", body: form });
      const j = (await r.json()) as { vista?: VistaPortal; error?: string };
      if (!r.ok || !j.vista) {
        setFallo(j.error ?? "No pudimos recibir el archivo. Inténtalo de nuevo.");
        return;
      }
      setVista(j.vista);
      setListo(doc.nombre);
    } catch {
      setFallo("No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubiendo(null);
    }
  }

  const pendientes = vista.documentos.filter((d) => d.loSubeElCliente && d.estado !== "recibido").length;

  return (
    <div className="min-h-full bg-fondo">
      <header className="bg-negro px-4 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Marca />
          <span className="text-xs text-white/60">Tus documentos</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="display text-2xl font-semibold">Hola, {vista.nombre.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {vista.proyecto
            ? `Estos son los documentos de tu compra en ${vista.proyecto}${vista.tipologia ? `, ${vista.tipologia}` : ""}.`
            : "Estos son los documentos de tu compra."}{" "}
          Puedes subirlos desde el teléfono: una foto nítida sirve.
        </p>

        {vista.total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">
                {vista.listos} de {vista.total} listos
              </span>
              <span className={vista.pct === 100 ? "font-medium text-ok" : "text-ink-muted"}>
                {vista.pct} %
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line-soft">
              <div
                className={`h-full rounded-full transition-all ${vista.pct === 100 ? "bg-ok" : "bg-accent"}`}
                style={{ width: `${vista.pct}%` }}
              />
            </div>
          </div>
        )}

        {listo && (
          <p className="mt-4 rounded-md bg-ok/10 px-3 py-2 text-sm text-ok">
            Recibimos {listo.toLowerCase()}. Gracias.
          </p>
        )}
        {fallo && <p className="mt-4 rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{fallo}</p>}

        {vista.documentos.length === 0 ? (
          <p className="mt-6 rounded-xl border border-line bg-panel px-4 py-8 text-center text-sm text-ink-muted">
            Por ahora no necesitamos ningún documento tuyo. Cuando avancemos con la reserva te avisamos por
            aquí mismo.
          </p>
        ) : (
          <>
            {pendientes === 0 && (
              <p className="mt-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
                Tienes todo al día. No hay nada pendiente de tu parte.
              </p>
            )}
            <div className="mt-5 space-y-5">
              {GRUPOS.map((grupo) => {
                const docs = vista.documentos.filter((d) => d.etapa === grupo);
                if (docs.length === 0) return null;
                return (
                  <section key={grupo}>
                    <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                      {ETIQUETA_GRUPO[grupo]}
                    </h2>
                    <ul className="overflow-hidden rounded-xl border border-line bg-panel">
                      {docs.map((d) => (
                        <li key={d.id} className="border-b border-line-soft px-4 py-3 last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-medium">{d.nombre}</span>
                            <Estado doc={d} />
                          </div>
                          {d.ayuda && <p className="mt-0.5 text-xs text-ink-faint">{d.ayuda}</p>}
                          {d.observacion && (
                            <p className="mt-1.5 rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">
                              {d.observacion}
                            </p>
                          )}
                          {d.loSubeElCliente && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => entradas.current[d.id]?.click()}
                                disabled={subiendo !== null}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                                  d.estado === "recibido"
                                    ? "border border-line text-ink-muted hover:border-ink hover:text-ink"
                                    : "bg-ink text-white hover:bg-accent"
                                }`}
                              >
                                {subiendo === d.id
                                  ? "Subiendo…"
                                  : d.estado === "recibido"
                                    ? "Reemplazar"
                                    : "Subir archivo"}
                              </button>
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
                                  if (f) subir(d, f);
                                }}
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}

        <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-muted">
          <p>
            Aceptamos PDF, JPG, PNG o HEIC de hasta {MAX_MB} MB. Tus archivos son privados: solo los ve
            {vista.broker ? ` ${vista.broker}` : " tu ejecutivo"} y el equipo que tramita tu crédito.
          </p>
          <p className="mt-2">
            {vista.broker ? `${vista.broker} · ` : ""}
            {contacto}
          </p>
        </footer>
      </main>
    </div>
  );
}
