'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (04-nov-2026, pedido de la usuaria: «el botón de buscar miembros no hace nada en admin»): #miembroSec está al
// final del panel de admin.html, después de otras tarjetas. buscarMiembro() mostraba el resultado ahí sin desplazar la
// vista, así que arriba solo desaparecía «Buscando…» y parecía que el botón no hacía nada. Ahora lleva la vista al
// resultado y el foco al nombre.
//
// admin.html tiene miles de líneas de script, así que NO se carga entero: se extrae buscarMiembro() del <script>
// inline REAL entre marcadores (si alguien lo reorganiza, los marcadores fallan a propósito).
//
// LÍMITE: DOM simulado (jsdom no hace layout ni desplaza nada: se comprueba que se PIDE el desplazamiento y el foco).
// No prueba el backend real ni que el resultado quede visible en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const INICIO = 'async function buscarMiembro(){';
const FIN = "document.getElementById('btnBuscar').addEventListener";
const i = HTML.indexOf(INICIO);
const f = HTML.indexOf(FIN, i + 1);
assert.ok(i >= 0 && f > i, 'marcadores de buscarMiembro() no encontrados (¿se reorganizó admin.html?)');
const CODIGO = HTML.slice(i, f);
// 5-nov-2026: se usa la _pareceTag() REAL de admin.html (antes el test llevaba una copia con la regla vieja de 4+ letras o números).
const iTag = HTML.indexOf('function _pareceTag(texto){');
const fTag = HTML.indexOf('async function buscarMiembro(){');
assert.ok(iTag >= 0 && fTag > iTag, 'marcadores de _pareceTag() no encontrados (¿se reorganizó admin.html?)');
const CODIGO_TAG = HTML.slice(iTag, fTag);

function montar({ reducirMovimiento = false } = {}){
  const dom = new JSDOM(`<!doctype html><html><body>
    <input id="tagInput" value="#2GG8PJ8GC">
    <div id="buscarSugerencias" style="display:none"></div>
    <div id="buscarMsg"></div>
    <div id="miembroSec" style="display:none"><h3 id="mNombre"></h3></div>
  </body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  const llamadas = { scroll: [], foco: [] };
  window.HTMLElement.prototype.scrollIntoView = function(opts){ llamadas.scroll.push({ id: this.id, opts }); };
  const focoOriginal = window.HTMLElement.prototype.focus;
  window.HTMLElement.prototype.focus = function(opts){ llamadas.foco.push({ id: this.id, opts }); return focoOriginal.call(this, opts); };
  window.matchMedia = () => ({ matches: reducirMovimiento });
  window.eval(`
    var _sugerenciasMiembroCache = [];
    ${CODIGO_TAG}
    function normalizarTag(t){ return String(t).toUpperCase(); }
    function esc(t){ return String(t); }
    function manejarRespuestaAuth(){ return false; }
    function renderSugerenciasMiembro(){}
    function _ordenarSugerenciasMiembro(x){ return x; }
    var jugadorMostrado = null;
    function renderMiembro(j){ jugadorMostrado = j; document.getElementById('miembroSec').style.display = 'block'; }
    var respuestaApi = { ok: true, jugador: { tag: '#2GG8PJ8GC', nombre: 'Prueba' } };
    async function apiGetAuth(){ return respuestaApi; }
    ${CODIGO}
    window.buscarMiembro = buscarMiembro;
  `);
  return { window, llamadas };
}

test('tras encontrar al miembro, la vista se desplaza a #miembroSec y el foco va a #mNombre', async () => {
  const { window, llamadas } = montar();
  await window.buscarMiembro();
  assert.equal(window.document.getElementById('miembroSec').style.display, 'block');
  assert.equal(llamadas.scroll.length, 1);
  assert.equal(llamadas.scroll[0].id, 'miembroSec');
  assert.equal(llamadas.scroll[0].opts.block, 'start');
  assert.equal(llamadas.scroll[0].opts.behavior, 'smooth');
  assert.equal(llamadas.foco.length, 1);
  assert.equal(llamadas.foco[0].id, 'mNombre');
  assert.equal(llamadas.foco[0].opts.preventScroll, true);
  assert.equal(window.document.getElementById('mNombre').getAttribute('tabindex'), '-1');
  assert.equal(window.document.getElementById('buscarMsg').innerHTML, '');
});

test('con «reducir movimiento» el desplazamiento es inmediato', async () => {
  const { window, llamadas } = montar({ reducirMovimiento: true });
  await window.buscarMiembro();
  assert.equal(llamadas.scroll[0].opts.behavior, 'auto');
});

test('si el backend responde con error, no se desplaza y el error se ve junto al buscador', async () => {
  const { window, llamadas } = montar();
  window.eval("respuestaApi = { ok: false, error: 'Sin permiso' };");
  await window.buscarMiembro();
  assert.equal(llamadas.scroll.length, 0);
  assert.equal(llamadas.foco.length, 0);
  assert.match(window.document.getElementById('buscarMsg').innerHTML, /Sin permiso/);
});
