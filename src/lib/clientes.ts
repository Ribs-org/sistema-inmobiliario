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

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  proyectoId: string | null;
  tipologiaId: string | null;
  etapa: Etapa;
  /** Fecha ISO (YYYY-MM-DD) del próximo contacto, o null */
  proximoContacto: string | null;
  notas: string;
  creadoEn: string;
  actualizadoEn: string;
};

export function nuevoCliente(parcial: Partial<Cliente> = {}): Cliente {
  const ahora = new Date().toISOString();
  return {
    id: parcial.id ?? `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    nombre: "",
    telefono: "",
    email: "",
    proyectoId: null,
    tipologiaId: null,
    etapa: "nuevo",
    proximoContacto: null,
    notas: "",
    creadoEn: ahora,
    actualizadoEn: ahora,
    // Se omiten claves con undefined para no pisar el id o la fecha generados.
    ...Object.fromEntries(Object.entries(parcial).filter(([, v]) => v !== undefined)),
  };
}

/** Valida y normaliza un cliente recibido por la API. Devuelve null si no sirve. */
export function normalizarCliente(entrada: unknown): Cliente | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const texto = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const nombre = texto(e.nombre, 120);
  if (!nombre) return null;
  const etapa = ETAPAS.includes(e.etapa as Etapa) ? (e.etapa as Etapa) : "nuevo";
  const fecha = texto(e.proximoContacto, 10);
  return nuevoCliente({
    id: texto(e.id, 40) || undefined,
    nombre,
    telefono: texto(e.telefono, 40),
    email: texto(e.email, 120),
    proyectoId: texto(e.proyectoId, 60) || null,
    tipologiaId: texto(e.tipologiaId, 10) || null,
    etapa,
    proximoContacto: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    notas: texto(e.notas, 2000),
    creadoEn: texto(e.creadoEn, 40) || undefined,
    actualizadoEn: new Date().toISOString(),
  });
}

export function hoyISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
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
