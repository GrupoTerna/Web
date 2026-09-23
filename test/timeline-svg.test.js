'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScripts } = require('./load-browser-script');

// Solo se testea la parte PURA de timeline-svg.js (líneas 1-137 del
// archivo real: cálculo de fechas + strings SVG). El resto del archivo
// (obtenerTooltipGrafica, activarTecladoPuntosGrafica, etc.) manipula el
// DOM real (document.getElementById, document.createElement, svg.closest,
// addEventListener...) y queda fuera de esta tanda — ver nota "pendiente
// de definir o contestar" sobre jsdom en el consolidado del proyecto.
//
// etiquetaPuntoSerie()/htmlTooltipPuntoSerie() sí se pueden testear sin DOM
// real: solo leen `pt.dataset`, así que basta con pasarles un objeto plano
// { dataset: {...} } en vez de un <circle> real.
const sandbox = loadBrowserScripts([
  'assets/js/util.js',
  'assets/js/features/timeline-svg.js'
]);
const {
  primerLunesDelMesJS, esInicioTemporada, esInicioAnio, esInicioSemana,
  lineasTemporalesSvg, gridHorizontalMediosSvg,
  etiquetaPuntoSerie, htmlTooltipPuntoSerie
} = sandbox;

// lineasTemporalesSvg() valida `f instanceof Date` puertas adentro: como el
// sandbox de vm es un "realm" de JS aparte del de Node, hay que crear esas
// fechas con sandbox.Date (ver _exponerDateDelSandbox en load-browser-script.js)
// para que ese instanceof reconozca la fecha — un `new Date(...)` normal de
// Node fallaría ese instanceof en silencio y lineasTemporalesSvg() la
// ignoraría como si fuera inválida.
const Date = sandbox.Date;

test('primerLunesDelMesJS() encuentra el primer lunes del mes cuando el día 1 no es lunes', () => {
  // Enero 2026: el 1 de enero de 2026 es jueves -> primer lunes es el 5.
  const d = primerLunesDelMesJS(2026, 0);
  assert.equal(d.getDate(), 5);
  assert.equal(d.getDay(), 1);
});

test('primerLunesDelMesJS() cuando el día 1 YA es lunes, devuelve el propio día 1', () => {
  // Junio 2026: el 1 de junio de 2026 es lunes.
  const d = primerLunesDelMesJS(2026, 5);
  assert.equal(d.getDate(), 1);
  assert.equal(d.getDay(), 1);
});

test('esInicioTemporada() es true solo en el primer lunes del mes', () => {
  assert.equal(esInicioTemporada(new Date(2026, 0, 5)), true);
  assert.equal(esInicioTemporada(new Date(2026, 0, 12)), false); // segundo lunes
  assert.equal(esInicioTemporada(new Date(2026, 0, 6)), false);  // martes
});

test('esInicioAnio() es true solo el primer lunes de ENERO', () => {
  assert.equal(esInicioAnio(new Date(2026, 0, 5)), true);
  assert.equal(esInicioAnio(new Date(2026, 5, 1)), false); // primer lunes de junio, no de enero
});

test('esInicioSemana() es true solo los lunes', () => {
  assert.equal(esInicioSemana(new Date(2026, 0, 5)), true);  // lunes
  assert.equal(esInicioSemana(new Date(2026, 0, 6)), false); // martes
  assert.equal(esInicioSemana(new Date(2026, 0, 11)), false); // domingo
});

test('lineasTemporalesSvg() prioriza la línea de año sobre la de temporada cuando coinciden', () => {
  const fechas = [new Date(2026, 0, 5)]; // primer lunes de enero: es año Y temporada a la vez
  const svg = lineasTemporalesSvg(fechas, () => 10, 0, 100);
  assert.match(svg, /grid-line-anio/);
  assert.ok(!svg.includes('grid-line-temporada'));
});

test('lineasTemporalesSvg() marca temporada (no año) en el primer lunes de un mes que no es enero', () => {
  const fechas = [new Date(2026, 1, 2)]; // primer lunes de febrero 2026
  const svg = lineasTemporalesSvg(fechas, () => 10, 0, 100);
  assert.match(svg, /grid-line-temporada/);
  assert.ok(!svg.includes('grid-line-anio'));
});

test('lineasTemporalesSvg() solo marca semana si opts.granularidadDiaria es true', () => {
  const fechas = [new Date(2026, 0, 12)]; // un lunes cualquiera, no inicio de temporada/año
  const sinDiaria = lineasTemporalesSvg(fechas, () => 10, 0, 100);
  const conDiaria = lineasTemporalesSvg(fechas, () => 10, 0, 100, { granularidadDiaria: true });
  assert.equal(sinDiaria, '');
  assert.match(conDiaria, /grid-line-semana/);
});

test('lineasTemporalesSvg() ignora fechas inválidas o que no son Date en vez de romper', () => {
  const svg = lineasTemporalesSvg([null, 'no-es-fecha', new Date(NaN)], () => 10, 0, 100);
  assert.equal(svg, '');
});

test('lineasTemporalesSvg() aplica opts.prefijoClase a la clase CSS de la línea', () => {
  const fechas = [new Date(2026, 0, 5)];
  const svg = lineasTemporalesSvg(fechas, () => 10, 0, 100, { prefijoClase: 'ing-' });
  assert.match(svg, /class="ing-grid-line-anio"/);
});

test('gridHorizontalMediosSvg() dibuja una línea por paso, a la mitad de cada intervalo', () => {
  const svg = gridHorizontalMediosSvg(2, 100, v => v, 0, 50);
  // pasos=2, techo=100 -> valores medios: 25 y 75
  assert.match(svg, /y1="25\.0"/);
  assert.match(svg, /y1="75\.0"/);
  assert.equal((svg.match(/<line/g) || []).length, 2);
});

test('etiquetaPuntoSerie() arma el texto plano (aria-label) a partir de pt.dataset', () => {
  const pt = { dataset: { nombre: 'Ana', tag: '#ABC', valor: '5000', clan: 'Terna 2', semana: 'Sem 3', unidad: '🏆' } };
  assert.equal(etiquetaPuntoSerie(pt), 'Ana (#ABC): 5,000 🏆 — Terna 2 · Sem 3');
});

test('etiquetaPuntoSerie() sin tag no agrega paréntesis vacíos', () => {
  const pt = { dataset: { nombre: 'Ana', valor: '100' } };
  assert.equal(etiquetaPuntoSerie(pt), 'Ana: 100  —  · ');
});

test('htmlTooltipPuntoSerie() escapa el nombre/tag/clan (esc()) antes de insertarlos en HTML', () => {
  const pt = { dataset: { nombre: '<b>Ana</b>', tag: '#ABC', valor: '10', clan: 'Terna', semana: 'Sem 1', unidad: '🏆' } };
  const html = htmlTooltipPuntoSerie(pt);
  assert.match(html, /&lt;b&gt;Ana&lt;\/b&gt;/);
  assert.ok(!html.includes('<b>Ana</b>'));
});
