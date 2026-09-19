/* tables.js — scroll horizontal sincronizado y barra de scroll superior de tablas. Extraído de common.js. */



/**
 * sincronizarScrollHorizontal(elementos)
 * Sincroniza el scroll horizontal entre 2 o más elementos (misma bandera
 * "sincronizando" para no entrar en loop de eventos "scroll" al mover uno
 * de ellos). FIX (18-sep-2026, código repetido): antes este mismo patrón
 * estaba escrito a mano en dos lugares — dentro de
 * enlazarScrollsHorizontales() de guerra.html (una vez por tarjeta de
 * clan, con N barras sincronizadas) y en línea dentro de directorio.html
 * (un solo par topScroll/tableWrap). Ambos casos son este mismo patrón con
 * distinta cantidad de elementos, así que se deja parametrizado por
 * cantidad en vez de fijo a 2.
 */
function sincronizarScrollHorizontal(elementos){
  let sincronizando = false;
  elementos.forEach(el => {
    el.addEventListener('scroll', () => {
      if (sincronizando) return;
      sincronizando = true;
      elementos.forEach(otro => { if (otro !== el) otro.scrollLeft = el.scrollLeft; });
      sincronizando = false;
    });
  });
}


/**
 * activarBarraScrollTabla(wrap, opciones)
 * FIX (18-sep-2026, pedido usuario — "ninguna de las tablas debe tener la
 * barra nativa, todo debe tener el estilo de la página; todas las tablas
 * que se muestren deben tener la barra superior e inferior con el estilo
 * de la web, incluye también una de desplazamiento vertical a la derecha
 * (de la barrita morada, no nativa). En directorio por clan no se ve la
 * barra superior, la inferior sí").
 *
 * Punto único para darle a CUALQUIER tabla del sitio (no solo al roster de
 * Directorio o las grillas de Guerra, que ya tenían su propio armado a
 * mano) las 3 barras pedidas: superior sintética, inferior (la real,
 * restyleada) y vertical a la derecha (también restyleada) — ver clases
 * .scroll-morado/.tabla-scroll-top/.tabla-scroll-wrap en assets/styles.css.
 *
 * También corrige el bug reportado en Directorio: antes el ancho de la
 * barra superior se fijaba UNA sola vez, justo al pintar la tabla — si en
 * ese instante las fuentes web (Rajdhani/IBM Plex Mono, cargadas con
 * font-display:swap) todavía no habían terminado de cargar, el texto medía
 * menos de lo que mide después del swap, así que topScrollInner quedaba
 * con un ancho más angosto que el real y la barra de arriba no llegaba a
 * desbordar (mientras que la de abajo, al ser el overflow nativo real de
 * .roster-table-wrap, siempre se recalcula solo y sí se veía). Acá se
 * recalcula: de inmediato, en el siguiente frame (requestAnimationFrame,
 * ya con layout asentado), cuando terminan de cargar las fuentes
 * (document.fonts.ready) y ante cualquier cambio de tamaño de la propia
 * tabla (ResizeObserver — cubre además filtros/orden que angostan o
 * ensanchan columnas sin disparar un resize de ventana).
 *
 * @param {HTMLElement} wrap - contenedor que YA tiene overflow-x:auto (o
 *   que puede recibirlo acá mismo) y contiene, adentro, la <table> real.
 *   Puede ser .roster-table-wrap, .table-scroll, .inactivos-table-wrap o
 *   cualquier div nuevo alrededor de un <table> (ver perfil.html/
 *   sorteo.html/admin.html).
 * @param {object} [opciones]
 * @param {number|null} [opciones.alto=480] - alto máximo en px antes de
 *   que aparezca la barra vertical morada a la derecha. Pasar null para NO
 *   limitar el alto (tabla corta que nunca necesitaría scroll vertical).
 * @param {HTMLElement} [opciones.barraSuperior] - si la página ya arma su
 *   propia franja superior a mano (ej. #rosterTopScroll en directorio.html)
 *   se pasa acá en vez de dejar que esta función cree una nueva.
 */
/**
 * _prepararBarraScrollTabla(wrap, opciones)
 * Fase de "estructura" de activarBarraScrollTabla()/activarBarraScrollTablas():
 * crea/reutiliza la barra superior y le pone las clases/estilos que no
 * dependen de medir nada (no fuerza layout). Devuelve
 * { wrap, tabla, barraSup, inner } o null si wrap no tiene tabla adentro.
 * Separado de la lectura de scrollWidth para poder, en el caso de varias
 * tablas a la vez (ver activarBarraScrollTablas), preparar TODAS primero y
 * recién después leer/escribir anchos en dos pasadas — ver docblock de
 * activarBarraScrollTablas para el motivo.
 */
function _prepararBarraScrollTabla(wrap, opciones){
  if (!wrap) return null;
  const tabla = wrap.querySelector('table');
  if (!tabla) return null;
  const alto = opciones.alto === undefined ? 480 : opciones.alto;

  wrap.classList.add('tabla-scroll-wrap', 'scroll-morado');
  if (!wrap.style.overflowX) wrap.style.overflowX = 'auto';
  wrap.style.maxHeight = alto ? alto + 'px' : 'none';

  let barraSup = opciones.barraSuperior || null;
  if (!barraSup){
    const anterior = wrap.previousElementSibling;
    if (anterior && anterior.classList && anterior.classList.contains('tabla-scroll-top')){
      barraSup = anterior;
    } else {
      barraSup = document.createElement('div');
      barraSup.className = 'tabla-scroll-top scroll-morado';
      barraSup.setAttribute('aria-hidden', 'true');
      barraSup.innerHTML = '<div class="tabla-scroll-top-inner"></div>';
      wrap.parentNode.insertBefore(barraSup, wrap);
    }
  }
  let inner = barraSup.querySelector('.tabla-scroll-top-inner');
  if (!inner){
    inner = document.createElement('div');
    inner.className = 'tabla-scroll-top-inner';
    barraSup.appendChild(inner);
  }

  return { wrap, tabla, barraSup, inner };
}


function activarBarraScrollTabla(wrap, opciones = {}){
  activarBarraScrollTablas([wrap], opciones);
}


/**
 * activarBarraScrollTablas(wraps, opciones)
 * FIX (pendiente #5 de B5.5, 19-sep-2026 — TBT de guerra.html: tarea larga
 * de 582 ms al pintar la página): guerra.html activa varias tablas de una
 * sola vez con `.querySelectorAll('.table-scroll').forEach(w =>
 * activarBarraScrollTabla(w))` (una tarjeta por clan, cada una con su
 * tabla) en 3 puntos — Pendientes de Atacar, Control de Activos y Control
 * de Temporada. Llamar activarBarraScrollTabla() una vez por tabla ahí
 * intercala LECTURA (tabla.scrollWidth, fuerza layout) y ESCRITURA
 * (inner.style.width) por cada tabla en el mismo bucle — con varios clanes
 * a la vez eso es exactamente el patrón de "layout thrashing" (leer,
 * escribir, leer, escribir...) que junta muchos reflows forzados en una
 * sola tarea larga en vez de uno solo.
 *
 * Esta función agrupa el trabajo en 2 pasadas para CUALQUIER cantidad de
 * tablas: primero prepara+LEE el ancho de todas (sin escribir nada todavía,
 * así ninguna lectura queda invalidada por una escritura previa de OTRA
 * tabla del mismo lote) y recién después ESCRIBE todos los anchos. Con eso,
 * un lote de N tablas fuerza como mucho 1 reflow de lectura en vez de N.
 * `activarBarraScrollTabla(wrap, opciones)` (una sola tabla) sigue
 * existiendo tal cual para no tocar los demás puntos de llamada del sitio
 * (admin.html, directorio.html, perfil.html) — internamente ahora es un
 * atajo de esta misma función con un lote de 1, mismo orden lectura/
 * escritura que antes, sin cambio de comportamiento para esos casos.
 *
 * @param {ArrayLike<HTMLElement>} wraps - NodeList o array de wraps (ver
 *   activarBarraScrollTabla para qué es un "wrap" válido).
 * @param {object} [opciones] - igual que en activarBarraScrollTabla; se
 *   aplican a TODOS los wraps del lote por igual (no hay hoy ningún caso
 *   en el sitio que necesite opciones distintas dentro de un mismo lote).
 */
function activarBarraScrollTablas(wraps, opciones = {}){
  const preparados = Array.from(wraps || [])
    .map(w => _prepararBarraScrollTabla(w, opciones))
    .filter(Boolean);
  if (!preparados.length) return;

  // Pasada de LECTURA: todo scrollWidth se lee antes de escribir ningún
  // ancho, para no invalidar el layout ya leído de una tabla anterior del
  // mismo lote.
  preparados.forEach(p => { p._anchoInicial = p.tabla.scrollWidth; });
  // Pasada de ESCRITURA.
  preparados.forEach(p => { p.inner.style.width = p._anchoInicial + 'px'; });

  preparados.forEach(p => {
    const fijarAncho = () => { p.inner.style.width = p.tabla.scrollWidth + 'px'; };
    requestAnimationFrame(fijarAncho);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fijarAncho).catch(() => {});
    if (window.ResizeObserver){
      new ResizeObserver(fijarAncho).observe(p.tabla);
    } else {
      window.addEventListener('resize', fijarAncho);
    }
    sincronizarScrollHorizontal([p.barraSup, p.wrap]);
  });
}
