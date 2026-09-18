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

## admin.html — historial trasladado (Parte 7a, bloques HTML largos)

### Línea original 758

```
FIX (10-sep-2026, pedido usuario — sección 5.3 del
                     consolidado, mecanismo CONFIRMADO: "Ingresar link" es
                     una opción MÁS dentro del mismo #tSelectHoy (no un
                     control separado tipo radio/tabs). cargarTorneosHoy()
                     la agrega siempre como última <option> (value="__link__"),
                     y el listener de 'change' de #tSelectHoy (más abajo)
                     muestra/oculta este input según lo que quede
                     seleccionado. El valor se limpia cada vez que se elige
                     cualquier otra opción del dropdown -- nunca se conserva
                     para la próxima vez que se vuelva a elegir "Ingresar
                     link". Sorteos NO replica este patrón (CONFIRMADO por
                     el usuario, 12-sep-2026: Sorteos no tiene concepto de
                     link -- #sLink/#sModificarLink se eliminaron del HTML).

                     FIX (12-sep-2026, pedido del usuario -- consolidado
                     sección 5.2/5.3, "link directo en Modificar torneo"):
                     ya CONECTADO -- btnModificarTorneo (más abajo) ahora
                     manda este valor como `link` en el payload cuando
                     #tSelectHoy queda en "__link__", y
                     _webAdminTorneoModificar() (34_Web_API.gs) ya tiene la
                     rama que lo procesa (delega a
                     _registrarTorneoDesdeBot(), misma lógica que "Registrar
                     torneo" para completar una fila "Planificado" por
                     fecha/hora exacta, o crear una nueva si no hay ninguna
                     así).
```

### Línea original 809

```
FIX (09-sep-2026, pedido usuario — "las opciones de
                   modificar torneo no tienen la opción de editar el autor,
                   ni el premio (planificar sí tiene)"): mismo patrón de
                   #tAutorSelect/#tAutorSelectPlan y #premiosEditor, pero
                   AMBOS opcionales acá porque se está editando un torneo
                   que puede ya tener autor y premios cargados.

                   FIX (09-sep-2026 tarde, pedido usuario — "los premios
                   deben desplegarse como en planificar, y si hay que
                   modificar algo se debe indicar el valor actual"):
                    - #tAutorSelectMod se queda igual en "Sin cambios" por
                      defecto (no se manda autor nuevo si no se toca), pero
                      esa opción ahora muestra el nombre del autor YA
                      registrado -- "Sin cambios (Diana)" en vez del texto
                      genérico -- ver actualizarEtiquetaSinCambiosAutor() en
                      el <script>, disparada al elegir un torneo en
                      #tSelectHoy.
                    - #premiosEditorMod ya NO arranca vacío: se puebla con
                      los premios YA registrados de ese torneo (o 3 filas en
                      blanco tipo "Pass Royale" si todavía no tiene, igual
                      que #premiosEditor en Planificar) — ver
                      poblarPremiosEditor()/parsearPremiosCSV(). Como el
                      editor siempre refleja el valor actual, guardar sin
                      tocar nada reenvía el mismo texto ya guardado (no lo
                      borra); solo cambia si el admin edita alguna fila.
                   btnModificarTorneo más abajo sigue mandando `autor` vacío
                   cuando el select se deja en "Sin cambios" (el backend no
                   debe tocar esa columna en ese caso), y `premios` con lo
                   que haya en el editor en ese momento.
                   RESUELTO (14-sep-2026, cierre de conexión pendiente):
                   _webAdminTorneoModificar()/_modificarFechaHoraTorneo()
                   (34_Web_API.gs / 24_Torneos_Core.gs) ya aceptan los
                   parámetros opcionales `autor` y `premios`, y solo
                   actualizan esas columnas de T_Lista cuando llegan no
                   vacíos. _listarTorneosDeHoy() (24_Torneos_Core.gs) y
                   webAdminTorneosHoy (34_Web_API.gs) también devuelven ya
                   `autor`, `premios` (mismo formato CSV que arma
                   armarPremiosCSV()) y `semanas` (array de fechas ISO de
                   los lunes ya evaluados) por torneo — ver
                   data-autor/data-premios/data-semanas en cargarTorneosHoy()
                   más abajo, que ya los consume.
```

### Línea original 964

```
FIX (10-sep-2026, pedido usuario — "cuadros para ingresar el
                 requerimiento mínimo de trofeos de guerra y la cantidad
                 mínima de ataques semanales según clan, más 3 criterios
                 Sí/No"; corregido el mismo día, dos veces:
                   1) "los requisitos son parte del formulario, van justo
                      después del autor y los premios, no aparte" (se le
                      quitó el <details> propio que colgaba al final del
                      acordeón).
                   2) "muévela justo antes de la selección de semanas" (no
                      después de los tres bloques como había quedado con el
                      fix anterior).
                 Sigue siendo UN SOLO bloque (no triplicado por rama, mismo
                 id, mismo botón "Guardar requisitos" una sola vez) porque
                 es la misma config global de clanes en Registrar/Modificar/
                 Planificar. Como es un único nodo y "selección de semanas"
                 vive en 3 lugares físicos distintos del HTML (uno por
                 rama, ver #semanaSelectorWrapReg/Mod/Plan más arriba), este
                 <div> se reubica con JavaScript en vez de triplicarse: vive
                 acá abajo como posición de origen, y mostrarPaso3() (en el
                 <script>, dentro de initTorneoWizard()) lo mueve con
                 insertBefore() justo antes del #semanaSelectorWrap* de la
                 rama activa cada vez que se entra al paso 3. Así queda
                 siempre "autor/premios → Requisitos → selección de
                 semanas" sin importar cuál de las tres ramas esté visible.

                 Es distinto del panel de solo LECTURA que ya existe para
                 ver el AVANCE de un miembro puntual contra requisitos ya
                 configurados (ver renderRequisitos()/barraRequisito() en
                 el <script>, que pinta "Trofeos guerra"/"Ataques/semana"/
                 etc. dentro de la ficha de un miembro). Este bloque de acá
                 es el formulario para EDITAR esos requisitos por clan —
                 todavía sin acción real, solo se está armando el
                 formulario para conectarlo en otra sesión (pedido
                 explícito del usuario).

                 Los 4 clanes (Grupo乂Terna™, GrupoXTerna™2, GrupoXTerna™3,
                 Mini乂Ternas™) se piden a CLANES_REQUISITOS (ver <script>)
                 -- RESUELTO (12-sep-2026, consolidado sección 5.1): ya
                 existe webAdminClanesFamilia (_webAdminClanesFamilia(),
                 34_Web_API.gs) y cargarClanesFamilia() (ver <script>) lo
                 llama una vez al mostrar el panel; el array hardcodeado que
                 tenía CLANES_REQUISITOS antes queda solo como fallback si
                 la llamada falla. Los cuadros de trofeos/ataques se pintan
                 dinámicamente desde ese mismo array
                 (pintarGridRequisitosNumericos()) para no repetir 4
                 bloques de HTML iguales a mano.

                 Formato de miles SOLO VISUAL (pedido explícito del
                 usuario): cada input es type="text" (no type="number", que
                 no deja escribir comas) y se formatea con
                 initInputMiles() -- muestra "2,000" con el input sin foco
                 y el número plano ("2000") mientras se edita, para no
                 pelear con la posición del cursor al tipear. Al guardar,
                 valorPlanoInputMiles() quita las comas antes de armar el
                 payload; el backend nunca ve el separador de miles, solo
                 el número.

                 RESUELTO (10-sep-2026, "quita el botón de guardar
                 requisitos, eso ya lo hace el botón registrar torneo"): se
                 quitó #btnGuardarRequisitos y #requisitosMsg; estos campos
                 (reqTrofGuerra*/reqAtaques*/reqMiembroActivo/reqReaccion/
                 reqPresenciaWhatsapp) viajan junto con el resto del
                 formulario cuando se presiona "Registrar torneo"/"Guardar
                 cambios"/"Planificar torneo" (btnRegistrarTorneo/
                 btnModificarTorneo/btnPlanificarTorneo más abajo), igual
                 que autor/premios/semanas.

                 RESUELTO (11-sep-2026): los 3 listeners ya arman y mandan
                 este payload (`requisitos: armarPayloadRequisitos()`) junto
                 con los demás parámetros del torneo -- ver el comentario FIX
                 junto a cada uno más abajo.

                 RESUELTO (12-sep-2026, consolidado sección 5.1): ya existen
                 tanto la ESCRITURA (_webAdminTorneoRegistrar()/
                 _webAdminTorneoPlanificarGuardar(), 34_Web_API.gs, ya
                 reciben y guardan `requisitos`/`comentario`) como la
                 LECTURA previa (webAdminRequisitosClanes, ver
                 cargarRequisitosPorClan() más abajo, ya descomentada).

                 RESUELTO (12-sep-2026, mismo día -- "una vez con eso,
                 habilitar requisitos en Modificar sin riesgo"):
                 _webAdminTorneoModificar() (34_Web_API.gs) ya reenvía
                 `requisitos` TAL CUAL a _modificarFechaHoraTorneo()
                 (24_Torneos_Core.gs) -- la ambigüedad de "torneo más
                 reciente vs. torneo puntual" que lo bloqueaba ya no aplica,
                 porque `_webAdminRequisitosClanes(token, id)` precarga por
                 `id` puntual (no "el más reciente") desde que existe ese
                 parámetro, así que Modificar ya edita los requisitos del
                 torneo correcto sin riesgo de pisar los de otro torneo del
                 mismo día. No queda ningún pendiente de backend en este
                 punto.

                 RESUELTO (10-sep-2026, sección 5.1.1 del consolidado):
                 los grids #reqTrofeosGuerraGrid/#reqAtaquesSemanaGrid ahora
                 traen arriba un checkbox "Usar el mismo valor para los 4
                 clanes" + un input único (ver pintarGridRequisitosNumericos()/
                 initMismoValorParaTodos() en el <script>) que replica un
                 solo valor a los 4 campos por clan. Esto sigue siendo
                 puramente de UI/UX -- no adelanta nada del PENDIENTE
                 BACKEND de arriba, que sigue igual de pendiente.
```

### Línea original 1154

```
FIX (10-sep-2026, pedido usuario — sección 5.4.1 del
                 consolidado: "cuadro de Comentario justo ANTES del botón de
                 acción final, en los 6 formularios de Torneos y Sorteos").
                 Este bloque es la versión de Torneos; Sorteos tiene su
                 propio nodo equivalente, #comentarioSorteoBox (ver más
                 abajo, junto a #camposSorteoPrincipal).

                 Es UN SOLO nodo compartido entre las 3 ramas (Registrar/
                 Modificar/Planificar), mismo criterio que
                 #requisitosTorneoBox/#camposTorneoPrincipal de arriba, pero
                 sin necesidad de reubicarlo con JS: a diferencia de esos dos
                 (que necesitan aparecer en un punto intermedio distinto
                 dentro de cada rama), acá el lugar pedido es SIEMPRE "justo
                 antes del botón de acción final" -- y como solo uno de los 3
                 botones está visible a la vez (btnRegistrarTorneo/
                 btnModificarTorneo/btnPlanificarTorneo, ver mostrarPaso3()),
                 dejarlo acá quieto ya cumple la posición pedida sin importar
                 cuál rama esté activa.

                 RESUELTO / conexión (mismo estado que #requisitosTorneoBox
                 en 5.1):
                   1) RESUELTO (11-sep-2026): los 3 listeners
                      (btnRegistrarTorneo/btnModificarTorneo/
                      btnPlanificarTorneo) ya leen este campo
                      (`document.getElementById('tComentario').value.trim()`)
                      y lo suman al payload como `comentario`, junto con
                      `requisitos` de armarPayloadRequisitos() -- ver el
                      comentario FIX junto a cada listener más abajo. El
                      backend (_registrarTorneoDesdeBot()/
                      _modificarFechaHoraTorneo()/_planificarTorneoDesdeBot(),
                      24_Torneos_Core.gs) ya lo recibe y lo escribe en la
                      columna Comentario (TL.COMENTARIO) de T_Lista.
                   2) RESUELTO (15-sep-2026, cierre de conexión pendiente):
                      `webAdminTorneosHoy()`/`_listarTorneosDeHoy()` ya
                      devuelven también el Comentario existente de cada fila
                      (mismo criterio que autor/premios/semanas de 5.2), y
                      el listener de #tSelectHoy ya lo precarga en
                      #tComentario al elegir un torneo en "Modificar" (ver
                      data-comentario en cargarTorneosHoy() más abajo).
                   3) Regla de sobrescritura ya definida (CONFIRMADO en el
                      consolidado): a diferencia de Premios, lo que se vea en
                      este cuadro al guardar reemplaza siempre al Comentario
                      anterior, sin excepción para vacío -- no hace falta
                      lógica especial en el frontend para eso, el backend
                      simplemente escribe lo que reciba.
```

### Línea original 1216

```
FIX (08-sep-2026, pedido usuario): panel "Sorteos" del nuevo
               toggle Torneos/Sorteos.
               FIX (10-sep-2026, pedido usuario — sección 5.4 del
               consolidado, wizard de Sorteos por tramos): PASO 1 y PASO 2
               ya están construidos, mismo mecanismo que Torneos
               (#torneoPaso1/#torneoPaso2 dentro de initTorneoWizard()).
               #sorteoPaso1 y #sorteoPaso2 se quedan SIEMPRE visibles una
               vez revelados (igual que sus equivalentes de Torneos --
               initTorneoWizard() nunca los oculta, ver mostrarPaso3()); los
               links "‹ Cambiar" solo esconden el paso SIGUIENTE, sin volver
               a esconder el paso anterior.
               PASO 2 (#sorteoPaso2/#sorteoTipo): "sorteo principal" o
               "sorteo de continuación" -- mismo concepto que Torneos
               (CORRECCIÓN ya registrada en la sección 5.4 del consolidado:
               el concepto SÍ existe en Sorteos, solo que se resuelve por ID
               en vez de por Tag). El nombre de la opción usa "sorteo" en
               vez de "torneo" para no confundir al admin, pero los values
               ("principal"/"continuacion") son los mismos que
               #torneoTipo, listos para que el futuro Paso 3 los lea igual.
               PASO 3: campos reales del formulario -- fecha/hora, autor,
               cuenta organizadora, premios (Modificar/Planificar),
               selector de semanas, requisitos por clan (con Delta y
               "Torneos mínimos", exclusivos de Sorteos) y selector de
               sorteo principal (por ID, no por Tag). Ver
               mostrarPaso3Sorteo() en el <script> para el detalle
               completo.
```

### Línea original 1555

```
FIX (10-sep-2026, sección 5.4 del consolidado — primer
                   bloque de campos REALES del Paso 3 de Sorteos):
                   Requisitos para participar en el sorteo, análogo a
                   #requisitosTorneoBox de Torneos pero con los campos
                   exclusivos de S_Lista (ver "S_Lista tiene y T_Lista NO
                   tiene" en la sección 5.4 del consolidado): Delta y el
                   bloque "Torneos jugados" (C1-C4) que Torneos no tiene
                   (Torneos no evalúa torneos jugados sobre sí mismo).

                   Reutiliza TAL CUAL pintarGridRequisitosNumericos() /
                   initInputMiles() / CLANES_REQUISITOS (ver <script>, ya
                   construidas para Torneos y ya cargada dinámicamente vía
                   cargarClanesFamilia()) con contenedores/prefijos
                   propios de Sorteos -- así el checkbox "mismo valor para
                   los 4 clanes" (sección 5.1.1, initMismoValorParaTodos())
                   viene incluido gratis, sin duplicar esa lógica.

                   Es UN SOLO nodo (no triplicado por rama, mismo criterio
                   que #requisitosTorneoBox), visible siempre que el Paso 3
                   esté abierto sin importar la rama (Registrar/Modificar/
                   Planificar). CORRECCIÓN (10-sep-2026, aclaración del
                   usuario): a diferencia de lo que decía antes esta nota,
                   Sorteos SÍ tiene selector de semanas (ver
                   #semanaSelectorWrapSorteoReg dentro de
                   #camposRegistrarSorteo más arriba) -- lo que sigue
                   siendo cierto es que ese selector vive DENTRO de cada
                   contenedor por rama (igual que #semanaSelectorWrapReg/
                   Mod/Plan de Torneos), así que, igual que en Torneos, no
                   hace falta reubicarlo con JS. Este bloque de requisitos
                   Min_S es distinto: por ser un único nodo compartido por
                   las 3 ramas, queda fijo en este punto del Paso 3,
                   después de los 3 contenedores por acción y antes del
                   selector de sorteo principal.

                   Delta (columna P de S_Lista, dentro del bloque Min_S,
                   ver sección 5.4 del consolidado) es un valor único para
                   los 4 clanes por diseño de la hoja -- por eso NO usa
                   pintarGridRequisitosNumericos() (que pinta 4 campos, uno
                   por clan) sino un solo input con el mismo formato de
                   miles (initInputMiles()), coherente con lo ya aclarado en
                   5.1.1 ("No aplica a Delta... el campo de Delta ya es uno
                   solo").

                   RESUELTO (12-sep-2026, consolidado sección 5.4 -- estaba
                   "PENDIENTE BACKEND, mismo estado que #requisitosTorneoBox
                   en 5.1"): ya existen tanto la LECTURA
                   (_webAdminRequisitosClanesSorteo(), 34_Web_API.gs, ver
                   cargarRequisitosSorteoPorClan() en el <script>) como la
                   ESCRITURA (_webAdminSorteoRegistrar()/
                   _webAdminSorteoPlanificarGuardar()/
                   _webAdminSorteoModificar(), 34_Web_API.gs, ya reciben y
                   guardan `requisitos` en las 3 ramas -- ver
                   armarPayloadRequisitosSorteo() y los 3 listeners
                   btnRegistrarSorteo/btnModificarSorteo/btnPlanificarSorteo
                   en el <script>). No queda ningún pendiente de backend en
                   este punto.
```

### Línea original 1795

```
PASO 3 de la implementación del frontend (13-sep-2026,
                   pedido del usuario -- Fase 7 del plan de Cambio de Rango):
                   formulario de campos COMUNES a Ascenso y Descenso (Fecha,
                   Hora, Semanas, Organizador, Comentario) -- ver el docblock
                   de _webCRListaGuardar() (34_Web_API.gs) para el shape
                   exacto de `datos`.
                   `Semanas` es un campo de texto simple ("T4_S1,T4_S2", mismo
                   formato que ya usa _parseSemanasSorteo()) en vez del
                   selector visual de checkboxes que usan Torneos/Sorteos --
                   ese selector marca por fecha-lunes-ISO
                   (ver preseleccionarSemanas()), y _getFilaCRListaPorId() acá
                   devuelve Semanas ya parseada como {temporada,semana}, no
                   como fecha -- reusarlo tal cual pediría un mapeo nuevo que
                   no corresponde a este paso chico.

                   PASO 4 (13-sep-2026, mismo pedido): se suma la grilla de
                   Min_CR/Ataques por Clan y Rol (datos.ascenso.porClan /
                   datos.descenso.porClan, ver _construirFilaCRLista()) --
                   #crGridAscenso/#crGridDescenso, pintadas por
                   pintarGridCR() una vez que se conocen los 4 clanes de la
                   Familia (cargarClanesFamilia(), ya usado por Torneos/
                   Sorteos más arriba en este mismo <script>). A propósito
                   AFUERA de este paso: Barcos, Miembro activo, WhatsApp y
                   Estado (datos.ascenso.barcos/miembroActivo/whatsapp/estado)
                   -- quedan para un paso aparte.
```

### Línea original 1821

```
NUEVO (16-sep-2026, pedido usuario -- ver el docblock
                     grande junto a #btnPrecargarUltimoTorneo en
                     #camposRegistrar, arriba: mismo botón, ahora para la
                     ÚLTIMA CORRIDA de Cambio de Rango ya registrada en
                     CR_Lista (la anterior a esta que se está armando ahora).
                     A diferencia de Torneos/Sorteos (que solo traen
                     Organizador/Cuenta organizadora/Comentario), acá
                     también trae las 2 grillas (Ascenso/Descenso) y "Otros
                     criterios" (Barcos/Miembro activo/WhatsApp) -- mismo
                     contenido que ya sabe precargar precargarFormularioCR(),
                     MENOS Fecha/Hora (son de ESTA corrida nueva) y MENOS
                     Semanas (pedido explícito del usuario: "no aplica para
                     semanas", cada corrida nueva elige las suyas). Tampoco
                     marca esta corrida como "existente": crIdExistenteActual
                     queda en '' (modo Registrar), así que Guardar CREA una
                     corrida nueva en vez de sobreescribir la que se acaba de
                     usar como plantilla. Ver precargarUltimoRegistroCR() en
                     el <script>.
                     Solo visible en modo "Registrar" (oculto en
                     Editar/Ver, donde precargar significa otra cosa: elegir
                     la corrida en #crSelectPar) -- el toggle vive en el
                     listener de #btnCrPaso1 y en #crVolverPaso1, más abajo.
                     PENDIENTE BACKEND: mismo trío pendiente que en
                     Torneos/Sorteos (`_getUltimoRegistroTorneoOSorteo`,
                     `_webAdminUltimoRegistroTorneoOSorteo`,
                     `webAdminUltimoRegistro` en doGet) -- CR además necesita
                     que ese `_getUltimoRegistroTorneoOSorteo` sepa buscar en
                     CR_Lista, no solo en T_Lista/S_Lista (nombre de la
                     función a confirmar en el mensaje del backend).
```

### Línea original 1968

```
PASO 6 de la implementación del frontend (13-sep-2026,
                         pedido del usuario -- Fase 7 del plan de Cambio de
                         Rango): los 3 campos (Barcos/Miembro activo/WhatsApp)
                         que el comentario de PASO 4/5 dejaba a propósito
                         afuera. A diferencia de Min_CR/Ataques (por Clan Y
                         Rol), estos son UN solo valor por MITAD del par (ver
                         _construirFilaCRLista(), 34_Web_API.gs:
                         `bloque.barcos`/`bloque.miembroActivo`/
                         `bloque.whatsapp`, donde `bloque` es TODO
                         `datos.ascenso` o TODO `datos.descenso`, no algo por
                         clan) -- por eso van UNA vez acá, no dentro de la
                         grilla de arriba.
                         Miembro activo / WhatsApp: mismo patrón EXACTO que
                         #reqMiembroActivo/#reqPresenciaWhatsapp de Torneos
                         (más arriba en este mismo archivo) -- sin opción
                         "Elige…" (mismo FIX del 10-sep-2026 que ya aplica
                         ahí). Miembro activo mantiene "Sí" por defecto,
                         igual que en Torneos.
                         FIX (16-sep-2026, pedido usuario -- "los botones de
                         presencia en el grupo de wsp de cambio de rango se
                         deben precargar en la opción 'No'"): a diferencia
                         de Miembro activo, WhatsApp en Cambio de Rango
                         ahora arranca en "No" por defecto (Torneos/Sorteos
                         no cambian, siguen en "Sí" -- el usuario pidió esto
                         solo para Cambio de Rango).
                         Barcos: FIX (14-sep-2026, pedido usuario -- "desde
                         la web no se debe dejar sin definir la cantidad de
                         barcos, es de 0 a 16, cargado por defecto en 0 y
                         con la descripción de que si no quiere activar ese
                         criterio, debe seleccionar 16"): se quita la opción
                         "Sin configurar" -- ahora es el MISMO patrón 0-16
                         que #reqAtaquesBarcos (Torneos), con "0"
                         seleccionado por defecto y 16 = no excluir a nadie.
                         precargarOtrosCriteriosCR() mapea `barcos.activo:
                         false` (celda vacía en la hoja) a "16" para
                         mantener ese mismo significado al editar una
                         corrida ya guardada sin este criterio configurado.
                         Estado: FIX (13-sep-2026, pedido usuario -- "el
                         estado no se pregunta al usuario, se manda siempre
                         como 'Planificado'"): el <input type="text"> que
                         había acá se quita del formulario -- ya no se le
                         pregunta nada al admin sobre esto. Ver
                         leerOtrosCriteriosCR() en el <script>, que ahora
                         manda 'Planificado' fijo en vez de leer un campo.
```

### Línea original 2121

```
PASO 5 de la implementación del frontend (13-sep-2026,
                   pedido del usuario -- Fase 7 del plan de Cambio de
                   Rango): última pieza que faltaba del plan original --
                   "botón Ver propuestas (_webCRListaPropuestas) que pinte
                   la tabla antes de confirmar, y botón Generar propuestas
                   (_webCRListaGenerarPropuestas) que dispare la escritura
                   real en Historial_A/D". Solo tiene sentido una vez que
                   la corrida YA existe en CR_Lista (ambos endpoints leen
                   por ID desde la hoja, ver _getFilaCRListaPorId()), así
                   que #crPropuestasBox arranca oculto y recién se muestra
                   cuando `crIdExistenteActual` queda seteado -- ya sea al
                   entrar en modo Editar (precargarFormularioCR()), justo
                   después de un Guardar exitoso en modo Registrar (ver el
                   listener de #btnCrGuardar más abajo en el <script>), o
                   directo en modo "Ver propuestas de una corrida" (ver
                   seleccionarCorridaParaVerPropuestas() más abajo).

                   REUBICADO (16-sep-2026, pedido del usuario -- "haz que
                   las propuestas aparezcan dentro del selector de cambio
                   de rango, junto a registrar y editar corrida"): antes
                   este bloque vivía DENTRO de #crPaso3 (después del botón
                   Guardar corrida), lo que obligaba a abrir todo el
                   formulario completo (Fecha/Hora/Semanas/grillas) solo
                   para llegar a la tabla de propuestas. Ahora es HERMANO
                   de #crPaso3 (mismo padre #crPaso2), así que puede
                   mostrarse solo -- sin el formulario -- cuando el modo
                   elegido en #crAccion es "ver". En los modos Registrar/
                   Editar sigue apareciendo exactamente en el mismo lugar
                   visual de siempre (justo debajo del formulario), porque
                   #crPaso3 y este bloque quedan uno a continuación del
                   otro de todas formas.

                   FIX (16-sep-2026, pedido usuario -- "no se debe ver como
                   algo aparte, sino parte del flujo... se ve al nivel de la
                   sección de Planificar, registrar... pero es parte de
                   ella"): antes era un <details class="admin-subseccion">,
                   la MISMA clase que arma el título grande naranja con el
                   ícono +/- de las secciones de nivel superior ("Planificar,
                   registrar o modificar torneos o sorteos", "Ganadores del
                   torneo más reciente") -- por eso, aunque estaba anidado
                   varios niveles adentro de Cambio de rango, se VEÍA como un
                   módulo independiente del mismo peso que esas secciones
                   grandes. Mismo cambio ya hecho antes para Requisitos de
                   Ascenso/Descenso por el mismo motivo exacto (ver el
                   comentario de .cr-requisitos-bloque en el <style>, arriba
                   del todo): se reemplaza por cr-requisitos-bloque/
                   cr-requisitos-header, el mismo look de encabezado pero
                   FIJO -- sin ícono de colapso, sin "click para abrir" --
                   que dejó claro que esta sección es parte del wizard, no
                   algo opcional aparte.
```

### Línea original 2343

```
FIX (05-sep-2026, pedido usuario): las 3 tarjetas "Mensajes
         automáticos" se fusionan en UNA sola sección llamada "Mensajes",
         con las mismas 3 agrupaciones de antes pero ahora como
         subsecciones (h3) dentro de un único card admin-grupo, en vez de
         3 cards sueltos repitiendo el mismo eyebrow:
           1) "Guerra, entrenamiento y mazos" — preparación estándar que
              se comparte igual para todos los clanes.
           2) "Torneos, sorteos y ascensos" — con botones horizontales
              Participantes/Ganadores para Torneos y, por separado, para
              Sorteos (mismo patrón de pestañas .tab-clan que ya usa
              renderContenidoHtml() para las opciones por clan dentro de
              cada categoría, ver cargarGrupoToggle() más abajo).
           3) "Mensajes que no suelen enviarse" — bienvenida/iniciales (una
              sola vez por persona), etiqueta/celular (esporádico) y
              descripción de grupos (nunca se envía, es solo para
              actualizar los grupos).
         También corrige el pedido "'Día de guerra' debe ser una sola
         categoría con 'Entrenamiento' y tener sus botoncitos para cambiar
         entre guerra o entrenamiento. No veo el mensaje de entrenamiento":
         antes 'Defensas de barcos' (el mensaje real de "Entrenamiento") se
         ocultaba solo por ser día de guerra hoy — no era un problema de
         sync, ver FIX correspondiente en _webAdminCategorias()
         (34_Web_API.gs). Ahora ambos quedan siempre disponibles y el
         admin alterna con los botones "Guerra"/"Entrenamiento", sin
         depender de qué día sea. Pedido usuario: la web no debe mencionar
         al bot en ningún texto visible, así que las 3 bajadas ya NO dicen
         de dónde sale el contenido, solo qué es y para qué sirve. Ver
         initMensajesAutomaticos()/cargarGrupoToggle() más abajo;
         cargarContenidoCategoria()/renderContenidoHtml()/
         _activarAccionesContenido() (ya existentes) se reutilizan tal
         cual para pintar cada categoría — ninguno de esos selectores
         depende de que cada grupo esté en su propio card, así que fusionar
         los 3 cards en uno no rompe nada del JS.
      FIX (16-sep-2026, pedido usuario): esta card "Mensajes" pasa de ir
      ANTES de "Torneos y sorteos" a ir DESPUÉS. Es solo un cambio de
      orden en el HTML (se mueve el bloque completo tal cual, comentario
      incluido); no se tocó nada del contenido, de los ids ni del JS
      (initMensajesAutomaticos()/cargarGrupoToggle() siguen funcionando
      igual, no dependen del orden de las cards en el DOM).
```


## admin.html — historial trasladado (Parte 7b, bloques // del <script>)

### Línea original 2070

```
// FIX (13-sep-2026, pedido usuario -- "ReferenceError: Cannot access
// '_clanesFamiliaCache' before initialization"): estas 3 declaraciones
// vivían junto a cargarClanesFamilia() (línea ~3369 antes de este fix),
// muy por debajo del `if(localStorage.getItem(SESSION_KEY)) mostrarPanel();`
// de más abajo en este mismo <script>. Como ese `if` corre de inmediato si
// ya había sesión guardada, disparaba mostrarPanel() -> cargarClanesFamilia()
// mientras `_clanesFamiliaCache` (let) seguía en zona muerta temporal (TDZ),
// porque su línea de declaración todavía no se había ejecutado. Se adelantan
// acá arriba, junto a las demás variables tempranas del script, por el mismo
// motivo por el que cuentasPorNomMultiCache NO se puede llamar desde ese
// `if` (ver comentario junto a btnLogin más abajo). El resto de
// cargarClanesFamilia() se deja donde estaba.
```

### Línea original 2108

```
  // FASE 7 (Parte B, 06-sep-2026): cargarAscensosEditables() encadenada
  // DESPUÉS de cargarNomMultisAdmins() (en vez de disparada en paralelo,
  // como el resto de esta función) para que nomMultisAdminsCache ya esté
  // poblado cuando se pinten los <select> de "Editar autor de ascenso" —
  // si se dispararan en paralelo, el orden de respuesta de la red no está
  // garantizado y los <select> podrían quedar solo con las dos opciones
  // fijas hasta el próximo repintado (ej. al escribir en el filtro).
```

### Línea original 2117

```
  // RESUELTO (12-sep-2026, consolidado sección 5.1 -- "CLANES_REQUISITOS
  // sigue hardcodeado porque no existe el endpoint"): ya existe
  // webAdminClanesFamilia (_webAdminClanesFamilia(), 34_Web_API.gs). Se pide
  // acá (recién en mostrarPanel(), no antes, porque el endpoint requiere
  // sessionToken válido -- ver _webAuthValidar() en el backend), se pinta
  // cada grid con los clanes que devuelva (cae al array hardcodeado de
  // siempre si la llamada falla, ver cargarClanesFamilia() más abajo) y
  // RECIÉN DESPUÉS se dispara la precarga de valores guardados
  // (cargarRequisitosPorClan()/cargarRequisitosSorteoPorClan()), para que
  // ya existan los <input> de cada clan cuando esos dos intenten llenarlos.
```

### Línea original 2159

```
  // FIX (08-sep-2026, pedido usuario — "la detección de infiltrados va en
  // la sección de buscar miembros, no en Directorio"): #cardInfiltrados ya
  // NO vive dentro de #directorioGrupo (se movió a la card "Buscar
  // miembro", ver el HTML) — sigue sin depender de ninguna Función (todo
  // admin logueado puede consultarla), por eso no se toca su display acá,
  // pero ya no es motivo para forzar visible este contenedor si está
  // vacío. Vuelve al comportamiento original de FASE 25: "Directorio"
  // (que ahora solo agrupa Registrar/Vetar) se oculta completo si el admin
  // logueado no tiene ninguna de las dos Funciones.
```

### Línea original 2198

```
    // FIX (09-sep-2026 tarde, pedido usuario — cuenta propia en "Lo
    // organicé yo"): recién ACÁ, tras un login fresco en esta pestaña, ya
    // está disponible tanto SESSION_ADMIN_KEY (recién seteado arriba) como
    // refrescarCuentaOrgPropia() (definida más abajo en este <script>,
    // pero ya evaluada para cuando el usuario llega a hacer click en
    // "Ingresar" — a diferencia de la llamada síncrona de más arriba,
    // `if(localStorage.getItem(SESSION_KEY)) mostrarPanel();`, que corre
    // ANTES de que se declare cuentasPorNomMultiCache y por eso NO puede
    // llamar a esta función directamente; ese caso ya queda cubierto por
    // la llamada a refrescarCuentaOrgPropia() que sigue a
    // initCuentaOrgBox('Mod') más abajo, porque para cuando el script
    // llega ahí, una sesión guardada de antes ya está en localStorage).
```

### Línea original 2224

```
// Fase 5 (29-ago-2026): el token viaja por query string (?tk=) hacia la
// pestaña nueva de sorteo.html, que lo guarda en su propio sessionStorage
// apenas carga — sessionStorage NO se comparte entre pestañas por sí solo
// (por eso no alcanza con que ya esté guardado acá), así que hace falta
// pasarlo explícitamente en la URL de apertura.
// FIX (30-ago-2026): se retiran los console.log() de diagnóstico que había
// acá (mismo espíritu que el bloque de debug ya retirado de sorteo.html) —
// exponían en la consola del navegador la longitud del token de sesión y
// la URL completa con el token en texto plano.
```

### Línea original 2461

```
  // FIX (09-sep-2026, pedido usuario — "el cuadro para buscar miembro
  // agrega un # y busca como si fuera tag [...] no debería agregarse el #
  // de forma visual"): antes esta línea reemplazaba lo que el admin
  // escribió (nombre, Nom_Multi o Tag) por `tagFinal` YA normalizado
  // (mayúsculas + '#') apenas se resolvía la búsqueda — así que buscar
  // "Juan" terminaba mostrando "#ABC123XYZ" en el cuadro, como si el
  // admin hubiera escrito un Tag desde el principio. `tagFinal` sigue
  // usándose igual para la llamada al backend de abajo (la búsqueda en sí
  // no cambia) -- solo se deja de pisar visualmente lo que el admin
  // escribió.
  // FIX (09-sep-2026, pedido usuario — el buscador se quedaba "en blanco"
  // sin ningún aviso mientras esperaba, porque hasta ahora esta búsqueda
  // era instantánea (solo leía Sheets). Desde que webAdminBuscarMiembro
  // puede caer al perfil público de Supercell/RoyaleAPI para un Tag sin
  // registro (ver _webPerfilJugadorSinRegistro(), 34_Web_API.gs), la
  // respuesta puede tardar varios segundos -- se avisa para que no
  // parezca que el botón no hizo nada.
```

### Línea original 2525

```
  // FIX (07-sep-2026, pedido usuario — nombres clickeables al perfil):
  // OJO — perfil.html (_webPerfilJugador(), Base.md) SOLO busca en la
  // hoja Directorio, nunca en Inactivos/Vetados. f.origen puede ser
  // cualquiera de las 3 (ver _buscarEnRosterTerna()), así que el link
  // solo se agrega cuando f.origen === 'Directorio' — con Inactivos o
  // Vetados el perfil devolvería "No encontré ese Tag en el Directorio."
  // Los miembros del CLAN RIVAL (nombreEnClanRival/tagEnClanRival) NUNCA
  // se linkean: por definición no son de nuestra Familia, así que jamás
  // están en nuestro Directorio.
```

### Línea original 3032

```
  // FIX (03-sep-2026, "no me gusta que se vean esos márgenes, debería
  // verse como el modo de diseño web de Word"): ya no arma un <iframe> a
  // docs.google.com/.../preview (ese visor de Google siempre pagina con
  // márgenes de impresión y, por ser otro dominio, nuestro CSS no puede
  // tocar su contenido). Ahora pide el HTML del Doc a
  // webAdminContenidoDocHtml (SOLO LECTURA, ver docblock de
  // _webAdminContenidoDocHtml en 34_Web_API.gs) y lo pinta en un <div
  // class="doc-original"> propio, con nuestro CSS — texto corrido, sin
  // margen de página. Un segundo click lo oculta y destruye, igual que
  // antes; el pedido al backend se repite en cada apertura (no se
  // cachea acá) porque es una lectura liviana y así siempre se ve el
  // Doc tal cual está en Drive en ese momento.
```

### Línea original 3661

```
// FIX (10-sep-2026, pedido usuario — "en vez de EJ. 2,000 se debe mostrar
// 'Ejm: 2400' sin poner coma, para no inducir al usuario a escribir una
// coma; la coma debe aparecer mientras se escribe pero solo visualmente"):
// el placeholder ya no lleva coma (initInputMiles() se encarga de mostrarla
// solo quitando el foco, ver el input real). "Ejm: 16" para ataques, mismo
// motivo.
// RESUELTO (12-sep-2026, mismo día -- CLANES_REQUISITOS ya no hardcodeado):
// estas dos llamadas ya no se disparan acá al cargar el script, sino desde
// mostrarPanel() una vez resuelto cargarClanesFamilia() (ver ese bloque),
// para que ya exista un sessionToken válido al pedir los clanes reales.
```

### Línea original 3899

```
    // FIX (10-sep-2026, pedido usuario — "el sector que pide identificar el
    // torneo principal debe estar justo debajo de donde se pide el link
    // del torneo; luego ya viene lo demás"): #camposTorneoPrincipal es un
    // único nodo (no triplicado), así que se reubica en el DOM cada vez que
    // se entra al paso 3, justo antes de la fila de fecha/hora de la rama
    // activa (#filaFechaHoraReg/Mod/Plan) -- es decir, después del campo
    // que identifica el torneo (Link en Registrar, el <select> "Torneo" en
    // Modificar) y antes de fecha/hora/autor/premios/etc. En Planificar no
    // hay campo identificador propio, así que queda de primero.
```

### Línea original 3918

```
    // FIX (10-sep-2026, pedido usuario — "mueve los requisitos justo antes
    // de la selección de semanas"): #requisitosTorneoBox es un único nodo
    // (no triplicado), así que en vez de tener 3 copias se reubica en el
    // DOM cada vez que se entra al paso 3, justo antes del selector de
    // semanas de la rama activa (#semanaSelectorWrapReg/Mod/Plan). Ver el
    // docblock grande junto a #requisitosTorneoBox en el HTML para el
    // detalle completo.
```

### Línea original 3952

```
    // FIX (09-sep-2026 tarde, pedido usuario — "los premios deben
    // desplegarse como en planificar"): #premiosEditorMod ahora arranca
    // igual que #premiosEditor de arriba (3 filas "Pass Royale" en blanco)
    // en vez de vacío, para que se vea igual antes de elegir un torneo en
    // #tSelectHoy. En cuanto se elige un torneo, el listener de 'change'
    // de #tSelectHoy (más abajo) vuelve a poblar el editor con los premios
    // YA registrados de ese torneo (poblarPremiosEditor()).
```

### Línea original 4209

```
          // FIX (09-sep-2026 tarde, pedido usuario — "indicar el valor
          // actual" al modificar): data-autor/data-premios/data-semanas
          // ya llegan de _listarTorneosDeHoy()/webAdminTorneosHoy (RESUELTO,
          // 24_Torneos_Core.gs / 34_Web_API.gs). Si algún torneo puntual no
          // trajera alguno de estos campos, `t.autor`/`t.premios`/
          // `t.semanas` llegarían undefined y los ?? '' de abajo dejan los
          // atributos vacíos — el resto del código ya sabe tratar eso como
          // "sin dato" y usa los defaults genéricos (ver tSelectHoy 'change'
          // más abajo).
          // AMPLIADO (15-sep-2026, cierre de conexión pendiente -- punto 2
          // del comentario junto a #comentarioTorneoBox en el HTML):
          // data-comentario, mismo criterio que autor/premios/semanas, para
          // precargar #tComentario con lo ya guardado (ver _listarTorneosDeHoy(),
          // 24_Torneos_Core.gs).
```

### Línea original 4360

```
  // FIX (13-sep-2026, pedido usuario -- "el organizador [de Cambio de
  // rango] debe ser dropdown con los Nom_Multi de los admin"): mismo
  // select nuevo, mismo criterio de "insertar antes de __otro__" que los
  // tres de Torneos de arriba -- ver docblock junto a
  // precargarOrganizadorCR()/obtenerOrganizadorCR() (más abajo en este
  // <script>) para el resto del mecanismo.
  // FIX (14-sep-2026, pedido usuario -- "el sistema debe reconocer el
  // usuario logueado, cargando por defecto 'Yo (Diana)'"): #crOrganizadorSelect
  // ya no incluye el propio Nom_Multi del admin en la lista -- ahora el
  // valor "" (por defecto) es exactamente eso, "Yo (<nombre>)" (ver
  // actualizarEtiquetaAutorPropio() más abajo), mismo criterio que
  // #tAutorSelect/#tAutorSelectPlan (Torneos) en vez del anterior (donde
  // el admin podía aparecer dos veces: una como "Sin especificar" y otra
  // en la lista con su propio nombre).
```

### Línea original 4376

```
  // FIX (09-sep-2026 tarde, pedido usuario — "al marcar que lo organizo yo,
  // ya no debería aparecer mi nom_multi [en la lista]"): el Nom_Multi del
  // admin de la sesión ya está cubierto por la opción "Lo organic(é/o) yo
  // (<nombre>)" (ver actualizarEtiquetaAutorPropio() más abajo) — listarlo
  // OTRA VEZ en #tAutorSelect/#tAutorSelectPlan sería mostrar la misma
  // persona dos veces. En #tAutorSelectMod NO se excluye: ahí el valor
  // vacío es "Sin cambios" (el autor YA registrado, que puede ser
  // cualquiera, no necesariamente el admin de la sesión), así que el admin
  // sí puede necesitar elegirse a sí mismo del dropdown si el torneo lo
  // organizó otra persona.
```

### Línea original 4607

```
    // FIX (09-sep-2026 tarde, pedido usuario): valor === '' significa
    // cosas distintas según el formulario. En Registrar/Planificar
    // (sufijo '' / 'Plan') es "Lo organicé/organizo yo" — el admin de la
    // sesión, que igual que casi cualquier miembro suele ser multicuenta
    // (hasta ~7 cuentas), así que este caso ahora reusa el mismo cuadro
    // que un Nom_Multi elegido del dropdown, pero con el Nom_Multi propio
    // del admin logueado. En Modificar (sufijo 'Mod') el mismo valor vacío
    // es "Sin cambios (mantener autor actual)" — ahí NO se debe mostrar
    // el cuadro ni mandar tagOrg/clanOrg/clanTagOrg, para no pisar lo ya
    // guardado cuando el admin no tocó el autor.
```

### Línea original 4656

```
  // --------------------------------------------------------------
  // Conectado (12-sep-2026): webAdminCuentasDeNomMulti ya existe en el
  // backend (34_Web_API.gs / _webAdminCuentasDeNomMulti(), ruteado en
  // 08_Web_Endpoints.gs) — ver el comentario grande de arriba para su forma
  // exacta.
  // --------------------------------------------------------------
```

### Línea original 5215

```
  // NUEVO (12-sep-2026, pedido del usuario -- consolidado sección 5.4): con
  // el endpoint ya existente (_webAdminRequisitosClanesSorteo()), al elegir
  // un sorteo puntual se recarga #requisitosSorteoBox con SUS requisitos ya
  // guardados -- mismo criterio exacto que cargarRequisitosPorClan(id) en
  // el listener de #tSelectHoy, más abajo. Con la opción vacía se deja el
  // cuadro tal cual (mismo comportamiento que Torneos).
```

### Línea original 5265

```
  // FIX (09-sep-2026 tarde, pedido usuario — "si hay que modificar algo, se
  // debe indicar el valor actual"): al elegir (o quitar) un torneo, se
  // refresca la etiqueta de "Sin cambios", el editor de premios y el
  // selector de semanas con lo YA registrado para ESE torneo (ver
  // data-autor/data-premios/data-semanas en cargarTorneosHoy(), RESUELTO).
  // Se deja el select de autor en "Sin cambios" (no se fuerza un Nom_Multi
  // elegido) y se limpia lo que hubiera quedado tipeado a mano de un
  // torneo anterior.
```

### Línea original 5289

```
  // AMPLIADO (15-sep-2026, cierre de conexión pendiente -- punto 2 del
  // comentario junto a #comentarioTorneoBox en el HTML): #tComentario es
  // un cuadro COMPARTIDO entre Registrar/Modificar/Planificar, así que al
  // elegir (o quitar) un torneo en "Modificar" se precarga con su
  // Comentario ya guardado (data-comentario, ver cargarTorneosHoy() más
  // arriba) -- o se deja vacío si no hay torneo elegido o el torneo no
  // tiene comentario.
```

### Línea original 5298

```
  // FIX (12-sep-2026, pedido del usuario -- ver docblock de
  // cargarRequisitosPorClan() más arriba): al elegir un torneo PUNTUAL en
  // este <select> (value real, ni "" ni "__link__"), se recarga
  // #requisitosTorneoBox con los requisitos YA GUARDADOS de ESE torneo
  // -- ya no "el más reciente". Con la opción vacía o "Ingresar link"
  // (torneo sin ID conocido todavía, ver PENDIENTE BACKEND junto a
  // #tModificarLink más arriba en el HTML) se deja el cuadro tal cual
  // estaba, mismo criterio que premios/semanas de arriba con
  // `opt && opt.dataset...` en `undefined`.
```

### Línea original 5330

```
  // FIX (11-sep-2026): armarPayloadRequisitos()/#tComentario ya existían
  // pero ningún listener los sumaba al payload todavía (ver PENDIENTE junto
  // a #requisitosTorneoBox/#comentarioTorneoBox en el HTML y junto a
  // armarPayloadRequisitos() más abajo). El backend puede seguir sin leer
  // `requisitos`/`comentario` mientras no se actualice
  // _webAdminTorneoRegistrar() -- viajan igual, sin romper nada, y quedan
  // listos para cuando ese lado se conecte.
```

### Línea original 5347

```
  // PENDIENTE BACKEND (10-sep-2026, pedido usuario): al registrar un
  // torneo (con link real), la columna "Estado" de T_Lista debe quedar en
  // "Realizado" -- tanto si es una fila nueva como si esta acción está
  // completando una que ya existía como "Planificado" (mismo Fecha+Hora,
  // ver _registrarTorneoDesdeBot()/#camposPlanificar más arriba). Se
  // escribe del lado del backend (_registrarTorneoDesdeBot(), 24_Torneos_
  // Core.gs); este front no manda ningún parámetro de estado.
```

### Línea original 5390

```
  // FIX (12-sep-2026, pedido del usuario -- consolidado sección 5.2/5.3,
  // "link directo en Modificar torneo"): con la opción "Ingresar link"
  // elegida (id === '__link__'), se manda el valor de #tModificarLink como
  // `link` en el payload -- _webAdminTorneoModificar() (34_Web_API.gs) ya
  // tiene la rama que lo detecta y delega a _registrarTorneoDesdeBot() en
  // vez de buscar por `id` (que acá es el centinela, no un ID real de
  // T_Lista). Con cualquier otra opción, `link` viaja vacío y no cambia
  // nada del comportamiento ya existente (búsqueda por `id` real).
```

### Línea original 5408

```
  // FIX (09-sep-2026, pedido usuario — "editar el autor, ni el premio"):
  // autorSelect vacío = "Sin cambios" (no se manda autor nuevo);
  // "__otro__" = usar lo tipeado a mano en #tAutorManualMod; cualquier
  // otro valor = el Nom_Multi de admin elegido. Los premios salen del
  // editor #premiosEditorMod — si el admin no agregó ninguna fila (el
  // caso normal, cuando solo quiere cambiar fecha/hora), armarPremiosCSV
  // devuelve '' y no se toca lo ya guardado (ver nota "PENDIENTE BACKEND"
  // junto a #camposModificar en el HTML).
```

### Línea original 5458

```
    // FIX (09-sep-2026 tarde): vuelve al mismo estado "en blanco" que
    // #premiosEditor de Planificar (3 filas Pass Royale), en vez de dejar
    // el editor vacío -- consistente con que ahora #premiosEditorMod nunca
    // arranca vacío (ver poblarPremiosEditor()/mostrarPaso3()). También se
    // repinta el selector de semanas (vuelve al default) y la etiqueta de
    // "Sin cambios" vuelve al texto genérico hasta elegir otro torneo.
```

### Línea original 5508

```
  // PENDIENTE BACKEND (10-sep-2026, pedido usuario): al planificar un
  // torneo (sin link real todavía), la columna "Estado" de T_Lista debe
  // quedar en "Planificado" -- luego cambia a "Realizado" cuando se
  // complete con "Registrar torneo" (mismo Fecha+Hora, ver el comentario
  // grande de arriba y el de btnRegistrarTorneo). También se escribe del
  // lado del backend (_planificarTorneoDesdeBot(), 24_Torneos_Core.gs);
  // este front no manda ningún parámetro de estado. `premios` ya viaja
  // como texto separado por comas (ver armarPremiosCSV() más arriba) listo
  // para escribirse tal cual en la columna "Premios" de T_Lista — mismo
  // formato que debe usarse para la columna "Premios" de S_Lista cuando se
  // conecten los 3 caminos de Sorteos (Planificar/Registrar/Modificar,
  // #panelSorteosAccion más arriba en el HTML).
```

### Línea original 5735

```
  // FIX (13-sep-2026, pedido usuario -- "debe haber coma para separar
  // miles, aunque es solo visual, no se agrega al valor real"): mismo
  // patrón que los cuadros de Trofeos de guerra/Ataques por semana de
  // Torneos (formatoMiles()/valorPlanoInputMiles()/initInputMiles(), ver
  // esos docblocks más arriba en este <script>) -- type="text" en vez de
  // type="number" porque un <input type="number"> nativo rechaza las
  // comas, e initInputMiles() se encarga de mostrarlas/quitarlas solo.
```

### Línea original 5927

```
  // FIX (16-sep-2026, pedido usuario -- "los botones de presencia en el
  // grupo de wsp de cambio de rango se deben precargar en la opción
  // 'No'"): a diferencia de Miembro activo (que sigue en 'Sí'), WhatsApp
  // en Cambio de Rango arranca en 'No' -- ver también el <option selected>
  // del HTML (#crWhatsappAscenso/#crWhatsappDescenso), que se actualizó
  // igual para que el estado inicial del formulario ya cargado (antes de
  // que corra este JS) coincida.
```

### Línea original 6064

```
    // FIX (16-sep-2026, pedido usuario -- "la hora y el selector de am/pm
    // también se debe precargar con el estado actual de la corrida
    // seleccionada para modificar desde la web"): antes fHora.value salía
    // de filaAsc.fecha, pero en CR_Lista Fecha y Hora son DOS columnas
    // independientes (CR.FECHA / CR.HORA -- ver _horaStringADate()/
    // _getFilaCRListaPorId() en 24_Torneos_Core.gs, que ahora guarda/lee
    // CR.HORA como su propio Date real en vez de texto crudo de celda).
    // filaAsc.fecha nunca trae la hora real (siempre queda en medianoche),
    // así que esto terminaba precargando siempre "00:00" / AM sin importar
    // la hora guardada. Ahora la fecha sale de filaAsc.fecha y la hora sale
    // de filaAsc.hora, cada una con su propio Date -- mismo criterio de
    // extraer componentes LOCALES que ya usaba esta función.
```

### Línea original 6732

```
// FIX (16-sep-2026, pedido usuario -- orden de la tabla de propuestas de
// Cambio de Rango): _calcularPropuestasCambioRango() (24_Torneos_Core.gs)
// devuelve `propuestas` en el orden en que recorre el padrón (Directorio
// físico), sin ningún criterio de presentación -- no tiene por qué saber
// cómo se muestra en la web. El reordenamiento se hace acá, mismo patrón
// ya usado por _ordenarSugerenciasMiembro() más arriba en este <script>:
//   1) Clan -- ordenClanIndex() de common.js (mismo helper que ya usa
//      _ordenarSugerenciasMiembro()), NO alfabético.
//   2) Rango actual -- RANGO_ORDEN_CR de abajo, mismo orden de presentación
//      que ya usa el backend (CFG.RANGO_ORDEN, 01_Config_Global.gs: Líder,
//      Colíder, Veterano, Miembro). OJO: no confundir con `var RANGO_ORDEN`
//      de 14_Directorio_HistorialAscensos.gs -- esa es una lista ASCENDENTE
//      (Miembro..Líder) que se usa solo para detectar si un cambio es
//      ascenso o descenso (comparando índices), no para ordenar tablas.
//      NO alfabético.
//   3) Tipo -- TIPO_ORDEN_CR de abajo: Ascenso y Descenso (cambios de rango
//      reales) antes que Admin (solo candidatura, ver docblock de
//      _filaPropuestaCR() arriba) -- mismo orden de prioridad que ya refleja
//      el ternario de badgeClase en _filaPropuestaCR().
//   4) Nombre -- alfabético, como desempate final entre filas que coinciden
//      en los tres criterios anteriores.
```

### Línea original 6796

```
// FIX (16-sep-2026, pedido usuario -- "Sin propuestas" al elegir una
// temporada cerrada, sin ningún aviso visible): antes esta función solo
// recibía `propuestas` y, si venía vacío, siempre mostraba el mismo
// mensaje genérico ("nadie cumple los requisitos"), sin distinguir ese
// caso real de un problema leyendo Backup_Guerra.csv para esa temporada
// histórica (ver _ULTIMO_DIAGNOSTICO_GUERRA_CSV / _calcularPropuestasCambioRango(),
// 19_ControlCalendario.gs / 24_Torneos_Core.gs). Ahora recibe también
// `diagnostico` (campo aditivo `data.diagnostico` de webCRListaPropuestas/
// webCRListaGenerarPropuestas, solo presente cuando el backend detectó un
// motivo concreto) y, si está presente, lo muestra en vez del mensaje
// genérico.
```

### Línea original 6808

```
  // FIX (17-sep-2026, pedido del usuario -- "generó 1 fila y no avisó nada
  // del histórico de guerra"): antes `diagnostico` SOLO se leía dentro de
  // la rama "sin propuestas" (!propuestas.length). El backend (ver FIX del
  // 17-sep-2026 en _calcularPropuestasCambioRango(), 24_Torneos_Core.gs) ya
  // manda `diagnostico` aunque haya 1+ propuestas -- pero esta función lo
  // seguía ignorando por completo en cuanto había AL MENOS una fila,
  // aunque esa fila (con promedios en 0 por el mismo problema de
  // Backup_Guerra.csv) fuera exactamente el síntoma del problema. Ahora el
  // aviso se pinta SIEMPRE que `diagnostico` venga presente, como banner
  // arriba de la tabla (o del mensaje "sin propuestas"), sin importar
  // cuántas propuestas haya.
```

### Línea original 6887

```
    // NUEVO (16-sep-2026, pedido del usuario -- octavo paso chico): el
    // mensaje ahora desglosa `agregadas` en Ascenso/Descenso/Admin usando
    // `agregadasPorTipo` (campo aditivo de _registrarPropuestasCRListaEnHistorial(),
    // 14_Directorio_HistorialAscensos.gs) -- si por lo que sea no viene
    // (ej. sesión con backend viejo sin este campo), se cae al mensaje
    // simple de antes en vez de mostrar "undefined".
```

### Línea original 7577

```
  // Si el motivo ya trae uno de los valores fijos del dropdown de SU tipo
  // (ej. el precargado por "Descalificar: no está en el grupo"), lo
  // selecciona ahí; si no coincide con ninguno, deja el dropdown en
  // "-- Seleccionar --" para que se vea el texto libre con lo que ya venía
  // escrito. Se resetean los otros dropdowns para no arrastrar una
  // selección vieja de otro tipo entre una apertura y la siguiente.
```

### Línea original 7595

```
// FASE (12-sep-2026, pedido del usuario -- consolidado punto 2 "dropdown
// de Motivo en Torneos"): dropdown de motivos específicos para
// "Descalificado". #resMotivo sigue siendo el campo real que viaja a
// _webAdminTorneoResolucionGuardar() (backend sin cambios): cuando se
// elige un motivo fijo del dropdown, se copia tal cual a #resMotivo (oculto
// mientras tanto); si se elige "Otro" o no se elige nada todavía, se
// muestra #resMotivo para texto libre, igual que el comportamiento previo
// a este cambio.
//
// FASE (13-sep-2026, pedido del usuario -- cierre del punto de Empate que
// había quedado sin decidir): mismo patrón, ahora también para las dos
// variantes de Empate, cada una con su propia lista fija
// (#resMotivoRepartoSelect / #resMotivoDesempateSelect) -- ver el mapa
// TIPO_A_DROPDOWN_MOTIVO más abajo, que generaliza el criterio en vez de
// repetir el mismo bloque if/else por cada tipo nuevo.
```


## admin.html — historial trasladado (Parte 7c, bloques HTML restantes >=3 líneas)

### Línea original 345

```
"Tus cuentas" va primero en el panel, antes que "Buscar miembro".
         Mismo agrupamiento por clan y rango (líder primero) que ya usa el
         saludo del bot (_msgBienvenidaAdmin, 29_BotWhatsApp.gs), vía
         _webMisCuentas() (34_Web_API.gs), con estadísticas por cuenta que
         el mensaje de WhatsApp no incluye (Copas, V. Guerra, Torneos,
         Vigencia).
```

### Línea original 358

```
"Buscar miembro" busca por Nombre, Nom_Multi o Tag, en TODO
         miembro con registro en nuestra base (activo o inactivo), con
         sugerencias mientras se escribe (patrón similar al buscador
         público de directorio.html, pero más completo — ver
         buscarSugerenciasMiembro()/_ordenarSugerenciasMiembro() en el
         JS). Requiere que el backend exponga
         webAdminBuscarMiembroSugerencias (pendiente de conectar). Si el
         texto no da coincidencias y "parece" un Tag, se prueba igual como
         Tag directo contra webAdminBuscarMiembro (existente), que
         consulta el perfil público aunque el jugador nunca haya sido
         parte de la Familia.
```

### Línea original 381

```
"Detección de infiltrados" vive junto a "Buscar miembro" (antes
           estaba dentro de #directorioGrupo). Mismo <details
           id="cardInfiltrados">, comportamiento y backend — solo cambió
           dónde vive en el HTML; aplicarVisibilidadPorFunciones() lo sigue
           mostrando/ocultando por id.
```

### Línea original 402

```
"Directorio" agrupa "Registrar miembro nuevo" y "Vetar miembro"
         como subsecciones plegables de un solo contenedor (antes eran dos
         <div class="card"> separadas, cada una repitiendo el eyebrow
         "Directorio"), ubicado antes de "Visor de contenido". Los ids de
         cada card (cardRegistrarNuevo/cardVetar) no cambiaron —
         aplicarVisibilidadPorFunciones() oculta cada subsección por
         separado según Funciones del admin, y el contenedor completo si
         ninguna de las dos aplica.
```

### Línea original 413

```
Registrar miembro nuevo, en dos pasos: Paso 1 verifica el Tag
           contra la API (webAdminVerificarTag); Paso 2 se habilita solo
           tras un "Verificar" exitoso. Reutiliza
           _guardarRegistroNuevoMiembro() (11_DirectorioSheet.gs) vía
           webAdminRegistrarNuevo. Subsección oculta si el admin no tiene
           "Registrar miembro nuevo" en Funciones (el backend igual
           revalida esto en cada request). Ver
           arquitectura-web-familia-terna.md, Sección 7.4.
```

### Línea original 424

```
#nmModoTagBox es el flujo de Tag escrito a mano + Verificar.
               #nmModoDirBox deja elegir un Clan, ver su lista de miembros
               (filtrable por Rango y por celular registrado) y clickear
               uno para llenar #nmTag con su Tag y disparar
               verificarTagNuevoMiembro() — de ahí en adelante es el mismo
               flujo para ambos modos (Paso 2 en #nmPaso2, sin cambios).
               Ver initModoRegistrarNuevo() en el <script>.
```

### Línea original 433

```
Botones .tab-clan (mismas pastillas de
                 Torneos/Sorteos/Cambio de rango, ver .btn-toggle-torsor)
                 en vez de radios. El activo se marca con .activo y se lee
                 de data-modo — ver actualizarModoRegistrarNuevo() en el
                 <script>.
```

### Línea original 507

```
Vetar a un miembro es de un solo sentido, sin opción de
           deshacer desde la web (no hay endpoint de "desvetar", ver
           Sección 7.6 de arquitectura-web-familia-terna.md). El backend
           (_webAdminVetar, 34_Web_API.gs) revalida "Vetar" en Funciones y
           el Clan del admin logueado. La lista de Razón es la misma que
           CFG.RAZON_VALORES_VALIDOS (01_Config_Global.gs) — si cambia en
           el backend, hay que actualizarla acá a mano también (no hay
           endpoint que la exponga, Sección 7.7).
```

### Línea original 543

```
"Participación de hoy en guerra" ya no vive acá — se retiró
           porque duplicaba lo que muestra directorio.html. Vive solo en
           #cardParticipacionHoyDirectorio de ese archivo (visible con
           sesión de admin guardada, mismo SESSION_KEY), ver
           renderParticipacionHoyGuerra()/cargarParticipacionHoyGuerra()
           ahí. El endpoint del backend no cambió.
```

### Línea original 551

```
"Torneos y sorteos" agrupa ambos en un solo contenedor con
         subsecciones (mismo criterio que "Directorio"); la ruleta de
         sorteos va después de torneos, no suelta arriba de todo el panel.
         Gestión de torneos: registrar link nuevo, modificar fecha/hora
         del de hoy, ver ganadores del más reciente — reutiliza
         _registrarTorneoDesdeBot/_listarTorneosDeHoy/
         _modificarFechaHoraTorneo (24_Torneos_Core.gs), los mismos 3
         pasos que ya usa el bot de WhatsApp para admins. "Ver ganadores"
         usa el mismo webTorneos público de index.html.
```

### Línea original 563

```
Wizard de 3 pasos para Torneos: Paso 1 (#torneoPaso1) elige
           Registrar/Modificar/Planificar (#torneoAccion); Paso 2
           (#torneoPaso2) elige Principal o Continuación (#torneoTipo);
           Paso 3 (#torneoPaso3) combina ambas respuestas y muestra los
           campos correspondientes (#camposRegistrar/#camposModificar/
           #camposPlanificar, más #camposTorneoPrincipal si es
           continuación). #camposTorneoPrincipal es una lista desglosable
           de los torneos de hoy para elegir de cuál es continuación; esa
           elección viaja como tagTorneoPrincipal (columna Tag_Tor_2 de
           T_Lista — ver _registrarTorneoDesdeBot()/
           _modificarFechaHoraTorneo()/_planificarTorneoDesdeBot(),
           24_Torneos_Core.gs). Ver initTorneoWizard() más abajo para la
           lógica de pasos.

           "Planificar torneo" es un tercer camino separado de
           "Registrar", porque el link real de RoyaleAPI recién se genera
           con pocas horas de anticipación, mientras que los premios
           necesitan quedar listos con más tiempo. #camposPlanificar
           guarda Fecha + Premios sin link todavía; cuando después se
           registra el link real de ese mismo torneo, la fila se completa
           sola en vez de duplicarse. Editor de premios: arranca con 3
           filas, "+ Agregar premio" para sumar más y "Quitar" en cada una
           (mínimo 1) — ver armarPremiosCSV()/agregarFilaPremio() más
           abajo.
```

### Línea original 587

```
"Planificar, registrar o modificar torneos o sorteos": dos
           botones .tab-clan alternan entre "Torneos" (el wizard de 3
           pasos, dentro de #panelTorneosAccion) y "Sorteos"
           (#panelSorteosAccion). Ver el listener de #sorteoAccion junto
           al toggle .btn-toggle-torsor, después de initTorneoWizard().
```

### Línea original 599

```
Tercer tab "Cambio de rango", mismo mecanismo que
                 Torneos/Sorteos (.btn-toggle-torsor + data-panel) — el
                 listener genérico del <script> recorre todos los
                 .btn-toggle-torsor.
```

### Línea original 608

```
"Torneo vigente" es el control web para
               Extra!Torneo_Vigente_ID (antes se editaba a mano en la hoja
               Extra, ver _getIdVigenteExtra(), 24_Torneos_Core.gs). Lista
               TODOS los torneos existentes (no solo los de hoy, a
               diferencia de #tSelectHoy) vía _webAdminVigenteListar() y
               guarda con _webAdminVigenteGuardar(). "Ninguno" limpia la
               celda y el sistema usa su respaldo de "más reciente por
               Fecha". Colapsado por defecto por ser de uso ocasional.
```

### Línea original 661

```
Botón que trae Organizador/Cuenta organizadora y
                   Comentario del último torneo ya registrado en T_Lista,
                   para no reescribirlos a mano. No toca
                   #semanasSelectorReg, Link/Fecha/Hora ni Requisitos. Ver
                   precargarUltimoRegistroTorneo() en el <script>.
                   PENDIENTE BACKEND: falta `_getUltimoRegistroTorneoOSorteo`
                   (24_Torneos_Core.gs), su wrapper
                   `_webAdminUltimoRegistroTorneoOSorteo` (34_Web_API.gs) y
                   el caso `webAdminUltimoRegistro` en doGet
                   (08_Web_Endpoints.gs) -- el botón está listo en el
                   frontend, pendiente de esas 3 piezas.
```

### Línea original 702

```
Campo opcional: "Lo organicé yo" deja que el backend use
                   el admin de la sesión como organizador. Las opciones
                   desglosan los Nom_Multi de los admins
                   (cargarNomMultisAdmins(), webAdminNomMultisAdmins) más
                   "Ninguna de las anteriores", que revela #tAutorManual
                   para escribirlo a mano. Ver btnRegistrarTorneo para cómo
                   se arma el valor `autor` final.
```

### Línea original 718

```
Aparece solo cuando #tAutorSelect tiene un Nom_Multi real
                   elegido. Al elegir una cuenta del dropdown, su clan se
                   detecta solo (viene resuelto del backend) y queda en
                   data-clan/data-clantag de la opción — ver
                   pintarCuentasOrg() más abajo. btnRegistrarTorneo manda
                   esos 3 datos como tagOrg/clanOrg/clanTagOrg (columnas
                   Tag_org/Clan/ClanTag de T_Lista). Conectado vía
                   webAdminCuentasDeNomMulti — ver cargarCuentasDelAutor()
                   en el <script>.
```

### Línea original 735

```
FIX (09-sep-2026, pedido usuario — selector de semanas;
                   actualizado 11-sep-2026): ver el docblock grande junto a
                   cargarSemanasRecientes()/pintarSemanasSelector() en el
                   <script> para el detalle completo (formato, preselección,
                   y de dónde sale ahora la Temporada/Semana REAL — ya no es
                   un contador de marcador de posición). Al enviar el
                   formulario, obtenerSemanasSeleccionadas() junta lo
                   marcado acá y viaja como campo `semanas` del payload;
                   solo indica qué semanas se deberían
                   evaluar (parámetros de guerra de esas semanas) para
                   decidir si un jugador puede participar en este torneo;
                   esa evaluación real queda PENDIENTE BACKEND.
```

### Línea original 795

```
FIX (09-sep-2026): mismo cuadro de cuenta/clan del
                   organizador que #camposRegistrar (ver el comentario
                   grande de ahí para el detalle completo). Igual que con
                   autor/premios en este panel, se deja OPCIONAL: si no se
                   toca, no se manda tagOrg/clanOrg/clanTagOrg y el backend
                   no debe tocar esas columnas de la fila ya existente.
```

### Línea original 809

```
FIX (09-sep-2026, pedido usuario — selector de semanas;
                   actualizado 11-sep-2026): ver el docblock de
                   #camposRegistrar (arriba) y el docblock grande de
                   cargarSemanasRecientes()/pintarSemanasSelector() en el
                   <script>.
```

### Línea original 828

```
FIX (05-sep-2026, pedido usuario — "Planificar torneo" +
                 premios): ver el docblock grande de más arriba, antes de
                 <details class="admin-subseccion" open>, para el porqué de
                 este camino separado de "Registrar nuevo torneo". Reusa el
                 mismo patrón de #tAutorSelect (id propio -tAutorSelectPlan/
                 tAutorManualPlan- porque conviven en el mismo DOM). El
                 editor de premios vive en #premiosEditor; ver
                 agregarFilaPremio()/armarPremiosCSV() más abajo.
```

### Línea original 870

```
FIX (09-sep-2026): mismo cuadro de cuenta/clan del
                   organizador que #camposRegistrar (ver el comentario
                   grande de ahí para el detalle completo).
```

### Línea original 881

```
FIX (09-sep-2026, pedido usuario — selector de semanas;
                   actualizado 11-sep-2026): ver el docblock de
                   #camposRegistrar (arriba) y el docblock grande de
                   cargarSemanasRecientes()/pintarSemanasSelector() en el
                   <script>.
```

### Línea original 935

```
FIX (10-sep-2026, pedido usuario — "Miembro activo y wsp
                   deben cargarse por defecto como 'Sí' y reacción debe
                   guardarse por defecto como 'No'"): se quitó la opción
                   "Elige…" de los 3 <select> y quedan con `selected` puesto
                   directamente en la opción por defecto (Sí/Sí/No) en vez
                   de arrancar en blanco -- así el admin no tiene que
                   tocarlos si el clan usa los valores usuales, y solo los
                   cambia si de verdad necesita algo distinto.
```

### Línea original 967

```
FIX (10-sep-2026, pedido usuario — "cuando se trata de un
                 torneo de continuación, el sector que pide identificar el
                 torneo principal debe estar justo debajo de donde se pide
                 el link del torneo; luego ya viene lo demás (fecha, autor,
                 etc.)"): #camposTorneoPrincipal sigue siendo un único nodo
                 compartido (no triplicado por rama, mismo criterio que
                 #requisitosTorneoBox de arriba), así que se reubica con
                 JavaScript en vez de triplicarse. Vive acá abajo como
                 posición de origen; mostrarPaso3() (ver initTorneoWizard()
                 en el <script>) lo mueve con insertBefore() justo antes de
                 la fila de fecha/hora de la rama activa
                 (#filaFechaHoraReg/Mod/Plan) cada vez que se entra al paso 3
                 y #torneoTipo es "continuación" -- es decir, después del
                 campo que identifica el torneo en cada rama (Link en
                 Registrar, el <select> "Torneo" en Modificar; Planificar no
                 tiene un campo identificador propio así que ahí queda de
                 primero) y antes de fecha/hora/autor/premios/etc.
```

### Línea original 1012

```
NUEVO (13-sep-2026, pedido del usuario -- "fase nueva y
                 chica" que la propia Fase 0 del plan de corrección
                 Torneo/Sorteo dejaba anotada para más adelante): gemelo
                 EXACTO del control "Torneo vigente" de más arriba (mismo
                 patrón, ver ese comentario grande para el detalle
                 completo), apuntando a Extra!Sorteo_Vigente_ID en vez de
                 Torneo_Vigente_ID.
```

### Línea original 1063

```
Paso 3 de Sorteos: mismos 3 contenedores que Torneos
                   (#camposRegistrar/#camposModificar/#camposPlanificar),
                   mostrados/ocultados por mostrarPaso3Sorteo() (ver
                   <script>) con la misma lógica que mostrarPaso3() de
                   Torneos -- combinación de #sorteoAccion (Paso 1) y
                   #sorteoTipo (Paso 2). Panel completo desde 12-sep-2026
                   (consolidado sección 5.4): los 3 formularios, los 3
                   listeners de acción, requisitos por clan y el selector
                   real de "¿cuál es el sorteo principal?" ya están
                   conectados de punta a punta a sus endpoints.
```

### Línea original 1073

```
"Registrar sorteo": mismo patrón que #camposRegistrar de
                   Torneos, prefijo "s" en vez de "t" -- fecha/hora amigable
                   + autor + cuenta organizadora. A diferencia de Torneos,
                   NO lleva selector de semanas (Sorteos no evalúa
                   parámetros de guerra por semana) ni editor de premios en
                   Registrar (los premios de un sorteo ya en curso no se
                   tocan al solo registrarlo — igual que Torneos, donde
                   #premiosEditor vive únicamente en Planificar/Modificar).
                   Tampoco lleva campo de link (CONFIRMADO por el usuario,
                   12-sep-2026: Sorteos no tiene ese concepto — #sLink se
                   eliminó del HTML).
```

### Línea original 1085

```
NUEVO (16-sep-2026, pedido usuario -- ver el docblock
                     grande junto a #btnPrecargarUltimoTorneo en
                     #camposRegistrar, arriba: mismo botón, ahora para el
                     último SORTEO ya registrado en S_Lista. Trae
                     Organizador/Cuenta organizadora y Comentario; no toca
                     Fecha/Hora ni #semanasSelectorSorteoReg (cada sorteo
                     elige sus propias semanas). Ver
                     precargarUltimoRegistroSorteo() en el <script>, gemela
                     de precargarUltimoRegistroTorneo() reutilizando
                     aplicarAutorYCuentaPrecargados() con prefijo 's'.
                     PENDIENTE BACKEND: mismo trío pendiente que en
                     Torneos (`_getUltimoRegistroTorneoOSorteo`,
                     `_webAdminUltimoRegistroTorneoOSorteo`,
                     `webAdminUltimoRegistro` en doGet), esta vez llamado
                     con categoria:'Sorteo'.
```

### Línea original 1143

```
El consolidado (sección 5.4) llegó a registrar que
                     Sorteos NO debía tener selector de semanas porque
                     S_Lista no tenía columna "Semanas" como T_Lista -- eso
                     se corrigió el mismo día (el usuario aclaró que sí lo
                     necesita, para indicar sobre qué semanas evaluar Min_S
                     — trofeos de guerra/ataques por semana, ver
                     #requisitosSorteoBox más abajo). La columna SL.SEMANAS
                     se agregó (_setupSLista(), 03_Setup_Hojas.gs) y este
                     selector la alimenta vía obtenerSemanasSeleccionadas()
                     (ver <script>), reutilizando TAL CUAL
                     cargarSemanasRecientes()/pintarSemanasSelector() (ya
                     construidas para Torneos) con un contenedor propio de
                     Sorteos, sin duplicar esa lógica.
```

### Línea original 1163

```
"Modificar sorteo": #sSelectHoy se puebla con
                     cargarSorteosHoy() (ver <script>), mismo patrón que
                     #tSelectHoy de Torneos. Sin opción "Ingresar link" (a
                     diferencia de Torneos): Sorteos no tiene ese concepto
                     (CONFIRMADO por el usuario, 12-sep-2026 — #sModificarLink
                     se eliminó del HTML).
```

### Línea original 1197

```
Mismo patrón que #tAutorSelectMod: "Sin cambios" en
                     vez de "Lo organicé yo" porque acá se edita un sorteo
                     que puede ya tener autor cargado. Pendiente, mismo
                     estado que Torneos: la etiqueta "Sin cambios (Nombre)"
                     con el autor real requiere que #sSelectHoy ya venga
                     poblado (ver PENDIENTE BACKEND arriba).
```

### Línea original 1220

```
FIX (10-sep-2026): editor de premios de "Modificar
                     sorteo", equivalente a #premiosEditorMod de Torneos.
                     Reutiliza TAL CUAL agregarFilaPremio()/
                     poblarPremiosEditor()/armarPremiosCSV() (ver <script>,
                     ya construidas y parametrizadas por containerId) con
                     contenedor propio de Sorteos -- sin duplicar esa
                     lógica, mismo criterio que el resto de este panel.

                     RESUELTO (12-sep-2026): el listener de 'change' de
                     #sSelectHoy (ver <script>) ya puebla este editor con
                     los premios YA registrados del sorteo elegido (mismo
                     patrón que #premiosEditorMod de Torneos), reemplazando
                     las 3 filas en blanco que mostrarPaso3Sorteo() pinta
                     por defecto al entrar a esta rama.
```

### Línea original 1250

```
FIX (10-sep-2026, sección 5.4 del consolidado, mismo
                     patrón que #camposPlanificar de Torneos): fecha/hora +
                     autor + cuenta organizadora + premios. A diferencia de
                     Registrar/Modificar, Planificar no tiene un campo
                     identificador propio (ni link ni selector de "sorteo
                     de hoy"), así que la fecha/hora queda de primera, igual
                     que en Torneos.
```

### Línea original 1298

```
FIX (10-sep-2026, mismo pedido que en Registrar/Modificar
                     sorteo): selector de semanas real, ya funcional.
                     Mismo patrón que Torneos (#semanasSelectorPlan).
```

### Línea original 1307

```
FIX (10-sep-2026): editor de premios de "Planificar
                     sorteo", equivalente a #premiosEditor de Torneos.
                     Mismo mecanismo que el de Modificar sorteo (ver
                     #premiosEditorSorteoMod más arriba): reutiliza TAL
                     CUAL agregarFilaPremio()/poblarPremiosEditor()/
                     armarPremiosCSV(), sin duplicar lógica. Se puebla con
                     3 filas en blanco desde mostrarPaso3Sorteo() (ver
                     <script>), igual que #premiosEditor de Torneos.
```

### Línea original 1393

```
Equivalente a #camposTorneoPrincipal, pero resuelto por ID
                   en vez de por Tag (ver corrección ya registrada en la
                   sección 5.4 del consolidado): Sorteos no tiene concepto de
                   Tag_Tor -- webAdminSorteosHoy ya identifica cada sorteo
                   por su ID real (columna A de S_Lista), así que
                   renderSorteoPrincipalLista() (ver <script>) arma la lista
                   directo desde ESE id, sin el paso intermedio de "¿ya tiene
                   Tag asignado?" que sí necesita Torneos.
```

### Línea original 1407

```
Cuadro de Comentario, mismo criterio que
                   #comentarioTorneoBox de Torneos -- UN SOLO nodo
                   compartido entre las 3 ramas, sin necesidad de
                   reubicarlo con JS porque el lugar pedido ("justo antes
                   del botón final") ya se cumple quieto acá, dado que solo
                   uno de los 3 botones de abajo está visible a la vez.
                   Los 3 listeners (más abajo en el <script>) ya lo leen y
                   lo suman a su payload como `comentario`; mismo criterio
                   de sobrescritura que Torneos (reemplaza siempre al
                   Comentario anterior, sin lógica especial).
```

### Línea original 1424

```
Los 3 botones de acción de Sorteos, mismo patrón que
                   btnRegistrarTorneo/btnModificarTorneo/btnPlanificarTorneo
                   -- mostrarPaso3Sorteo() (ver <script>) se encarga de
                   mostrar/ocultar cada uno según la rama activa, igual que
                   mostrarPaso3() hace con los de Torneos.
```

### Línea original 1440

```
NUEVO (13-sep-2026, pedido del usuario -- Fase 7 del plan de
               Cambio de Rango, PASO 1): panel del tercer tab, mismo patrón
               que #panelTorneosAccion/#panelSorteosAccion (oculto por
               defecto, el switcher de más abajo en el <script> lo
               muestra/oculta junto con los otros dos). Placeholder por
               ahora -- el contenido real (listado de pares vía
               _webCRListaListar, formulario de alta/edición vía
               _webCRListaGuardar, tabla de propuestas vía
               _webCRListaPropuestas/_webCRListaGenerarPropuestas) se agrega
               en los próximos pasos, uno por uno, siguiendo el mismo plan
               consolidado.
```

### Línea original 1453

```
PASO 2 de la implementación del frontend (13-sep-2026,
                 pedido del usuario -- Fase 7 del plan de Cambio de Rango):
                 mismo patrón EXACTO que #torneoPaso1/#torneoPaso2
                 (torneoAccion/btnTorneoPaso1) -- ver esos bloques más
                 arriba para el criterio general del wizard por pasos.
                 Acá solo hay 2 opciones (no hace falta un tercer paso de
                 "tipo" como Torneos): Registrar (corrida nueva, sin nada
                 que precargar) o Editar (corrida existente, requiere
                 elegir CUÁL antes de poder mostrar el formulario). El
                 formulario real de campos (Fecha/Hora/Semanas/Organizador
                 + Min_CR/Ataques por Clan y Rol) es un paso siguiente,
                 todavía no existe -- ver #crPaso2Msg más abajo.
```

### Línea original 1472

```
NUEVO (16-sep-2026, pedido del usuario -- "haz que las
                       propuestas aparezcan dentro del selector de cambio de
                       rango, junto a registrar y editar corrida"): tercera
                       opción del wizard. Reusa el mismo #crSelectPar que ya
                       usa "Editar corrida existente" (ver btnCrPaso1 y el
                       listener de #crSelectPar más abajo en el <script>),
                       pero en vez de precargar el formulario completo
                       (Fecha/Hora/Semanas/grillas) solo muestra directo la
                       tabla de propuestas -- ver seleccionarCorridaParaVerPropuestas().
```

### Línea original 1490

```
Solo se muestra en modo "modificar" -- cargarCRListaPares()
                   (ver <script>) puebla #crSelectPar llamando a
                   _webCRListaListar() (34_Web_API.gs), mismo patrón que
                   cargarTorneosHoy()/cargarSorteosHoy() pueblan
                   #tSelectHoy/#sSelectHoy. El valor de cada <option> es el
                   idAscenso del par (alcanza para derivar el idDescenso
                   hermano en el backend, ver _getParCRListaPorId()).
```

### Línea original 1515

```
FIX (13-sep-2026, pedido usuario -- "en el formulario de
                     cambio de rango se debe cambiar el formato de fecha y
                     hora, debe mostrarse como sale en torneos"): mismo
                     patrón campo-fecha-wrap/campo-hora-wrap que
                     #tFechaTexto/#tHoraHH+#tHoraMM (Torneos) -- #crFecha/
                     #crHora siguen siendo la fuente real (ISO/24h) que ya
                     lee btnCrGuardar y precarga precargarFormularioCR(),
                     solo cambia cómo se ven. Ver initCampoFechaAmigable(
                     'crFecha', 'crFechaTexto', 'btnCalendarioCR') e
                     initCampoHoraAmigable('crHora', 'crHoraHH', 'crHoraMM',
                     'crHoraAmPm') más abajo en el <script>.
```

### Línea original 1550

```
FIX (13-sep-2026, pedido usuario -- "en la sección de
                     semanas a evaluar debe haber un selector de temporada y
                     a la derecha checkboxes con las semanas que tenga esa
                     temporada, también un botón para añadir otra
                     temporada"): reemplaza el <input type="text"> libre
                     ("T4_S1,T4_S2") de antes por bloques armados en JS --
                     ver agregarBloqueTemporadaCR()/obtenerSemanasCR() junto
                     a mapaTemporadasCR() en el <script>. El string
                     final que viaja a _webCRListaGuardar() sigue siendo
                     EXACTAMENTE el mismo formato "T{temporada}_S{semana},..."
                     de siempre -- armado ahora a partir de los checkboxes
                     marcados en vez de tipeado a mano.
```

### Línea original 1570

```
FIX (13-sep-2026, pedido usuario -- "el organizador debe
                     ser dropdown con los Nom_Multi de los admin, no debe
                     mostrarse el texto 'Nom_Multi', los usuarios finales no
                     saben qué es eso"): mismo patrón que #tAutorSelect
                     (Torneos) -- se puebla desde cargarNomMultisAdmins() con
                     los mismos Nom_Multi, sin exponer esa palabra en
                     ninguna etiqueta visible. "Ninguna de las anteriores"
                     revela #crOrganizadorManual para escribirlo a mano (por
                     si quien organizó no es un admin).
```

### Línea original 1592

```
PASO 4: una tabla por Tipo -- filas = clanes de la
                     Familia, columnas = Trofeos/Ataques por cada Rol
                     (Miembro/Veterano/Colíder). pintarGridCR() arma las
                     filas en JS apenas se conocen los clanes; 0 (o vacío) =
                     sin requisito activo para ese clan/rol, mismo criterio
                     que _getFilaCRListaPorId()/_construirFilaCRLista()
                     (34_Web_API.gs / 24_Torneos_Core.gs).

                     FIX (14-sep-2026, pedido usuario):
                       1) "Min CR" no se le muestra al usuario (no sabe qué
                          es) -- se renombra a "Trofeos" en encabezados y
                          textos. El backend sigue hablando de Min_CR/minCR
                          puertas adentro, esto es solo de cara al admin.
                       2) Ascenso/Descenso en <details> colapsables, uno al
                          lado del otro, hacían parecer el segundo bloque
                          "opcional" -- ahora son bloques fijos (no
                          colapsables, ver .cr-requisitos-bloque en el
                          <style>) y Descenso arranca oculto: recién
                          aparece al apretar "Continuar" al final de
                          Ascenso. Ver #crRequisitosAscenso/
                          #crRequisitosDescenso acá y
                          mostrarRequisitosAscensoCR()/
                          mostrarRequisitosDescensoCR() en el <script>.
```

### Línea original 1669

```
FIX (14-sep-2026, pedido usuario -- "al terminar de
                         llenar los requisitos de ascenso debes poner un
                         botón Continuar, ahí ocultas los valores de
                         ascensos y recién muestras el panel de descensos"):
                         ver mostrarRequisitosDescensoCR() en el <script>.
```

### Línea original 1744

```
FIX (16-sep-2026, pedido usuario -- aclarar la
                         diferencia entre los dos botones, que quedaba
                         perdida en un párrafo largo): dos líneas cortas en
                         vez de un párrafo, una por botón, mismo texto de
                         fondo que ya explicaba _webCRListaPropuestas/
                         _webCRListaGenerarPropuestas (34_Web_API.gs) pero
                         más fácil de escanear de un vistazo.
```

### Línea original 1762

```
Texto varía según el modo -- ver actualizarTextoPropuestasSinGuardar()
                       en el <script>: en Registrar/Editar pide guardar la
                       corrida primero; en "Ver propuestas" pide elegir una
                       corrida arriba (no hay nada que guardar en ese modo).
```

### Línea original 1782

```
FASE 24 (02-sep-2026, pedido del usuario — descalificaciones y
               desempates de torneos): formulario chico para registrar una
               resolución manual sobre una cuenta puntual del torneo cargado
               arriba. Se abre desde el botón "Gestionar" de cada participante
               (ver abrirResolucionForm() más abajo) y llama a
               webAdminTorneoResolucionGuardar → _registrarResolucionTorneo()
               (24_Torneos_Core.gs). Oculto hasta que se pulsa "Gestionar".
```

### Línea original 1797

```
FASE (15-sep-2026, pedido del usuario — "cuentas
                     prestadas en torneos"): tipo nuevo que NO castiga ni
                     mueve el puesto; solo deja constancia de que la cuenta
                     estaba prestada y de a quién se le entrega el premio.
                     Se pre-selecciona automáticamente desde el bloque
                     "¿Quién jugó con esta cuenta?" de cada fila de
                     #ganadoresLista (ver filaParticipanteResolucion() y
                     PRESTAMO_TIPO_RESOLUCION más abajo); también queda
                     disponible a mano por si hay que corregirlo después.
                     No tiene dropdown de Motivo propio (no está en
                     TIPO_A_DROPDOWN_MOTIVO) porque el motivo se arma solo
                     con el Nom_Multi de quien jugó — cae en el #resMotivo
                     de texto libre, editable antes de guardar.
```

### Línea original 1829

```
FASE (13-sep-2026, pedido del usuario -- consolidado punto 2
                 "dropdown de Motivo en Torneos", cierre de Empate que había
                 quedado sin decidir): mismo patrón que
                 #resMotivoDescalificadoWrap de arriba, uno por cada variante
                 de Empate -- ver actualizarVisibilidadMotivoResolucion() más
                 abajo en el <script> para el criterio de cuál se muestra.
```

### Línea original 1867

```
Fase 5 (28-ago-2026): herramienta standalone incorporada al portal
           admin — no tiene backend propio ni datos que pedir acá, solo
           necesita quedar oculta para no-admins. Se abre en pestaña nueva
           (sin rel="noopener") para que sorteo.html herede el
           sessionStorage de esta pestaña y pueda validar la sesión al
           cargar.
```

### Línea original 1881

```
FASE 7 (Parte B, 06-sep-2026, punto 7 del documento — edición de
           autor de ascenso): antes, el campo "Autor" de un registro de
           Historial_A/D (hoja Ascensos, ver 14_Directorio_HistorialAscensos.gs)
           solo se podía corregir a mano directo en Sheets. Este panel
           lista los últimos registros (ascensos Y degradaciones, con su
           Autor actual) vía webAdminAscensosEditables y permite editar el
           Autor de uno puntual vía webAdminEditarAutorAscenso — que
           además concatena en el Comentario de ESE registro quién hizo el
           cambio y de qué autor a qué autor (ver docblock de
           _webAdminEditarAutorAscenso(), 14_Directorio_HistorialAscensos.gs,
           para la decisión de alcance completa). No depende de ninguna
           "Función" de admin dedicada todavía (misma decisión documentada
           ahí) — cualquier admin logueado puede usarlo.
           FIX (08-sep-2026, pedido usuario — "Editar autor de ascenso debe
           ir al final de su sección"): reubicado como última subsección
           del contenedor "Torneos y sorteos", después de la Ruleta de
           sorteos.
```

### Línea original 2625

```
FIX (16-sep-2026, pedido usuario): clan/nombre/tag-rango/vigencia
                 ahora centrados (text-align:center), pero las 3 filas de
                 Copas/V.Guerra/Torneos deben seguir alineadas ENTRE SÍ a la
                 izquierda (icono+número a la izquierda, barra a la derecha) -- solo
                 el BLOQUE completo de las 3 filas se centra como una unidad dentro
                 de la tarjeta, sin tocar la barra en sí (sigue igual que antes).
                 El contenedor de las 3 filas pasa de ancho completo a
                 "width:fit-content" + "margin:9px auto 0" para que sus márgenes
                 izquierdo/derecho queden iguales y el bloque quede centrado, sin
                 perder la alineación interna izquierda de cada fila.
```

### Línea original 2845

```
FIX (03-sep-2026, pedido usuario, punto 19 — "agregar un
               botón de descarga en PDF junto al de copiar"): "Ver
               original" (arriba) abre el Doc EN el panel (iframe/visor);
               este es un botón nuevo, aparte, que descarga el PDF al
               dispositivo del admin. Mismo criterio de visibilidad que
               btn-ver-pdf (solo si la opción tiene o.docId).
```

