# Changelog — Familia Terna (frontend)

Historial de cambios y el porqué de cada decisión de diseño, extraído de los
comentarios inline de cada página para que el código quede más liviano y
fácil de leer. Organizado por archivo; dentro de cada archivo, de más
reciente a más antiguo.

En el propio archivo `.html` se deja solo una nota funcional corta (qué hace
el código hoy) cuando hace falta para mantenerlo; el "por qué histórico"
(fecha, pedido puntual del usuario, alternativas descartadas) vive acá.

---

## torneos.html

### 08-sep-2026 — Torneos de continuación no se listan aparte
Pedido usuario, punto 1: "Los torneos de continuación no deben aparecer
en la web como torneo aparte, ya que se fusiona sus resultados con el
torneo principal". Antes cada torneo de T_Control (tanto el "principal"
como su "continuación", ligados desde el wizard de `admin.html` —
`#torneoTipo`/`tagTorneoPrincipal`) se pintaba como fila propia en
"Torneos recientes", duplicando el mismo evento en dos filas (una con
resultados, la otra sin ninguno, porque el podio final normalmente se
cierra en la continuación). `esTorneoContinuacion(t)` /
`idTorneoPrincipalDe(t)` admiten varios alias de campo porque, sin ver
`_webTorneos()`/`_webHistorialTorneos()` (`34_Web_API.gs`) para
confirmar el nombre exacto que expone el backend, es más seguro cubrir
alias razonables que asumir uno solo; si ninguno viene en la respuesta,
ambas funciones devuelven `false`/`null` sin romper nada.

### 03-sep-2026 — Ganadores y premios junto a cada fila de "Torneos recientes"
Pedido usuario: "Torneos Recientes: aprovechar el espacio libre a la
derecha de cada fila para mostrar ganadores y premios de ese torneo".
Antes `.t-detalle` era `flex:1` y ocupaba todo el ancho sobrante de la
fila (fecha + detalle nada más). Se trae también `webHistorialTorneos`
(mismo endpoint que ya consume el Salón de la fama) para sacar el top 3
de cada torneo sin necesitar un endpoint nuevo; si falla, la lista
igual se pinta, solo sin el detalle de ganadores.

### 03-sep-2026 — Menos espaciado vertical entre secciones
Pedido usuario: "reducir el espaciado vertical excesivo alrededor de
'Ganadores del torneo más reciente' y en general en la página". La
regla genérica `section{padding:72px 0}` de `styles.css` se sumaba al
`margin-top` propio de cada una de las 4 secciones de esta página
(40-44px), dejando ~112-116px entre secciones. Se reemplaza por un
padding fijo más chico solo en esta página (`.torneos-sec`), sin tocar
la regla genérica del resto del sitio.

### 02-sep-2026 — Resultados completos de cada torneo (PDF, punto 12/13/14)
Pedido usuario (PDF de torneos): punto 12, "mostrar los resultados de
T_Control, no sé si en gráfica o cuadro"; punto 13, "mostrar los
resultados de todos los participantes que tengan más de cero
victorias... o a los miembros con más victorias en todos los torneos,
que pueda incentivar la participación"; punto 14, "si descalificas a
alguien, desaparece del podio pero nada en la web pública explica por
qué — necesito una forma de dejar constancia de la resolución para que
no hayan disputas de premios".

Se agrega `todosResultadosHtml()`: cuadro plegable con TODOS los
participantes de un torneo con Victorias > 0 (no solo el top 3), leído
de `participantes` (`24_Torneos_Core.gs`/`34_Web_API.gs`), plegado por
defecto bajo el botón "Ver todos los resultados" — tanto en "Ganadores
del torneo más reciente" como en cada tarjeta del Salón de la fama. El
botón solo se ofrece cuando hay más participantes con victorias que el
podio ya mostrado. Se pintan también etiquetas de "❌ Descalificado" y
"🤝 Premio repartido" por participante, así el resultado queda explicado
en la propia web sin depender de que alguien pregunte. Si el backend
todavía no manda `participantes`, no se pinta nada — no rompe, solo no
aparece el botón.

`calcularRankingVictoriasTorneos()` pasa de sumar solo `t.top3` (los 3
primeros puestos) a usar `t.participantes` (lista completa con
Victorias > 0), así todos los que ganaron al menos una partida suman al
ranking, no solo quien llegó al podio — el caso exacto que el pedido
quiere incentivar.

### 01-sep-2026 — Ranking de victorias en torneos
Pedido usuario: "agregar en Torneos un ranking de más victorias en
todos los torneos, agregable en el cliente a partir de
`webHistorialTorneos`, sin backend nuevo". Suma victorias por jugador a
través de todas sus apariciones en el historial (últimos 30 torneos con
resultados). El campo no incluye Tag, solo nombre + clan, así que se
agrupa por esa combinación para no mezclar jugadores distintos que
compartan nombre en clanes distintos.

### 30-ago-2026 — torneos.html deja de ser un placeholder
Pedido del usuario: la página pasa a consumir `webTorneos`
(`34_Web_API.gs`), el mismo endpoint que ya usaba `admin.html` para la
tarjeta "Ver ganadores" del panel.

---

## admin.html

> Esta página es la más grande del sitio (~8,760 líneas). El historial se
> va agregando por tramos a medida que se aligeran sus comentarios; los
> tramos siguientes se agregarán debajo de este a medida que se procesen.

### Tramo 1 — bloque `<style>` (líneas ~16-430)

**16-sep-2026 — Hora dividida en dos cuadros (HH/MM)**
Pedido usuario: "en el cuadro de hora, divídelo en dos, uno de hora y uno
de minutos". El `<input type="text">` único "hh:mm" se separa en dos
cuadros chicos (`#...HH`/`#...MM`, maxlength=2) con un ":" fijo en medio
(`.campo-hora-separador`). Aplica a las 7 instancias de
`.campo-hora-wrap` (Torneos/Sorteos/Cambio de rango, todas sus
modalidades). El `<select>` AM/PM y el `<input type="time">` oculto no
cambian de rol: el oculto sigue siendo la fuente real 24h.

**15-sep-2026 — Radios de "Buscar en Directorio" reemplazados por pastillas**
Pedido usuario: los 2 radios ("Ingresar tag" / "Buscar en Directorio")
"están feos". Pasan a una fila de pastillas `.tab-clan`, el mismo control
que ya usan Torneos/Sorteos/Cambio de rango.

**14-sep-2026 — Varios ajustes de alineación y layout en Cambio de rango**
- "Buscar en Directorio" al registrar miembro nuevo (`.nm-modo-selector`/
  `.nm-dir-lista`), reutilizando el look de `.miembro-row` con scroll fijo
  (no flotante) y un badge `.mr-celular` para saber si el miembro ya tiene
  celular registrado.
- "Los encabezados siguen desalineados con respecto a sus cuadros de
  datos" (grilla Min_CR/Ataques): los `<td>` no tenían `text-align:center`
  como sí los `<th>`, así el input de 64px quedaba pegado a la izquierda.
- "El checkbox de semana y el texto están desalineados": faltaba
  `margin:0` explícito en el checkbox de `.semana-item`.
- "El botón de añadir temporada debe estar a la derecha del título de
  semanas y está demasiado grande": nace `.btn-compacto`, variante chica
  de `.btn`, con su `<div>` padre en flex `space-between`.
- "Los requisitos de descenso puestos así parecen algo opcional":
  Requisitos de Ascenso/Descenso dejan de ser `<details>` colapsables
  (patrón reservado para secciones realmente opcionales) y pasan a
  bloques fijos con encabezado estático.

**13-sep-2026 — Grilla de Cambio de rango y selector de temporadas**
- Fase 7 del plan de Cambio de Rango, paso 4: inputs numéricos de la
  grilla Min_CR/Ataques por Clan y Rol (`#crGridAscenso`/
  `#crGridDescenso`) viven sueltos en `<td>`, no en `.field`, por eso
  llevan su propio estilo chico (`.cr-grid-input`) en vez de `.field
  input`.
- "Centra las categorías con respecto a sus valores y Clan debe ocupar el
  espacio de las dos filas, centrado vertical y horizontalmente": Clan
  usa `rowspan="2"` con `vertical-align:middle`.
- "En la sección de semanas a evaluar debe haber un selector de temporada
  y a la derecha checkboxes con las semanas... y un botón para añadir
  otra temporada": un `.cr-temporada-bloque` por temporada agregada,
  select a la izquierda y `.semana-selector` a la derecha (se apilan en
  pantallas angostas).

**09-sep-2026 — Campos de fecha y hora "amigables"**
- "A la parte de la fecha, agrégale ese cuadrito de fecha": ícono
  `.btn-calendario` que llama a `input.showPicker()`, explícito en vez de
  depender de que el admin sepa que el campo entero es clickeable.
- "Las fechas no son muy amigables para el usuario, debería decir algo
  como dd/mm/aaaa": el formato de un `<input type="date">` nativo depende
  del idioma/región del navegador. Se arma un `<input type="text">`
  visible con placeholder fijo "dd/mm/aaaa" y, oculto detrás
  (`.campo-fecha-wrap`), el `<input type="date">` real como fuente del
  valor ISO (`fechaInputADDMMYYYY()`, `armarPremiosCSV()`, etc. no
  cambian).
- Hora en formato "hh:mm" + AM/PM con segundos ocultos: mismo patrón,
  `<input type="time">` real oculto (`.campo-oculto-visual`) como fuente
  24h para `horaConSegundos()`.
- Selector de semanas en Planificar/Registrar/Modificar torneo: lista con
  scroll y checkboxes (actualizado 11-sep-2026, ver
  `cargarSemanasRecientes()`/`pintarSemanasSelector()` en el `<script>`).

**08-sep-2026 — Buscador de "Buscar miembro" con sugerencias**
Pedido usuario: buscador más potente, con sugerencias mientras se
escribe (`buscarSugerenciasMiembro()`/`renderSugerenciasMiembro()` en el
JS). `.buscador-wrap` ancla el dropdown de sugerencias justo debajo del
input, reutilizando el look de `.miembro-row` de `directorio.html`.

**05-sep-2026 — "Mensajes automáticos" pasa a 3 tarjetas fijas**
Reemplaza por completo el acordeón dinámico anterior
(sección→categoría→lista plana alfabética) por 3 tarjetas
`.admin-grupo` de estructura fija (ver
`initMensajesAutomaticos()`/`cargarGrupoToggle()` en el JS). Las tarjetas
de toggle horizontal (Guerra/Entrenamiento/Mazos,
Participantes/Ganadores) reutilizan la pastilla `.tab-clan`, sin estilo
propio.

**03-sep-2026 — Contenedor único para Directorio (Fase 25) y visor de Docs**
- "En vez de mencionar Directorio 2 veces, debería estar en un mismo
  contenedor. Igual que torneos y sorteos, un contenedor y luego sus
  subcategorías": nace `.admin-subseccion`, mismo look de acordeón +/-
  que `.categoria-contenido` pero sin el padding-left extra de ir anidada
  en una `.seccion-contenido`.
- "No me gusta que se vean esos márgenes, debería verse como cuando en
  Word se escoge el modo de diseño web": el `<iframe src=".../preview">`
  de Google Docs siempre pagina con márgenes y, por ser cross-origin, no
  se le puede aplicar CSS propio. Se reemplaza por
  `_webAdminContenidoDocHtml()` (`34_Web_API.gs`, solo lectura), que
  devuelve el HTML del cuerpo del Doc para pintarlo en `.doc-original`
  con nuestro propio CSS — ancho completo, sin paginación, conservando
  negritas/colores/listas del Doc.
- "Se ve feo que primero muestre el texto plano, luego si presiono ver
  original, muestra uno debajo del otro y ambos se ven mal": antes
  `.contenido-caja` y `.contenido-pdf-wrap` podían quedar visibles a la
  vez. Ahora la clase `.viendo-original` en `.contenido-item` decide cuál
  de los dos se ve, nunca ambos (ver `btnVerPdf` en
  `_activarAccionesContenido`/`_pintarOpcionContenido`).

**31-ago-2026 — Responsive, textarea de veto y pestañas por clan**
- "Haz que la web sea responsive": a `.req-row` le faltaba el
  `flex-wrap` que sí tenía su equivalente en `directorio.html`.
- "El cuadrito de comentario para vetar es muy pequeño": nunca existió
  una regla `.field textarea` en `styles.css` (solo input/select), así
  que `vComentario` se veía con el textarea por defecto del navegador.
- "Botones para los otros clanes": cuando una categoría tiene varias
  opciones (una por clan), se pinta un solo `.contenido-item` "en
  escena" y `.contenido-tabs` cambia de opción al clickear, en vez de
  apilar todas las opciones una debajo de otra.

**30-ago-2026 — Mensajes automáticos: refresco, PDF y visor**
- "Los mensajes de guerra... no están actualizados": Menú/Mensajes se
  reconstruyen enteros en cada corrida automática del bot
  (`_webAdminContenido`, `34_Web_API.gs`), pero antes la categoría solo
  se pedía al backend la primera vez que se abría en la sesión. Se agrega
  un botón de refetch puntual (`btnRefrescarCategoria`).
- "Los mensajes deben tener un cuadrito de visualización donde se pueda
  apreciar mejor el formato y un botón para copiar al portapapeles,
  también una flechita para desplegar o colapsar el texto": cada opción
  pasa de un `<pre>` suelto a una caja con fondo propio, más botones de
  acción a la derecha.
- "Exportar a PDF dinámicamente": cuando la opción trae `o.docId`, un
  botón muestra el Doc de origen (carga perezosa) dentro de un `<iframe>`
  — nada se descarga ni se duplica en el backend. (Reemplazado más
  adelante, ver 03-sep-2026 arriba.)

### Tramo 2 — Login, Tus cuentas, Buscar miembro, Directorio, Torneos y sorteos (líneas ~294-900)

**16-sep-2026 — Precargar datos del último torneo/sorteo registrado**
Pedido usuario: "en torneos, sorteos y cambio de rango, agrega la opción
de precargar los datos del registro más reciente (anterior a ese). no
aplica para semanas". Botón que trae Organizador/Cuenta organizadora y
Comentario del último torneo ya registrado en T_Lista, para no
reescribirlos a mano. No toca `#semanasSelectorReg` (cada torneo nuevo
elige sus propias semanas), Link/Fecha/Hora ni Requisitos. **Pendiente
de backend**: falta `_getUltimoRegistroTorneoOSorteo`
(`24_Torneos_Core.gs`), su wrapper
`_webAdminUltimoRegistroTorneoOSorteo` (`34_Web_API.gs`) y el caso
`webAdminUltimoRegistro` en `doGet` (`08_Web_Endpoints.gs`) — el botón
queda listo en el frontend, pendiente de esas 3 piezas.

**15-sep-2026 — Pastillas en vez de radios (Registrar miembro nuevo)**
Pedido usuario: "en el panel admin (registrar miembro nuevo) se debe
cambiar esas opciones de ingresar tag y buscar directorio... cambialo
por el estilo que tienen los botones de torneo, sorteo y cambio de
rango". Los 2 `<input type="radio">` se reemplazan por botones
`.tab-clan`, mismas pastillas de `.btn-toggle-torsor`. El activo se
marca con `.activo` y se lee de `data-modo`.

**14-sep-2026 — "Buscar en Directorio" al registrar miembro nuevo**
Pedido usuario: "agrega la opción de 'Buscar en Directorio', ahora
serían dos opciones: 'Buscar en Directorio' o 'Ingresar tag'".
`#nmModoDirBox` deja elegir un Clan, ver su lista de miembros (filtrable
por Rango y por celular registrado) y clickear uno para llenar `#nmTag`
con su Tag y disparar el mismo `verificarTagNuevoMiembro()` del flujo de
Tag — de ahí en adelante es un solo flujo para ambos modos.

**13-sep-2026 — Tab "Cambio de rango" y control de "Torneo vigente"**
- Fase 7 del plan de Cambio de Rango, paso 1: tercer tab "Cambio de
  rango" junto a Torneos/Sorteos, mismo mecanismo `.btn-toggle-torsor` +
  `data-panel`. Todavía sin contenido real en este tramo.
- "Torneo vigente": control web para `Extra!Torneo_Vigente_ID` (antes se
  editaba a mano en la hoja Extra). Lista todos los torneos existentes
  vía `_webAdminVigenteListar()` y guarda con
  `_webAdminVigenteGuardar()`. "Ninguno" limpia la celda y el sistema
  usa su respaldo de "más reciente por Fecha".

**12-sep-2026 — "Participación de hoy en guerra" ya no vive en admin**
Pedido usuario: "el panel de admin y de directorio muestran lo mismo,
que se quede solo en el panel de directorio". La tarjeta se retira de
`admin.html` y queda solo en `directorio.html`
(`#cardParticipacionHoyDirectorio`, visible con sesión de admin
guardada). El endpoint del backend no cambió. También conectado este
día: `webAdminCuentasDeNomMulti`, que resuelve el dropdown de cuentas
del organizador de torneo (ver 09-sep-2026 más abajo).

**09-sep-2026 — Dropdown de cuentas del organizador del torneo**
Pedido usuario: "luego de ingresar al organizador del torneo, agrega un
cuadro con dropdown que permita elegir entre todas las cuentas que
tenga el autor elegido, se debe detectar su clan y así se puede llenar
Tag_org, Clan y ClanTag". Aparece solo cuando `#tAutorSelect` tiene un
Nom_Multi real elegido; al elegir una cuenta, su clan se detecta solo y
queda en `data-clan`/`data-clantag` de la opción (ver
`pintarCuentasOrg()`). `btnRegistrarTorneo` manda esos 3 datos como
`tagOrg`/`clanOrg`/`clanTagOrg`.

**08-sep-2026 — Buscador de "Buscar miembro" con sugerencias, y reordenamiento**
- "Buscar miembro" gana nombre/eyebrow y sugerencias mientras se
  escribe, buscando por Nombre, Nom_Multi o Tag en todo miembro
  registrado (activo o inactivo) — más potente que el buscador público
  de `directorio.html`. Requiere `webAdminBuscarMiembroSugerencias`
  (pendiente de conectar en el backend).
- "La detección de infiltrados va en la sección de buscar miembros, no
  en Directorio": se reubica junto a "Buscar miembro".
- "Registrar o modificar torneo" pasa a llamarse "Planificar, registrar
  o modificar torneos o sorteos", con dos botones `.tab-clan` para
  alternar entre "Torneos" (el wizard de siempre) y "Sorteos" (nuevo,
  sin acción real todavía).

**05-sep-2026 — Wizard de 3 pasos para Torneos, y "Planificar torneo"**
"Registrar torneo nuevo" y "Modificar torneo de hoy" se fusionan en un
wizard de 3 pasos (Paso 1: Registrar/Modificar/Planificar; Paso 2:
Principal o Continuación; Paso 3: campos según la combinación de
ambos). "Planificar torneo" nace como tercer camino separado de
"Registrar", porque el link real de RoyaleAPI recién se genera con
pocas horas de anticipación mientras que los premios necesitan quedar
listos con más tiempo — guarda Fecha + Premios sin link todavía, y la
fila se completa sola cuando después se registra el link real del mismo
torneo. También se agrega la opción de registrar al autor del torneo
(campo opcional, por si alguien más lo organizó).

**04-sep-2026 — Directorio antes del Visor de contenido (punto 38)**
Pedido usuario, punto 38: "la sección de Directorio va antes del visor
de contenido, la detección de infiltrados debe ser parte de directorio
(después de vetar)". Todo el contenedor "Directorio" se mueve antes de
"Visor de contenido" (antes iba después, delante de "Torneos y
sorteos").

**03-sep-2026 — Reordenamiento del panel (Fase 25)**
Pedido usuario, punto 17: mostrar primero la lista de cuentas del
admin, por clan y rol, con estadísticas — nace "Tus cuentas", primero
en el panel, reutilizando el agrupamiento del saludo del bot de
WhatsApp (`_msgBienvenidaAdmin`, `29_BotWhatsApp.gs`) vía
`_webMisCuentas()` (`34_Web_API.gs`). "Registrar miembro nuevo" y
"Vetar miembro" pasan de dos `<div class="card">` separadas (cada una
repitiendo el eyebrow "Directorio") a un solo contenedor con
subsecciones plegables. "Torneos" y "Ruleta de sorteos" reciben el
mismo tratamiento, con la ruleta como última subsección en vez de
suelta arriba del panel.

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
