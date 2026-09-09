// Clientes ficticios para la demo. Las fechas se calculan relativas al día en que se cargan.

import { hoyISO, nuevoCliente, type Cliente, type Etapa } from "@/lib/clientes";

type Semilla = {
  nombre: string;
  telefono: string;
  email: string;
  proyectoId: string;
  tipologiaId: string;
  etapa: Etapa;
  /** Días desde hoy para el próximo contacto; null = sin fecha */
  enDias: number | null;
  notas: string;
};

const SEMILLAS: Semilla[] = [
  {
    nombre: "Camila Rojas",
    telefono: "+56 9 8123 4567",
    email: "camila.rojas@gmail.com",
    proyectoId: "irarrazaval-3300",
    tipologiaId: "b",
    etapa: "visita",
    enDias: -2,
    notas:
      "Visitó el piloto el sábado. Le gustó el 2D1B norte; pide cotización con pie en cuotas a 18 meses.",
  },
  {
    nombre: "Rodrigo Fuentes",
    telefono: "+56 9 6677 1122",
    email: "rfuentes@outlook.cl",
    proyectoId: "alameda-4100",
    tipologiaId: "a",
    etapa: "reserva",
    enDias: 0,
    notas: "Inversionista, busca 2 estudios para arriendo. Reservó uno; hoy confirma el segundo.",
  },
  {
    nombre: "Valentina Muñoz",
    telefono: "+56 9 5544 3311",
    email: "vale.munoz@uc.cl",
    proyectoId: "macul-sur",
    tipologiaId: "c",
    etapa: "contactado",
    enDias: 0,
    notas: "Familia con 2 niños. Comparando con Egaña Living. Enviar tabla de dividendo a 30 años.",
  },
  {
    nombre: "Matías Contreras",
    telefono: "+56 9 9012 7788",
    email: "mcontreras@empresa.cl",
    proyectoId: "leones-lofts",
    tipologiaId: "a",
    etapa: "nuevo",
    enDias: 1,
    notas: "Llegó por Instagram. Le interesa el loft y la extensión de L6. Primera llamada mañana 10:00.",
  },
  {
    nombre: "Francisca Alarcón",
    telefono: "+56 9 3210 9876",
    email: "fran.alarcon@gmail.com",
    proyectoId: "huelen-park",
    tipologiaId: "b",
    etapa: "promesa",
    enDias: 4,
    notas: "Promesa firmada. Banco pidió certificado de renta actualizado; reunión con ejecutiva el viernes.",
  },
  {
    nombre: "Sebastián Ortiz",
    telefono: "+56 9 7788 2299",
    email: "sortiz@hotmail.com",
    proyectoId: "puente-alto-centro",
    tipologiaId: "b",
    etapa: "contactado",
    enDias: 6,
    notas: "Subsidio DS1 aprobado. Necesita bono pie 10 %. Revisar disponibilidad de 2D1B poniente.",
  },
  {
    nombre: "Josefa Herrera",
    telefono: "+56 9 4455 6677",
    email: "josefa.herrera@gmail.com",
    proyectoId: "vista-estoril",
    tipologiaId: "b",
    etapa: "visita",
    enDias: -5,
    notas: "Visita a la sala de ventas hace dos semanas. No contesta llamadas; intentar por WhatsApp.",
  },
  {
    nombre: "Andrés Pizarro",
    telefono: "+56 9 2233 4455",
    email: "apizarro@gmail.com",
    proyectoId: "gran-avenida-4900",
    tipologiaId: "c",
    etapa: "escritura",
    enDias: null,
    notas: "Escritura firmada en agosto. Entrega de llaves coordinada. Pedir referido.",
  },
  {
    nombre: "Daniela Silva",
    telefono: "+56 9 6611 2288",
    email: "dsilva@gmail.com",
    proyectoId: "bustamante-180",
    tipologiaId: "a",
    etapa: "perdido",
    enDias: null,
    notas: "Compró en otro proyecto de Providencia con entrega inmediata y estacionamiento incluido.",
  },
];

function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

export function clientesDemo(): Cliente[] {
  const hoy = hoyISO();
  return SEMILLAS.map((s, i) =>
    nuevoCliente({
      id: `demo_${i + 1}`,
      nombre: s.nombre,
      telefono: s.telefono,
      email: s.email,
      proyectoId: s.proyectoId,
      tipologiaId: s.tipologiaId,
      etapa: s.etapa,
      proximoContacto: s.enDias === null ? null : sumarDias(hoy, s.enDias),
      notas: s.notas,
    }),
  );
}
