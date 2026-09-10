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

## Historial y embudo

Cada cliente tiene un historial de interacciones: las manuales (llamada, WhatsApp, email, visita, reunión, nota) se registran desde la ficha con un solo campo, y el sistema agrega solas las de **cambio de etapa** (al guardar con otra etapa) y **cotización enviada** (al generar una cotización para ese cliente). El último contacto se ve en la lista.

La pestaña **Embudo** muestra una columna por etapa con el conteo, la mediana de días en etapa y cada cliente con los días que lleva ahí (desde el último cambio de etapa). Un cliente en curso con 14 días o más sin avanzar se marca como estancado. Arriba: en curso, estancados, escrituras y tasa de cierre (escrituras sobre escrituras más perdidos).

## Deploy

El proyecto de Vercel está conectado al repo `Ribs-org/sistema-inmobiliario`: cada push a `main` despliega a producción y cada rama o PR genera un preview. GitHub Actions corre typecheck, lint y tests en cada push y PR (`.github/workflows/ci.yml`). El deploy manual con `vercel --prod` sigue funcionando pero ya no hace falta.

## Comparador

En la lista del mapa cada proyecto tiene una casilla para compararlo (hasta 3). La pestaña **Comparar** los muestra lado a lado con las mismas condiciones de crédito (pie, plazo, tasa, seguros) y una tipología elegible por columna; el mejor valor de cada fila (precio, UF/m², minutos al Metro, dividendo) se resalta. Con sesión interna, "Guardar comparativa" crea una cotización con enlace público `/c/<código>` que muestra la misma tabla congelada.

## Fotos y planos

Las imágenes viven en **Vercel Blob** (store `pyxis-imagenes`, público; variable `BLOB_READ_WRITE_TOKEN`). En el área interna, cada proyecto acepta hasta 12 fotos (JPG, PNG, WebP o AVIF de hasta 8 MB; la primera es la principal y se pueden reordenar) y cada tipología un plano (imagen o PDF). Se muestran en la ficha, en el comparador y en la cotización. La API `/api/imagenes` solo acepta subidas con sesión y solo guarda URLs de ese store.

## Importar proyectos desde un archivo

En Proyectos hay **Importar archivo** (CSV o JSON) y dos plantillas de muestra para descargar: `plantilla-proyectos.csv` (para Excel: separador `;`, decimales con coma, una fila por tipología; las filas de un mismo `proyecto_id` se agrupan y los datos del proyecto se toman de la primera) y `plantilla-proyectos.json` (mismo formato que **Exportar JSON**, útil como respaldo o para editar en bloque). Los proyectos con el mismo id se actualizan conservando sus fotos y planos; al importar se calculan las caminatas de cada uno, así que tarda unos segundos por proyecto. Las filas con problemas se informan sin detener el resto.

Las fotos se optimizan al subir (máximo 1600 px por lado, orientación corregida, WebP) y la ficha las muestra en una galería con visor (flechas o teclado, Esc para cerrar).
