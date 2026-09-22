'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./load-browser-script');

const { _esErrorDeRed, _mensajeErrorRed } = loadBrowserScript('assets/js/core/api.js');

test('_esErrorDeRed() reconoce los 3 mensajes de "sin conexión" (Chrome/Edge, Firefox, Safari)', () => {
  assert.equal(_esErrorDeRed(new TypeError('Failed to fetch')), true);
  assert.equal(_esErrorDeRed(new TypeError('NetworkError when attempting to fetch resource.')), true);
  assert.equal(_esErrorDeRed(new TypeError('Load failed')), true);
});

test('_esErrorDeRed() no confunde un error de la app (ej. sesión vencida) con uno de red', () => {
  assert.equal(_esErrorDeRed(new Error('Sesión vencida')), false);
  assert.equal(_esErrorDeRed(new TypeError('otro TypeError sin relación')), false);
});

test('_esErrorDeRed() no revienta si le pasan null/undefined', () => {
  assert.equal(_esErrorDeRed(null), false);
  assert.equal(_esErrorDeRed(undefined), false);
});

test('_mensajeErrorRed() devuelve un texto fijo y amigable para el visitante', () => {
  assert.equal(_mensajeErrorRed(), 'No pudimos conectar con el servidor. Intenta de nuevo en un momento.');
});
