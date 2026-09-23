'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// tables.js entero necesita DOM real (document.createElement,
// querySelector, addEventListener, ResizeObserver, requestAnimationFrame,
// document.fonts) — no tiene ninguna parte pura, a diferencia de
// timeline-svg.js. No depende de ningún otro archivo de assets/js/**, así
// que va solo en loadBrowserScriptsWithDom().
//
// AVISO ABIERTO (limitación de jsdom, no de tables.js): jsdom no implementa
// `ResizeObserver` ni `document.fonts` (confirmado en esta sesión — ambos
// dan `undefined`). activarBarraScrollTablas() ya contempla esto con sus
// propios fallbacks (`if (window.ResizeObserver) {...} else {
// window.addEventListener('resize', ...) }` y `if (document.fonts &&
// document.fonts.ready) {...}`), así que estos tests SÍ cubren esas ramas
// de fallback (ver "sin ResizeObserver..." más abajo), pero NO pueden
// ejercitar la rama real de ResizeObserver ni la de document.fonts.ready
// tal como se comportarían en un navegador real. Queda pendiente
// confirmar esas dos ramas en un navegador real (Chrome/Firefox) antes de
// dar tables.js por 100% verificado.
const DEPENDENCIAS = ['assets/js/ui/tables.js'];

function montar(htmlBody){
  return loadBrowserScriptsWithDom(DEPENDENCIAS, htmlBody || '');
}

// Arma <div class="contenedor"><div class="wrap">[<table></table>]</div></div>
// y lo cuelga de document.body, para que wrap.parentNode/previousElementSibling
// funcionen como en la página real (insertBefore necesita un padre).
function crearWrapConTabla(document, { conTabla = true } = {}){
  const contenedor = document.createElement('div');
  const wrap = document.createElement('div');
  if (conTabla) wrap.appendChild(document.createElement('table'));
  contenedor.appendChild(wrap);
  document.body.appendChild(contenedor);
  return wrap;
}

// Simula el comportamiento de un navegador real: asignar `scrollLeft`
// dispara un evento "scroll" en el propio elemento. jsdom (a diferencia de
// un navegador) NO hace esto solo con la asignación (confirmado en esta
// sesión) — sincronizarScrollHorizontal() no dispara este evento por su
// cuenta, así que para probar la bandera "sincronizando" contra un loop
// real hace falta este helper.
function simularScrollNativo(el, window){
  let valor = 0;
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get(){ return valor; },
    set(v){
      valor = v;
      el.dispatchEvent(new window.Event('scroll'));
    }
  });
}

// ---------------------------------------------------------------------
// sincronizarScrollHorizontal(elementos)
// ---------------------------------------------------------------------

test('sincronizarScrollHorizontal() propaga el scrollLeft de "el" a "otro" en ambos sentidos', () => {
  const { window, document } = montar('<div id="a"></div><div id="b"></div>');
  const a = document.getElementById('a');
  const b = document.getElementById('b');
  window.sincronizarScrollHorizontal([a, b]);

  a.scrollLeft = 40;
  a.dispatchEvent(new window.Event('scroll'));
  assert.equal(b.scrollLeft, 40);

  b.scrollLeft = 70;
  b.dispatchEvent(new window.Event('scroll'));
  assert.equal(a.scrollLeft, 70);
});

test('sincronizarScrollHorizontal() con 3+ elementos sincroniza a todos los demás, sin volver a tocar el que originó el evento', () => {
  const { window, document } = montar('<div id="a"></div><div id="b"></div><div id="c"></div>');
  const a = document.getElementById('a');
  const b = document.getElementById('b');
  const c = document.getElementById('c');
  window.sincronizarScrollHorizontal([a, b, c]);

  a.scrollLeft = 25;
  a.dispatchEvent(new window.Event('scroll'));
  assert.equal(b.scrollLeft, 25);
  assert.equal(c.scrollLeft, 25);
  assert.equal(a.scrollLeft, 25); // el origen no se toca a sí mismo
});

test('sincronizarScrollHorizontal() — la bandera "sincronizando" corta el loop cuando "otro" también dispara su propio "scroll" (simulación de navegador real)', () => {
  const { window, document } = montar('<div id="a"></div><div id="b"></div>');
  const a = document.getElementById('a');
  const b = document.getElementById('b');
  simularScrollNativo(a, window);
  simularScrollNativo(b, window);
  window.sincronizarScrollHorizontal([a, b]);

  // Sin la bandera, asignar a.scrollLeft dispararía scroll en a -> setea
  // b.scrollLeft -> (por simularScrollNativo) dispara scroll en b -> como
  // b SÍ tiene su propio listener de sincronizarScrollHorizontal, sin la
  // bandera esto volvería a setear a.scrollLeft -> nuevo scroll en a ->
  // loop infinito (stack overflow). Con la bandera, el segundo tramo
  // (dentro de b) debe salir de inmediato porque "sincronizando" sigue en
  // true mientras el handler de a no termina.
  assert.doesNotThrow(() => { a.scrollLeft = 40; });
  assert.equal(a.scrollLeft, 40);
  assert.equal(b.scrollLeft, 40);
});

// ---------------------------------------------------------------------
// _prepararBarraScrollTabla(wrap, opciones)
// ---------------------------------------------------------------------

test('_prepararBarraScrollTabla() devuelve null si wrap es null/undefined', () => {
  const { window } = montar();
  assert.equal(window._prepararBarraScrollTabla(null, {}), null);
  assert.equal(window._prepararBarraScrollTabla(undefined, {}), null);
});

test('_prepararBarraScrollTabla() devuelve null si wrap no tiene ninguna <table> adentro', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document, { conTabla: false });
  assert.equal(window._prepararBarraScrollTabla(wrap, {}), null);
});

test('_prepararBarraScrollTabla() agrega las clases tabla-scroll-wrap/scroll-morado y deja overflowX:auto por defecto', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  window._prepararBarraScrollTabla(wrap, {});
  assert.equal(wrap.classList.contains('tabla-scroll-wrap'), true);
  assert.equal(wrap.classList.contains('scroll-morado'), true);
  assert.equal(wrap.style.overflowX, 'auto');
});

test('_prepararBarraScrollTabla() no pisa un overflowX que el wrap ya traía definido', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  wrap.style.overflowX = 'scroll';
  window._prepararBarraScrollTabla(wrap, {});
  assert.equal(wrap.style.overflowX, 'scroll');
});

test('_prepararBarraScrollTabla() deja maxHeight en 480px por defecto (opciones.alto sin especificar)', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  window._prepararBarraScrollTabla(wrap, {});
  assert.equal(wrap.style.maxHeight, '480px');
});

test('_prepararBarraScrollTabla() con opciones.alto=null deja maxHeight:"none" (sin límite de alto)', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  window._prepararBarraScrollTabla(wrap, { alto: null });
  assert.equal(wrap.style.maxHeight, 'none');
});

test('_prepararBarraScrollTabla() con opciones.alto=300 deja maxHeight:"300px"', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  window._prepararBarraScrollTabla(wrap, { alto: 300 });
  assert.equal(wrap.style.maxHeight, '300px');
});

test('_prepararBarraScrollTabla() crea una barra superior nueva justo antes del wrap, con aria-hidden y el inner adentro', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  const r = window._prepararBarraScrollTabla(wrap, {});
  assert.equal(wrap.previousElementSibling, r.barraSup);
  assert.equal(r.barraSup.classList.contains('tabla-scroll-top'), true);
  assert.equal(r.barraSup.classList.contains('scroll-morado'), true);
  assert.equal(r.barraSup.getAttribute('aria-hidden'), 'true');
  assert.equal(r.inner.classList.contains('tabla-scroll-top-inner'), true);
  assert.equal(r.inner.parentNode, r.barraSup);
});

test('_prepararBarraScrollTabla() reutiliza el previousElementSibling si ya es .tabla-scroll-top (no crea una segunda barra)', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  const barraExistente = document.createElement('div');
  barraExistente.className = 'tabla-scroll-top scroll-morado';
  wrap.parentNode.insertBefore(barraExistente, wrap);

  const r = window._prepararBarraScrollTabla(wrap, {});
  assert.equal(r.barraSup, barraExistente);
  assert.equal(wrap.parentNode.querySelectorAll('.tabla-scroll-top').length, 1);
});

test('_prepararBarraScrollTabla() usa opciones.barraSuperior en vez de crear o reutilizar el previousElementSibling', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  const miBarra = document.createElement('div');
  document.body.appendChild(miBarra);

  const r = window._prepararBarraScrollTabla(wrap, { barraSuperior: miBarra });
  assert.equal(r.barraSup, miBarra);
  // No se tocó ni se creó nada como previousElementSibling del wrap.
  assert.notEqual(wrap.previousElementSibling, miBarra);
});

test('_prepararBarraScrollTabla() reutiliza el .tabla-scroll-top-inner existente en vez de crear uno nuevo', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  const miBarra = document.createElement('div');
  const innerExistente = document.createElement('div');
  innerExistente.className = 'tabla-scroll-top-inner';
  miBarra.appendChild(innerExistente);
  document.body.appendChild(miBarra);

  const r = window._prepararBarraScrollTabla(wrap, { barraSuperior: miBarra });
  assert.equal(r.inner, innerExistente);
  assert.equal(miBarra.querySelectorAll('.tabla-scroll-top-inner').length, 1);
});

// ---------------------------------------------------------------------
// activarBarraScrollTabla(wrap, opciones) / activarBarraScrollTablas(wraps, opciones)
// ---------------------------------------------------------------------

test('activarBarraScrollTabla() fija el ancho inicial de la barra superior de forma sincrónica, a partir de tabla.scrollWidth', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  const tabla = wrap.querySelector('table');
  Object.defineProperty(tabla, 'scrollWidth', { value: 640, configurable: true });

  window.activarBarraScrollTabla(wrap, {});
  const barraSup = wrap.previousElementSibling;
  const inner = barraSup.querySelector('.tabla-scroll-top-inner');
  assert.equal(inner.style.width, '640px');
});

test('activarBarraScrollTabla() recalcula el ancho en el siguiente frame (requestAnimationFrame) si scrollWidth cambió', async () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  const tabla = wrap.querySelector('table');
  Object.defineProperty(tabla, 'scrollWidth', { value: 300, configurable: true });

  window.activarBarraScrollTabla(wrap, {});
  const inner = wrap.previousElementSibling.querySelector('.tabla-scroll-top-inner');
  assert.equal(inner.style.width, '300px'); // valor síncrono inicial

  // Cambia el ancho "real" ANTES de que corra el rAF (ej. las fuentes
  // terminaron de cargar recién ahí, con más texto que el estimado antes).
  Object.defineProperty(tabla, 'scrollWidth', { value: 900, configurable: true });
  await new Promise(resolve => window.setTimeout(resolve, 30));
  assert.equal(inner.style.width, '900px');
});

test('activarBarraScrollTabla() — sin ResizeObserver (no implementado en jsdom): usa el fallback de window.addEventListener("resize", ...) para recalcular', () => {
  const { window, document } = montar();
  assert.equal(window.ResizeObserver, undefined); // confirma la premisa del test
  const wrap = crearWrapConTabla(document);
  const tabla = wrap.querySelector('table');
  Object.defineProperty(tabla, 'scrollWidth', { value: 200, configurable: true });

  window.activarBarraScrollTabla(wrap, {});
  const inner = wrap.previousElementSibling.querySelector('.tabla-scroll-top-inner');

  Object.defineProperty(tabla, 'scrollWidth', { value: 500, configurable: true });
  window.dispatchEvent(new window.Event('resize'));
  assert.equal(inner.style.width, '500px');
});

test('activarBarraScrollTabla() sincroniza el scroll entre la barra superior y el wrap', () => {
  const { window, document } = montar();
  const wrap = crearWrapConTabla(document);
  window.activarBarraScrollTabla(wrap, {});
  const barraSup = wrap.previousElementSibling;

  wrap.scrollLeft = 55;
  wrap.dispatchEvent(new window.Event('scroll'));
  assert.equal(barraSup.scrollLeft, 55);

  barraSup.scrollLeft = 80;
  barraSup.dispatchEvent(new window.Event('scroll'));
  assert.equal(wrap.scrollLeft, 80);
});

test('activarBarraScrollTablas() con varias tablas: cada una recibe su propio ancho, sin mezclarse entre sí (lectura de todas antes de escribir ninguna)', () => {
  const { window, document } = montar();
  const wrap1 = crearWrapConTabla(document);
  const wrap2 = crearWrapConTabla(document);
  const tabla1 = wrap1.querySelector('table');
  const tabla2 = wrap2.querySelector('table');
  Object.defineProperty(tabla1, 'scrollWidth', { value: 111, configurable: true });
  Object.defineProperty(tabla2, 'scrollWidth', { value: 222, configurable: true });

  window.activarBarraScrollTablas([wrap1, wrap2], {});
  const inner1 = wrap1.previousElementSibling.querySelector('.tabla-scroll-top-inner');
  const inner2 = wrap2.previousElementSibling.querySelector('.tabla-scroll-top-inner');
  assert.equal(inner1.style.width, '111px');
  assert.equal(inner2.style.width, '222px');
});

test('activarBarraScrollTablas() con una lista vacía o sin ninguna tabla válida no rompe y no crea ninguna barra', () => {
  const { window, document } = montar();
  const wrapSinTabla = crearWrapConTabla(document, { conTabla: false });
  assert.doesNotThrow(() => window.activarBarraScrollTablas([], {}));
  assert.doesNotThrow(() => window.activarBarraScrollTablas([wrapSinTabla], {}));
  assert.equal(wrapSinTabla.previousElementSibling, null);
});

test('activarBarraScrollTabla(wrap) (una tabla) se comporta igual que activarBarraScrollTablas([wrap]) (lote de 1)', () => {
  const { window, document } = montar();
  const wrapA = crearWrapConTabla(document);
  const wrapB = crearWrapConTabla(document);
  Object.defineProperty(wrapA.querySelector('table'), 'scrollWidth', { value: 77, configurable: true });
  Object.defineProperty(wrapB.querySelector('table'), 'scrollWidth', { value: 77, configurable: true });

  window.activarBarraScrollTabla(wrapA, { alto: 200 });
  window.activarBarraScrollTablas([wrapB], { alto: 200 });

  const innerA = wrapA.previousElementSibling.querySelector('.tabla-scroll-top-inner');
  const innerB = wrapB.previousElementSibling.querySelector('.tabla-scroll-top-inner');
  assert.equal(innerA.style.width, innerB.style.width);
  assert.equal(wrapA.style.maxHeight, wrapB.style.maxHeight);
});
