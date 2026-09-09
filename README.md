# Ribs · Proyectos y Metro de Santiago

Prototipo jugable para una inmobiliaria: mapa de proyectos en Santiago de Chile con la red de Metro actual y futura, fichas con tipologías y un simulador de crédito hipotecario en UF y pesos.

## Qué hace

- **Mapa** (Leaflet, sin API key): 15 proyectos de ejemplo como pines con su precio desde. Líneas 1 a 6 del Metro operativas en trazo sólido; Línea 7 (en construcción, 2028), extensión L4 a Bajos de Mena, extensión L6, Línea 8 y Línea 9 (proyectadas) en trazo punteado. Cada línea se puede ocultar. Al hacer clic en una estación se dibuja un radio de 800 m y se resaltan los proyectos que quedan dentro.
- **Ficha de proyecto**: 3 tipologías con precio en UF y CLP, UF/m², estación operativa más cercana y la estación futura que la mejora, condiciones de pie y bono pie.
- **Precio vs Metro**: gráfico de UF/m² contra minutos caminando a la estación más cercana, con opción de contar líneas futuras.
- **Simulador**: amortización francesa en UF, pie, bono pie, pie en cuotas hasta la entrega, plazo, tasa, seguros, gastos operacionales, renta mínima y tabla de amortización. El valor de la UF se toma de mindicador.cl y se puede editar.
- **Enlaces compartibles**: `?p=<proyecto>`, `?e=<línea>:<estación>`, `?tab=simulador|analisis`.

## Datos

Todo es mock y vive en `src/data/`. Las coordenadas de las estaciones son aproximadas (±150 m) y los trazados de L8 y L9 son referenciales. Los precios son ilustrativos.

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

Variables de entorno: `CLAVE_INTERNA` (clave del área interna) y las de Upstash Redis que crea la integración. El mapa y el simulador funcionan sin ninguna.

## Área interna (clientes)

`/interno` está protegida con una clave compartida (`CLAVE_INTERNA`; si no está definida se usa `ribs2026` y la pantalla lo avisa). La sesión dura 30 días en una cookie httpOnly; cambiar la clave invalida todas las sesiones.

Desde ahí se lleva el seguimiento de clientes: proyecto y tipología de interés, etapa (nuevo → contactado → visita → reserva → promesa → escritura, o perdido), próximo contacto y notas. La lista se ordena por fecha de seguimiento y muestra atrasados y contactos del día. Desde la ficha de cualquier proyecto, el botón **+ Cliente** abre el formulario con el proyecto precargado.

Los datos se guardan en **Upstash Redis** (integración de Vercel Marketplace, variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`). Si no hay credenciales, la pantalla guarda en el navegador y lo indica.

```bash
vercel integration add upstash/upstash-kv --name ribs-clientes   # requiere aceptar términos en el navegador
vercel env pull                                                   # para desarrollo local
```
