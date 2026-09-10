// Modelo de cliente para el seguimiento comercial. Compartido entre API y UI.

export const ETAPAS = [
  "nuevo",
  "contactado",
  "visita",
  "reserva",
  "promesa",
  "escritura",
  "perdido",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETIQUETA_ETAPA: Record<Etapa, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita: "Visita agendada",
  reserva: "Reserva",
  promesa: "Promesa",
  escritura: "Escritura",
  perdido: "Perdido",
};

/** Etapas que siguen en curso (no cerradas). */
export const ETAPAS_ACTIVAS: Etapa[] = ["nuevo", "contactado", "visita", "reserva", "promesa"];

export const TIPOS_INTERACCION = [
  "llamada",
  "whatsapp",
  "email",
  "visita",
  "reunion",
  "cotizacion",
  "etapa",
  "nota",
] as const;
export type TipoInteraccion = (typeof TIPOS_INTERACCION)[number];

export const ETIQUETA_INTERACCION: Record<TipoInteraccion, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  visita: "Visita",
  reunion: "Reunión",
  cotizacion: "Cotización enviada",
  etapa: "Cambio de etapa",
  nota: "Nota",
};

/** Tipos que el vendedor registra a mano (los demás los agrega el sistema). */
export const TIPOS_MANUALES: TipoInteraccion[] = [
  "llamada",
  "whatsapp",
  "email",
  "visita",
  "reunion",
  "nota",
];

export type Interaccion = {
  id: string;
  tipo: TipoInteraccion;
  /** Fecha del contacto (YYYY-MM-DD) */
  fecha: string;
  texto: string;
  creadoEn: string;
};

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  proyectoId: string | null;
  tipologiaId: string | null;
  etapa: Etapa;
  /** Desde cuándo está en la etapa actual (ISO); si falta, se usa creadoEn */
  etapaDesde?: string;
  /** Fecha ISO (YYYY-MM-DD) del próximo contacto, o null */
  proximoContacto: string | null;
  notas: string;
  interacciones: Interaccion[];
  creadoEn: string;
  actualizadoEn: string;
};

const idCorto = (prefijo: string) =>
  `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function nuevoCliente(parcial: Partial<Cliente> = {}): Cliente {
  const ahora = new Date().toISOString();
  return {
    id: idCorto("c"),
    nombre: "",
    telefono: "",
    email: "",
    proyectoId: null,
    tipologiaId: null,
    etapa: "nuevo",
    etapaDesde: ahora,
    proximoContacto: null,
    notas: "",
    interacciones: [],
    creadoEn: ahora,
    actualizadoEn: ahora,
    // Se omiten claves con undefined para no pisar el id o la fecha generados.
    ...Object.fromEntries(Object.entries(parcial).filter(([, v]) => v !== undefined)),
  };
}

export function nuevaInteraccion(
  parcial: Partial<Interaccion> & { tipo: TipoInteraccion; texto: string },
): Interaccion {
  return {
    id: idCorto("i"),
    fecha: hoyISO(),
    creadoEn: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(parcial).filter(([, v]) => v !== undefined)),
  } as Interaccion;
}

const texto = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function normalizarInteraccion(entrada: unknown): Interaccion | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const tipo = TIPOS_INTERACCION.includes(e.tipo as TipoInteraccion) ? (e.tipo as TipoInteraccion) : "nota";
  const t = texto(e.texto, 1000);
  if (!t) return null;
  const fecha = texto(e.fecha, 10);
  return {
    id: texto(e.id, 40) || idCorto("i"),
    tipo,
    fecha: esFecha(fecha) ? fecha : hoyISO(),
    texto: t,
    creadoEn: texto(e.creadoEn, 40) || new Date().toISOString(),
  };
}

/** Valida y normaliza un cliente recibido por la API. Devuelve null si no sirve. */
export function normalizarCliente(entrada: unknown): Cliente | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const nombre = texto(e.nombre, 120);
  if (!nombre) return null;
  const etapa = ETAPAS.includes(e.etapa as Etapa) ? (e.etapa as Etapa) : "nuevo";
  const fecha = texto(e.proximoContacto, 10);
  const interacciones = (Array.isArray(e.interacciones) ? e.interacciones : [])
    .map(normalizarInteraccion)
    .filter((i): i is Interaccion => i !== null)
    .slice(0, 500);
  return nuevoCliente({
    id: texto(e.id, 40) || undefined,
    nombre,
    telefono: texto(e.telefono, 40),
    email: texto(e.email, 120),
    proyectoId: texto(e.proyectoId, 60) || null,
    tipologiaId: texto(e.tipologiaId, 10) || null,
    etapa,
    etapaDesde: texto(e.etapaDesde, 40) || undefined,
    proximoContacto: esFecha(fecha) ? fecha : null,
    notas: texto(e.notas, 2000),
    interacciones,
    creadoEn: texto(e.creadoEn, 40) || undefined,
    actualizadoEn: new Date().toISOString(),
  });
}

/**
 * Aplica las reglas del sistema al guardar sobre un registro previo: conserva la fecha de
 * creación, registra el cambio de etapa como interacción y actualiza etapaDesde.
 */
export function reconciliarCliente(nuevo: Cliente, previo: Cliente | undefined): Cliente {
  if (!previo) return { ...nuevo, etapaDesde: nuevo.etapaDesde ?? nuevo.creadoEn };
  const cambioEtapa = previo.etapa !== nuevo.etapa;
  const interacciones = cambioEtapa
    ? [
        nuevaInteraccion({
          tipo: "etapa",
          texto: `${ETIQUETA_ETAPA[previo.etapa]} → ${ETIQUETA_ETAPA[nuevo.etapa]}`,
        }),
        ...nuevo.interacciones,
      ]
    : nuevo.interacciones;
  return {
    ...nuevo,
    creadoEn: previo.creadoEn,
    etapaDesde: cambioEtapa ? new Date().toISOString() : (previo.etapaDesde ?? previo.creadoEn),
    interacciones,
  };
}

export function hoyISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Días completos que el cliente lleva en su etapa actual. */
export function diasEnEtapa(c: Cliente, ahora = Date.now()): number {
  const desde = Date.parse(c.etapaDesde ?? c.creadoEn);
  if (!Number.isFinite(desde)) return 0;
  return Math.max(0, Math.floor((ahora - desde) / 86400000));
}

export function ordenarInteracciones(lista: Interaccion[]): Interaccion[] {
  return [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
}

/** Última interacción (por fecha y luego por creación), o null. */
export function ultimaInteraccion(c: Cliente): Interaccion | null {
  return ordenarInteracciones(c.interacciones ?? [])[0] ?? null;
}

/** Orden de trabajo: primero atrasados, luego los de hoy, luego próximos; los sin fecha al final. */
export function ordenarPorSeguimiento(lista: Cliente[]): Cliente[] {
  return [...lista].sort((a, b) => {
    if (a.proximoContacto && b.proximoContacto) return a.proximoContacto.localeCompare(b.proximoContacto);
    if (a.proximoContacto) return -1;
    if (b.proximoContacto) return 1;
    return b.actualizadoEn.localeCompare(a.actualizadoEn);
  });
}
