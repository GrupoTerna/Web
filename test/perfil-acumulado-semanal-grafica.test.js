'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026, pedido de la usuaria): en las gráficas «Ataques / Medallas / Barcos por semana» de
// perfil.html hay una segunda serie con los ACUMULADOS de la semana: un punto por domingo, unidos de
// domingo a domingo (nunca con los puntos diarios), con radio menor y dibujados encima de los diarios
// para que, si coinciden, no se pierda ninguno. Tienen su propio tope semanal (16 / 3600 / 16).
// Se extraen del <script> inline REAL las funciones por nombre. LÍMITE: SVG con DOM simulado, no un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function perfilLineChartSvg'));
assert.ok(grande, 'no se encontró perfilLineChartSvg en perfil.html');

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
  "\nconst COLOR_SERIE_PERFIL = '#a239ff'; const COLOR_SERIE_ACUMULADO_PERFIL = '#3ddc97'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { renderMetricaSemanal, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'],
    '<section id="mChartCard"><div id="mChart"></div></section>');
  window.eval(CODIGO);
  return window;
}
const reg = (fecha, ataques, barcos, puntaje) => ({ semana: fecha, ataques, barcos, puntaje, clan: 'Terna' });
// 01/10/2026 es jueves: semana 1 = 01-04/10 (domingo 04/10), semana 2 = 08-11/10 (domingo 11/10). Contadores ACUMULADOS de cada semana.
const DOS_SEMANAS = [
  reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 5, 1700), reg('03/10/2026', 12, 9, 2600), reg('04/10/2026', 16, 13, 3500),
  reg('08/10/2026', 4, 3, 900), reg('09/10/2026', 8, 6, 1800), reg('10/10/2026', 12, 10, 2700), reg('11/10/2026', 16, 14, 3600)
];
const pintar = (w, historial, campo, opts) => {
  w.__t.renderMetricaSemanal('mChart', historial, campo, Object.assign({ tituloEje: 'Ataques' }, opts));
  return w.document.getElementById('mChart');
};
const verdes = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'acum');
const diarios = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'dia');

test('un punto por domingo con el acumulado de su semana (no el valor del día)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  const v = verdes(wrap);
  assert.equal(v.length, 2);
  assert.deepEqual(v.map(c => c.dataset.semana), ['04/10/2026', '11/10/2026']);
  assert.deepEqual(v.map(c => c.dataset.valor), ['16', '16'], 'acumulado de la semana, no los 4 del domingo');
  assert.equal(diarios(wrap).length, 8, 'los puntos diarios siguen intactos');
});

test('la línea verde une domingo con domingo: un solo tramo, sin pasar por los jueves', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  const tramos = [...wrap.querySelectorAll('path')].filter(p => p.getAttribute('stroke') === '#3ddc97');
  assert.equal(tramos.length, 1);
  const [v1, v2] = verdes(wrap);
  const m = tramos[0].getAttribute('d').match(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/);
  assert.equal(Number(m[1]), Number(v1.getAttribute('cx')));
  assert.equal(Number(m[3]), Number(v2.getAttribute('cx')));
});

test('el punto verde cae en la misma X que el punto diario del domingo, más chico y dibujado después (encima)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  const todos = [...wrap.querySelectorAll('.ing-serie-pt')];
  const domDiario = diarios(wrap).find(c => c.dataset.semana === '04/10/2026');
  const domAcum = verdes(wrap).find(c => c.dataset.semana === '04/10/2026');
  assert.equal(domAcum.getAttribute('cx'), domDiario.getAttribute('cx'));
  assert.ok(Number(domAcum.getAttribute('r')) < Number(domDiario.getAttribute('r')), 'el de arriba es más chico');
  assert.ok(todos.indexOf(domAcum) > todos.indexOf(domDiario), 'y se dibuja después');
});

test('coinciden valor del día y acumulado: los dos puntos siguen distinguibles', () => {
  const w = cargar();
  // Todo el trabajo de la semana en el domingo: valor del día = acumulado.
  const h = [reg('01/10/2026', 0, 0, 0), reg('02/10/2026', 0, 0, 0), reg('03/10/2026', 0, 0, 0), reg('04/10/2026', 4, 2, 800)];
  const wrap = pintar(w, h, 'ataques', { tope: 4, topeSemanal: 16 });
  const d = diarios(wrap).find(c => c.dataset.semana === '04/10/2026');
  const a = verdes(wrap)[0];
  assert.equal(d.dataset.valor, a.dataset.valor);
  assert.equal(d.getAttribute('cy'), a.getAttribute('cy'));
  assert.ok(Number(d.getAttribute('r')) > Number(a.getAttribute('r')));
});

test('dos líneas de tope (diario y semanal) con rótulos distintos; sin serie semanal queda «Tope»', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.equal(wrap.querySelectorAll('.linea-tope').length, 2);
  assert.ok(wrap.textContent.includes('Tope diario: 4') && wrap.textContent.includes('Tope semanal: 16'));
  const solo = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4 });
  assert.equal(solo.querySelectorAll('.linea-tope').length, 1);
  assert.ok(solo.textContent.includes('Tope: 4') && verdes(solo).length === 0);
});

test('el eje Y llega al tope semanal y la leyenda explica las dos series', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { tituloEje: 'Medallas', tope: 900, topeSemanal: 3600 });
  assert.ok(/>3\D?600</.test(wrap.innerHTML), 'el eje llega a 3600');
  assert.ok(wrap.textContent.includes('Verde = acumulado de la semana'));
  assert.ok(wrap.textContent.includes('Morado = valor de cada día'));
});

test('un acumulado semanal por encima del tope sale como anomalía y se lista', () => {
  const w = cargar();
  const h = DOS_SEMANAS.map(r => Object.assign({}, r));
  h[7].ataques = 20; // domingo 11/10: acumulado 20 > 16
  const wrap = pintar(w, h, 'ataques', { tope: 4, topeSemanal: 16 });
  const rojo = verdes(wrap).filter(c => c.classList.contains('serie-pt-anomalia'));
  assert.equal(rojo.length, 1);
  assert.equal(rojo[0].dataset.tope, '16');
  assert.ok(wrap.textContent.includes('1 semana supera el tope semanal de 16'));
  assert.ok(w.__t.htmlTooltipPuntoPerfil(rojo[0]).includes('Acumulado de la semana'));
});

test('semana en curso sin domingo: no pone punto acumulado', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS.slice(0, 6), 'ataques', { tope: 4, topeSemanal: 16 });
  assert.deepEqual(verdes(wrap).map(c => c.dataset.semana), ['04/10/2026']);
});

test('barcos: más barcos que ataques ACUMULADOS en un domingo es anomalía de la serie semanal', () => {
  const w = cargar();
  const h = DOS_SEMANAS.map(r => Object.assign({}, r));
  h[3].barcos = 15; h[3].ataques = 14; // domingo 04/10: 15 barcos > 14 ataques acumulados
  const wrap = pintar(w, h, 'barcos', { tituloEje: 'Barcos', vsAtaques: true, topeSemanal: 16 });
  const rojo = verdes(wrap).filter(c => c.dataset.excedeAtaques);
  assert.equal(rojo.length, 1);
  assert.equal(rojo[0].dataset.excedeAtaques, '14');
  assert.ok(wrap.textContent.includes('1 semana tiene más barcos que ataques acumulados'));
  assert.ok(w.__t.htmlTooltipPuntoPerfil(rojo[0]).includes('ataques acumulados: 14'));
});

test('el teclado distingue las dos series (data-serie dia/acum)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  const series = new Set([...wrap.querySelectorAll('.ing-serie-pt')].map(c => c.dataset.serie));
  assert.deepEqual([...series].sort(), ['acum', 'dia']);
});
