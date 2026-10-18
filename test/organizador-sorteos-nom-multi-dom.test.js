'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF111): las listas «¿Quién organizó el sorteo?» de Registrar, Modificar y Planificar sorteo
// (#sAutorSelect, #sAutorSelectMod, #sAutorSelectPlan) nunca recibían los Nom_Multi de los admins: cargarNomMultisAdmins()
// solo llenaba las de Torneos y la de Cambio de rango, así que en Sorteos solo salían «Lo organicé yo» y «Ninguna de las
// anteriores». Ahora Sorteos usa la misma lista que Torneos. [→ Contexto_Base_Web.md §PF111]
//
// NO se carga admin.html entero: se extrae del <script> inline REAL la función cargarNomMultisAdmins(). LÍMITE: el backend
// (webAdminNomMultisAdmins) y nomMultiDelAdminDeSesion() están simulados; no prueba el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

const INICIO = 'async function cargarNomMultisAdmins(){';
const FIN = 'actualizarEtiquetaAutorPropio();\n}\n';
const i = HTML.indexOf(INICIO);
const f = HTML.indexOf(FIN, i);
assert.ok(i >= 0 && f > i, 'no se encontró cargarNomMultisAdmins() (¿se reorganizó el archivo?)');
const CODIGO = HTML.slice(i, f + FIN.length);

function selects(ids){
  return ids.map(id => `<select id="${id}"><option value="">fija</option><option value="__otro__">Ninguna de las anteriores</option></select>`).join('');
}

const IDS = ['tAutorSelect', 'tAutorSelectPlan', 'tAutorSelectMod', 'crOrganizadorSelect', 'sAutorSelect', 'sAutorSelectMod', 'sAutorSelectPlan'];

async function correr(nomMultiPropio, lista){
  const dom = new JSDOM(`<!doctype html><body>${selects(IDS)}</body>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.nomMultisAdminsCache = [];
  w.eval(`
    var nomMultisAdminsCache = [];
    function nomMultiDelAdminDeSesion(){ return ${JSON.stringify(nomMultiPropio)}; }
    function manejarRespuestaAuth(){ return false; }
    function actualizarEtiquetaAutorPropio(){}
    async function apiGetAuth(){ return { ok: true, nomMultis: ${JSON.stringify(lista)} }; }
    ${CODIGO}
    window.__listo = cargarNomMultisAdmins();
  `);
  await w.__listo;
  const valores = id => [...w.document.querySelectorAll(`#${id} option`)].map(o => o.value);
  return { valores };
}

test('Sorteos lista los Nom_Multi de los admins, sin repetir al admin de la sesión en Registrar y Planificar', async () => {
  const { valores } = await correr('Diana', ['Ana', 'Diana', 'Luis']);
  for (const id of ['sAutorSelect', 'sAutorSelectPlan']) {
    assert.deepEqual(valores(id), ['', 'Ana', 'Luis', '__otro__'], id);
  }
});

test('«Modificar sorteo» lista a todos, incluido el admin de la sesión (el sorteo pudo organizarlo otra persona)', async () => {
  const { valores } = await correr('Diana', ['Ana', 'Diana', 'Luis']);
  assert.deepEqual(valores('sAutorSelectMod'), ['', 'Ana', 'Diana', 'Luis', '__otro__']);
});

test('Sorteos queda igual que Torneos y Cambio de rango (misma lista, mismo orden)', async () => {
  const { valores } = await correr('Diana', ['Ana', 'Diana', 'Luis']);
  assert.deepEqual(valores('sAutorSelect'), valores('tAutorSelect'));
  assert.deepEqual(valores('sAutorSelectPlan'), valores('tAutorSelectPlan'));
  assert.deepEqual(valores('sAutorSelectMod'), valores('tAutorSelectMod'));
  assert.deepEqual(valores('sAutorSelect'), valores('crOrganizadorSelect'));
});

test('Sin Nom_Multi propio (cuenta única) se listan todos y «Ninguna de las anteriores» sigue al final', async () => {
  const { valores } = await correr('', ['Ana', 'Luis']);
  for (const id of ['sAutorSelect', 'sAutorSelectMod', 'sAutorSelectPlan']) {
    assert.deepEqual(valores(id), ['', 'Ana', 'Luis', '__otro__'], id);
  }
});
