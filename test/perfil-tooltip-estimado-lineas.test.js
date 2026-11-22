'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (22-nov-2026, pedido de la usuaria): en perfil.html (1) un día sin dato (también el domingo estimado) no lleva punto y la línea une el último punto con dato
// con el siguiente; (2) las líneas de unión muestran nombre, tag y clan actual al pasar el cursor por cualquier parte de la serie.
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

test('un día sin dato (incluido el domingo estimado) no lleva punto y la línea une el último punto con dato con el siguiente', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 0, false), pt('04/10/2026', 40), pt('08/10/2026', 50)]);
  const fechas = [...wrap.querySelectorAll('.ing-serie-pt')].map(c => c.dataset.semana);
  assert.equal(JSON.stringify(fechas), JSON.stringify(['01/10/2026', '02/10/2026', '04/10/2026', '08/10/2026']), 'sin círculo en el 03/10');
  assert.equal(wrap.querySelectorAll('.ing-serie-pt.serie-pt-vacio').length, 0);
  const lineas = [...wrap.querySelectorAll('path.ing-serie-line[data-serie-clave="dia"]')];
  assert.equal(lineas.length, 3, 'cuatro puntos con dato = tres tramos');
  assert.equal(lineas.filter(l => l.classList.contains('ing-serie-line-dashed')).length, 1, 'solo el tramo 02/10 → 04/10 salta un día sin dato');
});

test('la leyenda ya no habla de punto con borde y explica el tramo punteado', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20)]);
  assert.ok(!wrap.innerHTML.includes('Punto solo con borde'));
  assert.ok(wrap.innerHTML.includes('tramo sin dato'));
});

test('el punto con dato recibe el cursor en todo su círculo y su tooltip muestra el valor', () => {
  const w = cargar();
  const wrap = dibujar(w, [pt('01/10/2026', 10), pt('02/10/2026', 20)]);
  mover(w, wrap.querySelector('.ing-serie-pt'));
  const tip = w.document.getElementById('chartTooltip');
  assert.equal(tip.style.display, 'block');
  assert.ok(tip.innerHTML.includes('medallas') && tip.innerHTML.includes('Terna'));
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
