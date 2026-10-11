'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (11-oct-2026, pedido de la usuaria): las gráficas «Ataques por semana» y
// «Medallas por semana» de perfil.html dibujan una línea punteada en el tope
// (4 ataques y 900 medallas por día de guerra); todo valor real por encima es una
// anomalía (punto rojo, aviso bajo la gráfica y en el tooltip).
//
// perfil.html tiene miles de líneas de script, así que NO se carga entero: se
// extraen del <script> inline REAL las funciones necesarias por nombre (con
// llaves balanceadas). Si alguien las renombra o reorganiza, la prueba falla a propósito.
// LÍMITE: prueba el SVG y el aviso generados, no cómo se ve en un navegador.

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
const NOMBRES = ['parseFechaDDMMYYYY', 'semanaLabelCortaPerfil', 'filtrarDiasGuerraPerfil', 'puntosSobreTope',
  'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { perfilLineChartSvg, pintarGraficaPerfil, puntosSobreTope, filtrarDiasGuerraPerfil, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="g"></div>');
  window.eval(CODIGO);
  return window;
}

// 2026-10-01 es jueves: J, V, S, D de dos semanas de guerra.
const FECHAS = ['01/10/2026', '02/10/2026', '03/10/2026', '04/10/2026', '08/10/2026', '09/10/2026', '10/10/2026', '11/10/2026'];
const pts = (valores) => valores.map((valor, i) => ({ semana: FECHAS[i], valor, real: true, clan: 'Terna' }));

test('sin tope no se dibuja línea de tope ni puntos rojos', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(pts([4, 4, 4, 4, 4, 4, 4, 4]), { base: 0 });
  assert.ok(!svg.includes('linea-tope'));
  assert.ok(!svg.includes('serie-pt-anomalia'));
});

test('con tope se dibuja la línea punteada y el rótulo con el valor', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(pts([4, 4, 3, 4, 4, 2, 4, 4]), { base: 0, tope: 4 });
  assert.equal((svg.match(/class="linea-tope"/g) || []).length, 1);
  assert.ok(svg.includes('Tope: 4'));
  assert.ok(!svg.includes('serie-pt-anomalia'), 'igual al tope NO es anomalía');
});

test('la escala siempre incluye el tope aunque los datos sean menores', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(pts([100, 200, 0, 300, 100, 0, 0, 0]), { base: 0, tope: 900 });
  assert.ok(svg.includes('Tope: 900'));
  assert.ok(svg.includes('>900<'), 'el eje Y llega hasta 900');
});

test('los valores que superan el tope salen como anomalía (rojos, con data-tope)', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(pts([600, 1200, 900, 1552, 600, 0, 600, 0]), { base: 0, tope: 900 });
  assert.equal((svg.match(/serie-pt-anomalia/g) || []).length, 2 + 0, 'solo 1200 y 1552 (900 exacto no cuenta)');
  assert.equal((svg.match(/data-tope="900"/g) || []).length, 2);
});

test('un hueco sin dato (real:false) nunca es anomalía', () => {
  const w = cargar();
  const p = pts([600, 0, 600, 600, 600, 600, 600, 600]);
  p[1] = { semana: FECHAS[1], valor: 5000, real: false };
  assert.equal(w.__t.puntosSobreTope(p, 900).length, 0);
});

test('puntosSobreTope usa solo los días de guerra (jueves a domingo)', () => {
  const w = cargar();
  const p = [{ semana: '05/10/2026', valor: 2000, real: true }, { semana: '10/10/2026', valor: 2000, real: true }]; // lunes y sábado
  const sobre = w.__t.puntosSobreTope(w.__t.filtrarDiasGuerraPerfil(p), 900);
  assert.equal(sobre.length, 1);
  assert.equal(sobre[0].semana, '10/10/2026');
});

test('pintarGraficaPerfil: leyenda del tope y aviso con fechas y valores', () => {
  const w = cargar();
  const wrap = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(wrap, pts([600, 1200, 900, 1552, 600, 0, 600, 0]), { ejeY: 'Medallas', unidad: 'de medallas', base: 0, tope: 900 });
  assert.ok(wrap.textContent.includes('tope (900)'));
  const aviso = wrap.querySelector('.pf-tope-alerta');
  assert.ok(aviso, 'debe haber aviso de anomalías');
  assert.ok(aviso.textContent.includes('2 días superan el tope de 900'));
  assert.ok(aviso.textContent.includes('02/10') && aviso.textContent.includes('1,200'));
  assert.ok(aviso.textContent.includes('04/10') && aviso.textContent.includes('1,552'));
});

test('pintarGraficaPerfil: sin excesos dice que ningún día supera el tope', () => {
  const w = cargar();
  const wrap = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(wrap, pts([4, 4, 4, 4, 4, 4, 4, 4]), { ejeY: 'Ataques', unidad: 'ataques', base: 0, tope: 4 });
  assert.ok(wrap.querySelector('.pf-tope-ok'));
  assert.ok(!wrap.querySelector('.pf-tope-alerta'));
});

test('un solo día sobre el tope usa singular; el tooltip y la etiqueta lo advierten', () => {
  const w = cargar();
  const wrap = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(wrap, pts([4, 4, 5, 4, 4, 4, 4, 4]), { ejeY: 'Ataques', unidad: 'ataques', base: 0, tope: 4 });
  assert.ok(wrap.querySelector('.pf-tope-alerta').textContent.includes('1 día supera el tope de 4'));
  const pt = wrap.querySelector('.serie-pt-anomalia');
  assert.ok(pt);
  assert.ok(w.__t.htmlTooltipPuntoPerfil(pt).includes('Supera el tope de 4'));
  assert.ok(w.__t.etiquetaPuntoPerfil(pt).includes('supera el tope de 4'));
});

test('las gráficas sin tope (Ranking, Barcos) no muestran aviso ni leyenda de tope', () => {
  const w = cargar();
  const wrap = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(wrap, pts([1, 2, 3, 4, 5, 6, 7, 8]), { ejeY: 'Barcos', unidad: 'barcos', base: 0 });
  assert.ok(!wrap.querySelector('.pf-tope-resumen'));
  assert.ok(!wrap.textContent.includes('tope'));
});
