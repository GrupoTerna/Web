'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF110): «Torneos jugados mínimos por clan» es obligatorio en Registrar, Planificar y Modificar sorteo.
// El 0 es válido (= no considerar los torneos en ese sorteo); un cuadro vacío se rechaza, se marca con aria-invalid y recibe el foco.
// NO se carga admin.html entero: se extraen del <script> inline REAL las funciones idInputMiles() y validarTorneosJugadosSorteo()
// y el listener que quita la marca. LÍMITE: DOM simulado; no prueba el backend ni el aspecto en pantalla. [→ Contexto_Base_Web.md §PF110]

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo('function idInputMiles(prefijo, clan){', '/** Pinta un cuadro numérico', 'idInputMiles()'),
  tramo('function validarTorneosJugadosSorteo(requisitos){', '/**\n * initTorneoWizard()', 'validarTorneosJugadosSorteo() y su listener')
].join('\n');

const CLANES = ['Grupo乂Terna™', 'GrupoXTerna™2', 'GrupoXTerna™3', 'Mini乂Ternas™'];

function cuerpo(){
  const campos = CLANES.map(c => `<input id="reqTorneosSorteo_${c.replace(/[^\w]/g, '')}">`).join('');
  return `<!doctype html><html><body>
    <div id="reqTorneosGridSorteo">
      <input type="checkbox" id="reqTorneosSorteo_mismo">
      <input id="reqTorneosSorteo_mismoValor">
      ${campos}
    </div></body></html>`;
}

function montar(){
  const dom = new JSDOM(cuerpo(), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.eval(`
    var CLANES_REQUISITOS = ${JSON.stringify(CLANES)};
    ${CODIGO}
  `);
  return window;
}

function payload(window, valores){
  const requisitosPorClan = {};
  CLANES.forEach((c, i) => { requisitosPorClan[c] = { minTorneosJugados: valores[i] }; });
  return { requisitosPorClan };
}

const idClan = (i) => 'reqTorneosSorteo_' + CLANES[i].replace(/[^\w]/g, '');

test('PF110: con los 4 clanes vacíos se rechaza, se marcan los 4 cuadros y el foco va al primero', () => {
  const w = montar();
  const msg = w.validarTorneosJugadosSorteo(payload(w, ['', '', '', '']));
  assert.match(msg, /escribe 0/);
  CLANES.forEach((_, i) => assert.equal(w.document.getElementById(idClan(i)).getAttribute('aria-invalid'), 'true'));
  assert.equal(w.document.activeElement.id, idClan(0));
});

test('PF110: el 0 es un valor válido en los 4 clanes (no considerar torneos)', () => {
  const w = montar();
  assert.equal(w.validarTorneosJugadosSorteo(payload(w, ['0', '0', '0', '0'])), '');
  CLANES.forEach((_, i) => assert.equal(w.document.getElementById(idClan(i)).hasAttribute('aria-invalid'), false));
});

test('PF110: si falta un solo clan se rechaza y solo se marca ese cuadro', () => {
  const w = montar();
  const msg = w.validarTorneosJugadosSorteo(payload(w, ['2', '0', '', '1']));
  assert.ok(msg);
  assert.equal(w.document.getElementById(idClan(2)).getAttribute('aria-invalid'), 'true');
  [0, 1, 3].forEach(i => assert.equal(w.document.getElementById(idClan(i)).hasAttribute('aria-invalid'), false));
  assert.equal(w.document.activeElement.id, idClan(2));
});

test('PF110: con «mismo valor para los 4 clanes» marcado el foco va al cuadro único', () => {
  const w = montar();
  w.document.getElementById('reqTorneosSorteo_mismo').checked = true;
  const msg = w.validarTorneosJugadosSorteo(payload(w, ['', '', '', '']));
  assert.ok(msg);
  assert.equal(w.document.getElementById('reqTorneosSorteo_mismoValor').getAttribute('aria-invalid'), 'true');
  assert.equal(w.document.activeElement.id, 'reqTorneosSorteo_mismoValor');
});

test('PF110: al escribir en un cuadro marcado se le quita la marca, y una nueva validación limpia las anteriores', () => {
  const w = montar();
  w.validarTorneosJugadosSorteo(payload(w, ['', '', '', '']));
  const el = w.document.getElementById(idClan(1));
  el.value = '0';
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(el.hasAttribute('aria-invalid'), false);
  assert.equal(w.validarTorneosJugadosSorteo(payload(w, ['0', '0', '0', '0'])), '');
  CLANES.forEach((_, i) => assert.equal(w.document.getElementById(idClan(i)).hasAttribute('aria-invalid'), false));
});

test('PF110: Registrar, Planificar y Modificar sorteo validan antes de enviar, y el texto de ayuda pide escribir 0', () => {
  ['webAdminSorteoRegistrar', 'webAdminSorteoPlanificarGuardar', 'webAdminSorteoModificar'].forEach(accion => {
    const i = HTML.indexOf(`await apiPost('${accion}'`);
    assert.ok(i > 0, `no se encontró el envío de ${accion}`);
    const antes = HTML.slice(Math.max(0, i - 400), i);
    assert.match(antes, /validarTorneosJugadosSorteo\(requisitos\)/, `${accion} debe validar «Torneos jugados mínimos» antes de enviar`);
  });
  assert.match(HTML, /si no quieres considerar los torneos en este sorteo, escribe 0/);
});
