'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF105): valor inicial de «Ataques a barcos» en Sorteos y Cambio de rango. Prioridad: el Barcos del
// propio registro, luego el del registro anterior (webAdminBarcosAnterior) y solo si no hay ninguno, 16. En Cambio de rango
// una corrida nueva arranca con el de la corrida anterior de esa mitad (Ascenso o Descenso), ya no con 0.
// [→ Contexto_Base_Web.md §PF105]. Se extraen del <script> inline REAL los tramos entre marcadores.
// LÍMITE: DOM y backend simulados; no prueba webAdminBarcosAnterior real.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo('function formatoMiles(valor){', '/** Lee el <input> de un cuadro', 'formatoMiles()'),
  tramo('function idInputMiles(prefijo, clan){', '/** Pinta un cuadro numérico', 'idInputMiles()'),
  tramo('async function barcosInicial(categoria, id){', '/**\n * cargarRequisitosPorClan(id)', 'barcosInicial()'),
  tramo('async function cargarRequisitosSorteoPorClan(id){', '/**\n * armarPayloadRequisitosSorteo()', 'cargarRequisitosSorteoPorClan()'),
  tramo('function leerOtrosCriteriosCR(tipo){', '/**\n * mostrarRequisitosAscensoCR()', 'criterios de Cambio de rango')
].join('\n');

const opciones = Array.from({ length: 17 }, (_, n) => `<option value="${n}">${n}</option>`).join('');
const CUERPO = `<!doctype html><html><body>
  <select id="reqAtaquesBarcosSorteo">${opciones}</select>
  <select id="reqMiembroActivoSorteo"><option value="Sí">Sí</option><option value="No">No</option></select>
  <select id="reqReaccionSorteo"><option value="Sí">Sí</option><option value="No">No</option></select>
  <select id="reqPresenciaWhatsappSorteo"><option value="Sí">Sí</option><option value="No">No</option></select>
  <input id="reqDeltaSorteo">
  <select id="crBarcosAscenso">${opciones}</select><select id="crBarcosDescenso">${opciones}</select>
  <select id="crMiembroActivoAscenso"><option value="Sí">Sí</option><option value="No">No</option></select>
  <select id="crMiembroActivoDescenso"><option value="Sí">Sí</option><option value="No">No</option></select>
  <select id="crWhatsappAscenso"><option value="Sí">Sí</option><option value="No">No</option></select>
  <select id="crWhatsappDescenso"><option value="Sí">Sí</option><option value="No">No</option></select>
</body></html>`;

function montar(api){
  const dom = new JSDOM(CUERPO, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__llamadas = [];
  window.__api = api;
  window.eval(`
    var CLANES_REQUISITOS = [];
    function esc(s){ return String(s == null ? '' : s); }
    function manejarRespuestaAuth(){ return false; }
    function apiGetAuth(accion, params){ window.__llamadas.push([accion, params]); return window.__api(accion, params); }
    ${CODIGO}
    window.__t = { sorteo: cargarRequisitosSorteoPorClan, limpiarCR: limpiarOtrosCriteriosCR, precargarCR: precargarOtrosCriteriosCR };
  `);
  return window;
}
const val = (w, id) => w.document.getElementById(id).value;
const pedidos = (w) => w.__llamadas.filter(l => l[0] === 'webAdminBarcosAnterior').map(l => ({ ...l[1] }));

test('PF105 Sorteos: sin Barcos propio toma el del sorteo anterior; con Barcos propio no consulta', async () => {
  const w = montar(async accion => accion === 'webAdminRequisitosClanesSorteo'
    ? { ok: true, requisitos: { barcos: '' } }
    : { ok: true, qty: 6, idOrigen: 'S0' });
  await w.__t.sorteo('S2');
  assert.equal(val(w, 'reqAtaquesBarcosSorteo'), '6');
  assert.deepEqual(pedidos(w), [{ categoria: 'Sorteo', id: 'S2' }]);

  const w2 = montar(async accion => accion === 'webAdminRequisitosClanesSorteo'
    ? { ok: true, requisitos: { ataquesBarcosSemana: '3' } }
    : { ok: true, qty: 6 });
  await w2.__t.sorteo('S2');
  assert.equal(val(w2, 'reqAtaquesBarcosSorteo'), '3');
  assert.equal(pedidos(w2).length, 0);
});

test('PF105 Sorteos: sin registro anterior queda el tope 16; sin id (formulario nuevo) pide el más reciente', async () => {
  const w = montar(async accion => accion === 'webAdminRequisitosClanesSorteo'
    ? { ok: true, requisitos: { barcos: '' } }
    : { ok: true, qty: null });
  await w.__t.sorteo();
  assert.equal(val(w, 'reqAtaquesBarcosSorteo'), '16');
  assert.deepEqual(pedidos(w), [{ categoria: 'Sorteo' }]);
});

test('PF105 Cambio de rango: una corrida nueva arranca con el Barcos de la anterior de cada mitad (no con 0)', async () => {
  const w = montar(async (accion, p) => ({ ok: true, qty: p.categoria === 'CR_Ascenso' ? 4 : 9 }));
  await Promise.all([w.__t.limpiarCR('ascenso'), w.__t.limpiarCR('descenso')]);
  assert.equal(val(w, 'crBarcosAscenso'), '4');
  assert.equal(val(w, 'crBarcosDescenso'), '9');
  assert.equal(val(w, 'crMiembroActivoAscenso'), 'Sí');
  assert.equal(val(w, 'crWhatsappAscenso'), 'No');
});

test('PF105 Cambio de rango: sin corrida anterior o sin red arranca en 16', async () => {
  const w = montar(async () => ({ ok: true, qty: null }));
  await w.__t.limpiarCR('ascenso');
  assert.equal(val(w, 'crBarcosAscenso'), '16');
  const w2 = montar(async () => { throw new Error('red'); });
  await w2.__t.limpiarCR('descenso');
  assert.equal(val(w2, 'crBarcosDescenso'), '16');
});

test('PF105 Cambio de rango: una corrida guardada sin Barcos toma el de la anterior (excluyéndose a sí misma); con Barcos propio lo conserva', async () => {
  const w = montar(async () => ({ ok: true, qty: 7 }));
  const base = { miembroActivo: { activo: true }, whatsapp: { activo: false } };
  await w.__t.precargarCR('ascenso', { ...base, barcos: { activo: false, qty: null } }, 'A_12');
  assert.equal(val(w, 'crBarcosAscenso'), '7');
  assert.deepEqual(pedidos(w), [{ categoria: 'CR_Ascenso', id: 'A_12' }]);
  await w.__t.precargarCR('descenso', { ...base, barcos: { activo: true, qty: 2 } }, 'D_12');
  assert.equal(val(w, 'crBarcosDescenso'), '2');
  assert.equal(pedidos(w).length, 1, 'con valor propio no vuelve a consultar');
});

test('PF105 Cambio de rango: un par incompleto (sin fila de Descenso) se trata como corrida nueva', async () => {
  const w = montar(async () => ({ ok: true, qty: 11 }));
  await w.__t.precargarCR('descenso', null);
  assert.equal(val(w, 'crBarcosDescenso'), '11');
});
