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
function activarBarraScrollTabla(wrap, opciones = {}){
  if (!wrap) return;
  const tabla = wrap.querySelector('table');
  if (!tabla) return;
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

  const fijarAncho = () => { inner.style.width = tabla.scrollWidth + 'px'; };
  fijarAncho();
  requestAnimationFrame(fijarAncho);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fijarAncho).catch(() => {});
  if (window.ResizeObserver){
    new ResizeObserver(fijarAncho).observe(tabla);
  } else {
    window.addEventListener('resize', fijarAncho);
  }

  sincronizarScrollHorizontal([barraSup, wrap]);
}
