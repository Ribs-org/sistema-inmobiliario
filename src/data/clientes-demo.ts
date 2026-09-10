// Clientes ficticios para la demo. Las fechas se calculan relativas al día en que se cargan.

import {
  hoyISO,
  nuevaInteraccion,
  nuevoCliente,
  type Cliente,
  type Etapa,
  type TipoInteraccion,
} from "@/lib/clientes";

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
  /** Días que lleva en la etapa actual */
  enEtapa: number;
  /** Historial: días hacia atrás, tipo y texto */
  historial: [number, TipoInteraccion, string][];
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
    enEtapa: 4,
    historial: [
      [9, "llamada", "Primer contacto por el portal. Busca 2D cerca de Plaza Ñuñoa."],
      [6, "whatsapp", "Envié fotos del piloto y lista de precios."],
      [4, "visita", "Visitó el piloto con su pareja. Le gustó el 2D1B norte."],
    ],
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
    enEtapa: 3,
    historial: [
      [20, "email", "Pidió información para inversión, 2 unidades."],
      [12, "reunion", "Reunión en sala de ventas. Le interesa el flujo de arriendo."],
      [3, "cotizacion", "Alameda 4100 · Estudio · 25 años"],
    ],
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
    enEtapa: 8,
    historial: [[8, "llamada", "Familia con 2 niños, busca 3D. Compara con Egaña Living."]],
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
    enEtapa: 1,
    historial: [[1, "nota", "Llegó por Instagram, dejó teléfono en el formulario."]],
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
    enEtapa: 12,
    historial: [
      [40, "visita", "Visita a la sala de ventas."],
      [30, "cotizacion", "Mapocho 2900 · 2D1B · 30 años"],
      [18, "reunion", "Firma de promesa en notaría."],
      [5, "email", "Banco pidió certificado de renta actualizado."],
    ],
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
    enEtapa: 16,
    historial: [
      [16, "llamada", "Tiene subsidio DS1 aprobado. Necesita bono pie."],
      [9, "whatsapp", "Envié disponibilidad de 2D1B poniente. Sin respuesta."],
    ],
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
    enEtapa: 19,
    historial: [
      [19, "visita", "Visita a la sala de ventas. Interesada en 3D2B norte."],
      [10, "llamada", "No contesta."],
      [5, "llamada", "No contesta. Probar por WhatsApp."],
    ],
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
    enEtapa: 25,
    historial: [
      [90, "visita", "Visita al piloto."],
      [70, "reunion", "Promesa firmada."],
      [25, "reunion", "Escritura firmada. Coordinada la entrega de llaves."],
    ],
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
    enEtapa: 30,
    historial: [
      [45, "llamada", "Busca 1D en Providencia con estacionamiento."],
      [30, "nota", "Compró en otro proyecto con entrega inmediata."],
    ],
  },
];

function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

const haceDias = (dias: number) => new Date(Date.now() - dias * 86400000).toISOString();

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
      etapaDesde: haceDias(s.enEtapa),
      creadoEn: haceDias(Math.max(s.enEtapa, ...s.historial.map(([d]) => d))),
      proximoContacto: s.enDias === null ? null : sumarDias(hoy, s.enDias),
      notas: s.notas,
      interacciones: s.historial.map(([dias, tipo, texto]) =>
        nuevaInteraccion({ tipo, texto, fecha: sumarDias(hoy, -dias), creadoEn: haceDias(dias) }),
      ),
    }),
  );
}
