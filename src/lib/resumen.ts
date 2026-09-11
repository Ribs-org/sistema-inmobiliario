// Resumen diario de seguimiento: qué tiene cada broker para hoy.
// Lo usa el cron que envía el correo y la vista previa del área interna.

import {
  diasEnEtapa,
  DIAS_ESTANCADO,
  ETAPAS_ACTIVAS,
  ETIQUETA_ETAPA,
  hoyISO,
  ultimaInteraccion,
  type Cliente,
} from "./clientes";
import { resumenFaltantes } from "./documentos";

export type LineaResumen = {
  id: string;
  nombre: string;
  etapa: string;
  detalle: string;
  telefono: string;
};

export type ResumenBroker = {
  vendedorId: string;
  nombre: string;
  email: string;
  atrasados: LineaResumen[];
  hoy: LineaResumen[];
  estancados: LineaResumen[];
  /** true si no hay nada que hacer: el correo no se envía */
  vacio: boolean;
};

function linea(c: Cliente): LineaResumen {
  const ultima = ultimaInteraccion(c);
  // Si la carpeta está incompleta, eso manda: es lo que traba al cliente.
  const faltan = resumenFaltantes(c);
  return {
    id: c.id,
    nombre: c.nombre,
    etapa: ETIQUETA_ETAPA[c.etapa],
    detalle: faltan ?? (ultima ? `${ultima.fecha}: ${ultima.texto}` : (c.notas ?? "")),
    telefono: c.telefono,
  };
}

/** Agrupa los clientes por vendedor y arma la lista de gestiones del día. */
export function resumenPorBroker(
  clientes: Cliente[],
  nombres: Record<string, { nombre: string; email: string }>,
  hoy = hoyISO(),
): ResumenBroker[] {
  const por = new Map<string, Cliente[]>();
  for (const c of clientes) {
    const id = c.vendedorId ?? "sin";
    por.set(id, [...(por.get(id) ?? []), c]);
  }
  // Los días en etapa se miden contra el mismo día que el resto del resumen.
  const ahora = Date.parse(`${hoy}T12:00:00`);
  return [...por.entries()]
    .map(([vendedorId, lista]) => {
      const activos = lista.filter((c) => ETAPAS_ACTIVAS.includes(c.etapa));
      const atrasados = activos.filter((c) => c.proximoContacto && c.proximoContacto < hoy);
      const deHoy = activos.filter((c) => c.proximoContacto === hoy);
      const estancados = activos.filter(
        (c) => diasEnEtapa(c, ahora) >= DIAS_ESTANCADO && !atrasados.includes(c) && !deHoy.includes(c),
      );
      const info = nombres[vendedorId];
      return {
        vendedorId,
        nombre:
          info?.nombre ?? lista[0]?.vendedorNombre ?? (vendedorId === "sin" ? "Sin asignar" : vendedorId),
        email: info?.email ?? "",
        atrasados: atrasados.map(linea),
        hoy: deHoy.map(linea),
        estancados: estancados.map(linea),
        vacio: atrasados.length + deHoy.length + estancados.length === 0,
      };
    })
    .sort((a, b) => b.atrasados.length - a.atrasados.length);
}

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function bloque(titulo: string, lineas: LineaResumen[], color: string, base: string): string {
  if (lineas.length === 0) return "";
  const filas = lineas
    .map(
      (l) => `<li style="margin:0 0 8px">
        <strong>${escapar(l.nombre)}</strong>
        <span style="color:#5a5a57"> · ${escapar(l.etapa)}${l.telefono ? ` · ${escapar(l.telefono)}` : ""}</span>
        ${l.detalle ? `<br><span style="color:#8f8d86;font-size:13px">${escapar(l.detalle)}</span>` : ""}
      </li>`,
    )
    .join("");
  return `<h3 style="margin:20px 0 8px;font-size:15px;color:${color}">${titulo} (${lineas.length})</h3>
    <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5">${filas}</ul>
    <p style="margin:8px 0 0"><a href="${base}/interno" style="color:#9c7f22;font-size:13px">Abrir en Pyxis</a></p>`;
}

/** Correo en HTML con el trabajo del día de un broker. */
export function correoResumen(
  r: ResumenBroker,
  base: string,
  fecha = hoyISO(),
): { asunto: string; html: string } {
  const total = r.atrasados.length + r.hoy.length;
  const asunto =
    r.atrasados.length > 0
      ? `Pyxis: ${r.atrasados.length} ${r.atrasados.length === 1 ? "cliente atrasado" : "clientes atrasados"} y ${r.hoy.length} para hoy`
      : `Pyxis: ${total} ${total === 1 ? "gestión" : "gestiones"} para hoy`;
  const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f0f0f">
    <div style="border-top:4px solid #d4af37;padding-top:16px">
      <p style="margin:0;font-size:13px;color:#8f8d86">${escapar(fecha)}</p>
      <h2 style="margin:4px 0 0;font-size:20px">Tu día en Pyxis, ${escapar(r.nombre.split(" ")[0])}</h2>
      ${bloque("Atrasados", r.atrasados, "#b45309", base)}
      ${bloque("Para hoy", r.hoy, "#0f0f0f", base)}
      ${bloque(`Sin avanzar hace ${DIAS_ESTANCADO} días o más`, r.estancados, "#5a5a57", base)}
      <p style="margin:24px 0 0;font-size:12px;color:#8f8d86">
        Recibes este correo porque tienes clientes asignados en Pyxis. El detalle y el historial están en
        <a href="${base}/interno" style="color:#9c7f22">el área interna</a>.
      </p>
    </div>
  </div>`;
  return { asunto, html };
}

/** Envía por Resend. Sin RESEND_API_KEY no envía y lo informa. */
export async function enviarCorreo(para: string, asunto: string, html: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "sin RESEND_API_KEY";
  const desde = process.env.CORREO_DESDE ?? "Pyxis <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: desde, to: [para], subject: asunto, html }),
  });
  if (!r.ok) return `error ${r.status}: ${(await r.text()).slice(0, 200)}`;
  return "enviado";
}
