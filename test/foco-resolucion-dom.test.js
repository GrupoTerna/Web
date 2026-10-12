'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (12-oct-2026, accesibilidad, H-1 y H-2 de §PF050): a dónde va el foco al abrir el formulario de Resolución de
// admin.html (abrirResolucionForm()) y al pulsar «Cancelar». Medido antes en Chromium real: sin el arreglo hacían falta
// 51 Tab desde la primera fila y «Cancelar» dejaba el foco en <body>.
// [→ Contexto_Base_Web.md §PF050]
//
// admin.html tiene miles de líneas de script, así que NO se carga entero: se extraen del <script> inline REAL los dos
// tramos entre marcadores (si alguien los reorganiza, los marcadores fallan a propósito).
//
// LÍMITE: prueba el estado del foco con DOM simulado (jsdom no calcula offsetParent: se simula con [hidden]). No prueba
// lo que anuncia un lector de pantalla ni el aspecto del foco; tampoco el backend real.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const TRAMO_ABRIR = tramo(
  '// Botón de #ganadoresLista que abrió el formulario',
  '// Dropdowns de motivos fijos para',
  'abrirResolucionForm() de admin.html'
);
const TRAMO_CANCELAR = tramo(
  "document.getElementById('btnCancelarResolucion').addEventListener('click'",
  "document.getElementById('btnGuardarResolucion').addEventListener('click'",
  'el listener de #btnCancelarResolucion de admin.html'
);

function montar(){
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="ganadoresLista">
      <button type="button" id="g1" class="btnGestionarResolucion">Gestionar</button>
      <details id="det"><summary>Ver lista completa</summary>
        <button type="button" id="g2" class="btnGestionarResolucion">Gestionar</button></details>
    </div>
    <div id="resolucionForm" style="display:none">
      <div id="resolucionParaTexto"></div>
      <select id="resTipo" aria-describedby="resolucionParaTexto"><option value="Descalificado">Descalificado</option></select>
      <div id="resPuestoFinalWrap"></div><input id="resPuestoFinal"><input id="resMotivo">
      <button type="button" id="btnCancelarResolucion">Cancelar</button>
      <div id="resolucionMsg"></div>
    </div>
    <button type="button" id="btnGuardarResolucion">Guardar</button>
  </body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = function(){};
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    get(){ return this.closest('[hidden]') ? null : this.parentNode; }
  });
  window.eval(`
    var TIPO_A_DROPDOWN_MOTIVO = {};
    function actualizarVisibilidadMotivoResolucion(){}
  `);
  // un solo eval: `let resolucionBotonOrigen` no se ve entre dos eval distintos
  window.eval(TRAMO_ABRIR + '\n' + TRAMO_CANCELAR);
  return window;
}

test('H-1: al abrir el formulario el foco pasa a «Tipo de resolución»', () => {
  const w = montar(); const d = w.document;
  d.getElementById('g1').focus();
  w.abrirResolucionForm('#A1', 'Ana', {});
  assert.equal(d.activeElement.id, 'resTipo');
  assert.equal(d.getElementById('resolucionForm').style.display, 'block');
});

test('H-1: el campo enfocado queda descrito por «Registrar resolución para: …» (aria-describedby)', () => {
  const w = montar(); const d = w.document;
  d.getElementById('g1').focus();
  w.abrirResolucionForm('#A1', 'Ana', {});
  const desc = d.getElementById(d.activeElement.getAttribute('aria-describedby'));
  assert.equal(desc.textContent, 'Registrar resolución para: Ana');
  assert.match(HTML, /<select id="resTipo" aria-describedby="resolucionParaTexto">/);
});

test('H-2: «Cancelar» devuelve el foco al botón «Gestionar» que abrió el formulario', () => {
  const w = montar(); const d = w.document;
  d.getElementById('det').open = true;
  d.getElementById('g2').focus();
  w.abrirResolucionForm('#A2', 'Beto', {});
  d.getElementById('btnCancelarResolucion').focus();
  d.getElementById('btnCancelarResolucion').click();
  assert.equal(d.activeElement.id, 'g2');
  assert.equal(d.getElementById('resolucionForm').style.display, 'none');
});

test('H-2: si el botón de origen ya no está visible, el foco va a la lista (tabindex -1)', () => {
  const w = montar(); const d = w.document;
  d.getElementById('g2').focus();
  w.abrirResolucionForm('#A2', 'Beto', {});
  d.getElementById('det').setAttribute('hidden', ''); // la lista completa se cerró o se repintó
  d.getElementById('btnCancelarResolucion').focus();
  d.getElementById('btnCancelarResolucion').click();
  assert.equal(d.activeElement.id, 'ganadoresLista');
  assert.equal(d.getElementById('ganadoresLista').getAttribute('tabindex'), '-1');
});

test('H-2: si el foco no estaba en la lista al abrir (p. ej. Safari), «Cancelar» lleva el foco a la lista', () => {
  const w = montar(); const d = w.document;
  d.body.focus();
  w.abrirResolucionForm('#A1', 'Ana', {});
  d.getElementById('btnCancelarResolucion').focus();
  d.getElementById('btnCancelarResolucion').click();
  assert.equal(d.activeElement.id, 'ganadoresLista');
});
