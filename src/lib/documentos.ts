// Carpeta de documentos del cliente: qué papeles pide el banco y la inmobiliaria en cada
// etapa, y en qué estado va cada uno. El estado vive en `Cliente.documentos`.

import type { Cliente, EstadoDoc, EstadoDocumento, Etapa, TipoRenta } from "./clientes";

export type DocumentoDef = {
  id: string;
  nombre: string;
  /** Desde qué etapa se empieza a pedir */
  etapa: Extract<Etapa, "reserva" | "promesa" | "escritura">;
  /** Solo para un tipo de renta; si falta, se pide siempre */
  renta?: TipoRenta;
  /** Quién lo consigue: ayuda a que el broker sepa a quién perseguir */
  responsable: "cliente" | "broker" | "banco" | "notaria";
  ayuda?: string;
};

/**
 * Orden pensado como se piden en la práctica. No es una lista legal: cada banco agrega lo
 * suyo, pero estos son los que aparecen en todas las carpetas.
 */
export const DOCUMENTOS: DocumentoDef[] = [
  {
    id: "cedula",
    nombre: "Cédula de identidad por ambos lados",
    etapa: "reserva",
    responsable: "cliente",
  },
  {
    id: "liquidaciones",
    nombre: "Últimas 3 liquidaciones de sueldo",
    etapa: "reserva",
    renta: "dependiente",
    responsable: "cliente",
  },
  {
    id: "cotizaciones-afp",
    nombre: "Certificado de cotizaciones AFP, 24 meses",
    etapa: "reserva",
    renta: "dependiente",
    responsable: "cliente",
    ayuda: "Se saca en el sitio de la AFP o en www.previred.com",
  },
  {
    id: "carpeta-sii",
    nombre: "Carpeta tributaria para solicitar créditos",
    etapa: "reserva",
    renta: "independiente",
    responsable: "cliente",
    ayuda: "Se genera en sii.cl, opción Carpeta Tributaria Electrónica",
  },
  {
    id: "boletas",
    nombre: "Boletas de honorarios de los últimos 12 meses",
    etapa: "reserva",
    renta: "independiente",
    responsable: "cliente",
  },
  {
    id: "deudas-cmf",
    nombre: "Informe de deudas de la CMF",
    etapa: "reserva",
    responsable: "cliente",
    ayuda: "Gratis una vez al mes en el sitio de la Comisión para el Mercado Financiero",
  },
  {
    id: "preaprobacion",
    nombre: "Preaprobación del crédito",
    etapa: "reserva",
    responsable: "banco",
  },
  {
    id: "comprobante-reserva",
    nombre: "Comprobante del pago de la reserva",
    etapa: "reserva",
    responsable: "broker",
  },
  {
    id: "promesa-firmada",
    nombre: "Promesa de compraventa firmada",
    etapa: "promesa",
    responsable: "broker",
  },
  {
    id: "comprobante-pie",
    nombre: "Comprobantes del pie",
    etapa: "promesa",
    responsable: "cliente",
    ayuda: "Si el pie va en cuotas, se adjunta cada pago",
  },
  { id: "tasacion", nombre: "Tasación de la propiedad", etapa: "promesa", responsable: "banco" },
  {
    id: "aprobacion-final",
    nombre: "Aprobación final del crédito",
    etapa: "promesa",
    responsable: "banco",
  },
  { id: "escritura", nombre: "Escritura firmada", etapa: "escritura", responsable: "notaria" },
  {
    id: "inscripcion-cbr",
    nombre: "Inscripción en el Conservador de Bienes Raíces",
    etapa: "escritura",
    responsable: "notaria",
  },
  {
    id: "acta-entrega",
    nombre: "Acta de entrega del departamento",
    etapa: "escritura",
    responsable: "broker",
  },
];

export const ETIQUETA_RESPONSABLE: Record<DocumentoDef["responsable"], string> = {
  cliente: "Lo trae el cliente",
  broker: "Lo prepara el broker",
  banco: "Lo emite el banco",
  notaria: "Lo emite la notaría",
};

/** Orden de las etapas con papeleo, para saber cuáles ya corresponden. */
const ORDEN: Record<DocumentoDef["etapa"], number> = { reserva: 1, promesa: 2, escritura: 3 };

const ETAPA_DEL_CLIENTE: Partial<Record<Etapa, DocumentoDef["etapa"]>> = {
  reserva: "reserva",
  promesa: "promesa",
  escritura: "escritura",
};

/**
 * Documentos que le corresponden a un cliente: los de su tipo de renta y, si `soloVigentes`,
 * solo los de su etapa actual y las anteriores. Antes de la reserva todavía no corresponde ninguno.
 */
export function documentosDe(
  cliente: Pick<Cliente, "etapa" | "tipoRenta">,
  soloVigentes = true,
): DocumentoDef[] {
  const renta = cliente.tipoRenta ?? "dependiente";
  const porRenta = DOCUMENTOS.filter((d) => !d.renta || d.renta === renta);
  if (!soloVigentes) return porRenta;
  const etapa = ETAPA_DEL_CLIENTE[cliente.etapa];
  if (!etapa) return [];
  return porRenta.filter((d) => ORDEN[d.etapa] <= ORDEN[etapa]);
}

export function estadoDe(cliente: Pick<Cliente, "documentos">, id: string): EstadoDocumento | undefined {
  return cliente.documentos?.find((d) => d.id === id);
}

/** "no-aplica" cuenta como resuelto: el documento deja de bloquear. */
const resuelto = (e: EstadoDoc | undefined) => e === "recibido" || e === "no-aplica";

export type Progreso = {
  listos: number;
  total: number;
  pct: number;
  /** Los que faltan, en el orden del catálogo */
  faltantes: DocumentoDef[];
  observados: DocumentoDef[];
};

/** Cuánto le falta a la carpeta de un cliente para estar completa. */
export function progresoDocumentos(cliente: Pick<Cliente, "etapa" | "tipoRenta" | "documentos">): Progreso {
  const aplican = documentosDe(cliente);
  const listos = aplican.filter((d) => resuelto(estadoDe(cliente, d.id)?.estado));
  return {
    listos: listos.length,
    total: aplican.length,
    pct: aplican.length === 0 ? 0 : Math.round((listos.length / aplican.length) * 100),
    faltantes: aplican.filter((d) => !resuelto(estadoDe(cliente, d.id)?.estado)),
    observados: aplican.filter((d) => estadoDe(cliente, d.id)?.estado === "observado"),
  };
}

/** Guarda el estado de un documento sin tocar el resto de la carpeta. */
export function conDocumento(
  documentos: EstadoDocumento[] | undefined,
  id: string,
  parte: Partial<Omit<EstadoDocumento, "id">>,
): EstadoDocumento[] {
  const lista = documentos ?? [];
  const previo = lista.find((d) => d.id === id);
  const actualizado: EstadoDocumento = {
    id,
    estado: "pendiente",
    ...previo,
    ...parte,
    actualizadoEn: new Date().toISOString(),
  };
  return previo ? lista.map((d) => (d.id === id ? actualizado : d)) : [...lista, actualizado];
}

/** Frase corta para el resumen y el embudo: qué le falta a este cliente. */
export function resumenFaltantes(
  cliente: Pick<Cliente, "etapa" | "tipoRenta" | "documentos">,
): string | null {
  const { faltantes, total } = progresoDocumentos(cliente);
  if (total === 0 || faltantes.length === 0) return null;
  if (faltantes.length === 1) return `Falta ${faltantes[0].nombre.toLowerCase()}`;
  return `Faltan ${faltantes.length} documentos: ${faltantes[0].nombre.toLowerCase()} y ${faltantes.length - 1} más`;
}
