'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF105): flujo de «Modificar torneo» de admin.html. Antes, tras elegir «Modificar» se preguntaba
// «principal o continuación» y recién después se mostraba la lista de torneos (y el tipo no se podía cambiar). Ahora:
// «Modificar» salta ese paso, muestra primero la lista de torneos y, al elegir uno, pregunta el tipo ya precargado con el
// que tiene y editable en ambos sentidos. [→ Contexto_Base_Web.md §PF105]
//
// Como en modificar-torneo-precarga-dom.test.js, NO se carga admin.html entero: se extraen del <script> inline REAL los
// tramos entre marcadores. LÍMITE: DOM y funciones auxiliares simulados; no prueba el backend ni el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo('let torneoTorneoPrincipalTag = \'\';', '/**\n * Editor de premios ("Planificar torneo").', 'initTorneoWizard(), aplicarTipoModificar() y reiniciarTipoModificar()'),
  tramo('function renderTorneoPrincipalLista(){', '/**\n * cargarNomMultisAdmins()', 'renderTorneoPrincipalLista()'),
  tramo("document.getElementById('tSelectHoy').addEventListener('change', () => {", "document.getElementById('btnRegistrarTorneo').addEventListener('click'", 'el listener de #tSelectHoy')
].join('\n');

const CUERPO = `<!doctype html><html><body>
  <div id="torneoPaso1">
    <select id="torneoAccion">
      <option value="">Elige…</option><option value="planificar">p</option><option value="registrar">r</option><option value="modificar">m</option>
    </select>
    <button id="btnTorneoPaso1">Continuar</button>
  </div>
  <div id="torneoPaso2" style="display:none">
    <a id="torneoVolverPaso1" href="#">c</a>
    <select id="torneoTipo"><option value="">Elige…</option><option value="principal">principal</option><option value="continuacion">continuacion</option></select>
    <button id="btnTorneoPaso2">Continuar</button>
  </div>
  <div id="torneoPaso3" style="display:none">
    <a id="torneoVolverPaso2" href="#">c</a>
    <div id="camposRegistrar" style="display:none"><div id="filaFechaHoraReg"></div><div id="semanaSelectorWrapReg"></div></div>
    <div id="camposModificar" style="display:none">
      <select id="tSelectHoy">
        <option value="">Elige un torneo…</option>
        <option value="T1" data-fecha="2026-10-18T05:00:00.000Z" data-hora="21:00" data-tag-principal="">T1</option>
        <option value="T2" data-fecha="2026-10-18T05:00:00.000Z" data-hora="22:00" data-tag-principal="TAG_T1">T2</option>
        <option value="T3" data-fecha="2026-10-18T05:00:00.000Z" data-hora="23:00" data-tag-principal="">T3</option>
        <option value="__link__">Ingresar link</option>
      </select>
      <input id="tModificarLink">
      <div id="modTipoBox" style="display:none">
        <select id="torneoTipoMod"><option value="principal">principal</option><option value="continuacion">continuacion</option></select>
      </div>
      <div id="filaFechaHoraMod"></div><div id="semanaSelectorWrapMod"></div>
      <input id="tFechaMod"><input id="tHoraMod">
      <select id="tAutorSelectMod"><option value="">Sin cambios</option></select>
      <input id="tAutorManualMod"><div id="tCuentaOrgBoxMod"></div>
      <select id="tCuentaOrgSelectMod"></select><div id="tCuentaOrgInfoMod"></div>
    </div>
    <div id="camposPlanificar" style="display:none"><div id="filaFechaHoraPlan"></div><div id="semanaSelectorWrapPlan"></div></div>
    <div id="camposTorneoPrincipal" style="display:none">
      <div id="torneoPrincipalLista"></div><div id="torneoPrincipalElegidoMsg"></div>
    </div>
    <input id="tComentario">
    <div id="requisitosTorneoBox"></div>
    <div id="premiosEditor"></div><div id="premiosEditorMod"></div>
    <button id="btnRegistrarTorneo"></button><button id="btnModificarTorneo"></button><button id="btnPlanificarTorneo"></button>
  </div>
</body></html>`;

function montar(){
  const dom = new JSDOM(CUERPO, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__foco = [];
  window.__precargas = [];
  window.eval(`
    function esc(s){ return String(s == null ? '' : s); }
    function pad2(n){ return String(n).padStart(2, '0'); }
    function enfocarPrimerControl(el){ window.__foco.push(el.id); }
    function poblarPremiosEditor(){}
    function reiniciarPremiosEditor(){}
    function actualizarEtiquetaSinCambiosAutor(){}
    function aplicarBloqueoOrganizadorMod(){}
    function pintarSemanasSelector(){}
    function preseleccionarSemanas(){}
    function marcarCargaRequisitos(){}
    var seqPrecargaMod = 0, estadoPrecargaMod = 'ok';
    function precargarTorneoModificar(id){ window.__precargas.push(id); }
    var torneosHoyData = [
      { id: 'T1', tagTor: 'TAG_T1', fecha: '2026-10-18', link: '' },
      { id: 'T2', tagTor: 'TAG_T2', tagPrincipal: 'TAG_T1', fecha: '2026-10-18', link: '' },
      { id: 'T3', tagTor: 'TAG_T3', fecha: '2026-10-18', link: '' }
    ];
    ${CODIGO}
    initTorneoWizard();
    window.__t = {
      get principalTag(){ return torneoTorneoPrincipalTag; },
      set principalTag(v){ torneoTorneoPrincipalTag = v; }
    };
  `);
  return window;
}

const $ = (w, id) => w.document.getElementById(id);
const visible = (w, id) => $(w, id).style.display !== 'none';
const cambiar = (w, id, valor) => { $(w, id).value = valor; $(w, id).dispatchEvent(new w.Event('change')); };
const continuarModificar = (w) => { cambiar(w, 'torneoAccion', 'modificar'); $(w, 'btnTorneoPaso1').click(); };

test('PF105: «Modificar» salta el paso del tipo y muestra directamente la lista de torneos', () => {
  const w = montar();
  continuarModificar(w);
  assert.equal(visible(w, 'torneoPaso2'), false, 'ya no se pregunta principal/continuación antes de la lista');
  assert.equal(visible(w, 'torneoPaso3'), true);
  assert.equal(visible(w, 'camposModificar'), true);
  assert.equal(visible(w, 'modTipoBox'), false, 'el tipo aparece recién al elegir un torneo');
  assert.equal(visible(w, 'camposTorneoPrincipal'), false);
});

test('PF105: «Registrar» y «Planificar» siguen preguntando el tipo antes de continuar', () => {
  const w = montar();
  cambiar(w, 'torneoAccion', 'registrar');
  $(w, 'btnTorneoPaso1').click();
  assert.equal(visible(w, 'torneoPaso2'), true);
  assert.equal(visible(w, 'torneoPaso3'), false);
});

test('PF105: si se pasó antes por «Modificar», el tipo no queda elegido de antemano en «Registrar»', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T1'); // deja torneoTipo fijado en «principal» por el flujo de Modificar
  cambiar(w, 'torneoAccion', 'registrar');
  $(w, 'btnTorneoPaso1').click();
  assert.equal($(w, 'torneoTipo').value, '');
  assert.equal(visible(w, 'torneoPaso2'), true);
});

test('PF105: al elegir un torneo principal aparece el tipo ya en «principal» y sin lista de principales', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T1');
  assert.equal(visible(w, 'modTipoBox'), true);
  assert.equal($(w, 'torneoTipoMod').value, 'principal');
  assert.equal($(w, 'torneoTipo').value, 'principal');
  assert.equal(visible(w, 'camposTorneoPrincipal'), false);
  assert.equal(w.__t.principalTag, '');
});

test('PF105: al elegir una continuación el tipo sale en «continuación» con su principal actual ya elegido', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T2');
  assert.equal($(w, 'torneoTipoMod').value, 'continuacion');
  assert.equal($(w, 'torneoTipo').value, 'continuacion');
  assert.equal(visible(w, 'camposTorneoPrincipal'), true);
  assert.equal(w.__t.principalTag, 'TAG_T1');
  assert.match($(w, 'torneoPrincipalElegidoMsg').textContent, /Torneo principal actual: T1/);
  const ids = Array.from(w.document.querySelectorAll('#torneoPrincipalLista details')).map(d => d.dataset.tagTor);
  assert.ok(!ids.includes('TAG_T2'), 'el torneo que se modifica no se ofrece como principal de sí mismo');
  assert.ok(ids.includes('TAG_T1') && ids.includes('TAG_T3'));
});

test('PF105: una continuación se puede pasar a principal (se borra el principal) y volver a continuación (se restaura)', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T2');
  cambiar(w, 'torneoTipoMod', 'principal');
  assert.equal($(w, 'torneoTipo').value, 'principal');
  assert.equal(w.__t.principalTag, '');
  assert.equal(visible(w, 'camposTorneoPrincipal'), false);
  assert.equal($(w, 'torneoPrincipalElegidoMsg').textContent, '');
  cambiar(w, 'torneoTipoMod', 'continuacion');
  assert.equal($(w, 'torneoTipo').value, 'continuacion');
  assert.equal(w.__t.principalTag, 'TAG_T1');
  assert.equal(visible(w, 'camposTorneoPrincipal'), true);
});

test('PF105: un torneo principal se puede pasar a continuación y entonces debe elegir su principal', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T3');
  cambiar(w, 'torneoTipoMod', 'continuacion');
  assert.equal($(w, 'torneoTipo').value, 'continuacion');
  assert.equal(visible(w, 'camposTorneoPrincipal'), true);
  assert.equal(w.__t.principalTag, '', 'todavía no hay principal elegido: «Guardar cambios» lo exige');
  assert.equal($(w, 'torneoPrincipalElegidoMsg').textContent, '');
  w.document.querySelector('#torneoPrincipalLista details[data-tag-tor="TAG_T1"] .btn-elegir-torneo-principal').click();
  assert.equal(w.__t.principalTag, 'TAG_T1');
});

test('PF105: al cambiar de un torneo a otro el tipo se vuelve a precargar con el del torneo nuevo', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T2');
  assert.equal($(w, 'torneoTipoMod').value, 'continuacion');
  cambiar(w, 'tSelectHoy', 'T1');
  assert.equal($(w, 'torneoTipoMod').value, 'principal');
  assert.equal(w.__t.principalTag, '');
  assert.equal(visible(w, 'camposTorneoPrincipal'), false);
});

test('PF105: sin torneo elegido (o al quitarlo) el selector de tipo se oculta', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', 'T2');
  assert.equal(visible(w, 'modTipoBox'), true);
  cambiar(w, 'tSelectHoy', '');
  assert.equal(visible(w, 'modTipoBox'), false);
  assert.equal(visible(w, 'camposTorneoPrincipal'), false);
  assert.equal($(w, 'torneoTipo').value, 'principal');
});

test('PF105: con «Ingresar link» el tipo también se puede elegir y arranca en «principal»', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'tSelectHoy', '__link__');
  assert.equal(visible(w, 'modTipoBox'), true);
  assert.equal($(w, 'torneoTipoMod').value, 'principal');
});

test('PF105: «Cambiar» en «Modificar» vuelve al paso 1 (no hubo paso 2)', () => {
  const w = montar();
  continuarModificar(w);
  $(w, 'torneoVolverPaso2').click();
  assert.equal(visible(w, 'torneoPaso3'), false);
  assert.equal(visible(w, 'torneoPaso2'), false);
});
