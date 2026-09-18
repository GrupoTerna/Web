# Changelog — Familia Terna (frontend)

Historial de cambios y el porqué de cada decisión de diseño, extraído de los
comentarios inline de cada página para que el código quede más liviano y
fácil de leer. Organizado por archivo; dentro de cada archivo, de más
reciente a más antiguo.

En el propio archivo `.html` se deja solo una nota funcional corta (qué hace
el código hoy) cuando hace falta para mantenerlo; el "por qué histórico"
(fecha, pedido puntual del usuario, alternativas descartadas) vive acá.

---

## comunidad.html

### 13-sep-2026 — Íconos de WhatsApp y Discord en "Redes"
Pedido usuario: "falta el icono de wsp" / "el de discord también agrégalo".
Se agregan WhatsApp y Discord, primeros en la fila (a la izquierda de
Facebook), reutilizando los mismos links/SVG que sus `.social-card`
equivalentes en `index.html#redes`. Ya no aplica la nota anterior de que
"WhatsApp/Discord no son parte de este bloque".

### 08-sep-2026 — Íconos de redes sociales junto al título de Comunidad
Pedido usuario, punto 2: "Comunidad: inserta los íconos de las redes
sociales con su respectivo link al hacer clic". Se agrega una fila de
íconos circulares junto al título "La Familia Terna", reutilizando los
mismos SVG/links oficiales que ya usa `index.html` en su sección "Redes
Oficiales" (`#redes`) — así no se duplican URLs distintas para la misma red
en dos páginas.

### 04-sep-2026 — Rankings de la Familia movidos a index.html
Pedido usuario, punto 28: "Rankings de la Familia (tops y cartas)... habría
que moverla a la sección Index". La sección completa (markup + CSS + JS)
se movió a `index.html` (`<section id="rankings-familia">`). Ya no vive en
`comunidad.html`, así se evita duplicar la llamada a `webRankings()` /
`webEstadisticasCartas()` en dos páginas a la vez.

### 30-ago-2026 — Lista de "Ascensos recientes"
Pedido del usuario: lista pública de reconocimiento. Muestra solo Ascensos,
nunca Descensos ni cambios de rango de cuentas que hoy son Administradores
(ese filtro ya lo aplica el backend en `webAscensosRecientes()`,
`34_Web_API.gs`). Se agrega debajo de la explicación de "Ascensos y
Descensos" de esta misma página.

### 31-ago-2026 — Justificado de texto en tarjetas de historia
Pedido usuario: "mientras el texto no tenga viñetas, se debe justificar el
texto para lograr mayor armonía visual". El `text-align:justify` solo se
aplica a `<p>`, nunca a las listas (`<li>`) de la misma tarjeta, tal como
se pidió explícitamente.
