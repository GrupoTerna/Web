'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF107): flujo de «Modificar sorteo» de admin.html, gemelo de modificar-torneo-flujo-dom.test.js (PF105).
// Antes, tras elegir «Modificar» se preguntaba «principal o continuación» y recién después se mostraba la lista de sorteos (y el
// tipo no se podía cambiar). Ahora: «Modificar» salta ese paso, muestra primero la lista de sorteos y, al elegir uno, pregunta el
// tipo ya precargado con el que tiene y editable en ambos sentidos. [→ Contexto_Base_Web.md §PF107]
//
// NO se carga admin.html entero: se extraen del <script> inline REAL los tramos entre marcadores. LÍMITE: DOM y funciones
// auxiliares simulados; no prueba el backend ni el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo("document.getElementById('btnSorteoPaso1').addEventListener('click'", "document.getElementById('sorteoVolverPaso1')", 'el listener de btnSorteoPaso1'),
  tramo("document.getElementById('sorteoVolverPaso1').addEventListener('click'", "/** FIX (10-sep-2026, sección 5.4 del consolidado", 'sorteoVolverPaso1'),
  tramo("let sorteoSorteoPrincipalId = '';", '/**\n * btnRegistrarSorteo', 'mostrarPaso3Sorteo(), renderSorteoPrincipalLista(), btnSorteoPaso2, aplicarTipoModificarSorteo() y reiniciarTipoModificarSorteo()'),
  tramo("document.getElementById('sSelectHoy').addEventListener('change', () => {", "document.getElementById('tSelectHoy').addEventListener('change'", 'el listener de #sSelectHoy')
].join('\n');

const CUERPO = `<!doctype html><html><body>
  <div id="sorteoPaso1">
    <select id="sorteoAccion">
      <option value="">Elige…</option><option value="planificar">p</option><option value="registrar">r</option><option value="modificar">m</option>
    </select>
    <button id="btnSorteoPaso1">Continuar</button>
  </div>
  <div id="sorteoPaso2" style="display:none">
    <a id="sorteoVolverPaso1" href="#">c</a>
    <select id="sorteoTipo"><option value="">Elige…</option><option value="principal">principal</option><option value="continuacion">continuacion</option></select>
    <button id="btnSorteoPaso2">Continuar</button>
  </div>
  <div id="sorteoPaso3" style="display:none">
    <a id="sorteoVolverPaso2" href="#">c</a>
    <div id="camposRegistrarSorteo" style="display:none"><div id="filaFechaHoraSorteoReg"></div></div>
    <div id="camposModificarSorteo" style="display:none">
      <select id="sSelectHoy">
        <option value="">Elige un sorteo…</option>
        <option value="S1" data-fecha="2026-10-18T05:00:00.000Z" data-idprincipal="">S1</option>
        <option value="S2" data-fecha="2026-10-18T05:00:00.000Z" data-idprincipal="S1">S2</option>
        <option value="S3" data-fecha="2026-10-18T05:00:00.000Z" data-idprincipal="">S3</option>
      </select>
      <div id="sModTipoBox" style="display:none">
        <select id="sorteoTipoMod"><option value="principal">principal</option><option value="continuacion">continuacion</option></select>
      </div>
      <div id="filaFechaHoraSorteoMod"></div>
      <input id="sFechaMod"><input id="sHoraMod">
      <select id="sAutorSelectMod"><option value="">Sin cambios</option></select>
      <input id="sAutorManualMod"><div id="sCuentaOrgBoxMod"></div>
      <select id="sCuentaOrgSelectMod"></select><div id="sCuentaOrgInfoMod"></div>
    </div>
    <div id="camposPlanificarSorteo" style="display:none"><div id="filaFechaHoraSorteoPlan"></div></div>
    <div id="camposSorteoPrincipal" style="display:none">
      <div id="sorteoPrincipalLista"></div><div id="sorteoPrincipalElegidoMsg"></div>
    </div>
    <input id="sComentario">
    <div id="premiosEditorSorteoMod"></div><div id="premiosEditorSorteoPlan"></div>
    <button id="btnRegistrarSorteo"></button><button id="btnModificarSorteo"></button><button id="btnPlanificarSorteo"></button>
  </div>
</body></html>`;

function montar(){
  const dom = new JSDOM(CUERPO, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__foco = [];
  window.__requisitos = [];
  window.eval(`
    function esc(s){ return String(s == null ? '' : s); }
    function pad2(n){ return String(n).padStart(2, '0'); }
    function enfocarPrimerControl(el){ window.__foco.push(el.id); }
    function poblarPremiosEditor(){}
    function pintarSemanasSelector(){}
    function preseleccionarSemanas(){}
    function actualizarEtiquetaSinCambiosAutorSorteo(){}
    function cargarRequisitosSorteoPorClan(id){ window.__requisitos.push(id); }
    var sorteosHoyData = [
      { id: 'S1', fecha: '2026-10-18', autor: 'Ana' },
      { id: 'S2', idPrincipal: 'S1', fecha: '2026-10-18', autor: 'Luis' },
      { id: 'S3', fecha: '2026-10-18', autor: 'Eva' }
    ];
    ${CODIGO}
    window.__s = {
      get principalId(){ return sorteoSorteoPrincipalId; },
      set principalId(v){ sorteoSorteoPrincipalId = v; }
    };
  `);
  return window;
}

const $ = (w, id) => w.document.getElementById(id);
const visible = (w, id) => $(w, id).style.display !== 'none';
const cambiar = (w, id, valor) => { $(w, id).value = valor; $(w, id).dispatchEvent(new w.Event('change')); };
const continuarModificar = (w) => { cambiar(w, 'sorteoAccion', 'modificar'); $(w, 'btnSorteoPaso1').click(); };

test('PF107: «Modificar» salta el paso del tipo y muestra directamente la lista de sorteos', () => {
  const w = montar();
  continuarModificar(w);
  assert.equal(visible(w, 'sorteoPaso2'), false, 'ya no se pregunta principal/continuación antes de la lista');
  assert.equal(visible(w, 'sorteoPaso3'), true);
  assert.equal(visible(w, 'camposModificarSorteo'), true);
  assert.equal(visible(w, 'sModTipoBox'), false, 'el tipo aparece recién al elegir un sorteo');
  assert.equal(visible(w, 'camposSorteoPrincipal'), false);
  assert.ok(w.__foco.includes('sorteoPaso3'), 'el foco pasa al paso 3');
});

test('PF107: «Registrar» y «Planificar» siguen preguntando el tipo antes de continuar', () => {
  for(const accion of ['registrar', 'planificar']){
    const w = montar();
    cambiar(w, 'sorteoAccion', accion);
    $(w, 'btnSorteoPaso1').click();
    assert.equal(visible(w, 'sorteoPaso2'), true, accion);
    assert.equal(visible(w, 'sorteoPaso3'), false, accion);
  }
});

test('PF107: si se pasó antes por «Modificar», el tipo no queda elegido de antemano en «Registrar»', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S1'); // deja sorteoTipo fijado en «principal» por el flujo de Modificar
  cambiar(w, 'sorteoAccion', 'registrar');
  $(w, 'btnSorteoPaso1').click();
  assert.equal($(w, 'sorteoTipo').value, '');
  assert.equal(visible(w, 'sorteoPaso2'), true);
});

test('PF107: al elegir un sorteo principal aparece el tipo ya en «principal» y sin lista de principales', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S1');
  assert.equal(visible(w, 'sModTipoBox'), true);
  assert.equal($(w, 'sorteoTipoMod').value, 'principal');
  assert.equal($(w, 'sorteoTipo').value, 'principal');
  assert.equal(visible(w, 'camposSorteoPrincipal'), false);
  assert.equal(w.__s.principalId, '');
  assert.deepEqual(w.__requisitos, ['S1'], 'los requisitos del sorteo elegido se siguen recargando');
});

test('PF107: al elegir una continuación el tipo sale en «continuación» con su principal actual ya elegido', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S2');
  assert.equal($(w, 'sorteoTipoMod').value, 'continuacion');
  assert.equal($(w, 'sorteoTipo').value, 'continuacion');
  assert.equal(visible(w, 'camposSorteoPrincipal'), true);
  assert.equal(w.__s.principalId, 'S1');
  assert.match($(w, 'sorteoPrincipalElegidoMsg').textContent, /Sorteo principal actual: S1/);
  const ids = Array.from(w.document.querySelectorAll('#sorteoPrincipalLista details')).map(d => d.dataset.id);
  assert.ok(!ids.includes('S2'), 'el sorteo que se modifica no se ofrece como principal de sí mismo');
  assert.ok(ids.includes('S1') && ids.includes('S3'));
});

test('PF107: una continuación se puede pasar a principal (se borra el principal) y volver a continuación (se restaura)', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S2');
  cambiar(w, 'sorteoTipoMod', 'principal');
  assert.equal($(w, 'sorteoTipo').value, 'principal');
  assert.equal(w.__s.principalId, '');
  assert.equal(visible(w, 'camposSorteoPrincipal'), false);
  assert.equal($(w, 'sorteoPrincipalElegidoMsg').textContent, '');
  cambiar(w, 'sorteoTipoMod', 'continuacion');
  assert.equal($(w, 'sorteoTipo').value, 'continuacion');
  assert.equal(w.__s.principalId, 'S1');
  assert.equal(visible(w, 'camposSorteoPrincipal'), true);
});

test('PF107: un sorteo principal se puede pasar a continuación y entonces debe elegir su principal', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S3');
  cambiar(w, 'sorteoTipoMod', 'continuacion');
  assert.equal($(w, 'sorteoTipo').value, 'continuacion');
  assert.equal(visible(w, 'camposSorteoPrincipal'), true);
  assert.equal(w.__s.principalId, '', 'todavía no hay principal elegido: «Guardar cambios» lo exige');
  assert.equal($(w, 'sorteoPrincipalElegidoMsg').textContent, '');
  w.document.querySelector('#sorteoPrincipalLista details[data-id="S1"] .btn-elegir-sorteo-principal').click();
  assert.equal(w.__s.principalId, 'S1');
});

test('PF107: al cambiar de un sorteo a otro el tipo se vuelve a precargar con el del sorteo nuevo', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S2');
  assert.equal($(w, 'sorteoTipoMod').value, 'continuacion');
  cambiar(w, 'sSelectHoy', 'S1');
  assert.equal($(w, 'sorteoTipoMod').value, 'principal');
  assert.equal(w.__s.principalId, '');
  assert.equal(visible(w, 'camposSorteoPrincipal'), false);
});

test('PF107: sin sorteo elegido (o al quitarlo) el selector de tipo se oculta', () => {
  const w = montar();
  continuarModificar(w);
  cambiar(w, 'sSelectHoy', 'S2');
  assert.equal(visible(w, 'sModTipoBox'), true);
  cambiar(w, 'sSelectHoy', '');
  assert.equal(visible(w, 'sModTipoBox'), false);
  assert.equal(visible(w, 'camposSorteoPrincipal'), false);
  assert.equal($(w, 'sorteoTipo').value, 'principal');
});

test('PF107: «Cambiar» en «Modificar» vuelve al paso 1 (no hubo paso 2)', () => {
  const w = montar();
  continuarModificar(w);
  $(w, 'sorteoVolverPaso2').click();
  assert.equal(visible(w, 'sorteoPaso3'), false);
  assert.equal(visible(w, 'sorteoPaso2'), false);
});

test('PF107: el guardado de «Modificar sorteo» manda tipoSorteo y reinicia el tipo al terminar', () => {
  assert.match(HTML, /tipoSorteo: esContinuacion \? 'continuacion' : 'principal'/);
  const guardado = tramo("document.getElementById('btnModificarSorteo').addEventListener('click'", 'initTorneoWizard();', 'btnModificarSorteo');
  assert.match(guardado, /reiniciarTipoModificarSorteo\(\)/);
});
