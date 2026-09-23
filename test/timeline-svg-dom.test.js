'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// Esta segunda mitad de timeline-svg.js (obtenerTooltipGrafica() y
// activarTecladoPuntosGrafica()) SÍ necesita un DOM real: crea/reusa un
// <div> de tooltip en document.body, recorre <circle> de un SVG con
// querySelectorAll, y escucha eventos de foco/teclado — por eso usa
// loadBrowserScriptsWithDom() (jsdom) en vez de loadBrowserScripts() (vm
// sin DOM), que es lo que ya usa timeline-svg.test.js para la primera
// mitad (líneas 1-137, funciones puras) de este mismo archivo.
//
// Estructura de prueba: un SVG con 2 series ("Ana", "Beto") de 2 puntos
// cada una, en el orden en que aparecen en el DOM real (Ana#1, Ana#2,
// Beto#1, Beto#2) — mismo criterio que usa activarTecladoPuntosGrafica()
// para agrupar series por orden de aparición, no por nombre.
const HTML_BODY = `
  <div class="card">
    <div class="chart-title">📈 Progreso</div>
    <svg id="miSvg">
      <circle cx="10" data-serie="Ana"><title>Ana: 10</title></circle>
      <circle cx="20" data-serie="Ana"><title>Ana: 20</title></circle>
      <circle cx="10" data-serie="Beto"><title>Beto: 15</title></circle>
      <circle cx="20" data-serie="Beto"><title>Beto: 25</title></circle>
    </svg>
  </div>`;

function montar(){
  const window = loadBrowserScriptsWithDom(
    ['assets/js/util.js', 'assets/js/features/timeline-svg.js'],
    HTML_BODY
  );
  const { document, activarTecladoPuntosGrafica, obtenerTooltipGrafica } = window;
  const svg = document.getElementById('miSvg');
  const puntos = Array.from(svg.querySelectorAll('circle'));
  return { window, document, activarTecladoPuntosGrafica, obtenerTooltipGrafica, svg, puntos };
}

test('obtenerTooltipGrafica() crea #chartTooltip en document.body si no existe', () => {
  const { document, obtenerTooltipGrafica } = montar();
  assert.equal(document.getElementById('chartTooltip'), null);
  const tip = obtenerTooltipGrafica();
  assert.equal(tip.id, 'chartTooltip');
  assert.equal(tip.className, 'chart-tooltip');
  assert.equal(tip.parentNode, document.body);
});

test('obtenerTooltipGrafica() reutiliza el mismo tooltip en vez de crear uno nuevo cada vez', () => {
  const { obtenerTooltipGrafica } = montar();
  const tip1 = obtenerTooltipGrafica();
  const tip2 = obtenerTooltipGrafica();
  assert.equal(tip1, tip2);
});

test('activarTecladoPuntosGrafica() marca el svg como activo (dataset.tecladoActivo) y no hace nada si se llama dos veces', () => {
  const { svg, puntos, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  assert.equal(svg.dataset.tecladoActivo, '1');
  const tabindexAntes = puntos.map(p => p.getAttribute('tabindex'));
  activarTecladoPuntosGrafica(svg); // 2da llamada: debe salir de inmediato (guard)
  const tabindexDespues = puntos.map(p => p.getAttribute('tabindex'));
  assert.deepEqual(tabindexAntes, tabindexDespues);
});

test('activarTecladoPuntosGrafica() con un svg sin puntos no rompe y no marca tecladoActivo', () => {
  const { window, activarTecladoPuntosGrafica } = montar();
  const svgVacio = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  activarTecladoPuntosGrafica(svgVacio);
  assert.equal(svgVacio.dataset.tecladoActivo, undefined);
});

test('activarTecladoPuntosGrafica() deja tabindex=0 SOLO en el primer punto de la primera serie, -1 en el resto', () => {
  const { svg, puntos, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  assert.deepEqual(puntos.map(p => p.getAttribute('tabindex')), ['0', '-1', '-1', '-1']);
});

test('activarTecladoPuntosGrafica() pone aria-label a cada punto a partir de su <title>', () => {
  const { puntos, activarTecladoPuntosGrafica, svg } = montar();
  activarTecladoPuntosGrafica(svg);
  assert.equal(puntos[0].getAttribute('aria-label'), 'Ana: 10');
  assert.equal(puntos[2].getAttribute('aria-label'), 'Beto: 15');
});

test('activarTecladoPuntosGrafica() arma el aria-label del svg con el título de la tarjeta (emoji removido) y menciona cambiar de serie cuando hay más de una', () => {
  const { svg, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  assert.equal(svg.getAttribute('role'), 'group');
  const label = svg.getAttribute('aria-label');
  assert.match(label, /^Progreso\. /); // "📈 " removido
  assert.match(label, /arriba y abajo para cambiar de serie/);
});

test('ArrowRight/ArrowLeft mueven el foco dentro de la misma serie, sin cruzar a la otra', () => {
  const { window, document, svg, puntos, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[0].focus();
  puntos[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, puntos[1]);
  puntos[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  // Ana solo tiene 2 puntos: un 3er ArrowRight no debe mover el foco (destino undefined).
  assert.equal(document.activeElement, puntos[1]);
  puntos[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, puntos[0]);
});

test('Home/End saltan al primer/último punto de la serie actual', () => {
  const { window, document, svg, puntos, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[0].focus();
  puntos[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, puntos[1]);
  puntos[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, puntos[0]);
});

test('ArrowDown/ArrowUp cambian de serie, al punto con el cx más cercano en la nueva serie', () => {
  const { window, document, svg, puntos, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[1].focus(); // Ana, cx=20
  puntos[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, puntos[3]); // Beto cx=20 (más cercano a 20 que Beto cx=10)
  puntos[3].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, puntos[1]); // vuelve a Ana cx=20
});

test('mover el foco entre puntos actualiza tabindex: -1 en el que se deja, 0 en el nuevo activo', () => {
  const { window, svg, puntos, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[0].focus();
  puntos[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  assert.equal(puntos[0].getAttribute('tabindex'), '-1');
  assert.equal(puntos[1].getAttribute('tabindex'), '0');
});

test('el foco (sin clic previo) muestra el tooltip flotante con el contenido del punto', () => {
  const { obtenerTooltipGrafica, puntos, svg, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  const tip = obtenerTooltipGrafica();
  assert.equal(tip.style.display, 'none');
  puntos[0].focus();
  assert.equal(tip.style.display, 'block');
  assert.match(tip.innerHTML, /Ana: 10/);
});

test('el blur oculta el tooltip', () => {
  const { obtenerTooltipGrafica, puntos, svg, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[0].focus();
  assert.equal(obtenerTooltipGrafica().style.display, 'block');
  puntos[0].blur();
  assert.equal(obtenerTooltipGrafica().style.display, 'none');
});

test('Escape oculta el tooltip sin mover el foco', () => {
  const { window, document, obtenerTooltipGrafica, puntos, svg, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[0].focus();
  assert.equal(obtenerTooltipGrafica().style.display, 'block');
  puntos[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(obtenerTooltipGrafica().style.display, 'none');
  assert.equal(document.activeElement, puntos[0]); // Escape no cambia el punto activo
});

test('una tecla sin manejar (ej. "a") no mueve el foco ni rompe', () => {
  const { window, document, puntos, svg, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg);
  puntos[0].focus();
  assert.doesNotThrow(() => {
    puntos[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
  });
  assert.equal(document.activeElement, puntos[0]);
});

test('opts.titulo tiene prioridad sobre el título de la tarjeta para el aria-label del svg', () => {
  const { svg, activarTecladoPuntosGrafica } = montar();
  activarTecladoPuntosGrafica(svg, { titulo: 'Gráfica personalizada' });
  assert.match(svg.getAttribute('aria-label'), /^Gráfica personalizada\. /);
});
