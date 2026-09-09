// Red de Metro de Santiago. Coordenadas aproximadas (±150 m), suficientes para
// visualizar cercanía; no usar para navegación.
// Estado de la red a septiembre de 2026.

export type EstadoLinea = "operativa" | "construccion" | "proyectada";

export type Estacion = {
  nombre: string;
  lat: number;
  lng: number;
  /** Combinación con otras líneas (ids) */
  combina?: string[];
};

export type Linea = {
  id: string;
  nombre: string;
  color: string;
  estado: EstadoLinea;
  /** Año estimado de apertura para líneas no operativas */
  apertura?: number;
  nota?: string;
  estaciones: Estacion[];
};

const e = (nombre: string, lat: number, lng: number, combina?: string[]): Estacion => ({
  nombre,
  lat,
  lng,
  combina,
});

export const LINEAS: Linea[] = [
  {
    id: "L1",
    nombre: "Línea 1",
    color: "#E2231A",
    estado: "operativa",
    estaciones: [
      e("San Pablo", -33.4445, -70.7325, ["L5"]),
      e("Neptuno", -33.4472, -70.7255),
      e("Pajaritos", -33.4492, -70.7175),
      e("Las Rejas", -33.4528, -70.7105),
      e("Ecuador", -33.4536, -70.7025),
      e("San Alberto Hurtado", -33.4533, -70.696),
      e("Universidad de Santiago", -33.4523, -70.6875),
      e("Estación Central", -33.4517, -70.679),
      e("Unión Latinoamericana", -33.4492, -70.672),
      e("República", -33.4478, -70.666),
      e("Los Héroes", -33.4462, -70.6607, ["L2"]),
      e("La Moneda", -33.443, -70.654),
      e("Universidad de Chile", -33.444, -70.65, ["L3"]),
      e("Santa Lucía", -33.4415, -70.644),
      e("Universidad Católica", -33.44, -70.64),
      e("Baquedano", -33.437, -70.6345, ["L5"]),
      e("Salvador", -33.4341, -70.6262),
      e("Manuel Montt", -33.43, -70.6187),
      e("Pedro de Valdivia", -33.4273, -70.6118),
      e("Los Leones", -33.4222, -70.606, ["L6"]),
      e("Tobalaba", -33.4183, -70.601, ["L4"]),
      e("El Golf", -33.4148, -70.595),
      e("Alcántara", -33.4118, -70.588),
      e("Escuela Militar", -33.409, -70.58),
      e("Manquehue", -33.4062, -70.57),
      e("Hernando de Magallanes", -33.4046, -70.5605),
      e("Los Dominicos", -33.4033, -70.551),
    ],
  },
  {
    id: "L2",
    nombre: "Línea 2",
    color: "#F5B800",
    estado: "operativa",
    estaciones: [
      e("Vespucio Norte", -33.379, -70.665),
      e("Zapadores", -33.386, -70.662),
      e("Dorsal", -33.3925, -70.659),
      e("Einstein", -33.399, -70.656),
      e("Cementerios", -33.409, -70.653),
      e("Cerro Blanco", -33.418, -70.651),
      e("Patronato", -33.427, -70.65),
      e("Puente Cal y Canto", -33.4325, -70.6525, ["L3"]),
      e("Santa Ana", -33.438, -70.656, ["L5"]),
      e("Los Héroes", -33.4462, -70.6607, ["L1"]),
      e("Toesca", -33.4525, -70.662),
      e("Parque O'Higgins", -33.46, -70.662),
      e("Rondizzoni", -33.4675, -70.662),
      e("Franklin", -33.476, -70.662, ["L6"]),
      e("El Llano", -33.486, -70.66),
      e("San Miguel", -33.492, -70.658),
      e("Lo Vial", -33.5005, -70.655),
      e("Departamental", -33.508, -70.653),
      e("Ciudad del Niño", -33.516, -70.652),
      e("Lo Ovalle", -33.524, -70.651),
      e("El Parrón", -33.532, -70.654),
      e("La Cisterna", -33.5375, -70.664, ["L4A"]),
      e("El Bosque", -33.55, -70.672),
      e("Observatorio", -33.561, -70.677),
      e("Copa Lo Martínez", -33.572, -70.68),
      e("Hospital El Pino", -33.582, -70.681),
    ],
  },
  {
    id: "L3",
    nombre: "Línea 3",
    color: "#7B4A2D",
    estado: "operativa",
    estaciones: [
      e("Plaza Quilicura", -33.3565, -70.729),
      e("Lo Cruzat", -33.364, -70.725),
      e("Ferrocarril", -33.372, -70.715),
      e("Los Libertadores", -33.3675, -70.702),
      e("Cardenal Caro", -33.376, -70.69),
      e("Vivaceta", -33.3835, -70.68),
      e("Conchalí", -33.3925, -70.67),
      e("Plaza Chacabuco", -33.406, -70.665),
      e("Hospitales", -33.419, -70.656),
      e("Puente Cal y Canto", -33.4325, -70.6525, ["L2"]),
      e("Plaza de Armas", -33.438, -70.6505, ["L5"]),
      e("Universidad de Chile", -33.444, -70.65, ["L1"]),
      e("Parque Almagro", -33.4515, -70.648),
      e("Matta", -33.4585, -70.643),
      e("Irarrázaval", -33.4553, -70.63, ["L5"]),
      e("Monseñor Eyzaguirre", -33.4555, -70.62),
      e("Ñuñoa", -33.456, -70.611, ["L6"]),
      e("Chile España", -33.456, -70.601),
      e("Villa Frei", -33.456, -70.592),
      e("Plaza Egaña", -33.455, -70.583, ["L4"]),
      e("Fernando Castillo Velasco", -33.455, -70.573),
    ],
  },
  {
    id: "L4",
    nombre: "Línea 4",
    color: "#1E3A8A",
    estado: "operativa",
    estaciones: [
      e("Tobalaba", -33.4183, -70.601, ["L1"]),
      e("Cristóbal Colón", -33.4245, -70.5975),
      e("Francisco Bilbao", -33.4325, -70.596),
      e("Príncipe de Gales", -33.444, -70.593),
      e("Simón Bolívar", -33.4505, -70.588),
      e("Plaza Egaña", -33.455, -70.583, ["L3"]),
      e("Los Orientales", -33.464, -70.58),
      e("Grecia", -33.47, -70.579),
      e("Los Presidentes", -33.479, -70.578),
      e("Quilín", -33.487, -70.578),
      e("Las Torres", -33.496, -70.578),
      e("Macul", -33.504, -70.578),
      e("Vicuña Mackenna", -33.515, -70.59, ["L4A"]),
      e("Vicente Valdés", -33.527, -70.597, ["L5"]),
      e("Rojas Magallanes", -33.535, -70.586),
      e("Trinidad", -33.544, -70.585),
      e("San José de la Estrella", -33.553, -70.585),
      e("Los Quillayes", -33.561, -70.585),
      e("Elisa Correa", -33.568, -70.585),
      e("Hospital Sótero del Río", -33.576, -70.582),
      e("Protectora de la Infancia", -33.585, -70.579),
      e("Las Mercedes", -33.594, -70.577),
      e("Plaza de Puente Alto", -33.609, -70.575),
    ],
  },
  {
    id: "L4A",
    nombre: "Línea 4A",
    color: "#2FA4D8",
    estado: "operativa",
    estaciones: [
      e("Vicuña Mackenna", -33.515, -70.59, ["L4"]),
      e("Santa Julia", -33.5195, -70.603),
      e("La Granja", -33.5245, -70.617),
      e("Santa Rosa", -33.526, -70.631),
      e("San Ramón", -33.5285, -70.643),
      e("La Cisterna", -33.5375, -70.664, ["L2"]),
    ],
  },
  {
    id: "L5",
    nombre: "Línea 5",
    color: "#0E9F5A",
    estado: "operativa",
    estaciones: [
      e("Plaza de Maipú", -33.51, -70.758),
      e("Santiago Bueras", -33.505, -70.753),
      e("Del Sol", -33.4985, -70.748),
      e("Monte Tabor", -33.489, -70.744),
      e("Las Parcelas", -33.4785, -70.742),
      e("Laguna Sur", -33.4685, -70.7395),
      e("Barrancas", -33.456, -70.7345),
      e("Pudahuel", -33.4425, -70.729),
      e("Lo Prado", -33.4445, -70.713),
      e("Blanqueado", -33.442, -70.702),
      e("Gruta de Lourdes", -33.439, -70.6935),
      e("Quinta Normal", -33.438, -70.682),
      e("Cumming", -33.439, -70.669),
      e("Santa Ana", -33.438, -70.656, ["L2"]),
      e("Plaza de Armas", -33.438, -70.6505, ["L3"]),
      e("Bellas Artes", -33.4365, -70.644),
      e("Baquedano", -33.437, -70.6345, ["L1"]),
      e("Parque Bustamante", -33.443, -70.632),
      e("Santa Isabel", -33.4478, -70.631),
      e("Irarrázaval", -33.4553, -70.63, ["L3"]),
      e("Ñuble", -33.464, -70.628, ["L6"]),
      e("Rodrigo de Araya", -33.473, -70.624),
      e("Carlos Valdovinos", -33.48, -70.621),
      e("Camino Agrícola", -33.487, -70.617),
      e("San Joaquín", -33.495, -70.613),
      e("Pedrero", -33.503, -70.608),
      e("Mirador", -33.512, -70.603),
      e("Bellavista de La Florida", -33.5195, -70.599),
      e("Vicente Valdés", -33.527, -70.597, ["L4"]),
    ],
  },
  {
    id: "L6",
    nombre: "Línea 6",
    color: "#7A2A8C",
    estado: "operativa",
    estaciones: [
      e("Cerrillos", -33.5, -70.708),
      e("Lo Valledor", -33.489, -70.687),
      e("Pedro Aguirre Cerda", -33.483, -70.674),
      e("Franklin", -33.476, -70.662, ["L2"]),
      e("Bío Bío", -33.47, -70.648),
      e("Ñuble", -33.464, -70.628, ["L5"]),
      e("Estadio Nacional", -33.462, -70.614),
      e("Ñuñoa", -33.456, -70.611, ["L3"]),
      e("Inés de Suárez", -33.44, -70.61),
      e("Los Leones", -33.4222, -70.606, ["L1"]),
    ],
  },

  // ---------------------------------------------------------------- futuras
  {
    id: "L7",
    nombre: "Línea 7",
    color: "#1FA6A0",
    estado: "construccion",
    apertura: 2028,
    nota: "Renca – Vitacura, 26 km. En construcción.",
    estaciones: [
      e("Brasil", -33.4, -70.733),
      e("Vicuña Mackenna (Renca)", -33.403, -70.72),
      e("Salvador Gutiérrez", -33.413, -70.708),
      e("Walker Martínez", -33.422, -70.695),
      e("Huelén", -33.43, -70.68),
      e("Ricardo Cumming", -33.432, -70.668),
      e("Puente Cal y Canto", -33.4325, -70.6525, ["L2", "L3"]),
      e("Baquedano", -33.437, -70.6345, ["L1", "L5"]),
      e("Pedro de Valdivia", -33.4273, -70.6118, ["L1"]),
      e("Isidora Goyenechea", -33.413, -70.598, ["L6"]),
      e("Vitacura", -33.403, -70.587),
      e("Padre Hurtado", -33.399, -70.576),
      e("Américo Vespucio", -33.396, -70.565),
      e("Gerónimo de Alderete", -33.392, -70.555),
      e("Estoril", -33.385, -70.544),
    ],
  },
  {
    id: "L6X",
    nombre: "Línea 6 · extensión",
    color: "#7A2A8C",
    estado: "proyectada",
    apertura: 2030,
    nota: "Los Leones – Isidora Goyenechea (combinación con L7).",
    estaciones: [
      e("Los Leones", -33.4222, -70.606, ["L1", "L6"]),
      e("Isidora Goyenechea", -33.413, -70.598, ["L7"]),
    ],
  },
  {
    id: "L4X",
    nombre: "Línea 4 · extensión",
    color: "#1E3A8A",
    estado: "construccion",
    apertura: 2030,
    nota: "Plaza de Puente Alto – Bajos de Mena.",
    estaciones: [
      e("Plaza de Puente Alto", -33.609, -70.575, ["L4"]),
      e("Concha y Toro", -33.615, -70.588),
      e("Bajos de Mena", -33.619, -70.601),
    ],
  },
  {
    id: "L8",
    nombre: "Línea 8",
    color: "#F26522",
    estado: "proyectada",
    apertura: 2032,
    nota: "Providencia – Puente Alto por Tobalaba, Peñalolén y La Florida. Trazado referencial.",
    estaciones: [
      e("Francisco Bilbao", -33.4325, -70.596, ["L4"]),
      e("Bilbao / Padre Hurtado", -33.436, -70.576),
      e("Tobalaba / Grecia", -33.468, -70.556),
      e("Peñalolén", -33.485, -70.55),
      e("Tobalaba / Departamental", -33.501, -70.556),
      e("La Florida", -33.52, -70.57),
      e("Walker Martínez (La Florida)", -33.539, -70.571),
      e("Gabriela", -33.556, -70.565),
      e("Camilo Henríquez", -33.573, -70.56),
      e("Puente Alto", -33.59, -70.562),
    ],
  },
  {
    id: "L9",
    nombre: "Línea 9",
    color: "#D9127A",
    estado: "proyectada",
    apertura: 2032,
    nota: "Santiago Centro – La Pintana por Av. Santa Rosa. Trazado referencial.",
    estaciones: [
      e("Santa Lucía", -33.4415, -70.644, ["L1"]),
      e("Matta", -33.4585, -70.643, ["L3"]),
      e("Santa Rosa / Isabel Riquelme", -33.47, -70.643),
      e("Santa Rosa / Carlos Valdovinos", -33.483, -70.642),
      e("Santa Rosa / Departamental", -33.496, -70.64),
      e("Santa Rosa / Lo Ovalle", -33.51, -70.637),
      e("Santa Rosa", -33.526, -70.631, ["L4A"]),
      e("Santa Rosa / Santa Julia", -33.54, -70.628),
      e("Santa Rosa / Gabriela", -33.554, -70.625),
      e("La Pintana", -33.582, -70.62),
      e("Santa Rosa / Eyzaguirre", -33.606, -70.61),
    ],
  },
];

export const LINEAS_OPERATIVAS = LINEAS.filter((l) => l.estado === "operativa");
export const LINEAS_FUTURAS = LINEAS.filter((l) => l.estado !== "operativa");

export const ETIQUETA_ESTADO: Record<EstadoLinea, string> = {
  operativa: "Operativa",
  construccion: "En construcción",
  proyectada: "Proyectada",
};

export type EstacionConLinea = Estacion & {
  lineaId: string;
  lineaNombre: string;
  color: string;
  estado: EstadoLinea;
  apertura?: number;
};

/** Lista plana de todas las estaciones, con referencia a su línea. */
export const ESTACIONES: EstacionConLinea[] = LINEAS.flatMap((l) =>
  l.estaciones.map((s) => ({
    ...s,
    lineaId: l.id,
    lineaNombre: l.nombre,
    color: l.color,
    estado: l.estado,
    apertura: l.apertura,
  })),
);
