# Pyxis · Proyectos y Metro de Santiago

Prototipo jugable para una inmobiliaria: mapa de proyectos en Santiago de Chile con la red de Metro actual y futura, fichas con tipologías y un simulador de crédito hipotecario en UF y pesos.

## Qué hace

- **Mapa** (Leaflet, sin API key): 15 proyectos de ejemplo como pines con su precio desde. Líneas 1 a 6 del Metro operativas en trazo sólido; Línea 7 (en construcción, 2028), extensión L4 a Bajos de Mena, extensión L6, Línea 8 y Línea 9 (proyectadas) en trazo punteado. Cada línea se puede ocultar. Al hacer clic en una estación se dibuja un radio de 800 m y se resaltan los proyectos que quedan dentro.
- **Ficha de proyecto**: 3 tipologías con precio en UF y CLP, UF/m², estación operativa más cercana y la estación futura que la mejora, condiciones de pie y bono pie.
- **Precio vs Metro**: gráfico de UF/m² contra minutos caminando a la estación más cercana, con opción de contar líneas futuras.
- **Simulador**: amortización francesa en UF, pie, bono pie, pie en cuotas hasta la entrega, plazo, tasa, seguros, gastos operacionales, renta mínima y tabla de amortización. El valor de la UF se toma de mindicador.cl y se puede editar.
- **Enlaces compartibles**: `?p=<proyecto>`, `?e=<línea>:<estación>`, `?tab=simulador|analisis`.

## Datos

- **Proyectos**: mock, en `src/data/proyectos.ts`. Precios ilustrativos.
- **Metro operativo (L1–L6, L4A)**: estaciones y trazado real de la vía importados desde OpenStreetMap con `node scripts/importar-metro-osm.mjs` → `src/data/metro-osm.json`.
- **Metro futuro**: `src/data/metro-futuro.json` con nombres y orden oficiales (Metro S.A. / Wikipedia, sep. 2026): L7 (19 estaciones, 2028), extensiones de L6 a Isidora Goyenechea y Lo Errázuriz (2028), L9 en tres tramos (2030/2032/2033), L8 (2032) y Línea A al aeropuerto (2032). Coordenadas estimadas; las de L7 se proyectan sobre el trazado real. La extensión de L4 a Bajos de Mena se canceló en 2023 y no se muestra.
- **Caminatas**: distancia por calle desde cada proyecto a sus estaciones cercanas, calculada con Valhalla (perfil peatón, OSM) mediante `node --experimental-strip-types scripts/calcular-caminatas.mjs` → `src/data/caminatas.json`. Se recalcula solo lo nuevo; `--todo` fuerza todo. Sin ruta calculada se estima línea recta × 1,25. Ritmo 80 m/min.
- **Tasa de referencia**: `/api/tasa` lee la serie F022.VIV.TIP.MA03.UF.Z.M (hipotecarios en UF a más de 3 años) del Banco Central si existen `BCCH_USER` y `BCCH_PASS` (registro gratuito en https://si3.bcentral.cl/Siete/). Si no, usa `TASA_REFERENCIA_UF` o 4,4 %.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest: cálculo de crédito y geodistancias
npm run build
```

## Deploy en Vercel

```bash
npx vercel login
npx vercel        # preview
npx vercel --prod
```

Variables de entorno: `CLAVE_INTERNA` (clave del área interna), las de Upstash Redis que crea la integración, y opcionalmente `BCCH_USER`/`BCCH_PASS` o `TASA_REFERENCIA_UF` para la tasa. El mapa y el simulador funcionan sin ninguna.

## Área interna (clientes)

`/interno` está protegida con una clave compartida (`CLAVE_INTERNA`; si no está definida se usa `ribs2026` y la pantalla lo avisa). La sesión dura 30 días en una cookie httpOnly; cambiar la clave invalida todas las sesiones.

Desde ahí se lleva el seguimiento de clientes: proyecto y tipología de interés, etapa (nuevo → contactado → visita → reserva → promesa → escritura, o perdido), próximo contacto y notas. La lista se ordena por fecha de seguimiento y muestra atrasados y contactos del día. Desde la ficha de cualquier proyecto, el botón **+ Cliente** abre el formulario con el proyecto precargado.

Los datos se guardan en **Upstash Redis** (integración de Vercel Marketplace, variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`). Si no hay credenciales, la pantalla guarda en el navegador y lo indica.

```bash
vercel integration add upstash/upstash-kv --name ribs-clientes   # requiere aceptar términos en el navegador
vercel env pull                                                   # para desarrollo local
```

## Proyectos editables

En `/interno` → **Proyectos** se crean, editan y borran los proyectos reales (guardados en Redis bajo `pyxis:proyectos`). Mientras la lista esté vacía, el mapa muestra los 15 de muestra; "Importar muestra" los copia a Redis para editarlos. Al guardar, el servidor calcula las caminatas por calle a las estaciones cercanas (Valhalla), así que un guardado tarda unos segundos. La dirección se puede ubicar con Nominatim (OpenStreetMap) o arrastrando el pin.

## Cotizaciones

Con sesión interna abierta, el simulador muestra **Guardar cotización** cuando se llegó desde una tipología. Se elige un cliente existente o un prospecto, una vigencia y una nota; se genera un enlace público `/c/<código>` (no indexable) con la ficha del proyecto, el Metro cercano, la simulación congelada con la UF del día y la comparación por plazo, imprimible a PDF desde el navegador. Las cotizaciones se listan en la ficha de cada cliente y quedan en Redis bajo `pyxis:cotizaciones`. El pie de página se configura con `NEXT_PUBLIC_CONTACTO`.
