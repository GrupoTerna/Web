'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-nov-2026, pedido de la usuaria): «agrega la serie ataques por día (función constante) a la gráfica de ataques de
// perfil.html y una serie sobre los ataques promedio de la semana a la minigráfica de ataques en la semana; la misma lógica
// aplica para barcos y medallas».
//  - Gráfica grande (perfilLineChartSvg, opts.promedioSemana): una recta horizontal por semana a la altura del promedio por día
//    de esa semana, del primer al último día de la semana en el eje X, debajo de la serie diaria.
//  - Minigráfica (_dispersionMiniHtml, serie con `constante: true`): el promedio repetido en cada día, con línea punteada y aro hueco.
// LÍMITE: se extraen las funciones del <script> inline REAL y se mira el SVG como texto/DOM simulado, no en un navegador.

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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'filtrarUltimasTemporadasPerfil', 'barraVistaPerfilHtml', 'repintarGraficasPerfil', 'activarTooltipEjeXPerfil', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipLineaPerfil', 'htmlTooltipPuntoPerfil', 'renderMetricaSemanal'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst TOPE_ATAQUES_DIA = 4; const PERFIL_VISTA = { ultimas6: true, zoom: 1 }; const PERFIL_ZOOMS = [1, 1.5, 2, 3, 4, 6]; const PERFIL_TEMPORADAS_VISTA = 6; const PERFIL_GRAFICAS_PINTADAS = new Map(); const COLOR_SERIE_PERFIL = '#a239ff'; const COLOR_SERIE_ACUMULADO_PERFIL = '#3ddc97'; const COLOR_SERIE_PROMEDIO_PERFIL = '#00d4ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { renderMetricaSemanal, htmlTooltipLineaPerfil, htmlTooltipPuntoPerfil, etiquetaPuntoPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'],
    '<section id="mChartCard"><div id="mChart"></div></section>');
  window.eval(CODIGO);
  return window;
}
const reg = (fecha, ataques, barcos, puntaje) => ({ semana: fecha, ataques, barcos, puntaje, clan: 'Terna' });
// 01/10/2026 es jueves. Contadores ACUMULADOS de cada semana; el valor de cada día sale de la resta.
// Semana 1 (01-04/10): ataques por día 4, 4, 2, 3 = 13 → promedio 3,25. Medallas por día 800, 900, 900, 900 → promedio 875. Barcos 2, 3, 4, 4 → 3,25.
// Semana 2 (08-11/10): ataques 4, 4, 4, 4 → promedio 4. Medallas 900 cada día → 900. Barcos 4, 4, 4, 4 → 4.
const DOS_SEMANAS = [
  reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 5, 1700), reg('03/10/2026', 10, 9, 2600), reg('04/10/2026', 13, 13, 3500),
  reg('08/10/2026', 4, 4, 900), reg('09/10/2026', 8, 8, 1800), reg('10/10/2026', 12, 12, 2700), reg('11/10/2026', 16, 16, 3600)
];
const pintar = (w, historial, campo, opts) => {
  w.__t.renderMetricaSemanal('mChart', historial, campo, Object.assign({ tituloEje: 'Ataques' }, opts));
  return w.document.getElementById('mChart');
};
const prom = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'prom');
const diarios = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'dia');
const rectasProm = wrap => [...wrap.querySelectorAll('path.ing-serie-line-prom')];

test('sin opts.promedioSemana no hay serie promedio ni fila de leyenda (lo de antes no cambia)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.equal(prom(wrap).length, 0);
  assert.equal(rectasProm(wrap).length, 0);
  assert.equal(wrap.querySelectorAll('[data-serie-clave="prom"]').length, 0);
  assert.ok(!wrap.textContent.includes('promedio por día'));
});

test('ataques: una recta horizontal por semana, a la altura del promedio por día de esa semana', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promedioSemana: true });
  const puntos = prom(wrap);
  assert.deepEqual(puntos.map(c => c.dataset.valor), ['3.25', '4'], 'promedio por día: 13/4 y 16/4');
  const rectas = rectasProm(wrap);
  assert.equal(rectas.length, 2);
  rectas.forEach((r, k) => {
    const m = r.getAttribute('d').match(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/);
    assert.equal(m[2], m[4], `semana ${k + 1}: función constante, mismo Y en los dos extremos`);
    assert.equal(m[2], puntos[k].getAttribute('cy'), 'el punto del centro va a la altura de la recta');
    assert.equal(r.getAttribute('stroke'), '#00d4ff');
  });
  assert.notEqual(rectas[0].getAttribute('d').split(' ')[2], rectas[1].getAttribute('d').split(' ')[2], 'cada semana, su propia altura');
});

test('la recta va del jueves al domingo de su semana y el punto cae en el centro del tramo', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promedioSemana: true });
  const d = diarios(wrap);
  const jue1 = d.find(c => c.dataset.semana === '01/10/2026'), dom1 = d.find(c => c.dataset.semana === '04/10/2026');
  const m = rectasProm(wrap)[0].getAttribute('d').match(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/);
  assert.equal(Number(m[1]), Number(jue1.getAttribute('cx')));
  assert.equal(Number(m[3]), Number(dom1.getAttribute('cx')));
  assert.ok(Math.abs(Number(prom(wrap)[0].getAttribute('cx')) - (Number(m[1]) + Number(m[3])) / 2) < 0.06);
});

test('el promedio se dibuja debajo de la serie diaria (rectas y puntos antes que los diarios)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promedioSemana: true });
  const todos = [...wrap.querySelectorAll('path, circle')];
  const ultimoProm = Math.max(...[...rectasProm(wrap), ...prom(wrap)].map(e => todos.indexOf(e)));
  const primeroDia = Math.min(...diarios(wrap).map(e => todos.indexOf(e)), ...[...wrap.querySelectorAll('path.ing-serie-line[data-serie-clave="dia"]')].map(e => todos.indexOf(e)));
  assert.ok(ultimoProm < primeroDia, 'el promedio queda debajo del valor de cada día');
  assert.equal(diarios(wrap).length, 8, 'los puntos diarios siguen intactos');
});

test('medallas y barcos: la misma lógica (promedio por día de cada semana)', () => {
  const w = cargar();
  const med = pintar(w, DOS_SEMANAS, 'puntaje', { tituloEje: 'Medallas', tope: 900, topeSemanal: 3600, promedioSemana: true });
  assert.deepEqual(prom(med).map(c => c.dataset.valor), ['875', '900']);
  const w2 = cargar();
  const bar = pintar(w2, DOS_SEMANAS, 'barcos', { tituloEje: 'Barcos', vsAtaques: true, topeSemanal: 16, promedioSemana: true });
  assert.deepEqual(prom(bar).map(c => c.dataset.valor), ['3.25', '4']);
});

test('semana en curso: promedia solo los días jugados; con un solo día lleva una marca corta', () => {
  const w = cargar();
  // Semana 1 completa y semana 2 con solo jueves (3) y viernes (5): promedio 4. Semana 3 con solo el jueves (2): una marca corta.
  const h = [
    reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 5, 1700), reg('03/10/2026', 12, 9, 2600), reg('04/10/2026', 16, 13, 3500),
    reg('08/10/2026', 3, 1, 500), reg('09/10/2026', 8, 3, 1500),
    reg('15/10/2026', 2, 1, 400)
  ];
  const wrap = pintar(w, h, 'ataques', { tope: 4, topeSemanal: 16, promedioSemana: true });
  assert.deepEqual(prom(wrap).map(c => c.dataset.valor), ['4', '4', '2']);
  const segunda = rectasProm(wrap)[1].getAttribute('d').match(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/);
  const dSem2 = diarios(wrap).filter(c => ['08/10/2026', '09/10/2026'].includes(c.dataset.semana)).map(c => Number(c.getAttribute('cx')));
  assert.deepEqual([Number(segunda[1]), Number(segunda[3])], dSem2, 'semana en curso: la recta cubre solo jueves y viernes, no el domingo estimado');
  const ultima = rectasProm(wrap)[2].getAttribute('d').match(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/);
  assert.ok(Math.abs((Number(ultima[3]) - Number(ultima[1])) - 16) < 0.2, 'un solo día: marca de 16 unidades centrada en el punto');
});

test('el tooltip de la recta y el del punto dicen «Promedio por día de la semana» con el valor', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promedioSemana: true });
  const hit = wrap.querySelector('path.ing-serie-hit[data-serie-hit="prom"]');
  assert.ok(hit, 'falta el tramo sensible de la recta del promedio');
  const t = w.__t.htmlTooltipLineaPerfil(hit);
  assert.match(t, /Promedio por día de la semana: 3\.25 ataques/);
  assert.match(t, /Clan actual: Terna/);
  const pt = prom(wrap)[0];
  assert.match(w.__t.htmlTooltipPuntoPerfil(pt), /3\.25 ataques/);
  assert.match(w.__t.etiquetaPuntoPerfil(pt), /Promedio por día de la semana/);
  // Las líneas de siempre (sin data-serie-et) conservan su tooltip de antes: solo nombre, tag y clan.
  const hitDia = wrap.querySelector('path.ing-serie-hit[data-serie-hit="dia"]');
  assert.ok(!/Promedio/.test(w.__t.htmlTooltipLineaPerfil(hitDia)));
});

test('la leyenda explica la serie celeste solo cuando está activada', () => {
  const w = cargar();
  const con = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promedioSemana: true });
  assert.match(con.textContent, /Celeste = promedio por día de cada semana/);
  const w2 = cargar();
  const sin = pintar(w2, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.ok(!/Celeste/.test(sin.textContent));
});

test('renderMetricasSemanales activa el promedio en las tres gráficas (ataques, medallas y barcos)', () => {
  const ini = grande.indexOf('function renderMetricasSemanales(');
  assert.ok(ini >= 0);
  const cuerpo = extraerFuncion(grande, 'renderMetricasSemanales');
  assert.equal((cuerpo.match(/promedioSemana: true/g) || []).length, 3);
  for (const id of ['mAtaquesChart', 'mPuntajeChart', 'mBarcosChart']) assert.ok(cuerpo.includes(`'${id}'`));
});

// ---------------------------------------------------------------- minigráficas (_dispersionMiniHtml) y su armado en renderExtendido

const fuenteMini = scripts.find(t => t.includes('function _dispersionMiniHtml('));
function cargarMini(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="x"></div>');
  window.eval(extraerFuncion(fuenteMini, '_dispersionMiniHtml') + '\nwindow.__mini = _dispersionMiniHtml;');
  return window;
}
const DIAS = ['J', 'V', 'S', 'D'];
const circulos = svg => [...svg.matchAll(/<circle class="(md-punto[^"]*)"[^>]*? r="([\d.]+)" fill="([^"]+)"/g)].map(m => ({ clase: m[1], r: Number(m[2]), relleno: m[3] }));

test('minigráfica: la serie constante se dibuja primero, con aro hueco (r 7), línea punteada y chip hueco', () => {
  const w = cargarMini();
  const svg = w.__mini('Ataques y barcos por día', DIAS, [
    { etiqueta: 'Ataques', color: 'var(--gold)', valores: [4, 4, 2, 3] },
    { etiqueta: 'Barcos', color: 'var(--purple)', valores: [2, 3, 4, 4] },
    { etiqueta: 'Ataques promedio', color: 'var(--gold)', constante: true, valores: [3.25, 3.25, 3.25, 3.25] }
  ], { icono: '⚔️' });
  const c = circulos(svg);
  assert.equal(c.length, 12);
  // Por cada día: primero el aro del promedio y luego los dos puntos (Ataques r 5, Barcos r 3,5).
  for (let d = 0; d < 4; d++){
    assert.deepEqual(c[d * 3], { clase: 'md-punto md-punto-cte', r: 7, relleno: 'none' });
    assert.deepEqual([c[d * 3 + 1].r, c[d * 3 + 2].r], [5, 3.5]);
  }
  assert.equal((svg.match(/class="md-linea md-linea-cte"/g) || []).length, 1, 'una línea punteada para el promedio');
  assert.equal((svg.match(/<path class="md-linea" /g) || []).length, 2, 'las dos series de siempre conservan su línea');
  assert.match(svg, /<span class="mini-disp-chip mini-disp-chip-cte" style="--c:var\(--gold\)"><i><\/i>Ataques promedio<\/span>/);
  assert.match(svg, /aria-label="[^"]*J: Ataques 4, Barcos 2, Ataques promedio 3\.25/);
});

test('minigráfica: sin series constantes el SVG es el de siempre (sin clases nuevas)', () => {
  const w = cargarMini();
  const svg = w.__mini('Ataques y barcos por día', DIAS, [
    { etiqueta: 'Ataques', color: 'var(--gold)', valores: [4, 4, 2, 3] },
    { etiqueta: 'Barcos', color: 'var(--purple)', valores: [2, 3, 4, 4] }
  ]);
  assert.ok(!/md-punto-cte|md-linea-cte|mini-disp-chip-cte/.test(svg));
});

test('minigráfica: el promedio constante no cuenta como coincidencia del acumulado (el aro grande sigue solo cuando coincide con el valor diario)', () => {
  const w = cargarMini();
  const svg = w.__mini('Medallas de guerra por día', DIAS, [
    { etiqueta: 'Medallas de guerra', color: 'var(--gold)', valores: [700, 800, 900, 600] },
    { etiqueta: 'Acumulado', color: 'var(--purple)', acumulado: true, valores: [700, 1500, 2400, 3000] },
    { etiqueta: 'Medallas promedio', color: 'var(--gold)', constante: true, valores: [750, 750, 750, 750] }
  ], { icono: '🔥' });
  const c = circulos(svg);
  // Orden por día: promedio (r 7), acumulado, diario. Solo el jueves (700 y 700) coincide: acumulado r 6,5; el resto, r 5.
  assert.deepEqual(c.filter(p => p.relleno === 'var(--purple)').map(p => p.r), [6.5, 5, 5, 5]);
});

test('renderExtendido arma «Ataques promedio», «Barcos promedio» y «Medallas promedio» con la media de los días jugados', () => {
  const src = scripts.find(t => t.includes('function renderExtendido('));
  const cuerpo = extraerFuncion(src, 'renderExtendido');
  for (const et of ['Ataques promedio', 'Barcos promedio', 'Medallas promedio']) assert.ok(cuerpo.includes(`'${et}'`), `falta la serie «${et}»`);
  // Se ejecuta el cálculo REAL (la flecha local _serieConstante) con un día sin dato (null: no jugado) y un 0 real.
  const m = cuerpo.match(/const _serieConstante = [\s\S]*?\n  \};\n/);
  assert.ok(m, 'no se encontró _serieConstante');
  const serie = new Function(`${m[0]}\nreturn _serieConstante;`)();
  const a = serie('Ataques promedio', 'var(--gold)', [4, 0, null, 3]);
  assert.equal(a.constante, true);
  assert.deepEqual(a.valores, [2.33, 2.33, 2.33, 2.33], 'el null (día no jugado) no cuenta; el 0 real sí: (4+0+3)/3');
  assert.deepEqual(serie('x', 'c', [null, null]).valores, [0, 0], 'sin ningún dato: 0, sin NaN');
});
