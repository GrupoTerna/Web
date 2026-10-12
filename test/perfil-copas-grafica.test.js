'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (12-oct-2026, pedido de la usuaria): gráfica «Copas» de perfil.html, después de «Ranking en el clan».
// Lee `copas` de ext.historialRanking (hoja Guerra, columna Copas). Un 0 o un campo ausente es «sin dato».
// Igual que perfil-tope-grafica.test.js: se extraen del <script> inline REAL las funciones por nombre.
// LÍMITE: prueba el SVG y el aviso generados, no cómo se ve en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function renderCopasChart'));
assert.ok(grande, 'no se encontró renderCopasChart en un <script> inline de perfil.html');

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
const NOMBRES = ['parseFechaDDMMYYYY', 'semanaLabelCortaPerfil', 'filtrarDiasGuerraPerfil', 'puntosSobreTope',
  'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil',
  'fmtFechaLargaDDMMYYYYPerfil', 'ordenarHistorialPorSemana', '_periodIndexRegistro', '_historialDiasGuerra', 'renderCopasChart'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { renderCopasChart };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="mCopasChart"></div>');
  window.eval(CODIGO);
  return window;
}

// 2026-10-01 es jueves: J, V, S, D.
const reg = (semana, copas) => ({ semana, ranking: 3, ataques: 4, puntaje: 100, barcos: 0, copas });

test('con copas dibuja la gráfica con eje «Copas» y piso sobre 0', () => {
  const w = cargar();
  w.__t.renderCopasChart({ historialRanking: [reg('01/10/2026', 8200), reg('02/10/2026', 8260), reg('03/10/2026', 8180), reg('04/10/2026', 8300)] }, 8300);
  const salida = w.document.getElementById('mCopasChart').innerHTML;
  assert.ok(salida.includes('<svg'), 'dibuja un SVG');
  assert.ok(salida.includes('Copas'), 'el eje Y se titula Copas');
  assert.ok(!salida.includes('>0<'), 'el eje no arranca en 0: con base 0 la línea sería plana');
  assert.ok(salida.includes('8,000') || salida.includes('8.000') || salida.includes('8000'), 'el piso del eje es 8000');
});

test('los registros con copas en 0 o ausentes no se grafican (sin dato)', () => {
  const w = cargar();
  w.__t.renderCopasChart({ historialRanking: [reg('01/10/2026', 0), reg('02/10/2026', undefined), reg('03/10/2026', 8100)] }, 8100);
  const salida = w.document.getElementById('mCopasChart').innerHTML;
  assert.equal((salida.match(/class="ing-serie-pt"/g) || []).length, 1, 'solo el registro con copas reales');
});

test('sin ningún dato muestra el aviso, con las copas actuales, en vez de una gráfica vacía', () => {
  const w = cargar();
  w.__t.renderCopasChart({ historialRanking: [reg('01/10/2026', 0)] }, 8123);
  const salida = w.document.getElementById('mCopasChart').innerHTML;
  assert.ok(salida.includes('chart-empty'));
  assert.ok(salida.includes('12-oct-2026'));
  assert.ok(!salida.includes('<svg'));
});
