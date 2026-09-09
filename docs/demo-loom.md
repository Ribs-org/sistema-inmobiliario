# Guion demo Loom · Ribs (≈ 2,5 min)

Antes de grabar: abrir https://sistema-inmobiliario-phi.vercel.app en una pestaña limpia, ventana ancha (la leyenda de Metro solo aparece en escritorio). Tener el zoom del mapa en el nivel inicial.

## 0:00 — Gancho (10 s)
"Esto es Ribs: un mapa de proyectos inmobiliarios de Santiago que muestra la red de Metro de hoy y la que viene, y te dice cuánto pagarías al mes por cada departamento."

## 0:10 — Mapa y Metro (35 s)
- Mover un poco el mapa. "Cada pin es un proyecto con su precio desde, en UF."
- Señalar líneas sólidas vs punteadas. "Las sólidas son las líneas que operan hoy. Las punteadas son L7, que abre el 2028, y L8 y L9, proyectadas."
- En la leyenda, desmarcar "En construcción y proyectadas" y volver a marcar. "Se puede prender y apagar cada línea."

## 0:45 — Clic en una estación (30 s)
- Clic en la estación **Huelén** de L7 (punteada teal, al poniente del centro). Se dibuja el radio de 800 m y se resaltan los proyectos dentro.
- "Elijo una estación futura y el mapa me dice qué proyectos quedan a 10 minutos caminando. Hoy Huelén Park está a 9 minutos de Quinta Normal; con la L7 va a estar a 2."
- Atajo si el clic no cae: `?e=L7:Huelén`.

## 1:15 — Ficha del proyecto (30 s)
- Clic en el pin **UF 2.690** (Huelén Park) o en la tarjeta de la estación.
- Recorrer: estado en blanco, entrega 2028, bloque Metro actual vs futura, las 3 tipologías con precio en UF y pesos y UF/m².
- "Tres tipologías, precio en UF y en pesos con la UF del día, que se trae sola de mindicador."

## 1:45 — Simulador (35 s)
- En la tipología **2D1B** clic en **Simular crédito**. Se abre el simulador precargado con el precio, el pie mínimo y el pie en cuotas del proyecto.
- Mover el slider de pie a 20 % y cambiar el plazo a 30 años. "El dividendo cambia al instante, en UF y en pesos, con seguros incluidos."
- Señalar renta mínima y la tabla de comparación por plazo. "Aquí el ejecutivo ve de una la renta que necesita el cliente."

## 2:20 — Precio vs Metro (15 s)
- Pestaña **Precio vs Metro**. Activar "Contar líneas futuras" y mostrar cómo los rombos naranjos saltan a la izquierda.
- "Y para el equipo comercial: precio por m² contra minutos al Metro. Los proyectos que hoy están lejos, con las líneas nuevas quedan dentro del radio."

## 2:35 — Cierre (10 s)
"Todo esto es mock, sin Google Maps ni base de datos, y ya está corriendo en Vercel. El siguiente paso es cargar los proyectos reales."

## Enlaces directos por si algo falla
- Estación L7 Huelén: `?e=L7:Huelén`
- Ficha Huelén Park: `?p=huelen-park`
- Vista Estoril (sin Metro hoy, L7 en 2028): `?p=vista-estoril`
- Análisis: `?tab=analisis`
- Simulador vacío: `?tab=simulador`
