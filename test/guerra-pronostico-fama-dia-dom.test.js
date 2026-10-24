'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-oct-2026, pedido usuaria: «el pronóstico de hoy está mostrando acumulados en vez de lo diario»; §PF194):
// «Pronóstico de hoy» de guerra.html debe mostrar la fama DE HOY (campos fameHoy / fameTechoRosterHoy / fameTechoHoy de
// webPronosticoGuerra), ordenar y numerar por esa fama, y poner «—» en los clanes cuya base del día aún no se conoce (nunca
// mezclar un acumulado con un diario). Se extraen del <script> inline REAL de guerra.html pronosticoDiaDe() y
// pronosticoClanHtml() (no se carga la página entera).
// LÍMITE: prueba el pintado con respuestas simuladas; no prueba el backend (ver el simulador de 21_Pronostico_Guerra.gs en §PF194).

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function pronosticoClanHtml'));
assert.ok(grande, 'no se encontró pronosticoClanHtml() en un <script> inline de guerra.html');
const I = grande.indexOf('function pronosticoDiaDe');
const F = grande.indexOf('function pintarPronosticoEnTarjetas');
assert.ok(I >= 0 && F > I, 'marcadores de pronosticoDiaDe()/pintarPronosticoEnTarjetas() no encontrados (¿se reorganizó guerra.html?)');
const TRAMO = grande.slice(I, F);

const PRELUDIO = `
const PRONOSTICO_ATAQUES_MAX_CLAN = 200;
function enlaceClan(n){ return esc(n); }
`;
const EPILOGO = '\nwindow.__t = { pronosticoDiaDe, pronosticoClanHtml };';

let ventana = null;
function montar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="x"></div>');
  window.eval(PRELUDIO + TRAMO + EPILOGO);
  ventana = window;
  return window.__t;
}
const plano = o => JSON.parse(JSON.stringify(o)); // los objetos nacen en la ventana de jsdom: se comparan como datos planos

const clan = (nombre, extra) => ({ nombre, clanTag: '#' + nombre, esRival: false, ataquesUsados: 100, ...extra });

test('con fama de hoy: muestra fameHoy y no el acumulado de la semana', () => {
  const t = montar();
  const propio = clan('Terna', { fameActual: 61000, fameTechoRoster: 66000, fameTecho: 66200,
    fameHoy: 29900, fameTechoRosterHoy: 34900, fameTechoHoy: 35100, baseOrigen: 'foto' });
  const out = t.pronosticoClanHtml({ propio, rivales: [] });
  assert.match(out, /29[,.]?900/);
  assert.doesNotMatch(out, /61[,.]?000/);
  assert.doesNotMatch(out, /66[,.]?200/);
  assert.match(out, /Techo 34[,.]?900–35[,.]?100/);
});

test('ordena y numera por fama de hoy, no por acumulado', () => {
  const t = montar();
  const propio = clan('Terna', { fameActual: 61000, fameTechoRoster: 66000, fameTecho: 66200, fameHoy: 29900, fameTechoRosterHoy: 34900, fameTechoHoy: 35100 });
  const rival = clan('Italia', { esRival: true, fameActual: 63350, fameTechoRoster: 65000, fameTecho: 65550, fameHoy: 31100, fameTechoRosterHoy: 32800, fameTechoHoy: 33200 });
  const out = t.pronosticoClanHtml({ propio, rivales: [rival] });
  assert.ok(out.indexOf('Italia') < out.indexOf('Terna'), 'Italia (31,100 hoy) debe ir antes que Terna (29,900 hoy)');
  assert.match(out, /#1[\s\S]*Italia[\s\S]*#2[\s\S]*Terna/);
});

test('rival sin base del día: «—», sin barras y al final; nunca el acumulado', () => {
  const t = montar();
  const propio = clan('Terna', { fameActual: 61000, fameTechoRoster: 66000, fameTecho: 66200, fameHoy: 29900, fameTechoRosterHoy: 34900, fameTechoHoy: 35100 });
  const rival = clan('Sin Foto', { esRival: true, fameActual: 57150, fameTechoRoster: 67000, fameTecho: 67250, fameHoy: null, fameTechoRosterHoy: null, fameTechoHoy: null });
  const out = t.pronosticoClanHtml({ propio, rivales: [rival] });
  assert.ok(out.indexOf('Terna') < out.indexOf('Sin Foto'), 'el que no tiene dato va al final');
  assert.doesNotMatch(out, /57[,.]?150/);
  assert.doesNotMatch(out, /67[,.]?250/);
  assert.match(out, /Techo —/);
  const caja = ventana.document.createElement('div');
  caja.innerHTML = out;
  const filas = [...caja.querySelectorAll('li.cp-row')];
  assert.equal(filas.length, 2);
  assert.equal(filas[1].querySelectorAll('.cp-bar u, .cp-bar i').length, 0, 'sin dato no se dibujan barras');
  assert.equal(filas[1].querySelector('.cp-r').textContent.trim(), '—');
});

test('respuesta de un backend anterior (sin fameHoy): se conservan los valores de siempre', () => {
  const t = montar();
  const d = t.pronosticoDiaDe({ nombre: 'X', fameActual: 1200, fameTechoRoster: 1500, fameTecho: 1700 });
  assert.deepEqual(plano(d), { f: 1200, r: 1500, m: 1700 });
  assert.equal(t.pronosticoDiaDe({ nombre: 'X', fameHoy: null }), null);
  assert.deepEqual(plano(t.pronosticoDiaDe({ nombre: 'X', fameHoy: 0, fameTechoRosterHoy: 400, fameTechoHoy: 900 })), { f: 0, r: 400, m: 900 });
});
