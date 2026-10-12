# Changelog — Familia Terna (frontend)

Lista corta de lo que se hizo, de más reciente a más antiguo. Cada entrada trae fecha, archivo y función tocados, una línea de qué cambió, la versión de `sw.js` si aplica y el enlace al contexto (`§PFxxx` de `Contexto_Base_Web.md`, repo `Backend`).

**Cómo funciona el código hoy, por qué se decidió así, qué se probó y se descartó: no va aquí, va en `Contexto_Base_Web.md`.** Las reglas de redacción están en `Consolidados de cambios/Reglas_Consolidados.md` (repo `Backend`), sección 5. Los pendientes tampoco viven en cada entrada: están en «Abiertos». El detalle largo anterior sigue en el historial de git.

*Traslado en curso (desde el 11-oct-2026):* las entradas desde el 04-oct-2026 ya están en formato corto y su contenido pasó a `§PF025` (8 y 9-oct), `§PF027` (5 a 7-oct) y `§PF018` (octava sesión, 2 al 5-oct). Las tandas 4 a 2 del 03 y 02-oct, la Fase 11 y el TBT de `guerra` (02-oct) también pasaron a `§PF018`, y la séptima y la sexta sesión (30 y 29-sep), las tandas D, C, B y A de la Fase 5b (28-sep), la Fase 11 del plan T_Lista (26-sep) y los comentarios desactualizados (21-sep) a `§PF017`. Del 20-sep pasaron a `§PF016` «Rendimiento (Lighthouse)», «CSS compartido», `permisos`, `mensajes` y `comunidad`. Quedó trasladado todo el 20-sep (`admin`, `perfil`, `directorio`, `index` y `guerra`) a `§PF016`. Quedó trasladado todo el 19-sep a `§PF016`: «CI y herramientas», «Rendimiento (Lighthouse)» y «SEO», «CSS compartido», `permisos`, `mensajes` y `guerra`. Con esta tanda quedaron trasladadas también las entradas de `guerra.html` del 21-sep (`§PF017`) y del 18-sep (`§PF016`). Los bloques «Línea original N (estilo)» de `guerra.html` (4 a 16-sep) y sus 10 bloques «(HTML)» (31-ago a 13-sep) pasaron a `§PF028`; sus 15 primeros bloques «(script)» (30-ago a 17-sep) pasaron a `§PF029`. Sus otros 15 bloques «(script)» (4 a 15-sep) pasaron a `§PF030`; en `guerra.html` ya no queda ningún bloque «(script)» con texto largo. Todo lo anterior (hoy ordenado por tema y archivo, no por fecha, incluidos los bloques «Línea original N» y las demás secciones por archivo) conserva su texto largo hasta que se trasladen, por tandas y de la fecha más reciente a la más antigua.

---

## Abiertos

Se actualiza al cumplirse o cambiar; al cumplirse, la línea se borra (queda la entrada del cambio, abajo).

- **Decisión del usuario: respaldo local para las cargas que salen de un JSON estático.** Hoy no guardan nada en el respaldo local (`_backupLocalGuardar()` solo se llama dentro de `apiGet()`), así que `staleIfError` no ayuda a quien siempre recibe datos por JSON, ni sin conexión. Riesgo: `guerra.json` pesa unos 920 KB y localStorage tiene unos 5 MB; habría que decidir qué archivos sí guardar. (Plan «JSON estático como último recurso», 09-oct-2026.)
- **Por verificar en el backend (requiere subir `Base.md`):** si `doGet` cae a los `Backup_*.csv` cuando falla la lectura de Sheets; qué claves publican realmente `50_` a `53_Publicar_*.gs`; si el bot sigue republicando cuando Sheets falla; y si `home.json`, `roster.json`, `torneos.json`, `guerra_ctx.json` y `guerra_top.json` traen `tiempos.api.ultimaConsultaTs` (hoy solo se sabe de `guerra.json`; el frontend ya lo muestra solo si existe). El usuario enviará el backend cuando terminen estas fases.
- **Por definir:** `index.html` y `clan.html` calculan los tres momentos por su cuenta; podrían pasar a `fmtTresTiemposDeResultado()` para tener una sola forma. No se tocó para no abarcar de más.
- **Por verificar al desplegar el backend (requiere subir `Base.md`):** (a) el tiempo de `?dashboard=json` en día de guerra con `metaCruzada` (estuvo desactivada desde el 19-sep por tardar 28 a 39 s; si vuelve a ser lenta, revisar `_getMapaCruceMetaGuerraLogs_()`); (b) que viernes y sábado no salgan como opcionales por error y que `_diasOpcionalesClanSemana_()` recorra viernes a domingo (07-oct-2026). → §PF027
- **Por verificar con `Base.md`:** comentario de `alMax` en `pintarColeccion()` (`perfil.html`): falta documentar en el backend el comportamiento del nivel máximo; y que `ext.batallas` sea siempre victorias más derrotas. → §PF027
- **Sin probar:** que `sw.js` v14 a v16 llegue a un visitante con la versión anterior (ciclo `install`/`activate`), y los cambios del 5 al 7-oct de `perfil.html`, `guerra.html` y Noticias en navegador con backend real. → §PF027
- **Sin probar contra el backend real ni en Apps Script real:** `sesionVencida` (que un token vencido o cerrado desde otro dispositivo traiga la marca, y que con sesión válida o como visitante no aparezca el aviso; `38_Web_Endpoints.gs`) y `corregido` de «Ingresar link» (`26_Torneos_Core.gs`, `37_Web_API.gs`, `44_BotWhatsApp.gs`); además, lector de pantalla real, Firefox y Safari en esas pantallas. (02 y 03-oct-2026) → §PF018
- **Sin comprobar, TBT de `guerra` (02-oct-2026):** no se corrió Lighthouse real y no se sabe cuántos jugadores tiene hoy cada clan en producción (el banco usó 50). Idea sin probar para bajar más la tarea larga (~500 ms con CPU 4×): no construir el `<tbody>` de los clanes ocultos hasta elegir su pestaña, o repartir el pintado de Control de Temporada. → §PF018
- **Sin verificar, cartas (29-sep-2026):** que en `perfil.html` se vean la carta favorita, el mazo y la colección tras el cambio de la CSP (abrir un perfil y mirar F12 → Consola; `perfil.html` no lo audita Lighthouse); al publicar, pulsar los dos botones Héroe/Evolución de una carta de `index.html` (`cambiarVarianteCarta()` cambia el `src` de la imagen, ahora de 72×84); y el alto real del chip con las 10 cartas y sus filas de Héroe/Evolución. Sin explicar: la primera corrida de cada tanda de Lighthouse sale mucho peor (parece arranque en frío). → §PF017
- **Sin probar, Fase 5b tandas D y B (28-sep-2026):** nada en Apps Script real ni en navegador real. Falta confirmar que un ex-miembro sale con `tag:null` (nombre sin enlace) y un activo con su Tag real (nombre con enlace), con y sin sesión de admin, y revisar los 5 lugares de `torneos.html` en escritorio y móvil; y que el aviso de «clan rival» no llegue a un visitante (backend: `_webTorneos()` y `_webIngresosRecientes()` en `37_Web_API.gs`). → §PF017
- **Accesibilidad (12-oct-2026), pendiente:** D-20 con datos simulados completos (hoy solo un barrido de clases: ver §PF050); lector de pantalla real, Firefox y Safari (lista de 7 pasos en §PF050; el 6 es pulsar un nombre de jugador y comprobar que el lector dice «se abre en una pestaña nueva» y el 7, Gestionar y Cancelar en Resolución). El navegador para medir se consigue con `@sparticuz/chromium` por npm. Hechos el 12-oct: `target-size` de `guerra` (v52), Q-1 (v53), Q-2 (v54) los ceros de `guerra` (v55) y los enlaces de `admin.html` (v56). → §PF050
- **Sin probar en navegador real (12-oct-2026):** los cambios de `sorteo.html` (nombres accesibles y contorno de foco de los interruptores) y de `admin.html` (foco tras «Marcar visto»); lector de pantalla real, Firefox y Safari. → §PF049
- **Urgente (la usuaria): rotar el token de administradores que estuvo escrito en `guerra.html`, si sigue vigente.** El código ya no lo usa (30-ago) y se quitó de este archivo el 11-oct, pero este repo es público y el texto **sigue en su historial de git**; solo cambiarlo en el backend lo deja inservible. No se verificó si sigue activo; no se escribe aquí. (11-oct-2026) → §PF029

---

## 12-oct-2026

- **`clan.html`, `assets/js/core/config.js` y `sw.js` · Tarjeta «Evolución · Copas del clan».** Tarjeta nueva `#clanCopasCard` entre el resumen de guerra y el roster, con `clanCopasSvg()` (línea de copas por día de guerra, eje con piso redondo, puntos enfocables con texto accesible) y `cargarCopasClan()` (`apiGet('webClanCopas', { tag })`; sin datos, sin tag o con error muestra un aviso). Dato: columna Copas de Guerra_Logs, una fila por día y por clan. Prueba nueva `test/clan-copas-grafica.test.js`. `config.js`: se documenta la acción nueva (20 acciones). `sw.js` v62. [→ Contexto_Base_Web.md §PF062]
- **`perfil.html` y `sw.js` · Gráfica «Copas» en Evolución, después de Ranking.** Sección nueva `#mCopasChartCard` y `renderCopasChart(ext, copasActuales)`: lee `copas` de `ext.historialRanking` (hoja Guerra, columna Copas) y la pinta con `pintarGraficaPerfil()`, eje desde un piso redondo bajo el mínimo. Copas 0 o ausentes = sin dato; si no hay ninguno, muestra un aviso con las copas actuales (el historial empieza el 12-oct-2026, no hay datos anteriores). Prueba nueva `test/perfil-copas-grafica.test.js`. `sw.js` v61. [→ Contexto_Base_Web.md §PF061]
- **`perfil.html` y `sw.js` · «Cartas de desafíos» a 2 columnas y títulos de minigráficas en negrita.** `renderExtendido()`: `extItem(ext.cartasDesafios, …)` pasa `ancho=2` (mismo mecanismo que Arena). CSS `.mini-pie-titulo`: `font-weight` de 600 a 800; esa clase la usan los títulos de las minigráficas y de las dos tarjetas de Competitivo (Camino de Leyendas y Camino de Trofeos). `sw.js` v60.
- **`perfil.html` y `sw.js` · Menos espacio en blanco bajo las gráficas de Evolución.** CSS nuevo `.pf-evo-seccion{padding:0}`: las gráficas son `<section>` y heredaban `section{padding:72px 0}` de `assets/styles.css` (72 px vacíos bajo cada una y otros 72 px sobre la primera). La tarjeta con una gráfica pasa de 1163 a 803 px de alto en el banco. `sw.js` v59. [→ Contexto_Base_Web.md §PF060]
- **`perfil.html` y `sw.js` · Cintas en las 7 tarjetas que no la tenían.** `perfil.html`: tarjetas Competitivo (`#mLeyendasCard`), Evolución, Mazo actual, Batallas más recientes, Ciclo de cofres, Colección completa y Progreso de eventos y modos llevan `.pf-cinta` y `--cinta`; CSS nuevo `.pf-cinta--anidada` (Mazo actual, Colección y Evolución, cuyo eyebrow o título no es hijo directo de la tarjeta). `sw.js` v58. Archivos nuevos `assets/img/cinta-{competitivo,evolucion,mazo,batallas,cofres,coleccion}-2.webp` (6, de 10 a 23 KB). Una cinta se repite (Progreso reutiliza `cinta-batallas-2.webp`). [→ Contexto_Base_Web.md §PF056]
- **`perfil.html` · «Banners» pasa a «Estandartes».** `renderExtendido()`: etiqueta y `alt` del cuadrito (el dato sigue siendo `ext.banners`; el nombre de la columna «Banners» de la hoja y los CSV no se tocó). [→ Contexto_Base_Web.md §PF055]
- **`perfil.html` · Escudo del clan e insignia de guerra junto al nombre.** Nuevo contenedor `.perfil-cabecera-izq` (nombre, `#mClanIconoWrap`, `#mInsigniaGuerraWrap`): como hijos sueltos de `.perfil-cabecera` (`space-between`) las imágenes se repartían por la fila y la insignia quedaba en el extremo derecho. Tamaños máximos: escudo 84 px, insignia 72 px. [→ Contexto_Base_Web.md §PF059]
- **`perfil.html` · Línea «Estado · Rango (Tag)» e insignia de guerra junto al escudo.** `renderMiembro()`: `mSub` pasa de «#TAG · Rango · Estado» a «Estado · Rango (#TAG)»; nuevo `#mInsigniaGuerraWrap`, a la derecha del escudo del clan, con el ícono de la insignia `ClanWarWins` del jugador (tooltip con nivel y progreso; oculta si no la tiene). [→ Contexto_Base_Web.md §PF059]
- **`perfil.html` · Nombre del jugador en dorado brillante y cintas con nombre nuevo.** CSS `#mNombre`: degradado dorado con leve brillo. `assets/img/cinta-*.webp` pasan a `cinta-*-2.webp`: el service worker sirve primero la copia guardada, así que con el mismo nombre se seguía viendo la cinta vieja con muesca. [→ Contexto_Base_Web.md §PF058]
- **`perfil.html` · Cintas decorativas hasta el borde derecho y pastilla legible.** `assets/img/cinta-*.webp` se rehacen recortando solo el arte interior (sin el marco ni la muesca de la cinta del Fan Kit, que dejaba un hueco a la derecha), a 1000 px de ancho (10 a 18 KB); CSS `.pf-cinta > .eyebrow`: fondo oscuro semiopaco para que se lea «Insignias y logros». [→ Contexto_Base_Web.md §PF056]
- **`perfil.html` · «Competitivo» sube debajo de las minigráficas.** La tarjeta `#mLeyendasCard` pasa de ir después de «Batallas más recientes» a ir justo después de la tarjeta de cabecera (que termina con `#mMiniGraficosWrap`), antes de Evolución. Solo se movió HTML; sin cambios en JS ni CSS. [→ Contexto_Base_Web.md §PF057]
- **`perfil.html` y `404.html` · Decoración con cintas y emotes del Fan Kit.** `perfil.html`: tarjetas Insignias, Logros y Carta favorita con una cinta difuminada arriba (clase `.pf-cinta`, variable `--cinta`; CSS nuevo `.pf-cinta`, `.pf-vacio-emote`); `_pintarInsignias()`: el «Ninguna todavía.» lleva un emote. `404.html`: emote sobre el código de error. Archivos nuevos `assets/img/cinta-*.webp` (3, ~13 KB) y `emote-*.webp` (2, ~8 KB), reducidos desde los PNG originales. [→ Contexto_Base_Web.md §PF056]
- **`perfil.html` · Íconos pequeños en los cuadritos y en la cabecera.** `renderExtendido()`: cada cuadrito lleva su ícono a la izquierda de la etiqueta (5.º parámetro de `extItem()`; constantes `_ICO_CUADRITO_*` y `_icoCuadritoHtml()`); Puntos de experiencia usa `XP.webp`; Arena lleva 🏟️. Cabecera: ícono en Nivel de torre del rey, y en V. Guerra y Nivel de colección el de su insignia (`ClanWarWins`, `CollectionLevel`) vía `renderStatsAvanzadasCabecera()`. Archivos nuevos `assets/img/ico-*.webp` (7, de 1 a 2 KB, hechos desde el Fan Kit). [→ Contexto_Base_Web.md §PF055]
- **`perfil.html` · «Puntos de experiencia» muestra solo el valor actual** (antes «actual / total»). `renderExtendido()`: `extItem(fmtNum(raw.expPoints), …)`; el cuadrito sigue ocupando 2 columnas. [→ Contexto_Base_Web.md §PF054]
- **`perfil.html` · «Competitivo» ahora es gráfico.** `renderCaminoLeyendas()`: las dos tablas pasan a dos tarjetas `.mini-pie` (anillos de liga para Camino de Leyendas, barras de trofeos con marca de máximo para Camino de Trofeos); CSS nuevo `.leyendas-grid`, `.liga-anillo*`, `.trofeos-*`; se borra `_polTxt()`. Mismos datos que antes. [→ Contexto_Base_Web.md §PF053]
- **`perfil.html` · Nuevo orden de las secciones del perfil** (revierte las ubicaciones del 23-sep, 21-sep y 11-oct-2026). De arriba abajo: cabecera, requisitos y cuadritos, minigráficas, Evolución, Mazo actual, Carta favorita, Batallas más recientes, Competitivo, Ciclo de cofres, Colección completa y Cartas de torre, Insignias, Logros, Progreso de eventos y modos. Solo se movió HTML (los bloques `#perfilContenido > .card`); sin cambios en JS ni CSS. [→ Contexto_Base_Web.md §PF052]
- **`perfil.html` · Nivel promedio en «Cartas por nivel» y botón «Sugerencias de mazo (3)».** `renderExtendido()`: pastilla «Nivel promedio» (promedio ponderado por cantidad de cartas, truncado a 2 decimales) en el pastel de la colección; `_pastelMiniHtml()`: la pastilla acepta `titulo` y en la leyenda con columna ocupa toda la fila (CSS `.con-col .mini-pie-extras`); `renderMazoActual()`: tercer botón con `ext.deck3`/`ext.deck3Nivel`, que manda el backend (`generarMazo3()`, repo `Backend`, `Base/src/31_Cards_Mazos.gs` y `37_Web_API.gs`). Mazos que solo usan cartas de nivel ≥ parte entera del promedio. [→ Contexto_Base_Web.md §PF051]
- **`perfil.html` · Los puntos de las minigráficas de ataques/barcos y medallas quedan centrados sobre la letra de su día.** `_dispersionMiniHtml()`: `OFFSET` pasa de 8 a 0 (antes cada serie se corría 4 px a un lado del centro, y la morada quedaba a la derecha de la amarilla). Para que un punto no tape al otro cuando coinciden, la segunda serie usa radio 3.5 en vez de 5. [→ Contexto_Base_Web.md §PF051]
- **`perfil.html` · Las 4 minigráficas ocupan todo el ancho y se alinean al fondo de su tarjeta; Ratio V/D y Racha pasan bajo Derrotas.** CSS de `#mMiniGraficosWrap`: la grilla pasa de `auto-fit/minmax(230px)` a 4 columnas iguales (2 bajo 1100 px, 1 bajo 560 px) y el estilo en línea del HTML sale a la hoja de estilos; el SVG de dispersión y el donut escalan con la tarjeta (tope 340 px, antes 243 px); la zona de la gráfica se ancla al fondo con `margin-top:auto` y la leyenda ya no tiene alto fijo. `_pastelMiniHtml()`: `extraHtml` (`.mini-pie-extras`) se pinta dentro de `.mini-pie-leyenda`, bajo la última fila. Sin cambio en `sw.js` (`perfil.html` no está en `CORE_ASSETS`). [→ Contexto_Base_Web.md §PF051]
- **`perfil.html` · Los botones de acciones suben a la cabecera del perfil.** RoyaleAPI, CWStats, Vetar, Ver torneos, Ver otras cuentas e Historial de guerra (`#mAccionesRow`) pasan de debajo de la card a la columna derecha de la cabecera, debajo de nivel, copas y vigencia (contenedor nuevo `.perfil-cabecera-der`). Los paneles que abren (`#mTorneosWrap`, `#mOtrasCuentasWrap`, `#mHistorialGuerraWrap`, `#mVetarWrap`) suben justo debajo de la cabecera. Los ids no cambian, no se toca JS. `sw.js` no cambia (`perfil.html` no está en `CORE_ASSETS`). Sin probar en navegador real.
- **`sw.js` v57 · `admin.html` · En Resolución, el foco pasa al formulario al abrirlo y «Cancelar» lo devuelve al botón de origen (H-1 y H-2).** `abrirResolucionForm()`: guarda en `resolucionBotonOrigen` el botón de `#ganadoresLista` que tenía el foco y, al final, enfoca `#resTipo` (`preventScroll`); `#resTipo` lleva `aria-describedby="resolucionParaTexto"` para que el lector diga a quién se aplica. Listener de `#btnCancelarResolucion`: devuelve el foco a ese botón y, si ya no está visible, a `#ganadoresLista`. Medido en Chromium real: antes 51 Tab hasta el formulario y foco en `<body>` tras Cancelar; ahora 0 Tab y foco en el botón. `test/foco-resolucion-dom.test.js` (+5; `node --test` pasa de 374 a 379). Decidido por Claude por delegación de la usuaria (12-oct-2026). → §PF050

- **`scripts/medicion-accesibilidad/` · Banco de medición guardado en el repo (sin cambios en la web).** Archivos nuevos: `lib.js` (servidor, interceptor y sesión de admin simulada), `axe.js`, `mide_modificar.js`, `mide_tab.js`, `mide_resolucion.js`, `package.json` y `LEEME.md`. No forma parte de la CI ni de `sw.js`. Con él se midieron Modificar torneo/sorteo y Resolución (axe completo en 0; dos hallazgos de foco en Resolución). → §PF050

- **`sw.js` v56 · `admin.html` · Más espacio entre el enlace del clan y el del jugador en la tarjeta de cuentas (objetivo de 24 px, WCAG 2.5.8).** Plantilla de la cuadrícula de cuentas (`wrap.innerHTML`, rótulo `🍀 enlaceClan(m._clan)`): `margin-bottom:6px` pasa a `12px`. Medido en Chromium real con la estructura real, a 390 y 1280 px: antes fallaba (los círculos de 24 px de los dos enlaces se tocaban), ahora cumple; las otras 7 plantillas de enlaces de `admin.html` (ascensos editables, noticias, movimientos, ganadores, celdas y chips) ya cumplían. `node --test` (374), lint y `html-validate` en verde. → §PF050
- **`sw.js` v55 · `guerra.html` · Los ceros de las cuadrículas tienen contraste suficiente (WCAG 1.4.3).** CSS `.ai-cell-zero`: de `color:var(--text-dim); opacity:.5` (2.7:1) a `color:var(--text-faint)` (~5:1); las filas con todo en cero (`tr.ai-fila-cero`) no cambian. Hallado con un barrido de axe sobre las clases de color que pinta el JavaScript (12 páginas, 390 px): era el único fallo. Comprobado en una celda de tabla real; `node --test` (374) y `html-validate` en verde. → §PF050
- **`sw.js` v54 · `assets/styles.css`, `assets/js/util.js` · Los enlaces de jugador y de clan avisan al lector de pantalla de que abren una pestaña nueva.** `styles.css`: clase nueva `.sr-only`; `util.js`: `enlaceJugador()` y `enlaceClan()` añaden `<span class="sr-only"> (se abre en una pestaña nueva)</span>` después del nombre, solo si no se usa `mismaVentana`. Medido en Chromium real: el enlace conserva su ancho, sin desborde horizontal y axe en 0. `test/util.test.js` (+3 pruebas) y `test/clan-card.test.js` (expectativa del HTML del enlace) actualizados; `node --test` pasa de 371 a 374; lint y `html-validate` en verde. → §PF050
- **`sw.js` v53 · `admin.html` y `guerra.html` · Los enlaces de jugador que van dentro de una frase se ven como enlace sin pasar el mouse (WCAG 1.4.1).** CSS nuevo `.nt-linea a.jugador-link` (`admin.html`) y `.part-lista a.jugador-link` (`guerra.html`): `text-decoration:underline dotted; text-underline-offset:3px`. Celdas de tabla, `<h3>` y chips no cambian. Comprobado en Chromium real; `html-validate` y `node --test` (371) en verde. → §PF050
- **`sw.js` v52 · `guerra.html` · Más espacio entre las filas de las listas de participación (objetivo de 24 px, WCAG 2.5.8).** CSS `.part-lista li`: `margin-bottom:3px` pasa a `padding:6px 0; margin:0` (afecta a `_liCuentaParticipacion()` y al bloque «Ataques en más de un clan hoy»). Medido en Chromium real a 390 y 1280 px: antes fallaba, ahora cumple por espaciado. Lint, `html-validate` y `node --test` (371) en verde. → §PF050
- **`sorteo.html` · Los controles de «Reglas del sorteo» y de la lista de participantes tienen nombre accesible, y los interruptores muestran el foco con teclado.** Marcado de `#prizeCountInput`, `#discardToggle`, `#discardTrialsToggle` y `#removeTicketPerSpinToggle` (`aria-label` más `aria-describedby` hacia `#prizeCountHint`, `#discardHint`, `#discardTrialsHint` y `#removeTicketHint`) y de `#titleInput`, `#descInput`, `#newParticipant` y `#bulkText` (`aria-label`); CSS nuevo `.switch input:focus-visible + .slider`. Sin cambio visual con mouse. `sw.js` no cambia (v51; la página no está en `CORE_ASSETS`). → §PF049
- **`admin.html` · «Marcar visto en el grupo» ya no le quita el foco a quien pasó a otro control mientras esperaba.** Listener de `#ganadoresLista`, rama `.btnMarcarGrupoManual`: la condición `teniaFoco || activeElement === body` pasa a `activeElement === body`. → §PF049
- **`test/nav-escape-dom.test.js`, `test/foco-p4-dom.test.js` y `test/sorteo-accesibilidad.test.js` · 21 pruebas nuevas.** Escape en el menú móvil (P-1), foco tras un veto y tras «Marcar visto» (P-4) y nombres accesibles de `sorteo.html`; en total `node --test` pasa de 350 a 371.
- **Corrección de lo anotado antes (regla 9): P-1 y P-4 ya estaban aplicados.** P-4 figuraba en «Abiertos» como pendiente, pero desde el 06-oct-2026 `perfil.html`, `enviarVeto()`, lleva el foco al mensaje «Miembro vetado.» y `admin.html`, listener de `#ganadoresLista`, lo lleva a la insignia «Visto en el grupo (manual)» de la misma fila; no se había registrado. P-1 (Escape) sigue como en la entrada del 11-oct (`sw.js` v27). → §PF049

## 11-oct-2026

- **`sw.js` v51 · `timeline-svg.js`, `perfil.html` y `directorio.html` · El tooltip del mouse en las gráficas se voltea a la izquierda cerca del borde derecho.** `timeline-svg.js`: función nueva `posicionarTooltipGrafica()` (también se voltea hacia arriba cerca del borde inferior); `pintarGraficaPerfil()` (`perfil.html`) y `activarTooltipsGraficasIngresos()` (`directorio.html`) la usan en su `mousemove`; `eslint.config.js`: global nuevo. Pruebas (350: 4 nuevas en `test/timeline-svg-dom.test.js`), lint y `html-validate` en verde; sin probar en navegador real. → §PF044

- **`sw.js` v50 · `perfil.html` · Se quita la pastilla «Camino de Leyendas · N» y se alinean las 4 minigráficas.** `renderExtendido()`: se elimina el bloque `camino` y `#mExtWrap` queda vacío (la información sigue en «Competitivo»). CSS de `#mMiniGraficosWrap`: las 4 tarjetas tienen la misma estructura vertical (título, leyenda de 50 px alineada arriba, zona de gráfica del alto del SVG de dispersión) y el anillo de los donuts coincide con el trazado de las dispersiones; las medidas escalan con el ancho de la tarjeta (`cqw`, bajo `@supports`). Pruebas (346) y lint en verde; medidas calculadas, sin probar en navegador real. → §PF038, §PF039

- **`sw.js` v49 · `perfil.html` · «Evolución» (las gráficas) va después de la Colección completa de cartas.** HTML: el recuadro `.pf-evolucion` (Ranking, Ataques, Medallas y Barcos) pasa de estar después de «Progreso de eventos y modos» a ir entre `#mColeccionCard` e `#mInsigniasCard`; no cambian contenido ni ids. Orden actual: Mazo actual, Favorita, Colección, Evolución, Insignias, Competitivo, Logros, Progreso, Ciclo de cofres, Batallas. Pruebas (346) y lint en verde; sin probar en navegador real. → §PF038

- **`sw.js` v48 · `perfil.html` · «Ciclo de cofres» y «Batallas más recientes»: los botones pasan a pastillas.** HTML de `#mCicloCofresCard` y `#mBatallasRecientesCard`: el contenedor pasa a `.ext-links` y los botones (`#mVerCicloCofresBtn`, `#mForzarCofresBtn`, `#mVerBatallasRecientesBtn`, `#mForzarBatallasBtn`) pierden las clases `btn`/`btn-primary` y el `margin-left` en línea; los ids y el JS no cambian. Pruebas (346) y lint en verde; sin probar en navegador real. → §PF037

- **`sw.js` v47 · `perfil.html` · «Ataques por semana» y «Medallas por semana»: línea punteada en el tope (4 y 900) y anomalías marcadas.** `perfilLineChartSvg()` recibe `opts.tope`: dibuja `.linea-tope` con su rótulo, la escala siempre lo incluye y los puntos reales por encima salen en rojo (`.serie-pt-anomalia`, `data-tope`); `pintarGraficaPerfil()` agrega la fila de leyenda y el aviso `.pf-tope-resumen` con las fechas y valores; `htmlTooltipPuntoPerfil()` y `etiquetaPuntoPerfil()` lo advierten. Funciones nuevas `filtrarDiasGuerraPerfil()` y `puntosSobreTope()` (el filtro jueves–domingo salió de `perfilLineChartSvg()`); constantes `TOPE_ATAQUES_DIA` y `TOPE_MEDALLAS_DIA`; `renderMetricasSemanales()` las pasa. Prueba nueva `test/perfil-tope-grafica.test.js`. Pruebas (346), lint y `html-validate` en verde; sin probar en navegador real. → §PF036

- **`sw.js` v46 · `perfil.html` · Minigráficas de pastel: la leyenda sube y el donut baja.** Solo CSS: `#mMiniGraficosWrap .mini-pie-cuerpo` pasa a `flex-direction:column-reverse` (sin cambiar el HTML de `_pastelMiniHtml()`); «Cartas por nivel» de la colección no cambia. Pruebas (336), lint y `html-validate` en verde; sin probar en navegador real. → §PF035

- **`sw.js` v45 · `perfil.html` · Minigráficas: los donuts van a la izquierda y las de dispersión llevan marcas en el eje Y.** `renderExtendido()`: `piesDonuts` se concatena antes que `graficosGuerra` en `#mMiniGraficosWrap`. `_dispersionMiniHtml()`: la escala pasa a marcas enteras (0 más 3 o 4 tramos: de 4 a 5 marcas) con rótulo a la izquierda y una línea por marca; el margen izquierdo se calcula según el rótulo más largo; clase nueva `.md-y-label`. Pruebas (336), lint y `html-validate` en verde; escala comprobada con valores de 1 a 3,000; sin probar en navegador real. → §PF035

- **`sw.js` v44 · `guerra.html` · Encabezado de guerra: «Ver pronóstico», conteo de clanes y nota del día suben; se quita el título «Guerra de Hoy».** `#btnVerPronostico` y `#clanCount` pasan a la fila del título (`.gh-fila`, `.gh-acciones`); `#puestoDiaNota` pasa a la derecha del subtítulo (`.gh-sub`, sin recuadro; en pantallas de 860 px o menos baja a su propia línea); el `<h2>` «Guerra de Hoy» queda solo para lectores de pantalla (`.sr-solo`) y se reduce el espacio sobre las tarjetas (de 40 a 28 px). Pruebas (336), lint y `html-validate` en verde; sin probar en navegador real. → §PF034

- **`sw.js` v43 · `guerra.html` · Los botones Jue–Dom cambian el puesto de las tarjetas y se quita el panel «Puesto en vivo».** Se elimina `#tlPanel` y su CSS (`.tl-panel`, `.tlp-head`, `.tlp-x`, `.tlp-list`); `pintarPanelPuestosDia()` pasa a `pintarPuestosDiaEnTarjetas()`, que pinta `.clan-puesto` (en vivo, o al cierre del día elegido) y la nota `#puestoDiaNota`; `actualizarPuestosClanes()`, `seleccionarDiaPuestos()` y `cargarPuestosDia()` la llaman. Solo cambia el puesto: ataques, medallas y barcos siguen siendo los de hoy. Pruebas (336) y lint en verde; función comprobada en jsdom; sin probar en navegador real. → §PF034

- **`sw.js` v42 · `perfil.html` · «Competitivo»: Camino de Leyendas (escalones) y Camino de Trofeos (copas) separados.** `renderCaminoLeyendas()`: la subsección «Ligas» pasa a «Camino de Trofeos» y recibe «Mejor ladder histórico» (antes en Leyendas); cada fila lleva su fecha (octubre, 2026) deducida de `leagueStatistics.previousSeason.id`; Leyendas queda solo con Liga N. Pruebas (336) y lint en verde; función comprobada con el JSON real de `#2GG8PJ8GC`; sin probar en navegador real. → §PF033

- **`sw.js` v41 · `perfil.html` · Medallas en 0 con ataques ya no se dibujan como 0 real.** `renderMetricaSemanal()`: en la gráfica de Medallas, un día con ataques > 0 pero medallas = 0 (la última captura trajo los ataques sin la fama acreditada; caso Chistris `#2GG8PJ8GC`, domingo 4-oct) pasa a punto hueco «sin dato». `perfilLineChartSvg()`: el tooltip de ese punto usa `p.motivo`. No corrige la fila en el backend (pendiente). Sin probar en navegador con el perfil real.
- **`sw.js` v40 · `perfil.html` · Corrige mi arreglo anterior de «Medallas de guerra por día» (v39, punto 4).** Aquel saneo del «corrido» era un diagnóstico equivocado: `jugador.guerraSemanaDias.puntaje` ya llega por día (el backend lo convierte con `_diarioDesdeAcumuladoGuerra_()`, §37B262C) y el frontend lo restaba otra vez. `renderExtendido()`: la serie dorada usa `gsd.puntaje` tal cual y «Acumulado» es su suma corrida (el sábado ya no sale en 0 y el viernes no es negativo); `_guerraDiasDesdeHistorial()`: `puntaje` pasa a valor por día (`diario('puntaje')`) porque el historial trae el corrido. Pruebas (336) en verde; sin probar en navegador real. → §37B262C
- **`sw.js` v39 · `perfil.html` y `directorio.html` · Fechas de antigua a reciente, «Ver más», pastilla de Evolución y medallas del viernes.** (1) `directorio.html`, `construirSemanasMaestras()`: el eje X de las tres gráficas de ingresos ahora va de la semana más antigua (izquierda) a la más reciente; el resto de las gráficas (`perfilLineChartSvg()`, comparador de guerra, `ntLineas()` de `admin.html`) ya iban en ese orden. (2) `perfil.html`: nuevas `_verMasAplicar()`/`_verMasEvaluar()`; Colección completa, Insignias y Maestrías desbloqueadas se recortan a 2 filas (`VER_MAS_FILAS`) con la pastilla «Ver más»/«Ver menos» (el estado sobrevive a re-pintados; las cuadrículas «Por desbloquear» no cambian). (3) `.pf-evolucion > .eyebrow`: se reduce el espacio entre la pastilla «Evolución» y «Ranking en el clan». (4) `renderExtendido()` (cálculo de `trofeosGuerraPorDia` y de la serie «Acumulado»): el corrido semanal de medallas (`gsd.puntaje`) se sanea (nunca baja del máximo ya alcanzado), así un día sin dato (0) ya no da una diferencia negativa ni hunde el «Acumulado». Pruebas (`node --test`, 336) y lint en verde; sin probar en navegador real.
- **`sw.js` v38 · `perfil.html` · Un solo recuadro «Evolución».** Ranking, Ataques, Medallas y Barcos por semana pasan de 4 tarjetas, cada una con su pastilla «Evolución», a una sola tarjeta con la pastilla una vez y cuatro secciones separadas por una línea (`.pf-evo-seccion`). Se mantienen los ids `m…ChartCard`, que ahora son `<section>`; las que no tienen datos siguen ocultas. Sin probar en navegador real.
- **`sw.js` v37 · `perfil.html` · Gráficas del perfil: ancho completo, algo más bajas.** `perfilLineChartSvg()` pasa de viewBox 960x460 a 960x320 y se quita el `max-height` (que angostaba el dibujo); con la tarjeta a pantalla completa mide ~420 px de alto en vez de ~530 px, para que el recuadro quepa con zoom 100%. Sin probar en navegador real.
- **`sw.js` v36 · `assets/styles.css` · `assets/js/ui/tables.js` · `guerra.html` · Encabezados inmovilizados.** Todas las tablas dentro de `.tabla-scroll-wrap` (guerra, directorio, perfil, admin…) dejan los `<th>` pegados arriba al desplazar hacia abajo: `position:sticky` con fondo opaco y borde por `box-shadow`. En encabezados de dos filas (Ataques/Medallas/Barcos + J/V/S/D) `_fijarTopEncabezados()` pone el `top` de cada fila según la altura de las anteriores (se recalcula con el `ResizeObserver`). El tinte de grupo de guerra pasa a `background-image` sobre el fondo opaco. Verificado en jsdom (estilos/`top`); sin probar en navegador real.
- **`sw.js` v35 · `perfil.html` · Gráficas del perfil más bajas.** `.ing-linechart-svg` (Ranking, Ataques, Medallas y Barcos por semana; no las minigráficas): `max-height: clamp(260px, 56vh, 400px)`, así ya no pasa de 600 px de alto con el ancho completo y cabe junto a su título; el dibujo se escala y queda centrado. Solo CSS. **Backend `Base/src` · `37_Web_API.gs`:** `_webPerfilJugador()` ahora lee `Backup_Guerra.csv` (todas las temporadas) y la hoja viva con la nueva `_leerFilasGuerraDeTag_()` (antes solo la hoja, y el CSV solo si Sheets fallaba), así `historialRanking` ya no arranca vacío cada temporada. Sin probar en navegador ni en Apps Script real. → §37B263B
- **`sw.js` v34 · `guerra.html` · Filtros y barras en todas las tablas; Log de Guerra en una sola tabla.** Pendientes de Atacar: encabezados con filtro/orden por columna (Tag, Nombre, Jugador, Préstamo, Rango, Faltantes) con el mismo `inicializarGridFiltro()` de las cuadrículas; el filtro soporta columnas de texto (`tipo:'texto'`, con `ord` para ordenar Rango por jerarquía) y la letra A-Z se combina con los filtros; N° se recalcula. Log de Guerra: una sola tabla (`log:todos`, `data-sin-totales`) con una fila por Temporada/Semana y Puesto/Barcos/Trofeos de guerra por cada clan, N° automático, filtros, valores y tabla centrados; se quitan las pestañas por clan. CSS: `.tabla-scroll-wrap` y `.tabla-scroll-top` con scroll siempre visible en esta página (arriba, abajo y derecha). `directorio.html` solo tiene la tabla del roster, que ya cumplía. Verificado con jsdom (render, filtros, orden, N°); sin probar en navegador real.
- **`sw.js` v33 · `index.html` y `guerra.html` · Sobrenombre solo como extra y botón «Ver pronóstico».** `index.html`: en el Top de la semana y su selector de clanes, el nombre real del clan ya no se reemplaza por «Principal / Clan 2 / Clan 3 / Mini»; `etiquetaClanCorta()` devuelve solo el extra y `clanConExtraHtml()`/`clanConExtraTxt()` lo ponen junto al nombre (revisadas el resto de páginas: ninguna otra lo reemplaza; solo caen al alias en `chartCardHtml()` y `directorio.html` si el backend no manda nombre). `guerra.html`: «Guerra de Hoy» carga primero sin pronóstico; el botón `#btnVerPronostico` (solo en día de guerra) pide `webPronosticoGuerra` y lo muestra, y la segunda pulsación lo oculta (`pronosticoVisible`; `cargarPronosticoGuerra()` ahora devuelve si hubo datos). El puesto en vivo de hoy en el panel de días sigue cargándose solo al abrirlo. Sin probar en navegador.
- **`sw.js` v32 · `guerra.html` · «Participación de Hoy» con scroll y pastillas a la derecha.** `renderParticipacionHoyGuerra()`: el contenido de cada clan (y la lista «más de un clan») va dentro de un recuadro de 360 px con la barra morada (`.part-scroll` + `tabla-scroll-wrap scroll-morado`), solo CSS. `celdaJugadorGrid()`: la pastilla de rango, «Inactivo» y el 📈 forman un grupo pegado a la derecha (`.col-jugador-extras`). Sin probar en navegador.
- **`sw.js` v31 · `guerra.html` y `admin.html` · N°, 📈 a la derecha y fuera «Miembros Activos por Clan».** `admin.html`: la etiqueta de `#mVGuerra` pasa de «Trofeos guerra» a «Victorias de guerra». `guerra.html`: se retira la sección «📊 Miembros Activos por Clan» (HTML, relleno en `render()` y CSS `.resumen-row`); primera columna «N°» en Valores diarios, Valores semanales, Inactivos, Pronóstico y Log de Guerra (ya la tenía Pendientes de Atacar); nuevas `renumerarFilas()` (numera solo las filas visibles, se recalcula al filtrar, ordenar o elegir letra) y `celdaJugadorGrid()` (nombre e insignias a la izquierda, 📈 a la derecha de la misma celda); `datosExportGrid()` lee el nombre de `.col-jugador-nombre`. Sin probar en navegador; las tablas del mini historial (ventana emergente) no llevan N°.
- **`sw.js` v30 · Segunda tanda de «Medallas» (corrige el alcance de la anterior).** `guerra.html`: mini historial (`histPintar()`), comparador (`histPintarComparacion()`), tarjeta de clan y puestos («fame» pasa a «medallas»); Log de Guerra: «Trofeos» pasa a «Trofeos de guerra». `clan.html`: «Fame» pasa a «Medallas». `directorio.html`: gráfica de clanes «Trofeos» pasa a «Trofeos de guerra». `admin.html`: «Medallas de guerra», «Top de medallas», «Medallas de la familia», «Posiciones finales» con «trofeos de guerra», escalón de la ruleta y las dos opciones guardadas («No alcanzó el mínimo de medallas de guerra», «Premio se reparte proporcional a las medallas»). Backend `Base/src`: `25_Doc_AscensosDescensos.gs` (`_rdocADTablaRango()`, `_llenarTablaRequisitos()`), `26_Torneos_Core.gs`, `27_Torneos_Sorteos_Requisitos.gs`, `28_Torneos_Docs.gs`, `29_Docs_NoCalificados.gs`, `30_Mensajes.gs`, `38_Web_Endpoints.gs`, `44_BotWhatsApp.gs` (textos de Docs, mensajes y bot). → §PF029
- **`sw.js` v29 · «Puntaje» pasa a «Medallas» (solo textos visibles).** `directorio.html`: `desgloseDiasHtml()`, `nuevoCardHtml()`, gráficas comparativas y de métricas (`ejeYLabel`). `guerra.html`: `NOMBRES_GRUPO_GRID` y los tres encabezados `ai-grp-pje`. `index.html`: «Más medallas». `perfil.html`: tarjeta y gráfica «Medallas por semana» (`renderMetricaSemanal()`, claves de `unidades`), tabla de historial, «Medallas de la semana actual», «Medallas de guerra por día» y barra «Medallas guerra». `admin.html`: barra «Medallas guerra», tabla de propuestas de Cambio de Rango y los grids de requisitos (antes «Trofeos»). Los nombres internos (`puntaje`, `fame`, `minTrofeosGuerra`) no cambian. → §PF029
- **Backend `Base/src` · `37_Web_API.gs` · cuadrícula diaria de un ingreso sin fila en «Nuevos».** `_construirIngresosRecientesUnificado()`: nuevo `guerraDiasPorTag` (valores J/V/S/D desde Guerra) como respaldo de `guerraSemanaDias`. Corrige el caso de YAHIR (8 ataques y sin cuadrícula). Sin probar en Apps Script real. → §PF029
- **`sw.js` v28 · `guerra.html` · Aviso «Entrenamiento en curso» para todos.** `render()` (cuadrícula de Activos): el aviso sale cuando no es día de guerra y la semana elegida es el `porDefecto` del backend; se borra la copia en `localStorage` (`ternaUltimaGuerraActivos`). Sin probar en navegador. → §PF028
- **`guerra.html` · comentarios con rutas viejas.** Cinco comentarios (A-Z, `pintarFiltroLetra()`, `activarBarraScrollTabla()`) citaban `assets/common.js`; ahora apuntan a `assets/js/ui/filters.js` y `assets/js/ui/tables.js`. Solo texto, sin cambio de comportamiento (no se subió `sw.js`). → §PF029
- **Corrige lo dicho antes: lo congelado del domingo ya se cumple en «Valores diarios».** El backend lista la semana vigente solo hasta la última jugada, así que todo navegador ve el domingo en entrenamiento; no hubo cambio de código. Sin probar en navegador. → §PF028
- **Backend `Base/src` · `17_GuerraSheet.gs` · «Participación de Hoy» recibe `ataquesHoy` por cuenta.** `_getParticipacionHoyGuerra()`: cada cuenta de `reservadas` y `disponibles` lleva los ataques usados hoy en su clan; `guerra.html` (`pendientesHoy()`) no cambió. Corrige lo dicho antes: la página mostraba todas las reservadas con «1 pendiente». Sin probar en Apps Script real ni en navegador. → §PF030
- **`sw.js` v27 · `assets/js/ui/effects.js` · Escape cierra el menú móvil (P-1).** `marcarNavActiva()`: `keydown` en `document`; con el menú abierto, Escape quita `open`, restablece `aria-expanded` y `aria-label` y devuelve el foco a `#navToggle`. → §PF018
- **`sw.js` v26 · `guerra.html` · Día en curso del mini historial.** `histPintar()` y `histPintarComparacion()`: la fila del día en curso se sombrea (`hist-hoy`) y, si lleva menos de 4 ataques y no es opcional, el número lleva un asterisco en superíndice con su nota al pie; el 0 se sigue mostrando como está registrado. Nuevas: `histHoyIso()`, `histPendiente()` y `histNotasDiaEnCurso()`; reutiliza `ATAQUES_MAX_HOY`. Cierra el pendiente de `histStats()`. → §PF027

## 09-oct-2026

- **`sw.js` v25 · Fase 5.** `assets/js/core/api.js`: `apiGetPublicoConEstatico()` (nueva). `guerra.html`: `cargarClanInfoGuerra()` lee `home.json`. `assets/js/features/clan-card.js`: `enlazarLideresClanes()` lee `roster.json`. `eslint.config.js`: globales compartidos. → §PF025
- **`sw.js` v24 · Aviso «⚠ Datos guardados».** `api.js`: `apiGetRespaldoUsado()` y `apiGetConRespaldoEstatico()` (origen `'respaldo-local'`). `util.js`: `marcarDatosGuardados()` (nueva). `index.html`: `obtenerHome()` y `obtenerGuerraTop()` (ahora devuelve `{ data, guardadoDesde }`). `clan.html`: `clanPedirConRespaldo()` y `renderClanGuerra()`. → §PF025
- **`sw.js` v23 · `guerra.html`.** `actualizarAgoText()` pasa a `fmtTresTiempos()`; se eliminan `_haceCorto()` y `_horaLima()`. `util.js`: solo un comentario. → §PF025
- **`perfil.html`.** `obtenerCtxGuerra()` y `_edadCtxGuerraMs()` (nueva): se ignora un `ctx` de guerra de más de 24 h (`CTX_GUERRA_EDAD_MAX_MS`). `sw.js` no cambia. → §PF025
- **`sw.js` v21 y v22 · Fase 4 y hora real de «Consulta».** `torneos.html`: `cargarTorneosEstatico()`, `apiGetTorneosCompartido()`, `textoActualizadoTorneos()` (nueva) y `torneosResultado`. `perfil.html`: `obtenerCtxGuerra()` guarda el `guerra_ctx.json` vencido. `util.js`: `horaConsultaApiGet()` (nueva) y `fmtTresTiemposDeResultado()`. `directorio.html`: `obtenerClanInfoDirectorio()` y `obtenerRoster()`; `comunidad.html`: `obtenerAscensos()`; `index.html`: `cargarClanes()`; `clan.html`: cabecera. → §PF025
- **`sw.js` v20 · Fase 3.** `util.js`: `fmtTresTiemposDeResultado()` (nueva). `directorio.html`: `obtenerClanInfoDirectorio()` (nueva), `obtenerRoster()`, `cargarRoster()`. `comunidad.html`: `obtenerAscensos()`, `cargarAscensos()`. → §PF025
- **`sw.js` v19 · Tres momentos de actualización.** `util.js`: `fmtHaceCorto()`, `fmtFechaHoraLima()`, `tsApiDeDatos()` y `fmtTresTiempos()` (nuevas). `index.html`: `obtenerHome()` y `cargarClanes()`. `clan.html`: `clanPedirConRespaldo()`, `clanObtenerInfo()` y `cargarClan()`. → §PF025
- **`sw.js` v18 · Fase 2.** `api.js`: `apiGetConRespaldoEstatico()` y `_claveCacheApiGet()` (nuevas). `index.html`: `cargarHomeEstatico()`, `obtenerHome()`, `obtenerGuerraTop()`. `clan.html`: `clanLeerEstatico()`, `clanObtenerInfo()`, `clanObtenerRoster()`, `clanObtenerGuerra()`, `clanPedirConRespaldo()` (nueva), `cargarGuerraClan()`, `renderClanGuerra()`. → §PF025
- **`sw.js` v17 · Fase 1.** `api.js`: `apiGetEstaticoConEdad()` y `ESTATICO_EDAD_MAX_MS_DEFECTO` (nuevas). `guerra.html`: `obtenerDatosGuerra()`, `lastEsViejo`, `cargar()`, `actualizarAgoText()`. → §PF025

## 08-oct-2026

- **Registro retroactivo.** El código ya leía JSON estáticos de la rama `data` (`apiGetEstatico()` en `api.js`; `guerra.html`, `clan.html`, `perfil.html`, `index.html`, `comunidad.html`, `directorio.html`, `torneos.html`) sin entrada en este archivo. Detalle de qué página lee qué: §PF025.

---

## 07-oct-2026

- **`admin.html` · Cambio de Rango usa `webAdminSemanasDeTemporada`.** `semanasCompletasDeTemporadaCR()` y `claveTemporadaEnMapaCR()` (nuevas): el selector de semanas pide todas las semanas de la temporada elegida. Backend: `37_Web_API.gs`, `_webAdminSemanasDeTemporada()` (nueva); `38_Web_Endpoints.gs`, ruteo en `doGet()`. `sw.js` no cambia. → §PF027
- **`perfil.html` · Costo en monedas de héroe y escala de `EvolutionLevel`.** Nuevas: `_heroePorDesbloquear()`, `_filaHeroCoin()`, `_heroCoinHtml()`, `COSTO_DESBLOQUEO_HEROE`, `_evoDesbloqueada()` y `_heroeDesbloqueado()`. Tocadas: `_cartaBloqueadaHtml()`, Carta favorita, `_colCartaPasaFiltro()`, `renderColeccion()`, `pintarColeccion()`, `_ordenarCartasMazo()`, `_cartaMazoFallback()` y `renderMazoActual()`. Backend: `37_Web_API.gs`, `_webCartasBloqueadas()` (manda `maxEvolutionLevel`) y `_webMazoActualDesdeCards2()` (`hasEvolution` = nivel 1 o 3). `assets/js/data/clan-badges.js`: solo el comentario de `ICONO_HEROCOIN_HTML`. Corrige la primera versión del mismo día, que mostraba el costo en los Campeones. `sw.js` no cambia. → §PF027
- **Meta ya cruzada: viernes, sábado y domingo (backend).** Corrige el límite al domingo del 06-oct. `40_Web_Noticias.gs`, `_noticiasGuerra_()` (bucle `d = 1..3`); `38_Web_Endpoints.gs`, `_getDatosDashboard()` (`% 7 === 6` pasa a `% 7 > 3`); `37_Web_API.gs`, `_webHistorialGuerraComparador()` (igual); `22_ControlCalendario.gs`, `_clanYaCruzoMetaEnPeriodo()` (`% 7 !== 6` pasa a `% 7 <= 3`). → §PF027
- **Comentarios y avisos puestos al día.** `admin.html`: nota de Noticias, panel de Cambio de Rango, Paso 3 de Sorteos, «cierre de conexión» y «endpoint todavía no conectado». `40_Web_Noticias.gs`: decisiones (a) a (d) confirmadas y avisos [3], [8] y [10] actualizados. → §PF027

## 06-oct-2026

- **`sw.js` v16 · `guerra.html`.** `pintarTablaGuerraLog()`: encabezados del Log de Guerra en español (`Puesto / Barcos / Trofeos`) y `notaLog` de Coliseo; se actualizan el CSS de `#guerraLogWrap` y el comentario HTML de la sección. → §PF027
- **Decisiones de Noticias (la usuaria).** Tope de barcos único por evento y el mismo para los 4 clanes; ataques exonerados al ganar al terminar el sábado, solo el día restante; sorteos identificados por temporada evaluada, semanas y mes evaluado. Backend: `40_Web_Noticias.gs`, `_noticiasLimitesBarcos_()` y `_noticiasEtiquetaSorteo_()`. → §PF027

## 05-oct-2026

- **`admin.html` · Doble envío en 9 botones más (P-9).** `conBotonOcupado()` en `btnGuardar`, `btnRegistrarSorteo`, `btnPlanificarSorteo`, `btnModificarSorteo`, `btnCrGuardar`, `btnCrGenerarPropuestas`, `btnGuardarResolucion`, `btnNmGuardar` y `btnVetar`. `sw.js` no cambia. → §PF018
- **`admin.html` · Barra de scroll tras repintar propuestas (P-10).** `btnCrGenerarPropuestas`: llama a `activarBarraScrollTabla()` sobre `.tabla-propuestas-cr-wrap` tras `tablaEl.innerHTML`. → §PF027
- **`admin.html` · Modificar torneo precarga los premios sin relleno (P-11).** `poblarPremiosEditor(containerId, texto, sinRelleno)` (tercer parámetro nuevo) y `armarPremiosCSV()`; 3 llamadas de `#premiosEditorMod`; texto de pantalla, comentario de `mostrarPaso3()` y docblock de `poblarPremiosEditor()`. → §PF018
- **`admin.html` · Quitar la última fila en Modificar (P-14), Modificar sorteo igual que Modificar torneo (P-15) y foco tras guardar (P-13).** `PREMIOS_EDITORES_OPCIONALES`, `#premiosEditorMod` y `#premiosEditorSorteoMod`; `poblarPremiosEditor()` con `sinRelleno` en las 3 llamadas de `#premiosEditorSorteoMod`; `btnNmGuardar` (aviso a `#nmVerificarMsg`, foco a `#nmTag`) y `btnGuardarResolucion` (foco a «Gestionar» o a `#ganadoresLista`, tras `await cargarGanadoresTorneo()`). → §PF018, §PF027
- **`sw.js` v15 · `assets/js/ui/tables.js` (P-12).** `_prepararBarraScrollTabla()`: `tabindex="-1"` en la barra superior de scroll. Prueba nueva: `test/tables-dom.test.js`. → §PF027
- **`sw.js` v14 · `guerra.html`.** `CACHE_NAME` pasa a `terna-static-v14`. → §PF027
- **`guerra.html` · Partes 2 a 7 de la serie de mejoras (ya estaban en el código; faltaba registrarlas).** `#soloCeroActivosBtn`, `#soloCeroTemporadaBtn` y `gridAplicarFiltros()`; `gridActualizarTotales()`; `botonesExportGrid()` y `datosExportGrid()`; `insigniaRango()`; `botonHistJugador()`; `topSemanaPintar()`. → §PF027
- **`guerra.html` · Meta ya cruzada y mini historial solo con días de guerra.** Tarjeta de «Guerra de hoy» con `guerraPorClan[clan].metaCruzada`; `histSoloGuerra()`, `histEsFalta()`, `histPintar()`, `histPintarComparacion()` y `histStats()`. Backend: `08_Web_Endpoints.gs` (hoy `38_`), `_getDatosDashboard()`; `34_Web_API.gs` (hoy `37_`), `_webHistorialGuerraComparador()` (`opcional`). → §PF027
- **`guerra.html` · «Guerra de hoy» congela el domingo y respeta el orden de los clanes; aviso y leyenda (Parte 1).** `render()` (`ctx.esDiaGuerra`, `#guerraCongeladoAviso`), `.grid-leyenda` y orden por `ordenClanIndex`. Backend: `08_Web_Endpoints.gs`, `_getDatosDashboard()`. → §PF027
- **`guerra.html` · Umbral del verde y % semanal descuentan los días opcionales.** Valores semanales y Resumen con `ataques.opc`. Backend: `08_Web_Endpoints.gs`, `_getControlTemporadaPorClan()` (`ataques.opc`, vía `_diasOpcionalesClanSemana_()`). → §PF027
- **`guerra.html` · Celda vacía cuando el jugador no estuvo en el clan.** Cuadrículas diarias y semanales: `null` pinta celda vacía; filtros y orden. Backend: `08_Web_Endpoints.gs` manda `null` en vez de 0. → §PF027
- **`admin.html` · «Noticias de la semana» conectada.** `#noticiasGrupo`, `#noticiasSemana`, `#btnRefrescarNoticias`, `_noticiasCache`, `_noticiasPedidoId`, `ntColor()`, `ntLineas()`, `ntResumen()` y `ntPanelBarcos()`; llama a `webAdminNoticiasSemana` (`apiGetAuth`). Textos de Participación según ataques exigidos y máximos de barcos por evento. → §PF027
- **Backend · Noticias.** `47_Web_Noticias.gs` (hoy `40_`): `_noticiasGuerra_()` (participación por días en el clan, días opcionales, `fameDias` con `null`) y `_noticiasLimitesBarcos_()` (nueva, un tope por evento). → §PF027
- **`perfil.html` · Las defensas de barco ya no salen como Victoria o Derrota.** `pintarBatallasRecientes()`: con `barcoLado` `defender`, fila neutra `bt-empate` con el texto «Defensa». → §PF027
- **Backend · Cuadrícula de Temporada sin «Sem 5» en temporadas de 4 semanas.** `08_Web_Endpoints.gs` (hoy `38_`), `_getControlTemporadaPorClan()`: las columnas salen de `numSemanasTemporada`. `guerra.html` no cambia. → §PF027
- **Comentarios corregidos y correcciones a este archivo.** `admin.html`: comentario de `#noticiasGrupo` y docblock del listener de `#sSelectHoy`; `perfil.html`: comentarios de `#mCicloCofresCard` y de `pintarColeccion()`. Corrección a entradas anteriores: `ordenClanIndex` vive en `assets/js/util.js` y no en `assets/common.js`, y las Partes 2 a 7 de `guerra.html` ya estaban hechas. → §PF027

---

## 04-oct-2026

- **`admin.html` · Doble envío en Registrar, Modificar y Planificar torneo (P-5).** `conBotonOcupado(btn, fn)` (nueva, junto a `enfocarPrimerControl()`); los tres listeners pasan a `addEventListener('click', () => conBotonOcupado(btn, async () => {...}))`. `sw.js` no cambia. → §PF018
- **`admin.html` · `msg-success` pasa a `msg-ok` (P-6).** Los 4 mensajes de éxito («Corrida guardada…», propuestas agregadas como Planificado, «Guardado.» y «Limpiado…» de la hoja de ganadores); `assets/styles.css` no cambia. → §PF018
- **`admin.html` · Editor de premios, «Quitar» (P-7).** `crearFilaPremioHTML()` (`role="button"`), `renumerarPremios()` (`aria-label="Quitar premio N"`) y `agregarFilaPremio()` (Espacio y foco tras quitar). → §PF018
- **`admin.html` · `#panelCambioRangoAccion`: nombres accesibles y foco al quitar una temporada.** `pintarGridCR()` (`aria-label` en los 24 campos de la grilla) y `agregarBloqueTemporadaCR()` («Temporada a evaluar», «Quitar la temporada N» y foco a «+ Añadir temporada»). → §PF018
- **`sw.js` v13 · `perfil.html`, `admin.html`, `mensajes.html`, `guerra.html`: el foco ya no cae a `<body>` al rehabilitar un botón.** `perfil.html`, `enviarVeto()` (`rehabilitarConfirmar`); `admin.html`, listener de `#ganadoresLista`, rama `.btnMarcarGrupoManual` (`restaurarBoton`); `mensajes.html`, `_activarAccionesContenido()`, `btnVerPdf`; `guerra.html`, `cargar()`, `refreshBtn`. → §PF018
- **Medido, sin cambios de código (P-8).** `admin.html`: «Ingresar link» de Modificar torneo con teclado; Cambio de Rango en los modos «Editar corrida existente», «Ver propuestas» y «Precargar última corrida». → §PF018

## 03-oct-2026

- **`sw.js` v12 · `assets/styles.css`: el menú móvil cerrado sale del orden de Tab.** `@media (max-width:768px)`: `.nav .links` y `.nav .links.open` (`visibility` con retraso de 0,3 s). Afecta a las 12 páginas con menú. → §PF018
- **`permisos.html` y `admin.html`: el foco ya no se pierde tras «Guardar» ni tras un login fallido.** `permisos.html`, handler de `[data-accion="guardar"]` en `activarCardAdmin()`; `admin.html`, listener de `btnLogin` (`teniaFoco`). → §PF018
- **Medido, sin cambios de código.** `permisos.html` y `mensajes.html` con teclado; contraste del indicador de foco (4,43:1). → §PF018
- **`sw.js` v11 · `assets/js/core/api.js` · Aviso cuando la sesión de admin venció (A4/A6).** `apiGet()` (`tokenEnviado`), `_manejarSesionVencida()` y `_mostrarAvisoSesionVencida()` (nuevas). Backend: `08_Web_Endpoints.gs`, `_webMarcarSesionVencida()` (nueva) y `doGet()` (10 endpoints con `sessionToken`). Pruebas: 6 nuevas en `test/api.test.js`. → §PF018
- **`admin.html` · El foco pasa al primer control del paso nuevo en los tres asistentes.** `enfocarPrimerControl()` (nueva), `initTorneoWizard()`, `btnSorteoPaso1`, `btnSorteoPaso2`, `btnCrPaso1`, `btnCrContinuarAscenso` y los enlaces «‹ Cambiar» y «‹ Volver…». Corrige lo dicho en la tanda 3 sobre la causa del defecto. → §PF018
- **`admin.html` · Cuatro correcciones de accesibilidad con sesión.** `crearFilaPremioHTML()` y `renumerarPremios()` (`aria-label` en los campos de premio), `aria-pressed` en el selector Torneos/Sorteos/Cambio de rango, `aria-live="polite"` en los 24 `#…Msg`, y `mostrarPanel()`/`mostrarLogin()` (destino de «Saltar al contenido»). → §PF018

## 02-oct-2026

- **`admin.html` · «Link corregido (ID …)» cuando el backend avisa `corregido`.** Listeners `btnRegistrarTorneo` y `btnModificarTorneo` (rama `esOpcionLink`). Backend: `24_Torneos_Core.gs`, `_registrarTorneoDesdeBot()`; `34_Web_API.gs`, `_webAdminTorneoModificar()`; `29_BotWhatsApp.gs`, `TORNEOS_LINK_HORA`. → §PF018
- **`admin.html` · Nota de «Ingresar link» actualizada y bloqueo de Organizador (Fase 11) medido.** `#tModificarLink` (texto y comentario HTML); medido `#tAutorEditableModWrap` y `#tAutorSoloLecturaMod`. Sin cambio de lógica. → §PF018
- **`sw.js` v10 · `guerra.html` · Menos TBT al pintar.** `render()`: `gestionarTabsClan()` va antes de `activarBarraScrollTablas()` en Pendientes de Atacar, Control de Activos y Control de Temporada. → §PF018, §PF017

## 30-sep-2026

- **`sw.js` v9 · `index.html` · CLS del hero: `display=swap` pasa a `display=optional`.** Los 3 enlaces de Google Fonts (`preload`, `stylesheet` y `noscript`). Cierra el «Abierto: CLS 0.15» de la entrada del 29-sep. `sw.js`: el comentario de versiones suma la línea de v8 («sin fecha ni motivo registrados»). → §PF017
- **`clan.html` · Auditoría de accesibilidad.** `renderClanBasico()`: `aria-level="1"` en el nombre del clan; el enlace «Ver en el Directorio →» (`#clanVerDirectorioLink`) pasa a 24 px de alto. → §PF017
- **`assets/js/core/api.js` · Comentario de `apiGet()` actualizado.** Solo comentario, sin cambio de código ni de `CACHE_NAME`. → §PF017

## 29-sep-2026

- **`index.html` · Imagen de «Cartas más usadas» de 52×60 a 72×84.** `<style>`: `#cartasWrap .carta-chip .cc-img`. `styles.css` sin cambios. → §PF017
- **`index.html` y `perfil.html` · La CSP bloqueaba las imágenes de cartas.** `<meta>` de CSP: se añade `https://api-assets.clashroyale.com` al `img-src` (Buenas prácticas de `index` de 93 a 100). → §PF017
- **Medido, sin cambios de código: Lighthouse tras las tandas 1 a 5, `directorio` y `Skull_05`.** `directorio` CLS de 0,306 a 0,022; `guerra` y `directorio` Buenas prácticas de 96 a 100; CLS de 0,15 del hero de `index` anotado y resuelto el 30-sep. → §PF017

## 28-sep-2026 (Fase 5b, tandas D, C, B y A)

- **`sw.js` v7 · `torneos.html` · El nombre de un ex-miembro ya no enlaza a su perfil (tanda D).** `apiGetTorneosCompartido()` (`conSesion:true`), `enlaceParticipante()` (nueva, en los 5 lugares donde se pinta un nombre), `calcularRankingVictoriasTorneos()` (arrastra `tag`) y CSS `.participante-link`. Backend: `34_Web_API.gs`, `_webTorneos()`, `_webGanadoresTorneoMasReciente()` y `_webHistorialTorneos()` (campo `tag` según `esAdmin`); `08_Web_Endpoints.gs`, `doGet`. Los ex-miembros siguen en el histórico (confirmado). → §PF017
- **Backend · Avisos renumerados (tanda D).** `34_Web_API.gs`: el segundo AVISO A5 pasó a A8 y el nuevo de la tanda D a A9; el 2-oct se volvió a numerar (el que chocaba pasó a A10). → §PF017
- **`directorio.html` · El aviso de «clan rival» de Ingresos recientes solo lo ve un admin (tanda B).** `apiGet('webIngresosRecientes')` con `conSesion:true`. Backend: `34_Web_API.gs`, `_webIngresosRecientes()` (recorta después de leer la caché, no antes de guardarla); `08_Web_Endpoints.gs`, `doGet`. Anotado en la tanda D; el código ya estaba desde la tanda B. → §PF017
- **`sw.js` v6 · `api.js` · El estado «Inactivo» de un Tag solo lo ve un admin (tanda A).** `apiGet()`: opción `opts.conSesion` (sin caché ni `staleIfError`). `perfil.html`: `webPerfil` con `conSesion:true`. `directorio.html`: `webCompararJugadores` con `conSesion:true`. Backend: `34_Web_API.gs`, `_webPerfilJugador()`. → §PF017
- **`guerra.html` · `nomMulti` y `prestamo` de los pendientes solo los ve un admin (tanda C).** `apiGet('webGuerraEnVivo')` con `conSesion:true`; sin `nombre`, el visitante ve el Tag. Backend: `34_Web_API.gs`, `_webGuerraEnVivo()` (recorta después de leer la caché); `08_Web_Endpoints.gs`, `doGet`. Anotado en la tanda D; el código ya estaba desde la tanda C. → §PF017

## 26-sep-2026

- **`admin.html` · «Modificar torneo» refleja el bloqueo del Organizador cuando viene de la API (Fase 11 del plan T_Lista).** `cargarTorneosHoy()`: cada `<option>` de `#tSelectHoy` trae `data-organizador-fuente`. `aplicarBloqueoOrganizadorMod()` (nueva): oculta `#tAutorEditableModWrap` y muestra `#tAutorSoloLecturaMod`; se llama desde el listener `change` de `#tSelectHoy` y se reinicia tras un envío exitoso de «Modificar torneo». Texto de ayuda en `#tAutorSelect` y `#tAutorSelectPlan`; nota en la opción «Ingresar link» de `#tSelectHoy` (reescrita el 2-oct). Solo UI: el servidor ya validaba (`37_Web_API.gs`, `_webAdminTorneoModificar()`). → §PF017

## 21-sep-2026

- **Comentarios desactualizados: tres «pendiente de conectar» que ya estaban conectados.** Solo comentarios, sin cambio de código. `admin.html`: `cargarCuentasDelAutor()` y la subsección «Registrar miembro nuevo» (modo «Buscar en Directorio»). `assets/js/data/clan-badges.js`: comentario sobre `badgeId` de `webClanInfo`. Backend: `13_Directorio_Inactivos_Vetados.gs`, `_obtenerCuentasDeNomMulti()` (docblock). → §PF017
- **`guerra.html` · Coliseo: puesto estimado y sin barcos (Tanda 11b).** `pintarTablaGuerraLog()` y el panel de los botones Jue–Dom pintan `~#N` con `title="Puesto estimado"` según `rankEstimado`, `coliseo` y `estimado`; la columna de barcos va en `—` en coliseo; nota bajo la tabla solo si hay filas de ese tipo. → §PF017
- **`guerra.html` · Puesto estimado también en vivo y nota al pie única (Tandas 13c y 14b).** La tarjeta de «Guerra de Hoy» y el panel Jue–Dom marcan `~#N` con `estimado` de `webPronosticoGuerra` y de cada clan en `webGuerraPuestosDia`; nueva constante `NOTA_PUESTO_ESTIMADO` para el panel y el historial. → §PF017


## 20-sep-2026

- **`assets/js/data/clan-badges.js` y `assets/badges/Skull_05.png` · Badge de clan deformado y su peso.** `iconoBadgeClanHtml()`: `object-fit:contain`. `Skull_05.png`: de 127×151 a 66×78 px (de 29 664 a 9 955 bytes). → §PF016
- **`directorio.html` · Se reserva la altura de los esqueletos (CLS 0,306).** `<style>`: `.chart-card.clan-card-skel{min-height:187px}` y `#clanGrid > .clan-card-skel{min-height:260px}`. → §PF016
- **`index.html` y `directorio.html` · Accesibilidad (`label-content-name-mismatch` y `heading-order`).** `index.html`: la tarjeta `.js-ingreso-row` de «Ingresos recientes» pasa de `role="link"` a `role="group"` («Ingreso reciente: X»), sin `tabindex` y sin el listener de Enter y Espacio. `directorio.html`: `<h2 class="h2-solo-sr">Tarjetas de los clanes</h2>` antes de `#clanGrid`. → §PF016
- **Inter e IBM Plex Mono sin el peso 500 (D-7 b).** Los 3 enlaces de Google Fonts (`preload`, `stylesheet`, `noscript`) de las 10 páginas: `wght@400;500;600;700` pasa a `wght@400;600;700`. → §PF016
- **`assets/js/core/api.js` · Interruptor de prueba para `_MAX_PETICIONES_SIMULTANEAS` (D-13).** Lee `localStorage['terna_max_simultaneas']` (entero de 1 a 4); el valor por defecto sigue en 1. → §PF016
- **`sw.js` · La revalidación de assets salta el caché HTTP.** `fetch` de assets estáticos: `fetch(req, { cache: 'no-cache' })`. `CACHE_NAME` no cambia. → §PF016
- **5 endpoints pasan a 5 min con `staleIfError` (D-9 b).** `{ ttlMs: 300000, staleIfError: true }` en `webRankings`, `webAniversarios`, `webEstadisticasCartas` (`index.html`), `webIngresosRecientes` (`index.html` y `directorio.html`) y `webAscensosRecientes` (`comunidad.html`). → §PF016
- **`perfil.html` y `assets/styles.css` · Objetivo táctil del enlace «Volver» y `::placeholder` global (D-22).** `perfil.html`: «← Volver al Directorio» con `display:inline-block; padding:5px 0`. `styles.css`: `.field input::placeholder` y `.field textarea::placeholder` con `--text-faint` y `opacity:1`. → §PF016
- **`sw.js` v4 · `config.js` rotado no llegaba al navegador.** `CACHE_NAME` pasa a `terna-static-v4`; el precaché de `install` usa `new Request(ruta, { cache: 'reload' })`. → §PF016
- **`index.html` · Hero con `srcset` (LCP).** `assets/img/banner-hero-1000.webp` (nueva); el `<source>` del hero con `srcset` de 1000w y 1600w. → §PF016
- **`sw.js` v3 y `robots.txt`.** `CORE_ASSETS` suma `assets/js/features/join-modal.js` y `CACHE_NAME` pasa a `terna-static-v3`. `robots.txt`: `Disallow: /permisos.html`. → §PF016
- **`assets/styles.css` · `.buscador input` salía sin estilo (fondo blanco, 21 px).** `.buscador input` toma el aspecto de `.field input` (con su `:focus` y `::placeholder`) en 6 campos: `#tagInput`, `#compTag1` y `#compTag2` de `directorio`; `#tagInput`, `#infTagInput` y `#ascEditBuscar` de `admin`. → §PF016
- **`assets/styles.css` · Fase 3 cerrada (D-3 c): `.admin-subseccion-body` centralizada.** `.admin-subseccion-body{padding:2px 2px 14px}` (`admin` y `mensajes`). Conteo de CSS rehecho con `conteo-css.py`. → §PF016
- **`assets/styles.css`, `admin.html`, `directorio.html` y `perfil.html` · `.perfil-cabecera .stats-mini b` centralizada (D-3 b2).** La regla pasa a `styles.css`; `admin.html` fija `font-family:inherit` en su regla local. → §PF016
- **`assets/styles.css` y `guerra.html` · Contraste de enlaces de texto en párrafos (B-21).** `styles.css`: `p a:not([class])` con `--purple-light` y su `:hover` dorado. `guerra.html`: `.refresh-row` pasa a `--text-dim` (`#agoText`). `--text-faint` no se toca. → §PF016
- **`permisos.html` · Landmark `<main>`.** `sinAccesoSec` y `panelSec` quedan dentro de `<main id="main-content">`. → §PF016
- **`mensajes.html` · Regla muerta `.categoria-contenido-body` borrada (D-3 a1).** Se borra `.categoria-contenido-body{padding:0 2px 14px 26px}`; la clase queda como gancho de JS. → §PF016
- **`mensajes.html` · Accesibilidad: encabezados, `<main>` y anuncio de «Copiado».** Los 3 títulos de tarjeta pasan de `h3` a `h2`; `<main id="main-content">` envuelve `#panelSec`; nueva región `#anuncioSr` (`.anuncio-sr`) y `anunciarSr()` para anunciar «✔ Copiado» y «No se pudo copiar el mensaje». → §PF016
- **`comunidad.html` · Dos `style=""` repetidos pasan a clases locales (D-21 b).** `.hist-seccion` (9 `<section>` de historia y comunidad) y la regla `.historia-card` (9 tarjetas). → §PF016
- **`admin.html` · 26 campos con nombre accesible.** `aria-label` en los minutos y el AM/PM de los 7 grupos de fecha/hora, en los 6 campos de autor/organizador manual de torneos y sorteos, y en `#tagInput`, `#infTagInput`, `#nmNomMultiNuevo`, `#tModificarLink` y `#ascEditBuscar`. Solo atributos. → §PF016
- **`directorio.html` · Nombre accesible en los buscadores.** `aria-label` en `#tagInput`, `#compTag1` y `#compTag2`. → §PF016
- **`index.html` · «¿Nuevo en la Familia Terna?» pasa de `h3` a `h2`.** Mismo estilo inline. → §PF016
- **`guerra.html` · `actualizarAgoText()` usa `fmtTiempoRelativo()` (D-10 b).** El texto sale de `util.js`; el mensaje «sin conexión» de `cargar()` no se tocó. Sustituido el 09-oct por `fmtTresTiempos()`. → §PF016
- **`guerra.html` · Nombre accesible en los 5 selectores de temporada.** `aria-label` en `#anioActivosSelect`, `#temporadaActivosSelect`, `#semanaActivosSelect`, `#anioTemporadaSelect` y `#temporadaSelect`. → §PF016
- **`perfil.html` · Dos `style=""` repetidos pasan a clases locales (D-21 b).** `.pf-subtitulo` (12 `<h2>`) y `.pf-panel-datos` (11 tarjetas); el `display:none` de las tarjetas queda inline. → §PF016
- **`37_Web_API.gs` (entonces `34_Web_API.gs`) y `perfil.html` · `nombreEs` en cartas e insignias del perfil.** `_webDatosDriveJugador()`: `nombreEs` desde `Backup_Cards.csv` (por ID) y `Backup_Insignias_2.csv` (por Tag y Name) en `currentFavouriteCard`, `cards[]`, `supportCards[]`, `currentDeck[]`, `currentDeckSupportCards[]` y `badges[]`. `perfil.html`: solo comentarios (bloque «PENDIENTE DE BACKEND» y nota del `<head>`). → §PF016

## 19-sep-2026

- **`.github/workflows/ci.yml`, `lighthouse.yml`, `dependabot.yml`, `lighthouserc.json`, `package.json`, `.htmlvalidate.js` y 9 páginas · B-15 completo.** `ci.yml` pasa a Node 22 (`html-validate` desde 11.1.0 usa `fs.globSync`) y sus Actions quedan fijadas por SHA con `permissions: contents: read`; `package.json`: `engines` `>=22.16`. Nuevo `lighthouse.yml` (lunes 13:00 UTC y manual) con umbrales `warn` en `lighthouserc.json`. 34 `<button>` pasan a `type="button"` y `no-implicit-button-type` sale de `.htmlvalidate.js` (vuelve a error). Nuevo `dependabot.yml` (`npm` y `github-actions`, semanal). → §PF016
- **`torneos.html` y `guerra.html` · Peticiones duplicadas y alto reservado.** `torneos.html`: `apiGetTorneosCompartido(accion)` (nueva) usada por `cargarTorneos()` y `cargarSalonDeLaFama()`; sustituida en el 09-oct por la versión de la Fase 4. `guerra.html`: `#status:not(.err){min-height:80vh}`. → §PF016
- **`directorio.html`, `guerra.html`, `torneos.html` y `sitemap.xml` · JSON-LD y `lastmod` (B-23).** Bloque `WebPage` con `BreadcrumbList` e `isPartOf` en las tres páginas; `lastmod` de las 5 URLs a 2026-09-19. → §PF016
- **`assets/styles.css`, `admin.html` y `mensajes.html` · Fase 3, sub-lote 1: 15 reglas pasan a `styles.css`.** `.contenido-item`, `.contenido-tabs`, `.tab-clan`, `.admin-grupo > .eyebrow` y `.admin-subseccion` (con sus variantes) salen de las dos páginas a un bloque nuevo al final de `styles.css`. `.admin-subseccion-body` se queda en las páginas; se centralizó el 20-sep. → §PF016
- **`perfil.html` · Fase 3, sub-lote 2: se quita `.field textarea`.** Duplicado idéntico al de `styles.css`. `.perfil-cabecera .stats-mini b`, `.linechart-svg .grid-line` y los `*` y `html,body` de `sorteo.html` se dejan a propósito. → §PF016
- **`permisos.html` · Accesibilidad de la lista.** `role="group"` con `aria-labelledby` en cada tarjeta y sección, `aria-label` en «Marcar/Desmarcar todo» y «Guardar» («Guardando permisos…» durante el guardado), `role="status"` en el mensaje de cada tarjeta, nombre accesible en el buscador y «Recargar». → §PF016
- **`permisos.html` · Casillas de «Clanes donde puede tomar decisiones» (Clanes_Admin).** Tercera sección entre Funciones y Categorías; `datos.clanesAdmin` solo se envía si cambió; aviso si el servidor no lo confirma; valores fuera del catálogo marcados. El backend (catálogo `clanes` y `clanesAdmin`) quedaba pendiente ese día. → §PF016
- **`permisos.html` · Se quita el `.btn-icono` duplicado del `<style>`.** → §PF016
- **`mensajes.html` · Accesibilidad: nombres de botones y estado de los selectores.** 10 botones «↻» con `aria-label="Actualizar contenido: <categoría>"`; `aria-pressed` en los botones de categoría y de opción por clan (en los 3 sitios donde cambia el estado activo); se retira `role="tablist"`, `role="tab"` y `aria-selected` de las pestañas dinámicas; el botón colapsar alterna su `aria-label`. → §PF016
- **`mensajes.html` (nueva), `admin.html`, `assets/js/core/auth.js`, 8 páginas con nav y `robots.txt` · «Mensajes» sale de `admin.html` a su propia página.** `mensajes.html`: solo admin (`location.replace('admin.html?volver=mensajes')`, eventos `storage` y `pageshow`). `auth.js`: `cerrarSesionAdmin()` (nueva) y `actualizarNavCta()` (muestra el link con sesión). `admin.html`: `btnLogin` con indicador de carga y retorno por `?volver=mensajes`; se eliminan la tarjeta, la llamada en `mostrarPanel()`, 6 funciones (`initMensajesAutomaticos()`, `cargarGrupoToggle()`, `cargarContenidoCategoria()`, `renderContenidoHtml()`, `_pintarOpcionContenido()` y `_activarAccionesContenido()`) y el CSS que ya nadie usa. `robots.txt`: `Disallow: /mensajes.html`. → §PF016
- **`guerra.html` · «Pronóstico de Hoy» conectada a `webPronosticoGuerra`.** Tabla por clan (propios y rivales) con fame actual, techo con roster, techo máximo y ataques de 200; solo en día de guerra, caché de 2 min y sin `staleIfError`; oculta si el backend no responde; sin `aria-live`. → §PF016
- **`assets/js/features/clan-card.js` y `guerra.html` · «Guerra de Hoy»: cabecera de Directorio y puesto actual.** `clanCardCabeceraHtml()` (nueva, separada de `clanCardHtml()`, que no cambia); `guerra.html` pide `webClanInfo` antes que `webGuerraEnVivo`, une cada tarjeta por nombre normalizado o `ordenClanIndex()` y pinta «🏁 Puesto #N de M» desde `puesto` y `clanesEnCarrera`. → §PF016
- **`assets/js/core/api.js` y `guerra.html` · Botones Jue–Dom: el panel «Puesto al cierre» se quedaba en «Cargando…».** `apiGet()` acepta `opts.prioridad` (también `_encolarPeticion()` y `_fetchYParsear()`) para que el clic pase al frente de la cola; `pintarPanelPuestosDia()` distingue «Cargando… (puede tardar unos segundos)», «Sin puesto registrado para este día.» y el fallo. → §PF016
- **`guerra.html` · «Pronóstico de Hoy» fusionado con «Guerra de Hoy».** `pintarPronosticoEnTarjetas()` (dentro de `actualizarPuestosClanes()`) continúa cada tarjeta con el clan y los rivales de su carrera, unidos por `clanTernaTag` o `clanTernaNombre`; si no llegan, queda la tabla suelta. El 20-sep: filas rediseñadas con barra, `subgrid` en `@supports` y `min-width:0` en la cadena tarjeta → nombre. → §PF016

## 18-sep-2026

- **`guerra.html` · «Valores diarios» y «Valores por temporada» usan la barra morada común (Fase 2, tablas).** Se eliminan `enlazarScrollsHorizontales()` y el CSS de `.grid-hscroll-*` y `.table-scroll-oculta-nativa`; las tarjetas de clan pasan a `<div class="table-scroll">` y a `activarBarraScrollTabla()`. Sin cambio de comportamiento (480 px, barra morada en 3 lados). → §PF016
- **`guerra.html`, `directorio.html` y `assets/js/ui/*` · Helpers de filtro por letra y de scroll sincronizado consolidados.** `pintarFiltroLetra()`, `primeraLetraFiltro()` y `LETRAS_FILTRO` (hoy en `ui/filters.js`) y `sincronizarScrollHorizontal()` (hoy en `ui/tables.js`) reemplazan copias repetidas; `aria-label` en los botones A-Z. `guerra.html`: el refresco de 60 s se pausa con `visibilitychange`. Sin tocar: `gestionarTabsClan()` y el popover de columna. → §PF016

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
**ACTUALIZACIÓN (05-oct-2026):** ya están conectadas: `webAdminUltimoRegistro` existe en el backend
(`_webAdminUltimoRegistroTorneoOSorteo()`, `34_Web_API.gs`) y `admin.html` lo usa en
`precargarUltimoRegistroTorneo()` y `precargarUltimoRegistroSorteo()` (verificado el 20-sep-2026, según el
propio código).

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
  **ACTUALIZACIÓN (05-oct-2026):** ya está conectado (09-sep-2026): `_webAdminBuscarMiembroSugerencias()`
  en `34_Web_API.gs`; `admin.html` lo pide en la búsqueda con sugerencias.
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

### 27-sep-2026 — Íconos nuevos: Puntos estelares y Camino de Leyendas
Pedido del usuario: subió tres íconos del juego (`icon_menu_clan_wars`,
`icon_star_level`, `Path_of_Legends_icon`) aclarando que el primero ya
estaba guardado en `assets/img/Guerra.webp`, el segundo es para "Puntos
estelares" (`perfil.html`) y el tercero es el ícono del modo competitivo
(Camino de Leyendas).

- **`assets/img/`:** `icon_star_level.webp` → `PuntosEstelares.webp`;
  `Path_of_Legends_icon.webp` → `Leyendas.webp`. `icon_menu_clan_wars` no se
  duplicó: `Guerra.webp` ya existía y es visualmente idéntico (aunque no
  byte-a-byte, probablemente por un re-encode).
- **`_ICONO_PUNTOS_ESTELARES_HTML` / `_ICONO_LEYENDAS_HTML` (nuevas):** mismo
  patrón que `_ICONO_ORO_HTML`/`_ICONO_GUERRA_HTML` — `<img>` con `onerror`
  que reemplaza por ⭐/🎖️ si el archivo llegara a faltar.
- **`extItem(valor, label, esNumero, ancho, icono)`:** nuevo 5º parámetro
  opcional (HTML de ícono ya armado) que se antepone al label dentro de
  `.k`. Sin este parámetro el comportamiento es idéntico al de antes para
  el resto de los cuadritos — se usa solo en el cuadrito "Puntos
  estelares" (`raw.starPoints`), pasándole `_ICONO_PUNTOS_ESTELARES_HTML`.
- **`renderCaminoLeyendas()`:** el `<h3 class="leyendas-subcat">Camino de
  Leyendas</h3>` ahora antepone `_ICONO_LEYENDAS_HTML`. La subsección
  "Ligas" no lleva ícono (no se subió uno específico para Ligas).
- **Corrección (27-sep-2026, aviso del usuario):** el docblock de
  `_ICONO_GUERRA_HTML` decía que el ícono real (escudo con espadas
  cruzadas) no era viable por derechos de autor de Supercell y que 🎖️ era
  "el reemplazo aprobado" — el usuario aclaró que sí es legal (descargado
  del Fan Kit de Supercell) y que además el ícono y el emoji no son
  equivalentes: el ícono representa el modo de juego (Guerra de Río), 🎖️
  es solo el símbolo de respaldo técnico más cercano si el archivo llega a
  faltar, sin pretender representar lo mismo. Docblock corregido.
- También se corrigió un comentario desactualizado junto a `_ICONO_GUERRA_HTML`
  en el battlelog que todavía decía "Guerra.webp todavía no está subido".

### 23-sep-2026 — Colección completa: espacio para costo en oro y cartas del siguiente nivel (backend pendiente)
Pedido del usuario: "agrega un campo para añadir el costo en oro para subir de
nivel, también la cantidad de cartas requeridas para el siguiente nivel. aún
no conecto el backend pero ve preparando el espacio en la sección de colección
completa para probar. el ícono de oro debe tener el mismo tamaño que el de
elixir o al menos la misma altura".

- **`pintarColeccion()` / `_filaCostoMejora()` / `COLECCION_ESPACIO_COSTO_MEJORA`:**
  dos filas nuevas en cada ficha, entre "Nivel" y la fila de Héroe/Evolución
  (que sigue siendo la última): oro para subir de nivel (ícono + número) y
  "Cartas: N". Leen `cards[].costoOro` y `cards[].cartasSiguienteNivel`, campos
  que el backend (`_webDatosDriveJugador()`, `34_Web_API.gs`) **todavía no manda**.
  Con la constante en `true` (estado actual) las filas se ven siempre, con "—"
  si falta el dato, para probar el espacio; en `false` vuelve el criterio de
  reserva de fila de las demás (solo si alguna ficha visible tiene el dato). A
  nivel máximo no se muestra valor.
- **`.cc-oro` (en el `<style>` de `perfil.html`):** gemelo de `.cc-elixir`
  (mono 11px); el ícono `assets/img/Gold.webp` mide 13 px de alto (igual que el
  de Elixir) con ancho automático. Si el archivo no existe, `onerror` lo
  reemplaza por 🪙.

**CORRECCIÓN (30-sep-2026):** lo de arriba quedó desactualizado. El backend sí
manda `costoOro` y `cartasSiguienteNivel` (`_webDatosDriveJugador()` y
`_webConCostoSubida()` en las 4 listas de cartas, AVISO 8) y
`COLECCION_ESPACIO_COSTO_MEJORA` está en `false` en `perfil.html`: las filas se
muestran con el criterio normal de reserva de fila, no "siempre". El costo en oro
es una cantidad fija por nivel de carta (confirmado por el usuario, 30-sep). Lo
que no existe es el oro que tiene cada jugador: Supercell no lo publica, así que
no se puede mostrar ni comparar contra el costo.

### 23-sep-2026 — Dos minigráficos de pastel (victorias/derrotas y donaciones)
Pedido del usuario: "agrega dos minigráficos de estilo pastel: uno para el
porcentaje de victorias y derrotas y otro para las donaciones hechas y
recibidas".

- **`_pastelMiniHtml(titulo, porciones)` (nueva) / `renderExtendido()`:** SVG
  propio, sin librerías, con leyenda (valor y porcentaje). Se pintan en
  `.mini-pies`, justo debajo de la grilla de cuadritos y encima del badge de
  Camino de Leyendas. Victorias y derrotas usan `ext.victorias`/`ext.derrotas`
  (verde/rojo); donaciones usan `ext.donacionesRealizadas` ("Hechas", dorado) y
  `ext.donacionesRecibidas` ("Recibidas", morado). Cada gráfico se omite solo
  si faltan sus datos o suman 0; con una sola porción distinta de 0 se dibuja
  un círculo completo. Los cuadritos de % Victorias/% Derrotas se conservan.

### 23-sep-2026 — Mazo actual: dos subsecciones con subtítulo y separación
Pedido del usuario (con captura): "la carta de torre debe tener algo más de
separación, que se note que las cartas son una subsección y la carta de torre
otra, todo dentro de la sección de mazo actual. el texto de carta de torre no
debe quedarse como texto simple, sigue siendo un subtítulo".

- **`renderMazoActual()` / `.mazo-layout`:** ahora hay dos subsecciones, cada una
  con su `<h3 class="mazo-subtitulo">`: "Cartas del mazo" (izquierda) y "Carta de
  torre del mazo" (derecha). Reemplaza la leyenda chica bajo la carta
  (`.mazo-torre-leyenda`, eliminada). Columnas 4fr/1fr con una línea vertical
  entre ambas y 24 px de aire a cada lado; en pantallas de hasta 900 px la
  torre baja debajo del mazo y la línea pasa a ser horizontal. Sin carta de
  torre, el mazo se pinta como antes, sin subtítulo.

### 23-sep-2026 — Cabecera del perfil reducida a 7 datos; el resto pasa a los cuadritos
Pedido del usuario (con captura): "en la parte de arriba solo se debe mostrar
nivel de torre del rey, nivel de XP, copas, victorias de guerra, ataques en la
semana actual y fame de la semana actual, y vigencia. todo lo demás debe ir en
los cuadritos debajo de la fila que indica que el clan no tiene requisitos".

- **`.stats-mini` de `#perfilContenido`:** queda en este orden: Nivel de torre
  del rey, Nivel de XP (antes "Nivel de experiencia"), Copas, V. Guerra, Ataques
  en la semana actual, Fame de la semana actual (`#mFameSemanaWrap`, nueva) y
  Vigencia. "Fame de la semana actual" lee `j.guerraSemana.puntaje` (en guerra,
  fame = puntaje del jugador) y se oculta si el backend no lo manda.
- **`renderExtendido(ext, j)`:** ahora recibe también `j`. Se quita el cuadrito
  "Nivel de XP" (duplicaba el de la cabecera) y se agregan "Torneos", "Puntos
  estelares" y "Puntos de experiencia", que salen de la cabecera.
- **`renderStatsAvanzadasCabecera()`:** solo maneja Nivel de XP y Nivel de torre
  del rey; Nivel de XP cae a `j.extendido.nivelXp` si `rawClash` no trae
  `expLevel`.

### 23-sep-2026 — Orden propio para Maestrías, card "Competitivo" y carta de torre a la derecha del mazo
Pedido del usuario (con captura y boceto): "maestrías debe tener su propio
filtro de orden", "quita el texto de 'Camino de leyendas y ligas', que quede
como competitivo desglosándose en camino de leyendas y en ligas" y "reordena
las cartas del mazo actual con la carta de torre a la derecha".

- **`_pintarInsignias()` / `_selectorOrdenHtml()` (antes
  `_selectorOrdenInsigniasHtml()`):** Maestrías ya no comparte el orden con las
  insignias generales. Hay un estado propio (`_maestriasOrden`), su selector
  (`#selMaestriasOrden`, bajo el subtítulo "Maestrías") y su handler
  (`cambiarOrdenMaestrias()`); las generales siguen con `_insigniasOrden` y
  `#selInsigniasOrden`. El selector de las generales solo se muestra si hay
  insignias generales.
- **Card `#mLeyendasCard` / `renderCaminoLeyendas()`:** se quita el `<h2>`
  "Camino de Leyendas y ligas"; el eyebrow "Competitivo" se conserva con su
  estilo original (una primera versión lo había reemplazado por un título
  plano y se revirtió a pedido). Subsecciones "Camino de Leyendas" y "Ligas"
  (antes "Liga"), con el mismo `<h3>` exacto dentro de un `.leyendas-bloque`:
  se quita la variante `--sola`, que le sacaba la línea divisoria solo a la
  primera y la hacía verse de otro peso.
- **`renderMazoActual()`:** las 8 cartas (4x2, `.mazo-chips-principal`) van
  dentro de `.mazo-layout-deck`, que ocupa 4 de 5 columnas iguales de
  `.mazo-layout`; la carta de torre (`.mazo-layout-torre`) ocupa la 5.ª, arriba
  y con el ancho de una carta del mazo. El título "Carta de torre del mazo"
  pasa de eyebrow a leyenda chica bajo la carta (`.mazo-torre-leyenda`) para no
  desalinearla de la primera fila. Sin carta de torre, el mazo ocupa todo el
  ancho como antes. En pantallas de hasta 900 px la torre baja debajo del mazo.

### 23-sep-2026 — Subcategoría "Maestrías" en Insignias y corrección de los nombres en español
Pedido usuario: "haz una subcategoría para todas las insignias que empiezan con
\"Mastery\" y llámala Maestrías" y "hice un csv con la columna Nombre en español ...
pero veo que no se están usando".

**Frontend (`perfil.html`, `renderInsignias()`):** las insignias cuyo `name` empieza
con `Mastery` (distingue mayúsculas, `insigniaEsMaestria()`) se separan del resto y
se pintan en un segundo grid bajo el subtítulo "Maestrías" (con su cantidad); las
demás quedan arriba, igual que antes. Si el jugador solo tiene maestrías, el
subtítulo va sin línea separadora; si no tiene ninguna, no aparece. El pie ahora
dice cuántas de las desbloqueadas son de maestría. La tarjeta de cada insignia se
movió a `_insigniaItemHtml()` sin cambiar su HTML. Estilos nuevos:
`.insignias-subcat`, `.insignias-subcat--sola` y `.cuenta`.

**Corrección a lo dicho el 21-sep-2026 (más abajo):** ese día se documentó que
`badges[].nombreEs` salía de la columna "Nombre" de `Backup_Insignias_2.csv`, cruzada
por (Tag, Name). Eso no servía: esa columna solo se autocompletaba para las
"Mastery…" y las traducciones que el usuario escribe a mano están en el catálogo
`Backup_Insignias.csv`, que nadie leía. Backend corregido (`34_Web_API.gs`,
`_webMapaNombreInsigniaPorName()`): ahora lee el catálogo y cruza por Name
(ya no depende del Tag), igual que las cartas con `Backup_Cards.csv` por ID.
`36_Insignias.gs` también cambió: las filas nuevas o vacías de una insignia heredan
el Nombre de sus otros niveles, el catálogo se agrupa por insignia y nivel, y el
mapa de cartas se lee una sola vez por ejecución. Los comentarios de `perfil.html`
que citaban `Backup_Insignias_2.csv` se corrigieron.

**No se probó en navegador real:** se verificó la sintaxis del `<script>` inline y el
render con datos simulados (mezcla, solo maestrías, sin maestrías, `name` nulo). Para
que llegue `nombreEs` hay que volver a desplegar el web app del backend.

### 23-sep-2026 — Corrección: la fila solo se reserva si ALGUNA ficha de la sección tiene ese dato (antes se reservaba siempre)
Pedido usuario, corrigiendo el FIX inmediatamente anterior (mismo día, más
abajo): "en todo perfil.html hay varias secciones. si el dato se menciona
para alguna ficha en una determinada sección, se le reserva una ficha. si
no se menciona, no se debe reservar la fila". El FIX anterior (`_filaFicha`
original, solo con `mostrar`/`htmlVisible`/`htmlPlaceholder`) reservaba
SIEMPRE las 5 filas condicionales (Héroe, Evolución, Rareza, Tipo,
Elixir+Estrellas) en toda ficha de "Mazo actual" y "Carta de torre del
mazo", aunque NINGUNA ficha de esa sección tuviera el dato — por ejemplo,
si ninguna de las 8 cartas del mazo tiene Evolución, esa fila se seguía
reservando (oculta) en las 8 igual, ocupando espacio vertical sin ningún
propósito, porque ninguna ficha vecina la necesitaba para alinearse.

**`_filaFicha(reservar, mostrar, htmlVisible, htmlPlaceholder)`** gana un
parámetro nuevo al principio: `reservar` es un flag calculado UNA VEZ POR
SECCIÓN (no por ficha) — verdadero si `Array.some()` encuentra que alguna
ficha de esa sección concreta tiene el dato. Si `reservar` es falso, la
función devuelve `''` (la fila no existe para ninguna ficha de la
sección). Si es verdadero, se mantiene el comportamiento anterior: la
ficha que sí tiene el dato lo muestra, la que no lo tiene reserva el
mismo alto oculta con `visibility:hidden`.

Se aplicó a las **4 funciones de perfil.html** que arman fichas con este
componente (`.col-card`/`.col-ficha`/`.cc-meta`), cada una calculando sus
propios flags de sección **por separado** (una sección nunca contamina a
otra):
- **`renderMazoActual()` — "Mazo actual":** se separa el cálculo de datos
  por ficha (`datosCartas`, un `.map()` que ya no arma HTML, solo objetos)
  del armado de HTML (`cartasHtml`, un segundo `.map()` sobre
  `datosCartas`), porque los flags de sección
  (`seccionMazoHeroe/Evo/Rareza/Tipo/Elixir`) necesitan conocer las 8
  fichas completas antes de poder decidir si cada fila se reserva.
- **`renderMazoActual()` — "Carta de torre del mazo":** mismo patrón,
  aparte (`datosTorres`/`seccionTorre*`) — es su propia sección (su propio
  título, su propio `.mazo-chips`), sus flags NO se mezclan con los de
  "Mazo actual" aunque viven en la misma función. `torreHtml` pasa de
  expresión ternaria en una sola línea a un `if` con `let torreHtml = '';`
  para poder declarar `datosTorres` y los flags antes de armar el HTML.
- **`renderCartasTorre()` — "Cartas de torre":** mismo patrón
  (`datosTorres`/`seccionTorres*` — nombres locales a esta función, no
  confundir con los de `renderMazoActual()` de arriba, cada función tiene
  su propio scope).
- **`pintarColeccion()` — "Colección completa":** mismo patrón
  (`datosCol`/`seccionCol*`), calculado contra `visibles` (las cartas que
  pasan el filtro de rareza activo `_colFiltroActivo`), no contra `cartas`
  completo — como esta función se vuelve a ejecutar entera al cambiar de
  filtro, los flags se recalculan cada vez contra lo que realmente se va a
  pintar. De paso, Rareza y Tipo (que acá eran `<span>` sueltos, sin
  envolver en `.cc-meta`, a diferencia de las otras 3 secciones) pasan a
  envolverse en `.cc-meta` igual que el resto — sin cambio visual (
  `.col-ficha` ya es `flex-direction:column`, cualquier hijo directo era
  su propia fila con o sin el wrapper), pero ahora las 4 secciones
  comparten el mismo marcado para el mismo dato.

No se tocó `renderCartaFavorita()` ("Carta favorita"): es una sección de
una sola ficha, así que "reservar si alguna ficha de la sección lo tiene"
da exactamente el mismo resultado que "mostrar si esta ficha lo tiene" —
no hay ninguna ficha vecina con la que alinearse.

### 23-sep-2026 — Filas de la ficha (Héroe/Evolución/Rareza/Tipo/Elixir) alineadas entre tarjetas de una misma fila del grid
Pedido usuario: "en cada sección, haz que cada tipo de dato dentro de la
misma fila esté a la misma altura. es decir, todos los costos a la misma
altura, todos los tipos a la misma altura, todas las calidades a la misma
altura, etc" — a raíz del FIX anterior de `.col-card--grande` (mismo día,
ver más abajo), donde se ve claramente que en "Mazo actual" (grid de 4
columnas, `.mazo-chips`) una carta con Héroe+Evolución (ej. Valquiria) tiene
2 filas más arriba de Rareza/Tipo/Elixir/Nivel que una sin ninguno de los
dos (ej. Montacarneros) — esas 2 filas de más corrían todo lo de abajo, y el
mismo dato (p.ej. la píldora de Rareza) quedaba a distinta altura según la
columna.

Se agrega `_filaFicha(mostrar, htmlVisible, htmlPlaceholder)` (helper nuevo,
arriba de `renderMazoActual()`): cuando `mostrar` es falso, en vez de omitir
la fila (`''`) se sigue renderizando un `.cc-meta` con el mismo marcado
(mismas clases/pill) pero `visibility:hidden` — nunca `display:none`, que sí
colapsa el alto y vuelve a romper la alineación — y `aria-hidden="true"`
(los botones ocultos de Héroe/Evolución también llevan `tabindex="-1"` para
no robar foco de teclado). Se aplica a las 5 filas condicionales de una
ficha (Héroe, Evolución, Rareza, Tipo, Elixir+Estrellas) tanto en las 8
cartas del mazo como en la carta de torre del mazo
(`renderMazoActual()`) — la fila de Nivel no se toca porque ya se
renderizaba siempre, sin condición.

No se tocó `assets/styles.css` ni `.coleccion-grid`/`pintarColeccion()`
("Colección completa"): esa sección usa `grid-template-columns:repeat(
auto-fill,minmax(150px,1fr))`, sin un número fijo de columnas por fila, así
que qué tarjetas comparten fila visual cambia según el ancho de pantalla —
el mismo problema pedido acá ("mazo actual y su carta de torre") no aplica
igual ahí; se puede extender después si el usuario lo pide para esa
sección.

### 23-sep-2026 — Cartas de "Mazo actual" y "Carta de torre del mazo" pasan a `.col-card--grande`
Pedido usuario: "el tamaño de cartas de mazo actual y su carta de torre es muy
pequeño, dale el mismo tamaño de la imagen de carta favorita". Las tres
secciones (Mazo actual, Carta de torre del mazo, Carta favorita) comparten el
mismo componente `.col-card`/`.col-nombre`/`.col-cuerpo`/`.col-ficha` desde el
FIX del 23-sep-2026 más abajo ("solo se hizo el cambio en la colección
completa pero falta en las otras secciones de cartas en perfil.html"), pero
solo "Carta favorita" (`renderCartaFavorita()`) llevaba el modificador
`.col-card--grande` (imagen 72x84) — Mazo actual y Carta de torre del mazo
(ambas en `renderMazoActual()`) se quedaron en el tamaño base de `.col-card`
(52x60, el mismo de Colección completa), sin que nadie lo hubiera pedido así
explícitamente.

Se agrega `col-card--grande` a los dos `<div class="col-card">` que arma
`renderMazoActual()` (la ficha de cada una de las 8 cartas del mazo y la de
`currentDeckSupportCards`), sin tocar `assets/styles.css` — la regla
`.col-card--grande .col-cuerpo > img{width:72px; height:84px;}` ya existía y
alcanza a cualquier `.col-card` que lleve el modificador, sin importar la
sección. `Colección completa` (`pintarColeccion()`) no se toca: sigue en
52x60, que es el tamaño que ya tenía y que nadie pidió agrandar acá.

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

### guerra.html — estilo (4 a 16-sep-2026)

Lista corta de los ajustes de `<style>` que traían comentario largo. El porqué de cada uno está en `§PF028` de `Contexto_Base_Web.md`.

- **16-sep · Un solo tamaño de letra (13 px) en encabezados y valores de las tablas de guerra.** `.tbl-pendientes`, `.ai-clan-card table` y `#guerraLogWrap table`. → §PF028
- **16-sep · Botones A-Z/# en una sola fila.** `.letra-btn` pasa después de `.tab-btn`; desde el 18-sep ambas viven en `styles.css`. → §PF028
- **13-sep · `.clan-card .stats` centrada.** `justify-content:center` para que el margen no varíe según los dígitos. → §PF028
- **13-sep · «Pendientes de Atacar»: columnas nuevas.** `.col-n`, `.col-tag`, `.col-perfil-icons`; «Jugador» y «Préstamo» solo para admin. → §PF028
- **12-sep · «Participación de Hoy»: versión final.** Conteo junto al encabezado, ataques pendientes por cuenta reservada y subgrupos «Con» y «Sin ataques pendientes»; `_listaCuentasHtml()` y `renderParticipacionHoyGuerra()`; reemplaza `.ph-*`. → §PF028
- **10-sep · Filtro y orden por columna en «Valores diarios» y «Valores semanales».** Widget `rt-*` en la segunda fila del `<thead>` (`thFiltroGrid()`, `filaSubEncabezadosMega()`, `filaSubEncabezadosSemanas()`). → §PF028
- **09-sep · Encabezado «Nombre» en `.col-jugador`; `.ai-grp-label` sticky; franja `.grid-hscroll`.** La franja se retiró el 18-sep. → §PF028
- **08-sep · Centrado de «Pendientes de Atacar» y de las cuadrículas (solo el nombre a la izquierda); `white-space:nowrap` en encabezados.** → §PF028
- **05-sep · «Valores diarios» y «Valores semanales» (`#controlTemporadaSection`), megacategorías Ataques/Puntaje/Barcos con `.ai-grp-*` e Inactivos dentro de la tarjeta de cada clan.** Se elimina `#aportesInactivosSection`. → §PF028
- **04 y 05-sep · Botones de copiar los mensajes de guerra (solo admin) sobre «Pendientes de Atacar».** `#msjGuerraWrap`, `cargarMensajesGuerraSiAdmin()`. → §PF028
- **04-sep · `.clan-card .stat{text-align:center}`.** Número y etiqueta sobre el mismo eje. → §PF028

### guerra.html — estructura de la página (31-ago a 13-sep-2026)

Lista corta de los comentarios del `<body>` (orden de secciones, selectores, pestañas, avisos, Log, footer). El porqué de cada uno está en `§PF028` (Parte 2) de `Contexto_Base_Web.md`.

- **13-sep · Filtro A-Z/# en «Pendientes de Atacar».** `#pendLetraFilter`; hoy es `pintarFiltroLetra()` (antes `pintarFiltroLetraPendientes()`), en `assets/js/ui/filters.js`. → §PF028
- **12-sep · «Participación de Hoy» queda solo en Guerra.** Estaba duplicada por error en `directorio.html`; `renderParticipacionHoyGuerra()`. → §PF028
- **10-sep · Orden del panel.** «Pendientes de Atacar» y «Participación de Hoy» pasan entre «Miembros Activos por Clan» y «Valores diarios». → §PF028
- **09-sep · «Valores semanales»: selectores de año y mes.** Reemplazan al único selector de temporada; `data.controlTemporadaSelectores`, `_getControlTemporadaSelectores()` (`38_Web_Endpoints.gs`). → §PF028
- **09-sep · «Valores diarios»: selectores año → temporada → semana.** `pintarSelectoresValoresDiarios()`, `data.valoresDiariosSelectores` y `data.valoresDiariosPorSemana`; la sección deja de llamarse «Cuadrícula de Activos (Semana Actual)». → §PF028
- **07-sep · Aviso de la «última guerra» en «Valores diarios».** `#controlActivosCacheAviso` y `render()` (copia en `localStorage`). → §PF028
- **07-sep · Pestañas de clan.** `.tabs-row`/`.tab-btn` y `gestionarTabsClan()`, sin volver a pedir datos. → §PF028
- **07-sep · «Log de Guerra (Histórico)» (Fase 13, punto 1).** `#guerraLogSection` y `cargarGuerraLog()`; lee `Guerra_Logs` y se carga una sola vez. → §PF028
- **05-sep · «Valores semanales» (`#controlTemporadaSection`).** Una columna por semana jugada; fuente `Backup_Guerra.csv`. → §PF028
- **05-sep · «Valores diarios» como sección nueva y pública (`#controlActivosSection`).** `render()` con `_getControlActivosGridPorTemporada()`; tarjetas ordenadas con `ordenClanIndex()`. → §PF028
- **04 y 05-sep · Fila «Copiar» dentro de `#pendSection`.** `#msjGuerraWrap`; antes era una sección aparte. → §PF028
- **04-sep · Orden del panel.** «Miembros Activos por Clan» antes de «Pendientes de Atacar». → §PF028
- **03-sep · «Pendientes de Atacar» se oculta fuera de día de guerra.** `render()`: `#pendSection` según `ctx.esDiaGuerra`. → §PF028
- **31-ago · Footer sin `style="padding:0"`.** El texto ya no queda pegado a los bordes. → §PF028

### guerra.html — script, parte 1 (30-ago a 17-sep-2026)

Lista corta de los comentarios del `<script>` (estado de módulo, carga, cuadrículas, filtros y pestañas). El porqué de cada uno está en `§PF029` de `Contexto_Base_Web.md`.

- **17-sep · «Valores semanales»: Total/Prom dejan de salir siempre en 0.** `celdasSemanas()` lee `total`/`prom` (el backend no manda `resumen`) con `??`; `_getControlTemporadaPorClan()` (`38_Web_Endpoints.gs`). → §PF029
- **13-sep · Filtro por letra: estado, clasificación y combinación con el filtro por columna.** `letraSeleccionadaPend`/`Activos`/`Temporada`, `aplicarFiltroLetraPendientes()`, `aplicarFiltroLetraGrid()`, `gridAplicarFiltros()`, `data-letra` en `renderFilaActivos()` y `renderFilaTemporada()`; `primeraLetraFiltro()` hoy en `assets/js/ui/filters.js`. → §PF029
- **10-sep · Filtro y orden por columna (widget genérico por `gridId`).** `gridEstados`, `inicializarGridFiltro()`, `columnasActivosDef()` y `columnasTemporadaDef()`; `celdasMegacategoria()` y `celdasSemanas()` con `keyPrefix` (`data-col`/`data-raw`). → §PF029
- **09-sep · Estado de año, temporada y semana de «Valores diarios».** `anioSeleccionadoActivos`, `temporadaSeleccionadaActivos`, `sectionIndexSeleccionadoActivos`; el default lo fija `pintarSelectoresValoresDiarios()`. → §PF029
- **09-sep · Franjas de scroll horizontal sincronizadas.** `.grid-hscroll-*` y `enlazarScrollsHorizontales()`; retiradas el 18-sep. → §PF029
- **07-sep · Pestañas de clan: «Todos» al final y el Principal por defecto.** `gestionarTabsClan()`, `TAB_TODOS`, `clanSeleccionadoActivos` y `clanSeleccionadoTemporada`. → §PF029
- **05-sep · Helpers de celdas a nivel de módulo (Inactivos con las 3 megacategorías).** `claseCeldaCA()` y `celdasMegacategoria()` salen de `render()`; los usa `cargarAportesInactivosSiAdmin()`. → §PF029
- **30-ago · `guerra.html` deja de llevar el token de administradores.** `cargar()` usa `apiGet('webGuerraEnVivo')`. Pendiente: rotar ese token si sigue vigente (ver «Abiertos»). → §PF029

### guerra.html — script, parte 2 (4 a 15-sep-2026)

Lista corta de los otros comentarios del `<script>` (selectores, cuadrículas, Inactivos, mensajes, Pendientes, Participación de Hoy y Log). El porqué de cada uno está en `§PF030` de `Contexto_Base_Web.md`.

- **15-sep · «Pendientes de Atacar»: el backend ya manda los campos nuevos.** `data.pendientes` trae `nomMulti`, `prestamo`, `rango`, `royaleApi` y `cwStats` por jugador (`_getDatosDashboardCalcular_()`, `38_Web_Endpoints.gs`). → §PF030
- **13-sep · «Pendientes de Atacar»: columnas N°, Tag, Nombre, Jugador y Préstamo (solo admin), Rango, Faltantes y Perfil.** Bloque `pendWrap` de `render()`; íconos con `ICONO_ROYALEAPI`, `ICONO_CWSTATS` y `urlValida()`. → §PF030
- **12-sep · «Participación de Hoy» y «Pendientes de Atacar» en una tarjeta `.ai-clan-card` por clan.** `renderParticipacionHoyGuerra()`, `_listaCuentasHtml()`, `pendientesHoy()` y `cargarParticipacionHoySiAdmin()`; pestañas con `gestionarTabsClan()`; el aviso de `multiClan` queda fuera de las tarjetas. Pendiente: el backend no manda `ataquesHoy` por cuenta (ver «Abiertos»). → §PF030
- **10-sep · «Pendientes de Atacar»: columna Rango.** `p.rango`; sin dato muestra «—». → §PF030
- **10-sep · Cuadrículas: filtro y orden en la segunda fila de encabezados.** `filaSubEncabezadosMega()` y `filaSubEncabezadosSemanas()`; el `<tbody>` lo llena `inicializarGridFiltro()`. → §PF030
- **09-sep · Selectores de año, temporada y semana de «Valores diarios».** `pintarSelectoresValoresDiarios()` reemplaza a `pintarSelectorSemanaActivos()`; la semana se lista de más reciente a más antigua con `.slice().reverse()`. → §PF030
- **09-sep · Selectores de año y mes de «Valores semanales».** `pintarSelectoresControlTemporada()` reemplaza a `pintarSelectorTemporada()`; usa `data.controlTemporadaPorTemporada` si la temporada no es la vigente. → §PF030
- **07-sep · Log de Guerra (Fase 13, punto 1).** `cargarGuerraLog()` pide `webGuerraLog` una sola vez al cargar; pestaña por clan y trofeos con diferencia semanal. → §PF030
- **05-sep · «Valores diarios»: Puntaje y Barcos además de Ataques; clanes en el orden de `ordenClanIndex()`.** Bloque de la cuadrícula de Activos en `render()`; caso de la última guerra guardada en `localStorage` (`ternaUltimaGuerraActivos`). → §PF030
- **05-sep · Cuadrícula de «Valores semanales» de toda la temporada.** `celdasSemanas()` con `data.controlTemporadaSemanas` y `data.controlTemporadaPorClan` (`_getControlTemporadaPorClan()`, `38_Web_Endpoints.gs`). → §PF030
- **05-sep · Aportes de inactivos (solo admin) dentro de la tarjeta de cada clan.** `cargarAportesInactivosSiAdmin()`, `.ai-inactivos-wrap` y `webAportesInactivos`; `#aportesInactivosSection` eliminada. → §PF030
- **04 y 05-sep · Botones «⧉ Copiar — <Clan>» de los mensajes de guerra (solo admin).** `cargarMensajesGuerraSiAdmin()` sobre `#msjGuerraWrap`, con `webAdminContenido`; `#mensajesGuerraAdmin` eliminada. → §PF030

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
