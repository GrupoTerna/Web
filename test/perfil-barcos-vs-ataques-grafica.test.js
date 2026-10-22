'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026, pedido de la usuaria): en perfil.html, un día con MÁS BARCOS QUE ATAQUES es una
// anomalía (los barcos siempre son menores o iguales que los ataques). La gráfica «Barcos por semana»
// pinta ese punto en rojo, lo avisa en el tooltip y lista los días bajo la gráfica.
// Se extraen del <script> inline REAL las funciones por nombre (si se renombran, falla a propósito).
// LÍMITE: prueba el SVG y los avisos generados con DOM simulado, no cómo se ve en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function perfilLineChartSvg'));
assert.ok(grande, 'no se encontró perfilLineChartSvg en un <script> inline de perfil.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}
const NOMBRES = ['parseFechaDDMMYYYY', 'fmtFechaLargaDDMMYYYYPerfil', 'semanaLabelCortaPerfil', 'filtrarDiasGuerraPerfil', 'puntosSobreTope',
  'ordenarHistorialPorSemana', 'completarSemanasSinDato', '_periodIndexRegistro', '_historialDiasGuerra', '_valoresDiariosDesdeAcumulado',
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil', 'renderMetricaSemanal'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst TOPE_ATAQUES_DIA = 4; const COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { renderMetricaSemanal, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'],
    '<section id="mBarcosChartCard"><div id="mBarcosChart"></div></section>');
  window.eval(CODIGO);
  return window;
}

// 2026-10-01 es jueves; contadores ACUMULADOS de la semana (como los manda el backend).
const registro = (fecha, ataques, barcos) => ({ semana: fecha, ataques, barcos, clan: 'Terna' });
const SEMANA_OK = [registro('01/10/2026', 4, 2), registro('02/10/2026', 8, 6), registro('03/10/2026', 12, 10), registro('04/10/2026', 16, 14)];
// Viernes: +4 ataques pero +5 barcos → anomalía ese día.
const SEMANA_MAL = [registro('01/10/2026', 4, 2), registro('02/10/2026', 8, 7), registro('03/10/2026', 12, 10), registro('04/10/2026', 16, 14)];

test('barcos menores o iguales que ataques cada día: sin puntos rojos y con el aviso en verde', () => {
  const w = cargar();
  w.__t.renderMetricaSemanal('mBarcosChart', SEMANA_OK, 'barcos', { tituloEje: 'Barcos', vsAtaques: true });
  const wrap = w.document.getElementById('mBarcosChart');
  assert.ok(!wrap.innerHTML.includes('serie-pt-anomalia'));
  assert.ok(wrap.textContent.includes('Ningún día tiene más barcos que ataques'));
});

test('un día con más barcos que ataques sale como anomalía (punto rojo, data-excede-ataques) y se lista', () => {
  const w = cargar();
  w.__t.renderMetricaSemanal('mBarcosChart', SEMANA_MAL, 'barcos', { tituloEje: 'Barcos', vsAtaques: true });
  const wrap = w.document.getElementById('mBarcosChart');
  const rojos = wrap.querySelectorAll('.serie-pt-anomalia');
  assert.equal(rojos.length, 1, 'solo el viernes 02/10');
  assert.equal(rojos[0].dataset.excedeAtaques, '4');
  assert.equal(rojos[0].dataset.valor, '5');
  assert.ok(wrap.textContent.includes('1 día tiene más barcos que ataques'));
  assert.ok(wrap.textContent.includes('02/10'));
  assert.ok(wrap.textContent.includes('Punto rojo = ese día hay más barcos que ataques'), 'la leyenda lo explica');
});

test('el tooltip y la etiqueta del punto lo avisan', () => {
  const w = cargar();
  w.__t.renderMetricaSemanal('mBarcosChart', SEMANA_MAL, 'barcos', { tituloEje: 'Barcos', vsAtaques: true });
  const pt = w.document.querySelector('.serie-pt-anomalia');
  assert.ok(w.__t.htmlTooltipPuntoPerfil(pt).includes('Más barcos que ataques (ataques ese día: 4)'));
  assert.ok(w.__t.etiquetaPuntoPerfil(pt).includes('más barcos que ataques'));
});

test('sin vsAtaques (otras gráficas) no se compara ni se avisa nada', () => {
  const w = cargar();
  w.__t.renderMetricaSemanal('mBarcosChart', SEMANA_MAL, 'barcos', { tituloEje: 'Barcos' });
  const wrap = w.document.getElementById('mBarcosChart');
  assert.ok(!wrap.textContent.includes('más barcos que ataques'));
});

test('si ese día no hay dato de ataques (null) no se marca anomalía', () => {
  const w = cargar();
  const sinAtaques = SEMANA_MAL.map(r => Object.assign({}, r, { ataques: null }));
  w.__t.renderMetricaSemanal('mBarcosChart', sinAtaques, 'barcos', { tituloEje: 'Barcos', vsAtaques: true });
  assert.equal(w.document.querySelectorAll('.serie-pt-anomalia').length, 0);
});
