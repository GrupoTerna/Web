'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (14-oct-2026, pedido usuario): al elegir un día de Jue–Dom en guerra.html, las tarjetas de clan no solo cambian
// el puesto: también muestran los ataques, medallas y barcos de ese día y cuántos atacaron, sumados desde
// data.valoresDiariosPorSemana («Valores diarios»). Se extraen del <script> inline REAL de guerra.html las funciones
// _letraDiaTarjetas() a pintarValoresDiaEnTarjetas() (no se carga la página entera).
// LÍMITE: prueba el cálculo y el pintado con datos simulados; no prueba el backend ni el dibujo real de la página.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function pintarValoresDiaEnTarjetas'));
assert.ok(grande, 'no se encontró pintarValoresDiaEnTarjetas() en un <script> inline de guerra.html');
const I = grande.indexOf('function _letraDiaTarjetas');
const F = grande.indexOf('function pintarPuestosDiaEnTarjetas');
assert.ok(I >= 0 && F > I, 'marcadores de las funciones de valores por día no encontrados (¿se reorganizó guerra.html?)');
const TRAMO = grande.slice(I, F);

const PRELUDIO = `
const DIAS = [{letra:'J'},{letra:'V'},{letra:'S'},{letra:'D'}];
const NOMBRES_DIA_GUERRA = { J:'Jueves', V:'Viernes', S:'Sábado', D:'Domingo' };
function _normNombreClanGuerra(s){ return String(s || '').trim().toLowerCase(); }
let diaPuestosSel = null, ultimoDataGuerra = null;
`;
const EPILOGO = '\nwindow.__t = { valoresDiaDeClan, pintarValoresDiaEnTarjetas, set: (sel, data) => { diaPuestosSel = sel; ultimoDataGuerra = data; } };';

const CARTA = `<div id="clanGrid"><div class="card clan-card" data-clan="Terna Uno">
  <div class="stats"><b class="st-atq">196</b><b class="st-fame">123,000</b><b class="st-barc">12</b></div>
  <div class="bar"><i style="width:100%"></i></div>
  <div class="clan-atq">49/48 atacaron en la última guerra (102%)</div>
  <div class="clan-meta"><span>meta</span></div></div></div>`;

const fila = (nombre, a, p, b, extra = {}) => ({
  nombre,
  j: a[0], v: a[1], s: a[2], d: a[3],
  puntaje: { j: p[0], v: p[1], s: p[2], d: p[3] },
  barcos: { j: b[0], v: b[1], s: b[2], d: b[3] },
  ...extra
});
const FILAS = [
  fila('Ana',  [4, 4, 2, 4], [1000, 900, 500, 1200], [1, 0, 0, 2]),
  fila('Beto', [4, 0, 0, 4], [800, 0, 0, 1100], [0, 0, 0, 1]),
  fila('Caro', [null, 3, 4, 4], [null, 600, 700, 900], [null, 1, 0, 0]),
  fila('Dino', [0, 4, 1, 0], [0, 700, 300, 0], [0, 0, 0, 0], { activo: false })
];
const GPC = { 'Terna Uno': { ataques: 196, fame: 123000, barcos: 12, atacaron: 49, totalHoy: 48 } };

function montar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], CARTA);
  window.eval(PRELUDIO + TRAMO + EPILOGO);
  const card = () => window.document.querySelector('.clan-card');
  const txt = sel => card().querySelector(sel).textContent.trim();
  return { t: window.__t, txt, card };
}
const base = (extra = {}) => ({
  ctx: { esDiaGuerra: false, temporada: 6, sectionIndex: 1 },
  guerraCongeladaLetra: 'D',
  guerraPorClan: GPC,
  valoresDiariosSelectores: { porDefecto: { temporada: 6, sectionIndex: 0 } },
  valoresDiariosPorSemana: { 6: { 0: { 'Terna Uno': FILAS } } },
  ...extra
});

test('valoresDiaDeClan suma los jugadores que estuvieron ese día (null = no estuvo; el inactivo no entra al total)', () => {
  const { t } = montar();
  assert.deepEqual({ ...t.valoresDiaDeClan(FILAS, 'V') }, { ataques: 11, fame: 2200, barcos: 1, atacaron: 3, totalHoy: 3 });
  assert.deepEqual({ ...t.valoresDiaDeClan(FILAS, 'J') }, { ataques: 8, fame: 1800, barcos: 1, atacaron: 2, totalHoy: 2 });
  assert.equal(t.valoresDiaDeClan(FILAS, 'X'), null);
  assert.equal(t.valoresDiaDeClan([fila('Solo', [null, null, null, null], [null, null, null, null], [null, null, null, null])], 'J'), null);
});

test('entrenamiento: elegir el viernes cambia ataques, medallas, barcos, barra y "atacaron"; la meta cruzada se oculta', () => {
  const { t, txt, card } = montar();
  t.set('V', base());
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'dia');
  assert.equal(txt('.st-atq'), '11');
  assert.equal(txt('.st-fame'), '2,200');
  assert.equal(txt('.st-barc'), '1');
  assert.equal(txt('.clan-atq'), '3/3 atacaron el viernes (100%)');
  assert.equal(card().querySelector('.bar i').style.width, '100%');
  assert.equal(card().querySelector('.clan-meta').style.display, 'none');
});

test('volver a ningún día (o al día que ya mostraban) deja los valores del backend', () => {
  const { t, txt, card } = montar();
  t.set('V', base());
  t.pintarValoresDiaEnTarjetas();
  t.set(null, base());
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'base');
  assert.equal(txt('.st-atq'), '196');
  assert.equal(txt('.st-fame'), '123,000');
  assert.equal(txt('.clan-atq'), '49/48 atacaron en la última guerra (102%)');
  assert.equal(card().querySelector('.clan-meta').style.display, '');
  t.set('D', base()); // el domingo ya es el día congelado: valores exactos del backend
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'dia');
  assert.equal(txt('.st-atq'), '196');
});

test('día de guerra: un día futuro muestra guiones; un día pasado se calcula; hoy conserva el backend', () => {
  const { t, txt } = montar();
  const guerra = base({ ctx: { esDiaGuerra: true, diaLetra: 'V', temporada: 6, sectionIndex: 1 }, valoresDiariosPorSemana: { 6: { 1: { 'Terna Uno': FILAS } } } });
  t.set('S', guerra);
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'futuro');
  assert.equal(txt('.st-atq'), '—');
  assert.equal(txt('.clan-atq'), 'Sin valores registrados el sábado');
  t.set('J', guerra);
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'dia');
  assert.equal(txt('.st-atq'), '8');
  assert.equal(txt('.clan-atq'), '2/2 atacaron el jueves (100%)');
  t.set('V', guerra); // hoy: ya son los valores de ese día, y salen exactos del backend (en vivo)
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'dia');
  assert.equal(txt('.st-atq'), '196');
});

test('sin la semana en «Valores diarios» se dejan los valores de siempre (estado base)', () => {
  const { t, txt } = montar();
  t.set('V', base({ valoresDiariosPorSemana: {} }));
  assert.equal(t.pintarValoresDiaEnTarjetas(), 'base');
  assert.equal(txt('.st-atq'), '196');
  assert.equal(txt('.clan-atq'), '49/48 atacaron en la última guerra (102%)');
});
