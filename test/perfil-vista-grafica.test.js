'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (04-nov-2026, pedido de la usuaria, §PF352): vista de las gráficas de perfil.html: pastilla «Últimas 6 temporadas» (activada por defecto y
// desactivable), zoom +/− con barra de desplazamiento y tooltip grande con la fecha al acercar el mouse al eje X.
// Mismo método que perfil-eje-x-grafica.test.js (funciones extraídas del <script> inline real). LÍMITE: jsdom no hace layout; el tamaño del <svg> se
// simula con getBoundingClientRect y no se prueba el aspecto en un navegador.

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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml',
  'filtrarUltimasTemporadasPerfil', 'barraVistaPerfilHtml', 'repintarGraficasPerfil', 'activarTooltipEjeXPerfil',
  'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst PERFIL_VISTA = { ultimas6: true, zoom: 1 }; const PERFIL_ZOOMS = [1, 1.5, 2, 3, 4, 6]; const PERFIL_TEMPORADAS_VISTA = 6; const PERFIL_GRAFICAS_PINTADAS = new Map();" +
  "\nconst COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { pintarGraficaPerfil, filtrarUltimasTemporadasPerfil, PERFIL_VISTA };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="g"></div>');
  window.eval(CODIGO);
  return window;
}

// 14 domingos separados por 35 días desde 2026-01-04 (domingo): cubren más de 6 temporadas.
function domingos(n = 14){
  const out = [];
  const d = new Date(2026, 0, 4);
  for (let i = 0; i < n; i++){
    out.push({ semana: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`, valor: 10 + i, real: true, clan: 'Terna' });
    d.setDate(d.getDate() + 35);
  }
  return out;
}
const diarios = svg => (svg.match(/data-serie="dia"/g) || []).length;

test('filtrarUltimasTemporadasPerfil deja solo las últimas N temporadas', () => {
  const w = cargar();
  const todos = domingos();
  const r = w.__t.filtrarUltimasTemporadasPerfil(todos, null, 6);
  assert.ok(r.total > 6 && r.recortado);
  assert.ok(r.puntos.length < todos.length && r.puntos.length > 0);
  assert.equal(r.puntos[r.puntos.length - 1].semana, todos[todos.length - 1].semana, 'conserva lo más reciente');
  const igual = w.__t.filtrarUltimasTemporadasPerfil(todos.slice(-3), null, 6);
  assert.equal(igual.recortado, false);
  assert.equal(igual.puntos.length, 3);
});

test('por defecto la gráfica muestra solo 6 temporadas; con la pastilla apagada muestra todo', () => {
  const w = cargar();
  const g = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(g, domingos(), {});
  const recortado = diarios(g.innerHTML);
  const pill = g.querySelector('[data-pv="ultimas6"]');
  assert.equal(pill.getAttribute('aria-pressed'), 'true');
  pill.click();
  assert.equal(g.querySelector('[data-pv="ultimas6"]').getAttribute('aria-pressed'), 'false');
  assert.ok(diarios(g.innerHTML) > recortado, 'apagada: se ven más puntos');
  g.querySelector('[data-pv="ultimas6"]').click();
  assert.equal(diarios(g.innerHTML), recortado, 'vuelve a encenderse');
});

test('con pocas temporadas la pastilla queda deshabilitada y explica por qué', () => {
  const w = cargar();
  const g = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(g, domingos(3), {});
  const pill = g.querySelector('[data-pv="ultimas6"]');
  assert.ok(pill.disabled);
  assert.match(pill.title, /ya se ven todas/);
});

test('el zoom ensancha el lienzo y el <svg> pero no cambia la altura', () => {
  const w = cargar();
  const g = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(g, domingos(), {});
  assert.match(g.querySelector('svg.ing-linechart-svg').getAttribute('viewBox'), /^0 0 960 320$/);
  assert.ok(g.querySelector('.perfil-chart-scroll svg'), 'el svg va dentro del contenedor con scroll');
  g.querySelector('[data-pv="mas"]').click(); // 1,5×
  g.querySelector('[data-pv="mas"]').click(); // 2×
  const svg = g.querySelector('svg.ing-linechart-svg');
  assert.match(svg.getAttribute('viewBox'), /^0 0 1920 320$/);
  assert.match(svg.getAttribute('style'), /width:200%/);
  assert.match(g.textContent, /Zoom 2×/);
  g.querySelector('[data-pv="menos"]').click();
  assert.match(g.textContent, /Zoom 1,5×/);
});

test('los botones de zoom se deshabilitan en los extremos', () => {
  const w = cargar();
  const g = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(g, domingos(), {});
  assert.ok(g.querySelector('[data-pv="menos"]').disabled);
  for (let i = 0; i < 10; i++){ const b = g.querySelector('[data-pv="mas"]'); if (!b.disabled) b.click(); }
  assert.ok(g.querySelector('[data-pv="mas"]').disabled);
  assert.match(g.textContent, /Zoom 6×/);
});

test('al acercar el mouse a la franja del eje X sale un tooltip grande con la fecha', () => {
  const w = cargar();
  const g = w.document.getElementById('g');
  w.__t.pintarGraficaPerfil(g, domingos(), {});
  const svg = g.querySelector('svg.ing-linechart-svg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 320 });
  const [padL, plotW] = svg.getAttribute('data-xgeom').split(',').map(Number);
  const fechas = JSON.parse(svg.getAttribute('data-xfechas'));
  const mover = (x, y) => svg.dispatchEvent(new w.MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
  const tip = () => w.document.getElementById('chartTooltip');

  mover(padL + plotW, 300); // extremo derecho, dentro de la franja del eje X
  assert.equal(tip().style.display, 'block');
  const ultima = fechas[fechas.length - 1];
  assert.ok(tip().textContent.includes(ultima), 'muestra la última fecha: ' + tip().textContent);
  assert.match(tip().textContent, /Domingo/);
  assert.match(tip().innerHTML, /font-size:\s*20px/);

  mover(padL, 300);
  assert.ok(tip().textContent.includes(fechas[0]));

  mover(padL + plotW / 2, 100); // en el área de trazado: el tooltip del eje se oculta
  assert.equal(tip().style.display, 'none');
});
