'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (24-oct-2026, PF227, pedido de la usuaria): con un sorteo ya cargado también se puede agregar premios a mano.
// Antes la fila «Cantidad de premios» se ocultaba y el límite salía solo de los premios del sorteo. Ahora la fila siempre se ve,
// parte de la cantidad de premios del sorteo (mínimo) y se puede subir para sumar premios extra.
// Se extraen de sorteo.html las funciones reales premiosDelSorteoCargado(), prizeLimit() y actualizarFilaPremios().

const html = fs.readFileSync(path.join(__dirname, '..', 'sorteo.html'), 'utf8');
const ini = html.indexOf('  function premiosDelSorteoCargado(){');
const fin = html.indexOf('  function renderWinners(){');
assert.ok(ini > 0 && fin > ini, 'no se encontraron las funciones de premios en sorteo.html');
const codigo = html.slice(ini, fin);

function armar(sorteoActualId, premiosSorteo, valor) {
  const fila = { hidden: true };
  const hint = { textContent: '' };
  const prizeCountInput = { value: String(valor), min: '0' };
  const document = { getElementById: (id) => (id === 'prizeCountRow' ? fila : id === 'prizeCountHint' ? hint : null) };
  const f = new Function('sorteoActualId', 'premiosSorteo', 'prizeCountInput', 'document',
    codigo + '; return { prizeLimit, actualizarFilaPremios, premiosDelSorteoCargado };');
  return Object.assign(f(sorteoActualId, premiosSorteo, prizeCountInput, document), { fila, hint, prizeCountInput });
}

test('PF227: sin sorteo cargado, la cantidad manual manda y 0 = sin límite', () => {
  assert.equal(armar(null, [], 0).prizeLimit(), 0);
  assert.equal(armar(null, [], 4).prizeLimit(), 4);
});

test('PF227: con un sorteo cargado el límite parte de sus premios', () => {
  assert.equal(armar('S1', ['A', 'B', 'C'], 3).prizeLimit(), 3);
  assert.equal(armar('S1', ['A', 'B', 'C'], 0).prizeLimit(), 3, 'sin número escrito, mandan los premios del sorteo');
});

test('PF227: con un sorteo cargado se pueden SUMAR premios extra, pero no quitar los del sorteo', () => {
  assert.equal(armar('S1', ['A', 'B', 'C'], 5).prizeLimit(), 5);
  assert.equal(armar('S1', ['A', 'B', 'C'], 1).prizeLimit(), 3);
});

test('PF227: los premios vacíos al final del sorteo no cuentan', () => {
  assert.equal(armar('S1', ['A', 'B', '', ' '], 0).prizeLimit(), 2);
});

test('PF227: la fila «Cantidad de premios» ya no se oculta con un sorteo cargado y avisa el mínimo', () => {
  const t = armar('S1', ['A', 'B', 'C'], 3);
  t.actualizarFilaPremios();
  assert.equal(t.fila.hidden, false);
  assert.equal(t.prizeCountInput.min, '3');
  assert.match(t.hint.textContent, /3 premio/);
  const m = armar(null, [], 0);
  m.actualizarFilaPremios();
  assert.equal(m.fila.hidden, false);
  assert.equal(m.prizeCountInput.min, '0');
  assert.match(m.hint.textContent, /0 = sin límite/);
});
