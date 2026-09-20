# Changelog — Familia Terna (frontend)

Historial de cambios y el porqué de cada decisión de diseño, extraído de los
comentarios inline de cada página para que el código quede más liviano y
fácil de leer. Organizado por archivo; dentro de cada archivo, de más
reciente a más antiguo.

En el propio archivo `.html` se deja solo una nota funcional corta (qué hace
el código hoy) cuando hace falta para mantenerlo; el "por qué histórico"
(fecha, pedido puntual del usuario, alternativas descartadas) vive acá.

---

## CI y herramientas (raíz del repo: `.github/`, `package.json`, `.htmlvalidate.js`)

### 19-sep-2026 — B-15 completo: CI en Node 22, Lighthouse semanal, `type="button"` y Dependabot
El job de CI fallaba en `npm run validate-html` con un error dentro de
`expandFiles()` de html-validate. Causa: desde html-validate 11.1.0 el CLI
usa `fs.globSync` nativo de Node (existe desde Node 22) en lugar del paquete
`glob`, y `ci.yml` corría en Node 20. Se sube a Node 22, `package.json`
declara `"engines": {"node": ">=22.16"}` y las Actions (`checkout`,
`setup-node`, `lighthouse-ci-action`) quedan fijadas por commit SHA con
`permissions: contents: read`. El glob `*.html` no era el problema.

Pendientes que quedaban de B-15, resueltos en la misma tanda:
- **Lighthouse**: workflow aparte (`lighthouse.yml`, lunes 13:00 UTC y
  `workflow_dispatch`) sobre `https://grupoterna.github.io/Web/`, no en
  `ci.yml`, porque necesita el sitio ya publicado. Umbrales en
  `lighthouserc.json` como `warn` (Rendimiento 0.7; Accesibilidad, Buenas
  prácticas y SEO 0.9) hasta tener línea base.
- **34 `<button>` sin `type`**: agregado `type="button"` en las 9 páginas
  (`admin` 14, `sorteo` 11, `directorio` 3, y 1 en `404`, `comunidad`,
  `guerra`, `index`, `perfil` y `torneos`). No hay ningún `<form>` en el
  sitio, así que no cambia el comportamiento. `no-implicit-button-type`
  salió de `.htmlvalidate.js` y vuelve a error, para que un botón nuevo sin
  `type` rompa el CI.
- **Dependabot**: `.github/dependabot.yml`, revisión semanal de `npm` y de
  `github-actions`, PRs agrupados por menores/parches.

---

## Rendimiento (Lighthouse)

### 19-sep-2026 — Peticiones duplicadas en torneos y reserva de alto en guerra
Primera corrida de `lighthouse.yml` (móvil simulado): `guerra.html` y
`torneos.html` sacaron 0.66-0.67 en Rendimiento (mínimo 0.7, en `warn`).
Ver detalle y pendientes en `Plan_Fases.md` › B5.5.
- **`torneos.html`**: `cargarTorneos()` y `cargarSalonDeLaFama()` se
  disparaban a la vez y ambas pedían `webTorneos` y `webHistorialTorneos`;
  como `apiGet` no comparte peticiones en curso, se hacían 4 llamadas y la
  cola las procesaba de a una (~40 s en el laboratorio en vez de ~20 s).
  Nuevo `apiGetTorneosCompartido(accion)`: reutiliza la petición en vuelo y
  la descarta al terminar, así un reintento posterior sí vuelve a pedir.
  El manejo de errores de cada función quedó igual (`historial` sigue
  siendo opcional en `cargarTorneos`).
- **`guerra.html`**: `#status:not(.err){min-height:80vh}`. Mientras llegaba
  `webGuerraEnVivo` (28-39 s en el laboratorio) el `footer` estaba a la
  vista junto al "Conectando…" y saltaba al aparecer el contenido
  (CLS 0.141). El estado de error no reserva alto.

---

## SEO (sitemap y datos estructurados)

### 19-sep-2026 — JSON-LD en directorio, guerra y torneos; `lastmod` del sitemap (B-23)
`index.html` ya tenía JSON-LD de `Organization`. Se agrega a `directorio.html`,
`guerra.html` y `torneos.html` un bloque `WebPage` con `breadcrumb`
(`BreadcrumbList`: Inicio › página) e `isPartOf` hacia el `WebSite`, con
`name`/`url`/`description` iguales al `<title>`, al canonical y a la meta
description de cada página. No se repite la `Organization` (vive solo en
`index.html`) y `comunidad.html` se deja fuera a propósito (prioridad baja).
En `sitemap.xml` el `lastmod` de las 5 URLs pasa a 2026-09-19; hay que
actualizarlo a mano cuando cambie una página pública.

---

## CSS compartido (assets/styles.css)

### 19-sep-2026 — Fase 3, sub-lote 2: un duplicado muerto menos y tres que se dejan a propósito
- **`perfil.html`**: se quita `.field textarea` (la base). Era idéntica
  carácter por carácter a la de `styles.css` y la nota de al lado ya
  declaraba muertas las demás copias (`:focus`, `.vetar-form`,
  `.vetar-form-titulo`); esa se había quedado sin quitar en el séptimo lote.
  Entre la copia de `styles.css` y la de la página no hay ninguna regla de la
  misma especificidad con propiedades en común que pueda tocar un
  `<textarea>`, así que el efecto es nulo.
- **Se dejan donde están, a propósito** (ya estaba decidido en notas previas;
  se revalidó):
  - `.perfil-cabecera .stats-mini b` (directorio + perfil): `admin.html`
    tiene una variante distinta (15px, sin `font-family`); centralizar la de
    directorio+perfil filtraría el `font-family` hacia admin.
  - `.linechart-svg .grid-line` (directorio + index): copia adaptada a
    propósito para otro gráfico (nota en `styles.css`).
  - `*` y `html,body` de `sorteo.html`: **no son duplicados**. Esa página no
    carga `styles.css` (solo su propio `<style>` y Google Fonts), así que
    esas reglas son su única base. Borrarlas le quitaría el
    `box-sizing:border-box`.

### 19-sep-2026 — Fase 3, sub-lote 1: 15 reglas de `admin.html` y `mensajes.html` pasan a `styles.css`
Al migrar la sección Mensajes a su propia página, `mensajes.html` copió tal
cual varias reglas del `<style>` de `admin.html`, y su nota de cabecera dejó
esa consolidación como pendiente. Se comprobó que 15 reglas eran idénticas
carácter por carácter en ambas páginas y que ninguna otra página ni
`styles.css` usa esas clases: `.contenido-item` (+ `.cab`, `.etiqueta`,
`.clan-chip`), `.contenido-tabs`, `.tab-clan` (+ `:hover`, `.activo`),
`.admin-grupo > .eyebrow` y `.admin-subseccion` (+ `> summary`, su marcador
`::-webkit-details-marker`, `::before`, `[open]::before` y `.cat-titulo`).
Se borraron de las dos páginas y viven en un bloque nuevo al **final** de
`styles.css` (mismo orden relativo frente al resto de `styles.css` que
tenían dentro del `<style>` de cada página).
- **No se movió `.admin-subseccion-body{padding:2px 2px 14px}`**, a
  propósito. En `mensajes.html` esos mismos elementos llevan también
  `.categoria-contenido-body` (`padding:0 2px 14px 26px`), definida antes en
  esa página; hoy gana `.admin-subseccion-body` solo por ir después. En
  `styles.css` iría antes y ganaría el otro `padding`. Verificado con un
  control negativo: moverla sí invierte el ganador.
- Verificación: el conjunto de reglas efectivas (`styles.css` + `<style>`
  de la página) es el mismo antes y después en ambas páginas, y ninguna
  regla que pudiera afectar al mismo elemento con igual especificidad y
  propiedades en común cambió de orden. `html-validate`, `check-links` y
  `eslint` siguen en verde. No se probó en un navegador real.
- Efecto en líneas: `<style>` de `admin.html` 229 → 202, de `mensajes.html`
  113 → 82; `styles.css` 880 → 924.
- Al publicar: `sw.js` sirve `styles.css` desde caché primero
  (stale-while-revalidate), así que la primera visita a `admin.html` o
  `mensajes.html` tras el deploy puede verse sin estos estilos hasta
  recargar una vez.

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

## permisos.html

### 19-sep-2026 — Accesibilidad de la lista de permisos
Con decenas de casillas repetidas por administrador, un lector de pantalla
solo oía "Vetar, casilla" sin saber de quién.
- Cada tarjeta es `role="group"` con `aria-labelledby` al nombre del admin
  (un `<span>` propio, para que no salga "AnaTú" por el distintivo); cada
  sección (Funciones, Clanes, Categorías) es otro grupo con su título.
  Los ids se sanean porque `a.id` viene del backend.
- Los 3 pares de botones "Marcar/Desmarcar todo" y "Guardar" llevan
  `aria-label` con el nombre del admin y la sección; durante el guardado el
  `aria-label` pasa a "Guardando permisos…" y se restaura al terminar.
- El mensaje de resultado de cada tarjeta es `role="status"` (existe vacío
  desde el pintado, requisito para que se anuncie). `#permisosLista` no es
  región viva a propósito: se repinta con cada tecla del buscador.
- El buscador y "Recargar" tienen nombre accesible propio (el placeholder no
  es etiqueta). Sin cambios visuales.

### 19-sep-2026 — Casillas de "Clanes donde puede tomar decisiones" (Clanes_Admin)
La página solo tenía casillas de Funciones y de Categorías (Cat_disp); los
clanes en los que cada administrador puede decidir se mostraban como una
línea de texto sin poder editarse. Ahora hay una tercera sección con una
casilla por clan (+ "Marcar/Desmarcar todo"), entre Funciones y Categorías.
- **Catálogo**: si el backend manda `clanes` en `webPermisosListar`
  (texto o `{id|nombre, etiqueta}`), manda ese y conserva su orden. Mientras
  no lo mande se arma con los valores que ya figuran en el Clanes_Admin de
  algún administrador, tal cual están guardados (para no inventar un formato
  distinto al de la hoja), ordenados con `ordenarClanes()`; en ese modo la
  sección lo aclara. Se calcula una vez por carga, no en cada filtro.
- **Guardado**: `datos.clanesAdmin` (arreglo) solo se envía si la sección se
  pintó y la selección cambió. Guardar solo funciones o categorías nunca
  toca los clanes de nadie. Desmarcar todo envía `[]` (explícito).
- **Confirmación**: si se envió un cambio de clanes y el servidor no lo
  devuelve en `resp.clanesAdmin`, no se muestra "Guardado": se avisa que las
  funciones y categorías sí se guardaron pero los clanes no se confirmaron, y
  la copia local queda como estaba.
- **Valores fuera del catálogo** (p. ej. un clan que cambió de nombre) se
  muestran marcados y con aviso, para que un "Guardar" no los borre en
  silencio.
- Pendiente en el backend (`Base.md` no estaba subido al hacer esto): que
  `_webPermisosListar` devuelva el catálogo `clanes` y `_webPermisosGuardar`
  acepte y devuelva `clanesAdmin`. Formato asumido de Clanes_Admin: nombres
  de clan separados por coma; sin verificar.

### 19-sep-2026 — Se quita el `.btn-icono` duplicado del `<style>`
La nota del propio archivo decía que la versión local de `.btn-icono` se
descartaba a favor de la de `styles.css`, pero la regla seguía escrita y,
al cargar después, pisaba la compartida. Se borró. Los botones "Recargar" y
"Marcar/Desmarcar todo" ahora lucen como los de `admin.html`/`mensajes.html`
(fondo de superficie, sin mayúsculas). `permisos.html` ya no repite ningún
selector de `styles.css` ni de otra página.

---

## mensajes.html

### 19-sep-2026 — Accesibilidad: nombres de botones y estado de los selectores
Primera revisión de accesibilidad de la página (no la cubría ninguna
auditoría anterior).
- **10 botones "↻"** dentro de los `<summary>`: su nombre accesible salía del
  contenido ("↻"), no del `title`, y no decía de qué categoría. Ahora
  `aria-label="Actualizar contenido: <categoría>"` (único por botón).
- **Botones de categoría** (Guerra/Entrenamiento/Mazos, Participantes/
  Ganadores ×2) y **botones de opción por clan** (los que arma
  `renderContenidoHtml`): el estado activo solo lo daba la clase `.activo`.
  Ahora llevan `aria-pressed` que acompaña a `.activo` en los 3 sitios donde
  cambia (clic en el toggle, clic en la pestaña dinámica y el reajuste de
  `initMensajesAutomaticos()` cuando el botón activo está oculto por permisos;
  este último se detectó al probar y quedaba desfasado). Los grupos de
  botones son `role="group"` con etiqueta.
- **Se retira `role="tablist"`/`role="tab"`/`aria-selected`** de las pestañas
  dinámicas: el patrón estaba a medias (sin flechas de teclado, sin
  `tabpanel` ni `aria-controls`), así que anunciaba "pestaña" prometiendo un
  teclado que no existe. Son botones normales con `aria-pressed`, operables
  con Tab/Enter.
- **Botón colapsar (▾/▸)**: `aria-label` que alterna "Colapsar texto" /
  "Expandir texto" junto con `title` y `aria-expanded`.
- No se tocó (queda como límite conocido): el salto de `h1` a `h3` en los
  títulos de grupo, los botones dentro de `<summary>` (contenido interactivo
  anidado) y que "✔ Copiado" no se anuncia.

### 19-sep-2026 — La sección "Mensajes" sale de `admin.html` y pasa a su propia página
Pedido del usuario: "migra la sección de mensajes a su propio botón entre
comunidad y 'acceder' o 'mi panel'". Decisiones tomadas con el usuario antes
de tocar código:
- **Página nueva propia** (`mensajes.html`), no una pestaña dentro de admin.
- **Solo admin**: el link del nav nace oculto (`style="display:none"`) en las
  8 páginas con nav (`index`, `comunidad`, `directorio`, `guerra`, `torneos`,
  `perfil`, `admin`, `404`) y `actualizarNavCta()` (`assets/js/core/auth.js`)
  lo muestra solo con `terna_admin_token`. `sorteo.html` no tiene nav, no
  cambia. Si alguien entra por URL sin sesión, `mensajes.html` no pinta nada
  y hace `location.replace('admin.html')`, que muestra el login. Lo mismo si
  el token venció (`manejarRespuestaAuth()` de la página nueva). La redirección
  va a `admin.html?volver=mensajes`: tras iniciar sesión, `btnLogin` de
  `admin.html` regresa a `mensajes.html` en vez de quedarse en el panel
  (comparación exacta con `'mensajes'`; el parámetro nunca se usa como URL, y
  una primera versión con un objeto de destinos aceptaba claves heredadas como
  `?volver=constructor`). Además `mensajes.html` se cierra sola si otra
  pestaña cierra sesión (evento `storage`) o si se vuelve con "Atrás" a una
  copia restaurada desde caché del navegador (`pageshow`). El backend
  (`webAdminContenido`/`webAdminCategorias`) sigue exigiendo el token en cada
  petición: ocultar el link es solo UX.
- **Cerrar sesión instantáneo** (19-sep-2026, "no me deja cerrar sesión"):
  el botón esperaba `await apiPost('webAuthLogout')` antes de borrar el token,
  pero `api.js` manda las peticiones en serie (`_MAX_PETICIONES_SIMULTANEAS = 1`)
  y `fetch` no tiene tiempo límite (hasta 5 reintentos), así que el aviso de
  logout quedaba detrás de todas las peticiones pendientes del panel y la
  pantalla no cambiaba. Nuevo `cerrarSesionAdmin()` en `auth.js`: borra el
  token en el acto y manda `webAuthLogout` SIN esperarlo (devuelve la promesa,
  que nunca rechaza). `admin.html` no la espera; `mensajes.html` la espera
  hasta 3 s antes de ir a `admin.html` (sin `?volver=`), para que la
  navegación no corte el aviso. En admin, la bandera `cerrandoSesion` evita
  que respuestas aún en vuelo muestren un error de "sesión" sobre el login.
  Afectaba también a `admin.html` desde antes de esta migración.
  Una primera versión mandaba el aviso con un `fetch` propio `keepalive` FUERA
  de la cola de `api.js`; se descartó porque rompe la garantía de
  `_encolarPeticion()` (Apps Script nunca recibe 2 peticiones a la vez) y un
  login inmediato podía coincidir con el logout en curso.
- **Login con indicador de carga** (19-sep-2026, "no hay mensaje de que esté
  cargando ni nada"): `btnLogin` ahora se bloquea, muestra "Ingresando…" y
  "Conectando con el servidor…", y a los 6 s avisa que el servidor tarda. El
  silencio venía de que el login nunca tuvo feedback y, con la cola en serie
  y hasta 5 reintentos silenciosos (~12 s si Apps Script devuelve algo que no
  es JSON), la espera podía ser larga sin señal alguna.
- **Se elimina de `admin.html`** (no queda respaldo duplicado): la tarjeta
  HTML, la llamada `initMensajesAutomaticos()` de `mostrarPanel()` y las 6
  funciones (`initMensajesAutomaticos`, `cargarGrupoToggle`,
  `cargarContenidoCategoria`, `renderContenidoHtml`, `_pintarOpcionContenido`,
  `_activarAccionesContenido`), movidas tal cual a `mensajes.html`.

CSS: en `admin.html` se quitaron solo las reglas que ya nadie usa allá
(`.btn-refrescar-categoria`, `.categoria-contenido-body`, `.admin-toggle-*`,
`.contenido-caja`, `.contenido-acciones`, `.contenido-item pre`, el visor de
Doc original `.contenido-pdf-wrap`/`.doc-original*`/`.viendo-original`, y
`.contenido-item .cab-info`/`.btn-icono.copiado`). Se conservan `.contenido-item`,
`.cab`, `.etiqueta`, `.clan-chip`, `.contenido-tabs`, `.tab-clan`, `.btn-icono`,
`.admin-subseccion*`, `.admin-grupo` y `.cat-titulo` porque Torneos, Sorteos,
Cambio de rango y Ganadores las siguen usando; en `mensajes.html` se
duplican (copia, no movimiento).

`robots.txt`: se agrega `Disallow: /mensajes.html` junto a `admin.html` y
`sorteo.html`. `sw.js` y `sitemap.xml` no cambian: igual que `admin.html`, es
una página interna `noindex` que no se precachea.

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


## perfil.html — historial trasladado

### Línea original 18 (HTML)

```
PERFIL.HTML (31-ago-2026, pedido usuario)
  "Cuando abro el perfil de un jugador, no basta con cambiar el link,
  también debe verse un menú dedicado para eso. Actualmente es solo una
  sección que se despliega dentro del mismo panel de clanes, pero debe
  mostrarse en otra pestaña el perfil, con mayor detalle."

  Página nueva, independiente de directorio.html: todo lo que antes se
  desplegaba inline dentro de la sección #miembroSec de directorio.html
  (cabecera, progreso de ascenso/descenso, estadísticas extendidas,
  torneos del jugador, "ver otras cuentas" y "vetar", todo admin-only
  donde corresponde) vive ahora acá, en su propia pestaña, a partir de
  ?tag=TAG en la URL. directorio.html ya NO renderiza el perfil inline:
  simplemente resuelve el tag (directo, o por selección entre
  coincidencias) y abre esta página con window.open(...,'_blank').

  Además se agrega una sección nueva que no existía: "Ranking en el clan"
  a lo largo del tiempo (pedido: "se puede hacer una gráfica de ranking en
  el clan, porque eso se guarda en la hoja Guerra").
  RESUELTO (04-sep-2026, pedido usuario — "en el sector de Ranking del
  clan, falta corregir porque la información diaria sí está en Sheets,
  hoja Guerra"): 'webPerfil' (_webPerfilJugador(), 34_Web_API.gs) ya manda
  ext.historialRanking = [{semana, ranking}, ...], leído fila por fila de
  la hoja Guerra (columna Ranking, GC.RANKING) para el Tag del jugador.
  Como Guerra solo retiene la temporada actual (el resto se purga a
  Backup_Guerra.csv), el historial cubre los días ya jugados de la
  temporada en curso, no temporadas completas anteriores. Si un jugador
  todavía no tiene ningún día con Ranking registrado (recién ingresado, o
  ninguna guerra jugada todavía esta temporada), esta sección sigue
  mostrando el mensaje de "todavía no hay historial" en vez de una gráfica
  vacía (ver renderRankingChart() más abajo).

  PENDIENTE (11-sep-2026, pedido usuario): el usuario ahora sube a Drive,
  carpeta "JSON", un export crudo por jugador de la API de Clash Royale
  (nombre de archivo tipo "DD-MM-AAAA_HH_MM_-_<clan>_-_<TAG>.json", uno
  por snapshot). Falta que el backend (34_Web_API.gs / webPerfil) se
  conecte a esa carpeta para leer estos JSON.
  ID de la carpeta de Drive: 1Kqmn7ExFr3cDER_DgKnHwHlWc9lLW9aF
  (https://drive.google.com/drive/u/0/folders/1Kqmn7ExFr3cDER_DgKnHwHlWc9lLW9aF)
     AVANCE (12-sep-2026): perfil.html ya tiene TODAS las secciones
     frontend consumiendo jugador.rawClash (categorías con el mismo nombre
     que el JSON, ver rawClash() y los "PENDIENTE BACKEND" de cada
     render*() nuevo). Falta solo que webPerfil adjunte ese objeto.

  Revisando un ejemplo del JSON, esto es lo que trae y que perfil.html
  todavía NO usa (currentDeck y achievements ya llegan por otra vía, ver
  comentarios de pd.currentDeck y bloqueRequisitos() más abajo):
    - badges[]: {name, level, maxLevel, progress, target, iconUrls.large}
      — insignias del jugador (ej. ClanWarsVeteran, BattleWins, etc.).
      El `name` sí se repite entre jugadores (es como `cards`: hay un
      catálogo fijo de insignias posibles), PERO no todos los jugadores
      tienen las mismas: cada uno desbloquea un subconjunto distinto
      (ej. si existen A/B/C/D, un jugador puede tener A y B, otro A y C,
      otro B y D...). Además level/maxLevel/progress/target/iconUrls
      SÍ varían persona por persona, porque cada insignia tiene su propio
      nivel alcanzado por jugador (y el ícono cambia según ese nivel).
      Para armar un catálogo real de insignias (nombre + su ícono por
      cada nivel posible) haría falta un CSV aparte en Drive con esa
      relación nombre↔ícono-por-nivel; eso queda para evaluar al momento
      de conectar el backend, no viene resuelto en el JSON de cada
      jugador.
    - cards[]: colección completa (122 cartas típico) con nivel/estrellas
      por carta — permitiría una sección "Colección completa", más allá
      del "Mazo actual" (que ya usa currentDeck).
    - supportCards[] / currentDeckSupportCards[]: cartas de soporte
      (torres/campeón de apoyo) — no confundir con currentFavouriteCard.
    - currentFavouriteCard: {name, id, maxLevel, elixirCost, iconUrls,
      rarity} — carta favorita marcada por el jugador en el juego.
    - starPoints / expPoints / totalExpPoints: puntos de estrella y
      experiencia acumulada.
    - legacyTrophyRoadHighScore: mejor puntaje histórico del Camino de
      Trofeos "viejo" (pre Path of Legends).
    - currentPathOfLegendSeasonResult / lastPathOfLegendSeasonResult /
      bestPathOfLegendSeasonResult: {leagueNumber, trophies, rank} del
      modo competitivo Path of Legends (actual, anterior y mejor).
    - leagueStatistics.{currentSeason,previousSeason,bestSeason}:
      trofeos por temporada de liga.
    - progress{}: objeto con progreso en eventos/modos puntuales activos
      al momento del snapshot (ej. "ChaosDraftLeague",
      "AutoChess_2026_Season_10", "seasonal-trophy-road-202608") — las
      claves cambian según qué eventos estén corriendo esa temporada.
    - _fecha / _clan: campos propios del exportador (no de la API de
      Supercell), con la fecha del snapshot y el nombre del clan en ese
      momento — al haber un JSON por snapshot y por jugador, esto abre la
      puerta a un historial propio de estadísticas del jugador (trofeos,
      donaciones, etc. a través del tiempo), similar en espíritu al
      historialRanking que ya se arma desde la hoja Guerra.
  El resto de campos del JSON (trophies, bestTrophies, wins, losses,
  battleCount, donations, totalDonations, warDayWins,
  clanCardsCollected, threeCrownWins, challengeMaxWins,
  tournamentCardsWon, expLevel, collectionLevel, clan, arena, role,
  currentWinLoseStreak) coinciden con datos que el perfil probablemente
  ya recibe por otra vía (llamada en vivo a la API); revisar duplicados
  antes de que el backend empiece a leer también desde estos JSON.
```

### Línea original 304 (HTML)

```
FIX (12-sep-2026): fecha/clan del snapshot exportado a Drive
                 (categorías _fecha y _clan del JSON, campos propios del
                 exportador — ver renderSnapshotInfo()). Oculto si el
                 backend todavía no adjunta rawClash.
```

### Línea original 315 (HTML)

```
FIX (03-sep-2026, pedido usuario — "Vigencia" (Última
                 conexión), dato de la hoja Directorio: "eso se debe
                 incluir también en el perfil de los jugadores"): oculto
                 por defecto — webPerfil (34_Web_API.gs) todavía no manda
                 j.vigencia, así que no se pinta nada en vez de mostrar
                 "—" vacío; se muestra automáticamente en cuanto el
                 backend agregue ese campo (ver renderMiembro() más
                 abajo).
```

### Línea original 330 (HTML)

```
FIX (02-sep-2026): una sola fila de acciones, formato "primera
             fila" (.ext-links, pill chico) — ver comentario junto a
             .ext-links en el <style> y a renderMiembro() más abajo.
```

### Línea original 338 (HTML)

```
FASE 2 (04-sep-2026, pedido del usuario, punto 1 del documento
               de cambios): historial completo de guerra del jugador, solo
               admin — mismo patrón visible/oculto que btnVerOtrasCuentas.
```

### Línea original 349 (HTML)

```
---------- MAZO ACTUAL (FASE 10, 06-sep-2026) ----------
           Distinto de "Sugerencias de mazo"/"Sugerencias de mazo (2)" (los
           botones de la derecha de este mismo encabezado, que arman una
           búsqueda en RoyaleAPI a partir del nivel de cartas
           desbloqueadas): esto es pd.currentDeck real, tal como lo manda
           la API de Supercell — ver _webMazoActualDesdeCards2(),
           34_Web_API.gs. Oculto por defecto: j.mazoActual puede venir null
           (jugador sin datos de Cards_2 todavía), ver renderMazoActual()
           más abajo.
           FIX (08-sep-2026, pedido usuario — "mueve los botones de
           sugerencia de mazo a la derecha de mazo actual"): "Sugerencias
           de mazo"/"Sugerencias de mazo (2)" vivían en #mRoyaleCwstatsBtns
           (la fila de acciones de la cabecera del perfil, junto a
           RoyaleAPI/CWStats/Vetar/Ver torneos/etc — se veían amontonados
           ahí, ver la captura del pedido). Se mudan a #mMazoActualBtns,
           en la esquina superior derecha de ESTE card (mismo renglón que
           el eyebrow/título, alineados con flex space-between) — tiene más
           sentido ahí porque ambos hablan de mazos de esta cuenta.
           RoyaleAPI/CWStats se quedan donde estaban; ver renderMiembro()
           para el reparto exacto. Como esos botones ya no dependen de
           mazoActual (son datos de ext.deck/ext.deck2, columnas Mazo/Mazo2
           de Directorio), la card ahora también se muestra si HAY botones
           de sugerencia aunque el jugador todavía no tenga mazoActual
           real (ver renderMazoActual()).
```

### Línea original 391 (HTML)

```
---------- ATAQUES / PUNTAJE / BARCOS POR SEMANA (FIX 08-sep-2026,
           pedido usuario — "solo se está mostrando evolución de ranking,
           falta de ataques, puntaje y barcos") ----------
           Mismo array que el ranking de arriba (j.extendido.historialRanking,
           una fila por semana), graficando otros 3 campos de esa misma
           fila en vez de `ranking`. Cada tarjeta arranca oculta y solo se
           muestra si ese campo puntual (ataques/puntaje/barcos) viene con
           datos en al menos una semana del historial — ver
           renderMetricaSemanal()/renderMetricasSemanales() más abajo. Si
           el backend todavía no manda esos 3 campos en historialRanking
           (con exactamente esos nombres), estas 3 tarjetas simplemente se
           quedan ocultas — no rompen nada — y empiezan a mostrarse solas
           en cuanto el backend los agregue, sin tocar este HTML de nuevo.
```

### Línea original 420 (HTML)

```
===== SECCIONES NUEVAS (12-sep-2026, pedido usuario — aprovechar
           TODO el JSON crudo del export de Drive) =====
           Todas leen jugador.rawClash vía rawClash() (ver script).
           PENDIENTE BACKEND — webPerfil (34_Web_API.gs) debe adjuntar el
           objeto del snapshot exportado tal cual, conservando los nombres
           de categoría del JSON de Supercell:
             currentFavouriteCard · currentDeckSupportCards · cards[] ·
             supportCards[] ("Cartas de torre") · badges[] · achievements[] ·
             currentPathOfLegendSeasonResult / lastPathOfLegendSeasonResult /
             bestPathOfLegendSeasonResult · leagueStatistics ·
             legacyTrophyRoadHighScore · progress{} · starPoints ·
             expPoints / totalExpPoints · expLevel · kingTowerLevel ·
             _fecha / _clan (campos propios del exportador).
           Mientras rawClash no llegue, cada card se queda oculta sola.
```

### Línea original 457 (HTML)

```
PENDIENTE BACKEND: categoría supportCards[] del JSON (las
             "Tower Cards" de RoyaleAPI; NO confundir con
             currentDeckSupportCards, que es la torre equipada en el mazo
             actual y se pinta dentro de "Mazo actual").
```


### Bloques // (script)

#### Línea original 945 (script)

```
    // 1) Héroe (Campeón) primero. FIX (09-sep-2026, pedido usuario): ahora
    // que 34_Web_API.gs manda a.hasHero/b.hasHero (dato real del catálogo,
    // ver renderMazoActual() más abajo), se prioriza sobre la tabla
    // estática DATOS_CARTAS_MAZO -- por si una carta Campeón nueva todavía
    // no está agregada ahí, sigue ordenándose bien.
```

#### Línea original 996 (script)

```
  // Mismos títulos/tooltips que ya explicaban la diferencia entre ambos
  // botones cuando vivían junto a RoyaleAPI/CWStats (ver FIX 04-sep-2026
  // en renderMiembro()) — se mudan acá tal cual, sin reescribir el texto.
```

#### Línea original 1019 (script)

```
  // FIX (12-sep-2026): cruzar cada carta del mazo con rawClash(j).
  // currentDeck (PENDIENTE BACKEND: categoría currentDeck) para sumar
  // starLevel, count y evolutionLevel aunque _webMazoActualDesdeCards2()
  // todavía no los mande. Clave de cruce: nombre exacto de la carta.
```

#### Línea original 1063 (script)

```
  // FIX (12-sep-2026): carta(s) de torre equipada con este mazo —
  // PENDIENTE BACKEND: categoría currentDeckSupportCards del JSON (es la
  // "Tower Princess"/torre activa del mazo, distinta de supportCards[],
  // que es la colección completa de torres y se pinta en su propia card).
```

#### Línea original 1179 (script)

```
  // Línea horizontal secundaria a mitad de camino entre las dos líneas
  // principales del eje Y (pedido usuario 07-sep-2026 — mismo criterio
  // que el resto de gráficas del sitio, ver gridHorizontalMediosSvg() en
  // común.js; acá se calcula directo porque esta gráfica solo tiene 2
  // líneas de referencia, no una grilla de varios pasos).
```

#### Línea original 1186 (script)

```
  // Líneas verticales de referencia (inicio de año/temporada — pedido
  // usuario 07-sep-2026): esta gráfica es de granularidad SEMANAL, así
  // que no se agrega línea de inicio de semana (ver lineasTemporalesSvg()
  // en común.js). Reusa el mismo parser de fecha ya definido arriba.
```

#### Línea original 1196 (script)

```
  // Títulos de los ejes (pedido usuario 08-sep-2026 — "todas las gráficas
  // deben indicar el nombre de los ejes"): se agrega un margen extra a la
  // izquierda (gutter de 16, vía el offset negativo del viewBox) y otro
  // abajo (H+46 → H+62) SIN tocar ninguna de las coordenadas ya calculadas
  // arriba (PAD_L, stepX, escalaY, etc.) — el gráfico existente queda
  // intacto y los títulos se dibujan en el espacio nuevo alrededor.
  // FIX (13-sep-2026, pedido usuario — "hay que bajar un poco el nombre
  // del eje x para que no se superponga con las fechas"): las etiquetas
  // de fecha van rotadas -45° ancladas en y=H+18, así que su extremo
  // inferior cae varios px por debajo de esa línea base (no son texto
  // horizontal plano). Con el título en H+58 quedaban pisándose. Se baja
  // el título a H+74 y se agranda el viewBox (antes H+62) para que siga
  // entrando completo dentro del SVG.
```

#### Línea original 1298 (script)

```
  // FIX (13-sep-2026, pedido usuario — "hay que bajar un poco el nombre
  // del eje x para que no se superponga con las fechas", mismo fix que
  // renderRankingChart() de arriba): las etiquetas de fecha van rotadas
  // -45° ancladas en y=H+18, así que su extremo inferior cae varios px
  // por debajo de esa línea base. Con el título en H+58 quedaban
  // pisándose. Se baja el título a H+74 y se agranda el viewBox (antes
  // H+62) para que siga entrando completo dentro del SVG.
```

#### Línea original 1351 (script)

```
  // FIX (03-sep-2026, pedido usuario — "Vigencia" / Última conexión, dato
  // de la hoja Directorio): se acepta tanto `j.vigencia` como
  // `j.extendido.vigencia`/`j.extendido.ultimaConexion` — se usa el primero
  // que venga con valor. Si ninguno viene, el <span> se queda oculto
  // (display:none puesto en el HTML) en vez de mostrar un campo vacío.
  // CONFIRMADO (04-sep-2026): el backend (`_webPerfilJugador()`,
  // 34_Web_API.gs) ya manda `j.vigencia` (columna DC.VIGENCIA de
  // Directorio), así que este bloque ya no depende de una futura conexión.
```

#### Línea original 1368 (script)

```
  // FIX (04-sep-2026, pedido usuario — "los espacios son desiguales" entre
  // las barras de Ascensos/Descensos): antes se unían los bloques con un
  // separador extra de 14px (`<div style="height:14px;">`), que se SUMABA
  // al margin-bottom:12px que ya trae cada .req-row (ver <style>), dejando
  // 26px entre el último renglón de un bloque y el primero del siguiente,
  // contra 12px entre renglones de un mismo bloque. Se quita el separador
  // extra: el margin-bottom:12px de .req-row ya es uniforme para TODOS los
  // renglones, sean del mismo bloque o no.
```

#### Línea original 1394 (script)

```
  // FIX (31-ago-2026, pedido usuario — "en los perfiles de jugadores,
  // antes de ver torneos, agrega el botón con el link al perfil de
  // royaleapi y otro a cwstats"): botones dedicados en la fila de
  // acciones, con los íconos oficiales.
  // FIX (02-sep-2026, pedido usuario — "se debía quitar la segunda fila,
  // no la primera; mover los nuevos botones a la primera fila, siguiendo
  // el formato que tenía la primera fila"): estos links ya NO usan las
  // clases .btn.btn-ghost (la fila "grande" que había que quitar) — ahora
  // son <a> simples dentro de #mAccionesRow (clase .ext-links, ver <style>
  // y el HTML de esta sección), así que heredan el estilo de la fila
  // "chica" original, junto con Vetar/Ver torneos/Ver otras cuentas.
  // FIX (08-sep-2026, pedido usuario — "mueve los botones de sugerencia de
  // mazo a la derecha de mazo actual"): "Sugerencias de mazo"/"Sugerencias
  // de mazo (2)" (ext.deck/ext.deck2) ya NO se arman acá — se mudaron al
  // encabezado de la card "Mazo actual" (ver renderMazoActual() más
  // arriba). Esta fila ahora solo trae RoyaleAPI/CWStats.
```


## directorio.html — historial trasladado

### 18-sep-2026 (refactor CSS, Fase 2 — tablas) — Restyle manual de `.roster-table-wrap` eliminado por duplicado
El restyle morado de la barra de scroll (thumb `var(--purple-light)`,
track translúcido) agregado a mano el 16-sep-2026 quedó duplicado byte a
byte de `.scroll-morado` (`assets/styles.css`) desde que
`activarBarraScrollTabla()` empezó a agregarle esa misma clase a
`#rosterTableWrap` en runtime (mismo día, sesión de unificación de
scroll — ver entrada de guerra.html más abajo). Se elimina el duplicado
de `<style>`; `overflow-x:auto` se mantiene como base funcional (para
que la tabla siga siendo scrolleable si JS no llega a correr, aunque en
ese caso sin restylear).

### 18-sep-2026 — Filtro por letra, debounce y scroll sincronizado subidos a common.js
`pintarFiltroLetraRoster()` estaba duplicada, con exactamente la misma
lógica, en guerra.html (dos veces: `pintarFiltroLetraPendientes()` y
`pintarFiltroLetraGrid()`) — la única diferencia real entre las tres era
el id del wrap, la variable de la letra elegida y el callback de
re-filtrado. Se reemplaza por `pintarFiltroLetra(wrapId, letras,
obtenerSel, fijarSel, onCambio)` en `assets/common.js`; acá se llama
pasando `'rosterLetraFilter'`, el getter/setter de `rosterLetraSeleccionada`
y `aplicarFiltrosRoster(rosterWrap)` como callback. `LETRAS_FILTRO` y
`primeraLetraFiltro()` (idénticos, letra por letra, a los que tenía
guerra.html) también se unifican ahí. Se agrega `aria-label` a cada botón
A-Z/#, que antes solo llevaba el texto visual de la letra.

`debounce()` (usada por el buscador del popover de filtro de columna,
`.rt-filtro-buscar`) vivía solo acá; se sube tal cual a `common.js` para
que cualquier otra página pueda reusarla sin duplicarla.

El scroll horizontal sincronizado entre `#rosterTopScroll` y
`#rosterTableWrap` (bandera `sincronizando` para no entrar en loop de
`scroll`) estaba escrito a mano acá; es el mismo patrón que ya tenía
`enlazarScrollsHorizontales()` en guerra.html (ahí para N barras por
tarjeta de clan, acá para un solo par). Se extrae a
`sincronizarScrollHorizontal(elementos)` en `common.js`, que ambas
páginas usan ahora.

No se tocó el popover de filtro/orden por columna (`abrirFiltroColumna()`
acá vs `abrirGridFiltroColumna()` de guerra.html): comparte HTML/clases
`rt-*` y buena parte de la lógica del checklist, pero está atado a un
modelo de estado distinto en cada página (variables sueltas de una sola
tabla acá; `gridEstados[gridId]` con varias tablas en guerra.html) y esta
versión tiene funcionalidad de más (tipo fecha, columnas no ordenables,
el debounce del buscador) que no es 1:1 con la otra. Fusionarlos ahora
tenía más riesgo que beneficio; queda para una revisión aparte.

### Línea original 685 (HTML)

```
---------- COMPARADOR DE JUGADORES ----------
       Ver _webCompararJugadores() en 34_Web_API.gs — envuelve dos
       llamadas a webPerfil en un solo pedido. FIX (02-sep-2026, punto 9):
       ahora también consume _webHistorialGuerraComparador() para pintar
       el desempeño diario de guerra (ver compGuerraChartWrap más abajo).
```

### Línea original 702 (HTML)

```
FIX (02-sep-2026, pedido usuario, punto 9: "Cara a cara debería
         mostrar el desempeño de guerra con gráficas, sacadas de la hoja
         Guerra/CSV, valores diarios, eje X solo por mes"). Ver
         _webHistorialGuerraComparador() en 34_Web_API.gs y
         renderComparadorGuerraChart() más abajo.
```

### Línea original 706 (HTML)

```
---------- DIRECTORIO COMPLETO ----------
       Sin barra de filtro propia: la barra de búsqueda de arriba ("Busca
       tu perfil por nombre o tag") ya cumple esa función — no hace falta
       una segunda barra buscadora acá (pedido del PDF de diseño).
```

### Línea original 714 (HTML)

```
FIX (13-sep-2026, pedido usuario — "agrega los botones de letras en
         directorio por clan"): fila A-Z/# para filtrar por primera letra
         del nombre, mismo patrón visual que en guerra.html — se pinta una
         sola vez (ver pintarFiltroLetraRoster() en el <script>) y persiste
         fuera de #rosterWrap para no perderse al cambiar de clan (cada
         cambio de clan sí resetea CUÁL letra está elegida, igual que ya
         hacía con los demás filtros — ver renderRosterClanActivo()).
```

### Línea original 721 (HTML)

```
FIX (04-sep-2026, pedido usuario — "Los ingresos recientes deben
       moverse a Directorio (al final)"): antes vivía en guerra.html; se
       trae completa (markup + JS, ver cargarIngresosRecientes()) al final
       del Directorio, después de la lista de miembros por clan. Sigue
       consumiendo 'webGuerraEnVivo' (mismo endpoint público, campo
       'nuevos') — no hizo falta ningún cambio de backend.
```

### Línea original 727 (HTML)

```
FIX (16-sep-2026 v2, pedido usuario — pastillas de clan en vez del
         botón "Filtrar por clan / miembro" + panel plegable): pintado por
         construirFiltroIngresos() en cuanto llega la data.
```

### Línea original 730 (HTML)

```
FIX (16-sep-2026 v8, pedido usuario — "poner un botón de
         Mostrar/Ocultar gráficas para no precargar todo de golpe [...]
         que al inicio aparezcan solo las tarjetas de nombres y las
         gráficas que sean a pedido"): las gráficas comparativas
         (renderComparativaSemanal) ya no se construyen al cargar la
         página — arrancan cerradas y solo se pintan cuando el usuario
         toca este botón (ver inicializarToggleGraficasIngresos()).
```


### Bloques // (script)

#### Línea original 826 (script)

```
    // Orden fijo de la Familia, no alfabético — ver ordenClanIndex() en
    // common.js. Se ordena antes de usar el índice "i" para que la
    // insignia de rol (Cantera/Semillero) siempre le toque al clan
    // correcto, sin importar el orden que mande el backend.
```

#### Línea original 1038 (script)

```
    // El directorio todavía no terminó de cargar: si lo escrito ya parece
    // un Tag completo, se prueba directo contra la API en vez de obligar
    // a esperar a que cargue el directorio.
```

#### Línea original 1071 (script)

```
    // FIX (03-sep-2026, pedido usuario — "reemplazar 'ataques/sem' por
    // 'Ataques en la semana actual', contando solo lo que se hizo en
    // días de guerra"): el valor (jugador.guerraSemana.ataques) ya vale
    // eso — sale de GC.ATAQUES_SEM, que el juego mismo solo permite
    // acumular en días de guerra (no hay "ataques" que registrar en
    // entrenamiento), así que no hacía falta tocar el número, solo la
    // etiqueta, que sí era ambigua sobre qué contaba.
    // FIX (05-sep-2026, pedido usuario): ahora usa extItemAtaques() en vez
    // de extItem() para agregar "/tope" (ver docblock de esa función).
```

#### Línea original 1082 (script)

```
    // FIX (03-sep-2026, pedido usuario — "incluir 'Donaciones hechas' y
    // 'Donaciones recibidas' en vez de cortar el texto"): antes solo
    // estaba 'Donac. hechas' (abreviado) y faltaba el recibidas.
```

#### Línea original 1090 (script)

```
  // FIX (05-sep-2026, pedido usuario — "la vigencia del cara a cara debe
  // tener el formato que tiene en el perfil de miembro y debe ir a la
  // derecha del nombre... con hora incluida"): antes la Vigencia salía
  // como un cuadrito más del ext-grid (fecha sin hora); ahora se pinta
  // junto al nombre con .perfil-cabecera/.stats-mini (mismo patrón visual
  // que usa perfil.html para su Vigencia) y con fmtFechaConHoraVigencia()
  // (fecha + hora) en vez de fmtFechaCortaVigencia() (solo fecha).
```

#### Línea original 1156 (script)

```
    // FIX (03-sep-2026, pedido usuario): mismo cambio de etiqueta y de
    // items de donaciones que renderComparadorLado() más arriba.
    // FIX (05-sep-2026, pedido usuario — "en los ataques, agrega '/' y la
    // cantidad de ataques que debería tener"): tope (Number(a.guerraSemana.ataquesMax) ||
    // b.guerraSemana.ataquesMax) — cualquiera de los dos lados alcanza,
    // ambos jugadores comparten el mismo tope de la semana en curso.
```

#### Línea original 1179 (script)

```
    // FIX (05-sep-2026, pedido usuario — "en los ataques, agrega '/' y la
    // cantidad de ataques que debería tener"): f.maxAtaques solo viene con
    // dato (>0) en la fila de "Ataques en la semana actual"; en el resto de
    // filas queda undefined/0 y el texto se comporta igual que antes.
```

#### Línea original 1227 (script)

```
  // Redondea el rango a un "paso" agradable (1/2/5 x 10^n) y le agrega
  // ~10% de margen arriba/abajo para que ningún punto quede pegado al
  // borde del gráfico — en vez de forzar el piso a 0, que aplastaba la
  // variación real cuando los dos jugadores se mueven en un rango angosto
  // y alto (ej. Fame entre 2800 y 3200).
```

#### Línea original 1244 (script)

```
  // FIX (07-sep-2026, pedido usuario): PAD_B pasó de 32 a 40 porque la
  // etiqueta de fecha ahora va rotada 45° (ver más abajo) y necesita más
  // alto para no recortarse contra el borde inferior del SVG.
```

#### Línea original 1263 (script)

```
  // FIX (07-sep-2026, pedido usuario — "agrega líneas... que permitan
  // identificar el primer registro de cada semana y unas más notorias
  // para el inicio de cada mes"), ACTUALIZADO el mismo día (pedido más
  // amplio, ver docblock de lineasTemporalesSvg en common.js): esta
  // gráfica es de granularidad DIARIA, así que las 3 líneas de
  // referencia (año/temporada/semana) aplican todas — reemplaza el
  // detector de "cambio de mes calendario" que había antes (una
  // temporada de Clash Royale NO siempre coincide con el mes calendario:
  // empieza el PRIMER LUNES de cada mes, ver esInicioTemporada() en
  // común.js) por el mismo criterio que usa el backend.
```

#### Línea original 1291 (script)

```
  // FIX (07-sep-2026, pedido usuario, Fase 15 punto 1 — "tooltip con
  // Nombre, Clan, Puntaje, Día"): cada círculo pasa de auto-cerrarse
  // (<circle ... />) a envolver un <title>, que es el tooltip nativo del
  // navegador (sin JS/CSS extra, funciona en desktop y con tap sostenido
  // en mobile) — mismo patrón que el resto de la página, sin dependencias
  // nuevas. Texto: "Nombre — Clan\n<Título de la métrica>: valor\nFecha".
```

#### Línea original 1311 (script)

```
  // FIX (07-sep-2026, pedido usuario): rota 45° a la izquierda la fecha.
  // FIX (08-sep-2026, pedido usuario — "todas las gráficas deben indicar
  // el nombre de los ejes"): se agrega un gutter de 16 a la izquierda y
  // 16 abajo (vía el offset negativo del viewBox), sin tocar PAD_L/PAD_B
  // ni ninguna coordenada ya calculada arriba, y ahí se dibujan los dos
  // títulos fijos ("Fecha" en X; en Y, el nombre de la métrica — Ataques,
  // Puntaje (Fame) o Barcos según 'campo').
```

#### Línea original 1377 (script)

```
  // FIX (05-sep-2026, pedido usuario — "las gráficas del cara a cara son
  // muy pequeñas, no es necesario que vayan las 3 en una sola línea. Con
  // ese tamaño no se ve nada"): antes usaba
  // "repeat(auto-fit,minmax(280px,1fr))", que en pantallas anchas metía
  // las 3 cards en una sola fila, comprimiendo cada gráfica (viewBox
  // 640x220) a ~280px de ancho. Ahora una sola columna (1fr): cada
  // gráfica ocupa el ancho completo del contenedor, apiladas de arriba
  // hacia abajo — se lee bien sin importar el tamaño de pantalla.
```

#### Línea original 1414 (script)

```
  // FIX (31-ago-2026, pedido usuario): antes se mandaban los textos crudos
  // directo al backend, eligiendo a ciegas la primera coincidencia posible
  // del lado del servidor. Ahora se resuelve cada lado por separado contra
  // el directorio ya cargado; si algún lado es ambiguo, se muestran sus
  // coincidencias (nombre, tag, clan) y se espera el clic antes de
  // comparar.
```

#### Línea original 1433 (script)

```
    // FIX (02-sep-2026, punto 9): el historial de guerra se pide en
    // paralelo al perfil, no en cascada — y con su propio .catch() para
    // que si ese endpoint falla (o es una versión vieja del backend sin
    // 'webHistorialGuerraComparador' todavía), el resto del comparador
    // (perfiles + barras) igual se pinte con normalidad.
```

#### Línea original 1621 (script)

```
// FIX (13-sep-2026, pedido usuario — "agrega los botones de letras en
// directorio por clan"): letra A-Z/# elegida en #rosterLetraFilter (null =
// todas). Igual que rosterFiltrosSeleccion/rosterOrden de arriba, se
// reinicia cada vez que se cambia de pestaña de clan (ver
// renderRosterClanActivo()) y se combina con esos filtros dentro de
// aplicarFiltrosRoster() sin pisarse entre sí. Ver pintarFiltroLetraRoster()
// y primeraLetraFiltro()/LETRAS_FILTRO más abajo.
```

#### Línea original 1857 (script)

```
  // FIX (16-sep-2026 v8, pedido usuario — rendimiento, sugerencia propia
  // aceptada: "el buscador del popover no tiene debounce"): antes
  // pintarLista() se disparaba en CADA tecla, reconstruyendo el checklist
  // completo de la columna. Con ~50 valores no se nota, pero es gratis
  // esperar 180ms de pausa en el tipeo antes de repintar (debounce()
  // helper reusable, ver definición al inicio del <script>).
```

#### Línea original 1865 (script)

```
  // "Seleccionar todo"/"Desmarcar todo" (pedido usuario 08-sep-2026):
  // actúan sobre TODOS los valores de la columna, no solo los que
  // queden visibles tras el buscador — así se puede buscar "Líder",
  // desmarcar todo, y el resto de valores queda intacto (sin tildar).
```

#### Línea original 1900 (script)

```
  // Posición: colgado del ícono clickeado, como position:fixed (así no lo
  // recorta el overflow-x:auto de .roster-table-wrap). Se ajusta para no
  // salirse por la derecha ni por abajo de la ventana.
```

#### Línea original 1973 (script)

```
    // FIX (13-sep-2026, pedido usuario — "agrega los botones de letras en
    // directorio por clan"): además de los filtros por columna de arriba,
    // la fila también debe pasar el filtro por letra elegido en
    // #rosterLetraFilter (si hay alguno) — ver data-letra en
    // filasHtmlRoster() más abajo.
```

#### Línea original 2046 (script)

```
  // FIX (13-sep-2026, pedido usuario — "agrega los botones de letras en
  // directorio por clan"): pintarFiltroLetraRoster() solo pinta de verdad
  // la primera vez (guardia por dataset.pintado); en cada cambio de clan
  // solo hace falta quitar el estado "active" de cualquier letra que
  // hubiera quedado marcada del clan anterior, ya que rosterLetraSeleccionada
  // se acaba de resetear arriba.
```

#### Línea original 2080 (script)

```
  // Barra de scroll superior sincronizada con la real (ver docblock de
  // .roster-topbar más arriba, en el <style>): el div interno se estira al
  // ancho real de la tabla, y ambos contenedores se copian el scrollLeft
  // uno al otro (con una bandera para no entrar en loop infinito de
  // eventos "scroll" disparándose mutuamente).
```

#### Línea original 2091 (script)

```
  // Recalcula si la ventana cambia de tamaño (ej. rotar el celular) — no
  // hace falta quitar este listener al re-pintar la tabla (cambio de
  // clan): vuelve a buscar los elementos por su id cada vez que se
  // dispara, y esos ids siempre existen mientras la página esté abierta.
```

#### Línea original 2110 (script)

```
  // Botón "Quitar filtros" (pedido usuario 08-sep-2026): borra TODAS las
  // entradas de rosterFiltrosSeleccion de un toque, en vez de tener que
  // abrir columna por columna y tildar todo de nuevo. Arranca deshabilitado
  // (no hay filtros recién pintada la tabla — ver "disabled" en el HTML de
  // arriba) y actualizarBotonLimpiarFiltros() lo habilita/deshabilita cada
  // vez que cambia algún filtro (ver esa función y actualizarIconosFiltro()
  // más abajo).
```

#### Línea original 2157 (script)

```
    // FIX (31-ago-2026): un link directo a directorio.html?tag=TAG (de
    // antes de que existiera perfil.html) ahora redirige a la página de
    // perfil correspondiente EN LA MISMA pestaña — un window.open() acá
    // sería un popup disparado sin gesto del usuario y la mayoría de
    // navegadores lo bloquearía.
```

#### Línea original 2303 (script)

```
  // FIX (08-sep-2026, pedido usuario — "todas las gráficas deben indicar
  // el nombre de los ejes"): PAD_L (56→74) y PAD_B (68→84) suben para dejar
  // espacio a los títulos fijos de los ejes ("Fecha" en X, opts.ejeY en Y
  // — ver los <text class="ing-axis-title"> al final de esta función),
  // mismo cambio que su gemela en index.html.
```

#### Línea original 2417 (script)

```
      // FIX (10-sep-2026, pedido usuario — "arriba debe decir el nombre de
      // la cuenta y su tag, abajo el clan y la cantidad de ataques, barcos
      // o fame, igual que en index"): mismo orden que activarTooltipsGraficas()
      // en index.html — nombre+tag arriba en negrita, cantidad+clan+fecha
      // abajo tenue (antes estaba al revés en ambos archivos).
```

#### Línea original 2439 (script)

```
  // FIX (08-sep-2026, pedido usuario — "las gráficas deben indicar el
  // nombre de los ejes"): mismo criterio que index.html — ejeY es la
  // primera palabra del título de la tarjeta.
```

#### Línea original 2538 (script)

```
// FIX (16-sep-2026 v8, pedido usuario — "poner un botón de Mostrar/Ocultar
// gráficas para no precargar todo de golpe [...] que al inicio aparezcan
// solo las tarjetas de nombres y las gráficas que sean a pedido"): las 3
// gráficas comparativas (renderComparativaSemanal) son lo más caro de
// pintar de toda la sección — un <svg> con un <path>+<circle> por cada
// semana de CADA miembro nuevo — así que ya no se construyen solas al
// cargar la página. ingresosGraficasVisibles controla si están abiertas
// (arranca en false: solo se ve el botón, ver #ingGraficasToggle más
// abajo) e ingresosUltimosFiltrados guarda el último subconjunto filtrado
// aunque las gráficas estén ocultas, para poder pintarlas al instante
// apenas el usuario las abre, sin tener que recalcular el filtro.
```

#### Línea original 2597 (script)

```
  // Las gráficas solo se recalculan si el usuario las tiene abiertas (ver
  // ingresosGraficasVisibles / #ingGraficasToggle) — si están ocultas, ya
  // quedó guardado en ingresosUltimosFiltrados y se pintan recién cuando
  // las abra, para no gastar tiempo de render en algo que nadie está viendo.
```

#### Línea original 1023 (script)

```
FIX (31-ago-2026, pedido usuario — "debería mostrarme las 5
coincidencias (ya sea en tag o nombre) y darme a elegir el que
quiero ver"): con UNA sola coincidencia se sigue resolviendo directo
(eso "se reemplaza bien", según el propio pedido); con 2 o más ya no
se elige la primera en automático — se muestra la lista y se espera
el clic del usuario.
```


## index.html — historial trasladado

### Línea original 592 (HTML)

```
Datos estructurados (schema.org, Organization): ayuda a que Google
     muestre el logo, el nombre y los canales oficiales de la Familia
     Terna como resultado enriquecido en búsquedas y en el panel lateral
     de conocimiento. Se coloca solo en index.html (página principal del
     sitio), que es donde Google espera encontrar el marcado de
     organización. sameAs enlaza los mismos canales oficiales ya listados
     en la sección "Canales Verificados" (#redes) más abajo en esta misma
     página, para que Google los asocie a esta organización.
```

### Línea original 628 (HTML)

```
FIX (07-sep-2026, pedido usuario — "Agrega un botón llamado
           'Inicio' que lleve a index, haciendo lo mismo que hace el botón
           de familia Terna. Este botón debe estar a la izquierda de
           Directorio"): mismo destino que el link .brand de arriba
           (href="index.html") — se usa data-page="inicio" para que
           marcarNavActiva() (assets/common.js) lo resalte como activo acá,
           mismo valor que ya tiene <body data-page="inicio">.
```

### Línea original 639 (HTML)

```
<main id="main-content"> envuelve TODO el contenido central (desde el
     hero hasta antes del footer): antes el id="main-content" del
     skip-link vivía en un <div>/<section> genérico, que un lector de
     pantalla no anuncia como landmark principal. Se usa <main> real por
     accesibilidad; el id se mueve aquí desde la sección .hero-banner de
     abajo para no duplicarlo.
```

### Línea original 652 (HTML)

```
FIX (05-sep-2026, pedido usuario — "en móvil la frase del
           cuartel queda pegada, sin espacios"): antes las palabras solo
           quedaban separadas por el propio salto de línea del <br
           class="hero-title-break">, sin ningún espacio real en el texto.
           En escritorio eso no se notaba porque el <br> sí genera el
           corte visual, pero en móvil ese <br> se oculta (display:none,
           ver breakpoint @media max-width:768px más arriba) y, al no
           haber ningún espacio de por medio, las palabras quedaban
           pegadas ("cuartelgeneralde laFamilia Terna"). Se agrega un
           espacio real antes de cada <br> — en escritorio no cambia nada
           (un espacio antes de un salto de línea no se ve), y en móvil
           ese espacio queda y separa las palabras correctamente.
```

### Línea original 661 (HTML)

```
FIX (10-sep-2026, pedido usuario — "el botón de unirse por
           discord debe ser solo unirse y dar las mismas opciones de
           'Unirse a este clan' (wsp, discord, formulario)"): antes era un
           <a> con link directo a Discord (bypaseaba el resto de canales
           oficiales). Ahora es un botón que abre el MISMO modal
           "¿Cómo unirte?" que ya usan las tarjetas de clan
           (.js-solicitar-unirme -> abrirModalUnirse(), más abajo), sin
           pasarle un clan puntual -- abrirModalUnirse() ya cae sola al
           texto genérico "Postular a un clan" cuando no recibe argumento
           (ver `nombreClan || 'un clan'` dentro de la función).
```

### Línea original 713 (HTML)

```
FIX (31-ago-2026, pedido usuario):
         - Escritorio: "el escudo podría situarse un poco más a la
           izquierda, un poco más grande tal vez, que no esté tan lejos
           del texto" — justify-content:space-between empujaba el escudo
           hasta el borde derecho del contenedor sin importar el ancho del
           texto; se cambia a flex-start (los dos quedan juntos, separados
           solo por el gap) y se agranda el escudo (150px→176px).
         - Móvil: "el escudo debe estar al medio en la versión de celular"
           — con flex-wrap:wrap y solo 2 ítems, al pasar el escudo a su
           propia línea quedaba pegado al borde izquierdo (una sola línea
           con un ítem no se centra con justify-content). Se centra
           explícito por media query sin tocar el layout de escritorio.
```

### Línea original 714 (HTML)

```
FIX (01-sep-2026, pedido usuario — "en la sección de clanes aún
         sale ese espacio mal puesto" / "el escudo... que no esté tan
         lejos del texto"): el cambio del 31-ago de arriba puso
         justify-content:flex-start pero dejó flex:1 en el div de texto
         de abajo — flex:1 hace que ESE div (invisible, sin fondo) crezca
         para ocupar todo el ancho sobrante de la fila, lo que en la
         práctica empuja al escudo hasta el borde derecho exactamente
         igual que space-between (el hueco vacío que se veía en el PDF de
         diseño era ese div estirado). Se cambia a flex:0 1 auto con
         max-width, para que el div de texto solo ocupe el ancho que su
         contenido necesita y el escudo quede pegado justo después, con
         el gap de 28px como única separación.
```

### Línea original 715 (HTML)

```
FIX (03-sep-2026, pedido usuario — "el escudo debería estar en el
         centro del espacio de las barras rojas [el hueco vacío a la
         derecha del texto], aproximadamente donde está el punto rojo"):
         el fix del 01-sep (comentario de arriba) dejó el escudo pegado
         justo después del texto (separado solo por el gap de 28px), no
         centrado en el espacio libre restante. Se envuelve el escudo en
         un elemento que crece para ocupar ese espacio libre
         (.clanes-escudo-fill, ver CSS) y centra su contenido dentro — así
         el escudo queda centrado en el hueco, ni pegado al texto ni
         pegado al borde derecho (que era el problema del space-between
         original).
```

### Línea original 766 (HTML)

```
FIX (04-sep-2026, pedido usuario, punto 28 — "en la sección Rankings
     de la Familia (tops y cartas) me parece que habría que moverla a la
     sección Index"): esta sección vivía en comunidad.html (ver historial
     de esa página) y se MUEVE acá completa — markup, CSS (.rankings-grid/
     .ranking-card/.ranking-row/.cartas-list/.carta-chip, ver <style> de
     arriba) y JS (renderRankingRow/pintarRanking/cargarRankings/
     cargarEstadisticasCartas, más abajo antes de </script>). Ya no está
     duplicada en comunidad.html. Consume webRankings()/
     webEstadisticasCartas() (34_Web_API.gs), igual que antes — no hace
     falta ningún cambio de backend para que siga funcionando acá.
```

### Línea original 785 (HTML)

```
FIX (04-sep-2026, pedido usuario — "no estoy segura del
             significado de 6682 en torneos, ¿significa que ha ganado esa
             cantidad de torneos?"): NO — DC.TORNEOS es
             playerData.tournamentBattleCount de la API de Clash Royale
             (ver 08_Web_Endpoints.gs/13_Sync_...), es decir BATALLAS
             jugadas dentro de torneos, no torneos ganados ni torneos
             distintos en los que participó. Se renombra el título y se
             agrega el sufijo "batallas" al valor (ver cargarRankings()
             más abajo) para que no vuelva a prestarse a esa confusión.
```

### Línea original 805 (HTML)

```
Ver webAniversarios() en 34_Web_API.gs. Solo aparece cuando hay algún
     miembro por cumplir un hito de antigüedad en los próximos 14 días —
     si no hay ninguno, la sección se oculta entera (ver cargarAniversarios()).
```

### Línea original 818 (HTML)

```
Reordenada como penúltima sección (pedido del usuario, 29-ago-2026:
     "justo antes de la frase sobre la élite"), después de Ingresos
     recientes y antes del tagline de cierre.
```

### Línea original 855 (HTML)

```
FIX (31-ago-2026, pedido usuario — "el logo de RoyaleAPI no se
           muestra, los otros logos están bien"): el PNG que se hotlinkeaba
           directo desde royaleapi.com dejó de resolver (¿ruta cambiada o
           bloqueo de hotlink?). Se reemplaza por el servicio de favicons
           de Google (s2/favicons), que resuelve el ícono real del sitio de
           forma estable y no depende de una ruta interna de RoyaleAPI que
           puede volver a cambiar. Si en el futuro se consigue el logo
           oficial en SVG, puede reemplazar este <img> igual que los demás
           íconos monocromo.
```

### Línea original 1522 (HTML)

```
FIX (03-sep-2026, pedido usuario — "hacer que cada tarjeta
               lleve al perfil del jugador al hacer clic (hoy no son
               clicables)"): mismo patrón ya aplicado en guerra.html
               (js-nuevo-card) — data-tag + listener con window.open,
               deteniendo la propagación en los links de RoyaleAPI/CWStats
               para que no abran el perfil también.
```

### Línea original 1529 (HTML)

```
FASE 7 (Parte A, 06-sep-2026, punto 7 del documento —
                     avisos de competencia en Ingresos recientes): el
                     backend ya manda ing.esRivalTemporada/
                     ing.clanRivalDetectado (ver
                     _construirIngresosRecientesUnificado(), Base.md) cuando
                     alguna semana del historial de este ingreso lo muestra
                     en un clan que hoy es rival de esta temporada o está en
                     la lista manual de conflicto. Se reusa .badge-warn
                     (mismo estilo que "Rival de esta temporada" en el
                     panel de Detección de infiltrados de admin.html, Fase
                     6) para no introducir un color de alerta nuevo.
```

### Línea original 1544 (HTML)

```
FIX (03-sep-2026, pedido usuario — "Vigencia [última
                   conexión] debe mostrarse acá también"): el backend ya
                   manda ing.vigencia (ver _construirIngresosRecientesUnificado,
                   Base.md) — se pinta solo si viene con valor. No se usa
                   ingStatHtml() para esto porque esa función pasa el
                   valor por fmtNum() (numérico); acá el valor ya es texto
                   de fecha formateado.
```


### Bloques // (script)

#### Línea original 891 (script)

```
    // Orden fijo de la Familia (Principal, Terna 2, Terna 3, Mini), NUNCA
    // alfabético — ver ordenClanIndex() en common.js. Se ordena ACÁ, antes
    // de asignar el índice "i" que decide qué insignia/rol le toca a cada
    // tarjeta, para que ambas cosas queden siempre sincronizadas aunque el
    // backend entregue los clanes en otro orden.
```

#### Línea original 1234 (script)

```
  // FIX (03-sep-2026, pedido usuario — "las semanas se superponían [las
  // etiquetas de eje]... rotar 90° el texto a la izquierda del eje x, o
  // 45°, tú decide"): con muchos miembros nuevos hay muchas semanas en el
  // eje X y las etiquetas ("dd/MM") chocaban entre sí en horizontal. Se
  // rotan -45° (ancladas por su extremo derecho, bajando hacia la
  // izquierda) y se sube PAD_B (44→68) para que quepan sin cortarse.
  // FIX (08-sep-2026, pedido usuario — "todas las gráficas deben indicar
  // el nombre de los ejes"): PAD_L (56→74) y PAD_B (68→84) suben de nuevo
  // para dejar espacio a los títulos fijos de los ejes ("Fecha" en X,
  // opts.ejeY en Y — ver los dos <text class="axis-title"> agregados al
  // final de esta función), sin invadir ni las etiquetas numéricas del
  // eje Y ni las fechas rotadas del eje X que ya vivían en ese margen.
```

#### Línea original 1263 (script)

```
  // FIX (04-sep-2026, pedido usuario — "todo debe venir con fecha, no
  // debería haber algo en formato S1/S2"): se calcula UNA vez por gráfica
  // el Map de fechas estimadas para las etiquetas viejas "Semana N" (ver
  // construirFechasEstimadasSemanasViejas más arriba) y se usa tanto en
  // las etiquetas del eje como en el tooltip de cada punto (más abajo).
```

#### Línea original 1270 (script)

```
  // Líneas verticales de referencia (inicio de año/temporada — pedido
  // usuario 07-sep-2026): esta gráfica es de granularidad SEMANAL (un
  // punto = una semana), así que NO se agrega línea de inicio de semana
  // (ver lineasTemporalesSvg() en common.js). La fecha de cada punto del
  // eje se obtiene de la propia etiqueta ("dd/MM/yyyy" real, o su fecha
  // estimada si es una etiqueta vieja "Semana N" — mismo Map ya calculado
  // arriba para las etiquetas del eje y el tooltip).
```

#### Línea original 1300 (script)

```
    // FIX (03-sep-2026, pedido usuario — "en las fechas que no haya
    // datos, baja con líneas punteadas a cero, así se evitan cortes en
    // las líneas y se puede distinguir si está ahí porque hizo 0 puntos
    // (con presencia en el clan) o estaba sin clan y no participó...
    // en los puntos donde no haya dato, no colorees el centro del
    // círculo, solo colorea los bordes"): antes, si faltaba una semana
    // intermedia, la línea simplemente se cortaba (sin trazo entre un
    // tramo y el siguiente), lo que en la práctica es indistinguible de
    // "no hay datos ahí" a simple vista y deja huecos raros en el
    // gráfico. Ahora, por cada hueco entre dos semanas con dato real, se
    // insertan puntos sintéticos en 0 (uno por semana faltante) y se
    // conecta todo con trazo punteado (.serie-line-dashed) en vez de
    // trazo sólido — el punto sintético se dibuja hueco (fill:none, solo
    // borde de color) para diferenciarlo de un 0 real reportado por el
    // backend (que si se dibuja sólido, como cualquier otro dato real).
```

#### Línea original 1332 (script)

```
    // FIX (04-sep-2026, mismo pedido — "todo debe venir con fecha"): el
    // tooltip también reemplaza "Semana N" por la fecha estimada (con
    // "≈" y una nota aparte), en vez de mostrar la etiqueta vieja sola.
```

#### Línea original 1347 (script)

```
  // Títulos de los ejes (pedido usuario 08-sep-2026): "Fecha" centrado
  // debajo de las etiquetas rotadas del eje X, y opts.ejeY (p.ej.
  // "Ataques"/"Puntaje"/"Barcos" — lo arma renderComparativaSemanal a
  // partir del título de cada tarjeta) girado -90° a la izquierda del eje Y.
```

#### Línea original 1405 (script)

```
      // Mismos campos que la tarjeta de "Ingresos recientes" (nombre, tag,
      // clan, fecha) — pedido usuario 07-sep-2026: "al acercar el mouse
      // debe verse información de ese registro según la información que
      // esté mostrando la tabla".
      // FIX (10-sep-2026, pedido usuario — "arriba debe decir el nombre de
      // la cuenta y su tag, abajo el clan y la cantidad de ataques, barcos
      // o fame"): orden invertido a como estaba (antes la cantidad iba
      // arriba en negrita y el nombre abajo tenue) — así primero se
      // identifica DE QUIÉN es el punto y después el dato en sí.
```

#### Línea original 1445 (script)

```
  // FIX (04-sep-2026, pedido usuario — "todo debe venir con fecha"): si el
  // eje trae alguna etiqueta vieja "Semana N" (convertida a fecha estimada
  // "≈dd/MM" por semanaLabelCorta), se agrega una nota una sola vez debajo
  // de las tres gráficas explicando el "≈" — mismo criterio que ya usan
  // otras notas al pie de esta página (no repetirla en cada tarjeta).
```

#### Línea original 1451 (script)

```
  // FIX (08-sep-2026, pedido usuario — "las gráficas deben indicar el
  // nombre de los ejes"): ejeY se arma tomando la primera palabra del
  // título de la tarjeta ("Ataques por semana" → "Ataques", "Puntaje por
  // semana" → "Puntaje", "Barcos por semana" → "Barcos"), así no hace
  // falta agregar un parámetro nuevo en cada llamado de más abajo.
```

#### Línea original 1476 (script)

```
    // webRoster = directorio actual de la Familia (misma fuente que usa
    // directorio.html), pedido en paralelo para cruzarlo contra
    // webIngresosRecientes — ver comentario del bloque de arriba.
```

#### Línea original 1498 (script)

```
    // Agrupar por clan y ordenar cada grupo alfabéticamente por nombre — el
    // PDF exige "por clan y luego por nombre". Los GRUPOS en sí NO se
    // ordenan alfabéticamente: usan el orden fijo de la Familia (Principal,
    // Terna 2, Terna 3, Mini) vía ordenClanIndex(), sin importar en qué
    // orden los haya mandado el backend (bug reportado: "el clan 2 sigue
    // apareciendo primero, mientras que el clan principal está apareciendo
    // tercero").
```

#### Línea original 1563 (script)

```
    // FIX (03-sep-2026, pedido usuario — "las etiquetas de los nombres
    // deben estar agrupadas por clan y luego orden alfabético de nombre
    // de jugador"): se reusa 'grupos' (ya agrupado por clan en el orden
    // fijo de la Familia y ordenado alfabéticamente dentro de cada clan,
    // ver comentario más arriba) en vez de pasar 'ingresos' tal cual
    // llegó del backend, así el orden de colores/leyenda de las gráficas
    // coincide exactamente con el de las tarjetas de arriba.
```


## guerra.html

### 19-sep-2026 — "Pronóstico de Hoy" fusionado con "Guerra de Hoy" (continuación de cada tarjeta)
Pedido usuario: el pronóstico se veía como una lista aparte y no se entendía
qué clanes enfrentaba cada clan Terna. Ahora cada tarjeta de "Guerra de Hoy"
continúa (debajo de la línea "X/Y atacaron hoy") con el clan y los rivales de
SU carrera, ordenados por fame actual, con puesto, fame, techo "Roster",
techo "Máx" y ataques de 200. La fila del clan propio va resaltada. La nota
que explicaba "solo roster"/"techo máximo" pasó a un pie bajo la grilla.
- Une cada rival con su clan Terna por `clanTernaTag` (o `clanTernaNombre`)
  en cada elemento de `clanes` de `webPronosticoGuerra`. **CONTRATO
  PENDIENTE (backend, `38_Pronostico_Guerra.gs`)**: si ningún rival trae ese
  campo, no hay forma de saber en qué carrera está cada uno; en ese caso todo
  queda como antes (tabla suelta "Pronóstico de Hoy") para no perder
  información. En cuanto el backend lo mande, la tabla suelta se oculta sola.
- `pintarPronosticoEnTarjetas()` corre dentro de `actualizarPuestosClanes()`,
  así que se repinta en cada `render()` (las tarjetas se recrean cada 60 s)
  y al llegar `webPronosticoGuerra` o `webClanInfo`, sin parpadeo.
- Rediseño de las filas (20-sep-2026, captura del usuario: "se ve
  desorganizado"): cada fila es #puesto | nombre | fame, una barra fina
  (fame actual sólida y hasta dónde podría llegar, tenue; misma escala dentro
  de la tarjeta) y una línea "Techo … · ataques". Se quitó la etiqueta
  "rival" de cada fila (el clan Terna va resaltado, el resto son sus rivales)
  y Roster/Máx pasan a un solo valor cuando coinciden, o a "roster–máx" si
  difieren. Las secciones de las 4 tarjetas (cabecera, puesto, números,
  barra, asistencia, pronóstico) quedan alineadas entre sí con `subgrid`
  (con `@supports`; sin soporte queda el layout anterior). Probado con
  Chromium en 1280 px y 390 px con datos simulados.
- Corrección de layout (20-sep-2026, captura del usuario): las filas del
  primer clan se salían de la tarjeta y cortaban la fame. Faltaba
  `min-width:0` en la cadena tarjeta -> continuación -> lista -> fila ->
  nombre (los nombres largos ensanchaban la fila). Además Roster/Máx van en
  la primera línea y los ataques siempre en la segunda, para que todas las
  filas midan igual entre tarjetas.
- Observación (resuelta el 20-sep-2026 en `38_Pronostico_Guerra.gs`): el
  techo Roster salía mayor que el Máx porque no respetaba los topes de 200
  ataques / 50 cuentas.

### 19-sep-2026 — Botones Jue–Dom: el panel "Puesto al cierre" se quedaba en "Cargando…"
Pedido usuario: al pulsar Jue/Vie/Sáb/Dom el panel no terminaba de cargar.
Con lo que se puede ver en el frontend hay dos causas y una tercera que solo
se puede descartar mirando el backend:
- `api.js` atiende las peticiones de a una (`_MAX_PETICIONES_SIMULTANEAS = 1`)
  y `webGuerraPuestosDia` entraba al FINAL de la cola, detrás de
  `webGuerraEnVivo` (lenta), sus recargas de cada 60 s y las demás cargas de
  la página. Se agrega `opts.prioridad` a `apiGet()` (y `prioridad` a
  `_encolarPeticion()`/`_fetchYParsear()`): el clic en un día pasa al frente
  de la cola. No interrumpe la petición que ya está en vuelo; sin
  `prioridad` todo se comporta como antes.
- `pintarPanelPuestosDia()` mostraba "Cargando…" tanto cuando la petición
  seguía en curso como cuando ya había respondido pero sin datos de ese día
  (ej. `dias` vacío o más corto que 4). Ahora distingue: sin respuesta →
  "Cargando… (puede tardar unos segundos)"; respuesta sin ese día → "Sin
  puesto registrado para este día."; fallo → "No se pudieron cargar…".
- Pendiente de verificar en `Base.md`: qué devuelve `webGuerraPuestosDia`
  para la semana vigente (la revisión de `Guerra_Logs` sigue pendiente).

### 19-sep-2026 — "Guerra de Hoy": cabecera de Directorio y puesto actual en la carrera
Pedido usuario: las tarjetas de "Guerra de Hoy" ya no muestran solo el nombre
del clan, sino la misma cabecera de las tarjetas de Directorio (insignia de
rol, escudo real, nombre y tag debajo). Solo cambia esa parte: los números,
la barra y el resto de la tarjeta siguen igual.
- `assets/js/features/clan-card.js`: la cabecera se separó de `clanCardHtml()`
  en `clanCardCabeceraHtml()`, que reutilizan Inicio, Directorio y esta
  página. La salida de `clanCardHtml()` es idéntica a la de antes (comparada
  carácter por carácter en 4 casos).
- `guerra.html` pide `webClanInfo` con la misma llamada y caché de 5 min que
  index/directorio, y la pide antes que `webGuerraEnVivo` para que las
  tarjetas nazcan ya con la cabecera y no salten de tamaño. Une cada tarjeta
  con su clan por nombre normalizado (NFC) y, si no coincide, por
  `ordenClanIndex()`. Si `webClanInfo` falla, queda solo el nombre.
- Puesto actual ("🏁 Puesto #2 de 5"): sale de `webPronosticoGuerra`
  (`puesto`/`clanesEnCarrera`, solo clanes propios). Ordena los clanes de
  `currentriverrace` por fame acumulada de la semana; los empates comparten
  puesto. No cuenta `repairPoints` ni la posición de los barcos. Solo en día
  de guerra; si el endpoint no responde, no se muestra.
- Pendiente (siguiente tanda): botones Jue–Dom con el puesto que cerró cada
  clan en cada día (`EndOfDayRank` de `Guerra_Logs`).

### 19-sep-2026 — Sección "Pronóstico de Hoy" conectada a `webPronosticoGuerra`
El backend ya tenía la acción `webPronosticoGuerra` (`38_Pronostico_Guerra.gs`,
ruta en `doGet` de `08_Web_Endpoints.gs`) pero ninguna página la consumía, y
además devolvía siempre "No hay datos de currentriverrace en caché": en una
ejecución web `CACHE_CLAN_DATA` está vacío. El backend ahora lee el checkpoint
de clanes que deja el bot en Drive (tope 70 min) y cachea 120 s. Esta página
pinta una tabla por clan (propios y rivales): fama actual, techo solo con el
roster, techo máximo (con cuentas de apoyo) y ataques usados de 200.
- Solo se pide en día de guerra (`ctx.esDiaGuerra`), sin `await` dentro de
  `cargar()`, con caché de `apiGet` de 2 min; el botón "Actualizar" fuerza dato
  fresco. No usa `staleIfError` a propósito: un pronóstico de "hoy" de otro día
  sería engañoso.
- Si el backend no responde o no hay checkpoint vigente, la sección queda
  oculta (o conserva lo último pintado); nunca rompe el resto de la página.
- Sin `aria-live`: la página se auto-refresca (ver B-7).

### 18-sep-2026 (refactor CSS, Fase 2 — tablas) — `.grid-hscroll-*`/`.table-scroll-oculta-nativa` unificados con `activarBarraScrollTabla()`
Pedido usuario, confirmando el criterio ya usado en el resto del sitio:
la barra de scroll de toda tabla debe ser la morada (arriba, abajo y
derecha), nunca la nativa gris del navegador. Las grillas de "Valores
diarios" y "Valores por temporada" (`.tbl-activos-grid`/
`.tbl-temporada-grid`) tenían su propia implementación hecha a mano —
`.grid-hscroll-top`/`.grid-hscroll-bottom` (barras sintéticas propias) +
`.table-scroll-oculta-nativa` (oculta la barra nativa) + la función
`enlazarScrollsHorizontales()` — construida el mismo día, en paralelo,
sin enterarse de que `activarBarraScrollTabla()` (assets/js/ui/tables.js)
ya resolvía exactamente lo mismo (barra superior sintética + inferior y
derecha nativas restyleadas en morado, vía `.scroll-morado`/
`.tabla-scroll-wrap` en `assets/styles.css`) para el resto de tablas del
sitio (Pendientes de Atacar, Inactivos, roster de Directorio, cuadros de
CR en admin.html, historial de perfil.html).

Se elimina el sistema propio: las tarjetas de clan de Activos/Temporada
pasan a usar el `<div class="table-scroll">` simple (sin
`table-scroll-oculta-nativa`, sin los divs `.grid-hscroll-top`/`-bottom`
en el HTML) y se les llama `activarBarraScrollTabla()` igual que a las
demás tablas de la página — se quitan `enlazarScrollsHorizontales()` y
las ~40 líneas de CSS de `.grid-hscroll-*`/`.table-scroll-oculta-nativa`,
sin comportamiento nuevo: mismo alto máximo (480px, mismo
`--tabla-scroll-alto` que ya usaban), misma barra morada en los 3 lados,
solo que ahora por el único camino que ya usa el resto del sitio.

### 18-sep-2026 — Helpers de filtro por letra y de scroll sincronizado consolidados en common.js
Revisión de código repetido entre páginas: `pintarFiltroLetraPendientes()`,
`pintarFiltroLetraGrid()` (acá) y `pintarFiltroLetraRoster()` de
directorio.html eran, en la práctica, la misma función tres veces — la
única diferencia real era el id del wrap, la variable de módulo de la
letra elegida y el callback de re-filtrado. Se reemplazan por
`pintarFiltroLetra(wrapId, letras, obtenerSel, fijarSel, onCambio)` en
`assets/common.js`, ya parametrizada igual que lo estaba
`pintarFiltroLetraGrid()` acá mismo (reusada para "Activos" y
"Temporada"). De paso se agrega `aria-label="Filtrar por letra X"` a cada
botón A-Z/#, que antes solo llevaba el texto visual de la letra.
`LETRAS_FILTRO_PEND` (acá) y `LETRAS_FILTRO` (directorio.html) eran
además el mismo array letra por letra, igual que `primeraLetraFiltro()`
— ambos se unifican también en `common.js`.

`enlazarScrollsHorizontales()` seguía acá (es específica de la estructura
`.ai-clan-card`/`.grid-hscroll` de esta página, con N barras por tarjeta),
pero su núcleo — sincronizar `scrollLeft` entre varios elementos con una
bandera para no entrar en loop de eventos `scroll` — es el mismo patrón
que directorio.html tenía escrito a mano para su propio par
topScroll/tableWrap. Se extrae ese núcleo a
`sincronizarScrollHorizontal(elementos)` en `common.js`, que ahora usan
ambas páginas.

También se agrega: el `setInterval(() => cargar(false), REFRESH_INTERVAL_MS)`
(cada 60s) seguía disparando aunque la pestaña estuviera en segundo plano
o el celular bloqueado. Se pausa con un listener de `visibilitychange`
mientras `document.visibilityState === 'hidden'` y se reanuda (con una
carga inmediata, sin esperar el intervalo completo) al volver a foco.
`setInterval(actualizarAgoText, 1000)` no golpea el backend (solo
refresca un texto relativo tipo "hace 3 min"), así que se deja corriendo
siempre.

No se tocaron, por ahora: `gestionarTabsClan()` (no tiene un duplicado
real en directorio.html — `renderClanTabs()` ahí es una función distinta,
más simple, sin la opción "Todos") ni el popover de filtro/orden por
columna (`abrirGridFiltroColumna()` acá vs `abrirFiltroColumna()` de
directorio.html) — comparten el mismo HTML/clases `rt-*` y buena parte de
la lógica, pero cada uno está entrelazado con un modelo de estado
distinto (`gridEstados[gridId]`, con varias tablas, acá; variables sueltas
de una sola tabla en directorio.html) y con funcionalidad que no es 1:1
(tipo fecha, columnas no ordenables, debounce del buscador). Fusionarlos
de un tirón tenía más riesgo de introducir un bug sutil que beneficio en
esta pasada; queda pendiente para una revisión aparte, con más tiempo
para probar cada caso.

### Línea original 62 (estilo)

```
 FIX (13-sep-2026, pedido usuario — "los márgenes de guerra de hoy son
     disparejos"): .stats no tenía justify-content, así que la fila de
     números quedaba pegada a la izquierda (flex-start por defecto). Como
     cada clan tiene una cantidad distinta de dígitos en Ataques/Fame/
     Barcos (ej. "174/85.900/0" vs "25/15.050/0"), el ancho total de esa
     fila variaba de tarjeta a tarjeta y dejaba un margen derecho de
     tamaño distinto en cada una — de ahí lo "disparejo". Centrando la
     fila dentro de la tarjeta, el margen queda simétrico (y visualmente
     parejo entre tarjetas) sin importar cuántos dígitos tenga cada valor. 
```

### Línea original 72 (estilo)

```
 FIX (04-sep-2026, pedido usuario — "no se entiende bien de dónde salen
     los [totales] ... Ataques, fame y barcos deberían estar alineados con
     los centros de sus números"): .stat no tenía text-align, así que el
     número grande (<b>) y su etiqueta (<span>) quedaban alineados a la
     izquierda del ancho del flex item (que toma el ancho del más largo de
     los dos) — con "FAME"/"703,900" o "ATAQUES"/"822" el más corto quedaba
     visualmente descentrado respecto al otro. text-align:center centra
     ambos sobre el mismo eje sin depender de cuál de los dos sea más
     largo, para los 3 (ataques/fame/barcos).
  
```

### Línea original 108 (estilo)

```
 FIX (09-sep-2026, pedido usuario — "barra de navegación al inicio y
     final de cada cuadrícula si hay que desplazarse horizontalmente"):
     mismo problema que ya se había resuelto para el roster de Directorio
     (ver .roster-topbar/.roster-top-scroll en directorio.html) — el
     scroll horizontal nativo de .table-scroll funciona, pero no hay
     ninguna pista visual de que existe (la barra de scroll del sistema
     puede ser invisible hasta que se pasa el mouse, sobre todo en temas
     oscuros), y con tablas que pueden crecer en ancho con el tiempo
     (Cuadrícula de Temporada suma una columna por cada semana jugada) esa
     pista visual importa cada vez más. .grid-hscroll es una franja fina
     y siempre visible, con su propio overflow-x:auto sincronizado por JS
     con el scroll real de la tabla (ver enlazarScrollsHorizontales() más
     abajo); se coloca UNA arriba Y OTRA abajo de cada tabla (a diferencia
     del roster, que solo la tiene arriba) para que quede a mano sin
     importar desde dónde se empiece a leer la cuadrícula. Siempre se
     renderiza, incluso si hoy la tabla entra sin necesitar scroll, para
     que ya esté lista el día que la cuadrícula crezca. 
```

### Línea original 133 (estilo)

```
 FIX (08-sep-2026, pedido usuario — "La cuadrícula de ataques
     pendientes también se debe centrar [...] los nombres no se centran,
     se alinean a la izquierda pero el encabezado sí"): esta tabla venía
     usando el th{text-align:left} genérico de styles.css (pensado para
     el resto de tablas del sitio) para las 3 columnas por igual; ahora
     se centran los 3 encabezados Y los valores de Clan/Faltantes, y solo
     el nombre de cada fila (.col-nombre) queda a la izquierda — mismo
     criterio que .col-jugador en las cuadrículas de Activos/Temporada
     de más abajo. 
```

### Línea original 142 (estilo)

```
 FIX (16-sep-2026, pedido usuario — "un solo tamaño de encabezado para
     todas las columnas y un solo tamaño de letra, revisa en todos los
     paneles" y luego "baja el tamaño de letra de las filas de valores a
     13 para todos, un solo tamaño para filas de valores y un solo tamaño
     para encabezados"): sin estos font-size, el <th> heredaba el 11px
     genérico de table th y el <td> el 14px genérico de table{} (ambos en
     styles.css) — se fijan acá en 13px/13px para igualar exactamente a
     .roster-table (directorio.html) e .inactivos-table (styles.css). 
```

### Línea original 153 (estilo)

```
 FIX (13-sep-2026, pedido usuario — "agregar N° y el tag del jugador a
     la izquierda del nombre" / "columna Jugador (Nom_Multi) y Préstamo,
     visibles solo para admins" / "íconos de royaleapi y cwstats a la
     derecha de faltantes"): columnas nuevas de la tabla de Pendientes.
     .col-n queda centrada (mismo criterio que Rango/Faltantes, es un
     número de fila); .col-tag va a la izquierda, en mono y algo apagado
     (mismo estilo que el tag junto al nombre en "Participación de Hoy",
     ver _liCuenta() más abajo) porque es un dato secundario de
     identificación, no el foco de la fila. .col-perfil-icons alinea sus
     2 íconos en fila, centrados, sin texto (mismo SVG ICONO_ROYALEAPI/
     ICONO_CWSTATS que ya usa perfil.html). 
```

### Línea original 188 (estilo)

```
 FIX (16-sep-2026, pedido usuario — "ajusta el tamaño de los botones
     selectores por letra, en Directorio aparecen en una fila y en guerra
     en dos, debe ser una"): esta regla vivía ANTES que .tab-btn en el
     CSS — con la misma especificidad (una sola clase cada una), el
     padding:7px 14px de .tab-btn (declarado después) le ganaba al
     padding:6px 10px, más angosto, de acá, así los botones A-Z/# salían
     igual de anchos que un .tab-btn de clan normal y no cabían los ~28 en
     una sola fila. En directorio.html .letra-btn SÍ va después de
     .tab-btn (por eso ahí se ve bien) — se mueve esta regla al mismo
     lugar, después de .tab-btn.active, para igualar el orden y que el
     padding angosto se aplique de verdad. 
```

### Línea original 202 (estilo)

```
 FIX (04-sep-2026, pedido usuario — "se debe agregar botones para
     copiar los mensajes de guerra pero visibles solo para los admin").
     FIX (05-sep-2026, pedido usuario — "en Guerra (lista de pendientes)
     solo hay que poner el mismo botón, pero ya no se va a mostrar todo el
     texto, solo el botón de copiar, así que debería agregar información
     sobre el clan"): ya no es una sección aparte con tarjetas (label +
     botón genérico "Copiar"); ahora es una fila compacta de botones
     integrada arriba de la tabla de "Pendientes de Atacar" (ver
     #msjGuerraWrap dentro de #pendSection más abajo), y el nombre del clan
     va DENTRO del texto de cada botón (no hay tarjeta/label aparte donde
     mostrarlo). Sigue sin pintarse nada si no hay sesión de admin activa
     (esAdminLogueado()) — ver cargarMensajesGuerraSiAdmin(). 
```

### Línea original 223 (estilo)

```
     FIX (12-sep-2026, pedido usuario — por error esta sección había
     quedado también duplicada en directorio.html; la versión final pedida
     ("retira lo de cuentas reservadas y reemplazables... que se quede
     solo en Guerra") es esta de acá: el conteo de cada columna va junto a
     su encabezado ("Reservadas (26)"), nunca en una línea aparte por
     clan; cada cuenta reservada muestra sus ataques pendientes hoy (4 -
     ataques ya usados hoy); y las reservadas se subagrupan, dentro de
     cada clan, en "Con ataques pendientes" (1-3) y "Sin ataques
     pendientes" (0) — ver _listaCuentasHtml()/renderParticipacionHoyGuerra()
     más abajo en el <script>. Reemplaza a las clases .ph-* que tenía esta
     misma sección antes. 
```

### Línea original 263 (estilo)

```
 FIX (05-sep-2026, pedido usuario — "panel tipo hoja Control, con datos
     de Directorio, priorizando las cuadrículas"): sección nueva y PÚBLICA
     (no requiere sesión de admin). Reutiliza las mismas clases .ai-cell y
     .ai-total de abajo para no duplicar estilos — mismo criterio visual
     que Control (0 = tenue, 1-3 = dorado, 4 = verde). Arranca oculta y
     solo se muestra si el backend manda al menos un clan con Activos (ver
     render()).
     FIX (05-sep-2026, pedido usuario — "falta Puntaje (fame) y barcos, que
     también está en la hoja Control [...] los clanes no están en el orden
     establecido [...] falta centrar los encabezados con sus datos [...]
     Mejor dentro del primer cuadro, en cada clan, primero escribe las
     filas de los activos y luego una sección para inactivos"): esta MISMA
     tarjeta por clan ahora también recibe, al final, el bloque de
     Inactivos (antes era la sección aparte #aportesInactivosSection,
     debajo de "Pendientes de Atacar" — ELIMINADA, ver
     cargarAportesInactivosSiAdmin() más abajo). El bloque de Inactivos
     sigue siendo solo-admin (mismo esAdminLogueado() de antes); si no hay
     sesión de admin, ".ai-inactivos-wrap" simplemente queda vacío dentro
     de la tarjeta (ver regla ":empty" más abajo) y nadie nota que existe. 
```

### Línea original 297 (estilo)

```
 FIX (05-sep-2026, pedido usuario — "Puntaje y Barcos son megacategorías
     igual que Ataques"): Puntaje y Barcos NO son una columna con un único
     valor por jugador — son, igual que Ataques, un grupo de columnas
     J/V/S/D + Total (ver la captura de la Hoja Control: "Puntaje" tiene su
     propio Sem 1/Sem 2/Sem 3 con J/V/S/D/T.1/T.2/T.3). Por eso el <thead>
     de la tabla de Activos ahora tiene 2 filas: una fila superior con las
     3 megacategorías (Ataques/Puntaje/Barcos, colspan=5 cada una) y una
     fila inferior con J/V/S/D/Total repetido bajo cada una. Estas clases
     dan un tinte de fondo sutil a cada grupo de columnas (encabezado Y
     celdas) para que se puedan distinguir de un vistazo con tantas
     columnas juntas — mismos colores que ya usa el resto del sitio
     (violeta=tema base, dorado=Puntaje/Fame, plata=Barcos). 
```

### Línea original 313 (estilo)

```
 FIX (09-sep-2026, pedido usuario — "falta centrar bien las cuadrículas"):
     el <th colspan> de cada megacategoría (Ataques/Puntaje/Barcos) se
     centraba con el text-align:center genérico de más abajo, pero ESE
     centrado es respecto al ancho TOTAL de la celda combinada (colspan),
     no respecto a lo que realmente se ve en pantalla. Con muchas columnas
     (sobre todo en la Cuadrícula de Temporada, que suma una columna por
     cada semana jugada) esa celda combinada es mucho más ancha que la
     tarjeta, así que "ATAQUES"/"PUNTAJE"/"BARCOS" terminaba centrado muy
     lejos hacia la derecha, fuera del área visible sin hacer scroll hasta
     ahí — la fila de arriba se veía en blanco. .ai-grp-label envuelve el
     texto y usa position:sticky con left/right en 0 + margin:auto: eso lo
     mantiene centrado dentro de la porción de la celda que esté visible
     en cada momento del scroll horizontal (nunca se sale de los límites
     de su propia columna combinada), en vez de centrarse una sola vez
     sobre el ancho total invisible. 
```

### Línea original 329 (estilo)

```
 FIX (05-sep-2026): encabezados centrados sobre sus datos. El <th>
     global de styles.css es text-align:left (para el resto de tablas del
     sitio, ej. "Pendientes de Atacar"); acá se centra todo salvo la
     columna "Jugador" (marcada con .col-jugador) — con el <thead> de 2
     filas de arriba, ":not(:first-child)" ya no alcanza (la fila inferior
     de J/V/S/D/Total no tiene la celda "Jugador" porque esta usa
     rowspan="2", así que su primer <th> real SÍ sería :first-child de esa
     fila y quedaría descentrado sin esta clase explícita).
     FIX (08-sep-2026, pedido usuario — "Se debe centrar solo los valores
     de las cuadrículas y todos los encabezados, los nombres no se
     centran, se alinean a la izquierda pero el encabezado sí"): antes
     ".col-jugador" dejaba el encabezado "Jugador" TAMBIÉN a la
     izquierda, junto con los nombres; ahora el <th> "Jugador" se centra
     igual que el resto de encabezados (ya no tiene excepción propia) y
     SOLO el <td> con el nombre de cada fila queda a la izquierda.
     FIX (09-sep-2026, pedido usuario — "solo las columnas que traigan
     Nom_Multi usan el encabezado Jugador, si el valor es el nombre de la
     cuenta, el encabezado debe ser 'Nombre'"): esta columna (clase
     .col-jugador, nombre de clase sin cambios para no tocar el resto de
     este CSS) trae el nombre de cuenta crudo (DC.NOMBRE/GC.NOMBRE en el
     backend), NUNCA Nom_Multi -- su encabezado visible pasa de "Jugador" a
     "Nombre" en las 3 tablas que la usan (Activos, Temporada, Inactivos)
     para reflejar correctamente el dato que realmente muestra. 
```

### Línea original 352 (estilo)

```
 FIX (08-sep-2026, pedido usuario — "SEM y los número no deben estar
     partidos"): con tantas columnas semanales (Sem 1...Sem 5 x 3
     megacategorías + Resumen), cada columna queda angosta y el navegador
     partía "Sem 1" en dos líneas ("Sem" arriba, "1" abajo) al llegar al
     espacio entre palabra y número. nowrap fuerza que cada encabezado
     quede en una sola línea — si no entra, ya existe scroll horizontal
     propio de la tabla (.table-scroll) para eso, en vez de partir texto. 
```

### Línea original 360 (estilo)

```
 FIX (16-sep-2026, pedido usuario — "un solo tamaño de encabezado para
     todas las columnas y un solo tamaño de letra, revisa en todos los
     paneles" y luego "baja el tamaño de letra de las filas de valores a
     13 para todos, un solo tamaño para filas de valores y un solo tamaño
     para encabezados"): sin estos font-size, el <th> quedaba en el 11px
     genérico y el <td> en el 14px genérico (ambos de table/th en
     styles.css) — se fijan acá en 13px/13px para igualar exactamente a
     .roster-table (directorio.html) e .inactivos-table (styles.css). 
```

### Línea original 385 (estilo)

```
 FIX (05-sep-2026, pedido usuario — "haz una sección como la hoja
     Control_2... 'Tipo Control_2' muestra valores SEMANALES de TODA la
     temporada, mientras que 'Tipo Control' es de valores DIARIOS para la
     semana actual"): sección NUEVA #controlTemporadaSection, debajo de
     Cuadrícula de Activos — mismo criterio visual (tarjeta por clan,
     3 megacategorías Ataques/Puntaje/Barcos con .ai-grp-atq/pje/brc) pero
     con una columna POR SEMANA de guerra ya jugada en la temporada (en
     vez de las 4 fijas J/V/S/D) + 2 columnas de Resumen (valor + %) por
     megacategoría al final. Arranca oculta, igual que
     #controlActivosSection, hasta que el backend mande
     data.controlTemporadaPorClan (ver render() más abajo). 
```

### Línea original 413 (estilo)

```
 ---------- Filtro/orden por columna estilo "hoja de cálculo" (10-sep-2026,
     pedido usuario — "a las cuadrículas de valores semanales y diarios
     agregales botones de filtro, con las mismas funciones que la hoja
     directorio pero en la segunda fila de encabezados, para no afectar a
     las megacategorías Ataques/Puntaje/Barcos"): mismo widget (ícono de
     embudo + desplegable con orden/comparación/checklist) ya usado en la
     tabla "Directorio por clan" de directorio.html — CSS traído tal cual
     de ahí (mismas clases rt-*) para que ambas páginas se vean y se
     sientan igual. Los botones solo se agregan a los <th> de la SEGUNDA
     fila del <thead> (J/V/S/D/Total en Valores diarios, Sem 1..N/Total o
     Prom/% en Valores semanales) — los <th colspan> de la primera fila
     (Ataques/Puntaje/Barcos) no llevan botón, ver thFiltroGrid()/
     filaSubEncabezadosMega()/filaSubEncabezadosSemanas() más abajo. 
```

### Línea original 553 (HTML)

```
 FIX (03-sep-2026, pedido usuario — "Pendientes de Atacar: ocultar
         la sección cuando no es día de guerra (hoy igual se muestra con
         '1 jugador(es)' y la fila 'No es día de guerra')"): la sección
         siempre se pintaba sin importar ctx.esDiaGuerra, así que en día de
         entrenamiento se veía una tabla con una fila "placeholder" que
         confunde en vez de información real de ataques pendientes. Ahora
         esta sección se oculta cuando no es día de guerra — ver
         toggle en render() (id="pendSection").
         FIX (04-sep-2026, pedido usuario — orden del Panel de Guerra):
         "Miembros Activos por Clan" pasa a mostrarse ANTES que "Pendientes
         de Atacar" (orden pedido: Guerra de hoy / Miembros activos /
         Pendientes de atacar) — antes iba al revés.
         FIX (10-sep-2026, pedido usuario — orden del Panel de Guerra):
         "Pendientes de Atacar" y "Participación de Hoy (Reemplazos)" pasan
         a mostrarse ENTRE "Miembros Activos por Clan" y "Valores diarios"
         (antes iban después de "Log de Guerra"). 
```

### Línea original 574 (HTML)

```
 FIX (04-sep-2026 / 05-sep-2026, pedido usuario — ver comentario
           completo en el <style> de arriba y en cargarMensajesGuerraSiAdmin()
           más abajo): fila de botones "Copiar" por clan (+ Chat General),
           visible solo para admins logueados, integrada acá mismo (antes
           era una sección aparte más arriba en la página). Arranca vacía;
           si no hay sesión de admin o no hay contenido, se queda vacía y
           no ocupa espacio. 
```

### Línea original 588 (HTML)

```
 FIX (13-sep-2026, pedido usuario — "botones clickeables de letras
           para filtrar el nombre por cada letra o # para números y
           cualquier otro carácter"): fila A-Z + # debajo de las pestañas de
           clan, se pinta una sola vez (ver pintarFiltroLetraPendientes()) y
           solo oculta/muestra filas ya pintadas en #pendWrap -- no vuelve a
           pedir nada al backend, mismo criterio que gestionarTabsClan(). 
```

### Línea original 598 (HTML)

```
         FIX (12-sep-2026, pedido usuario): versión final de esta sección
         (antes duplicada por error en directorio.html) — ver comentario
         completo en el <style> de arriba y en
         renderParticipacionHoyGuerra() más abajo en el <script>. 
```

### Línea original 623 (HTML)

```
 FIX (05-sep-2026, pedido usuario — "Se debe agregar un panel, tipo
         hoja Control, con algunos datos de la sección que viene de la hoja
         Directorio pero debe priorizar las cuadrículas"): sección NUEVA y
         aparte de "Miembros Activos por Clan" de arriba (esa solo muestra
         un conteo/barra por clan) — acá se pinta la cuadrícula completa
         Jugador/J/V/S/D/Total/Puntaje/Barcos de CADA miembro Activo de
         Directorio, agrupado por su clan. PÚBLICA (visible para todos, sin
         gate de admin, igual que el resto del contenido de esta sección de
         la página) y se listan TODOS los Activos aunque tengan 0/0/0/0 —
         mismo criterio que la cuadrícula real de la hoja Control. Ver
         render() más abajo y _getControlActivosGridPorTemporada()
         (08_Web_Endpoints.gs).
         FIX (05-sep-2026, pedido usuario — "solo consideró ataques, falta
         Puntaje (fame) y barcos [...] los clanes no están en el orden
         establecido [...] Mejor dentro del primer cuadro, en cada clan,
         primero escribe las filas de los activos y luego una sección para
         inactivos"): 1) la tabla de cada tarjeta suma las columnas Puntaje
         y Barcos (además de J/V/S/D/Total de ataques, que ya existían);
         2) las tarjetas se ordenan con ordenClanIndex() (assets/common.js)
         en vez de alfabético; 3) cada tarjeta de clan ahora también carga,
         debajo de la tabla de Activos, el bloque de Inactivos (solo-admin
         — ver cargarAportesInactivosSiAdmin() más abajo), en vez de vivir
         en una sección aparte debajo de "Pendientes de Atacar".
         FIX (09-sep-2026, pedido usuario — "reestructurar, ya no es solo
         semana actual, sino 'Valores diarios' [...] añade un selector de
         año [...] selector de temporada [...] y el tercero es el selector
         de semana [...] por defecto se debe seleccionar el año, temporada
         y semana más recientes disponibles"): la sección se renombra de
         "Cuadrícula de Activos (Semana Actual)" a "Valores diarios" y el
         único <select> de semana (limitado a la temporada vigente) se
         reemplaza por 3 selectores encadenados -- año, temporada (mes) y
         semana -- que cubren CUALQUIER combinación con datos, no solo la
         temporada en curso. Base.md ya manda data.valoresDiariosSelectores
         ({anios, temporadasPorAnio, semanasPorTemporada, porDefecto}) y
         data.valoresDiariosPorSemana ({[temporada]:{[sectionIndex]: mismo
         shape que antes traía controlActivosSemanaActual}}) -- ver
         pintarSelectoresValoresDiarios() más abajo, que ya los consume.
         Los 3 <select> arrancan ocultos por CSS y solo cuando esos 2
         campos no llegan (ej. Web App vieja) se quedan así en vez de
         romper. 
```

### Línea original 672 (HTML)

```
 FIX (07-sep-2026, pedido usuario — "que se siga mostrando los
           valores de la última guerra mientras se esté en entrenamiento
           [...] hasta el cambio de periodIndex [...] y se debe actualizar
           recién cuando empiece la guerra del jueves"): aviso visible solo
           cuando esta cuadrícula está mostrando la foto guardada de la
           última guerra en vez de datos en vivo de entrenamiento, Y el
           usuario no eligió manualmente otra semana -- ver rama `else`
           dentro de render() más abajo. 
```

### Línea original 681 (HTML)

```
 FIX (07-sep-2026, pedido usuario — "botones horizontales para
           seleccionar el clan"): pestañas tipo .tabs-row/.tab-btn (mismo
           patrón ya usado en "Log de Guerra") que filtran, sin volver a
           pedir datos, cuál(es) tarjeta(s) .ai-clan-card se muestran.
           Arranca vacío; gestionarTabsClan() (más abajo) la llena en cuanto
           hay al menos una tarjeta de clan pintada en #controlActivosWrap. 
```

### Línea original 698 (HTML)

```
 FIX (05-sep-2026, pedido usuario — "haz una sección como la hoja
         Control_2, solo por referencia visual, ya que la hoja Control_2
         trae datos de otra parte y debes basarte en los csv, igual que en
         la sección tipo hoja Control... 'Tipo Control_2' muestra valores
         semanales de toda la temporada, mientras que 'Tipo Control' es de
         valores diarios para la semana actual. Va debajo de 🗂️ Cuadrícula
         de Activos"): sección PÚBLICA (sin gate de admin, mismo criterio
         que la de arriba), una tarjeta por clan con Jugador +
         Ataques/Puntaje/Barcos, pero cada megacategoría trae una columna
         por SEMANA de guerra ya jugada en la temporada actual (sacadas de
         la hoja Guerra/Backup_Guerra.csv — misma fuente que ya usa
         _webHistorialGuerraComparador() para el Cara a cara, NO la hoja
         Control_2 real de la Sheet, que arma sus semanas con datos de otra
         parte fuera del alcance de este sitio) + Resumen (Total para
         Ataques/Barcos, Prom para Puntaje) y % al final de cada una.
         FIX (09-sep-2026, pedido usuario — "🗓️ Cuadrícula de Temporada
         (Semanal) también puede cambiar de nombre si es apropiado, se le
         debe añadir el selector de año y reemplazar el selector de
         temporada por el de mes, tal como se definió para la otra
         cuadrícula"): la sección se renombra a "Valores semanales"
         (pareja de "Valores diarios" de arriba) y el único <select> de
         temporada se reemplaza por 2 selectores encadenados -- año y
         temporada (mostrada como mes) -- mismo patrón visual y de datos
         que "Valores diarios" (año/temporada de
         data.controlTemporadaSelectores, ver
         _getControlTemporadaSelectores(), 08_Web_Endpoints.gs), sin nivel
         de semana porque esta cuadrícula siempre muestra las 5 semanas de
         la temporada elegida juntas. Ver render() más abajo —
         data.controlTemporadaPorClan/data.controlTemporadaSemanas siguen
         siendo la temporada vigente, y data.controlTemporadaPorTemporada
         sigue trayendo el resto de temporadas (sin cambios en esos 3
         campos, solo en cómo se eligen). 
```

### Línea original 748 (HTML)

```
 FASE 13 punto 1 del plan de cambios web (07-sep-2026) -- vista (a)
         del tab "Log" de guerra de RoyaleAPI (royaleapi.com/clan/<TAG>/war/log),
         recreada con datos propios: histórico Temporada -> Semana ->
         Rank/Boat/Trophy de cada clan Terna, leído de la hoja Guerra_Logs
         (acumulativa, nunca se purga -- cubre TODAS las temporadas, no
         solo la actual). Sección PÚBLICA (sin gate de admin, mismo
         criterio que "Cuadrícula de Activos"/"Cuadrícula de Temporada" de
         arriba: son datos de guerra de los propios clanes Terna, no
         información sensible). Se carga UNA sola vez al entrar a la
         página (ver cargarGuerraLog() más abajo) -- es histórico
         acumulado, no un dato en vivo, así que no necesita refrescarse
         cada REFRESH_INTERVAL_MS como el resto del dashboard. Arranca
         oculta; si el backend no devuelve ningún clan con historial (o la
         carga falla), se queda oculta sin ocupar espacio ni romper el
         resto de la página pública. 
```

### Línea original 781 (HTML)

```
 FIX (31-ago-2026, pedido usuario — "la sección negra tiene el
         texto muy pegado al contenedor, debe tener cierto margen"): este
         footer traía style="padding:0" que anulaba el padding:0 24px de
         .wrap (única página del sitio que lo hacía), pegando el texto al
         borde izquierdo/derecho. Se quita el override y queda igual que
         el footer de todas las demás páginas. 
```

### Línea original 810 (script)

```
// FIX (07-sep-2026, pedido usuario — filtros de clan/semana/temporada de
// las cuadrículas "Activos" y "Temporada"): estado de los selectores,
// a nivel de módulo para que sobrevivan a cada repintado de render()
// (cada REFRESH_INTERVAL_MS). null = "vigente" (semana/temporada). Ver
// pintarSelectoresValoresDiarios() y pintarSelectoresControlTemporada() más abajo.
// FIX (07-sep-2026, pedido usuario — "mueve el botón de Todos a la
// derecha de Mini Ternas para que cargue por defecto el clan principal en
// las dos secciones"): clanSeleccionadoActivos/Temporada ya NO usan null
// para representar "Todos" — null ahora significa exclusivamente "sin
// elegir todavía" y gestionarTabsClan() lo resuelve cayendo al primer clan
// (Principal) en vez de a Todos. "Todos" pasa a ser un valor propio y
// explícito, TAB_TODOS, que solo se fija cuando el usuario hace clic en
// ese botón. Ver gestionarTabsClan() más abajo para el detalle completo.
```

### Línea original 833 (script)

```
// FIX (13-sep-2026, pedido usuario — "botones clickeables de letras para
// filtrar el nombre"): estado del filtro por letra de Pendientes, a nivel
// de módulo para que sobreviva a cada repintado de render() (mismo
// criterio que clanSeleccionadoPend de arriba). null = "todas las letras"
// (sin filtrar). Ver pintarFiltroLetraPendientes()/aplicarFiltroLetraPendientes()
// más abajo.
```

### Línea original 840 (script)

```
// FIX (13-sep-2026, pedido usuario — "agrega los botones de letras en
// 🗂️ Valores diarios y 🗓️ Valores semanales"): mismo patrón/estado que
// letraSeleccionadaPend de arriba, uno por sección (cada cuadrícula tiene
// su propia tabla por clan, así que el filtro es independiente entre
// Activos y Temporada). Ver pintarFiltroLetraGrid()/letraFiltroDeGridId()
// más abajo, que generalizan pintarFiltroLetraPendientes() para poder
// aplicarse sobre varias tablas (una por clan) a la vez.
```

### Línea original 849 (script)

```
// FIX (09-sep-2026, pedido usuario — selectores de año/temporada(mes)/
// semana para "Valores diarios"): antes solo existía
// sectionIndexSeleccionadoActivos (semana dentro de la temporada vigente);
// ahora se agregan anioSeleccionadoActivos/temporadaSeleccionadaActivos
// para poder elegir CUALQUIER combinación con datos. Los 3 arrancan en
// null ("todavía no se aplicó ningún default") y pintarSelectoresValoresDiarios()
// (más abajo) los fija al año/temporada/semana más recientes disponibles
// la primera vez que llegan data.valoresDiariosSelectores.
```

### Línea original 907 (script)

```
    // FIX (30-ago-2026, pedido usuario — revisión de seguridad): antes esto
    // pegaba directo a ?dashboard=json con un token de administradores
    // (fm7qterna9x) hardcodeado acá mismo, visible para cualquiera con "Ver
    // código fuente" de esta página PÚBLICA. Ahora usa apiGet() (mismo
    // WEB_MEMBER_TOKEN de solo-lectura que ya usan index.html/directorio.html/
    // etc., ver assets/common.js) contra el nuevo endpoint webGuerraEnVivo
    // (34_Web_API.gs), que devuelve exactamente los mismos datos.
```

### Línea original 930 (script)

```
 * FIX (05-sep-2026, pedido usuario — "los inactivos estaban trayendo solo
 * la categoría ataques, faltaba puntaje y barcos"): antes vivían como
 * const LOCALES dentro de render() (solo para la Cuadrícula de Activos).
 * Se hoistean a nivel de módulo para que cargarAportesInactivosSiAdmin()
 * (más abajo) pueda pintar el mismo bloque de 3 megacategorías
 * (Ataques/Puntaje/Barcos) para Inactivos sin duplicar esta lógica.
 
```

### Línea original 940 (script)

```
 * FIX (10-sep-2026, pedido usuario — filtro/orden por columna en la
 * segunda fila de encabezados): se agrega el 4° parámetro `keyPrefix`
 * (opcional, ej. 'atq'/'pje'/'brc') SOLO para que cada <td> lleve
 * data-col="{keyPrefix}-j|v|s|d|total" + data-raw="{valor crudo}" — así
 * el widget genérico de filtro (gridFiltroAplicar()/gridFiltroColumnas()
 * más abajo) puede encontrar la celda de cada columna y su valor sin
 * volver a tocar los datos originales. Si no se pasa keyPrefix (llamadas
 * ya existentes, ej. el bloque de Inactivos) el comportamiento no cambia
 * en nada: ningún data-col/data-raw, mismo HTML de siempre.
 
```

### Línea original 965 (script)

```
 * array), más las 2 columnas de Resumen al final. FIX (17-sep-2026): el
 * backend NUNCA manda un campo `resumen` -- manda `megacat.total`
 * (Ataques/Barcos) o `megacat.prom` (Puntaje), más `megacat.pct`. Esta
 * función normaliza ambos nombres a una sola variable local `resumen`
 * para pintar la columna, sin importar cuál mandó el backend. conColor=true aplica el mismo semáforo
 * ai-cell-zero/part/full que usa Ataques en la Cuadrícula de Activos
 * (0/parcial/16); Puntaje y Barcos van sin semáforo, igual que en esa
 * tabla.
 
```

### Línea original 988 (script)

```
  // FIX (17-sep-2026, pedido usuario -- Total/Prom siempre en 0 en
  // "Valores semanales"): _getControlTemporadaPorClan() (20_Control2_
  // GuerraSemanal.gs) nunca devuelve un campo `resumen` -- devuelve
  // `total` para Ataques/Barcos y `prom` para Puntaje (ver docblock de esa
  // función). Esta celda leía `megacat.resumen`, que siempre es
  // `undefined`, así que la columna Total/Prom quedaba en 0 sin importar
  // los datos reales. Se usa `??` (no `||`) para no pisar un total/prom
  // que legítimamente sea 0.
```

### Línea original 1010 (script)

```
 =========================================================================
 * FIX (10-sep-2026, pedido usuario — "a las cuadrículas de valores
 * semanales y diarios agregales botones de filtro, con las mismas
 * funciones que la hoja directorio pero en la segunda fila de
 * encabezados"): widget genérico de filtro/orden por columna, calcado del
 * de "Directorio por clan" (directorio.html, ver ROSTER_COLUMNAS/
 * abrirFiltroColumna() ahí) pero generalizado para poder colgarse de
 * CUALQUIER tabla de esta página (hay una tabla POR CLAN, tanto en
 * Valores diarios como en Valores semanales) en vez de una sola tabla
 * global. Cada tabla se identifica con un `gridId` propio (ej.
 * "activos:Terna 2", "temporada:Mini Ternas") — el estado de filtro/orden
 * de cada una vive aparte en `gridEstados[gridId]` y SOBREVIVE a los
 * refrescos automáticos (REFRESH_INTERVAL_MS, ver cargar()) porque
 * inicializarGridFiltro() se llama de nuevo en cada render() y reusa el
 * estado ya guardado en vez de reiniciarlo.
 *
 * Cada "columna" de este widget es un objeto { key, raw(fila) } — `raw`
 * es una función que, dado el objeto de datos de una fila (el mismo `f`
 * que ya arma celdasMegacategoria()/celdasSemanas()), devuelve el valor
 * numérico crudo de esa columna. columnasActivosDef()/columnasTemporadaDef()
 * más abajo arman esa lista para cada tabla; los <td> ya traen ese mismo
 * valor en data-raw (ver dc() dentro de celdasMegacategoria/celdasSemanas)
 * así que no hace falta volver a calcularlo al filtrar.
 * ========================================================================= 
```

### Línea original 1131 (script)

```
 * renderFilaTemporada más abajo). FIX (13-sep-2026, pedido usuario —
 * "agrega los botones de letras en Valores diarios y Valores semanales").
 
```

### Línea original 1147 (script)

```
  // FIX (13-sep-2026, pedido usuario): además de los filtros numéricos por
  // columna (estado.filtros), cada fila también debe pasar el filtro por
  // letra de la sección (si hay alguno elegido) para que ambos filtros se
  // puedan combinar sin pisarse -- ver letraFiltroDeGridId() arriba y
  // pintarFiltroLetraGrid() más abajo, que dispara este mismo chequeo al
  // hacer clic en una letra (sin volver a pedir nada al backend).
```

### Línea original 1326 (script)

```
 * FIX (07-sep-2026, pedido usuario — "botones horizontales para
 * seleccionar el clan" en Activos y en Temporada): botonera .tabs-row/
 * .tab-btn (mismo patrón visual ya usado en "Log de Guerra") que agrega un
 * botón por cada clan que YA tiene una tarjeta .ai-clan-card pintada
 * dentro de `wrapId` (data-clan de cada tarjeta) + "Todos" y, al hacer
 * clic, solo oculta/muestra tarjetas ya existentes en el DOM -- no vuelve
 * a pedir nada al backend. Se reconstruye cada vez que cambia el set de
 * tarjetas visibles (cada render() y, en Activos, también cuando
 * cargarAportesInactivosSiAdmin() agrega una tarjeta nueva para un clan
 * sin Activos) para no dejar afuera ningún clan nuevo, y conserva la
 * selección vigente entre repintados -- si el clan seleccionado deja de
 * tener tarjeta (ej. cambia el orden o ya no tiene datos esta semana),
 * cae al default de abajo (clan Principal) en vez de dejar la cuadrícula
 * vacía por error.
 *
 * FIX (07-sep-2026, pedido usuario — "mueve el botón de Todos a la
 * derecha de Mini Ternas para que cargue por defecto el clan principal en
 * las dos secciones"): dos cambios sobre la versión anterior:
 *   1) El botón "Todos" ahora se pinta AL FINAL de la fila (después del
 *      último clan, ej. Mini Ternas), no al principio -- `clanes` ya
 *      llega ordenado con ordenClanIndex() (mismo orden oficial Principal/
 *      Terna 2/Terna 3/Mini Ternas, ver render() más arriba), así que solo
 *      se movió TAB_TODOS al final del array antes de mapear los <button>.
 *   2) "Todos" deja de ser el default de carga: si `obtenerSel()` todavía
 *      no tiene nada elegido (null, primera carga de la página), se cae
 *      al primer clan de `clanes` -- el Principal -- en vez de a Todos.
 *      Esto requirió separar "sin elegir todavía" (null) de "Todos
 *      elegido a propósito" (ahora el valor propio TAB_TODOS, ver arriba)
 *      -- antes ambos casos compartían `null` y por eso la carga inicial
 *      siempre arrancaba mostrando todos los clanes.
 
```

### Línea original 1359 (script)

```
 * FIX (09-sep-2026, pedido usuario — "barra de navegación al inicio y
 * final de cada cuadrícula si hay que desplazarse horizontalmente"):
 * recorre cada .ai-clan-card dentro de `wrapId` y, si trae las franjas
 * .grid-hscroll-top/.grid-hscroll-bottom (ver plantilla en render() y el
 * <style> .grid-hscroll de más arriba), las sincroniza con el scroll
 * real de la tabla (.table-scroll): mover cualquiera de las 3 — la
 * franja de arriba, la de abajo, o la propia tabla — mueve a las otras
 * dos. `.grid-hscroll-inner` no tiene contenido propio; su único trabajo
 * es fijar el ancho del "carrete" de scroll (igual a tabla.scrollWidth)
 * para que la franja fina se sienta como una barra de scroll de verdad.
 * IMPORTANTE: se llama ANTES de gestionarTabsClan() (que oculta con
 * display:none las tarjetas de clan no seleccionadas) — un elemento
 * oculto mide scrollWidth 0, así que medir después dejaría las barras de
 * las tarjetas no visibles en el primer render rotas para cuando el
 * usuario cambie de pestaña.
 
```

### Línea original 1434 (script)

```
 * FIX (13-sep-2026, pedido usuario — "botones clickeables de letras para
 * filtrar el nombre por cada letra o # para números y cualquier otro
 * carácter"): clasifica cada fila de Pendientes según el primer carácter
 * de su nombre visible, para que el filtro por letra (ver
 * pintarFiltroLetraPendientes()/aplicarFiltroLetraPendientes() abajo)
 * sepa qué botón le corresponde a cada <tr>. Cualquier carácter que no
 * sea letra A-Z/Ñ (dígito, símbolo, emoji, o nombre vacío) cae en '#'.
 
```

### Línea original 1492 (script)

```
 * FIX (13-sep-2026, pedido usuario — "agrega los botones de letras en
 * 🗂️ Valores diarios y 🗓️ Valores semanales"): versión generalizada de
 * pintarFiltroLetraPendientes()/aplicarFiltroLetraPendientes() de arriba,
 * para secciones que pintan VARIAS tablas (una por clan, ver
 * renderFilaActivos/renderFilaTemporada más abajo, que ya marcan cada
 * <tr> con data-letra) en vez de una sola. Se pinta una sola vez por
 * sección (guardia por dataset.pintado, igual que la de Pendientes) y,
 * al hacer clic, no oculta/muestra los <tr> directamente -- en su lugar
 * llama a gridAplicarFiltros() de cada tabla visible dentro de
 * `tablasWrapId`, que ya combina este filtro por letra con el filtro/
 * orden numérico por columna que esas cuadrículas ya traían (ver
 * letraFiltroDeGridId() más arriba), para que ninguno de los dos filtros
 * se pise con el otro.
 
```

### Línea original 1538 (script)

```
 * FIX (09-sep-2026, pedido usuario — "añade un selector de año [...]
 * selector de temporada [...] y el tercero es el selector de semana [...]
 * ya no se muestran solo semanas de la temporada actual, sino cualquiera
 * disponible según el año y la temporada seleccionada [...] por defecto se
 * debe seleccionar el año, temporada y semana más recientes disponibles"):
 * reemplaza a la vieja pintarSelectorSemanaActivos() (un solo <select> de
 * semana, acotado a la temporada vigente) por 3 <select> encadenados —
 * año -> temporada (mes) -> semana — a partir de
 * data.valoresDiariosSelectores ({anios, temporadasPorAnio,
 * semanasPorTemporada, porDefecto}, ver _getValoresDiariosSelectores(),
 * 08_Web_Endpoints.gs) y data.valoresDiariosPorSemana ({[temporada]:
 * {[sectionIndex]: mismo shape que antes traía controlActivosSemanaActual}}).
 * Si esos 2 campos todavía no llegan (ej. Web App vieja), los 3 <select>
 * se quedan ocultos y todo sigue funcionando igual que antes (última
 * guerra cacheada de la temporada/semana vigente).
 *
 * El año/temporada/semana más recientes disponibles se fijan como default
 * SOLO la primera vez que llegan datos (anioSeleccionadoActivos === null);
 * si el usuario ya elegía algo, se respeta su elección en cada repintado
 * de render() (cada REFRESH_INTERVAL_MS). Cambiar de año cae a la
 * temporada más reciente de ese año; cambiar de temporada cae a su semana
 * más reciente — mismo criterio de "más reciente por defecto" que el
 * default inicial.
 
```

### Línea original 1591 (script)

```
  // FIX (09-sep-2026, pedido usuario — "en el selector de semana debe ir
  // de más reciente a más antiguo"): `semanasTemp` viene de
  // _getSemanasTemporada() (08_Web_Endpoints.gs) en orden ascendente
  // (S1, S2, S3...) porque ese orden es el que necesita el resto de la
  // lógica de esta función (semanas[semanas.length-1] = la más reciente,
  // usado como default arriba y en los onchange de año/temporada más
  // abajo) -- .slice().reverse() invierte SOLO para pintar las <option>,
  // sin tocar `semanasTemp`/`sel` en sí.
```

### Línea original 1622 (script)

```
 * FIX (09-sep-2026, pedido usuario — "🗓️ Cuadrícula de Temporada
 * (Semanal) [...] añádele el selector de año y reemplaza el selector de
 * temporada por el de mes, tal como se definió para la otra cuadrícula"):
 * reemplaza a la vieja pintarSelectorTemporada() (un solo <select> de
 * temporada, con etiqueta plana "Temporada N") por 2 <select> encadenados
 * -- año y temporada (mostrada como mes, "Temporada N (Mes)") -- a partir
 * de data.controlTemporadaSelectores ({anios, temporadasPorAnio,
 * porDefecto}, ver _getControlTemporadaSelectores(), 08_Web_Endpoints.gs).
 * Mismo patrón visual y de código que pintarSelectoresValoresDiarios() de
 * arriba, sin el tercer nivel de semana (esta cuadrícula siempre muestra
 * las 5 semanas de la temporada elegida juntas, nunca una semana suelta).
 *
 * data.temporadasDisponibles/data.controlTemporadaPorTemporada (los datos
 * pesados en sí) NO cambian con este fix, solo cómo se elige entre ellos
 * -- ver render() más abajo, que sigue leyendo esos mismos 2 campos con
 * `temporadaSeleccionadaTemporada` como clave.
 *
 * El año/temporada por defecto (año/temporada VIGENTE) se fija SOLO la
 * primera vez que llegan datos (anioSeleccionadoTemporada === null); si el
 * usuario ya elegía algo, se respeta su elección en cada repintado de
 * render(). Cambiar de año cae a la temporada más reciente de ese año.
 
```

### Línea original 1749 (script)

```
  // FIX (10-sep-2026, pedido usuario — "se debe mostrar el rango a la
  // derecha de la columna Clan"): columna nueva "Rango" entre Clan y
  // Faltantes; espera p.rango por jugador (ej. Líder/Colíder/Veterano/
  // Miembro/Aspirante) igual que el resto de datos de Directorio que ya
  // trae data.pendientes. Si el backend aún no manda ese campo para algún
  // jugador, se muestra "—" en vez de romper la tabla.
  // FIX (12-sep-2026, pedido usuario — "agrega también los botones de
  // clan(es) y Todos"): la tabla única con columna "Clan" se separa en una
  // tarjeta .ai-clan-card por clan (mismo patrón que "Valores diarios"),
  // con botonera .tabs-row/.tab-btn arriba (ver gestionarTabsClan() más
  // abajo) para filtrar sin volver a pedir datos. La columna "Clan" ya no
  // hace falta dentro de cada tabla — el nombre del clan ahora está en el
  // encabezado de su propia tarjeta, igual que en "Valores diarios".
  // FIX (13-sep-2026, pedido usuario — "agrega N° y el tag a la izquierda
  // del nombre / columna Jugador (Nom_Multi) y Préstamo solo para admins /
  // íconos de royaleapi y cwstats a la derecha de faltantes / botones de
  // letra para filtrar"): columnas nuevas, en orden:
  //   N° · Tag · Nombre · [Jugador · Préstamo, solo-admin] · Rango ·
  //   Faltantes · Perfil (íconos)
  // "Jugador" muestra p.nomMulti (Nom_Multi), NUNCA p.nombre -- son 2
  // campos distintos en el backend (ver mismo criterio ya documentado para
  // .col-jugador en Activos/Temporada, más arriba en este archivo: ahí es
  // al revés, .col-jugador trae el nombre crudo y Nom_Multi quedó afuera).
  // "Préstamo" usa el mismo nombre de campo que ya trae Directorio para esa
  // columna (p.prestamo). Los íconos de perfil reusan ICONO_ROYALEAPI/
  // ICONO_CWSTATS + urlValida() (mismo patrón que perfil.html,
  // #mRoyaleCwstatsBtns) sobre p.royaleApi/p.cwStats.
  // RESUELTO (15-sep-2026, cierre de conexión pendiente): data.pendientes
  // ya manda nomMulti, prestamo, rango, royaleApi y cwStats por jugador
  // (ver _getDatosDashboard(), 08_Web_Endpoints.gs). Si algún tag puntual
  // no tuviera alguno de estos datos en Directorio, la celda igual muestra
  // "—" y los íconos de perfil simplemente no se pintan para esa fila, sin
  // romper el resto.
```

### Línea original 1830 (script)

```
  // FIX (05-sep-2026, pedido usuario — "panel tipo hoja Control con datos
  // de Directorio, priorizando las cuadrículas"): a diferencia del bloque
  // de arriba (solo conteo por clan), acá se pinta la cuadrícula J/V/S/D
  // por cada Activo de Directorio. Pública — no pasa por
  // cargarAportesInactivosSiAdmin()/esAdminLogueado(), se pinta para
  // cualquier visitante igual que el resto de esta sección de la página.
  // Reutiliza las clases .ai-cell*/.ai-total* del bloque de Inactivos
  // (más abajo) para el mismo criterio visual de color.
  // FIX (05-sep-2026, pedido usuario — "solo consideró ataques, falta
  // Puntaje (fame) y barcos [...] Puntaje y Barcos son megacategorías
  // igual que Ataques [...] los clanes no están en el orden establecido"):
  // 1) Puntaje y Barcos NO son un valor único por jugador — son, igual
  // que Ataques, un grupo J/V/S/D + Total (ver captura de la Hoja
  // Control: "Puntaje" trae su propio Sem 1/Sem 2/Sem 3 con J/V/S/D/
  // T.1/T.2/T.3). Acá se pinta solo la SEMANA ACTUAL de cada megacategoría
  // (mismo alcance que ya tenía Ataques en esta cuadrícula), por eso cada
  // fila espera f.puntaje = {j,v,s,d,total} y f.barcos = {j,v,s,d,total}
  // (mismo shape que los campos planos j/v/s/d/total que Ataques ya usa,
  // solo que agrupados bajo esas 2 llaves para no chocar de nombre). A
  // diferencia de Ataques (0-4 intentos/día, con semáforo de color), los
  // valores diarios de Puntaje/Barcos son puntos/unidades ganadas ese día
  // (pueden ser cualquier número), así que sus celdas J/V/S/D/Total van
  // con .ai-num, sin semáforo ni resaltado de Total=16. 2) las tarjetas ya
  // no se ordenan alfabético (.sort() plano) sino con ordenClanIndex()
  // (assets/common.js), el mismo orden fijo de la Familia que usa el
  // resto del sitio.
  // FIX (09-sep-2026, pedido usuario -- selectores de año/temporada/semana
  // en "Valores diarios"): fuente de datos de esta cuadrícula, resuelta a
  // partir de la combinación año/temporada/semana elegida en los 3
  // <select> de arriba (pintarSelectoresValoresDiarios(), que además fija
  // el default -- año/temporada/semana más recientes -- la primera vez que
  // llegan datos). data.valoresDiariosPorSemana ya trae, precalculada, la
  // cuadrícula de CUALQUIER combinación con datos -- ver
  // _getValoresDiariosPorSemana() (08_Web_Endpoints.gs).
  //
  // Sigue existiendo un caso especial (heredado del comportamiento pedido
  // el 07-sep-2026, "que se siga mostrando los valores de la última guerra
  // mientras se esté en entrenamiento [...] hasta el cambio de periodIndex
  // [...] y se debe actualizar recién cuando empiece la guerra del
  // jueves"): CUANDO la combinación elegida es justo la semana VIGENTE
  // (temporada/sectionIndex == ctx.temporada/ctx.sectionIndex) Y hoy no es
  // día de guerra todavía, el backend reporta esa semana en ceros (recién
  // arrancando el periodIndex de Supercell, ~4-5am, sin esperar al jueves)
  // -- en ese caso puntual se recupera del navegador la última foto
  // guardada en localStorage (guardada cada vez que SÍ es día de guerra) y
  // se muestra esa en su lugar. Cualquier OTRA combinación (semana pasada,
  // temporada pasada) ya es un dato final/histórico -- se muestra tal cual
  // llega, sin pasar por localStorage.
```

### Línea original 1916 (script)

```
    // FIX (10-sep-2026, pedido usuario — botones de filtro/orden en la 2ª
    // fila de encabezados): la 1ª fila (Ataques/Puntaje/Barcos, colspan=5)
    // se sigue pintando plana, sin botón; la 2ª (J/V/S/D/Total) ahora sale
    // de filaSubEncabezadosMega() (ver más arriba), que sí agrega el
    // ícono de embudo + flechita de orden a cada una. El <tbody> arranca
    // vacío — inicializarGridFiltro() (después de insertar el HTML en el
    // DOM) es quien lo llena, aplicando cualquier filtro/orden que ya
    // hubiera quedado guardado en un refresco anterior.
```

### Línea original 1956 (script)

```
 FIX (05-sep-2026, pedido usuario — "Mejor dentro del primer
               cuadro, en cada clan, primero escribe las filas de los
               activos y luego una sección para inactivos"): wrap vacío,
               solo-admin, llenado por cargarAportesInactivosSiAdmin() más
               abajo. Colapsa solo por completo (":empty" en el <style>)
               cuando no hay sesión de admin o el clan no tiene inactivos
               esta semana. 
```

### Línea original 1982 (script)

```
  // FIX (05-sep-2026, pedido usuario — "haz una sección como la hoja
  // Control_2... valores semanales de toda la temporada"): mismo patrón
  // que controlActivos de arriba, pero con Sem 1..Sem N dinámicas en vez
  // de J/V/S/D fijos (celdasSemanas() en vez de celdasMegacategoria(),
  // ver docblock de esa función más arriba). data.controlTemporadaSemanas
  // trae las etiquetas de columna (ej. ['Sem 1','Sem 2',...], una por
  // semana de guerra ya jugada en la temporada actual) compartidas por
  // todos los clanes; data.controlTemporadaPorClan trae, por clan, un
  // array de filas { nombre, tag, ataques:{semanas,total,pct},
  // puntaje:{semanas,prom,pct}, barcos:{semanas,total} } -- ver
  // _getControlTemporadaPorClan(), 20_Control2_GuerraSemanal.gs.
  // FIX (09-sep-2026, pedido usuario — selectores de año/mes en "Valores
  // semanales"): si el año/temporada elegidos en los 2 <select> de arriba
  // (pintarSelectoresControlTemporada(), que además fija el default --
  // año/temporada VIGENTE -- la primera vez que llegan datos) NO son la
  // temporada vigente Y el backend manda esa temporada en
  // data.controlTemporadaPorTemporada, se usa esa en vez de la vigente
  // (data.controlTemporadaPorClan/data.controlTemporadaSemanas).
```

### Línea original 2076 (script)

```
 * FIX (04-sep-2026, pedido usuario — "se debe agregar botones para copiar
 * los mensajes de guerra pero visibles solo para los admin"): reusa
 * 'webAdminContenido' (mismo endpoint autenticado que ya usa admin.html,
 * ver renderContenidoHtml()/_activarAccionesContenido() ahí) con
 * categoria='Mensaje de Guerra' — el backend ya arma un item por clan
 * (subcategoria 'Particular') más uno de 'Chat General' (ver
 * generarTodosMensajes(), Base.md).
 * FIX (05-sep-2026, pedido usuario — "en Guerra (lista de pendientes) solo
 * hay que poner el mismo botón, pero ya no se va a mostrar todo el texto,
 * solo el botón de copiar, así que debería agregar información sobre el
 * clan"): antes esto vivía en una sección aparte (#mensajesGuerraAdmin,
 * ya eliminada), con una tarjeta por clan: un <span> con el nombre del
 * clan al lado de un botón genérico "⧉ Copiar". Ahora se integra
 * directamente arriba de la tabla de "Pendientes de Atacar" (#msjGuerraWrap
 * dentro de #pendSection) como una fila compacta de botones sueltos, SIN
 * tarjeta ni label aparte — por eso cada botón lleva el nombre del clan
 * metido en su propio texto ("⧉ Copiar — <Clan>"), para poder identificar
 * cuál es cuál sin el label que ya no existe.
 * No se pide nada ni se muestra nada si:
 *   - no hay sesión de admin en este navegador (esAdminLogueado()), o
 *   - no es día de guerra (ctx.esDiaGuerra) — 'Mensaje de Guerra' solo
 *     existe en días de guerra, pedirlo en día de entrenamiento solo
 *     devolvería vacío.
 * Cualquier error (token vencido, etc.) se traga en silencio: esta fila de
 * botones es un plus para admins, nunca debe romper la carga de la página
 * pública para nadie. Al quedar vacía (wrap.innerHTML = '') no deja hueco
 * ni espacio de más para quien no es admin.
 
```

### Línea original 2138 (script)

```
 * FIX (05-sep-2026, pedido usuario — "Debajo de Pendientes, se debe
 * agregar una sección de aportes a Guerra de miembros inactivos, por
 * clan [...] esto sería solo para la semana actual [...] la referencia es
 * la cuadrícula de la Hoja Control en Sheets"): pide 'webAportesInactivos'
 * (endpoint autenticado aparte, NO viaja en webGuerraEnVivo — ver
 * _webAportesInactivos()/_getAportesInactivosSemanaActual() en
 * 08_Web_Endpoints.gs) y arma, por clan, una mini-cuadrícula con las
 * mismas 3 megacategorías que la Cuadrícula de Activos (Ataques/Puntaje/
 * Barcos, cada una J/V/S/D/Total) — mismo criterio visual de columnas que
 * la hoja Control, pero acotada a un jugador pudiendo aparecer en MÁS DE
 * UN clan (un inactivo puede aportar a 2+ clanes el mismo día), cosa que
 * la cuadrícula de Control no contempla porque ahí cada Activo tiene un
 * solo clan asignado.
 * FIX (05-sep-2026, pedido usuario — "los inactivos estaban trayendo solo
 * la categoría ataques, faltaba puntaje y barcos"): antes esta tabla solo
 * traía Ataques (J/V/S/D/Total) — el pedido original había sido "así se
 * puede ver cuáles son los aportes EXTRA de ataques con los que ha
 * contado el clan", pero no cubría Puntaje/Barcos. Ahora sí trae las 3,
 * igual que Activos (ver _getAportesInactivosSemanaActual() en
 * 08_Web_Endpoints.gs y bloqueHtml() más abajo). El criterio de "quién
 * aparece" (filtro por total de ATAQUES > 0, no de Puntaje/Barcos) no
 * cambió — sigue siendo "aportó al menos 1 ataque esta semana".
 * FIX (05-sep-2026, pedido usuario — "Mejor dentro del primer cuadro, en
 * cada clan, primero escribe las filas de los activos y luego una sección
 * para inactivos [...] así el mismo clan tiene su sección de activos y
 * otra de inactivos"): antes esto pintaba una sección aparte
 * (#aportesInactivosSection, ELIMINADA) debajo de "Pendientes de Atacar".
 * Ahora inyecta el bloque de Inactivos de cada clan DENTRO de la misma
 * tarjeta que ya pintó ese clan en "Cuadrícula de Activos" (buscando
 * `.ai-inactivos-wrap[data-clan-inactivos="<clan>"]`, ver render() más
 * arriba). Si un clan tiene inactivos pero ningún Activo (no tiene
 * tarjeta propia todavía), se crea una tarjeta nueva para ese clan al
 * final de #controlActivosWrap, respetando el mismo ordenClanIndex().
 * Sigue sin pintarse nada si no hay sesión de admin (esAdminLogueado()) o
 * no es día de guerra: en ese caso se limpian los wraps existentes (por si
 * un admin cierra sesión sin recargar la página) y no se toca nada más.
 * Cualquier error se traga en silencio, igual que
 * cargarMensajesGuerraSiAdmin().
 
```

### Línea original 2190 (script)

```
    // FIX (05-sep-2026, pedido usuario — "los inactivos estaban trayendo
    // solo la categoría ataques, faltaba puntaje y barcos"): antes esta
    // tabla solo tenía Jugador/J/V/S/D/Total (Ataques). Ahora pinta las
    // mismas 3 megacategorías (Ataques/Puntaje/Barcos) que ya tiene la
    // Cuadrícula de Activos de arriba — mismo <thead> de 2 filas y mismos
    // helpers globales claseCeldaCA()/celdasMegacategoria() (hoisteados
    // arriba de render(), ver comentario ahí), para no duplicar el criterio
    // visual entre Activos e Inactivos. Requiere que cada fila `f` traiga
    // f.puntaje/f.barcos como {j,v,s,d,total} — ver
    // _getAportesInactivosSemanaActual() (08_Web_Endpoints.gs).
```

### Línea original 2273 (script)

```
 * (12-sep-2026, pedido usuario): esta sección había quedado duplicada por
 * error en directorio.html; la versión final pedida por el usuario queda
 * acá, en Guerra. Usa el mismo endpoint admin-only de siempre
 * (webAdminParticipacionHoyGuerra → _getParticipacionHoyGuerra(),
 * 17_GuerraSheet.gs).
 *
 * Cambios de esta versión final sobre la vieja (que usaba las clases
 * .ph-*):
 *   1) El conteo de cada columna va SOLO junto a su encabezado
 *      ("Reservadas (26)"), nunca en una línea aparte por clan.
 *   2) Cada cuenta reservada muestra sus ataques pendientes hoy
 *      (4 - ataques ya usados hoy).
 *   3) Las reservadas se subagrupan, dentro de cada clan, en "Con ataques
 *      pendientes" (1-3) y "Sin ataques pendientes" (0).
 *
 * OJO backend: para que el punto 2/3 funcione, cada cuenta dentro de
 * c.reservadas/c.disponibles debe traer también su cantidad de ataques
 * usados hoy (mismo dato que ya se manda para multiClan como
 * m.totalAtaquesHoy) — se lee acá como cta.ataquesHoy. Si el backend
 * todavía no manda ese campo, las reservadas quedan todas en "Con ataques
 * pendientes" sin dato exacto (se asume 1 usado) en vez de romper la
 * vista.
 
```

### Línea original 2319 (script)

```
  // FIX (12-sep-2026, pedido usuario — "agrega también los botones de
  // clan(es) y Todos"): cada clan pasa a su propia tarjeta .ai-clan-card
  // con data-clan (mismo patrón que "Valores diarios"), para que
  // gestionarTabsClan() pueda mostrar/ocultar una por una sin volver a
  // pedir datos. El aviso de multiClan queda FUERA de esas tarjetas (sin
  // data-clan) para que se siga viendo sin importar qué pestaña esté
  // activa — es información agregada, no de un solo clan.
```

### Línea original 2392 (script)

```
 * FASE 13 punto 1 del plan de cambios web (07-sep-2026) -- vista (a) del
 * "Log" de guerra de RoyaleAPI, recreada con datos propios. Pide
 * 'webGuerraLog' (mismo WEB_MEMBER_TOKEN público de solo lectura que
 * apiGet() ya usa para webGuerraEnVivo, ver _webGuerraLog(),
 * 17_GuerraSheet.gs) SIN `tag` -- así el backend devuelve los
 * CFG.TERNA_TAGS.length clanes Terna juntos, en su mismo orden, sin
 * necesitar tags de clanes propios hardcodeados acá.
 *
 * A diferencia del resto de esta página (dashboard en vivo, refrescado
 * cada REFRESH_INTERVAL_MS), esto es un histórico acumulado que no
 * cambia salvo cuando corre el batch del backend -- se pide UNA sola vez
 * al cargar la página (ver la llamada al final de este script), no en el
 * setInterval de arriba.
 *
 * Pinta una pestaña por clan (data.clanes, mismo patrón visual
 * .tabs-row/.tab-btn que directorio.html) y, debajo, una tabla Temporada/
 * Semana/Rank/Boat/Trophy de la pestaña activa, con el delta de Trophy
 * contra la semana anterior (verde si subió, rojo si bajó) y las semanas
 * ya ordenadas de más reciente a más antigua (mismo orden que ya manda
 * el backend). Un clan sin ninguna fila registrada todavía en Guerra_Logs
 * (`clan` vacío) se descarta de las pestañas en vez de mostrar una vacía.
 *
 * Cualquier error (backend caído, token vencido, etc.) se traga en
 * silencio y la sección se oculta por completo -- mismo criterio de
 * robustez que el resto de secciones de esta página pública.
 
```

## sorteo.html

### Línea original 12 (HTML)

```
 Acceso restringido: incorporada al portal admin (28-ago-2026). Esta
     herramienta se desarrolló antes de la web y funciona 100% del lado del
     cliente (sin backend propio), por eso la validación de acceso también
     es del lado del cliente: si no hay sesión de admin activa (mismo
     terna_admin_token que usa admin.html tras un login exitoso vía
     webLogin), se redirige de inmediato al login. Es el mismo nivel de
     protección que ya usa el resto del sitio para gating de UI (ver
     aplicarVisibilidadPorFunciones() en admin.html) — no sustituye una
     validación de servidor, pero esta página no llama a ningún endpoint
     que exponga datos, así que no la necesita.
     NOTA (29-ago-2026): sessionStorage NO se copia de forma confiable entre
     pestañas. Se pasa el token por query string (?tk=) desde el botón
     "Abrir Ruleta de Sorteos" en admin.html; este script lo guarda en
     sessionStorage y limpia la URL antes de que se pinte nada.
     ACTUALIZACIÓN (04-sep-2026): la sesión de admin migró de sessionStorage
     a localStorage en todo el sitio (ver actualizarNavCta() en common.js),
     que sí se comparte entre pestañas del mismo origen — así que este paso
     de token por ?tk= ya no es indispensable para que esta página vea la
     sesión abierta en otra pestaña. Se deja el mecanismo tal cual (ahora
     escribe/lee en localStorage, ver script de abajo) porque sigue siendo
     inofensivo y cubre además el caso de un link ?tk= compartido/abierto
     directamente sin sesión previa en esa pestaña.
     FIX (30-ago-2026): se retira el bloque de diagnóstico en pantalla que
     hubo acá (29-ago-2026, para depurar un loop de redirección) — el fix
     real fue pasar el token por ?tk= (arriba), ya confirmado funcionando,
     así que el diagnóstico ya cumplió su función y solo quedaba como
     ruido/riesgo (mostraba detalles internos de sesión en pantalla ante
     cualquier falla). 
```

### Línea original 441 (estilo)

```
 FASE 9 (30-ago-2026): la lista de participantes se muestra siempre
   * agrupada por clan. Cada grupo tiene un header con checkbox propio que
   * marca/desmarca a TODOS sus miembros de un tiro (p.ej. un sorteo que es
   * solo para 2 de los 4 clanes), en vez de sacar a cada persona a mano —
   * ver buildClanGroupHeader(). Los participantes sin clan (agregados a
   * mano) van en un grupo "Sin clan asignado" al final. 
```

### Línea original 633 (HTML)

```
 data-essential-motion (30-ago-2026): excluye este disco del
               reset global de prefers-reduced-motion (ver styles.css) — el
               giro de la ruleta NO es decorativo, es la mecánica misma del
               sorteo (la suspensión del giro es parte de la transmisión en
               vivo), así que debe seguir animándose aunque el sistema
               operativo de quien mira tenga "reducir movimiento" activado. 
```

### Línea original 720 (HTML)

```
 NUEVO (14-sep-2026, pedido usuario -- "en la ruleta agrega una
             opción para quitar un ticket por cada giro que hace la
             ruleta. reitero que debe ser opcional"): #removeTicketPerSpinToggle,
             DESMARCADO por defecto (como pidió el usuario, es opcional, no
             cambia el comportamiento actual si no se activa). Con esto
             activado, cada giro (gane o no el premio ese intento) le resta
             1 ticket al participante que salió en ESE giro -- ver el
             bloque que hace `slice.participant.weight -= 1` dentro de
             spin(), justo después de conocer `slice`, antes de separar en
             isFinal/no-final (aplica a los dos casos por igual, tal cual
             "por cada giro" y no solo "por cada premio"). Un participante
             que llega a 0 tickets no necesita marcarse `active:false` a
             mano -- computeSlices() ya le arma una porción de ancho 0 en
             la ruleta (ver ese bloque, `w = Number(p.weight) > 0 ? ... :
             0`), así que en la práctica deja de poder salir sorteado sin
             tocar ningún otro mecanismo de descarte. 
```

### Línea original 753 (HTML)

```
 FIX (10-sep-2026, punto 5 del consolidado -- "Frontend
             (sorteo.html): un formulario de resolución sobre cada ganador
             de la lista (renderWinners()), similar a #resolucionForm de
             admin.html"): mismo patrón que #resolucionForm -- UN SOLO
             formulario compartido, se abre desde el botón "Gestionar" de
             cada fila de ganador (ver abrirResolucionForm() más abajo) y
             cambia según a cuál ganador corresponda. A diferencia de
             Torneos, acá no hay una hoja de resoluciones aparte que
             fusionar (Resultado/Razón viven en la misma fila de
             S_Asistencia, ver sección 1 del consolidado) -- por eso el
             resultado se guarda directo en el objeto `winner` en memoria
             (ver guardarResolucionGanador() más abajo), sin necesidad de
             re-fusionar nada al repintar.

             CORREGIDO (10-sep-2026, sección 1 y sección 2 del consolidado):
             esta primera versión copiaba el dropdown de 4 opciones de
             Torneos (Ganador/Descalificado/2 tipos de empate) y dejaba
             "Razón" como texto libre -- pero Sorteos NO tiene concepto de
             empate, así que Resultado es un dropdown cerrado de 2 valores
             (Califica/No califica, CFG.SORTEOS_RESULTADO_TIPOS) y Razón es
             otro dropdown cerrado con los 3 motivos ligados a los
             requisitos de S_Lista, visible solo cuando Resultado = "No
             califica" (ver toggleWinnerResRazonVisibility() más abajo).

             CONECTADO (10-sep-2026, puntos 4 y 6 del consolidado ya
             resueltos en el backend): btnGuardarResolucionGanador ahora
             llama a webAdminSorteoResolucionGuardar (guardarResolucionGanador()
             más abajo) -- ver ese comentario para el detalle de Tag/Premio
             y el caso "sin tag". 
```

### Línea original 788 (HTML)

```
 RESUELTO (10-sep-2026, sección "Cómo se resuelve el Tag" del
               consolidado): si el ganador vino de "Cargar participantes
               calificados" el Tag ya llega prellenado (ver
               abrirResolucionGanador() más abajo) y normalmente no hace
               falta tocarlo. Si el ganador se agregó a mano y no se
               conoce el Tag, este aviso se muestra solo (ver
               toggleWinnerResSinTagVisibility()) cuando el campo de Tag
               está vacío -- no deja guardar sin tag "en silencio": exige
               que el admin confirme explícitamente que es intencional. 
```

### Línea original 807 (HTML)

```
 FIX (12-sep-2026, pedido del usuario -- consolidado sección 1,
               punto 10, y Base.md _registrarResolucionSorteo()/
               actualizarDocGanadoresSorteo()): campo Tickets, prellenado con
               el peso real (participant.weight) con el que el ganador entró
               a la ruleta -- mismo criterio que Tag/Premio: viene sugerido
               pero es editable a mano antes de guardar, por si el admin
               necesita corregirlo. Opcional: si se deja vacío, se manda
               `undefined` en el payload (ver guardarResolucionGanador() más
               abajo) y el backend guarda la celda vacía, igual que antes de
               este FIX. 
```

### Línea original 875 (script)

```
  // FASE (10-sep-2026, consolidado sección 1 puntos 4 y 6): ID (SL.ID) del
  // sorteo al que se le atan las resoluciones que se guarden en
  // S_Asistencia. Se completa al cargar participantes calificados (ver
  // loadQualifiedParticipants() más abajo, data.idSorteo) -- por eso el
  // flujo esperado es: primero "Cargar participantes calificados" (aunque
  // sea solo para tomar el ID, incluso si después se termina sorteando a
  // mano), después girar, después guardar resoluciones/exportar.
```

### Línea original 1166 (script)

```
      // FIX (10-sep-2026): la etiqueta ahora también refleja el resultado
      // de la resolución manual (ver #winnerResolucionForm), no solo si
      // sigue participando o quedó excluido de la ruleta -- son dos cosas
      // distintas: "discarded" es sobre la ruleta (¿puede volver a salir
      // sorteado?), "resultado" es sobre el premio (¿se queda con él?).
      // CORREGIDO (10-sep-2026): "Ganador" ya no es un valor posible de
      // w.resultado (Sorteos solo usa Califica/No califica) -- ahora se
      // compara contra "No califica" y, si aplica, se agrega también la
      // razón elegida.
```

### Línea original 1218 (script)

```
  // FIX (10-sep-2026, punto 5 del consolidado): mismo mecanismo que
  // abrirResolucionForm() de admin.html, pero UN SOLO formulario
  // compartido para todos los ganadores en vez de uno triplicado por fila
  // -- se abre con abrirResolucionGanador(id), que recuerda a cuál
  // ganador corresponde en winnerResolucionForm.dataset.winnerId.
  //
  // CORREGIDO (10-sep-2026, sección 1 y sección 2 del consolidado): el
  // valor por defecto/"sin problemas" ya no es "Ganador" (copiado de
  // Torneos) sino "Califica" (CFG.SORTEOS_RESULTADO_TIPOS) -- Sorteos no
  // tiene concepto de empate, y "Razón" solo tiene sentido (y solo se
  // muestra) cuando el Resultado es "No califica".
```

### Línea original 1248 (script)

```
  // FASE (10-sep-2026, consolidado -- "Cómo se resuelve el Tag"): el
  // aviso + checkbox de "sin tag" solo se muestra cuando el campo de Tag
  // está vacío -- si el admin lo completa (a mano, o porque ya venía
  // prellenado desde "Cargar participantes calificados"), el aviso se
  // oculta y el check se desmarca solo (no tiene sentido dejarlo marcado
  // si al final sí hay un tag).
```

### Línea original 1288 (script)

```
  // FASE (10-sep-2026, consolidado sección 1 puntos 4 y 6 -- CONECTADO):
  // guarda/actualiza la resolución de UN ganador en S_Asistencia vía
  // webAdminSorteoResolucionGuardar (mismo patrón que btnGuardarResolucion
  // de admin.html → webAdminTorneoResolucionGuardar). Antes de mandar
  // nada valida, en este orden:
  //   1. Que haya un sorteoActualId (viene de "Cargar participantes
  //      calificados", ver loadQualifiedParticipants()) -- sin eso no hay
  //      forma de saber a qué fila de S_Lista atar la resolución.
  //   2. Si Resultado = "No califica", que venga una Razón elegida.
  //   3. Que haya Tag, SALVO que el admin haya marcado explícitamente el
  //      checkbox de "sin tag intencional" (ver toggleWinnerResSinTagVisibility()
  //      más arriba) -- ver "Cómo se resuelve el Tag" en el consolidado.
  // El estado local (`winners`) se actualiza recién cuando el backend
  // confirma ok:true -- si falla, el formulario queda abierto con el
  // error visible y nada se pierde (el admin puede corregir y reintentar).
```

### Línea original 1462 (script)

```
      // NUEVO (14-sep-2026, pedido usuario -- opción "Quitar un ticket por
      // cada giro"): se aplica ACÁ, antes de separar en isFinal/no-final,
      // porque el pedido fue "por cada giro que hace la ruleta" (no solo
      // por cada premio entregado). Clamp a 0 -- nunca queda negativo.
      // Ver docblock junto a #removeTicketPerSpinToggle (arriba, en el
      // <div class="setting-row">) para el resto del mecanismo.
```

### Línea original 1481 (script)

```
          // FIX (10-sep-2026, punto 5 del consolidado): resultado/razón de
          // la resolución manual sobre este ganador (ver
          // #winnerResolucionForm más arriba). CORREGIDO (10-sep-2026):
          // "Califica" es el valor por defecto (Sorteos no tiene concepto
          // de empate, ver sección 2 del consolidado) -- no hace falta
          // abrir el formulario si no hubo ninguna descalificación.
```

### Línea original 1489 (script)

```
          // FASE (10-sep-2026, consolidado sección 1 puntos 4 y 6): se
          // propaga el tag/clan del participante calificado (si vino de
          // "Cargar participantes calificados") -- ver
          // loadQualifiedParticipants() más arriba. Si el ganador salió
          // de un participante agregado a mano, ambos quedan en null y
          // guardarResolucionGanador() exige la confirmación explícita de
          // "sin tag" antes de guardar. `premio` arranca vacío -- se
          // completa a mano en el formulario de resolución (todavía no
          // hay ninguna fuente automática de premios por puesto).
          // `guardado` refleja si esta resolución YA se guardó en
          // S_Asistencia (ver renderWinners() para el indicador visual).
```

### Línea original 1503 (script)

```
          // FIX (12-sep-2026, consolidado sección 1 punto 10): se propaga
          // el peso real con el que este participante entró a la ruleta
          // (mismo `weight` que ya usa pickWeightedIndex() para la
          // probabilidad) -- sugerido en el campo Tickets del formulario de
          // resolución (ver abrirResolucionGanador()), pero editable a mano
          // antes de guardar, igual que Tag/Premio.
```

### Línea original 1535 (script)

```
        // FIX (14-sep-2026, junto con "Quitar un ticket por cada giro"):
        // sin este `||`, si el toggle de tickets está activo pero
        // "Descartar intentos de prueba" no, el peso bajaba en el dato
        // pero el <input> de tickets y la rueda quedaban con el valor
        // viejo hasta el próximo giro -- ahora se refresca apenas
        // cualquiera de los dos cambió algo sobre el participante.
```

### Línea original 1638 (script)

```
    // FASE (12-sep-2026, pedido del usuario -- consolidado de pendientes,
    // punto 1): además de la descarga local de arriba (que no toca el
    // backend), "Exportar" ahora también dispara el docx real al instante
    // -- antes solo se actualizaba 1 vez al día, dentro de la corrida
    // diaria de runUpdate() (ver docblock de
    // _webAdminSorteoActualizarDocGanadores(), 34_Web_API.gs). Es un
    // pedido aparte, en paralelo, que no bloquea ni condiciona la
    // descarga local de arriba (que ya se disparó igual): si este pedido
    // falla o no hay sesión activa, el .doc local ya se descargó sin
    // problema.
```

### Línea original 1747 (script)

```
            // FIX (10-sep-2026, punto 3 del consolidado): usar el ticket
            // real (peso en la ruleta) que calcule el backend en vez del
            // `weight: 1` fijo de siempre -- computeSlices()/
            // pickWeightedIndex() ya usan `p.weight` para la probabilidad,
            // así que no hace falta tocar nada más ahí, solo poblarlo bien
            // acá. El campo `.p-weight` de cada fila (ver renderParticipants()
            // más abajo) sigue siendo editable a mano por si el admin
            // quiere ajustar el peso de alguien puntual después de cargar.
            //
            // CONECTADO (11-sep-2026, confirmado contra Base.md y el
            // consolidado, sección 1 PASO 2): _webSorteoCalificados()
            // (34_Web_API.gs) ya devuelve `tickets` por participante
            // calificado, calculado como 1 + floor((trofeos - Min_S) /
            // Delta) -- ver el docblock de esa función para el detalle
            // completo (caso especial Delta=0 → 1 ticket fijo para todo el
            // que llegue a Min_S, sin tope máximo). `p.peso` NUNCA llega a
            // existir -- ese nombre alternativo se deja como fallback
            // inofensivo por si algún día se renombra el campo, no porque
            // esté en uso hoy.
```

### Línea original 1775 (script)

```
              // FASE (10-sep-2026, consolidado sección 1 puntos 4 y 6,
              // "Cómo se resuelve el Tag"): se guarda el tag real del
              // participante calificado -- cuando salga sorteado, spin()
              // lo propaga al objeto winner, y de ahí
              // guardarResolucionGanador() lo manda tal cual a
              // S_Asistencia sin pedirle nada al admin.
```

### Línea original 1793 (script)

```
        // FASE (10-sep-2026, consolidado sección 1 puntos 4 y 6): se
        // guarda el ID del sorteo (S_Lista) que devolvió el backend --
        // hace falta para poder guardar después cualquier resolución de
        // ganador en S_Asistencia (ver guardarResolucionGanador() más
        // abajo). Se sobreescribe cada vez que se recarga la lista, así
        // que si el admin recarga a mitad de un sorteo real, las
        // resoluciones ya guardadas siguen atadas al ID viejo (correcto:
        // pertenecen a ESE sorteo) y solo las nuevas usan el ID recargado.
```

---

## assets/styles.css — consolidación CSS (refactor, sesión 18-sep-2026)

### 18-sep-2026 (séptimo lote) — Fase 3: `.carta-chip`/`.cc-*` y 5 duplicados chicos más
Continuación del refactor con el mismo criterio milimétrico de los lotes
anteriores (solo fusionar duplicación literal, carácter por carácter).
Auditoría automatizada (comparando cada selector local contra sí mismo en
las demás páginas, no solo contra `styles.css`) encontró un caso grande no
detectado en los lotes previos y 5 chicos:

- **`.carta-chip` / `.cc-*`** (17 reglas: base, `--sin-img`, `cc-img`,
  `cc-content`, `cc-fila-1`, `b`, `cc-elixir`(+`img`), `cc-meta`,
  `cc-rareza`(+4 variantes `data-rareza`), `cc-tipo`, `cc-badge`): idéntico
  carácter por carácter entre `index.html` ("Cartas más usadas en la
  Familia") y `perfil.html` ("Mazo actual") — el propio comentario de
  `perfil.html` ya lo admitía ("copiadas tal cual acá"). Se centraliza en
  `styles.css`. Quedan en `index.html`, por ser exclusivos de ahí:
  `.cc-usos` y `.cc-badge-btn`(+`:hover`/`.is-activa`, el botón de editar
  variante de carta, que `perfil.html` no tiene).
- **`.miembro-row:hover` / `:last-child`**: idénticos entre `admin.html` y
  `directorio.html` (la base `.miembro-row` y `.mr-rango` siguen sin
  fusionar porque sí difieren, ver cuarto lote).
- **`.letra-btn`**: idéntico entre `directorio.html` y `guerra.html`. Se
  declara en `styles.css` DESPUÉS de `.tab-btn`/`.tab-btn.active` a
  propósito — `assets/js/ui/filters.js` genera los botones A-Z/# con
  `class="tab-btn letra-btn"`, y con la misma especificidad (una clase
  cada una) el orden de declaración decide; el padding angosto de
  `.letra-btn` necesita seguir ganando.
- **`.ext-links`** (el contenedor, no `.ext-links a`/`button`, que sí
  difieren): idéntico entre `directorio.html` y `perfil.html`.
- **`.ingreso-row:last-child`** y **`.ingreso-links`** (el contenedor):
  idénticos entre `index.html` y `perfil.html`. La base `.ingreso-row`,
  `:hover` y `.ingreso-info .ing-*` difieren entre las dos y no se tocan.
- **Código muerto** (idéntico a algo que ya existía en `styles.css` desde
  antes, sin necesidad de mover nada): `.field textarea:focus` en
  `admin.html` y `perfil.html`; `.vetar-form`/`.vetar-form-titulo` en
  `perfil.html` (mismo caso que la copia de `directorio.html` eliminada en
  el Fase 1 revisada).

Se revisó también, y se descartó por no ser deuda técnica, la aparente
duplicación de `*{box-sizing:border-box;}`/`html,body{margin:0;padding:0;}`
entre `sorteo.html` y `styles.css`: `sorteo.html` no enlaza `styles.css`
(es un overlay independiente para la transmisión del sorteo), así que sí
necesita su propio reset.

**Efecto colateral — 3 bugs de sintaxis preexistentes encontrados y
corregidos** (verificación de balance de `{}`/`/* */` en los 5 `<style>`
tocados esta sesión, no relacionados con el trabajo de arriba): un
comentario de `directorio.html` (bloque de `.roster-topbar`, "Barra de
scroll horizontal ARRIBA de la tabla") se cerraba con `-->` (sintaxis de
comentario HTML) en vez de `*/` (CSS) — typo de una sesión anterior. Y dos
comentarios (uno en `styles.css`, línea ~381, sobre el widget
`.rt-*`/`.rt-orden-*`; otro en `guerra.html`, línea ~96, sobre
`.grid-hscroll-*`/`.table-scroll-*`) tenían el patrón `*/` pegado dentro
del propio texto del comentario (describiendo selectores con wildcard),
lo que cerraba el comentario antes de tiempo. Se corrige separando el `*`
del `/` con un espacio en la prosa (`.rt-* / .rt-orden-*`), sin cambiar el
significado. Los navegadores son tolerantes a esto (descartan el CSS
inválido resultante hasta la siguiente regla válida) así que es poco
probable que causara un cambio visual real, pero quedaba mal formado.

Ningún cambio visual esperado en lo fusionado — es movimiento de
definiciones idénticas, eliminación de código muerto y corrección de
comentarios mal cerrados, no reescritura de estilos.

### 18-sep-2026 (sexto lote) — `.table-scroll` (guerra.html) al selector compartido de scroll
Cierra el cabo suelto que había quedado del "tercer lote" (`.inactivos-table`
/ `.roster-table`): `.table-scroll{overflow-x:auto;
-webkit-overflow-scrolling:touch;}` de `guerra.html` tenía exactamente esa
misma declaración, carácter por carácter, ya presente en el selector
compartido `.inactivos-table-wrap, .roster-table-wrap` de `styles.css`. Se
suma `.table-scroll` a ese selector; se elimina la copia de `guerra.html`.
`.table-scroll table{min-width:420px;}` es específico de esa página (no
tiene equivalente en las otras dos) y se queda donde estaba.

Se revisó de nuevo, con el mismo criterio milimétrico de los lotes
anteriores, si `.cr-grid-table` (admin.html) — la cuarta tabla del sitio
que trata `activarBarraScrollTabla()` como una unidad — tenía algo
fusionable con las otras tres: su único CSS es `text-align:center`/
`vertical-align:middle` en `th` y `padding:4px 6px` en `td`, ninguno
idéntico a los paddings/alineaciones de `.inactivos-table`/`.roster-table`/
`.table-scroll`. Se confirma que no hay nada seguro para mover ahí; queda
tal cual, como ya anticipaba el plan original (Fase 2: "modificadores
puntuales donde una tabla necesite algo distinto").

También se intentó, en un primer paso de esta sesión, extraer la parte
compartida de `thead th`/`tbody td` entre `.inactivos-table` y
`.roster-table` separando la propiedad que sí difiere (`text-align`,
`font-size`) del resto. El análisis de especificidad indicaba que era
seguro, pero se revirtió: no es una fusión byte-a-byte del bloque completo
(el criterio que ya usa el resto de esta sección desde el "tercer lote"),
y esa fase ya había quedado documentada ahí como "revisada y descartada a
propósito". Se prefiere no introducir un criterio distinto sin poder
verificar visualmente el resultado en esta sesión.

### 18-sep-2026 (quinto lote) — `.perfil-cabecera`, y por qué `.stats-mini`/`.stats-mini b` NO se tocan
Sigue pendiente de la nota del cuarto lote: `.perfil-cabecera`/`.stats-mini`
había quedado descrito como "3 variantes chicas de tamaño de fuente" sin
más detalle. Revisando propiedad por propiedad en admin.html,
directorio.html y perfil.html:

- **`.perfil-cabecera`** (la base, sin anidar): idéntica carácter por
  carácter en las 3 páginas. Se centraliza en `styles.css`.
- **`.perfil-cabecera .stats-mini`**: difiere en las 3 (admin sin
  `flex-wrap`; directorio con `flex-wrap`; perfil con `flex-wrap` +
  `text-align:center`). No se toca.
- **`.perfil-cabecera .stats-mini b`**: idéntica entre directorio.html y
  perfil.html (`font-size:16px` + `font-family:var(--f-display)`), pero
  admin.html trae una tercera variante que es un SUBCONJUNTO de
  propiedades (`font-size:15px`, sin `font-family`). Esto importa porque
  en las 3 páginas el `<link rel="stylesheet" href="assets/styles.css">`
  va ANTES del `<style>` local: si se centralizara la versión de
  directorio+perfil en `styles.css` y se dejara la regla de admin.html tal
  cual (sin `font-family`), la cascada NO fusiona por bloque sino por
  propiedad — el `font-family:var(--f-display)` del selector global
  quedaría ganando en admin.html igual, porque la regla local de admin no
  vuelve a declarar esa propiedad para pisarla. El resultado sería un
  cambio visual real y no pedido (el número de esa cabecera en admin.html
  pasaría de tipografía mono/heredada a `--f-display`). Se descarta la
  fusión de este selector por esa razón, documentado en las 3 páginas.

Ningún cambio visual esperado en lo que sí se movió.

### 18-sep-2026 (cuarto lote) — Fase 3: `.buscador`, `.mr-*`, `.req-row`, `.ext-*`, `.comparativa-grid`, `.chart-tooltip`
Fase 3 del plan (ver Plan_Fases.md, "mover a styles.css lo identificado en
la Fase 0"), reordenada como ya indicaba el propio plan: en vez de partir
de admin.html (que resultó tener el menor volumen de candidatos, 11, de
las 6 páginas auditadas), se ejecuta primero sobre directorio.html/
perfil.html/admin.html/index.html, que sí tenían duplicación exacta
confirmada. Iguales criterio y método que los lotes anteriores: solo se
mueve lo que es idéntico carácter por carácter, comparando propiedad por
propiedad, no por parecido de nombre.

**Movido a `styles.css`** (idéntico en todas las páginas donde vivía):
- `.buscador` / `.buscador input` — admin.html y directorio.html.
- `.miembro-row .mr-name` / `.mr-tag` / `.mr-right` — admin.html y
  directorio.html.
- `.req-row` / `.req-row .lbl` / `.req-row .progress` — admin.html,
  directorio.html y perfil.html (las 3 copias, letra por letra iguales).
- `.ext-grid` / `.ext-item` (+ `.v` / `.k`) — directorio.html y
  perfil.html.
- `.comparativa-grid` — directorio.html e index.html. El propio comentario
  de directorio.html ya decía que "se REUSA .comparativa-grid tal cual"
  desde el 07-sep-2026; esto solo mueve esa reutilización de intención a
  hecho.
- `.chart-tooltip` (+ `.chart-tooltip b`) — directorio.html e index.html.
  Mismo caso: el comentario ya decía "ese sí se reusa tal cual".

**Revisado y descartado por NO ser idéntico** (se queda donde estaba, sin
tocar, cada uno con su propia nota en el `<style>` de origen):
- `.req-row .val` — 3 anchos distintos (admin 90px, directorio 100px,
  perfil 110px con `min-width`+`width:auto`+`white-space:nowrap`).
- `.miembro-row` (la base) — padding y borde distintos entre admin y
  directorio.
- `.miembro-row .mr-rango` — admin.html agrega `text-align:right` que
  directorio.html no tiene.
- `.linechart-svg`/`.grid-line`/`.axis-label` de directorio.html (sección
  "Cara a cara") vs. los mismos nombres en index.html (sección
  "Comparativa semanal"): coincide únicamente `.grid-line` (mismo
  `stroke`/`opacity`) por casualidad; el resto de la familia difiere a
  propósito (aspect-ratio 656/236 vs 960/460, `.axis-label` en 10px/
  `text-faint` vs 15px/`text-dim`) porque son dos gráficos de escala
  distinta — el propio comentario del código ya lo explicaba como una
  copia adaptada, no una reutilización literal. Fusionar solo la línea de
  `.grid-line` que sí coincide habría acoplado dos componentes que el
  propio proyecto mantiene separados a propósito, así que se deja intacto.

Ningún cambio visual esperado — es movimiento de definiciones idénticas y
descarte razonado de las que no lo son, no reescritura de estilos.

### 18-sep-2026 (tercer lote) — `.inactivos-table` / `.roster-table`: solo lo idéntico
Fase 2 original (tablas) había quedado pendiente en dos partes: la
estructura de scroll (ya resuelta antes, `activarBarraScrollTabla()` trata
a las 4 tablas como una unidad) y el contenido visual (bordes, tamaño de
encabezado, hover), que seguía repetido entre `.inactivos-table`
(`styles.css`) y `.roster-table` (`directorio.html`). En vez de forzar una
base común `.data-table` para las 4 (que ya no aplica igual de bien a las
4, según lo visto en la Fase 0), se aplica el mismo criterio milimétrico
usado en los lotes anteriores: fusionar solo lo que es duplicación literal,
carácter por carácter, dejando todo lo demás intacto porque ya no es
idéntico (paddings, tamaños de fuente y alineaciones fueron divergiendo con
los FIX de cada tabla). Comparando regla por regla:

- **Contenedor de scroll**: `.inactivos-table-wrap` y `.roster-table-wrap`
  tenían la misma declaración exacta (`overflow-x:auto;
  -webkit-overflow-scrolling:touch;`). Se fusiona en un selector
  compartido en `styles.css`; se elimina la copia de `directorio.html`.
- **Última fila sin borde**: `.inactivos-table tbody tr:last-child td` y
  `.roster-table tbody tr:last-child td` tenían la misma declaración exacta
  (`border-bottom:none;`). Mismo tratamiento.

Se revisó también el resto de reglas de ambas tablas (padding de celda,
`thead th`, `tbody td`, hover de fila) y **no** son idénticas — difieren en
padding (14px 16px vs 11px 13px), en si `tbody td` trae `font-size` propio
o no, y en el selector exacto del hover (`tr.inactivo-row:hover td` vs
`tbody tr:hover`, mismo valor de color pero atado a nombres de fila
distintos que usa cada JS). Esas diferencias no se tocan — no son
duplicación, son cada tabla con su propio ajuste histórico. Ningún cambio
visual esperado en lo fusionado.

### 18-sep-2026 — `.join-modal-*` y `.rt-filtro-vacio` centralizados
Fase 1 de un refactor de CSS disperso (auditoría previa mostró que el
verdadero problema de duplicación no era volumen general de `<style>` por
página, sino un puñado de componentes copiados carácter por carácter entre
páginas). Dos casos confirmados como duplicación literal, no solo mismo
nombre de clase:

- **`.join-modal-*`** (overlay, modal, botón cerrar, opciones — el modal
  "Cómo unirte" de los botones "Unirse a este clan"): vivía idéntico,
  byte a byte, en el `<style>` de `index.html` y en un segundo `<style>`
  de `directorio.html` (el propio comentario ahí decía "mismo estilo que
  index.html"). Se movió a `styles.css`; se eliminó de ambas páginas.
- **`.rt-filtro-vacio`** (mensaje "Sin coincidencias." del filtro A-Z de
  las tablas): idéntico en `directorio.html` y `guerra.html`. Se movió a
  `styles.css`; se eliminó de ambas.

De paso, el segundo `<style>` de `directorio.html` tenía `.field textarea`,
`.vetar-form` y `.vetar-form-titulo` — código muerto: ya estaban
centralizados en `styles.css` desde el 1-sep-2026 (ver comentario ahí
mismo) y esta copia era una réplica exacta sin usar. Se eliminó sin mover
nada (ya existía el destino).

Ningún cambio visual esperado — es movimiento de definiciones idénticas,
no reescritura de estilos.

### 18-sep-2026 (mismo día, segundo lote) — widget de filtro de columna y `.tabs-row`/`.tab-btn`
Auditoría completa de los 49 candidatos a compartir de `directorio.html`
(comparando selector por selector contra `styles.css` y contra el uso de
la misma clase en otras páginas). Este lote cubre los casos confirmados
como duplicación literal, byte a byte:

- **`.tabs-row`/`.tab-btn`(`.active`)**: idéntico en `directorio.html` y
  `guerra.html`.
- **Widget completo de filtro de columna** (`.rt-th-inner`, `.rt-filtro-btn`,
  `.rt-filtro-pop`, `.rt-filtro-lista`, `.rt-filtro-item`,
  `.rt-filtro-acciones`, `.rt-filtro-cancelar`, `.rt-filtro-aceptar`,
  `.rt-filtro-divisor`, `.rt-filtro-orden`, `.rt-orden-btn`/`.rt-orden-quitar`,
  `.rt-orden-indicador`, `.rt-filtro-comparar`, `.rt-filtro-todos`,
  `.rt-filtro-todos-btn` — 15 clases en total): idéntico entre
  `directorio.html` y `guerra.html`. El propio comentario de guerra.html ya
  lo admitía ("mismo widget... CSS traído tal cual de ahí para que ambas
  páginas se vean y se sientan igual") — esto solo mueve esa admisión de
  intención a la realidad del código: una sola definición en vez de dos
  copias a mantener sincronizadas a mano.

**Quedan pendientes y ya identificados** (no exactamente idénticos, requieren
una decisión chica antes de fusionar — ver plan de refactor CSS):
- `.buscador`, `.ext-grid`/`.ext-item`(+`.v`/`.k`), `.mr-name`/`.mr-tag`/`.mr-right`,
  `.grid-line`, `.comparativa-grid`, `.chart-tooltip` — duplicados exactos,
  listos para mover en la próxima sesión.
- `.req-row`/`.lbl`/`.progress` (exactos) + `.val` (3 anchos distintos:
  100px/90px/110px — confirmar si es a propósito antes de unificar).
- `.perfil-cabecera`/`.stats-mini` (3 variantes chicas de tamaño de fuente).
- `.miembro-row` (padding/borde levemente distintos entre directorio y admin,
  más `.mr-vigencia` que solo existe en directorio).
- `.lbl`, `.val`, `.activo`, `.name`, `.chart-title`, `.axis-label`/`.axis-title`:
  mismo nombre de clase pero componentes distintos (timeline, resumen,
  varios estados "activo", gráficos de tamaño intencionalmente distinto) —
  coincidencia de nombre, no duplicación real, no tocar.
