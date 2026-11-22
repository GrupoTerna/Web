'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (22-nov-2026, pedido de la usuaria): en perfil.html (1) el punto estimado (domingo sin dato con valor interpolado) recibe el cursor en todo su círculo
// y su tooltip muestra el valor marcado como estimado; (2) las líneas de unión muestran nombre, tag y clan actual al pasar el cursor por cualquier parte de la serie.
// Mismo método que perfil-eje-x-grafica.test.js (funciones extraídas del <script> inline real). LÍMITE: prueba el SVG y los eventos en jsdom, no un navegador real.

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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'filtrarUltimasTemporadasPerfil', 'barraVistaPerfilHtml', 'repintarGraficasPerfil', 'activarTooltipEjeXPerfil', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipLineaPerfil', 'htmlTooltipPuntoPerfil'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst PERFIL_VISTA = { ultimas6: true, zoom: 1 }; const PERFIL_ZOOMS = [1, 1.5, 2, 3, 4, 6]; const PERFIL_TEMPORADAS_VISTA = 6; const PERFIL_GRAFICAS_PINTADAS = new Map(); const COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { perfilLineChartSvg, pintarGraficaPerfil, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil, htmlTooltipLineaPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="g"></div>');
  window.eval(CODIGO);
  return window;
}

// 2026-10-01 es jueves.
const pt = (semana, valor, real = true) => ({ semana, valor, real, clan: 'Terna' });
const dibujar = (w, puntos) => {
  const wrap = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(wrap, puntos, { unidad: 'medallas' });
  return wrap;
};
const mover = (w, el) => el.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 50 }));

test('el domingo estimado marca el punto como estimado y conserva su valor y el clan actual', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 30)], {});
  const m = svg.match(/<circle[^>]*data-semana="04\/10\/2026"[^>]*>/);
  assert.ok(m, 'no se dibujó el punto del domingo estimado');
  assert.ok(m[0].includes('data-estimado="1"') && m[0].includes('data-sin-dato="1"'));
  assert.ok(m[0].includes('data-valor="30"') && m[0].includes('data-clan="Terna"'));
});

test('el tooltip del punto estimado muestra el valor marcado como estimado; el hueco sin dato sigue sin número', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 30)]);
  const est = wrap.querySelector('.ing-serie-pt[data-estimado="1"]');
  assert.ok(est);
  const t = w.__t.htmlTooltipPuntoPerfil(est);
  assert.ok(t.includes('30 medallas (estimado)') && t.includes('Terna') && t.includes('Chistris'), t);
  assert.ok(w.__t.etiquetaPuntoPerfil(est).includes('(estimado)'));
  const hueco = wrap.ownerDocument.createElement('circle');
  hueco.dataset.sinDato = '1'; hueco.dataset.nombre = 'Chistris'; hueco.dataset.clan = 'Sin dato — sin clan'; hueco.dataset.semana = '04/10/2026'; hueco.dataset.valor = '0';
  assert.ok(!w.__t.htmlTooltipPuntoPerfil(hueco).includes('medallas'), 'el hueco real no lleva número');
});

test('al pasar el mouse por el punto estimado el tooltip se muestra con su valor', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 30)]);
  mover(w, wrap.querySelector('.ing-serie-pt[data-estimado="1"]'));
  const tip = w.document.getElementById('chartTooltip');
  assert.equal(tip.style.display, 'block');
  assert.ok(tip.innerHTML.includes('(estimado)'));
});

test('cada tramo de unión tiene un tramo ancho invisible que muestra nombre, tag y clan actual', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 30), pt('04/10/2026', 40)]);
  const hits = wrap.querySelectorAll('.ing-serie-hit');
  assert.equal(hits.length, 3, 'un tramo por cada unión entre dos puntos');
  mover(w, hits[1]);
  const tip = w.document.getElementById('chartTooltip');
  assert.equal(tip.style.display, 'block');
  assert.ok(tip.innerHTML.includes('Chistris (#2GG8PJ8GC)') && tip.innerHTML.includes('Clan actual: Terna'), tip.innerHTML);
  hits[1].dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true }));
  assert.equal(tip.style.display, 'none');
});

test('los tramos de unión no se confunden con la serie: sin data-serie-clave, pero con data-serie-hit', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20)]);
  const h = wrap.querySelector('.ing-serie-hit');
  assert.ok(h && !h.hasAttribute('data-serie-clave') && h.getAttribute('data-serie-hit') === 'dia');
});

test('el CSS deja que todo el círculo reciba el cursor y que las líneas no lo reciban', () => {
  assert.match(html, /\.ing-linechart-svg \.ing-serie-pt\{[^}]*pointer-events:all/);
  assert.match(html, /\.ing-linechart-svg \.ing-serie-line\{pointer-events:none;\}/);
});
