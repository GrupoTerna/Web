'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (28-oct-2026, PF286 punto 11 (c)): rama «verificar» de Cambio de rango en admin.html. Compara las propuestas de la corrida más reciente
// de Historial_A/D con lo realmente aplicado (webCRListaVerificar) y dice si falta aplicar algo o si algo se aplicó sin estar propuesto.
// [→ Contexto_Base_Web.md §PF286]
//
// NO se carga admin.html entero: se extraen del <script> inline REAL los tramos entre marcadores. LÍMITE: DOM y funciones auxiliares simulados;
// la respuesta del backend es un dato de prueba, así que no prueba Apps Script ni el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo("document.getElementById('btnCrPaso1').addEventListener('click'", "document.getElementById('crVolverPaso1')", 'el listener de btnCrPaso1'),
  tramo("document.getElementById('crVolverPaso1').addEventListener('click'", '/**\n * Rama «verificar» de Cambio de rango', 'el listener de crVolverPaso1'),
  tramo('function _cambioVerificacionCR(x){', '/**\n * seleccionarCorridaParaVerPropuestas(idAscenso)', 'las funciones de verificación')
].join('\n');

const CUERPO = `<!doctype html><html><body>
  <div id="crPaso1">
    <select id="crAccion">
      <option value="">Elige…</option><option value="registrar">r</option><option value="modificar">m</option>
      <option value="ver">v</option><option value="verificar">verificar</option>
    </select>
    <button id="btnCrPaso1">Continuar</button>
  </div>
  <div id="crPaso2" style="display:none">
    <a id="crVolverPaso1" href="#">c</a>
    <div id="crSelectorParBox" style="display:none"><select id="crSelectPar"><option value="">Elige…</option></select></div>
    <div id="crPaso2Msg"></div>
    <div id="crVerificarBox" style="display:none">
      <select id="crVerificarPar"><option value="">La más reciente con propuestas</option></select>
      <button id="btnCrVerificar">Volver a verificar</button>
      <div id="crVerificarMsg"></div><div id="crVerificarResultado"></div>
    </div>
    <div id="crPaso3" style="display:none"><div id="crPrecargarUltimoBox" style="display:none"></div></div>
    <div id="crPropuestasBloque"></div>
  </div>
</body></html>`;

const ITEM = (o) => Object.assign({ tag: '#A', nombre: 'Ana', clan: 'Terna', tipo: 'Ascenso', rango: 'Miembro', rango2: 'Veterano', fechaTxt: '27/10/2026' }, o);
const BASE = { ok: true, hayCorrida: true, diaTxt: '27/10/2026', temporada: 5, semana: 2, dia: 3, propuestasN: 3, aplicadas: [], pendientes: [], excepcionales: [] };

function montar(respuesta){
  const dom = new JSDOM(CUERPO, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__pedidos = [];
  window.__respuesta = respuesta;
  window.__fallar = (typeof respuesta === 'string') ? respuesta : '';
  window.eval(`
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function enfocarPrimerControl(){}
    function actualizarTextoPropuestasSinGuardar(){}
    function actualizarVisibilidadPropuestasCR(){}
    function cargarCRListaPares(){}
    async function limpiarFormularioCR(){}
    function manejarRespuestaAuth(){ return false; }
    function etiquetaParCR(p){ return 'Corrida ' + p.idAscenso; }
    function activarBarraScrollTabla(){}
    async function conBotonOcupado(btn, fn){ await fn(); }
    async function apiGetAuth(accion, params){ window.__pedidos.push({ accion, params }); if(window.__fallar) throw new Error(window.__fallar); return window.__respuesta; }
    let crIdExistenteActual = '';
    let crIdDescensoActual = '';
    ${CODIGO}
  `);
  return window;
}

const $ = (w, id) => w.document.getElementById(id);
const visible = (w, id) => $(w, id).style.display !== 'none';
const esperar = () => new Promise(r => setTimeout(r, 0));
async function verificar(w){
  $(w, 'crAccion').value = 'verificar';
  $(w, 'btnCrPaso1').click();
  await esperar();
}

test('PF286 11 (c): elegir «Verificar» muestra el bloque de verificación, oculta las propuestas y pide webCRListaVerificar', async () => {
  const w = montar(BASE);
  await verificar(w);
  assert.equal(visible(w, 'crPaso2'), true);
  assert.equal(visible(w, 'crVerificarBox'), true);
  assert.equal(visible(w, 'crPropuestasBloque'), false);
  assert.equal(visible(w, 'crSelectorParBox'), false, 'no hay selector de corrida');
  assert.equal(visible(w, 'crPaso3'), false, 'no hay formulario');
  // Los objetos de jsdom son de otro «realm»: se comparan como JSON.
  assert.equal(JSON.stringify(w.__pedidos), JSON.stringify([{ accion: 'webCRListaVerificar', params: {} }]));
});

test('PF286 11 (c): lo pendiente y lo aplicado sin propuesta se listan con su nota y su motivo', async () => {
  const w = montar(Object.assign({}, BASE, {
    aplicadas: [ITEM({ tag: '#1', nombre: 'Ok' })],
    pendientes: [ITEM({ tag: '#2', nombre: 'Falta' }), ITEM({ tag: '#3', nombre: 'Manual', tipo: 'Expulsión', rango: 'Miembro', rango2: '', confirmaManual: true })],
    excepcionales: [ITEM({ tag: '#4', nombre: 'Rara', fechaTxt: '28/10/2026', motivo: 'No tenía propuesta en la corrida.' })]
  }));
  await verificar(w);
  const texto = $(w, 'crVerificarResultado').textContent;
  assert.match(texto, /27\/10\/2026 \(temporada 5, semana 2, día 3\)/);
  assert.match(texto, /Falta aplicar 2 propuesta\(s\)/);
  assert.match(texto, /1 cambio\(s\) se aplicaron sin estar propuestos/);
  assert.match(texto, /Falta aplicar \(2\)/);
  assert.match(texto, /Aplicados de forma excepcional \(1\)/);
  assert.match(texto, /Aplicados conforme a la propuesta \(1\)/);
  assert.match(texto, /Ascenso de Miembro a Veterano/);
  assert.match(texto, /Se marca «Realizado» sola/, 'la propuesta con rangos se resuelve sola');
  assert.match(texto, /márcala «Realizado» a mano/, 'Expulsión, Elegible Admin y Ascenso de clan no se resuelven solas');
  assert.match(texto, /No tenía propuesta en la corrida\./);
  assert.equal($(w, 'crVerificarResultado').querySelector('.msg-ok'), null);
});

test('PF286 11 (c): si todo coincide lo dice y no muestra tablas de problemas', async () => {
  const w = montar(Object.assign({}, BASE, { aplicadas: [ITEM()], propuestasN: 1 }));
  await verificar(w);
  const res = $(w, 'crVerificarResultado');
  assert.ok(res.querySelector('.msg-ok'), 'aviso de que todo coincide');
  assert.equal(res.querySelector('.msg-error'), null);
  assert.doesNotMatch(res.textContent, /Falta aplicar \(/);
  assert.doesNotMatch(res.textContent, /excepcional/);
});

test('PF286 11 (c): sin ninguna propuesta registrada avisa que no hay nada que verificar', async () => {
  const w = montar({ ok: true, hayCorrida: false, diaTxt: '', temporada: '', semana: '', dia: '', propuestasN: 0, aplicadas: [], pendientes: [], excepcionales: [] });
  await verificar(w);
  assert.match($(w, 'crVerificarResultado').textContent, /no hay nada que verificar/);
});

test('PF286 11 (c): los textos de la hoja se escapan y los errores del backend y de conexión se muestran', async () => {
  const w = montar(Object.assign({}, BASE, { excepcionales: [ITEM({ nombre: '<img src=x>', motivo: '<b>m</b>' })] }));
  await verificar(w);
  assert.equal($(w, 'crVerificarResultado').querySelector('img'), null);
  assert.equal($(w, 'crVerificarResultado').querySelector('b'), null);

  const w2 = montar({ ok: false, error: 'Sesión inválida' });
  await verificar(w2);
  assert.match($(w2, 'crVerificarMsg').textContent, /Sesión inválida/);

  const w3 = montar('sin red');
  await verificar(w3);
  assert.match($(w3, 'crVerificarMsg').textContent, /Error de conexión: sin red/);
});

test('PF286 11 (c): «Volver a verificar» repite el pedido y volver o elegir otra acción restituye las propuestas', async () => {
  const w = montar(BASE);
  await verificar(w);
  $(w, 'btnCrVerificar').click();
  await esperar();
  assert.equal(w.__pedidos.length, 2);

  $(w, 'crVolverPaso1').click();
  assert.equal(visible(w, 'crVerificarBox'), false);
  assert.equal(visible(w, 'crPropuestasBloque'), true);
  assert.equal(visible(w, 'crPaso1'), true);

  $(w, 'crAccion').value = 'ver';
  $(w, 'btnCrPaso1').click();
  await esperar();
  assert.equal(visible(w, 'crVerificarBox'), false);
  assert.equal(visible(w, 'crPropuestasBloque'), true);
  assert.equal(visible(w, 'crSelectorParBox'), true, '«Ver propuestas» sigue usando el selector de corrida');
  assert.equal(w.__pedidos.length, 2, 'las otras ramas no piden la verificación');
});

test('PF286: el selector de corrida se llena con los pares de la respuesta y elegir uno pide esa corrida', async () => {
  const pares = [{ idAscenso: 'A_05_S_02_N_01' }, { idAscenso: 'A_05_S_01_N_01' }];
  const w = montar(Object.assign({}, BASE, { parId: 'A_05_S_02_N_01', pares }));
  await verificar(w);
  const sel = $(w, 'crVerificarPar');
  assert.equal(sel.options.length, 3, 'la opción por defecto y los dos pares');
  assert.equal(sel.value, '', 'por defecto sigue pidiendo la corrida más reciente');
  assert.match($(w, 'crVerificarResultado').textContent, /Corrida A_05_S_02_N_01 · Propuestas del 27\/10\/2026/, 'el resumen dice qué corrida se verificó');

  sel.value = 'A_05_S_01_N_01';
  sel.dispatchEvent(new w.Event('change'));
  await esperar();
  assert.equal(JSON.stringify(w.__pedidos[1]), JSON.stringify({ accion: 'webCRListaVerificar', params: { idAscenso: 'A_05_S_01_N_01' } }));
  assert.equal(sel.value, 'A_05_S_01_N_01', 'conserva la corrida elegida al volver a llenar el selector');
});

test('PF286: una corrida elegida sin propuestas lo dice, y volver a entrar restablece la más reciente', async () => {
  const w = montar({ ok: true, hayCorrida: false, parId: 'A_05_S_01_N_01', pares: [{ idAscenso: 'A_05_S_01_N_01' }], diaTxt: '', temporada: '', semana: '', dia: '', propuestasN: 0, aplicadas: [], pendientes: [], excepcionales: [] });
  await verificar(w);
  const sel = $(w, 'crVerificarPar');
  sel.value = 'A_05_S_01_N_01';
  sel.dispatchEvent(new w.Event('change'));
  await esperar();
  assert.match($(w, 'crVerificarResultado').textContent, /Esa corrida no tiene propuestas/);

  $(w, 'crVolverPaso1').click();
  await verificar(w);
  assert.equal(sel.value, '', 'al entrar otra vez vuelve a la corrida más reciente');
});
