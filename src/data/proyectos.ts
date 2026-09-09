// Proyectos de ejemplo (mock). Precios en UF, referenciales para Santiago 2026.

export type EstadoVenta = "entrega-inmediata" | "en-verde" | "en-blanco";

export type Tipologia = {
  id: string;
  nombre: string; // "1D1B", "2D2B", ...
  dormitorios: number;
  banos: number;
  m2Utiles: number;
  m2Terraza: number;
  precioUF: number;
  orientacion: string;
  disponibles: number;
};

export type Proyecto = {
  id: string;
  nombre: string;
  inmobiliaria: string;
  comuna: string;
  direccion: string;
  lat: number;
  lng: number;
  estado: EstadoVenta;
  entrega: string;
  pisos: number;
  unidades: number;
  pieMinimoPct: number;
  /** Bono pie de la inmobiliaria, como % del precio (reduce el pie que paga el cliente) */
  bonoPiePct?: number;
  pieEnCuotas?: boolean;
  descripcion: string;
  amenidades: string[];
  tipologias: Tipologia[];
};

export const ETIQUETA_ESTADO_VENTA: Record<EstadoVenta, string> = {
  "entrega-inmediata": "Entrega inmediata",
  "en-verde": "En verde",
  "en-blanco": "En blanco",
};

const t = (
  id: string,
  nombre: string,
  dormitorios: number,
  banos: number,
  m2Utiles: number,
  m2Terraza: number,
  precioUF: number,
  orientacion: string,
  disponibles: number,
): Tipologia => ({ id, nombre, dormitorios, banos, m2Utiles, m2Terraza, precioUF, orientacion, disponibles });

export const PROYECTOS: Proyecto[] = [
  {
    id: "irarrazaval-3300",
    nombre: "Irarrázaval 3300",
    inmobiliaria: "Inmobiliaria Andes Sur",
    comuna: "Ñuñoa",
    direccion: "Av. Irarrázaval 3300",
    lat: -33.4562,
    lng: -70.6045,
    estado: "en-verde",
    entrega: "Segundo semestre 2027",
    pisos: 18,
    unidades: 210,
    pieMinimoPct: 10,
    pieEnCuotas: true,
    descripcion:
      "Torre única frente a Irarrázaval, a dos cuadras de Plaza Ñuñoa. Departamentos con logia y cocina integrada.",
    amenidades: ["Quincho", "Sala multiuso", "Gimnasio", "Bicicletero", "Lavandería"],
    tipologias: [
      t("a", "1D1B", 1, 1, 36, 5, 3650, "Norponiente", 24),
      t("b", "2D1B", 2, 1, 48, 6, 4780, "Norte", 31),
      t("c", "2D2B", 2, 2, 62, 8, 6250, "Oriente", 12),
    ],
  },
  {
    id: "bustamante-180",
    nombre: "Parque Bustamante 180",
    inmobiliaria: "Constructora Río Mapocho",
    comuna: "Providencia",
    direccion: "Gral. Bustamante 180",
    lat: -33.4418,
    lng: -70.6322,
    estado: "entrega-inmediata",
    entrega: "Inmediata",
    pisos: 14,
    unidades: 96,
    pieMinimoPct: 20,
    descripcion:
      "Frente al Parque Bustamante. Últimas unidades con orientación al parque y estacionamiento incluido.",
    amenidades: ["Terraza panorámica", "Cowork", "Gimnasio", "Conserjería 24 h"],
    tipologias: [
      t("a", "1D1B", 1, 1, 41, 6, 4900, "Poniente (parque)", 3),
      t("b", "2D2B", 2, 2, 66, 9, 7850, "Oriente", 5),
      t("c", "3D2B", 3, 2, 88, 12, 10400, "Norte", 2),
    ],
  },
  {
    id: "leones-lofts",
    nombre: "Los Leones Lofts",
    inmobiliaria: "Grupo Cordillera",
    comuna: "Providencia",
    direccion: "Av. Los Leones 420",
    lat: -33.4238,
    lng: -70.6088,
    estado: "en-blanco",
    entrega: "Primer semestre 2029",
    pisos: 22,
    unidades: 180,
    pieMinimoPct: 10,
    bonoPiePct: 5,
    pieEnCuotas: true,
    descripcion:
      "Lofts de doble altura a pasos de la combinación Los Leones (L1–L6) y de la futura extensión de L6.",
    amenidades: ["Piscina temperada", "Rooftop", "Sala de cine", "Pet friendly"],
    tipologias: [
      t("a", "Loft 1D1B", 1, 1, 44, 4, 5500, "Norte", 40),
      t("b", "2D2B", 2, 2, 70, 8, 8900, "Nororiente", 28),
      t("c", "3D2B", 3, 2, 95, 14, 12600, "Oriente", 10),
    ],
  },
  {
    id: "vista-estoril",
    nombre: "Vista Estoril",
    inmobiliaria: "Inmobiliaria Manquehue Oriente",
    comuna: "Vitacura",
    direccion: "Av. Las Condes 13.800",
    lat: -33.3868,
    lng: -70.5478,
    estado: "en-verde",
    entrega: "Primer semestre 2028",
    pisos: 8,
    unidades: 64,
    pieMinimoPct: 20,
    descripcion:
      "Condominio de baja altura con vista a la cordillera. Hoy sin Metro cercano; la futura estación Estoril (L7) quedará a menos de 400 m.",
    amenidades: ["Piscina", "Club house", "Juegos infantiles", "Quincho"],
    tipologias: [
      t("a", "2D2B", 2, 2, 78, 14, 11200, "Nororiente", 9),
      t("b", "3D2B", 3, 2, 105, 18, 15300, "Norte", 14),
      t("c", "3D3B + servicio", 3, 3, 134, 24, 20500, "Oriente", 4),
    ],
  },
  {
    id: "alameda-4100",
    nombre: "Alameda 4100",
    inmobiliaria: "Inmobiliaria Central",
    comuna: "Estación Central",
    direccion: "Av. Libertador Bernardo O'Higgins 4100",
    lat: -33.4528,
    lng: -70.6892,
    estado: "entrega-inmediata",
    entrega: "Inmediata",
    pisos: 24,
    unidades: 420,
    pieMinimoPct: 10,
    bonoPiePct: 10,
    descripcion:
      "Departamentos de inversión a una cuadra de la estación Universidad de Santiago. Alta demanda de arriendo estudiantil.",
    amenidades: ["Gimnasio", "Lavandería", "Sala de estudio", "Bicicletero"],
    tipologias: [
      t("a", "Estudio", 0, 1, 24, 3, 1990, "Sur", 38),
      t("b", "1D1B", 1, 1, 32, 4, 2650, "Norte", 44),
      t("c", "2D1B", 2, 1, 44, 5, 3480, "Poniente", 17),
    ],
  },
  {
    id: "macul-sur",
    nombre: "Macul Sur",
    inmobiliaria: "Inmobiliaria Andes Sur",
    comuna: "Macul",
    direccion: "Av. Macul 4200",
    lat: -33.4948,
    lng: -70.6098,
    estado: "en-verde",
    entrega: "Segundo semestre 2027",
    pisos: 12,
    unidades: 150,
    pieMinimoPct: 15,
    pieEnCuotas: true,
    descripcion: "Barrio residencial consolidado, a 500 m de la estación San Joaquín (L5) y del campus UC.",
    amenidades: ["Quincho", "Sala multiuso", "Bicicletero", "Áreas verdes"],
    tipologias: [
      t("a", "1D1B", 1, 1, 38, 5, 2950, "Norte", 20),
      t("b", "2D1B", 2, 1, 50, 6, 3900, "Oriente", 26),
      t("c", "3D2B", 3, 2, 68, 8, 5350, "Norponiente", 15),
    ],
  },
  {
    id: "gran-avenida-4900",
    nombre: "Gran Avenida 4900",
    inmobiliaria: "Constructora Río Mapocho",
    comuna: "San Miguel",
    direccion: "Gran Avenida José Miguel Carrera 4900",
    lat: -33.4972,
    lng: -70.6563,
    estado: "entrega-inmediata",
    entrega: "Inmediata",
    pisos: 20,
    unidades: 260,
    pieMinimoPct: 10,
    descripcion: "A pasos de Lo Vial (L2). Departamentos con terraza y estacionamiento opcional.",
    amenidades: ["Gimnasio", "Piscina", "Quincho", "Conserjería 24 h"],
    tipologias: [
      t("a", "1D1B", 1, 1, 35, 5, 2780, "Poniente", 12),
      t("b", "2D1B", 2, 1, 47, 6, 3620, "Norte", 18),
      t("c", "2D2B", 2, 2, 58, 7, 4450, "Oriente", 9),
    ],
  },
  {
    id: "independencia-norte",
    nombre: "Independencia 1250",
    inmobiliaria: "Inmobiliaria Central",
    comuna: "Independencia",
    direccion: "Av. Independencia 1250",
    lat: -33.4203,
    lng: -70.6572,
    estado: "en-verde",
    entrega: "Primer semestre 2027",
    pisos: 16,
    unidades: 190,
    pieMinimoPct: 10,
    bonoPiePct: 5,
    pieEnCuotas: true,
    descripcion: "Frente a la estación Hospitales (L3), junto al polo de salud de la Universidad de Chile.",
    amenidades: ["Sala multiuso", "Lavandería", "Bicicletero", "Terraza común"],
    tipologias: [
      t("a", "Estudio", 0, 1, 26, 3, 1950, "Sur", 30),
      t("b", "1D1B", 1, 1, 34, 4, 2590, "Oriente", 35),
      t("c", "2D2B", 2, 2, 52, 6, 3950, "Norte", 14),
    ],
  },
  {
    id: "huelen-park",
    nombre: "Mapocho 2900",
    inmobiliaria: "Grupo Cordillera",
    comuna: "Quinta Normal",
    direccion: "Av. Mapocho 2900",
    lat: -33.4312,
    lng: -70.6815,
    estado: "en-blanco",
    entrega: "Segundo semestre 2028",
    pisos: 15,
    unidades: 230,
    pieMinimoPct: 10,
    pieEnCuotas: true,
    descripcion:
      "Junto al Parque de los Reyes. Hoy a 15 minutos a pie de Quinta Normal (L5); la estación Matucana (L7, 2028) quedará a 300 m.",
    amenidades: ["Quincho", "Gimnasio", "Sala de niños", "Bicicletero"],
    tipologias: [
      t("a", "1D1B", 1, 1, 37, 5, 2690, "Norte (parque)", 42),
      t("b", "2D1B", 2, 1, 49, 6, 3480, "Poniente", 36),
      t("c", "2D2B", 2, 2, 60, 7, 4290, "Oriente", 20),
    ],
  },
  {
    id: "egana-living",
    nombre: "Egaña Living",
    inmobiliaria: "Inmobiliaria Manquehue Oriente",
    comuna: "La Reina",
    direccion: "Av. Larraín 6200",
    lat: -33.4562,
    lng: -70.5858,
    estado: "entrega-inmediata",
    entrega: "Inmediata",
    pisos: 10,
    unidades: 84,
    pieMinimoPct: 20,
    descripcion: "A 300 m de Plaza Egaña, combinación L3–L4. Edificio de baja densidad en barrio de casas.",
    amenidades: ["Piscina", "Quincho", "Sala multiuso", "Áreas verdes"],
    tipologias: [
      t("a", "2D1B", 2, 1, 52, 7, 4980, "Norte", 4),
      t("b", "2D2B", 2, 2, 65, 9, 6400, "Oriente", 6),
      t("c", "3D2B", 3, 2, 84, 12, 8300, "Nororiente", 3),
    ],
  },
  {
    id: "puente-alto-centro",
    nombre: "Plaza Puente Alto",
    inmobiliaria: "Inmobiliaria Andes Sur",
    comuna: "Puente Alto",
    direccion: "Av. Concha y Toro 1180",
    lat: -33.6068,
    lng: -70.5792,
    estado: "en-verde",
    entrega: "Segundo semestre 2027",
    pisos: 14,
    unidades: 300,
    pieMinimoPct: 10,
    bonoPiePct: 10,
    pieEnCuotas: true,
    descripcion: "A dos cuadras de Plaza de Puente Alto (L4), donde llegará también la Línea 9.",
    amenidades: ["Quincho", "Juegos infantiles", "Sala multiuso", "Bicicletero"],
    tipologias: [
      t("a", "1D1B", 1, 1, 38, 5, 2150, "Norte", 40),
      t("b", "2D1B", 2, 1, 50, 6, 2790, "Poniente", 55),
      t("c", "3D2B", 3, 2, 66, 8, 3690, "Oriente", 30),
    ],
  },
  {
    id: "bilbao-oriente",
    nombre: "Bilbao Oriente",
    inmobiliaria: "Grupo Cordillera",
    comuna: "Las Condes",
    direccion: "Av. Francisco Bilbao 5400",
    lat: -33.4338,
    lng: -70.5795,
    estado: "en-blanco",
    entrega: "Primer semestre 2029",
    pisos: 7,
    unidades: 56,
    pieMinimoPct: 20,
    descripcion:
      "Barrio residencial de Las Condes, de casas y edificios bajos. Sin Metro a menos de 1,5 km: Francisco Bilbao (L4) queda a unos 20 minutos a pie.",
    amenidades: ["Piscina", "Gimnasio", "Quincho", "Bodega incluida"],
    tipologias: [
      t("a", "2D2B", 2, 2, 72, 12, 9400, "Norte", 10),
      t("b", "3D2B", 3, 2, 98, 16, 12900, "Nororiente", 12),
      t("c", "3D3B", 3, 3, 122, 20, 16800, "Oriente", 5),
    ],
  },
  {
    id: "florida-walker",
    nombre: "Tobalaba 11.200",
    inmobiliaria: "Constructora Río Mapocho",
    comuna: "La Florida",
    direccion: "Av. Tobalaba 11.200",
    lat: -33.5335,
    lng: -70.565,
    estado: "en-verde",
    entrega: "Primer semestre 2028",
    pisos: 16,
    unidades: 240,
    pieMinimoPct: 10,
    pieEnCuotas: true,
    descripcion:
      "Sector oriente de La Florida. Hoy a más de 20 minutos de Rojas Magallanes (L4); la Línea 8 proyecta una estación en Tobalaba con Rojas Magallanes a pasos del edificio.",
    amenidades: ["Quincho", "Gimnasio", "Piscina", "Sala multiuso"],
    tipologias: [
      t("a", "1D1B", 1, 1, 37, 5, 2490, "Norte", 32),
      t("b", "2D2B", 2, 2, 55, 7, 3690, "Oriente", 40),
      t("c", "3D2B", 3, 2, 70, 9, 4690, "Norponiente", 22),
    ],
  },
  {
    id: "santa-rosa-3600",
    nombre: "Santa Rosa 3600",
    inmobiliaria: "Inmobiliaria Central",
    comuna: "San Joaquín",
    direccion: "Av. Santa Rosa 3600",
    lat: -33.4838,
    lng: -70.6428,
    estado: "en-blanco",
    entrega: "Segundo semestre 2028",
    pisos: 18,
    unidades: 310,
    pieMinimoPct: 10,
    bonoPiePct: 10,
    pieEnCuotas: true,
    descripcion:
      "Corredor Santa Rosa. Hoy sin Metro a menos de 1,5 km; la Línea 9 proyecta una estación frente al proyecto.",
    amenidades: ["Quincho", "Lavandería", "Bicicletero", "Sala multiuso"],
    tipologias: [
      t("a", "Estudio", 0, 1, 25, 3, 1690, "Sur", 45),
      t("b", "1D1B", 1, 1, 34, 4, 2190, "Poniente", 50),
      t("c", "2D1B", 2, 1, 46, 5, 2890, "Oriente", 28),
    ],
  },
  {
    id: "patronato-recoleta",
    nombre: "Patronato 720",
    inmobiliaria: "Inmobiliaria Manquehue Oriente",
    comuna: "Recoleta",
    direccion: "Av. Recoleta 720",
    lat: -33.4262,
    lng: -70.6472,
    estado: "entrega-inmediata",
    entrega: "Inmediata",
    pisos: 21,
    unidades: 280,
    pieMinimoPct: 10,
    descripcion: "A 200 m de Patronato (L2) y del Cerro San Cristóbal. Ideal para inversión.",
    amenidades: ["Gimnasio", "Terraza común", "Lavandería", "Cowork"],
    tipologias: [
      t("a", "Estudio", 0, 1, 27, 3, 2190, "Norte", 8),
      t("b", "1D1B", 1, 1, 36, 4, 2890, "Oriente", 11),
      t("c", "2D2B", 2, 2, 54, 6, 4290, "Poniente", 6),
    ],
  },
];

export const COMUNAS = Array.from(new Set(PROYECTOS.map((p) => p.comuna))).sort((a, b) =>
  a.localeCompare(b, "es"),
);
