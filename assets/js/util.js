'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./load-browser-script');

const {
  esc, fmtNum, ordenClanIndex, ordenarClanes,
  urlValida, normalizarTag, enlaceJugador, fmtTiempoRelativo
} = loadBrowserScript('assets/js/util.js');

test('esc() escapa los 5 caracteres especiales de HTML', () => {
  assert.equal(esc(`<script>&"'</script>`), '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;');
});

test('esc() no revienta con null/undefined (los trata como texto vacío)', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('esc() acepta números y los deja intactos como texto', () => {
  assert.equal(esc(1234), '1234');
});

test('fmtNum() separa miles con coma (14000 -> "14,000")', () => {
  assert.equal(fmtNum(14000), '14,000');
  assert.equal(fmtNum(999), '999');
});

test('fmtNum() con un valor no numérico devuelve "0" en vez de "NaN" o romper', () => {
  assert.equal(fmtNum(NaN), '0');
  assert.equal(fmtNum(Infinity), '0');
  assert.equal(fmtNum('no es numero'), '0');
});

test('ordenClanIndex() respeta el orden fijo: Principal, 2, 3, Mini', () => {
  assert.equal(ordenClanIndex('Familia Terna'), 0);
  assert.equal(ordenClanIndex('Terna 2'), 1);
  assert.equal(ordenClanIndex('Terna 3'), 2);
  assert.equal(ordenClanIndex('Mini Ternas'), 3);
});

test('ordenarClanes() reordena aunque el backend los mande en otro orden (ej. alfabético)', () => {
  const clanes = [{ nombre: 'Terna 3' }, { nombre: 'Mini Ternas' }, { nombre: 'Terna 2' }, { nombre: 'Terna' }];
  const ordenado = ordenarClanes(clanes).map(c => c.nombre);
  assert.deepEqual(ordenado, ['Terna', 'Terna 2', 'Terna 3', 'Mini Ternas']);
});

test('urlValida() rechaza vacío, links sin http(s) y el placeholder ".../LINK"', () => {
  assert.equal(urlValida(''), false);
  assert.equal(urlValida('royaleapi.com/clan/ABC'), false);
  assert.equal(urlValida('https://royaleapi.com/clan/LINK'), false);
  assert.equal(urlValida('https://royaleapi.com/clan/LINK/'), false);
});

test('urlValida() acepta un link http(s) real sin el placeholder', () => {
  assert.equal(urlValida('https://royaleapi.com/clan/ABC123'), true);
});

test('normalizarTag() pone mayúsculas y un solo "#" al inicio, sin espacios', () => {
  assert.equal(normalizarTag('  #r09228v '), '#R09228V');
  assert.equal(normalizarTag('r09228v'), '#R09228V');
  assert.equal(normalizarTag(''), '');
});

test('enlaceJugador() sin tag devuelve el nombre escapado, sin <a> (mejor texto plano que link roto)', () => {
  assert.equal(enlaceJugador('<b>Nombre</b>', ''), '&lt;b&gt;Nombre&lt;/b&gt;');
});

test('enlaceJugador() con tag arma el link a perfil.html, target=_blank por defecto', () => {
  const html = enlaceJugador('Jugador', '#R09228V');
  assert.equal(html, '<a class="jugador-link" href="perfil.html?tag=%23R09228V" target="_blank" rel="noopener">Jugador</a>');
});

test('enlaceJugador() con opts.mismaVentana no agrega target', () => {
  const html = enlaceJugador('Jugador', '#R09228V', { mismaVentana: true });
  assert.ok(!html.includes('target='));
});

test('fmtTiempoRelativo(null) avisa que no hay datos guardados', () => {
  assert.equal(fmtTiempoRelativo(null), 'sin datos guardados');
});

test('fmtTiempoRelativo() responde "ahora mismo" para una fecha recién creada', () => {
  assert.equal(fmtTiempoRelativo(new Date()), 'actualizado ahora mismo');
});
