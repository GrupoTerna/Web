'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-oct-2026, tanda 6 del consolidado del mini historial; Contexto_Base_Web.md §PF176): en guerra.html se marca
// la columna del día de hoy en «Valores diarios» y la de la semana en curso en «Valores semanales».
// Se extrae del <script> inline REAL de guerra.html el tramo de helpers (desde UMBRAL_VERDE_SEMANAL hasta el filtro por
// columna de Nombre/Rango/Estado), sin cargar la página entera.
// LÍMITE: prueba la decisión de qué columna se marca y el HTML que se genera con datos simulados; no prueba el dibujo
// real (líneas laterales y fondo del encabezado) ni el contraste en un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function colHoyDiario'));
assert.ok(grande, 'no se encontró colHoyDiario() en un <script> inline de guerra.html');
const I = grande.indexOf('const UMBRAL_VERDE_SEMANAL');
const F = grande.indexOf('/* 19-oct-2026 (pedido usuario): Nombre, Rango y Estado');
assert.ok(I >= 0 && F > I, 'marcadores del tramo de helpers de las cuadrículas no encontrados (¿se reorganizó guerra.html?)');
const TRAMO = grande.slice(I, F);

const PRELUDIO = `const DIAS = [{letra:'J', label:'Jue'},{letra:'V', label:'Vie'},{letra:'S', label:'Sáb'},{letra:'D', label:'Dom'}];\n`;
const EPILOGO = `\nwindow.__t = { letraHoyGuerra, semanaHoyGuerra, colHoyDiario, colHoySemanal, celdasMegacategoria, celdasSemanas, filaSubEncabezadosMega, filaSubEncabezadosSemanas };`;

function montar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '<table><thead><tr id="r"></tr></thead><tbody><tr id="f"></tr></tbody></table>');
  window.eval(PRELUDIO + TRAMO + EPILOGO);
  return { T: window.__t, window };
}
// jueves = periodIndex % 7 === 3 ... domingo === 6; semana 2 (sectionIndex 2) => periodIndex 14 + 3 = 17 es jueves.
const guerra = (periodIndex, extra = {}) => ({
  ctx: { esDiaGuerra: true, temporada: 7, sectionIndex: 2, periodIndex, diaLetra: 'X', ...extra },
  valoresDiariosSelectores: { porDefecto: { temporada: 7, sectionIndex: 1 } }
});
const entrenamiento = (extra = {}) => ({
  ctx: { esDiaGuerra: false, temporada: 7, sectionIndex: 2, periodIndex: 14 },
  guerraCongeladaLetra: 'D',
  valoresDiariosSelectores: { porDefecto: { temporada: 7, sectionIndex: 1 } },
  ...extra
});

test('día de guerra: la letra sale de ctx.periodIndex (jueves a domingo), no de ctx.diaLetra', () => {
  const { T } = montar();
  assert.equal(T.letraHoyGuerra(guerra(17)), 'J');
  assert.equal(T.letraHoyGuerra(guerra(18)), 'V');
  assert.equal(T.letraHoyGuerra(guerra(19)), 'S');
  assert.equal(T.letraHoyGuerra(guerra(20)), 'D');
});

test('día de guerra sin periodIndex utilizable: cae a ctx.diaLetra', () => {
  const { T } = montar();
  assert.equal(T.letraHoyGuerra({ ctx: { esDiaGuerra: true, diaLetra: 'V' } }), 'V');
  assert.equal(T.letraHoyGuerra({ ctx: { esDiaGuerra: true, periodIndex: null, diaLetra: 'S' } }), 'S');
});

test('entrenamiento: se queda marcado el domingo (guerraCongeladaLetra), y D si no viene (P9)', () => {
  const { T } = montar();
  assert.equal(T.letraHoyGuerra(entrenamiento()), 'D');
  assert.equal(T.letraHoyGuerra({ ctx: { esDiaGuerra: false } }), 'D');
});

test('colHoyDiario: marca solo si la temporada y la semana mostradas son la vigente (guerra) o la última jugada (entrenamiento)', () => {
  const { T } = montar();
  const g = T.colHoyDiario(guerra(17), 7, 2);
  assert.equal(g.key, 'j');
  assert.match(g.titulo, /Hoy/);
  assert.equal(T.colHoyDiario(guerra(17), '7', '2').key, 'j', 'compara como texto: el select entrega cadenas');
  assert.equal(T.colHoyDiario(guerra(17), 7, 1), null, 'otra semana elegida: no se marca nada');
  assert.equal(T.colHoyDiario(guerra(17), 6, 2), null, 'otra temporada elegida: no se marca nada');
  const e = T.colHoyDiario(entrenamiento(), 7, 1);
  assert.equal(e.key, 'd');
  assert.match(e.titulo, /Último día de guerra jugado/);
  assert.equal(T.colHoyDiario(entrenamiento(), 7, 2), null, 'en entrenamiento la semana vigente aún no es la mostrada');
  assert.equal(T.colHoyDiario({ ctx: { esDiaGuerra: false } }, 7, 1), null, 'sin semana por defecto: nada');
  assert.equal(T.colHoyDiario(guerra(17), null, null), null);
});

test('celdasMegacategoria: la celda del día marcado lleva .ai-hoy, incluso vacía (P10) o con un 0 opcional; el total y las demás no', () => {
  const { T, window } = montar();
  const fila = window.document.getElementById('f');
  // jueves sin datos (null = no estuvo), viernes 4, sábado 0 opcional, domingo 2
  fila.innerHTML = T.celdasMegacategoria({ j: null, v: 4, s: 0, d: 2, total: 6 }, 'ai-grp-atq', true, 'atq', ['s'], 'j');
  const tds = [...fila.querySelectorAll('td')];
  assert.equal(tds.length, 5);
  assert.ok(tds[0].classList.contains('ai-hoy'), 'jueves vacío igual se marca');
  assert.equal(tds.filter(td => td.classList.contains('ai-hoy')).length, 1);
  fila.innerHTML = T.celdasMegacategoria({ j: 4, v: 4, s: 0, d: 2, total: 10 }, 'ai-grp-atq', true, 'atq', ['s'], 's');
  const opc = fila.querySelector('td[data-opc="1"]');
  assert.ok(opc && opc.classList.contains('ai-hoy') && opc.classList.contains('ai-cell-opc'), 'un 0 opcional también se marca y conserva su estilo');
  // no se tocan los colores de las celdas
  fila.innerHTML = T.celdasMegacategoria({ j: 4, v: 2, s: 0, d: 0, total: 6 }, 'ai-grp-atq', true, 'atq', [], 'v');
  const v = fila.querySelector('td[data-col="atq-v"]');
  assert.ok(v.classList.contains('ai-hoy') && v.classList.contains('ai-cell-part'), 'el color de parcial se conserva');
  const total = fila.querySelector('td[data-col="atq-total"]');
  assert.ok(!total.classList.contains('ai-hoy'));
});

test('celdasMegacategoria: sin keyPrefix (la tabla de Inactivos) nunca se marca, aunque llegue colHoy', () => {
  const { T, window } = montar();
  const fila = window.document.getElementById('f');
  fila.innerHTML = T.celdasMegacategoria({ j: 4, v: 4, s: 4, d: 4, total: 16 }, 'ai-grp-atq', true, undefined, undefined, 'j');
  assert.equal(fila.querySelectorAll('.ai-hoy').length, 0);
  fila.innerHTML = T.celdasMegacategoria({ j: 4, v: 4, s: 4, d: 4, total: 16 }, 'ai-grp-atq', true, 'atq');
  assert.equal(fila.querySelectorAll('.ai-hoy').length, 0, 'sin colHoy no se marca nada');
});

test('filaSubEncabezadosMega: solo el encabezado del día marcado lleva .ai-hoy, aria-current y title; las claves de filtro no cambian', () => {
  const { T, window } = montar();
  const r = window.document.getElementById('r');
  r.innerHTML = T.filaSubEncabezadosMega('ai-grp-atq', 'atq', { key: 's', titulo: 'Hoy: día de guerra en curso' });
  const ths = [...r.querySelectorAll('th')];
  assert.equal(ths.length, 5);
  const marcados = ths.filter(th => th.classList.contains('ai-hoy'));
  assert.equal(marcados.length, 1);
  assert.equal(marcados[0].querySelector('span').textContent, 'S');
  assert.equal(marcados[0].getAttribute('aria-current'), 'true');
  assert.equal(marcados[0].getAttribute('title'), 'Hoy: día de guerra en curso');
  assert.equal(ths.filter(th => th.hasAttribute('aria-current')).length, 1);
  assert.deepEqual(ths.map(th => th.querySelector('button').dataset.col), ['atq-j', 'atq-v', 'atq-s', 'atq-d', 'atq-total'], 'el filtro y el orden por columna siguen igual');
  r.innerHTML = T.filaSubEncabezadosMega('ai-grp-pje', 'pje');
  assert.equal(r.querySelectorAll('.ai-hoy, [aria-current]').length, 0, 'sin colHoy el encabezado queda como antes');
});

// ---- Valores semanales ----
const SEMANAS = ['Sem 1', 'Sem 2', 'Sem 3'];

test('colHoySemanal (guerra): marca la columna "Sem N" con N = sectionIndex + 1 de la temporada vigente', () => {
  const { T } = montar();
  const r = T.colHoySemanal(guerra(17), 7, SEMANAS); // sectionIndex 2 => Sem 3
  assert.equal(r.idx, 2);
  assert.match(r.titulo, /Semana de guerra en curso/);
  assert.equal(T.colHoySemanal(guerra(17), '7', SEMANAS).idx, 2, 'la temporada del select llega como texto');
  assert.equal(T.colHoySemanal(guerra(17), null, SEMANAS).idx, 2, 'temporada null = se muestra la vigente');
  assert.equal(T.colHoySemanal(guerra(17), 6, SEMANAS), null, 'otra temporada elegida: no se marca nada');
});

test('colHoySemanal (entrenamiento): se queda marcada la última semana jugada (la de valoresDiariosSelectores.porDefecto)', () => {
  const { T } = montar();
  const r = T.colHoySemanal(entrenamiento(), 7, SEMANAS); // porDefecto sectionIndex 1 => Sem 2
  assert.equal(r.idx, 1);
  assert.match(r.titulo, /Última semana jugada/);
  assert.equal(T.colHoySemanal({ ctx: { esDiaGuerra: false, temporada: 7 } }, 7, SEMANAS), null, 'sin semana por defecto: nada');
});

test('colHoySemanal: si la semana vigente aún no tiene columna, no se crea ni se marca otra (P12)', () => {
  const { T } = montar();
  assert.equal(T.colHoySemanal(guerra(17), 7, ['Sem 1', 'Sem 2']), null);
  assert.equal(T.colHoySemanal(guerra(17), 7, []), null);
  assert.equal(T.colHoySemanal(guerra(17), 7, undefined), null);
  assert.equal(T.colHoySemanal({ ctx: { esDiaGuerra: true, temporada: 7, sectionIndex: null } }, 7, SEMANAS), null);
  // la semana 0 (primera de la temporada) es "Sem 1" y sí se marca
  assert.equal(T.colHoySemanal({ ctx: { esDiaGuerra: true, temporada: 7, sectionIndex: 0 } }, 7, SEMANAS).idx, 0);
});

test('celdasSemanas: la celda de la semana marcada lleva .ai-hoy, también vacía u opcional; Total, % y las demás semanas no; el color no cambia', () => {
  const { T, window } = montar();
  const fila = window.document.getElementById('f');
  const mega = { semanas: [16, 7, null], total: 23, pct: 72, opc: [0, 0, 0] };
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, 'atq', 2); // Sem 3 vacía (no estuvo)
  let tds = [...fila.querySelectorAll('td')];
  assert.equal(tds.length, 5, '3 semanas + Total + %');
  assert.ok(tds[2].classList.contains('ai-hoy'), 'una semana vacía igual se marca');
  assert.equal(tds.filter(td => td.classList.contains('ai-hoy')).length, 1);
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, 'atq', 1);
  const parcial = fila.querySelector('td[data-col="atq-sem1"]');
  assert.ok(parcial.classList.contains('ai-hoy') && parcial.classList.contains('ai-cell-part'), 'conserva el color de parcial');
  fila.innerHTML = T.celdasSemanas({ semanas: [0], total: 0, pct: 0, opc: [[ 'j', 'v', 's', 'd' ]] }, 'ai-grp-atq', true, 'atq', 0);
  const opc = fila.querySelector('td[data-opc="1"]');
  assert.ok(opc && opc.classList.contains('ai-hoy') && opc.classList.contains('ai-cell-opc'));
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, 'atq', 0);
  assert.ok(!fila.querySelector('td[data-col="atq-resumen"]').classList.contains('ai-hoy'));
  assert.ok(!fila.querySelector('td[data-col="atq-pct"]').classList.contains('ai-hoy'));
});

test('celdasSemanas: sin keyPrefix o sin idxHoy no se marca nada (idxHoy 0 sí cuenta como una columna)', () => {
  const { T, window } = montar();
  const fila = window.document.getElementById('f');
  const mega = { semanas: [16, 7], total: 23, pct: 72 };
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, undefined, 0);
  assert.equal(fila.querySelectorAll('.ai-hoy').length, 0);
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, 'atq');
  assert.equal(fila.querySelectorAll('.ai-hoy').length, 0);
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, 'atq', null);
  assert.equal(fila.querySelectorAll('.ai-hoy').length, 0);
  fila.innerHTML = T.celdasSemanas(mega, 'ai-grp-atq', true, 'atq', 0);
  assert.equal(fila.querySelectorAll('.ai-hoy').length, 1);
});

test('filaSubEncabezadosSemanas: solo el encabezado de la semana marcada lleva .ai-hoy, aria-current y title; las claves de filtro no cambian', () => {
  const { T, window } = montar();
  const r = window.document.getElementById('r');
  r.innerHTML = T.filaSubEncabezadosSemanas('ai-grp-atq', 'atq', SEMANAS, 'Total', { idx: 1, titulo: 'Semana de guerra en curso' });
  const ths = [...r.querySelectorAll('th')];
  assert.equal(ths.length, 5);
  const marcados = ths.filter(th => th.classList.contains('ai-hoy'));
  assert.equal(marcados.length, 1);
  assert.equal(marcados[0].querySelector('span').textContent, 'Sem 2');
  assert.equal(marcados[0].getAttribute('aria-current'), 'true');
  assert.equal(marcados[0].getAttribute('title'), 'Semana de guerra en curso');
  assert.deepEqual(ths.map(th => th.querySelector('button').dataset.col), ['atq-sem0', 'atq-sem1', 'atq-sem2', 'atq-resumen', 'atq-pct']);
  r.innerHTML = T.filaSubEncabezadosSemanas('ai-grp-pje', 'pje', SEMANAS, 'Prom');
  assert.equal(r.querySelectorAll('.ai-hoy, [aria-current]').length, 0);
  r.innerHTML = T.filaSubEncabezadosSemanas('ai-grp-pje', 'pje', SEMANAS, 'Prom', null);
  assert.equal(r.querySelectorAll('.ai-hoy, [aria-current]').length, 0);
});
