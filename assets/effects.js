/* effects.js — nav activa, ajuste de tamaño de texto a una línea, y scroll-reveal. Extraído de common.js. */



/** Marca activo el link de navegación de la página actual (por data-page). */
function marcarNavActiva(){
  const actual = document.body.dataset.page;
  document.querySelectorAll('.nav .links a[data-page]').forEach(a => {
    if(a.dataset.page === actual) a.classList.add('active');
  });
  const toggle = document.getElementById('navToggle');
  const links  = document.querySelector('.nav .links');
  if(toggle && links){
    // MEJORA (18-sep-2026, accesibilidad — propuesta y pedida por el
    // usuario): antes solo se alternaba la clase CSS 'open'; un lector de
    // pantalla no tenía forma de saber si el menú estaba desplegado.
    // Ahora también se refleja aria-expanded y el aria-label cambia entre
    // "Abrir menú"/"Cerrar menú" según el estado real.
    toggle.addEventListener('click', () => {
      const abierto = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
  }
}


/* =========================================================================
 * fitOneLine — textos que el diseño exige "una sola línea" (PDF de diseño,
 * 28-ago-2026, pedido repetido en varias secciones: hero, subtítulos de
 * "Nuestros Clanes", "Ingresos recientes", "Clanes", etc). En vez de dejar
 * que el texto se parta en 2 líneas en pantallas angostas o columnas flex
 * estrechas, se reduce el font-size del elemento (sin recortar texto, sin
 * "...", sin partir palabras) hasta que entra en una sola línea dentro de
 * su ancho disponible. Se aplica a cualquier <p> dentro de .sec-head y a
 * cualquier elemento marcado con el atributo data-fit-line.
 * ========================================================================= */
function fitOneLine(el){
  if (!el) return;
  if (!el.dataset.baseFontSize){
    el.dataset.baseFontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
  }
  const base = parseFloat(el.dataset.baseFontSize);
  el.style.whiteSpace = 'nowrap';
  let size = base;
  el.style.fontSize = size + 'px';
  let guard = 0;
  while (el.scrollWidth > el.clientWidth + 1 && size > 9 && guard < 60){
    size -= 0.5;
    el.style.fontSize = size + 'px';
    guard++;
  }
  /* FIX (01-sep-2026, pedido usuario — "el texto del inicio está
   * incompleto en la versión móvil" / "el texto 'cada clan' está muy
   * pegada a la derecha, el margen es desproporcionado"): si ni siquiera
   * al tamaño mínimo (9px) el texto entra en una sola línea (frases
   * largas en pantallas angostas), forzar nowrap solo logra recortarlo o
   * desbordarlo de forma asimétrica — nunca lo muestra completo ni
   * legible. En ese caso se abandona el modo "una sola línea" para ESE
   * elemento y se vuelve al comportamiento normal de párrafo (puede
   * ocupar 2+ líneas, tamaño de fuente original). Los textos cortos que
   * sí caben en una línea (eyebrows, subtítulos breves) no se ven
   * afectados por este cambio.
   */
  if (el.scrollWidth > el.clientWidth + 1){
    el.style.whiteSpace = 'normal';
    el.style.fontSize = base + 'px';
  }
}

function fitOneLineAll(){
  document.querySelectorAll('.sec-head p, [data-fit-line]').forEach(fitOneLine);
}

/* =========================================================================
 * Scroll-reveal (17-sep-2026, pedido usuario — "que la web sea más
 * interactiva"): fade + slide-up genérico para cualquier elemento con el
 * atributo data-reveal, disparado por IntersectionObserver la primera vez
 * que entra en pantalla. No hace falta JS por página: solo agregar
 * data-reveal="" al elemento en el HTML (ver index.html para el primer
 * uso). data-reveal-stagger en un contenedor padre escalona la entrada de
 * sus hijos directos con data-reveal (80ms de diferencia entre cada uno).
 *
 * Fallback sin JS / sin IntersectionObserver: el contenido se queda
 * visible de entrada. La clase .js-reveal en <html> es la que activa el
 * estado oculto en CSS (ver assets/styles.css) — si este script no corre,
 * esa clase nunca se agrega y nada se oculta.
 *
 * Soporta contenido inyectado después de cargar la página (tarjetas de
 * clan, rankings, etc. que llegan por fetch vía apiGet()): un
 * MutationObserver sobre <body> detecta nodos nuevos con data-reveal y los
 * empieza a observar también, no hace falta re-lanzar nada manualmente
 * desde cada página.
 *
 * Respeta prefers-reduced-motion automáticamente: cae dentro del reset
 * global `*:not([data-essential-motion])` de styles.css que ya fuerza
 * transition-duration:0.001ms, así que para quien tenga activado "reducir
 * movimiento" el contenido aparece de golpe, sin animación perceptible.
 * ========================================================================= */
(function initScrollReveal(){
  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-reveal');

  const io = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting){
        entrada.target.classList.add('is-revealed');
        io.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  function escalonar(el){
    const grupo = el.closest('[data-reveal-stagger]');
    if (!grupo) return;
    const hermanos = Array.from(grupo.querySelectorAll(':scope > [data-reveal]'));
    const i = hermanos.indexOf(el);
    // Tope de 6 pasos: en listas largas generadas dinámicamente (filas de
    // torneos, roster, etc.) evita que el último elemento tarde varios
    // segundos en aparecer.
    if (i > -1) el.style.transitionDelay = (Math.min(i, 6) * 80) + 'ms';
  }

  function observar(el){
    if (el.dataset.revealObservado) return;
    el.dataset.revealObservado = '1';
    escalonar(el);
    io.observe(el);
  }

  function escanear(raiz){
    if (raiz.nodeType !== 1) return;
    if (raiz.matches('[data-reveal]')) observar(raiz);
    raiz.querySelectorAll('[data-reveal]').forEach(observar);
  }

  document.querySelectorAll('[data-reveal]').forEach(observar);

  const mo = new MutationObserver((mutaciones) => {
    mutaciones.forEach(m => m.addedNodes.forEach(escanear));
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
