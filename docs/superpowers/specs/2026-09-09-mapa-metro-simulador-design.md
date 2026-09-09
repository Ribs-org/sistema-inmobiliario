# Diseño: mapa de proyectos + Metro + simulador hipotecario

Fecha: 2026-09-09. Estado: aprobado por defecto (sesión autónoma; el usuario pidió construir de inmediato).

## Objetivo

Prototipo jugable, desplegable en Vercel, para una inmobiliaria que vende departamentos en Santiago de Chile.
Tres piezas:

1. Mapa con proyectos (puntos seleccionables) y la red de Metro, incluyendo líneas futuras.
2. Ficha de proyecto con 3 tipologías y su relación con el Metro (distancia a estación actual y futura).
3. Simulador de crédito hipotecario en UF y CLP.

## Decisiones

- **Sin Google Maps ni API keys.** Leaflet + react-leaflet con tiles de CartoDB Positron. Misma sensación de mapa, cero configuración.
- **Sin base de datos.** Proyectos y red de Metro viven en `src/data/*.ts`. Las coordenadas de estaciones son aproximadas y así se indica en la interfaz.
- **Valor UF.** Se consulta `mindicador.cl` desde un route handler (`/api/uf`) con revalidación de 1 h; si falla, se usa un valor de respaldo editable por el usuario.
- **Estado de la red** (a septiembre 2026): L1–L6 y extensiones L2/L3 operativas. L7 en construcción (2028). Extensión L4 a Bajos de Mena en construcción. L6 a Isidora Goyenechea, L8 y L9 proyectadas. Todas las futuras se dibujan punteadas.

## Componentes

| Unidad | Responsabilidad |
| --- | --- |
| `data/metro.ts` | Líneas, color, estado (`operativa` / `construccion` / `proyectada`), estaciones con lat/lng. |
| `data/proyectos.ts` | ~12 proyectos mock con 3 tipologías cada uno, precio en UF, m², entrega, estado de venta. |
| `lib/geo.ts` | Haversine, estación más cercana (actual y futura), proyectos dentro de un radio. |
| `lib/credito.ts` | Amortización francesa, seguros, renta mínima, tabla. Puro, testeado. |
| `lib/format.ts` | Formato UF / CLP / m² con locale es-CL. |
| `components/Mapa.tsx` | Leaflet (client only). Dibuja líneas, estaciones, proyectos; emite selección. |
| `components/PanelProyectos.tsx` | Filtros y lista. |
| `components/FichaProyecto.tsx` | Detalle, tipologías, metro cercano, CTA simular. |
| `components/Simulador.tsx` | Formulario + resultados UF/CLP + tabla. |
| `components/Analitica.tsx` | UF/m² vs distancia al metro (SVG). |
| `app/page.tsx` | Shell: cabecera, pestañas Mapa / Simulador, estado compartido. |

## Flujo de datos

Estado en `page.tsx` (client): proyecto seleccionado, estación seleccionada, filtros, capas visibles, tipología elegida para simular.
El mapa y el panel reciben el mismo estado y callbacks; no hay store global.

## Pruebas

Vitest sobre `lib/credito.ts` y `lib/geo.ts` (cálculo de dividendo conocido, distancia conocida, estación más cercana).
