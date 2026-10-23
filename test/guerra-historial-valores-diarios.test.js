'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// NUEVO (22-oct-2026, pedido de la usuaria): el mini historial (guerra.html y directorio.html) y el comparador de directorio.html deben mostrar
// medallas y barcos DEL DÍA, no acumulados de la semana (guerraAValoresDiarios(), assets/js/util.js).
// LÍMITE: prueba el cálculo con los datos de la captura de Chistris (#2GG8PJ8GC); no prueba el dibujo real del modal.

const { loadBrowserScripts } = require('./load-browser-script');
// 22-oct-2026 (§PF169): el mini historial vive en assets/js/features/mini-historial.js (compartido por guerra.html y directorio.html); se carga el archivo real junto con util.js.
const { guerraAValoresDiarios, histSoloGuerra } = loadBrowserScripts(['assets/js/util.js', 'assets/js/features/mini-historial.js']);
assert.equal(typeof histSoloGuerra, 'function', 'no se encontró histSoloGuerra() en assets/js/features/mini-historial.js');

const reg = (fecha, ataques, fame, barcos = 0) => ({ fecha, ataques, fame, barcos });
// Semana jue 01/10 a dom 04/10 y semana jue 08/10 a dom 11/10 (acumulados, como los manda el backend).
const CHISTRIS = [
  reg('2026-10-01', 4, 600), reg('2026-10-02', 4, 1400), reg('2026-10-03', 4, 1800), reg('2026-10-04', 4, 2350),
  reg('2026-10-08', 4, 600), reg('2026-10-09', 0, 600), reg('2026-10-10', 4, 1200), reg('2026-10-11', 4, 1900),
];
const porFecha = lista => Object.fromEntries(lista.map(r => [r.fecha, r]));

test('la fama acumulada pasa a valor del día; el jueves no resta nada', () => {
  const r = porFecha(histSoloGuerra(CHISTRIS));
  assert.deepEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map(f => r[f].fame), [600, 800, 400, 550]);
  assert.deepEqual(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'].map(f => r[f].fame), [600, 0, 600, 700]);
});

test('la suma de los días da el acumulado final de cada semana y los ataques no cambian', () => {
  const lista = histSoloGuerra(CHISTRIS);
  assert.equal(lista.slice(0, 4).reduce((a, r) => a + r.fame, 0), 2350);
  assert.equal(lista.slice(4).reduce((a, r) => a + r.fame, 0), 1900);
  assert.deepEqual(lista.map(r => r.ataques), [4, 4, 4, 4, 4, 0, 4, 4]);
});

test('los barcos también se pasan a valor del día', () => {
  const r = porFecha(histSoloGuerra([reg('2026-10-15', 4, 500, 0), reg('2026-10-16', 4, 1200, 1), reg('2026-10-17', 4, 2000, 1), reg('2026-10-18', 4, 2500, 3)]));
  assert.deepEqual(['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map(f => r[f].barcos), [0, 1, 0, 2]);
});

test('una segunda pasada no vuelve a restar (el modal repinta con histRegsA ya convertido)', () => {
  const una = histSoloGuerra(CHISTRIS);
  const dos = histSoloGuerra(una);
  assert.deepEqual(dos.map(r => r.fame), una.map(r => r.fame));
});

test('día de entrenamiento se descarta y una resta negativa deja el valor tal cual', () => {
  const lista = histSoloGuerra([reg('2026-10-07', 0, 0), reg('2026-10-08', 4, 900), reg('2026-10-09', 4, 300)]);
  assert.deepEqual(lista.map(r => r.fecha), ['2026-10-08', '2026-10-09']);
  assert.deepEqual(lista.map(r => r.fame), [900, 300]);
});

test('el orden de llegada no importa y no se modifican los objetos originales', () => {
  const original = CHISTRIS.map(r => ({ ...r }));
  const barajado = CHISTRIS.slice().reverse();
  const lista = histSoloGuerra(barajado);
  assert.deepEqual(lista.map(r => r.fecha), CHISTRIS.map(r => r.fecha));
  assert.deepEqual(lista.map(r => r.fame), [600, 800, 400, 550, 600, 0, 600, 700]);
  assert.deepEqual(CHISTRIS, original);
});

test('mini-historial.js y directorio.html convierten con guerraAValoresDiarios() y no la redefinen', () => {
  const fs = require('node:fs'), path = require('node:path');
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const mini = leer('assets/js/features/mini-historial.js');
  assert.match(mini, /return guerraAValoresDiarios\(guerra\)/);
  const dir = leer('directorio.html');
  assert.match(dir, /const a = guerraAValoresDiarios\(Array\.isArray\(histA\)/);
  assert.match(dir, /const b = guerraAValoresDiarios\(Array\.isArray\(histB\)/);
  assert.ok(!/function (hist|guerra)AValoresDiarios/.test(leer('guerra.html') + mini + dir), 'la conversión debe vivir solo en util.js');
});

test('guerra.html y directorio.html cargan mini-historial.js y no lo duplican', () => {
  const fs = require('node:fs'), path = require('node:path');
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const g = leer('guerra.html'), d = leer('directorio.html');
  for (const h of [g, d]) {
    assert.match(h, /<script src="assets\/js\/features\/mini-historial\.js"><\/script>/);
    assert.ok(!/function histAbrir|id="histFondo"/.test(h), 'el modal y sus funciones viven solo en mini-historial.js');
  }
  assert.match(d, /extra:m => botonHistJugador\(\{ tag:m\.tag, nombre:m\.nombre \}\)/, 'la columna Nombre del directorio lleva el 📈');
  assert.match(d, /e\.target\.closest\('a, \.btn-hist-jugador'\)/, 'el clic en el 📈 no abre además el perfil');
});

test('Pendientes de Atacar lleva el 📈 del mini historial junto al nombre', () => {
  const fs = require('node:fs'), path = require('node:path');
  const g = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
  assert.match(g, /<div class=\"col-jugador-inner\"><span class=\"col-jugador-nombre\">\$\{p\.tag \? enlaceJugador\(nombreMostrado, p\.tag\) : esc\(nombreMostrado\)\}<\/span><span class=\"col-jugador-extras\">\$\{botonHistJugador\(\{ tag:p\.tag, nombre:nombreMostrado \}\)\}<\/span><\/div><\/td>/);
});
