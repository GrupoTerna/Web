'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (12-oct-2026, pedido de la usuaria): eje X de las gráficas de perfil.html: pocas fechas = todas; muchas = solo domingos; sin domingo = placeholder
// interpolado con esa fecha. Mismo método que perfil-tope-grafica.test.js (funciones extraídas del <script> inline real). LÍMITE: prueba el SVG, no un navegador.

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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { perfilLineChartSvg, pintarGraficaPerfil, puntosSobreTope, filtrarDiasGuerraPerfil, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="g"></div>');
  window.eval(CODIGO);
  return window;
}


// 2026-10-01 es jueves.
const pt = (semana, valor, real = true) => ({ semana, valor, real, clan: 'Terna' });
const rotuladas = svg => [...svg.matchAll(/rotate\(-45[^>]*>(\d\d\/\d\d)</g)].map(m => m[1]);
const huecos = svg => (svg.match(/ing-serie-pt serie-pt-vacio/g) || []).length;

test('con más de 7 días rotula solo las fechas de los domingos', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(['01', '02', '03', '04', '08', '09', '10', '11'].map((d, i) => pt(`${d}/10/2026`, 10 + i)), {});
  assert.equal(JSON.stringify(rotuladas(svg)), JSON.stringify(['04/10', '11/10']));
  assert.equal((svg.match(/class="linea-domingo"/g) || []).length, 2);
  assert.equal(huecos(svg), 0, 'ambas semanas traen domingo: no hay placeholder');
});

test('con 7 días o menos rotula todos, y si falta el domingo agrega un placeholder con esa fecha', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 30)], {});
  assert.equal(JSON.stringify(rotuladas(svg)), JSON.stringify(['01/10', '02/10', '03/10', '04/10']));
  assert.equal(huecos(svg), 1);
  assert.equal((svg.match(/class="linea-domingo"/g) || []).length, 1);
  assert.ok(svg.includes('>D</text>'));
  assert.ok(svg.includes('data-semana="04/10/2026"'));
  assert.ok(svg.includes('data-valor="30"'), 'sin vecino posterior mantiene el último valor');
});

test('el domingo que falta entre dos semanas se interpola entre el sábado y el jueves siguiente; con más de 7 puntos solo rotula domingos', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 100), pt('02/10/2026', 100), pt('03/10/2026', 100),
    pt('08/10/2026', 600), pt('09/10/2026', 600), pt('10/10/2026', 600), pt('11/10/2026', 600)], {});
  assert.equal(huecos(svg), 1);
  assert.ok(svg.includes('data-semana="04/10/2026"') && svg.includes('data-valor="200"'), '04/10: 1 de los 5 días entre el 03 (100) y el 08 (600)');
  assert.equal(JSON.stringify(rotuladas(svg)), JSON.stringify(['04/10', '11/10']));
});

test('un domingo ya presente como hueco sin dato no se duplica con un placeholder', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('02/10/2026', 5), pt('03/10/2026', 6), pt('04/10/2026', 0, false)], {});
  assert.equal(huecos(svg), 1);
  assert.equal((svg.match(/data-semana="04\/10\/2026"/g) || []).length, 1);
});

test('el placeholder no cuenta como anomalía ni altera el aviso de topes', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 3), pt('02/10/2026', 4), pt('03/10/2026', 4)], { tope: 4 });
  assert.ok(!svg.includes('serie-pt-anomalia'));
});
