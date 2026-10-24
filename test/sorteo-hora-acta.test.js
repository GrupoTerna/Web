'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (24-oct-2026, PF232, pedido de la usuaria): la hora del acta siempre lleva dos cifras en hora, minutos y segundos.
// Se extrae de sorteo.html la formatearHoraActa() real y se ejecuta con fechas fijas (hora local).

const html = fs.readFileSync(path.join(__dirname, '..', 'sorteo.html'), 'utf8');
const ini = html.indexOf('  function formatearHoraActa(fecha, conSegundos){');
const fin = html.indexOf('  function', ini + 10);
assert.ok(ini > 0 && fin > ini, 'no se encontró formatearHoraActa() en sorteo.html');
const formatearHoraActa = new Function(html.slice(ini, fin) + '\nreturn formatearHoraActa;')();

test('hora con dos cifras en hora y minutos', () => {
  assert.equal(formatearHoraActa(new Date(2026, 9, 24, 17, 42, 9)), '05:42 p. m');
  assert.equal(formatearHoraActa(new Date(2026, 9, 24, 9, 7, 9)), '09:07 a. m');
});

test('mediodía y medianoche usan 12', () => {
  assert.equal(formatearHoraActa(new Date(2026, 9, 24, 12, 0, 0)), '12:00 p. m');
  assert.equal(formatearHoraActa(new Date(2026, 9, 24, 0, 5, 0)), '12:05 a. m');
});

test('con segundos también lleva dos cifras', () => {
  assert.equal(formatearHoraActa(new Date(2026, 9, 24, 17, 42, 3), true), '05:42:03 p. m');
  assert.equal(formatearHoraActa(new Date(2026, 9, 24, 1, 2, 3), true), '01:02:03 a. m');
});

test('una fecha inválida no rompe: usa la hora actual con el mismo formato', () => {
  assert.match(formatearHoraActa(new Date('x')), /^\d{2}:\d{2} [ap]\. m$/);
});
