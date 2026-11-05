'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria: «lo de admin tampoco funciona»): en «Buscar miembro» de admin.html, escribir «chistris» respondía «No encontré ese Tag
// ni en el Directorio ni en la API…»: _pareceTag() tomaba por Tag cualquier texto de 4 o más letras y números, así que un nombre de una sola palabra nunca se buscaba
// por nombre. Ahora solo son Tags los textos con los caracteres de los Tags de Clash Royale (0289PYLQGRJCUV) y el nombre pide la lista fresca al backend.
//
// Se extraen _pareceTag() y buscarMiembro() REALES del <script> inline de admin.html entre marcadores. LÍMITE: DOM simulado y backend simulado; no prueba el backend real.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const i = HTML.indexOf('function _pareceTag(texto){');
const f = HTML.indexOf("document.getElementById('btnBuscar').addEventListener", i + 1);
assert.ok(i >= 0 && f > i, 'marcadores de _pareceTag()/buscarMiembro() no encontrados (¿se reorganizó admin.html?)');
const CODIGO = HTML.slice(i, f);

function montar({ valor, sugerencias, falloSugerencias = false, cache = [] }){
  const dom = new JSDOM(`<!doctype html><html><body>
    <input id="tagInput" value="${valor}">
    <div id="buscarSugerencias" style="display:none"></div>
    <div id="buscarMsg"></div>
    <div id="miembroSec" style="display:none"><h3 id="mNombre"></h3></div>
  </body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = function(){};
  window.matchMedia = () => ({ matches: true });
  window.__sugerencias = sugerencias;
  window.__falloSugerencias = falloSugerencias;
  window.__cache = cache;
  window.eval(`
    var _sugerenciasMiembroTimer = null, _sugerenciasMiembroSeq = 0;
    var _sugerenciasMiembroCache = window.__cache;
    function normalizarTag(t){ return '#' + String(t).replace('#','').toUpperCase(); }
    function esc(t){ return String(t); }
    function manejarRespuestaAuth(){ return false; }
    var pintadas = null;
    function renderSugerenciasMiembro(l){ pintadas = l; }
    function _ordenarSugerenciasMiembro(x){ return x; }
    var jugadorMostrado = null;
    var llamadas = [];
    function renderMiembro(j){ jugadorMostrado = j; document.getElementById('miembroSec').style.display = 'block'; }
    async function apiGetAuth(accion, params){
      llamadas.push({ accion, params });
      if(accion === 'webAdminBuscarMiembroSugerencias'){
        if(window.__falloSugerencias) throw new Error('sin red');
        return { ok: true, resultados: window.__sugerencias };
      }
      return { ok: true, jugador: { tag: params.tag, nombre: 'Encontrado' } };
    }
    ${CODIGO}
    window.buscarMiembro = buscarMiembro;
  `);
  return window;
}
const ev = (w, cod) => w.eval(cod);

test('_pareceTag: solo los caracteres de los Tags de Clash Royale (0289PYLQGRJCUV) cuentan como Tag; un nombre no', () => {
  const w = montar({ valor: 'x', sugerencias: [] });
  assert.equal(ev(w, "_pareceTag('#2GG8PJ8GC')"), true);
  assert.equal(ev(w, "_pareceTag('2gg8pj8gc')"), true, 'sin # y en minúsculas también');
  assert.equal(ev(w, "_pareceTag('#2GG8 PJ8GC')"), true, 'con espacios en medio');
  assert.equal(ev(w, "_pareceTag('chistris')"), false, 'el nombre del reporte ya no se toma por Tag');
  assert.equal(ev(w, "_pareceTag('Ana')"), false);
  assert.equal(ev(w, "_pareceTag('#ABC123')"), false, 'A, B y 1 no existen en los Tags');
});

test('un nombre de una sola palabra («chistris») se busca por nombre y, con una sola coincidencia, abre a ese miembro', async () => {
  const w = montar({ valor: 'chistris', sugerencias: [{ tag: '#2GG8PJ8GC', nombre: 'chistris', nomMulti: '', clan: 'Terna', estado: 'Activo' }] });
  await w.buscarMiembro();
  const llamadas = ev(w, 'llamadas');
  assert.equal(llamadas[0].accion, 'webAdminBuscarMiembroSugerencias');
  assert.equal(llamadas[0].params.q, 'chistris');
  assert.equal(llamadas[1].accion, 'webAdminBuscarMiembro');
  assert.equal(llamadas[1].params.tag, '#2GG8PJ8GC', 'se consulta con el Tag de la coincidencia, no con el nombre');
  assert.equal(w.document.getElementById('miembroSec').style.display, 'block');
});

test('un nombre con coincidencia exacta entre varias parciales se resuelve a esa; con varias sin exacta, pide elegir de la lista', async () => {
  const lista = [
    { tag: '#2GG8PJ8GC', nombre: 'chistris', nomMulti: '', clan: 'Terna', estado: 'Activo' },
    { tag: '#9PYLQGRJC', nombre: 'chistris jr', nomMulti: '', clan: 'Mini Terna', estado: 'Activo' }
  ];
  const w = montar({ valor: 'chistris', sugerencias: lista });
  await w.buscarMiembro();
  assert.equal(ev(w, 'llamadas')[1].params.tag, '#2GG8PJ8GC', 'la exacta gana a la parcial');

  const w2 = montar({ valor: 'chis', sugerencias: lista });
  await w2.buscarMiembro();
  assert.equal(ev(w2, 'llamadas').length, 1, 'no se consulta ningún perfil');
  assert.match(w2.document.getElementById('buscarMsg').textContent, /varias coincidencias/);
  assert.equal(ev(w2, 'pintadas').length, 2, 'se muestran las sugerencias para elegir');
});

test('un nombre sin coincidencias avisa que no hay miembro con ese nombre y no lo consulta como Tag', async () => {
  const w = montar({ valor: 'nadiexyz', sugerencias: [] });
  await w.buscarMiembro();
  assert.equal(ev(w, 'llamadas').length, 1);
  assert.match(w.document.getElementById('buscarMsg').textContent, /No se encontró ningún miembro con ese nombre/);
});

test('si falla la red al pedir las sugerencias, se usa la lista que ya había en la caja', async () => {
  const w = montar({ valor: 'chistris', sugerencias: [], falloSugerencias: true, cache: [{ tag: '#2GG8PJ8GC', nombre: 'chistris', nomMulti: '', clan: 'Terna', estado: 'Activo' }] });
  await w.buscarMiembro();
  assert.equal(ev(w, 'llamadas')[1].params.tag, '#2GG8PJ8GC');
});

test('un Tag escrito sigue yendo directo al perfil, sin pedir sugerencias', async () => {
  const w = montar({ valor: '#2gg8pj8gc', sugerencias: [] });
  await w.buscarMiembro();
  const llamadas = ev(w, 'llamadas');
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].accion, 'webAdminBuscarMiembro');
  assert.equal(llamadas[0].params.tag, '#2GG8PJ8GC');
});

test('con nombres adornados («ᴳ⅄ᵀ ⚜ Chistris») y parecidos que no lo contienen, resuelve a la única coincidencia que contiene lo escrito (sin importar tildes ni mayúsculas)', async () => {
  const lista = [
    { tag: '#2GG8PJ8GC', nombre: 'ᴳ⅄ᵀ ⚜ Chistris', nomMulti: 'Diana', clan: 'Terna', estado: 'Activo' },
    { tag: '#20YVVYCU2', nombre: 'ᴳ⅄ᵀ ♣ Richard', nomMulti: '', clan: 'Terna', estado: 'Activo' },
    { tag: '#QCGGPYCYJ', nombre: 'matichu', nomMulti: '', clan: 'Terna', estado: 'Activo' }
  ];
  const w = montar({ valor: 'chistris', sugerencias: lista });
  await w.buscarMiembro();
  assert.equal(ev(w, 'llamadas')[1].params.tag, '#2GG8PJ8GC');
  const w2 = montar({ valor: 'DIANÁ', sugerencias: lista });
  await w2.buscarMiembro();
  assert.equal(ev(w2, 'llamadas')[1].params.tag, '#2GG8PJ8GC', 'también por Nom_Multi, sin tildes ni mayúsculas');
});

test('el «Buscar miembro» invalida las sugerencias de la caja pendientes: una respuesta tardía no reabre la lista', async () => {
  const w = montar({ valor: 'chistris', sugerencias: [] });
  const antes = ev(w, '_sugerenciasMiembroSeq');
  await w.buscarMiembro();
  assert.equal(ev(w, '_sugerenciasMiembroSeq'), antes + 1);
});

test('el desplegable de sugerencias tiene fondo opaco (con --surface, al 75 %, se transparentaba lo de debajo)', () => {
  const css = HTML.slice(HTML.indexOf('.sugerencias-dropdown{'), HTML.indexOf('.miembro-row{'));
  assert.match(css, /background:var\(--bg-2\)/);
  assert.doesNotMatch(css, /background:var\(--surface\)/);
});
