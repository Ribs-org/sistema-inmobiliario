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

/** Etapas en que la unidad está comprometida y descuenta stock. */
export const ETAPAS_RESERVA: Etapa[] = ["reserva", "promesa", "escritura"];

/** Por qué se cae un cliente. Alimenta el informe de conversión. */
export const MOTIVOS_PERDIDA = [
  "precio",
  "no-califica",
  "competencia",
  "desistio",
  "sin-respuesta",
  "otro",
] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number];

export const ETIQUETA_MOTIVO: Record<MotivoPerdida, string> = {
  precio: "Precio fuera de presupuesto",
  "no-califica": "No califica para el crédito",
  competencia: "Compró en otro proyecto",
  desistio: "Desistió de comprar",
  "sin-respuesta": "Dejó de responder",
  otro: "Otro",
};

/** Cómo recibe sus ingresos: cambia qué papeles pide el banco. */
export const TIPOS_RENTA = ["dependiente", "independiente"] as const;
export type TipoRenta = (typeof TIPOS_RENTA)[number];

export const ETIQUETA_RENTA: Record<TipoRenta, string> = {
  dependiente: "Con contrato",
  independiente: "Independiente o a honorarios",
};

export const TIPOS_INTERACCION = [
  "llamada",
  "whatsapp",
  "email",
  "visita",
  "reunion",
  "cotizacion",
  "etapa",
  "stock",
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
  stock: "Stock",
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
  /** Solo en las de tipo "etapa": de dónde y hacia dónde se movió. */
  de?: Etapa;
  a?: Etapa;
};

/** Etiqueta de etapa → clave, para leer historiales antiguos que solo guardaron el texto. */
const ETAPA_POR_ETIQUETA: Record<string, Etapa> = Object.fromEntries(
  ETAPAS.map((e) => [ETIQUETA_ETAPA[e], e]),
) as Record<string, Etapa>;

/**
 * De qué etapa a qué etapa movió una interacción. Usa los campos `de`/`a` y, si no están
 * (historiales anteriores a que existieran), los deduce del texto "Nuevo → Contactado".
 */
export function transicion(i: Interaccion): { de: Etapa; a: Etapa } | null {
  if (i.tipo !== "etapa") return null;
  if (i.de && i.a) return { de: i.de, a: i.a };
  const [de, a] = i.texto.split("→").map((s) => ETAPA_POR_ETIQUETA[s.trim().split(":")[0].trim()]);
  return de && a ? { de, a } : null;
}

/** Estado de un documento en la carpeta del cliente. El catálogo está en src/lib/documentos.ts. */
export const ESTADOS_DOCUMENTO = ["pendiente", "recibido", "observado", "no-aplica"] as const;
export type EstadoDoc = (typeof ESTADOS_DOCUMENTO)[number];

export const ETIQUETA_ESTADO_DOC: Record<EstadoDoc, string> = {
  pendiente: "Pendiente",
  recibido: "Recibido",
  observado: "Con observaciones",
  "no-aplica": "No aplica",
};

export type EstadoDocumento = {
  /** id del documento en el catálogo */
  id: string;
  estado: EstadoDoc;
  /** Ruta dentro de Vercel Blob; el archivo se sirve por /api/documentos, nunca directo */
  ruta?: string;
  /** Nombre original, para mostrarlo */
  archivo?: string;
  nota?: string;
  actualizadoEn: string;
};

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  proyectoId: string | null;
  tipologiaId: string | null;
  /** Unidad concreta comprometida, si el proyecto tiene detalle de unidades */
  unidadNumero?: string | null;
  etapa: Etapa;
  /** Desde cuándo está en la etapa actual (ISO); si falta, se usa creadoEn */
  etapaDesde?: string;
  /** Por qué se perdió. Solo tiene sentido en la etapa "perdido"; al salir se borra. */
  motivoPerdida?: MotivoPerdida | null;
  /** Con contrato o independiente: define qué papeles pide el banco */
  tipoRenta?: TipoRenta;
  /** Carpeta de documentos del cliente (ver src/lib/documentos.ts) */
  documentos?: EstadoDocumento[];
  /** Fecha ISO (YYYY-MM-DD) del próximo contacto, o null */
  proximoContacto: string | null;
  notas: string;
  interacciones: Interaccion[];
  /** Broker responsable (id de sesión); null = sin asignar, lo ve solo el admin */
  vendedorId?: string | null;
  vendedorNombre?: string;
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
  const etapa = (v: unknown) => (ETAPAS.includes(v as Etapa) ? (v as Etapa) : undefined);
  return {
    id: texto(e.id, 40) || idCorto("i"),
    tipo,
    fecha: esFecha(fecha) ? fecha : hoyISO(),
    texto: t,
    creadoEn: texto(e.creadoEn, 40) || new Date().toISOString(),
    de: etapa(e.de),
    a: etapa(e.a),
  };
}

function normalizarDocumento(entrada: unknown): EstadoDocumento | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  const id = texto(e.id, 40);
  if (!id) return null;
  return {
    id,
    estado: ESTADOS_DOCUMENTO.includes(e.estado as EstadoDoc) ? (e.estado as EstadoDoc) : "pendiente",
    ruta: texto(e.ruta, 300) || undefined,
    archivo: texto(e.archivo, 160) || undefined,
    nota: texto(e.nota, 400) || undefined,
    actualizadoEn: texto(e.actualizadoEn, 40) || new Date().toISOString(),
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
  const documentos = (Array.isArray(e.documentos) ? e.documentos : [])
    .map(normalizarDocumento)
    .filter((d): d is EstadoDocumento => d !== null)
    .slice(0, 60);
  return nuevoCliente({
    id: texto(e.id, 40) || undefined,
    nombre,
    telefono: texto(e.telefono, 40),
    email: texto(e.email, 120),
    proyectoId: texto(e.proyectoId, 60) || null,
    tipologiaId: texto(e.tipologiaId, 10) || null,
    unidadNumero: texto(e.unidadNumero, 12) || null,
    etapa,
    etapaDesde: texto(e.etapaDesde, 40) || undefined,
    // El motivo solo se guarda mientras el cliente esté perdido.
    motivoPerdida:
      etapa === "perdido" && MOTIVOS_PERDIDA.includes(e.motivoPerdida as MotivoPerdida)
        ? (e.motivoPerdida as MotivoPerdida)
        : null,
    tipoRenta: TIPOS_RENTA.includes(e.tipoRenta as TipoRenta) ? (e.tipoRenta as TipoRenta) : undefined,
    documentos,
    proximoContacto: esFecha(fecha) ? fecha : null,
    notas: texto(e.notas, 2000),
    interacciones,
    vendedorId: texto(e.vendedorId, 60) || null,
    vendedorNombre: texto(e.vendedorNombre, 80),
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
  const motivo = nuevo.etapa === "perdido" ? nuevo.motivoPerdida : null;
  const interacciones = cambioEtapa
    ? [
        nuevaInteraccion({
          tipo: "etapa",
          texto:
            `${ETIQUETA_ETAPA[previo.etapa]} → ${ETIQUETA_ETAPA[nuevo.etapa]}` +
            (motivo ? `: ${ETIQUETA_MOTIVO[motivo]}` : ""),
          de: previo.etapa,
          a: nuevo.etapa,
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

/** Días hasta el próximo contacto que se sugieren al entrar a cada etapa; null = sin seguimiento. */
export const DIAS_PROXIMO_CONTACTO: Record<Etapa, number | null> = {
  nuevo: 1,
  contactado: 3,
  visita: 3,
  reserva: 5,
  promesa: 7,
  escritura: null,
  perdido: null,
};

export function sumarDiasISO(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Fecha sugerida de próximo contacto para una etapa, o null si esa etapa ya no requiere seguimiento. */
export function proximoContactoSugerido(etapa: Etapa, hoy = hoyISO()): string | null {
  const dias = DIAS_PROXIMO_CONTACTO[etapa];
  return dias === null ? null : sumarDiasISO(hoy, dias);
}

/** Días en la misma etapa a partir de los cuales un cliente activo se marca como estancado. */
export const DIAS_ESTANCADO = 14;

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
