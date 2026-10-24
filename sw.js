/* =========================================================================
 * sw.js — Service Worker del portal Familia Terna.
 * MEJORA (18-sep-2026, propuesta y pedida por el usuario — "haz todas" las
 * mejoras sugeridas): el sitio ya tenía manifest.json (con íconos y modo
 * standalone) pero ningún Service Worker, así que varios navegadores no
 * ofrecían "Instalar app" y no había nada de caché para visitas repetidas
 * ni para cortes de conexión.
 *
 * Alcance deliberadamente conservador:
 *  - Solo intercepta peticiones GET del MISMO origen (this.location.origin).
 *    Nunca toca las llamadas al backend (Apps Script, otro origen) ni
 *    fuentes externas (Google Fonts, favicons de Google, etc.) — esos
 *    siguen yendo a la red tal cual, tal como ya lo esperan common.js y
 *    cada página (loaders/errores propios si el backend no responde).
 *  - Navegación entre páginas (mode:'navigate'): red primero (solo se
 *    guardan en caché las respuestas OK), caché como
 *    respaldo si no hay conexión, y como último recurso index.html (para
 *    no dejar una pantalla en blanco si se pide una página nunca visitada
 *    estando offline).
 *  - Assets estáticos (CSS/JS/imágenes propias): caché primero para que
 *    carguen al instante, refrescando el caché en segundo plano contra la
 *    red en cada visita (stale-while-revalidate) para no quedarse con una
 *    versión vieja indefinidamente.
 * ========================================================================= */

// v2 (18-sep-2026): cambió CORE_ASSETS (se añadieron los módulos de assets/js/**),
// así que se sube la versión para que 'activate' borre el caché v1.
// v3 (20-sep-2026): se añade assets/js/features/join-modal.js (B-5, lo cargan
// index.html y directorio.html) que había quedado fuera de CORE_ASSETS; mismo
// motivo: cambia CORE_ASSETS, así que se sube la versión.
// Tanda 2 (20-sep-2026, sin subir versión: CORE_ASSETS no cambia): la revalidación en segundo plano
// de los assets estáticos usa cache:'no-cache' (ver el fetch handler de más abajo).
// v4 (20-sep-2026): config.js cambió (WEB_MEMBER_TOKEN rotado) y los navegadores
// seguían sirviendo el config.js viejo desde este caché. Se sube la versión para
// que 'activate' borre v3, y el precaché de 'install' ahora ignora el caché HTTP
// del navegador (cache:'reload') para no volver a guardar una copia vieja.
// v5 (28-sep-2026): join-modal.js cambió (evento de GoatCounter al abrir el modal, Fase 4 del
// Consolidado de mejoras) y config.js suma un comentario (Fase 5). Se sube la versión para que
// 'activate' borre v4 y todos los visitantes reciban de inmediato los archivos nuevos.
// v6 (28-sep-2026): api.js cambió (opts.conSesion en apiGet, Fase 5b tanda A del Consolidado de
// mejoras). Se sube la versión para que 'activate' borre v5 y perfil.html/directorio.html (que ya
// pasan conSesion) no corran con un api.js viejo que lo ignore.
// v7 (28-sep-2026): torneos.html cambió (CORE_ASSETS de abajo) -- ahora enlaza el nombre de cada
// participante a perfil.html?tag=... cuando el backend manda el Tag, y manda conSesion:true al
// pedir webTorneos/webHistorialTorneos (Fase 5b tanda D, AVISO A9 de 34_Web_API.gs). Se sube la
// versión para que 'activate' borre v6 y los visitantes no se queden con la versión vieja de
// torneos.html (sin los links) servida desde este caché de forma indefinida.
// v8 (sin fecha ni motivo registrados): la versión se subió sin dejar comentario aquí ni entrada en CHANGELOG.md; probablemente
// con el cambio de index.html del 29-sep-2026 (cartas de 72x84), sin confirmar.
// v9 (30-sep-2026): index.html cambió (CORE_ASSETS) -- los enlaces de Google Fonts pasan de display=swap a display=optional
// (CLS del hero). Se sube la versión para que 'activate' borre v8 y nadie se quede con el index.html viejo.
// v10 (02-oct-2026): guerra.html cambió (CORE_ASSETS) -- se invierte el orden de gestionarTabsClan() y
// activarBarraScrollTablas() para bajar el TBT. Se sube la versión para que 'activate' borre v9.
// v11 (03-oct-2026): api.js cambió (CORE_ASSETS) -- apiGet() ahora detecta sesionVencida:true del backend, borra la sesión de admin
// guardada y muestra un aviso (sesión de admin vencida, A4/A6). Se sube la versión para que 'activate' borre v10 y perfil/directorio/
// torneos/guerra no sigan sirviendo el api.js viejo desde este caché.
// v12 (03-oct-2026): assets/styles.css cambió (CORE_ASSETS) -- el panel del menú móvil cerrado pasa a visibility:hidden para que sus
// enlaces dejen de recibir foco con Tab estando fuera de pantalla. Se sube la versión para que 'activate' borre v11.
// v13 (04-oct-2026): guerra.html cambió (CORE_ASSETS) -- "Actualizar" (y la recarga automática de cada minuto) devuelve el foco al botón tras
// rehabilitarlo, en vez de dejarlo en <body>. Se sube la versión para que 'activate' borre v12 y nadie siga con el guerra.html viejo.
// v14 (05-oct-2026): guerra.html cambió (CORE_ASSETS) -- celdas vacías cuando el jugador no estuvo en el clan, resultados congelados de
// la última guerra fuera de día de guerra, orden fijo de las tarjetas de clan, aviso de congelado y leyenda. Se sube la versión para que
// 'activate' borre v13 y nadie siga con el guerra.html viejo.
// v15 (05-oct-2026): tables.js cambió (CORE_ASSETS) -- P-12: la barra superior de scroll de las tablas (aria-hidden) ya no recibe foco con
// Tab (tabindex=-1). Si v14 aún no se había publicado, v14 y v15 salen juntos; igual se sube para no depender de eso.
// v16 (06-oct-2026): guerra.html cambió (CORE_ASSETS) -- la tabla del Log de Guerra pasa a encabezados en español (Puesto, Barcos, Trofeos).
// Se sube la versión para que 'activate' borre v15 y nadie siga con el guerra.html viejo.
// v17 (09-oct-2026): api.js (nueva apiGetEstaticoConEdad) y guerra.html cambiaron (CORE_ASSETS) -- si Apps Script no responde, guerra.html
// usa el último guerra.json publicado aunque tenga más de 3 h y avisa que son datos guardados (Fase 1 del plan "JSON estático como último
// recurso"). Se sube la versión para que 'activate' borre v16 y nadie siga con el api.js/guerra.html viejos.
// v18 (09-oct-2026): api.js (nueva apiGetConRespaldoEstatico) e index.html cambiaron (CORE_ASSETS) -- si Apps Script no responde, la portada
// usa el último home.json / guerra_top.json publicado aunque tenga más de 3 h, salvo que el respaldo local sea más nuevo (Fase 2 del plan
// "JSON estático como último recurso"). clan.html también cambió, pero no está en CORE_ASSETS: se renueva por la revalidación en segundo plano.
// Se sube la versión para que 'activate' borre v17 y nadie siga con el api.js/index.html viejos.
// v19 (09-oct-2026): util.js (nuevos fmtTresTiempos / tsApiDeDatos) e index.html cambiaron (CORE_ASSETS) -- la portada y clan.html muestran
// tres momentos: consulta de la página, publicación del JSON y consulta del bot a Supercell (si el dato la trae). Se sube la versión para
// que 'activate' borre v18 y nadie siga con el util.js/index.html viejos.
// v20 (09-oct-2026): util.js (nueva fmtTresTiemposDeResultado), directorio.html y comunidad.html cambiaron (CORE_ASSETS) -- si Apps Script no
// responde, el directorio (info de clanes y roster) y los ascensos de comunidad usan el último JSON publicado aunque tenga más de 3 h, salvo que
// el respaldo local sea más nuevo, y muestran los tres momentos de actualización (Fase 3 del plan "JSON estático como último recurso").
// Se sube la versión para que 'activate' borre v19 y nadie siga con el util.js/directorio.html/comunidad.html viejos.
// v21 (09-oct-2026): torneos.html cambió (CORE_ASSETS); perfil.html también cambió pero NO está en CORE_ASSETS -- si Apps Script no responde,
// torneos usa el último torneos.json publicado aunque tenga más de 3 h (salvo que el respaldo local sea más nuevo) y muestra los tres momentos de
// actualización, y perfil usa el último guerra_ctx.json igual (Fase 4 del plan "JSON estático como último recurso"). Se sube la versión para que
// 'activate' borre v20 y nadie siga con el torneos.html viejo.
// v22 (09-oct-2026): util.js (nueva horaConsultaApiGet; fmtTresTiemposDeResultado ya no usa siempre «ahora»), index.html, directorio.html, comunidad.html y
// torneos.html cambiaron (CORE_ASSETS); clan.html también cambió pero NO está en CORE_ASSETS -- la hora de «Consulta» es ahora la real del último guardado
// cuando el dato salió de Apps Script (si apiGet() devolvió su respaldo local sin avisar, ya no dice «hace unos segundos»). Se sube la versión para que
// 'activate' borre v21 y nadie siga con el util.js y las páginas viejas.
// v23 (09-oct-2026): guerra.html cambió (CORE_ASSETS) -- su barra de estado ahora usa fmtTresTiempos() de util.js (mismo formato que el resto del sitio:
// «Consulta · JSON publicado · API Supercell») en vez de su propio formato. Se sube la versión para que 'activate' borre v22 y nadie siga con el guerra.html viejo.
// v24 (09-oct-2026): api.js (nueva apiGetRespaldoUsado; apiGetConRespaldoEstatico informa 'respaldo-local' cuando apiGet() devolvió su respaldo en silencio), util.js
// (nueva marcarDatosGuardados) e index.html cambiaron (CORE_ASSETS); clan.html también cambió pero NO está en CORE_ASSETS. Se sube la versión para que
// 'activate' borre v23 y nadie siga con el api.js, el util.js y la portada viejos.
// v25 (09-oct-2026): Fase 5 -- api.js (nueva apiGetPublicoConEstatico), clan-card.js (enlazarLideresClanes lee roster.json) y guerra.html (las cabeceras de clan leen
// home.json) cambiaron (CORE_ASSETS). Se sube la versión para que 'activate' borre v24 y nadie siga con esos tres archivos viejos.
// v26 (11-oct-2026): guerra.html cambió (CORE_ASSETS) -- en el mini historial y el comparador de un jugador, el día de guerra en curso se sombrea y, si lleva
// menos de 4 ataques y no es opcional, el número lleva un asterisco en superíndice con su nota al pie. Se sube la versión para que 'activate' borre v25 y
// nadie siga con el guerra.html viejo.
// v27 (11-oct-2026): assets/js/ui/effects.js cambió (CORE_ASSETS) -- la tecla Escape cierra el menú móvil abierto y devuelve el foco al botón ☰ (P-1).
// Se sube la versión para que 'activate' borre v26 y nadie siga con el effects.js viejo.
// v28 (11-oct-2026): guerra.html cambió (CORE_ASSETS) -- en entrenamiento el aviso «Entrenamiento en curso» de «Valores diarios» sale para todos (semana por defecto del backend) y se quita la copia en localStorage.
// Se sube la versión para que 'activate' borre v27 y nadie siga con el guerra.html viejo.
// v29 (11-oct-2026): index.html, directorio.html y guerra.html cambiaron (CORE_ASSETS) -- en los textos visibles el fame del jugador pasa de «Puntaje» a «Medallas».
// Se sube la versión para que 'activate' borre v28 y nadie siga con el index/directorio/guerra viejos.
// v30 (11-oct-2026): directorio.html y guerra.html cambiaron (CORE_ASSETS) -- segunda tanda de «Medallas»: «Fame» de las tablas pasa a «Medallas» y el «Trofeos» del Log de Guerra y de la gráfica de clanes pasa a «Trofeos de guerra».
// Se sube la versión para que 'activate' borre v29 y nadie siga con el directorio/guerra viejos.
// v31 (11-oct-2026): admin.html y guerra.html cambiaron (CORE_ASSETS) -- «Trofeos guerra» pasa a «Victorias de guerra» en admin; en guerra se retira «Miembros Activos por Clan», se añade la columna N° (automática) a todas las tablas y el 📈 queda a la derecha de la columna Nombre.
// Se sube la versión para que 'activate' borre v30 y nadie siga con el admin/guerra viejos.
// v32 (11-oct-2026): guerra.html cambió (CORE_ASSETS) -- «Participación de Hoy» con alto limitado y barra de desplazamiento morada propia; la pastilla de rango y «Inactivo» van a la derecha junto al 📈.
// Se sube la versión para que 'activate' borre v31 y nadie siga con el guerra.html viejo.
// v33 (11-oct-2026): index.html y guerra.html cambiaron (CORE_ASSETS) -- el sobrenombre del clan (Principal, Clan 2…) solo acompaña al nombre real en el Top de la semana de index; «Guerra de Hoy» trae un botón «Ver pronóstico» que carga el pronóstico a pedido.
// Se sube la versión para que 'activate' borre v32 y nadie siga con el index/guerra viejos.
// v34 (11-oct-2026): guerra.html cambió (CORE_ASSETS) -- Pendientes de Atacar con filtros por columna, Log de Guerra en una sola tabla centrada con filtros y barras de desplazamiento siempre visibles en todas las tablas.
// Se sube la versión para que 'activate' borre v33 y nadie siga con el guerra.html viejo.
// v35 (11-oct-2026): perfil.html cambió (CORE_ASSETS) -- las gráficas de línea del perfil (Ranking, Ataques, Medallas, Barcos) se acotan a 400 px de alto máximo para que quepan junto a su título.
// Se sube la versión para que 'activate' borre v34 y nadie siga con el perfil.html viejo.
// v51 (11-oct-2026): timeline-svg.js, perfil.html y directorio.html cambiaron (CORE_ASSETS) -- el tooltip de las gráficas se voltea a la izquierda cerca del borde derecho.
// Se sube la versión para que 'activate' borre v50 y nadie siga con esos tres archivos viejos.
// v52 (12-oct-2026): guerra.html cambió (CORE_ASSETS) -- más espacio entre filas de .part-lista (objetivo táctil de 24 px, §PF050).
// v53 (12-oct-2026): guerra.html cambió (CORE_ASSETS) -- subrayado punteado en los enlaces de jugador dentro de .part-lista (§PF050, Q-1).
// v54 (12-oct-2026): assets/styles.css y assets/js/util.js cambiaron (CORE_ASSETS) -- clase .sr-only y aviso «se abre en una pestaña nueva» en enlaceJugador() y enlaceClan() (§PF050, Q-2).
// v56 (12-oct-2026): admin.html cambió (CORE_ASSETS) -- más espacio entre el enlace del clan y el del jugador en la tarjeta de cuentas (objetivo de 24 px, §PF050).
// v55 (12-oct-2026): guerra.html cambió (CORE_ASSETS) -- los ceros de las cuadrículas (.ai-cell-zero) suben de 2.7:1 a ~5:1 de contraste (§PF050, D-20).
// v57 (12-oct-2026): admin.html cambió (CORE_ASSETS) -- al abrir el formulario de Resolución el foco pasa a «Tipo de resolución» y «Cancelar» devuelve el foco al botón que lo abrió (§PF050, H-1 y H-2).
// v58 (12-oct-2026): perfil.html cambió (CORE_ASSETS) -- cintas decorativas en las 7 tarjetas restantes del perfil (Competitivo, Evolución, Mazo actual, Batallas más recientes, Ciclo de cofres, Colección completa y Progreso de eventos y modos; §PF056). Las imágenes cinta-*-2.webp nuevas no se precachean.
// v59 (12-oct-2026): perfil.html cambió (CORE_ASSETS) -- se quita el relleno de 72 px que cada gráfica de Evolución heredaba de `section{padding:72px 0}` (§PF060).
// v63 (12-oct-2026): perfil.html cambió (CORE_ASSETS) -- banner (cinta azul de Mazo actual, sin imagen nueva) en la tarjeta de cabecera del perfil (§PF064).
// v64 (12-oct-2026): assets/styles.css, perfil.html y torneos.html cambiaron (CORE_ASSETS) -- las reglas de las cintas pasan a styles.css, la variable --cinta ahora lleva url(img/...) (relativa a styles.css) y entran las cintas de torneos y clan (§PF065). Las imágenes cinta-*.webp nuevas no se precachean.
// v65 (12-oct-2026): index.html cambió (CORE_ASSETS) -- banners en las 7 secciones de la página de inicio (§PF065, tanda 2). Las imágenes cinta-index-*.webp nuevas no se precachean.
// v66 (12-oct-2026): comunidad.html cambió (CORE_ASSETS) -- banners en la cabecera y las 10 secciones de la página (§PF065, tanda 3). Las imágenes cinta-comunidad-*.webp nuevas no se precachean.
// v67 (12-oct-2026): directorio.html cambió (CORE_ASSETS) -- banners en la cabecera y las 4 secciones de la página (§PF065, tanda 4). Las imágenes cinta-directorio-*.webp nuevas no se precachean.
// v68 (12-oct-2026): 404.html cambió (CORE_ASSETS) -- banner en la tarjeta de error; permisos.html y mensajes.html también llevan cintas (§PF065, tanda 5). Las imágenes cinta-*.webp nuevas no se precachean.
// v69 (12-oct-2026): guerra.html cambió (CORE_ASSETS) -- banners en la cabecera y las 6 secciones de la página (§PF065, tanda 7). Las imágenes cinta-guerra-*.webp nuevas no se precachean.
// v70 (12-oct-2026): perfil.html cambió (CORE_ASSETS) -- eje X de las gráficas: con más de 7 días solo se rotulan los domingos y, si una semana no trae su domingo, se agrega un placeholder interpolado (§PF066).
// v71 (13-oct-2026): styles.css, index.html, directorio.html, guerra.html, torneos.html, comunidad.html, perfil.html cambiaron (CORE_ASSETS) -- separación estándar entre secciones de 20 px y emotes decorativos en perfil (§PF069). Las imágenes deco-*.webp nuevas no se precachean.
// v72 (13-oct-2026): directorio.html cambió (CORE_ASSETS) -- menos espacio entre el subtítulo y el recuadro de cada sección con cinta (§PF069).
// v73 (13-oct-2026): styles.css, index.html, directorio.html y guerra.html cambiaron (CORE_ASSETS) -- espacio de 20 px entre el subtítulo de cada encabezado con cinta y su contenido (§PF069).
// v74 (13-oct-2026): styles.css e index.html cambiaron (CORE_ASSETS) -- botón de ingresos recientes en forma de pastilla (§PF069).
// v75 (13-oct-2026): styles.css, torneos.html y perfil.html cambiaron (CORE_ASSETS) -- nombre del clan en morado claro y pastilla dorada compartida .ver-mas-btn (§PF069).
// v76 (14-oct-2026): perfil.html cambió (CORE_ASSETS) -- una sola pastilla «Sugerencias de mazo» con ventana de opciones (§PF070).
// v77 (14-oct-2026): perfil.html cambió (CORE_ASSETS) -- ventana «Niveles y evoluciones» de la colección: dona sola en la página, diagrama de evoluciones y héroes y tabla de fragmentos y monedas (§PF071).
// v78 (14-oct-2026): perfil.html cambió (CORE_ASSETS) -- ventana «Niveles y evoluciones»: títulos de sección en negrita, dona más grande y centrada, nombres de los conjuntos a los lados (§PF071).
// v79 (14-oct-2026): perfil.html cambió (CORE_ASSETS) -- franja pequeña de banner (cinta, 56 px) arriba de las tres ventanas del perfil: Costo de mejora, Sugerencias de mazo y Niveles y evoluciones (§PF056 y §PF065).
// v80 (14-oct-2026): guerra.html cambió (CORE_ASSETS) -- al elegir un día Jue–Dom, las tarjetas de clan muestran los ataques, medallas, barcos y cuántos atacaron de ese día, no solo el puesto (§PF137).
// v81 (14-oct-2026): perfil.html cambió (CORE_ASSETS) -- ventana «Niveles y evoluciones»: los Campeones cuentan como carta base, oro de las cartas por desbloquear bajo cada nivel e ícono Wild Shard en los fragmentos (§PF071).
// v82 (14-oct-2026): util.js, index.html y clan.html cambiaron (CORE_ASSETS) -- los tres momentos de la portada y de clan.html salen de fmtTresTiemposDeResultado(), igual que el resto del sitio.
// v83 (14-oct-2026): guerra.html cambió (CORE_ASSETS) -- «— 0 pendientes» de Participación de Hoy sin opacidad, para llegar a 4.5:1 de contraste (§PF050).
// v84 (14-oct-2026): perfil.html cambió (CORE_ASSETS) -- en móvil la página medía 609 px (bloque de cuadritos con min-width fijo, tabla de Progreso en eventos sin salto de línea), por eso las ventanas abrían ampliadas y desplazadas (§PF076).
// v85 (14-oct-2026): perfil.html y test cambiaron (CORE_ASSETS) -- ventana «Niveles y evoluciones» en móvil: números del diagrama más grandes, tabla de costos como tarjetas y puntos de color en lugar de emojis dentro del SVG (§PF076).
// v86 (17-oct-2026): admin.html cambió (CORE_ASSETS) -- el selector de semanas de Torneos y Sorteos ya no queda como una barra vacía si la primera carga falla: avisa el motivo, ofrece «Reintentar» y se vuelve a pedir al entrar al panel (§PF097).
// v98 (18-oct-2026): api.js cambió (CORE_ASSETS) -- la copia local de los JSON estáticos solo se guarda y se devuelve si tiene la forma que cada página exige; un archivo nuevo pero roto ya no reemplaza a la copia buena (§PF117).
// v99 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- las listas de torneos, sorteos y cambio de rango van de la más reciente a la más antigua, y «¿Cuál es el torneo principal?» también ofrece los planificados o sin link (§PF118).
// v97 (18-oct-2026): api.js y guerra.html cambiaron (CORE_ASSETS) -- el respaldo local de JSON estáticos pasa a apiGetEstaticoConEdad(): lo usan index, clan, directorio, comunidad, torneos, perfil y guerra, no solo guerra.json (§PF116).
// v96 (18-oct-2026): api.js y guerra.html cambiaron (CORE_ASSETS) -- guerra.json se guarda comprimido en localStorage y se usa como último recurso cuando no hay red ni Apps Script (§PF115).
// v95 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «¿Quién organizó el sorteo?» de Registrar, Modificar y Planificar sorteo ya lista los Nom_Multi de los admins, igual que Torneos y Cambio de rango (§PF111).
// v94 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Torneos jugados mínimos por clan» es obligatorio en Registrar, Planificar y Modificar sorteo (el 0 vale como «no considerar torneos») y el 0 guardado se recarga como 0 (§PF110).
// v93 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Modificar sorteo» lista también los sorteos Planificados de otro día, con fecha, hora y estado (§PF108).
// v92 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- se centran los textos de las tarjetas de indicadores y de «Posiciones finales» en «Novedades de la semana».
// v107 (19-oct-2026): guerra.html cambió (CORE_ASSETS) -- se acaba el vacío bajo el pie de página: `.table-scroll{position:relative}` recorta los span .sr-only (enlaces de jugador y clan) que estiraban el documento (§PF128).
// v108 (19-oct-2026): perfil.html cambió (CORE_ASSETS) -- el recorte de la insignia de victorias de guerra prueba primero con otra clave de caché (`?cors=1`) y avisa en consola por qué falla (§PF129).
// v109 (19-oct-2026): perfil.html cambió (CORE_ASSETS) -- se quita el recorte con canvas de la insignia de guerra: el CDN de Supercell no envía CORS (§PF129).
// v110 (19-oct-2026): todas las páginas, manifest.json y sw.js cambiaron (CORE_ASSETS) -- las imágenes de assets/img pasaron a assets/img/Fankit/{Banners,Emotes,Íconos} y assets/img/Logo Terna; se actualizan todas las rutas (§PF130).
// v111 (19-oct-2026): perfil.html y assets/js/ui/imagenes-respaldo.js (CORE_ASSETS) -- si una imagen de la API de Supercell no carga, se prueba la copia en assets/<tipo>/api/ y luego la de assets/cards/Fankit/ (§PF130).
// v112 (20-oct-2026): perfil.html (CORE_ASSETS) -- si una insignia de maestría no carga y tampoco la imagen de su carta, se prueba la copia local de la carta (assets/cards/api/ y luego Fankit) antes de ocultarla (§PF130).
// v113 (20-oct-2026): perfil.html (CORE_ASSETS) -- una insignia sin imagen (sin enlace o con respaldos que no cargan) muestra el ícono genérico assets/img/Fankit/Emotes/emotes_goblin_nope_dl.png en vez de un hueco (§PF130).
// v114 (20-oct-2026): perfil.html (CORE_ASSETS) -- se quitó la regla CSS .badge-ico-vacio, que ya no se usaba (§PF130).
// v115 (20-oct-2026): todas las páginas, manifest.json, styles.css y sw.js cambiaron (CORE_ASSETS) -- las imágenes pasaron de assets/img, cards, chests, arenas y playerbadges a assets/Imágenes/<tipo>/{API,Fankit}; las copias de insignias están en badges/API/Maestrías e Insignias (§PF130).
// v116 (20-oct-2026): assets/js/data/clan-badges.js y perfil.html (CORE_ASSETS) -- el escudo de clan (iconoBadgeClanHtml) pedía assets/badges/<nombre>.png, que ya no existe; ahora apunta a assets/Imágenes/badges/Fankit/ (§PF130).
// Se sube la versión para que 'activate' borre v114 y nadie siga con las rutas viejas.
// v117 (20-oct-2026): perfil.html y directorio.html cambiaron (CORE_ASSETS) -- el tooltip de cada punto de las gráficas lleva una línea «Temporada N, Semana N, Día» (§PF133).
// v118 (20-oct-2026): assets/js/features/timeline-svg.js, assets/styles.css, perfil.html y directorio.html cambiaron (CORE_ASSETS) -- sombreado ligero e intercalado por temporada en las gráficas (§PF134).
// v119 (20-oct-2026): perfil.html cambió (CORE_ASSETS) -- el valor diario se dibuja siempre encima del acumulado en las gráficas (en «Barcos por semana» coinciden a propósito) y en la minigráfica «Medallas de guerra por día» (§PF135).
// v124 (20-oct-2026): perfil.html cambió (CORE_ASSETS) -- en la tabla «Fragmentos y monedas que faltan» los valores de la columna Variante van a la izquierda; el resto sigue centrado (§PF071).
// v123 (20-oct-2026): perfil.html cambió (CORE_ASSETS) -- la tabla «Fragmentos y monedas que faltan» centra encabezados y valores en pantalla ancha (§PF071).
// v122 (20-oct-2026): perfil.html cambió (CORE_ASSETS) -- ventana «Niveles y evoluciones»: números del diagrama centrados en su región y tabla de fragmentos y monedas solo con íconos, con leyenda debajo (§PF071).
// v121 (20-oct-2026): perfil.html cambió (CORE_ASSETS) -- el acumulado (línea de 6 y aro de radio 7) solo se destaca donde coincide con el diario; si no coinciden, línea y aro normales (§PF135).
// v120 (20-oct-2026): perfil.html cambió (CORE_ASSETS) -- el aro del acumulado era casi invisible detrás del punto diario: radio 7 (9 si es anomalía; 6,5 en la minigráfica) y línea verde más gruesa (§PF135).
// v91 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Modificar sorteo» muestra primero la lista de sorteos y después el tipo (principal o continuación), que ya se puede cambiar, igual que «Modificar torneo» (§PF107).
// v90 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Ataques a barcos» arranca con el Barcos del registro anterior (16 solo si no hay ninguno) en torneos, sorteos y cambio de rango, y «Modificar torneo» muestra primero la lista y después el tipo (principal o continuación), que ya se puede cambiar (§PF105).
// v89 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Modificar torneo» y «Modificar sorteo» muestran 16 en «Ataques a barcos» cuando el registro no tiene Barcos (tope: 16 equivale a no evaluarlos), en vez de 0 o el valor de otro torneo (§PF102).
// v88 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Modificar torneo» precarga los requisitos del torneo elegido (con «Cargando…» y sin guardar hasta que terminen) y deja el Nom_Multi y la cuenta organizadora ya elegidos, pudiendo cambiar a cualquier otra cuenta (§PF101).
// v87 (18-oct-2026): admin.html cambió (CORE_ASSETS) -- «Modificar torneo» ya lista también los torneos Planificados y los sin link (no solo los de hoy), con fecha, hora y estado, y precarga la hora real (§PF099).
// v125 (21-oct-2026): torneos.html cambió (CORE_ASSETS) -- un torneo con continuación se muestra como uno solo, con «Realizado en N partes» (§PF154).
// v126 (21-oct-2026): torneos.html cambió (CORE_ASSETS) -- cada fila de «Torneos recientes» busca su podio también por `id` (la lista del backend trae `id`, no `idTorneo`) (§PF154).
// v127 (21-oct-2026): las fechas con mes abreviado pasan a dd/mm/aaaa en util.js, directorio.html, perfil.html y admin.html (CORE_ASSETS) (§PF157).
// v128 (21-oct-2026): perfil.html cambió (CORE_ASSETS) -- el día de guerra de cada registro sale de `periodIndex`, y los ataques del día usan `ataquesHoy` cuando la resta del acumulado es imposible (§PF159).
// v129 (21-oct-2026): perfil.html cambió (CORE_ASSETS) -- el diario sale solo de la resta del acumulado semanal; se quitó el respaldo con `ataquesHoy` de v128 (§PF159).
// v130 (21-oct-2026): assets/js/util.js cambió (CORE_ASSETS) -- fmtNum() reutiliza un único Intl.NumberFormat en vez de crear uno por llamada (mismo texto; menos CPU al pintar las tablas de guerra, §PF018).
// v131 (21-oct-2026): perfil.html cambió (CORE_ASSETS) -- en la ventana «Niveles y evoluciones» el «CARTAS» del centro de la dona, la nota «Oro acumulado…» y la pastilla «Nivel promedio» pasan a 11 px (§PF076).
// v132 (22-oct-2026): assets/js/ui/imagenes-respaldo.js y perfil.html cambiaron (CORE_ASSETS) -- las insignias de jugador piden primero la copia local de badges/API/ (ya sin margen, §PF161) y dejan el enlace de Supercell como último recurso (§PF162).
// v133 (22-oct-2026): perfil.html cambió (CORE_ASSETS) -- el donut de Donaciones se muestra también con 0/0 (§PF163).
// v134 (22-oct-2026): directorio.html cambió (CORE_ASSETS) -- la tarjeta de Ingresos recientes muestra, solo a admins, un ícono de WhatsApp (sin enlace) cuando tenemos el celular de la cuenta (§PF165).
// v135 (22-oct-2026): guerra.html cambió (CORE_ASSETS) -- el mini historial y el comparador de un jugador muestran medallas y barcos del día, no acumulados de la semana (§PF167).
// v136 (22-oct-2026): util.js, guerra.html y directorio.html cambiaron (CORE_ASSETS) -- la conversión a medallas y barcos del día pasa a util.js (guerraAValoresDiarios()) y también la usa el comparador de directorio.html (§PF167).
// v137 (22-oct-2026): perfil.html cambió (CORE_ASSETS) -- el selector de semana del Historial de guerra muestra el rango lunes–domingo («S3 (19 OCT – 25 OCT)») en vez de un solo día (§PF168).
// v138 (22-oct-2026): perfil.html cambió (CORE_ASSETS) -- en el Historial de guerra, el año y el mes de la temporada salen del lunes de la semana, no del último día registrado (§PF168).
// v139 (22-oct-2026): directorio.html, guerra.html, assets/styles.css y el nuevo assets/js/features/mini-historial.js cambiaron (CORE_ASSETS) -- el mini historial de guerra (📈) pasa a un archivo compartido y la tabla del Directorio lo muestra junto al nombre de cada jugador (§PF169).
// v140 (22-oct-2026): guerra.html cambió (CORE_ASSETS) -- «Pendientes de Atacar» muestra el 📈 del mini historial junto al nombre de cada jugador (§PF170).
// v141 (22-oct-2026): guerra.html, directorio.html y assets/js/data/clan-badges.js cambiaron (CORE_ASSETS) -- «Participación de Hoy» muestra el 📈 del mini historial y, solo a admins, el ícono de WhatsApp (sin enlace) junto a cada cuenta; el ícono pasa a clan-badges.js (§PF171).
// v142 (22-oct-2026): guerra.html, directorio.html, assets/styles.css y assets/js/features/mini-historial.js cambiaron (CORE_ASSETS) -- el 📈 del mini historial va pegado a la derecha de la celda Nombre en Pendientes de Atacar y en el Directorio (como en Valores diarios) y, solo a admins, el ícono de WhatsApp va a su izquierda en todas las tablas (§PF172).
// v145 (23-oct-2026): assets/js/features/mini-historial.js y assets/styles.css cambiaron (CORE_ASSETS) -- la tabla «Comparar con» lleva N°, Fecha y Día, color por jugador y semanas alternadas, y los nombres del mini historial enlazan a su perfil (§PF174).
// v144 (22-oct-2026): assets/js/features/mini-historial.js y assets/styles.css cambiaron (CORE_ASSETS) -- una fila con 1 ataque también va en amarillo (clase .hist-a13, antes .hist-a23; §PF173).
// v143 (22-oct-2026): assets/js/features/mini-historial.js y assets/styles.css cambiaron (CORE_ASSETS) -- la tabla del mini historial lleva N°, Fecha (22/10/2026), Día (J, V, S, D), color de fila según los ataques y semanas sombreadas de forma alternada (§PF173).
// v146 (23-oct-2026): guerra.html cambió (CORE_ASSETS) -- la fila de mensajes de guerra de Pendientes de Atacar muestra a los admins el motivo cuando no carga o viene vacía, en vez de quedar en blanco.
// v147 (23-oct-2026): guerra.html cambió (CORE_ASSETS) -- el aviso de la fila de mensajes de guerra ya no repite el punto final del texto que manda el servidor.
// v148 (23-oct-2026): directorio.html y assets/js/features/mini-historial.js cambiaron (CORE_ASSETS) -- «Ingresos recientes» lleva el 📈 del mini historial a la derecha del WhatsApp y, solo para admins, la pastilla «Ocultar con número» (§PF175).
// v154 (23-oct-2026): directorio.html cambió (CORE_ASSETS) -- botón «Actualizar» (solo admins) en Ingresos recientes (§PF180).
// v155 (23-oct-2026): assets/js/features/mini-historial.js cambió (CORE_ASSETS) -- el armado de la tabla de días se extrajo a funciones compartidas y «Ver todos» pasó a «Ver más» de 28 en 28 (tanda 5, parte 1, §PF181).
// v156 (23-oct-2026): perfil.html cambió (CORE_ASSETS) -- tarjeta «Historial de guerra» (solo admins, a pedido) con la misma fuente y el mismo armado que el mini historial; carga mini-historial.js (tanda 5, parte 2, §PF181).
// v157 (23-oct-2026): perfil.html cambió (CORE_ASSETS) -- se quitan el botón «📜 Historial de guerra» de la cabecera, sus tres selectores y el historial semanal; queda solo la tarjeta «Historial de guerra» (tanda 5, parte 3, §PF181).
// v158 (23-oct-2026): perfil.html y assets/js/features/mini-historial.js cambiaron (CORE_ASSETS) -- el perfil ya no pide webAdminTagsConWsp de más (§PF181).
// v159 (23-oct-2026): guerra.html cambió (CORE_ASSETS) -- los botones «Copiar» de mensajes de guerra piden el texto fresco al hacer clic, muestran su antigüedad y se agregó «Regenerar ahora» (§PF193).
// v160 (23-oct-2026): guerra.html cambió (CORE_ASSETS) -- el «Pronóstico de hoy» muestra la fama, el techo y el puesto de HOY y no el acumulado de la semana (§PF194).
// v161 (24-oct-2026): assets/js/features/mini-historial.js cambió (CORE_ASSETS) -- la cabecera del perfil en el mini historial ahora lee `jugador` de la respuesta de webPerfil y se ve (tanda 8, corrección a la tanda 4, §PF195).
// v162 (24-oct-2026): perfil.html cambió (CORE_ASSETS) -- tarjeta «¿Es infiltrado?» (solo admins, a pedido) con el criterio de la «Detección de infiltrados» de admin.html (tanda 10, §PF196).
// v163 (24-oct-2026): assets/js/features/mini-historial.js y assets/styles.css cambiaron (CORE_ASSETS) -- en el móvil solo se desplaza la tabla del mini historial (§PF197).
// v164 (24-oct-2026): assets/styles.css cambió (CORE_ASSETS) -- todas las barras de desplazamiento, actuales y futuras, usan el estilo morado de las tablas de guerra (§PF199).
// v165 (24-oct-2026): perfil.html cambió (CORE_ASSETS) -- los botones RoyaleAPI y CWStats se arman desde el Tag para el admin cuando el backend no manda el enlace (inactivos; §PF200).
// v166 (24-oct-2026): guerra.html cambió (CORE_ASSETS) -- el bloque del pronóstico sigue al día elegido en Jue–Dom: en un día ya jugado muestra el resultado de ese día de cada clan y su título ya no dice «de hoy» (§PF203).
// v167 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- en la ruleta los nombres quedan pegados al borde exterior y el centro muestra el escudo de la Familia Terna (§PF210).
// v168 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- el escudo del centro de la ruleta queda centrado y la ruleta es más grande (hasta 560 px según el espacio y la altura de la pantalla; §PF210).
// v169 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- desplegable de sorteo con semanas y premios, y premio precargado en cada ganador (§PF211).
// v170 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- Reglas del sorteo arriba de Participantes y los ganadores pasan a la columna de la ruleta, en cuadrícula (§PF212).
// v171 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- si el backend no devuelve semanas ni premios, ya no dice que el sorteo no los tiene configurados (§PF213).
// v172 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- con un sorteo cargado se oculta «Cantidad de premios» (la cantidad sale de sus premios) y el panel de reglas y la columna derecha son más anchos (§PF214).
// v173 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- cada nombre de la ruleta queda en el centro de su propia franja (estaba corrido 90°) y se ajusta a su ancho (§PF215).
// v174 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- el escudo del centro de la ruleta llena todo el círculo (84 % a 100 %; §PF216).
// v175 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- la cabecera queda solo con «ᴳ乂ᵀ ⚜️ Familia Terna - Sorteo en vivo»: se quitan «Volver al panel admin», «Sorteo en vivo» y «Se transmite en vivo» (§PF217).
// v176 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- título de la ruleta centrado y círculo del escudo con fondo negro (§PF218).
// v177 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- se rediseña con la paleta «Dark Elixir» del resto del sitio: fondo negro, violeta y oro, tarjetas de vidrio y Rajdhani en mayúsculas (§PF219).
// v178 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- la ruleta va a la izquierda y el nombre del sorteado, el intento y «¡Girar!» a su derecha; el acta Word pasa a la paleta oscura (§PF220).
// v179 (24-oct-2026): sorteo.html cambió (CORE_ASSETS) -- barras de desplazamiento moradas también en esa página, que no carga assets/styles.css (§PF199).
const CACHE_NAME = 'terna-static-v179';

// Shell mínimo precacheado en la instalación — páginas públicas más
// visitadas y los assets que usa prácticamente toda la web. admin.html y
// sorteo.html (noindex, uso interno) no se precachean a propósito, pero
// igual quedan cacheadas de forma oportunista la primera vez que se
// visitan (ver el fetch handler de navegación más abajo).
const CORE_ASSETS = [
  'index.html',
  'directorio.html',
  'guerra.html',
  'torneos.html',
  'comunidad.html',
  '404.html',
  'manifest.json',
  'assets/styles.css',
  'assets/common.js',
  // Módulos que cargan todas las páginas (mismo orden que sus <script src>).
  'assets/js/core/config.js',
  'assets/js/util.js',
  'assets/js/core/api.js',
  'assets/js/core/auth.js',
  'assets/js/ui/tables.js',
  'assets/js/ui/filters.js',
  'assets/js/ui/effects.js',
  'assets/js/ui/imagenes-respaldo.js',
  'assets/js/data/cards-es.js',
  'assets/js/data/clan-badges.js',
  'assets/js/features/clan-card.js',
  'assets/js/features/inactivos.js',
  'assets/js/features/timeline-svg.js',
  'assets/js/features/mini-historial.js',
  'assets/js/features/join-modal.js',
  'assets/Im%C3%A1genes/Logo%20Terna/logo-cuadrado.jpg',
  'assets/Im%C3%A1genes/Logo%20Terna/icon-192.png',
  'assets/Im%C3%A1genes/Logo%20Terna/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS.map(ruta => new Request(ruta, { cache: 'reload' }))))
      .catch(() => { /* si algún asset falla (ej. red lenta en el install), no bloquea el resto */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres => Promise.all(
      nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // nunca cachear POST (todas las llamadas al backend son POST, ver apiPost() en common.js)

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // deja pasar Apps Script, Google Fonts, favicons, etc. sin tocar

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Solo se guardan respuestas correctas: un 404/5xx cacheado se serviría después estando offline.
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then(cacheado => cacheado || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cacheado => {
      // 20-sep-2026 (tanda 2): cache:'no-cache' obliga a validar contra el servidor (If-None-Match/ETag)
      // en vez de aceptar la copia del caché HTTP del navegador (GitHub Pages: max-age=600). Si el
      // archivo no cambió, el servidor responde 304 (casi sin costo); si cambió, llega completo.
      const enRed = fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
        }
        return res;
      }).catch(() => cacheado);
      return cacheado || enRed;
    })
  );
});
