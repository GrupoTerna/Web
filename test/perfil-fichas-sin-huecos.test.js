'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF386): las fichas de carta del perfil (Mazo actual, Colección, Cartas de torre) ya no reservan filas vacías:
// si falta la rareza, el tipo, el elixir, el oro o la moneda de héroe, esa fila no se pinta y las demás suben, en el mismo orden.
// Se extraen los helpers REALES de perfil.html y se ejecutan con jsdom. LÍMITE: no mide el aspecto en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

function cargar(){
  const tomar = re => { const m = html.match(re); assert.ok(m, 'no se encontró ' + re); return m[0]; };
  const codigo = [
    tomar(/function _filaFicha\(reservar, mostrar, htmlVisible, htmlPlaceholder\)\{[\s\S]*?\n\}\n/),
    tomar(/function _filaCostoMejora\(reservar, tieneValor, htmlValor, htmlSinDato\)\{[\s\S]*?\n\}\n/),
    tomar(/function _filaHeroCoin\(reservar, mostrar\)\{[\s\S]*?\n\}\n/),
  ].join('\n');
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  dom.window.eval(`const COLECCION_ESPACIO_COSTO_MEJORA = false; function _heroCoinHtml(){ return '<div class="hero-coin">H</div>'; }
    ${codigo}
    window._filaFicha = _filaFicha; window._filaCostoMejora = _filaCostoMejora; window._filaHeroCoin = _filaHeroCoin;`);
  return dom.window;
}

test('_filaFicha: sin dato no pinta nada, aunque otras cartas de la sección sí lo tengan', () => {
  const w = cargar();
  assert.equal(w._filaFicha(true, false, '<b>x</b>', '&nbsp;'), '');
  assert.equal(w._filaFicha(true, true, '<b>x</b>', '&nbsp;'), '<div class="cc-meta"><b>x</b></div>');
  assert.doesNotMatch(w._filaFicha(true, false, 'x', 'y'), /visibility/);
});

test('_filaCostoMejora: sin oro no se reserva el alto; con oro se pinta', () => {
  const w = cargar();
  assert.equal(w._filaCostoMejora(true, false, '<div>200</div>', '<div>—</div>'), '');
  assert.equal(w._filaCostoMejora(true, true, '<div>200</div>', '<div>—</div>'), '<div>200</div>');
});

test('_filaHeroCoin: sin moneda no se reserva fila', () => {
  const w = cargar();
  assert.equal(w._filaHeroCoin(true, false), '');
  assert.match(w._filaHeroCoin(true, true), /hero-coin/);
});

test('ningún helper de ficha deja filas con visibility:hidden en perfil.html', () => {
  for (const nombre of ['_filaFicha', '_filaCostoMejora', '_filaHeroCoin']) {
    const m = html.match(new RegExp('function ' + nombre + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n'));
    assert.ok(m, nombre);
    assert.doesNotMatch(m[0], /visibility:hidden/, nombre);
  }
});
