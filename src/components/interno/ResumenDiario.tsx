"use client";

// "Hoy": lo que cada broker tiene que gestionar. Misma lógica que el correo diario
// (src/lib/resumen.ts), para que la pantalla y el correo nunca digan cosas distintas.

import { useMemo, useState } from "react";
import type { Proyecto } from "@/data/proyectos";
import {
  diasEnEtapa,
  DIAS_ESTANCADO,
  ETAPAS_ACTIVAS,
  ETIQUETA_ETAPA,
  hoyISO,
  ultimaInteraccion,
  type Cliente,
} from "@/lib/clientes";
import { resumenFaltantes } from "@/lib/documentos";
import { resumenPorBroker } from "@/lib/resumen";

type Props = {
  clientes: Cliente[];
  proyectos: Proyecto[];
  nombres: Record<string, string>;
  admin: boolean;
  nombreSesion: string;
  onAbrir: (c: Cliente) => void;
};

const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const soloTelefono = (t: string) => t.replace(/[^+0-9]/g, "");

function Fila({
  cliente,
  proyectos,
  onAbrir,
}: {
  cliente: Cliente;
  proyectos: Proyecto[];
  onAbrir: (c: Cliente) => void;
}) {
  const proyecto = proyectos.find((p) => p.id === cliente.proyectoId);
  const ultima = ultimaInteraccion(cliente);
  const tel = soloTelefono(cliente.telefono);
  const faltan = resumenFaltantes(cliente);
  return (
    <li className="flex items-start gap-2 border-b border-line-soft px-3 py-2 last:border-b-0">
      <button
        type="button"
        onClick={() => onAbrir(cliente)}
        className="min-w-0 flex-1 text-left hover:text-accent"
      >
        <span className="block truncate text-sm font-medium">{cliente.nombre}</span>
        <span className="block truncate text-xs text-ink-muted">
          {ETIQUETA_ETAPA[cliente.etapa]}
          {proyecto ? ` · ${proyecto.nombre}` : ""}
        </span>
        {faltan ? (
          <span className="mt-0.5 block truncate text-xs text-warn">{faltan}</span>
        ) : (
          ultima && <span className="mt-0.5 block truncate text-xs text-ink-faint">{ultima.texto}</span>
        )}
      </button>
      {tel && (
        <a
          href={`https://wa.me/${tel.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:border-ok hover:text-ok"
          title={`Escribir a ${cliente.nombre} por WhatsApp`}
        >
          WhatsApp
        </a>
      )}
    </li>
  );
}

function Columna({
  titulo,
  nota,
  clientes,
  proyectos,
  onAbrir,
  alerta,
  vacio,
}: {
  titulo: string;
  nota: string;
  clientes: Cliente[];
  proyectos: Proyecto[];
  onAbrir: (c: Cliente) => void;
  alerta?: boolean;
  vacio: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-panel ${alerta && clientes.length > 0 ? "border-warn/40" : "border-line"}`}
    >
      <header className="flex items-baseline justify-between gap-2 px-3 py-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <span className={`display text-xl font-semibold ${alerta && clientes.length > 0 ? "text-warn" : ""}`}>
          {clientes.length}
        </span>
      </header>
      <p className="px-3 pb-2 text-xs text-ink-faint">{nota}</p>
      {clientes.length === 0 ? (
        <p className="border-t border-line-soft px-3 py-4 text-center text-xs text-ink-muted">{vacio}</p>
      ) : (
        <ul className="border-t border-line-soft">
          {clientes.map((c) => (
            <Fila key={c.id} cliente={c} proyectos={proyectos} onAbrir={onAbrir} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ResumenDiario({ clientes, proyectos, nombres, admin, nombreSesion, onAbrir }: Props) {
  const hoy = hoyISO();
  const [prueba, setPrueba] = useState<string | null>(null);

  const { atrasados, deHoy, estancados } = useMemo(() => {
    const activos = clientes.filter((c) => ETAPAS_ACTIVAS.includes(c.etapa));
    const atrasados = activos
      .filter((c) => c.proximoContacto && c.proximoContacto < hoy)
      .sort((a, b) => (a.proximoContacto ?? "").localeCompare(b.proximoContacto ?? ""));
    const deHoy = activos.filter((c) => c.proximoContacto === hoy);
    const estancados = activos
      .filter((c) => diasEnEtapa(c) >= DIAS_ESTANCADO && !atrasados.includes(c) && !deHoy.includes(c))
      .sort((a, b) => diasEnEtapa(b) - diasEnEtapa(a));
    return { atrasados, deHoy, estancados };
  }, [clientes, hoy]);

  // Para el admin: cómo se reparte ese trabajo entre los brokers.
  const porBroker = useMemo(
    () =>
      admin
        ? resumenPorBroker(
            clientes,
            Object.fromEntries(Object.entries(nombres).map(([id, nombre]) => [id, { nombre, email: "" }])),
            hoy,
          ).filter((r) => !r.vacio)
        : [],
    [admin, clientes, nombres, hoy],
  );

  const total = atrasados.length + deHoy.length;

  async function probarCorreo() {
    setPrueba("Consultando…");
    try {
      const r = await fetch("/api/cron/resumen?dry=1");
      const j = (await r.json()) as {
        error?: string;
        brokers?: { nombre: string; email: string; atrasados: number; hoy: number }[];
      };
      if (!r.ok || !j.brokers) {
        setPrueba(j.error ?? "No se pudo generar el resumen.");
        return;
      }
      const conCorreo = j.brokers.filter((b) => b.email).length;
      setPrueba(
        `Se enviaría a ${conCorreo} de ${j.brokers.length} brokers. Sin RESEND_API_KEY el correo no sale, pero el resumen se calcula igual.`,
      );
    } catch {
      setPrueba("No se pudo conectar con el servidor.");
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="display text-xl font-semibold">
            {total === 0
              ? `Día despejado, ${nombreSesion.split(" ")[0]}`
              : `${total} ${total === 1 ? "gestión" : "gestiones"} para hoy`}
          </h2>
          <p className="text-xs capitalize text-ink-muted">{fechaLarga(hoy)}</p>
        </div>
        {admin && (
          <button
            type="button"
            onClick={probarCorreo}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:border-ink hover:text-ink"
            title="Calcula el resumen sin enviar ningún correo"
          >
            Probar el correo diario
          </button>
        )}
      </div>
      {prueba && <p className="mb-3 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">{prueba}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Columna
          titulo="Atrasados"
          nota="La fecha de próximo contacto ya pasó."
          clientes={atrasados}
          proyectos={proyectos}
          onAbrir={onAbrir}
          alerta
          vacio="Nada atrasado."
        />
        <Columna
          titulo="Para hoy"
          nota="Comprometidos para la fecha de hoy."
          clientes={deHoy}
          proyectos={proyectos}
          onAbrir={onAbrir}
          vacio="Sin contactos agendados para hoy."
        />
        <Columna
          titulo="Sin avanzar"
          nota={`Llevan ${DIAS_ESTANCADO} días o más en la misma etapa.`}
          clientes={estancados}
          proyectos={proyectos}
          onAbrir={onAbrir}
          vacio="Todos los clientes activos se movieron hace poco."
        />
      </div>

      {admin && porBroker.length > 1 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead className="bg-line-soft/60 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Broker</th>
                <th className="px-3 py-2 text-right font-medium">Atrasados</th>
                <th className="px-3 py-2 text-right font-medium">Hoy</th>
                <th className="px-3 py-2 text-right font-medium">Sin avanzar</th>
              </tr>
            </thead>
            <tbody>
              {porBroker.map((r) => (
                <tr key={r.vendedorId} className="border-t border-line-soft">
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className={`px-3 py-2 text-right ${r.atrasados.length > 0 ? "text-warn" : ""}`}>
                    {r.atrasados.length}
                  </td>
                  <td className="px-3 py-2 text-right">{r.hoy.length}</td>
                  <td className="px-3 py-2 text-right text-ink-muted">{r.estancados.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line-soft px-3 py-2 text-xs text-ink-faint">
            Cada broker recibe este mismo detalle por correo a las 8:00 de lunes a viernes.
          </p>
        </div>
      )}
    </div>
  );
}
