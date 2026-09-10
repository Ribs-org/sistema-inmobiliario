# Guion demo Loom · Pyxis (≈ 2,5 min)

Antes de grabar: abrir https://sistema-inmobiliario-phi.vercel.app en una pestaña limpia, ventana ancha (la leyenda de Metro solo aparece en escritorio). Tener el zoom del mapa en el nivel inicial.

## 0:00 — Gancho (10 s)
"Esto es Pyxis: un mapa de proyectos inmobiliarios de Santiago que muestra la red de Metro de hoy y la que viene, y te dice cuánto pagarías al mes por cada departamento."

## 0:10 — Mapa y Metro (35 s)
- Mover un poco el mapa. "Cada pin es un proyecto con su precio desde, en UF."
- Señalar líneas sólidas vs punteadas. "Las sólidas son las líneas que operan hoy. Las punteadas son L7, que abre el 2028, y L8 y L9, proyectadas."
- En la leyenda, desmarcar "En construcción y proyectadas" y volver a marcar. "Se puede prender y apagar cada línea."

## 0:45 — Clic en una estación (30 s)
- Clic en la estación **Matucana** de L7 (punteada teal, al poniente del centro, junto a Quinta Normal). Se dibuja el radio de 800 m y se resaltan los proyectos dentro.
- "Elijo una estación futura y el mapa me dice qué proyectos quedan a 10 minutos caminando. Hoy Mapocho 2900 está a 15 minutos de Quinta Normal; con la L7 va a estar a 4. Y los minutos son por calle, no en línea recta."
- Atajo si el clic no cae: `?e=L7:Matucana`.

## 1:15 — Ficha del proyecto (30 s)
- Clic en el pin **UF 2.690** (Mapocho 2900) o en la tarjeta de la estación.
- Clic en la foto: se abre la galería (flechas o teclado). Cerrar con Esc.
- Recorrer: estado en blanco, entrega 2028, bloque Metro actual vs futura, las 3 tipologías con precio en UF y pesos, UF/m² y "Ver plano".
- "Tres tipologías, precio en UF y en pesos con la UF del día, que se trae sola de mindicador."

## 1:45 — Simulador (35 s)
- En la tipología **2D1B** clic en **Simular crédito**. Se abre el simulador precargado con el precio, el pie mínimo y el pie en cuotas del proyecto.
- Mover el slider de pie a 20 % y cambiar el plazo a 30 años. "El dividendo cambia al instante, en UF y en pesos, con seguros incluidos."
- Señalar renta mínima y la tabla de comparación por plazo. "Aquí el ejecutivo ve de una la renta que necesita el cliente."

## 2:20 — Precio vs Metro (15 s)
- Pestaña **Precio vs Metro**. Activar "Contar líneas futuras" y mostrar cómo los rombos naranjos saltan a la izquierda.
- "Y para el equipo comercial: precio por m² contra minutos al Metro. Los proyectos que hoy están lejos, con las líneas nuevas quedan dentro del radio."

## 2:35 — Cierre (10 s)
"Los proyectos son de muestra, pero el Metro es el real: estaciones y trazado desde OpenStreetMap, líneas futuras según Metro S.A., y distancias caminando por calle. El siguiente paso es cargar los proyectos reales."

## Enlaces directos por si algo falla
- Estación L7 Matucana: `?e=L7:Matucana`
- Ficha Mapocho 2900: `?p=huelen-park`
- Vista Estoril (sin Metro hoy, L7 en 2028): `?p=vista-estoril`
- Análisis: `?tab=analisis`
- Simulador vacío: `?tab=simulador`

## Estado de la demo (2026-09-10)
- Los 15 proyectos ya están importados y editables en el área interna; 6 tienen fotos y planos: Irarrázaval 3300, Mapocho 2900, Macul Sur, Gran Avenida 4900, Vista Estoril y Alameda 4100.
- Comparador: marca Irarrázaval 3300, Macul Sur y Gran Avenida 4900 en la lista y abre la pestaña Comparar; las fotos encabezan cada columna. Comparativa guardada de ejemplo: `/c/3payudrx`.
- Área interna (clave: la que definiste en Vercel): pestañas Clientes (9 de demo con historial), Embudo y Proyectos (con Importar archivo y Excel de muestra).
