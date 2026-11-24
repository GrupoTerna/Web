'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (22-nov-2026, pedido de la usuaria: «añadir los puntos externos a las gráficas de perfil.html»; solo admins).
// En las gráficas «Ataques / Medallas / Barcos por semana» de perfil.html hay una tercera serie (azul): el TOTAL de la
// semana que el jugador hizo en un clan EXTERNO, un punto por domingo y clan. webPerfil la manda como
// extendido.semanasExternas = [{ temporada, semana, fecha (domingo, dd/MM/yyyy), clan, clanTag, ataques, fame, barcos }]
// (Base/src/37_Web_API.gs, _semanasExternasDeJugadorSeguro_). Una semana jugada SOLO fuera no tiene ningún día en la hoja
// de guerra, así que se le reserva su domingo en el eje X. Se extraen del <script> inline REAL las funciones por nombre.
// LÍMITE: SVG con DOM simulado (jsdom), no un navegador.

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
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'filtrarUltimasTemporadasPerfil', 'barraVistaPerfilHtml', 'repintarGraficasPerfil', 'activarTooltipEjeXPerfil', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil', 'ataquesExternosSinDatoPerfil', 'topeSemanalExternoPerfil', 'renderMetricaSemanal', 'renderMetricasSemanales'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst TOPE_ATAQUES_DIA = 4; const TOPE_MEDALLAS_DIA = 900; const TOPE_ATAQUES_SEMANA_PERFIL = 16; const TOPE_MEDALLAS_SEMANA_PERFIL = 3600; const TOPE_BARCOS_SEMANA_PERFIL = 16; const PERFIL_ENTRENAMIENTO_CONTADO_HASTA = { temporadaRoyaleApi: 104, semana: 2 }; const TOPE_ATAQUES_SEMANA_CON_ENTRENAMIENTO_PERFIL = 28; const PERFIL_ATAQUES_SIN_DATO_HASTA_TEMPORADA_RAPI = 68; const PERFIL_ESCALA_FAMA_ANTIGUA_HASTA_TEMPORADA_RAPI = 72; const TOPE_MEDALLAS_SEMANA_ESCALA_ANTIGUA_PERFIL = 9000;" +
  " const PERFIL_VISTA = { ultimas6: true, zoom: 1 }; const PERFIL_ZOOMS = [1, 1.5, 2, 3, 4, 6]; const PERFIL_TEMPORADAS_VISTA = 6; const PERFIL_GRAFICAS_PINTADAS = new Map();" +
  " const COLOR_SERIE_PERFIL = '#a239ff'; const COLOR_SERIE_ACUMULADO_PERFIL = '#3ddc97'; const COLOR_SERIE_EXTERNA_PERFIL = '#4ea1ff'; const COLOR_SERIE_PROMEDIO_PERFIL = '#00d4ff';" +
  " let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { renderMetricaSemanal, renderMetricasSemanales, filtrarUltimasTemporadasPerfil, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil };';

function cargar(esAdmin){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'],
    '<section id="mChartCard"><div id="mChart"></div></section>' +
    ['mAtaquesChart', 'mPuntajeChart', 'mBarcosChart'].map(id => `<section id="${id}Card"><div id="${id}"></div></section>`).join(''));
  window.esAdminLogueado = () => !!esAdmin;
  window.eval(CODIGO);
  return window;
}
const reg = (fecha, ataques, barcos, puntaje) => ({ semana: fecha, ataques, barcos, puntaje, clan: 'Terna' });
// 01/10/2026 es jueves: semana 1 = 01-04/10 (domingo 04/10), semana 2 = 08-11/10 (domingo 11/10). Contadores ACUMULADOS de cada semana.
const DOS_SEMANAS = [
  reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 5, 1700), reg('03/10/2026', 12, 9, 2600), reg('04/10/2026', 16, 13, 3500),
  reg('08/10/2026', 4, 3, 900), reg('09/10/2026', 8, 6, 1800), reg('10/10/2026', 12, 10, 2700), reg('11/10/2026', 16, 14, 3600)
];
// Fila de semanasExternas tal como la manda el backend (fecha = domingo de esa semana).
const ext = (fecha, over) => Object.assign({ temporada: 38, semana: 3, fecha, clan: 'Marca Perú', clanTag: '#YJG002PR', ataques: 12, fame: 1700, barcos: 0 }, over || {});
const pintar = (w, historial, campo, opts) => {
  w.__t.renderMetricaSemanal('mChart', historial, campo, Object.assign({ tituloEje: 'Medallas', tope: 900, topeSemanal: 3600 }, opts));
  return w.document.getElementById('mChart');
};
const azules = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'ext');
const diarios = wrap => [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.serie === 'dia');

test('una semana externa es un punto azul en su domingo, con el total, el clan y el nombre de la serie', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('11/10/2026', { fame: 1700 })] });
  const p = azules(wrap);
  assert.equal(p.length, 1);
  assert.equal(p[0].dataset.semana, '11/10/2026');
  assert.equal(p[0].dataset.valor, '1700', 'medallas = fame del clan externo, tal cual (sin restar nada)');
  assert.equal(p[0].dataset.clan, 'Marca Perú');
  assert.equal(p[0].dataset.serieClave, 'ext');
  assert.equal(p[0].getAttribute('fill'), '#4ea1ff');
  assert.equal(p[0].dataset.temporada, '38');
  assert.equal(p[0].dataset.semanaGuerra, '3');
  assert.equal(p[0].dataset.diaGuerra, 'Domingo');
  const tip = w.__t.htmlTooltipPuntoPerfil(p[0]);
  assert.match(tip, /Marca Perú/);
  assert.match(tip, /Clan externo/);
  assert.match(tip, /Temporada 38, Semana 3, Domingo/);
});

test('cada gráfica toma su campo: ataques, medallas (fame) y barcos', () => {
  const w = cargar(true);
  const fila = [ext('11/10/2026', { ataques: 9, fame: 2100, barcos: 5 })];
  assert.equal(azules(pintar(w, DOS_SEMANAS, 'ataques', { tituloEje: 'Ataques', tope: 4, topeSemanal: 16, externas: fila }))[0].dataset.valor, '9');
  assert.equal(azules(pintar(w, DOS_SEMANAS, 'puntaje', { externas: fila }))[0].dataset.valor, '2100');
  assert.equal(azules(pintar(w, DOS_SEMANAS, 'barcos', { tituloEje: 'Barcos', vsAtaques: true, topeSemanal: 16, externas: fila }))[0].dataset.valor, '5');
});

test('una semana jugada solo en un clan externo reserva su domingo en el eje X y no se pierde', () => {
  const w = cargar(true);
  // 25/10/2026 (domingo) no tiene ningún día en la hoja de guerra: la semana se jugó solo fuera.
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('25/10/2026', { semana: 4, fame: 2900 })] });
  const p = azules(wrap);
  assert.equal(p.length, 1, 'el punto azul existe aunque no haya datos propios esa semana');
  const fechas = JSON.parse(wrap.querySelector('.ing-linechart-svg').getAttribute('data-xfechas'));
  assert.ok(fechas.includes('25/10/2026'), 'el domingo está en el eje X');
  assert.ok(fechas.indexOf('25/10/2026') > fechas.indexOf('11/10/2026'), 'y queda en orden cronológico');
  assert.equal(diarios(wrap).filter(c => c.dataset.semana === '25/10/2026').length, 0, 'ese día no lleva punto morado');
  // El punto azul cae justo en la x de su domingo (la misma de la letra D del eje).
  const [padL, plotW] = (wrap.querySelector('.ing-linechart-svg').getAttribute('data-xgeom') || '').split(',').map(Number);
  const cx = Number(p[0].getAttribute('cx'));
  assert.ok(cx > padL && cx <= padL + plotW + 0.01, 'dentro del área de trazado');
  const acum11 = [...wrap.querySelectorAll('.ing-serie-pt')].find(c => c.dataset.serie === 'acum' && c.dataset.semana === '11/10/2026');
  assert.ok(acum11 && cx > Number(acum11.getAttribute('cx')), 'más a la derecha que el domingo anterior');
});

test('sin externas (o sin sesión de admin) la gráfica queda como antes: sin punto azul ni leyenda azul', () => {
  const w = cargar(false);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', {});
  assert.equal(azules(wrap).length, 0);
  assert.doesNotMatch(wrap.innerHTML, /clan externo/i);
});

test('el filtro de admin vive en renderMetricasSemanales: sin sesión de admin no se dibuja aunque el dato llegue', () => {
  const extendido = { historialRanking: DOS_SEMANAS, semanasExternas: [ext('11/10/2026')] };
  const noAdmin = cargar(false);
  noAdmin.__t.renderMetricasSemanales(extendido);
  assert.equal(azules(noAdmin.document.getElementById('mPuntajeChart')).length, 0);
  assert.equal(azules(noAdmin.document.getElementById('mAtaquesChart')).length, 0);
  const admin = cargar(true);
  admin.__t.renderMetricasSemanales(extendido);
  assert.equal(azules(admin.document.getElementById('mPuntajeChart')).length, 1);
  assert.equal(azules(admin.document.getElementById('mAtaquesChart')).length, 1);
  assert.equal(azules(admin.document.getElementById('mBarcosChart')).length, 1);
});

test('filas sin fecha, con fecha ilegible o sin el dato de esa gráfica no se dibujan', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [
    ext(null), ext('no-es-fecha'), ext('11/10/2026', { fame: null }), ext('11/10/2026', { fame: undefined }), ext('04/10/2026', { fame: 800 })
  ] });
  const p = azules(wrap);
  assert.equal(p.length, 1);
  assert.equal(p[0].dataset.semana, '04/10/2026');
});

test('dos clanes externos en la misma semana dan dos puntos azules en el mismo domingo', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('11/10/2026', { fame: 900, clan: 'Clan A' }), ext('11/10/2026', { fame: 1500, clan: 'Clan B' })] });
  const p = azules(wrap);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map(c => c.dataset.clan).sort(), ['Clan A', 'Clan B']);
  assert.equal(p[0].getAttribute('cx'), p[1].getAttribute('cx'), 'mismo domingo = misma x');
  assert.notEqual(p[0].getAttribute('cy'), p[1].getAttribute('cy'));
});

test('medallas: una semana externa sobre el tope semanal es anomalía roja y la nota la nombra', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('11/10/2026', { fame: 3750, clan: 'Marca Perú' })] });
  const p = azules(wrap)[0];
  assert.equal(p.getAttribute('fill'), 'var(--danger)');
  assert.equal(p.dataset.tope, '3600');
  assert.match(wrap.innerHTML, /1 semana en un clan externo supera el tope semanal de 3[\s .,]?600/);
  assert.match(wrap.innerHTML, /Marca Perú/);
});

test('medallas: dentro del tope, la nota lo dice y el punto sigue azul', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('11/10/2026', { fame: 3000 })] });
  assert.equal(azules(wrap)[0].getAttribute('fill'), '#4ea1ff');
  assert.match(wrap.innerHTML, /Ninguna semana en un clan externo supera el tope semanal/);
});

test('ataques: hasta la temporada 104 de RoyaleAPI, semana 2, 24 o 27 ataques NO son anomalía (el perfil sumaba el entrenamiento; tope 28)', () => {
  const w = cargar(true);
  const f = (sem, tr, ataques, extra) => ext('11/10/2026', Object.assign({ temporadaRoyaleAPI: tr, semana: sem, ataques }, extra || {}));
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tituloEje: 'Ataques', tope: 4, topeSemanal: 16, externas: [f(1, 103, 27), f(2, 104, 24, { clanTag: '#OTRO', clan: 'Otro' })] });
  const pts = azules(wrap);
  assert.equal(pts.length, 2);
  pts.forEach(p => assert.equal(p.getAttribute('fill'), '#4ea1ff'));
  assert.match(wrap.innerHTML, /Ninguna semana en un clan externo supera el tope semanal/);
});

test('ataques: más de 28 sigue siendo anomalía en el formato con entrenamiento, y más de 16 desde la T104 S3', () => {
  const w = cargar(true);
  const f = (sem, tr, ataques, clanTag) => ext('11/10/2026', { temporadaRoyaleAPI: tr, semana: sem, ataques, clanTag, clan: clanTag });
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tituloEje: 'Ataques', tope: 4, topeSemanal: 16, externas: [f(1, 90, 29, '#A'), f(3, 104, 17, '#B'), f(4, 104, 16, '#C'), f(1, 105, 20, '#D')] });
  const por = {}; azules(wrap).forEach(p => { por[p.dataset.clan] = p; });
  assert.equal(por['#A'].getAttribute('fill'), 'var(--danger)');
  assert.equal(por['#A'].dataset.tope, '28');
  assert.equal(por['#B'].getAttribute('fill'), 'var(--danger)');
  assert.equal(por['#B'].dataset.tope, '16');
  assert.equal(por['#C'].getAttribute('fill'), '#4ea1ff');
  assert.equal(por['#D'].getAttribute('fill'), 'var(--danger)');
  assert.match(wrap.innerHTML, /3 semanas en clanes externos superan/);
});

test('el tope de 28 solo vale para ataques y solo si la fila trae temporadaRoyaleAPI (medallas y backend anterior siguen en el tope de siempre)', () => {
  const w = cargar(true);
  const medallas = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('11/10/2026', { temporadaRoyaleAPI: 90, semana: 1, fame: 3750 })] });
  assert.equal(azules(medallas)[0].getAttribute('fill'), 'var(--danger)');
  const sinTemporada = pintar(w, DOS_SEMANAS, 'ataques', { tituloEje: 'Ataques', tope: 4, topeSemanal: 16, externas: [ext('11/10/2026', { ataques: 24 })] });
  assert.equal(azules(sinTemporada)[0].getAttribute('fill'), 'var(--danger)');
  assert.equal(azules(sinTemporada)[0].dataset.tope, '16');
});

test('ataques: en las temporadas 64 a 68 de RoyaleAPI el 0 es «sin dato» y no se dibuja; desde la 69 un 0 sí es un 0 real', () => {
  const w = cargar(true);
  const f = (tr, ataques, clanTag) => ext('11/10/2026', { temporadaRoyaleAPI: tr, semana: 1, ataques, clanTag, clan: clanTag });
  const wrap = pintar(w, DOS_SEMANAS, 'ataques', { tituloEje: 'Ataques', tope: 4, topeSemanal: 16, externas: [f(64, 0, '#A'), f(68, 0, '#B'), f(69, 0, '#C'), f(110, 0, '#D')] });
  assert.deepEqual(azules(wrap).map(p => p.dataset.clan).sort(), ['#C', '#D']);
});

test('barcos: con los ataques «sin dato» (T64 a T68) no hay anomalía «más barcos que ataques»; con ataques reales sigue igual', () => {
  const w = cargar(true);
  const f = (tr, ataques, barcos, clanTag) => ext('11/10/2026', { temporadaRoyaleAPI: tr, semana: 1, ataques, barcos, clanTag, clan: clanTag });
  const wrap = pintar(w, DOS_SEMANAS, 'barcos', { tituloEje: 'Barcos', vsAtaques: true, topeSemanal: 16, externas: [f(66, 0, 9, '#A'), f(110, 6, 10, '#B')] });
  const por = {}; azules(wrap).forEach(p => { por[p.dataset.clan] = p; });
  assert.equal(por['#A'].getAttribute('fill'), '#4ea1ff');
  assert.equal(por['#B'].getAttribute('fill'), 'var(--danger)');
});

test('medallas: hasta la temporada 72 de RoyaleAPI el tope es 9000 (la fama llegó a 8 700); desde la 73 sigue en 3600', () => {
  const w = cargar(true);
  const f = (tr, fame, clanTag) => ext('11/10/2026', { temporadaRoyaleAPI: tr, semana: 1, fame, clanTag, clan: clanTag });
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [f(70, 8700, '#A'), f(72, 9100, '#B'), f(73, 3700, '#C'), f(110, 3600, '#D')] });
  const por = {}; azules(wrap).forEach(p => { por[p.dataset.clan] = p; });
  assert.equal(por['#A'].getAttribute('fill'), '#4ea1ff');
  assert.equal(por['#B'].getAttribute('fill'), 'var(--danger)');
  assert.equal(por['#B'].dataset.tope, '9000');
  assert.equal(por['#C'].getAttribute('fill'), 'var(--danger)');
  assert.equal(por['#D'].getAttribute('fill'), '#4ea1ff');
});

test('barcos: más barcos que ataques en la misma fila externa es anomalía (como en la serie verde)', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'barcos', { tituloEje: 'Barcos', vsAtaques: true, topeSemanal: 16, externas: [ext('11/10/2026', { barcos: 10, ataques: 6 })] });
  const p = azules(wrap)[0];
  assert.equal(p.dataset.excedeAtaques, '6');
  assert.equal(p.getAttribute('fill'), 'var(--danger)');
  assert.match(wrap.innerHTML, /más barcos que ataques/);
  const ok = pintar(w, DOS_SEMANAS, 'barcos', { tituloEje: 'Barcos', vsAtaques: true, topeSemanal: 16, externas: [ext('11/10/2026', { barcos: 4, ataques: 12 })] });
  assert.equal(azules(ok)[0].dataset.excedeAtaques, undefined);
  assert.match(ok.innerHTML, /Ninguna semana en un clan externo tiene más barcos que ataques/);
});

test('la leyenda explica el azul solo cuando hay serie externa', () => {
  const w = cargar(true);
  assert.match(pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('11/10/2026')] }).innerHTML, /Azul = total de la semana en un clan externo/);
  assert.doesNotMatch(pintar(w, DOS_SEMANAS, 'puntaje', {}).innerHTML, /Azul = /);
});

test('el valor externo entra en la escala del eje Y (un valor alto no se corta)', () => {
  const w = cargar(true);
  const sin = pintar(w, DOS_SEMANAS, 'puntaje', { topeSemanal: 3600 });
  const yTope = [...sin.querySelectorAll('.ing-axis-label')].map(t => t.textContent);
  const con = pintar(w, DOS_SEMANAS, 'puntaje', { topeSemanal: 3600, externas: [ext('11/10/2026', { fame: 5200 })] });
  const yCon = [...con.querySelectorAll('.ing-axis-label')].map(t => t.textContent);
  const num = s => Number(String(s).replace(/[^\d]/g, ''));
  assert.ok(Math.max(...yCon.map(num).filter(n => !isNaN(n))) >= 5200, 'el eje llega al valor externo');
  assert.ok(Math.max(...yCon.map(num).filter(n => !isNaN(n))) > Math.max(...yTope.map(num).filter(n => !isNaN(n))));
});

test('el recorte a las últimas 6 temporadas también recorta la serie externa', () => {
  const w = cargar(true);
  // Ocho domingos de ocho meses distintos (mar a oct 2026): quedan los seis más recientes.
  const fechas = ['15/03/2026', '12/04/2026', '17/05/2026', '14/06/2026', '12/07/2026', '16/08/2026', '13/09/2026', '18/10/2026'];
  const serie = fechas.map(f => ({ semana: f, valor: 100, real: true }));
  const r = w.__t.filtrarUltimasTemporadasPerfil([], null, 6, serie);
  assert.equal(r.recortado, true);
  assert.deepEqual(r.serieExt.map(q => q.semana), fechas.slice(2));
  const sinRecorte = w.__t.filtrarUltimasTemporadasPerfil([], null, Infinity, serie);
  assert.equal(sinRecorte.serieExt.length, 8);
  // Sin tercera serie el resultado conserva la forma de siempre.
  const vieja = w.__t.filtrarUltimasTemporadasPerfil([{ semana: '18/10/2026', valor: 1, real: true }], null, 6);
  assert.equal(vieja.serieExt, undefined);
  assert.equal(vieja.total, 1);
});

test('el teclado recorre la serie azul aparte de las otras (↑/↓ cambia de serie)', () => {
  const w = cargar(true);
  const wrap = pintar(w, DOS_SEMANAS, 'puntaje', { externas: [ext('04/10/2026', { fame: 800 }), ext('11/10/2026', { fame: 1700 })] });
  const pts = [...wrap.querySelectorAll('.ing-serie-pt')];
  const series = new Set(pts.map(c => c.dataset.serie));
  assert.deepEqual([...series].sort(), ['acum', 'dia', 'ext']);
  const az = azules(wrap);
  assert.ok(az.every(c => c.getAttribute('data-kb') === '1' && c.getAttribute('role') === 'img'), 'los puntos azules son alcanzables por teclado');
  assert.ok(az[0].getAttribute('aria-label').includes('Clan externo'));
});
