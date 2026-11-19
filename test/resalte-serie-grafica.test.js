'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// activarResalteSerieGrafica() (timeline-svg.js, pedido de la usuaria, 18-nov-2026): al acercarse a un punto se resalta TODA su serie.
// jsdom no calcula geometría, así que se simula: el svg mide 200×100 px en pantalla con viewBox 0 0 200 100 (escala 1, sin desplazamiento).
//
// Series de la prueba (cada elemento lleva data-serie-clave, como los generan directorio.html, perfil.html y noticias.html):
//   s0: tramo + puntos (20,20), (100,20), (180,20)
//   s1: tramo + puntos (20,80), (100,80), (180,80)
//   s2: un punto en (100,20), exactamente encima del de s0 (para el caso de puntos sobrepuestos)
const HTML_BODY = `
  <svg id="miSvg" viewBox="0 0 200 100">
    <path class="ing-serie-line" data-serie-clave="s0" d="M 20 20 L 100 20"></path>
    <circle class="ing-serie-pt" data-serie-clave="s0" cx="20" cy="20" r="5" data-kb="1" tabindex="0" role="img" aria-label="s0 a"><title>s0 a</title></circle>
    <circle class="ing-serie-pt" data-serie-clave="s0" cx="100" cy="20" r="5"></circle>
    <circle class="ing-serie-pt" data-serie-clave="s0" cx="180" cy="20" r="5"></circle>
    <path class="ing-serie-line" data-serie-clave="s1" d="M 20 80 L 100 80"></path>
    <circle class="ing-serie-pt" data-serie-clave="s1" cx="20" cy="80" r="5"></circle>
    <circle class="ing-serie-pt" data-serie-clave="s1" cx="100" cy="80" r="5"></circle>
    <circle class="ing-serie-pt" data-serie-clave="s1" cx="180" cy="80" r="5"></circle>
    <circle class="ing-serie-pt" data-serie-clave="s2" cx="100" cy="20" r="5"></circle>
  </svg>`;

function montar(html){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], html || HTML_BODY);
  const svg = window.document.getElementById('miSvg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 });
  const evento = (tipo, x, y, pointerType) => {
    const ev = new window.MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y });
    Object.defineProperty(ev, 'pointerType', { value: pointerType || 'mouse' });
    svg.dispatchEvent(ev);
  };
  return { window, svg, evento, activar: window.activarResalteSerieGrafica };
}

const copiaDe = svg => svg.querySelector('g.serie-resalte');
const activos = svg => Array.from(svg.querySelectorAll('.serie-activa'));

test('acercar el cursor a un punto resalta toda su serie: la atenúa en las demás y dibuja una copia encima', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 22, 82); // cerca del primer punto de s1
  assert.ok(svg.classList.contains('serie-resaltando'));
  const marcados = activos(svg);
  assert.equal(marcados.length, 4, 'tramo + 3 puntos de s1');
  assert.ok(marcados.every(el => el.getAttribute('data-serie-clave') === 's1'));
  const copia = copiaDe(svg);
  assert.ok(copia, 'hay copia de la serie');
  assert.equal(svg.lastElementChild, copia, 'la copia va al final: queda encima de todo');
  assert.equal(copia.getAttribute('pointer-events'), 'none', 'la copia no recibe el cursor, así el tooltip de los puntos sigue igual');
  assert.equal(copia.querySelectorAll('circle').length, 3);
  assert.equal(copia.querySelectorAll('path').length, 1);
});

test('la copia es solo dibujo: sin clave de serie, foco, etiquetas ni <title>, y sus puntos ya no llevan la clase de punto interactivo', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 20, 20); // s0 (su primer punto tiene tabindex, role, aria-label y title)
  const copia = copiaDe(svg);
  assert.equal(copia.querySelectorAll('[data-serie-clave],[tabindex],[role],[aria-label],[data-kb],title').length, 0);
  assert.equal(copia.querySelectorAll('.ing-serie-pt').length, 0);
  assert.equal(copia.querySelectorAll('.serie-resalte-pt').length, 3);
});

test('no cambia el orden ni la cantidad de elementos originales (la copia solo se agrega al final)', () => {
  const { svg, evento, activar } = montar();
  const antes = Array.from(svg.children);
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 20, 20);
  assert.deepEqual(Array.from(svg.children).slice(0, antes.length), antes);
  assert.equal(svg.children.length, antes.length + 1);
});

test('con puntos exactamente sobrepuestos gana el último del DOM (el mismo al que apunta el tooltip)', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 100, 20); // s0 y s2 encimados: s2 está después en el DOM
  assert.ok(activos(svg).every(el => el.getAttribute('data-serie-clave') === 's2'));
});

test('lejos de todo punto no resalta nada, y al alejarse suelta la serie', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 60, 50); // en medio, a más de 18 px de cualquier punto
  assert.ok(!svg.classList.contains('serie-resaltando'));
  assert.equal(copiaDe(svg), null);
  evento('pointermove', 20, 80);
  assert.ok(svg.classList.contains('serie-resaltando'));
  evento('pointermove', 60, 50); // a ~44 px del punto de s1 (más de 1,8 × 18): suelta
  assert.ok(!svg.classList.contains('serie-resaltando'));
  assert.equal(activos(svg).length, 0);
  assert.equal(copiaDe(svg), null);
});

test('la serie resaltada se mantiene al recorrer su línea entre dos puntos (sin parpadear)', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 22, 80);
  evento('pointermove', 40, 80); // a 20 px de su primer punto: fuera de 18 pero dentro de 1,8 × 18
  assert.ok(svg.classList.contains('serie-resaltando'));
  assert.ok(activos(svg).every(el => el.getAttribute('data-serie-clave') === 's1'));
});

test('al pasar de una serie a otra se cambia el resalte y queda una sola copia', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 20, 80);
  evento('pointermove', 180, 20);
  assert.equal(svg.querySelectorAll('g.serie-resalte').length, 1);
  assert.ok(activos(svg).every(el => el.getAttribute('data-serie-clave') === 's0'));
});

test('pointerleave suelta la serie', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 20, 80);
  evento('pointerleave', 300, 300);
  assert.ok(!svg.classList.contains('serie-resaltando'));
  assert.equal(copiaDe(svg), null);
});

test('en pantallas táctiles, tocar cerca de un punto resalta su serie y tocar un espacio vacío la suelta; mover el dedo no la cambia', () => {
  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  evento('pointermove', 20, 80, 'touch'); // el movimiento táctil se ignora
  assert.ok(!svg.classList.contains('serie-resaltando'));
  evento('pointerdown', 24, 84, 'touch');
  assert.ok(svg.classList.contains('serie-resaltando'));
  evento('pointerdown', 60, 50, 'touch');
  assert.ok(!svg.classList.contains('serie-resaltando'));
});

test('con el teclado, el punto enfocado resalta su serie y al salir del foco se suelta', () => {
  const { window, svg, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  const punto = svg.querySelector('circle[data-serie-clave="s1"]');
  punto.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
  assert.ok(svg.classList.contains('serie-resaltando'));
  assert.ok(activos(svg).every(el => el.getAttribute('data-serie-clave') === 's1'));
  punto.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
  assert.ok(!svg.classList.contains('serie-resaltando'));
});

test('con una sola serie no hace nada, y llamarlo dos veces sobre el mismo svg no duplica los oyentes', () => {
  const una = montar(`<svg id="miSvg" viewBox="0 0 200 100"><circle data-serie-clave="s0" cx="20" cy="20" r="5"></circle></svg>`);
  una.activar(una.svg);
  assert.equal(una.svg.dataset.resalteActivo, undefined);

  const { svg, evento, activar } = montar();
  activar(svg, { selector: '.ing-serie-pt' });
  activar(svg, { selector: '.ing-serie-pt' });
  assert.equal(svg.dataset.resalteActivo, '1');
  evento('pointermove', 20, 80);
  assert.equal(svg.querySelectorAll('g.serie-resalte').length, 1);
});

test('el svg con viewBox desplazado (como el del «Cara a cara») también se mide bien', () => {
  const { svg, evento, activar } = montar(`
    <svg id="miSvg" viewBox="-16 0 216 100">
      <circle data-serie-clave="a" cx="20" cy="20" r="3"></circle>
      <circle data-serie-clave="b" cx="180" cy="80" r="3"></circle>
    </svg>`);
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 216, height: 100, right: 216, bottom: 100 }); // escala 1: el punto (20,20) cae en pantalla en (36,20)
  activar(svg);
  evento('pointermove', 36, 20);
  assert.ok(activos(svg).every(el => el.getAttribute('data-serie-clave') === 'a'));
});

test('las gráficas de directorio, perfil y noticias marcan sus series y activan el resalte', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const dir = leer('directorio.html'), per = leer('perfil.html'), not = leer('noticias.html');
  assert.ok(/data-serie-clave="s\$\{si\}"/.test(dir), 'directorio: ingresos');
  assert.ok(dir.includes('data-serie-clave="a"') && dir.includes('data-serie-clave="b"') && dir.includes('data-serie-clave="${clave}"'), 'directorio: Cara a cara');
  assert.equal((dir.match(/activarResalteSerieGrafica\(svg/g) || []).length, 2, 'directorio: ingresos y Cara a cara');
  assert.ok(per.includes('data-serie-clave="dia"') && per.includes('data-serie-clave="acum"'), 'perfil: día y acumulado');
  assert.ok(per.includes('activarResalteSerieGrafica(svg'), 'perfil');
  assert.ok(/data-serie-clave="s\$\{si\}"/.test(not) && not.includes('activarResalteSerieGrafica('), 'noticias');
});
