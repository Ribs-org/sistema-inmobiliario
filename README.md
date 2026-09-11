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

## Carpeta de documentos

Cada cliente tiene una carpeta con los papeles que piden el banco y la inmobiliaria, agrupados por etapa: para la reserva y el crédito, para la promesa, y para la escritura y la entrega. La lista cambia según cómo recibe sus ingresos el cliente: a quien tiene contrato se le piden liquidaciones y certificado de AFP, y al independiente su carpeta tributaria del SII y sus boletas. Cada documento lleva estado (pendiente, recibido, con observaciones, no aplica), responsable y, cuando ayuda, dónde se consigue. La barra de avance y la frase de lo que falta aparecen en la ficha, en la pestaña **Hoy** y en el correo diario, así que un cliente estancado deja de ser "lleva 20 días" y pasa a ser "le falta la preaprobación".

Los archivos van a **Vercel Blob con acceso privado**, no a una URL pública: llevan cédulas y liquidaciones de sueldo. Se suben y se leen por `/api/documentos`, que comprueba la sesión, que el cliente sea de quien pide, y que la ruta apunte a la carpeta de ese mismo cliente. Se aceptan PDF, JPG, PNG y HEIC de hasta 15 MB. Adjuntar requiere Upstash Redis conectado; en modo navegador la pantalla lo avisa.

## Informe de conversión

`/interno` → **Informe**, solo admin. Arriba: clientes, escrituras, tasa de cierre y ciclo de venta (mediana de días desde que entra el cliente hasta que firma). Después, conversión por proyecto y por broker, con cuántos llegaron a comprometerse aunque después se hayan caído. Abajo, por qué se pierden los clientes y cuánto dura cada etapa.

El motivo de pérdida se elige en la ficha al marcar un cliente como perdido: precio, no califica, compró en otro proyecto, desistió, dejó de responder u otro. Si el cliente vuelve a una etapa activa, el motivo se borra. Los perdidos sin motivo registrado se muestran aparte en vez de esconderse.

Los tiempos por etapa se reconstruyen del historial de cambios de etapa que ya se guardaba. La etapa actual sigue corriendo, así que no entra en la mediana.

## Resumen diario

La pestaña **Hoy** abre el área interna con la lista de trabajo del día en tres columnas: **atrasados** (la fecha de próximo contacto ya pasó), **para hoy** y **sin avanzar** (14 días o más en la misma etapa, sin contar los dos anteriores). Cada nombre abre la ficha y cada fila lleva un botón de WhatsApp. El admin ve además cómo se reparte ese trabajo entre los brokers.

El mismo cálculo se envía por correo: el cron de Vercel llama a `/api/cron/resumen` a las 11:00 UTC de lunes a viernes (8:00 en Santiago, 7:00 en invierno) y manda a cada broker solo su lista. Variables:

| Variable            | Para qué                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CRON_SECRET`       | La defines tú (`vercel env add CRON_SECRET production`); Vercel la manda como `Authorization: Bearer` al disparar el cron. Sin ella la ruta responde 401 y no envía nada. |
| `RESEND_API_KEY`    | Sin ella el resumen se calcula igual pero no sale ningún correo.                                                                                                          |
| `CORREO_DESDE`      | Remitente, ej. `Pyxis <alertas@tudominio.cl>`. Por defecto usa el remitente de prueba de Resend.                                                                          |
| `NEXT_PUBLIC_SITIO` | Base de los enlaces del correo. Si falta, usa el dominio de la petición.                                                                                                  |

Resend exige un dominio propio verificado para enviar a terceros, así que hasta tenerlo el correo queda apagado y el resumen vive solo en pantalla. Un admin puede probar el cálculo sin enviar nada con el botón **Probar el correo diario**, que llama a `/api/cron/resumen?dry=1`.

## Próximo contacto sugerido

Al cambiar la etapa de un cliente, el formulario propone la fecha del siguiente contacto: un día para un cliente nuevo, tres tras contactarlo o agendarle visita, cinco en reserva y siete en promesa. En escritura y perdido no sugiere nada. La propuesta solo pisa la fecha actual si estaba vacía o vencida, así que un compromiso ya tomado con el cliente no se pierde.

## Unidades

Un proyecto puede llevar el detalle departamento por departamento: número, piso, tipología, orientación, precio propio y estado (disponible, reservada, vendida, bloqueada). En **Proyectos** hay un generador que arma la grilla a partir de pisos y unidades por piso, y una tabla filtrable para editarlas.

Cuando un proyecto tiene unidades cargadas, la disponibilidad que se muestra en todas partes sale de ellas y no del contador por tipología. Al pasar un cliente a reserva, promesa o escritura, su unidad queda tomada; si vuelve a una etapa anterior o se pierde, se libera. Los proyectos sin detalle siguen funcionando con el contador `disponibles` de cada tipología.

## Deploy

El proyecto de Vercel está conectado al repo `Ribs-org/sistema-inmobiliario`: cada push a `main` despliega a producción y cada rama o PR genera un preview. GitHub Actions corre typecheck, lint y tests en cada push y PR (`.github/workflows/ci.yml`). El deploy manual con `vercel --prod` sigue funcionando pero ya no hace falta.

## Comparador

En la lista del mapa cada proyecto tiene una casilla para compararlo (hasta 3). La pestaña **Comparar** los muestra lado a lado con las mismas condiciones de crédito (pie, plazo, tasa, seguros) y una tipología elegible por columna; el mejor valor de cada fila (precio, UF/m², minutos al Metro, dividendo) se resalta. Con sesión interna, "Guardar comparativa" crea una cotización con enlace público `/c/<código>` que muestra la misma tabla congelada.

## Fotos y planos

Las imágenes viven en **Vercel Blob** (store `pyxis-imagenes`, público; variable `BLOB_READ_WRITE_TOKEN`). En el área interna, cada proyecto acepta hasta 12 fotos (JPG, PNG, WebP o AVIF de hasta 8 MB; la primera es la principal y se pueden reordenar) y cada tipología un plano (imagen o PDF). Se muestran en la ficha, en el comparador y en la cotización. La API `/api/imagenes` solo acepta subidas con sesión y solo guarda URLs de ese store.

## Importar proyectos desde un archivo

En Proyectos hay **Importar archivo** (Excel .xlsx, CSV o JSON) y tres archivos de muestra para descargar: `proyectos-muestra.xlsx` (los 15 proyectos del catálogo en formato de importación, con hoja de instrucciones; se regenera con `node --experimental-strip-types scripts/generar-excel-muestra.mjs`), `plantilla-proyectos.csv` (para Excel: separador `;`, decimales con coma, una fila por tipología; las filas de un mismo `proyecto_id` se agrupan y los datos del proyecto se toman de la primera) y `plantilla-proyectos.json` (mismo formato que **Exportar JSON**, útil como respaldo o para editar en bloque). Los proyectos con el mismo id se actualizan conservando sus fotos y planos; al importar se calculan las caminatas de cada uno, así que tarda unos segundos por proyecto. Las filas con problemas se informan sin detener el resto.

Las fotos se optimizan al subir (máximo 1600 px por lado, orientación corregida, WebP) y la ficha las muestra en una galería con visor (flechas o teclado, Esc para cerrar).

## Identidad visual

Favicon y emblema (skyline) tomados de broker-capital.com; paleta negro `#0a0a0a` y dorado `#d4af37` / `#b1921a` sobre fondo cálido, tipografías Playfair Display (títulos) e Inter (interfaz). Los iconos viven en `src/app/icon.png`, `src/app/apple-icon.png` y `public/marca-oro.png`; el componente `Marca` muestra emblema y nombre en versión dorada (cabeceras oscuras) o negra (documentos).

## Inspirado en JetBrokers

- **Rentabilidad para inversionista** (`src/lib/rentabilidad.ts`): arriendo estimado (0,45 % mensual del precio, editable por tipología con `arriendoUF`), gastos comunes por m², contribuciones sobre avalúo fiscal, vacancia, rentabilidad bruta y neta, flujo mensual después del dividendo y cobertura del dividendo. Se muestra en el simulador (interruptor "Rentabilidad para inversionista"), en la ficha y en el brochure.
- **Reservas con stock**: al pasar un cliente a reserva, promesa o escritura se descuenta una unidad de su tipología; al perderlo o retrocederlo se devuelve. Queda registrado en el historial como "Stock". La tabla de Proyectos muestra disponibles y avisa cuando quedan 3 o menos.
- **Comisiones**: campo `comisionPct` por proyecto (2,5 % si no se define). El embudo muestra comisión proyectada (reservas y promesas) y cerrada (escrituras), en UF y pesos.
- **Brochure público** `/p/<id>`: fotos con galería, datos, Metro, tipologías con dividendo referencial, arriendo y rentabilidad, planos, condiciones y espacios comunes; imprimible. Botón "Brochure" en la ficha.

## Roles: admin y brokers

Dos formas de entrar conviven:

- **Cuenta propia (Clerk)**: `/ingresar`. Se activa cuando existen `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` (las provisiona `vercel integration add clerk`). Cada broker entra con su correo o con Google; las invitaciones se gestionan en el panel de Clerk.
- **Clave de equipo (`CLAVE_INTERNA`)**: sigue funcionando y entra siempre como **admin**. Sirve de respaldo y para scripts.

El rol sale de `ADMIN_EMAILS` (correos separados por coma) o de `publicMetadata.role = "admin"` en Clerk; cualquier otro usuario es **broker**.

|                               | Admin                                    | Broker                 |
| ----------------------------- | ---------------------------------------- | ---------------------- |
| Clientes                      | todos, y puede reasignar el vendedor     | solo los suyos         |
| Cotizaciones                  | todas                                    | las suyas              |
| Embudo                        | filtro por vendedor y ranking del equipo | solo lo suyo           |
| Proyectos, importación, fotos | sí                                       | no (los ve en el mapa) |

Cada cliente y cada cotización guardan `vendedorId` y `vendedorNombre`; la cotización pública muestra el broker que la emitió en vez del contacto genérico.

> Clerk quedó provisionado desde el Marketplace como **instancia de desarrollo** (el login muestra el sello "Development mode" y admite hasta 100 usuarios). Sirve para el equipo y la demo. Al tener un dominio propio conviene crear la instancia de producción en Clerk y apuntar sus registros DNS; las variables se reemplazan solas desde la integración.
