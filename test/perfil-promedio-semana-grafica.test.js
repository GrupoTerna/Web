'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-nov-2026, pedido de la usuaria): «agrega la serie ataques por día (función constante) a la gráfica de ataques de
// perfil.html y una serie sobre los ataques promedio de la semana a la minigráfica de ataques en la semana; la misma lógica
// aplica para barcos y medallas». ACLARADO el 24-nov-2026:
//  - Minigráfica (_dispersionMiniHtml, serie con `constante: true`) y cuadritos de Ingresos recientes: el promedio de los días CON DATO de esa semana, repetido en cada día.
//  - Gráfica grande (perfilLineChartSvg, opts.promedioGeneral): UNA recta constante con el promedio general de todos los registros diarios con dato, de punta a punta.
//    Solo cuentan las semanas POSTERIORES a la última que supera algún tope (ataques 4 al día / 16 a la semana, medallas 900 / 3600, barcos 4 / 16, o más barcos que ataques);
//    se descarta la semana completa y el corte es común a las tres métricas (renderMetricasSemanales, dos pasadas).
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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'filtrarUltimasTemporadasPerfil', 'barraVistaPerfilHtml', 'repintarGraficasPerfil', 'activarTooltipEjeXPerfil', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipLineaPerfil', 'htmlTooltipPuntoPerfil', 'renderMetricaSemanal', 'renderMetricasSemanales'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst TOPE_ATAQUES_DIA = 4; const TOPE_ATAQUES_SEMANA_PERFIL = 16; const TOPE_MEDALLAS_DIA = 900; const TOPE_MEDALLAS_SEMANA_PERFIL = 3600; const TOPE_BARCOS_SEMANA_PERFIL = 16; const PERFIL_VISTA = { ultimas6: true, zoom: 1 }; const PERFIL_ZOOMS = [1, 1.5, 2, 3, 4, 6]; const PERFIL_TEMPORADAS_VISTA = 6; const PERFIL_GRAFICAS_PINTADAS = new Map(); const COLOR_SERIE_PERFIL = '#a239ff'; const COLOR_SERIE_ACUMULADO_PERFIL = '#3ddc97'; const COLOR_SERIE_PROMEDIO_PERFIL = '#00d4ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { renderMetricaSemanal, renderMetricasSemanales, perfilLineChartSvg, htmlTooltipLineaPerfil, htmlTooltipPuntoPerfil, etiquetaPuntoPerfil };';

const HTML_UNA = '<section id="mChartCard"><div id="mChart"></div></section>';
const HTML_TRES = ['mAtaquesChart', 'mPuntajeChart', 'mBarcosChart'].map(id => `<section id="${id}Card"><div id="${id}"></div></section>`).join('');
function cargar(html){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], html || HTML_UNA);
  window.eval(CODIGO);
  return window;
}
const reg = (fecha, ataques, barcos, puntaje, temporada) => Object.assign({ semana: fecha, ataques, barcos, puntaje, clan: 'Terna' }, temporada != null ? { temporada } : {});
// 01/10/2026 es jueves. Contadores ACUMULADOS de cada semana; el valor de cada día sale de la resta.
// Semana 1 (01-04/10): ataques por día 4, 4, 2, 3. Medallas por día 800, 900, 900, 900. Barcos 2, 3, 2, 3 (nunca más que los ataques de ese día).
// Semana 2 (08-11/10): 4 ataques, 900 medallas y 4 barcos cada día.
const SEM1 = [reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 5, 1700), reg('03/10/2026', 10, 7, 2600), reg('04/10/2026', 13, 10, 3500)];
const SEM2 = [reg('08/10/2026', 4, 4, 900), reg('09/10/2026', 8, 8, 1800), reg('10/10/2026', 12, 12, 2700), reg('11/10/2026', 16, 16, 3600)];
const DOS_SEMANAS = SEM1.concat(SEM2);
// Época en que RoyaleAPI publicaba un acumulado por semana (un registro el domingo 27/09): lo que trae sale como «diario» muy por encima de los topes.
const SEMANAL_VIEJA = [reg('27/09/2026', 14, 6, 3000)];
const pintar = (w, historial, campo, opts) => {
  w.__t.renderMetricaSemanal('mChart', historial, campo, Object.assign({ tituloEje: 'Ataques' }, opts));
  return w.document.getElementById('mChart');
};
const pintarTres = (w, historial) => {
  w.__t.renderMetricasSemanales({ historialRanking: historial });
  const g = id => w.document.getElementById(id);
  return { ataques: g('mAtaquesChart'), medallas: g('mPuntajeChart'), barcos: g('mBarcosChart') };
};
const prom = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'prom');
const diarios = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'dia');
const rectasProm = wrap => [...wrap.querySelectorAll('path.ing-serie-line-prom')];
const valorProm = wrap => { const p = prom(wrap); return p.length ? p[0].dataset.valor : null; };

test('sin opts.promediar no hay serie promedio ni fila de leyenda (lo de antes no cambia)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.equal(prom(wrap).length, 0);
  assert.equal(rectasProm(wrap).length, 0);
  assert.equal(wrap.querySelectorAll('[data-serie-clave="prom"]').length, 0);
  assert.ok(!/Celeste|Promedio general/.test(wrap.textContent));
});

test('sin ningún valor sobre los topes: UNA sola recta con el promedio de todos los días con dato', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promediar: true });
  assert.equal(rectasProm(wrap).length, 1, 'una sola recta, no una por semana');
  assert.equal(prom(wrap).length, 1);
  assert.equal(valorProm(wrap), '3.63', '(4+4+2+3+4+4+4+4)/8 = 3,625 → 3,63');
  const d = diarios(wrap);
  const m = rectasProm(wrap)[0].getAttribute('d').match(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/);
  assert.equal(m[2], m[4], 'función constante: mismo Y en los dos extremos');
  assert.equal(m[2], prom(wrap)[0].getAttribute('cy'));
  assert.equal(Number(m[1]), Number(d[0].getAttribute('cx')), 'empieza en el primer día de la gráfica');
  assert.equal(Number(m[3]), Number(d[d.length - 1].getAttribute('cx')), 'termina en el último día de la gráfica');
  assert.equal(rectasProm(wrap)[0].getAttribute('stroke'), '#00d4ff');
});

test('el promedio se dibuja debajo de la serie diaria (recta y punto antes que los diarios)', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promediar: true });
  const todos = [...wrap.querySelectorAll('path, circle')];
  const ultimoProm = Math.max(...[...rectasProm(wrap), ...prom(wrap)].map(e => todos.indexOf(e)));
  const primeroDia = Math.min(...diarios(wrap).map(e => todos.indexOf(e)), ...[...wrap.querySelectorAll('path.ing-serie-line[data-serie-clave="dia"]')].map(e => todos.indexOf(e)));
  assert.ok(ultimoProm < primeroDia, 'el promedio queda debajo del valor de cada día');
  assert.equal(diarios(wrap).length, 8, 'los puntos diarios siguen intactos');
});

test('con un registro semanal de la época vieja (muy sobre los topes) solo cuentan las semanas posteriores', () => {
  const w = cargar(HTML_TRES);
  const g = pintarTres(w, SEMANAL_VIEJA.concat(DOS_SEMANAS));
  // Ataques: 14 en un día (> 4) y acumulado 14 el 27/09 → esa semana se descarta; el promedio parte del 01/10.
  assert.equal(valorProm(g.ataques), '3.63');
  assert.equal(valorProm(g.medallas), '887.5', '(800+900+900+900+900+900+900+900)/8');
  assert.equal(valorProm(g.barcos), '3.25', '(2+3+2+3+4+4+4+4)/8');
  assert.match(g.ataques.textContent, /Promedio general: 3\.63 ataques por día \(8 días con dato desde el 01\/10\/2026\)/);
  assert.match(g.medallas.textContent, /Promedio general: 887\.5 de medallas por día \(8 días con dato desde el 01\/10\/2026\)/);
});

test('el corte es común: un exceso solo en barcos descarta la misma semana en ataques y medallas', () => {
  const w = cargar(HTML_TRES);
  // Semana 1 con 7 barcos en un día (acumulado 2 → 9): supera el 4 diario de barcos y los ataques de ese día (4). Ataques y medallas están dentro de sus topes.
  const sem1 = [reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 9, 1700), reg('03/10/2026', 10, 9, 2600), reg('04/10/2026', 13, 9, 3500)]; // barcos: 2, 7, 0, 0
  const g = pintarTres(w, sem1.concat(SEM2));
  assert.equal(valorProm(g.ataques), '4', 'solo cuenta la semana 2 (4 ataques por día)');
  assert.equal(valorProm(g.medallas), '900');
  assert.equal(valorProm(g.barcos), '4');
  assert.match(g.ataques.textContent, /\(4 días con dato desde el 08\/10\/2026\)/);
});

test('un acumulado semanal sobre el tope también corta (ataques con 17 al domingo, sin ningún día sobre 4 por la resta)', () => {
  const w = cargar(HTML_TRES);
  // Dos registros por semana (viernes y domingo): acumulado 8 y 17; el día sale 8 y 9 (> 4) y además 17 > 16 semanal.
  const h = [reg('02/10/2026', 8, 2, 800), reg('04/10/2026', 17, 4, 1700)].concat(SEM2);
  const g = pintarTres(w, h);
  assert.match(g.ataques.textContent, /desde el 08\/10\/2026/);
});

test('si la última semana con dato ya supera un tope, no hay promedio general y se dice por qué', () => {
  const w = cargar(HTML_TRES);
  const g = pintarTres(w, SEM1.concat([reg('08/10/2026', 5, 4, 900), reg('09/10/2026', 8, 8, 1800)]));
  for (const wrap of [g.ataques, g.medallas, g.barcos]){
    assert.equal(rectasProm(wrap).length, 0);
    assert.equal(prom(wrap).length, 0);
    assert.match(wrap.textContent, /Sin promedio general: ninguna semana con dato es posterior a la última que supera algún tope/);
    assert.ok(!/Celeste/.test(wrap.textContent), 'sin recta no hay fila de leyenda');
  }
});

test('el promedio sale de TODO el historial, aunque la vista «últimas 6 temporadas» solo dibuje las últimas', () => {
  const w = cargar(HTML_TRES);
  // 48 semanas (jueves a domingo) desde el 02/10/2025: las primeras 8 con 2 ataques por día y las otras 40 con 4. Promedio de las 192 jornadas: (32 x 2 + 160 x 4) / 192 = 3,67.
  const h = [];
  const inicio = new Date(2025, 9, 2); // jueves
  for (let s = 0; s < 48; s++){
    const por = s < 8 ? 2 : 4;
    for (let d = 0; d < 4; d++){
      const f = new Date(inicio); f.setDate(f.getDate() + 7 * s + d);
      const txt = String(f.getDate()).padStart(2, '0') + '/' + String(f.getMonth() + 1).padStart(2, '0') + '/' + f.getFullYear();
      h.push(reg(txt, por * (d + 1), 1 * (d + 1), 600 * (d + 1)));
    }
  }
  const g = pintarTres(w, h);
  assert.equal(valorProm(g.ataques), '3.67');
  assert.match(g.ataques.textContent, /\(192 días con dato desde el 02\/10\/2025\)/);
  assert.ok(diarios(g.ataques).length < 192, 'la vista de las últimas 6 temporadas dibuja menos puntos que el historial');
});

test('el tooltip de la recta y el del punto dicen «Promedio general por día» con el valor', () => {
  const w = cargar();
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promediar: true });
  const hit = wrap.querySelector('path.ing-serie-hit[data-serie-hit="prom"]');
  assert.ok(hit, 'falta el tramo sensible de la recta del promedio');
  const t = w.__t.htmlTooltipLineaPerfil(hit);
  assert.match(t, /Promedio general por día: 3\.63 ataques/);
  assert.match(t, /Clan actual: Terna/);
  const pt = prom(wrap)[0];
  assert.match(w.__t.htmlTooltipPuntoPerfil(pt), /3\.63 ataques/);
  assert.match(w.__t.htmlTooltipPuntoPerfil(pt), /8 días desde el 01\/10\/2026/);
  assert.match(w.__t.etiquetaPuntoPerfil(pt), /Promedio general por día/);
  const hitDia = wrap.querySelector('path.ing-serie-hit[data-serie-hit="dia"]');
  assert.ok(!/Promedio/.test(w.__t.htmlTooltipLineaPerfil(hitDia)), 'las líneas de siempre conservan su tooltip');
});

test('la leyenda explica la serie celeste solo cuando hay promedio', () => {
  const w = cargar();
  const con = pintar(w, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16, promediar: true });
  assert.match(con.textContent, /Celeste = promedio general por día \(recta constante; 8 días con dato desde el 01\/10\/2026\)/);
  const w2 = cargar();
  const sin = pintar(w2, DOS_SEMANAS, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.ok(!/Celeste/.test(sin.textContent));
});

test('el eje Y incluye el promedio aunque ningún punto dibujado lo alcance (la recta nunca se sale de la gráfica)', () => {
  const w = cargar();
  // Todos los puntos valen 1 pero el promedio general (calculado sobre todo el historial) es 9: el eje debe subir hasta él.
  const puntos = ['01/10/2026', '02/10/2026', '03/10/2026', '04/10/2026'].map(f => ({ semana: f, valor: 1, real: true, clan: 'Terna' }));
  const cont = w.document.createElement('div');
  cont.innerHTML = w.__t.perfilLineChartSvg(puntos, { unidad: 'ataques', base: 0, promedioGeneral: { valor: 9, n: 40, desde: '01/01/2026' } });
  const svg = cont.querySelector('svg');
  assert.ok(svg, 'no se dibujó el SVG');
  const alto = Number(svg.getAttribute('viewBox').split(' ')[3]);
  const cy = Number(cont.querySelector('.ing-serie-pt-prom').getAttribute('cy'));
  const cyDia = Number(cont.querySelector('.ing-serie-pt[data-serie="dia"]').getAttribute('cy'));
  assert.ok(cy >= 20 && cy < cyDia && cy < alto, `la recta (${cy}) cae dentro del lienzo y por encima de los puntos (${cyDia})`);
});

test('renderMetricasSemanales corre las tres métricas con el promedio general y un corte común (dos pasadas)', () => {
  const cuerpo = extraerFuncion(grande, 'renderMetricasSemanales');
  assert.equal((cuerpo.match(/promediar: true/g) || []).length, 3);
  for (const id of ['mAtaquesChart', 'mPuntajeChart', 'mBarcosChart']) assert.ok(cuerpo.includes(`'${id}'`));
  assert.ok(cuerpo.includes('soloCalcular: true') && cuerpo.includes('corteExceso'));
  assert.ok(!cuerpo.includes('promedioSemana'), 'ya no hay promedio por semana en las gráficas grandes');
  assert.ok(!/promedioSemana/.test(grande), 'ningún resto del promedio por semana en perfil.html');
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
