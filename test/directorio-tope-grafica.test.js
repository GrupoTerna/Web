'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026, pedido de la usuaria): las gráficas «Ataques por semana»,
// «Medallas por semana» y «Barcos por semana» de Ingresos recientes (directorio.html)
// dibujan una línea punteada en el tope SEMANAL (16 ataques, 3600 medallas, 16 barcos),
// igual que perfil.html con sus topes por día; todo valor real por encima es una
// anomalía (punto rojo y aviso en el tooltip).
//
// Como en perfil-tope-grafica.test.js, no se carga la página entera: se extraen del
// <script> inline REAL las funciones necesarias por nombre. Si alguien las renombra, falla a propósito.
// LÍMITE: prueba el SVG generado, no cómo se ve en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function lineChartSvg'));
assert.ok(grande, 'no se encontró lineChartSvg en un <script> inline de directorio.html');

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
function extraerConstante(src, nombre){
  const m = src.match(new RegExp(`const ${nombre} = [^;]+;`));
  assert.ok(m, `no se encontró const ${nombre}`);
  return m[0];
}
const NOMBRES = ['semanaLabel', 'semanaOrden', 'numeroSemanaVieja', 'semanaLabelCorta', 'construirFechasEstimadasSemanasViejas',
  'fmtFechaCortaDDMM', 'fmtFechaLargaDDMMYYYY', 'textoTemporadaSemanaDiaIngreso', 'attrsTemporadaSemanaDiaIngreso', 'lineChartSvg', 'etiquetaPuntoIngreso', 'htmlTooltipPuntoIngreso'];
const CONSTANTES = ['PALETA_SERIES', 'TOPE_ATAQUES_SEMANA', 'TOPE_MEDALLAS_SEMANA', 'TOPE_BARCOS_SEMANA'];
const CODIGO = CONSTANTES.map(c => extraerConstante(grande, c)).join('\n') + '\n' +
  NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  '\nwindow.__t = { lineChartSvg, etiquetaPuntoIngreso, htmlTooltipPuntoIngreso, TOPE_ATAQUES_SEMANA, TOPE_MEDALLAS_SEMANA, TOPE_BARCOS_SEMANA };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="g"></div>');
  window.eval(CODIGO);
  return window;
}

const SEMANAS = ['07/09/2026', '14/09/2026', '21/09/2026', '28/09/2026'];
const miembro = (valores, campo) => ({
  nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna',
  historialSemanal: SEMANAS.map((semana, i) => ({ semana, clan: 'Terna', [campo]: valores[i] }))
});

test('los topes semanales son 16 ataques, 3600 medallas y 16 barcos', () => {
  const w = cargar();
  assert.equal(w.__t.TOPE_ATAQUES_SEMANA, 16);
  assert.equal(w.__t.TOPE_MEDALLAS_SEMANA, 3600);
  assert.equal(w.__t.TOPE_BARCOS_SEMANA, 16);
});

test('sin tope no se dibuja línea de tope ni puntos rojos', () => {
  const w = cargar();
  const svg = w.__t.lineChartSvg([miembro([16, 12, 8, 16], 'ataques')], 'ataques', SEMANAS, { unidad: 'ataques' });
  assert.ok(!svg.includes('linea-tope'));
  assert.ok(!svg.includes('serie-pt-anomalia'));
});

test('con tope se dibuja la línea punteada y el rótulo con el valor', () => {
  const w = cargar();
  const svg = w.__t.lineChartSvg([miembro([16, 12, 8, 16], 'ataques')], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16 });
  assert.equal((svg.match(/class="linea-tope"/g) || []).length, 1);
  assert.ok(svg.includes('Tope: 16'));
  assert.ok(!svg.includes('serie-pt-anomalia'), 'igual al tope NO es anomalía');
});

test('la escala siempre incluye el tope aunque los datos sean menores', () => {
  const w = cargar();
  const svg = w.__t.lineChartSvg([miembro([1000, 2000, 0, 3000], 'puntaje')], 'puntaje', SEMANAS, { unidad: 'de medallas', tope: 3600 });
  assert.ok(svg.includes('Tope: 3,600') || svg.includes('Tope: 3.600') || /Tope: 3\D?600/.test(svg));
  assert.ok(/>3\D?600</.test(svg), 'el eje Y llega hasta 3600');
});

test('los valores que superan el tope salen como anomalía (rojos, con data-tope)', () => {
  const w = cargar();
  const svg = w.__t.lineChartSvg([miembro([16, 17, 20, 10], 'barcos')], 'barcos', SEMANAS, { unidad: 'barcos', tope: 16 });
  assert.equal((svg.match(/serie-pt-anomalia/g) || []).length, 2, 'solo 17 y 20 (16 exacto no cuenta)');
  assert.equal((svg.match(/data-tope="16"/g) || []).length, 2);
});

test('el tooltip y la etiqueta de un punto sobre el tope lo avisan; uno normal no', () => {
  const w = cargar();
  const document = w.document;
  const normal = document.createElement('circle');
  Object.assign(normal.dataset, { nombre: 'Chistris', tag: '#2GG8PJ8GC', valor: '10', clan: 'Terna', semana: '28/09/2026', unidad: 'barcos' });
  const anomalo = document.createElement('circle');
  Object.assign(anomalo.dataset, { nombre: 'Chistris', tag: '#2GG8PJ8GC', valor: '20', clan: 'Terna', semana: '21/09/2026', unidad: 'barcos', tope: '16' });
  assert.ok(!w.__t.htmlTooltipPuntoIngreso(normal).includes('Supera el tope'));
  assert.ok(!w.__t.etiquetaPuntoIngreso(normal).includes('supera el tope'));
  assert.ok(w.__t.htmlTooltipPuntoIngreso(anomalo).includes('Supera el tope de 16'));
  assert.ok(w.__t.etiquetaPuntoIngreso(anomalo).includes('supera el tope de 16'));
});

test('cada punto lleva el clan ACTUAL del miembro (data-clan-actual) aparte del clan de ese registro', () => {
  const w = cargar();
  const m = miembro([16, 12, 8, 16], 'ataques');
  m.clan = 'Terna';
  m.historialSemanal[0].clan = 'Amazing Perú ™';
  const svg = w.__t.lineChartSvg([m], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16 });
  assert.equal((svg.match(/data-clan-actual="Terna"/g) || []).length, 4);
  assert.ok(svg.includes('data-clan="Amazing Perú ™"'), 'el clan del registro se conserva');
});

test('el tooltip muestra el clan actual a la derecha del tag y mantiene el clan del registro en la segunda línea', () => {
  const w = cargar();
  const pt = w.document.createElement('circle');
  Object.assign(pt.dataset, { nombre: 'Linkrez', tag: '#8QGUVJ08G', clanActual: 'Terna', valor: '16', clan: 'Amazing Perú ™', semana: '26/07/2026', unidad: 'ataques' });
  const html = w.__t.htmlTooltipPuntoIngreso(pt);
  const iTag = html.indexOf('(#8QGUVJ08G)'), iActual = html.indexOf('Terna'), iBr = html.indexOf('<br>');
  assert.ok(iTag >= 0 && iActual > iTag && iActual < iBr, 'Terna va después del tag y en la primera línea');
  assert.ok(html.slice(iBr).includes('Amazing Perú ™') && html.slice(iBr).includes('26/07/2026'), 'la segunda línea conserva el clan del registro');
  assert.ok(w.__t.etiquetaPuntoIngreso(pt).includes('clan actual Terna'));
});

test('sin clan actual el tooltip queda como antes (sin separador de más)', () => {
  const w = cargar();
  const pt = w.document.createElement('circle');
  Object.assign(pt.dataset, { nombre: 'Linkrez', tag: '#8QGUVJ08G', valor: '16', clan: 'Terna', semana: '26/07/2026', unidad: 'ataques' });
  assert.ok(!w.__t.htmlTooltipPuntoIngreso(pt).includes('·</span>'));
});

// NUEVO (20-oct-2026, pedido de la usuaria): el tooltip semanal también lleva «Temporada 3, Semana 3, Jueves»
// justo antes del aviso rojo; sin esos datos no se añade nada.
test('el tooltip de Ingresos recientes muestra «Temporada, Semana, Día» antes del aviso rojo', () => {
  const w = cargar();
  const m = miembro([16, 20, 8, 16], 'ataques');
  m.historialSemanal.forEach((h, i) => Object.assign(h, { temporada: 3, semanaGuerra: i + 1, diaGuerra: 'Domingo' }));
  const svg = w.__t.lineChartSvg([m], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16 });
  const cont = w.document.createElement('div');
  cont.innerHTML = svg;
  const pt = cont.querySelector('.serie-pt-anomalia');
  assert.ok(pt, 'el 20 debe salir como anomalía');
  const tip = w.__t.htmlTooltipPuntoIngreso(pt);
  assert.ok(tip.includes('Temporada 3, Semana 2, Domingo'));
  assert.ok(tip.indexOf('Temporada 3, Semana 2, Domingo') < tip.indexOf('Supera el tope de 16'));
  assert.ok(w.__t.etiquetaPuntoIngreso(pt).includes('Temporada 3, Semana 2, Domingo'));
});

test('sin temporada, semana o día el tooltip de Ingresos recientes no añade la línea', () => {
  const w = cargar();
  const cont = w.document.createElement('div');
  cont.innerHTML = w.__t.lineChartSvg([miembro([16, 20, 8, 16], 'ataques')], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16 });
  const pt = cont.querySelector('.serie-pt-anomalia');
  assert.ok(!w.__t.htmlTooltipPuntoIngreso(pt).includes('Temporada'));
  assert.ok(!w.__t.etiquetaPuntoIngreso(pt).includes('Temporada'));
});

// NUEVO (20-oct-2026, pedido de la usuaria): sombreado ligero e intercalado por temporada en Ingresos recientes.
test('Ingresos recientes sombrea las temporadas pares detrás de la grilla', () => {
  const w = cargar();
  // Semanas de septiembre (par) y octubre (impar); septiembre 2026 va del 7/9 al 4/10.
  const semanas = ['07/09/2026', '14/09/2026', '21/09/2026', '28/09/2026', '05/10/2026', '12/10/2026'];
  const m = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna', historialSemanal: semanas.map(semana => ({ semana, clan: 'Terna', ataques: 8 })) };
  const svg = w.__t.lineChartSvg([m], 'ataques', semanas, { unidad: 'ataques' });
  assert.equal((svg.match(/class="banda-temporada"/g) || []).length, 1);
  assert.ok(svg.indexOf('banda-temporada') < svg.indexOf('ing-grid-line'));
});
