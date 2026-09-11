// Portal del cliente: el enlace privado /mi/<token> donde la persona que está comprando ve
// qué papeles le faltan y los sube sin pasar por el broker.
//
// Regla: por ese enlace solo viaja lo que el cliente ya sabe de sí mismo. Nada de etapa,
// notas internas, precios ni datos de otros clientes.

import { randomBytes } from "node:crypto";
import type { Proyecto } from "@/data/proyectos";
import type { Cliente, EstadoDoc } from "./clientes";
import { documentosDe, estadoDe, progresoDocumentos, type DocumentoDef } from "./documentos";

/** Llave larga y aleatoria: el enlace es el único control de acceso, así que no debe adivinarse. */
export const nuevoTokenPortal = () => randomBytes(24).toString("base64url");

export type DocumentoPortal = {
  id: string;
  nombre: string;
  etapa: DocumentoDef["etapa"];
  estado: EstadoDoc;
  ayuda?: string;
  /** Lo escribe el broker cuando algo viene mal; el cliente necesita leerlo */
  observacion?: string;
  /** Quién lo consigue: si no es el cliente, no se le pide que lo suba */
  loSubeElCliente: boolean;
  archivo?: string;
};

export type VistaPortal = {
  nombre: string;
  proyecto: string | null;
  tipologia: string | null;
  broker: string | null;
  listos: number;
  total: number;
  pct: number;
  documentos: DocumentoPortal[];
};

/** Lo que el cliente puede pedirle al banco o a la notaría no se lo pedimos a él. */
const esDelCliente = (d: DocumentoDef) => d.responsable === "cliente";

/**
 * Proyección segura de un cliente para su portal. Deja fuera los documentos marcados como
 * "no aplica", que ya no le incumben.
 */
export function vistaPortal(cliente: Cliente, proyecto: Proyecto | undefined): VistaPortal {
  const { listos, total, pct } = progresoDocumentos(cliente);
  const documentos = documentosDe(cliente)
    .map((d) => {
      const est = estadoDe(cliente, d.id);
      return {
        id: d.id,
        nombre: d.nombre,
        etapa: d.etapa,
        estado: est?.estado ?? "pendiente",
        ayuda: d.ayuda,
        observacion: est?.estado === "observado" ? est.nota : undefined,
        loSubeElCliente: esDelCliente(d),
        archivo: est?.archivo,
      };
    })
    .filter((d) => d.estado !== "no-aplica");
  return {
    nombre: cliente.nombre,
    proyecto: proyecto?.nombre ?? null,
    tipologia: proyecto?.tipologias.find((t) => t.id === cliente.tipologiaId)?.nombre ?? null,
    broker: cliente.vendedorNombre || null,
    listos,
    total,
    pct,
    documentos,
  };
}

/** Busca por token. Un token vacío nunca calza, aunque haya clientes sin portal generado. */
export function porToken(clientes: Cliente[], token: string): Cliente | undefined {
  if (!token || token.length < 20) return undefined;
  return clientes.find((c) => c.tokenPortal === token);
}

/** Documentos que el portal acepta recibir de este cliente. */
export function subibles(cliente: Cliente): DocumentoDef[] {
  return documentosDe(cliente).filter(
    (d) => esDelCliente(d) && estadoDe(cliente, d.id)?.estado !== "no-aplica",
  );
}
