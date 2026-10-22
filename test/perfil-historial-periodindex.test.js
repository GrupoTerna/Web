'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (21-oct-2026, pedido de la usuaria, caso Chistris #2GG8PJ8GC): historialRanking ahora trae `periodIndex`, `ataquesHoy`
// y días con `ranking: null`. Se prueba con las funciones REALES del <script> inline de perfil.html (se extraen por nombre,
// igual que perfil-copas-grafica.test.js):
//  1. Jueves y viernes con la MISMA fecha (04/09/2026): con periodIndex se separan en 03/09 y 04/09 (antes el viernes pisaba al jueves y salían 8 ataques).
//  2. Primer día de la semana con el acumulado entero (6) y AtaquesHoy creíble (4): el día muestra 4, no 6.
//  3. Si la resta del acumulado ya es creíble, manda la resta aunque AtaquesHoy diga otra cosa.
//  4. La gráfica de Ranking no dibuja los días con `ranking: null`.
// LÍMITE: prueba la lógica de ubicación de días y de valores diarios, no cómo se ve en un navegador.
// [→ Contexto_Base_Web.md §PF159]

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function _valoresDiariosDesdeAcumulado'));
assert.ok(grande, 'no se encontró _valoresDiariosDesdeAcumulado en un <script> inline de perfil.html');

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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil',
  'fmtFechaLargaDDMMYYYYPerfil', 'ordenarHistorialPorSemana', '_periodIndexRegistro', '_historialDiasGuerra', '_valoresDiariosDesdeAcumulado', 'renderRankingChart'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst TOPE_ATAQUES_DIA = 4; const COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { _historialDiasGuerra, _valoresDiariosDesdeAcumulado, renderRankingChart };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="mRankingChart"></div>');
  window.eval(CODIGO);
  return window;
}

// Registro como lo manda el backend. `semana` puede traer hora (así vienen las fechas del Backup).
const reg = (semana, periodIndex, extra) => Object.assign({ semana, periodIndex, ranking: 45, ataques: 4, ataquesHoy: 4, puntaje: 0, barcos: 0 }, extra || {});

test('jueves capturado de madrugada del viernes y viernes con la misma fecha: con periodIndex quedan en días distintos', () => {
  const w = cargar();
  const salida = w.__t._historialDiasGuerra([
    reg('03/09/2026 04:53:36', 30, { ataques: 1, ataquesHoy: 1 }),   // miércoles (entrenamiento): se descarta
    reg('04/09/2026 04:54:39', 31, { ataques: 4 }),                  // jueves, con fecha del viernes
    reg('04/09/2026 21:26:24', 32, { ataques: 8, ataquesHoy: 4 })    // viernes
  ]);
  // [...x]: el arreglo nace en el contexto de jsdom y deepEqual compara prototipos; se copia al contexto de la prueba.
  assert.deepEqual([...salida.map(h => h.semana)], ['03/09/2026', '04/09/2026'], 'jueves 03/09 y viernes 04/09');
  assert.deepEqual([...salida.map(h => h.ataques)], [4, 8]);
});

test('sin periodIndex (backend anterior) el viernes pisa al jueves: es el comportamiento que se corrige', () => {
  const w = cargar();
  const salida = w.__t._historialDiasGuerra([
    reg('04/09/2026 04:54:39', undefined, { ataques: 4 }),
    reg('04/09/2026 21:26:24', undefined, { ataques: 8 })
  ]);
  assert.equal(salida.length, 1, 'sin periodIndex solo queda un registro para el 04/09');
});

test('primer día de la semana con el acumulado entero y AtaquesHoy creíble: muestra AtaquesHoy', () => {
  const w = cargar();
  // Viernes 05/06/2026 sin fila del jueves: acumulado 6, AtaquesHoy 4.
  const diarios = w.__t._valoresDiariosDesdeAcumulado([
    reg('05/06/2026', 4, { ataques: 6, ataquesHoy: 4 }),
    reg('06/06/2026', 5, { ataques: 10, ataquesHoy: 4 })
  ], 'ataques');
  assert.deepEqual(diarios.map(h => h.ataques), [4, 4]);
});

test('con el jueves presente la resta ya es creíble y manda la resta, aunque AtaquesHoy diga otra cosa', () => {
  const w = cargar();
  const diarios = w.__t._valoresDiariosDesdeAcumulado([
    reg('04/06/2026', 3, { ataques: 2, ataquesHoy: 3 }),
    reg('05/06/2026', 4, { ataques: 6, ataquesHoy: 1 })
  ], 'ataques');
  assert.deepEqual(diarios.map(h => h.ataques), [2, 4], 'jueves 2 y viernes 6-2=4');
});

test('si AtaquesHoy tampoco es creíble (más de 4) o falta, se deja el valor calculado', () => {
  const w = cargar();
  const conBasura = w.__t._valoresDiariosDesdeAcumulado([reg('05/06/2026', 4, { ataques: 6, ataquesHoy: 9 })], 'ataques');
  assert.equal(conBasura[0].ataques, 6, 'AtaquesHoy 9 se ignora');
  const sinDato = w.__t._valoresDiariosDesdeAcumulado([reg('05/06/2026', 4, { ataques: 6, ataquesHoy: null })], 'ataques');
  assert.equal(sinDato[0].ataques, 6, 'AtaquesHoy null se ignora');
});

test('AtaquesHoy no cambia las otras métricas (puntaje, barcos)', () => {
  const w = cargar();
  const diarios = w.__t._valoresDiariosDesdeAcumulado([reg('05/06/2026', 4, { puntaje: 900, ataquesHoy: 1 })], 'puntaje');
  assert.equal(diarios[0].puntaje, 900);
});

test('la gráfica de Ranking no dibuja los días con ranking null', () => {
  const w = cargar();
  w.__t.renderRankingChart({ historialRanking: [
    reg('01/10/2026', 31, { ranking: 45 }),
    reg('02/10/2026', 32, { ranking: null }),
    reg('03/10/2026', 33, { ranking: 43 })
  ] });
  const salida = w.document.getElementById('mRankingChart').innerHTML;
  assert.ok(salida.includes('<svg'), 'dibuja un SVG con los días que sí tienen Ranking');
  assert.ok(!salida.includes('#0'), 'ningún punto con ranking 0');
});

test('si todos los días vienen sin Ranking, la gráfica de Ranking muestra el aviso y no una línea vacía', () => {
  const w = cargar();
  w.__t.renderRankingChart({ historialRanking: [reg('01/10/2026', 31, { ranking: null })], rankingClan: 44 });
  const salida = w.document.getElementById('mRankingChart').innerHTML;
  assert.ok(salida.includes('chart-empty'), 'muestra el aviso de que no hay historial');
});
