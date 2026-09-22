'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./load-browser-script');

const { primeraLetraFiltro } = loadBrowserScript('assets/js/ui/filters.js');

test('primeraLetraFiltro() devuelve la primera letra en mayúscula', () => {
  assert.equal(primeraLetraFiltro('ana'), 'A');
  assert.equal(primeraLetraFiltro('Zorro'), 'Z');
});

test('primeraLetraFiltro() reconoce la Ñ como letra propia (no cae en "#")', () => {
  assert.equal(primeraLetraFiltro('Ñoño'), 'Ñ');
});

test('primeraLetraFiltro() agrupa números/símbolos/vacío bajo "#"', () => {
  assert.equal(primeraLetraFiltro('123Jugador'), '#');
  assert.equal(primeraLetraFiltro('_xX_Pro_Xx_'), '#');
  assert.equal(primeraLetraFiltro(''), '#');
  assert.equal(primeraLetraFiltro(undefined), '#');
});

test('primeraLetraFiltro() ignora espacios en blanco al inicio', () => {
  assert.equal(primeraLetraFiltro('   Beto'), 'B');
});
