'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF101): «Modificar torneo» de admin.html. Comprueba que (1) al elegir un torneo los requisitos
// guardados se precargan (con «Cargando…» mientras tanto) y que «Guardar cambios» no envía hasta que terminen,
// (2) la respuesta de un torneo elegido antes no pisa la del actual, (3) el Nom_Multi y la cuenta organizadora vienen
// ya elegidos y se puede cambiar a cualquier otra cuenta, y (4) al guardar solo se manda organizador/cuenta si el admin
// los cambió (y nunca con organizador de la API). [→ Contexto_Base_Web.md §PF101]
//
// admin.html tiene miles de líneas de script, así que NO se carga entero: se extraen del <script> inline REAL los tramos
// entre marcadores (si alguien los reorganiza, los marcadores fallan a propósito).
//
// LÍMITE: DOM simulado y backend simulado. No prueba el backend real (_listarTorneosModificables(), webAdminRequisitosClanes,
// webAdminCuentasDeNomMulti) ni el aspecto en pantalla.

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
  tramo('async function cargarRequisitosPorClan(id, esVigente){', '/**\n * armarPayloadRequisitos()', 'cargarRequisitosPorClan() y la precarga de Modificar'),
  tramo('const cuentasPorNomMultiCache = {};', '/**\n * aplicarAutorYCuentaPrecargados(datos, sufijo, prefijo)', 'cuentas y precargarOrganizadorMod()'),
  tramo('function leerCuentaOrgElegida(sufijo){', '/**\n * leerCuentaOrgElegidaSorteo(sufijo)', 'leerCuentaOrgElegida()'),
  tramo("document.getElementById('btnModificarTorneo').addEventListener('click'", "document.getElementById('btnPlanificarTorneo').addEventListener('click'", 'el listener de #btnModificarTorneo')
].join('\n');

const CUERPO = `<!doctype html><html><body>
  <select id="tSelectHoy">
    <option value="">Elige un torneo…</option>
    <option value="T1" data-nom-multi="Carlos" data-tag-org="#B" data-clan="Clan B" data-clan-tag="#CB" data-organizador-fuente="Web">T1</option>
    <option value="T2" data-nom-multi="Diana" data-tag-org="#D1" data-organizador-fuente="Web">T2</option>
    <option value="T3" data-nom-multi="" data-organizador-fuente="API">T3</option>
    <option value="T4" data-nom-multi="Zeta" data-tag-org="#Z9" data-organizador-fuente="Manual">T4</option>
  </select>
  <input id="tModificarLink"><input id="tFechaMod" value="2026-10-18"><input id="tHoraMod" value="21:00">
  <select id="torneoTipo"><option value="principal">principal</option></select>
  <div id="tAutorEditableModWrap">
    <select id="tAutorSelectMod">
      <option value="">Sin cambios (mantener autor actual)</option>
      <option value="Carlos">Carlos</option><option value="Diana">Diana</option>
      <option value="__otro__">Ninguna de las anteriores</option>
    </select>
    <input id="tAutorManualMod" style="display:none">
  </div>
  <div id="tCuentaOrgBoxMod" style="display:none">
    <select id="tCuentaOrgSelectMod"><option value="">Elige la cuenta…</option></select>
    <div id="tCuentaOrgInfoMod"></div>
  </div>
  <input id="tComentario">
  <div id="requisitosTorneoBox">
    <label><input type="checkbox" id="reqTrofGuerra_mismo"> mismo</label>
    <input type="text" id="reqTrofGuerra_mismoValor" placeholder="Ejm: 2400">
    <input type="text" id="reqTrofGuerra_ClanA" placeholder="Ejm: 2400">
    <input type="text" id="reqTrofGuerra_ClanB" placeholder="Ejm: 2400">
    <input type="text" id="reqAtaques_ClanA" placeholder="Ejm: 16">
    <input type="text" id="reqAtaques_ClanB" placeholder="Ejm: 16">
    <select id="reqAtaquesBarcos"><option value="0">0</option><option value="5">5</option><option value="16">16</option></select>
    <select id="reqMiembroActivo"><option value="Sí">Sí</option><option value="No">No</option></select>
    <select id="reqReaccion"><option value="Sí">Sí</option><option value="No">No</option></select>
    <select id="reqPresenciaWhatsapp"><option value="Sí">Sí</option><option value="No">No</option></select>
  </div>
  <div id="modificarTorneoMsg"></div>
  <button id="btnModificarTorneo">Guardar cambios</button>
</body></html>`;

const REQ_T1 = { ok: true, requisitos: {
  ClanA: { minTrofeosGuerra: 2400, minAtaquesSemana: 16 }, ClanB: { minTrofeosGuerra: 3000, minAtaquesSemana: 12 },
  ataquesBarcosSemana: '5', miembroActivo: 'No', reaccion: 'Sí', presenciaWhatsapp: 'No'
} };
const REQ_T2 = { ok: true, requisitos: {
  ClanA: { minTrofeosGuerra: 1000, minAtaquesSemana: 8 }, ClanB: { minTrofeosGuerra: 1100, minAtaquesSemana: 9 },
  ataquesBarcosSemana: '16', miembroActivo: 'Sí', reaccion: 'No', presenciaWhatsapp: 'Sí'
} };
const CUENTAS = {
  Carlos: [
    { tag: '#A', nombre: 'Carlos 1', clan: 'Clan A', clanTag: '#CA' },
    { tag: '#B', nombre: 'Carlos 2', clan: 'Clan B', clanTag: '#CB' },
    { tag: '#C', nombre: 'Carlos 3', clan: 'Clan C', clanTag: '#CC' }
  ],
  Diana: [{ tag: '#D1', nombre: 'Diana 1', clan: 'Clan A', clanTag: '#CA' }],
  Zeta: [{ tag: '#Z1', nombre: 'Zeta 1', clan: 'Clan A', clanTag: '#CA' }]
};

const esperar = (ms = 0) => new Promise(r => setTimeout(r, ms));

function montar(){
  const dom = new JSDOM(CUERPO, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__llamadas = [];
  window.__api = async () => ({ ok: false });
  window.__post = async () => ({ ok: true });
  window.eval(`
    var CLANES_REQUISITOS = ['ClanA', 'ClanB'];
    var SESSION_KEY = 'sesion';
    function esc(s){ return String(s == null ? '' : s); }
    function manejarRespuestaAuth(){ return false; }
    function apiGetAuth(accion, params){ window.__llamadas.push([accion, params]); return window.__api(accion, params); }
    function apiPost(accion, payload){ window.__llamadas.push([accion, payload]); return window.__post(accion, payload); }
    function conBotonOcupado(btn, fn){ return fn(); }
    function fechaInputADDMMYYYY(v){ return v ? '18/10/2026' : ''; }
    function horaConSegundos(v){ return v ? v + ':00' : ''; }
    function armarPremiosCSV(){ return ''; }
    function armarPayloadRequisitos(){ return { req: true }; }
    function obtenerSemanasSeleccionadas(){ return ''; }
    function poblarPremiosEditor(){}
    function pintarSemanasSelector(){}
    function actualizarEtiquetaSinCambiosAutor(){}
    function aplicarBloqueoOrganizadorMod(){}
    function cargarTorneosHoy(){}
    function cargarGanadoresTorneo(){}
    ${CODIGO}
    window.__t = {
      get estado(){ return estadoPrecargaMod; },
      precargar: precargarTorneoModificar,
      leerCuenta: leerCuentaOrgElegida
    };
  `);
  const d = window.document;
  window.__elegir = (id) => { d.getElementById('tSelectHoy').value = id; return d.getElementById('tSelectHoy').selectedOptions[0]; };
  return window;
}

function apiNormal(window, esperaMs = 0){
  window.__api = async (accion, params) => {
    await esperar(esperaMs);
    if(accion === 'webAdminRequisitosClanes') return params.id === 'T2' ? REQ_T2 : REQ_T1;
    if(accion === 'webAdminCuentasDeNomMulti') return { ok: true, cuentas: CUENTAS[params.nomMulti] || [] };
    return { ok: false };
  };
}

const val = (w, id) => w.document.getElementById(id).value;

test('PF101: mientras carga se ve «Cargando…» y no los placeholders de ejemplo; al terminar quedan los valores guardados', async () => {
  const w = montar(); apiNormal(w, 20);
  const opt = w.__elegir('T1');
  const p = w.__t.precargar('T1', opt);
  assert.equal(w.__t.estado, 'cargando');
  assert.equal(w.document.getElementById('reqTrofGuerra_ClanA').placeholder, 'Cargando…');
  assert.equal(val(w, 'reqTrofGuerra_ClanA'), '');
  await p;
  assert.equal(w.__t.estado, 'ok');
  assert.equal(val(w, 'reqTrofGuerra_ClanA'), '2,400');
  assert.equal(val(w, 'reqTrofGuerra_ClanB'), '3,000');
  assert.equal(val(w, 'reqAtaques_ClanA'), '16');
  assert.equal(val(w, 'reqAtaques_ClanB'), '12');
  assert.equal(val(w, 'reqAtaquesBarcos'), '5');
  assert.equal(val(w, 'reqMiembroActivo'), 'No');
  assert.equal(val(w, 'reqReaccion'), 'Sí');
  assert.equal(val(w, 'reqPresenciaWhatsapp'), 'No');
  assert.equal(w.document.getElementById('reqTrofGuerra_ClanA').placeholder, 'Ejm: 2400', 'el placeholder original vuelve');
  assert.equal(w.document.getElementById('requisitosTorneoBox').getAttribute('aria-busy'), 'false');
});

test('PF101: los requisitos se piden por el ID del torneo elegido', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T2', w.__elegir('T2'));
  const pedido = w.__llamadas.find(l => l[0] === 'webAdminRequisitosClanes');
  assert.deepEqual({ ...pedido[1] }, { id: 'T2' }); // copia: el objeto nace en el realm de jsdom
  assert.equal(val(w, 'reqTrofGuerra_ClanA'), '1,000');
});

test('PF101: la respuesta de un torneo elegido antes no pisa la del torneo actual', async () => {
  const w = montar();
  w.__api = async (accion, params) => {
    if(accion === 'webAdminRequisitosClanes'){
      await esperar(params.id === 'T1' ? 60 : 5);
      return params.id === 'T1' ? REQ_T1 : REQ_T2;
    }
    return { ok: true, cuentas: CUENTAS[params.nomMulti] || [] };
  };
  const p1 = w.__t.precargar('T1', w.__elegir('T1'));
  const p2 = w.__t.precargar('T2', w.__elegir('T2'));
  await Promise.all([p1, p2]);
  assert.equal(val(w, 'reqTrofGuerra_ClanA'), '1,000', 'quedan los de T2, no los de T1 que llegaron después');
  assert.equal(w.__t.estado, 'ok');
});

test('PF101: si falla la carga de requisitos queda en error, avisa y «Guardar cambios» no envía nada', async () => {
  const w = montar();
  w.__api = async accion => { if(accion === 'webAdminRequisitosClanes') throw new Error('red'); return { ok: true, cuentas: [] }; };
  await w.__t.precargar('T1', w.__elegir('T1'));
  assert.equal(w.__t.estado, 'error');
  assert.match(w.document.getElementById('modificarTorneoMsg').textContent, /No se pudieron cargar los requisitos/);
  assert.equal(w.document.getElementById('reqTrofGuerra_ClanA').placeholder, 'Ejm: 2400', 'no se queda en «Cargando…»');
  w.document.getElementById('btnModificarTorneo').click();
  await esperar(5);
  assert.equal(w.__llamadas.filter(l => l[0] === 'webAdminTorneoModificar').length, 0);
  assert.match(w.document.getElementById('modificarTorneoMsg').textContent, /No se pudieron cargar los datos guardados/);
});

test('PF101: «Guardar cambios» espera mientras los datos siguen cargando', async () => {
  const w = montar(); apiNormal(w, 40);
  const p = w.__t.precargar('T1', w.__elegir('T1'));
  w.document.getElementById('btnModificarTorneo').click();
  await esperar(5);
  assert.equal(w.__llamadas.filter(l => l[0] === 'webAdminTorneoModificar').length, 0);
  assert.match(w.document.getElementById('modificarTorneoMsg').textContent, /Espera un momento/);
  await p;
});

test('PF101: el organizador viene elegido (Nom_Multi + su cuenta) y se puede escoger cualquier otra cuenta de esa persona', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T1', w.__elegir('T1'));
  const d = w.document;
  assert.equal(val(w, 'tAutorSelectMod'), 'Carlos');
  assert.equal(d.getElementById('tCuentaOrgBoxMod').style.display, '');
  const sel = d.getElementById('tCuentaOrgSelectMod');
  assert.deepEqual(Array.from(sel.options).map(o => o.value), ['', '#A', '#B', '#C']);
  assert.equal(sel.value, '#B', 'queda elegida la cuenta registrada');
  sel.value = '#C';
  assert.deepEqual({ ...w.__t.leerCuenta('Mod') }, { tagOrg: '#C', clanOrg: 'Clan C', clanTagOrg: '#CC' });
});

test('PF101: un Nom_Multi que no está en la lista de admins se agrega como opción para poder mostrarlo', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T4', w.__elegir('T4'));
  const opcion = w.document.querySelector('#tAutorSelectMod option[value="Zeta"]');
  assert.ok(opcion && opcion.dataset.dinamica === '1');
  assert.equal(val(w, 'tAutorSelectMod'), 'Zeta');
});

test('PF101: si la cuenta registrada ya no figura entre las de la persona, se avisa y no se elige otra por su cuenta', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T4', w.__elegir('T4'));
  assert.equal(val(w, 'tCuentaOrgSelectMod'), '');
  assert.match(w.document.getElementById('tCuentaOrgInfoMod').textContent, /Cuenta registrada: #Z9.*Ya no figura/);
});

test('PF101: con organizador de la API no se toca el selector ni se piden cuentas', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T3', w.__elegir('T3'));
  assert.equal(val(w, 'tAutorSelectMod'), '');
  assert.equal(w.document.getElementById('tCuentaOrgBoxMod').style.display, 'none');
  assert.equal(w.__llamadas.filter(l => l[0] === 'webAdminCuentasDeNomMulti').length, 0);
});

async function guardar(w, id){
  w.__elegir(id);
  w.document.getElementById('btnModificarTorneo').click();
  await esperar(5);
  return w.__llamadas.filter(l => l[0] === 'webAdminTorneoModificar').map(l => l[1]);
}

test('PF101: al guardar sin cambiar organizador ni cuenta no se envía autor ni cuenta (no se reescribe el organizador)', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T1', w.__elegir('T1'));
  const [payload] = await guardar(w, 'T1');
  assert.equal(payload.autor, '');
  assert.equal(payload.tagOrg, '');
  assert.equal(payload.clanOrg, '');
  assert.equal(payload.clanTagOrg, '');
  assert.equal(payload.id, 'T1');
});

test('PF101: al elegir otra cuenta de la misma persona se envía el Nom_Multi y la cuenta nueva con su clan', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T1', w.__elegir('T1'));
  w.document.getElementById('tCuentaOrgSelectMod').value = '#C';
  const [payload] = await guardar(w, 'T1');
  assert.equal(payload.autor, 'Carlos');
  assert.equal(payload.tagOrg, '#C');
  assert.equal(payload.clanOrg, 'Clan C');
  assert.equal(payload.clanTagOrg, '#CC');
});

test('PF101: al cambiar a otro Nom_Multi se envía ese Nom_Multi', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T1', w.__elegir('T1'));
  w.document.getElementById('tAutorSelectMod').value = 'Diana';
  const [payload] = await guardar(w, 'T1');
  assert.equal(payload.autor, 'Diana');
});

test('PF101: con el bloque de organizador de solo lectura (API) nunca se envían autor ni cuenta', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T3', w.__elegir('T3'));
  w.document.getElementById('tAutorEditableModWrap').style.display = 'none';
  w.document.getElementById('tAutorSelectMod').value = 'Carlos';
  const [payload] = await guardar(w, 'T3');
  assert.equal(payload.autor, '');
  assert.equal(payload.tagOrg, '');
});

test('PF101: tras guardar bien, el estado de la precarga vuelve a «ok» y se quitan las opciones agregadas', async () => {
  const w = montar(); apiNormal(w);
  await w.__t.precargar('T4', w.__elegir('T4'));
  await guardar(w, 'T4');
  assert.equal(w.__t.estado, 'ok');
  assert.equal(w.document.querySelectorAll('#tAutorSelectMod option[data-dinamica]').length, 0);
});
