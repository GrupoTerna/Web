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
const EPILOGO = '\nwindow.__t = { pronosticoDiaDe, pronosticoClanHtml, pronosticoEstadoDiaElegido, pronosticoCerradoDe };';

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

// NUEVO (24-oct-2026, pedido usuaria; §PF203): el bloque sigue al día elegido en Jue–Dom y ya no se llama «de hoy».
const propioCerr = diasCerrados => clan('Terna', { fameActual: 61000, fameTechoRoster: 66000, fameTecho: 66200, fameHoy: 29900, fameTechoRosterHoy: 34900, fameTechoHoy: 35100, diasCerrados });

test('estado del día elegido: cerrado, futuro o el día en curso', () => {
  const t = montar();
  assert.equal(t.pronosticoEstadoDiaElegido('J', 'V'), 'cerrado');
  assert.equal(t.pronosticoEstadoDiaElegido('D', 'V'), 'futuro');
  assert.equal(t.pronosticoEstadoDiaElegido('V', 'V'), null);
  assert.equal(t.pronosticoEstadoDiaElegido(null, 'V'), null);
  assert.equal(t.pronosticoEstadoDiaElegido('J', null), null);
});

test('el día en curso se titula con su nombre y no con «de hoy»', () => {
  const t = montar();
  const out = t.pronosticoClanHtml({ propio: propioCerr({ J: 31000 }), rivales: [] }, 'V', 'V');
  assert.match(out, /Pronóstico del viernes/);
  assert.doesNotMatch(out, /de hoy/i);
  assert.match(out, /Techo 34[,.]?900–35[,.]?100/);
  const sinDia = t.pronosticoClanHtml({ propio: propioCerr({}), rivales: [] });
  assert.match(sinDia, /Pronóstico del día/);
});

test('día ya jugado: muestra el resultado de ese día (medallas del jueves), ordenado, sin techo ni acumulado', () => {
  const t = montar();
  const rival = clan('Italia', { esRival: true, fameActual: 63350, fameHoy: 31100, fameTechoHoy: 33200, diasCerrados: { J: 33300, V: 0 } });
  const out = t.pronosticoClanHtml({ propio: propioCerr({ J: 31000 }), rivales: [rival] }, 'J', 'V');
  assert.match(out, /Resultado del jueves/);
  assert.doesNotMatch(out, /Techo/);
  assert.doesNotMatch(out, /29[,.]?900|31[,.]?100|61[,.]?000|63[,.]?350/);
  assert.ok(out.indexOf('Italia') < out.indexOf('Terna'), 'Italia (33,300) va antes que Terna (31,000)');
  assert.match(out, /33[,.]?300/);
  assert.match(out, /31[,.]?000/);
  assert.match(out, /#1[\s\S]*Italia[\s\S]*#2[\s\S]*Terna/);
});

test('día ya jugado: un 0 real se muestra como 0 y la falta de dato como «—» al final', () => {
  const t = montar();
  const conCero = clan('Cero', { esRival: true, diasCerrados: { J: 0 } });
  const sinDato = clan('SinDato', { esRival: true, diasCerrados: {} });
  const antiguo = clan('Antiguo', { esRival: true }); // respuesta de un backend anterior (sin diasCerrados)
  const out = t.pronosticoClanHtml({ propio: propioCerr({ J: 500 }), rivales: [sinDato, conCero, antiguo] }, 'J', 'S');
  const caja = ventana.document.createElement('div');
  caja.innerHTML = out;
  const filas = [...caja.querySelectorAll('li.cp-row')];
  const nombres = filas.map(f => f.querySelector('.cp-n').textContent.trim());
  assert.deepEqual(nombres.slice(0, 2), ['Terna', 'Cero']);
  assert.equal(filas[1].querySelector('.cp-f').textContent.trim(), '0');
  assert.equal(filas[2].querySelector('.cp-f').textContent.trim(), '—');
  assert.equal(filas[3].querySelector('.cp-f').textContent.trim(), '—');
  assert.equal(filas[2].querySelectorAll('.cp-bar i, .cp-bar u').length, 0);
});

test('día que aún no llega: aviso en vez de cifras', () => {
  const t = montar();
  const out = t.pronosticoClanHtml({ propio: propioCerr({ J: 500 }), rivales: [] }, 'D', 'V');
  assert.match(out, /Resultado del domingo/);
  assert.match(out, /todavía no se juega/);
  assert.doesNotMatch(out, /cp-row/);
});
