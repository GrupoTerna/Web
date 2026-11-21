'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (21-nov-2026, PF286 punto 17 (a)): botón 📜 de la tabla de propuestas de Cambio de rango en admin.html y su ventana con los cambios de rango
// anteriores de la cuenta (webCRHistorialJugador). [→ Contexto_Base_Web.md §PF286]
//
// NO se carga admin.html entero: se extrae del <script> inline REAL el tramo entre marcadores. LÍMITE: DOM y funciones auxiliares simuladas; la respuesta
// del backend es un dato de prueba, así que no prueba Apps Script ni el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = tramo('function _celdaUmbralCR(prom, umbral, cumple){', '// La tabla de propuestas de Cambio de Rango se reordena en el frontend', 'la fila de propuestas y el modal de historial');

function montar(respuestas){
  const dom = new JSDOM('<!doctype html><html><body><table><tbody id="cuerpo"></tbody></table></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__pedidos = [];
  window.__respuestas = respuestas;
  window.eval(`
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function enlaceJugador(n, t){ return '<a href="#">' + esc(n) + '</a>'; }
    function enlaceClan(n){ return '<a href="#">' + esc(n) + '</a>'; }
    async function apiGetAuth(accion, params){
      window.__pedidos.push({ accion: accion, tag: params && params.tag });
      const r = window.__respuestas.shift();
      if(r instanceof Promise) return r;
      if(r && r.__lanzar) throw new Error('red');
      return r;
    }
    ${CODIGO}
  `);
  return window;
}

const $ = (w, id) => w.document.getElementById(id);
const esperar = () => new Promise(r => setTimeout(r, 0));
const PROP = { nombre: 'Ana', tag: '#ABC', clan: 'Terna', clanTag: '#T1', rangoActual: 'Miembro', tipoPropuesta: 'Ascenso', detalle: 'ok' };

function pintarFila(w, p){
  $(w, 'cuerpo').innerHTML = w.eval('_filaPropuestaCR(' + JSON.stringify(p) + ', 0)');
}

test('PF286 17 (a): cada fila de propuestas trae un 📜 con el Tag y el nombre, sin la clase del historial de guerra', () => {
  const w = montar([]);
  pintarFila(w, PROP);
  const b = w.document.querySelector('.btn-hist-rango');
  assert.ok(b, 'falta el botón 📜');
  assert.equal(b.dataset.tag, '#ABC');
  assert.equal(b.dataset.nombre, 'Ana');
  assert.equal(b.textContent, '📜');
  assert.equal(w.document.querySelector('.btn-hist-jugador'), null, 'no debe reutilizar la clase del 📈 de guerra');
});

test('PF286 17 (a): una propuesta sin Tag no pinta el botón', () => {
  const w = montar([]);
  pintarFila(w, Object.assign({}, PROP, { tag: '' }));
  assert.equal(w.document.querySelector('.btn-hist-rango'), null);
});

test('PF286 17 (a): al pulsar 📜 se pide webCRHistorialJugador con el Tag y se pinta la tabla en el orden recibido', async () => {
  const w = montar([{ ok: true, tag: 'ABC', cambios: [
    { tipo: 'Degradación', rango: 'Veterano', rango2: 'Miembro', clan: 'Terna', fechaTxt: '01/11/2026', temporada: 27, semana: 1, dia: 2 },
    { tipo: 'Expulsión', rango: 'Miembro', rango2: '', clan: '', fechaTxt: '', temporada: 26, semana: 3, dia: 1 }
  ] }]);
  pintarFila(w, PROP);
  w.document.querySelector('.btn-hist-rango').click();
  assert.equal($(w, 'crHistRangoFondo').classList.contains('abierto'), true, 'la ventana se abre enseguida');
  assert.match($(w, 'crHistRangoCuerpo').textContent, /Cargando/);
  await esperar();
  assert.equal(JSON.stringify(w.__pedidos), JSON.stringify([{ accion: 'webCRHistorialJugador', tag: '#ABC' }]));
  assert.match($(w, 'crHistRangoSub').textContent, /Ana · #ABC/);
  const filas = [...w.document.querySelectorAll('#crHistRangoCuerpo tbody tr')].map(tr => [...tr.children].map(td => td.textContent));
  assert.equal(JSON.stringify(filas), JSON.stringify([
    ['01/11/2026', '27', '1', '2', 'Degradación', 'Veterano → Miembro', 'Terna'],
    ['—', '26', '3', '1', 'Expulsión', 'Miembro', '—']
  ]));
});

test('PF286 17 (a): sin cambios registrados dice que no hay', async () => {
  const w = montar([{ ok: true, tag: 'ABC', cambios: [] }]);
  pintarFila(w, PROP);
  w.document.querySelector('.btn-hist-rango').click();
  await esperar();
  assert.match($(w, 'crHistRangoCuerpo').textContent, /no tiene cambios de rango registrados/);
  assert.equal(w.document.querySelector('#crHistRangoCuerpo table'), null);
});

test('PF286 17 (a): si el backend responde con error o la red falla, lo dice y no deja la ventana en «Cargando»', async () => {
  const w = montar([{ ok: false, error: 'Sesión inválida o vencida. Vuelve a iniciar sesión.' }, { __lanzar: true }]);
  pintarFila(w, PROP);
  const b = w.document.querySelector('.btn-hist-rango');
  b.click(); await esperar();
  assert.match($(w, 'crHistRangoCuerpo').textContent, /Sesión inválida/);
  b.click(); await esperar();
  assert.match($(w, 'crHistRangoCuerpo').textContent, /No se pudo leer el historial/);
});

test('PF286 17 (a): si se pide otra cuenta antes de que llegue la primera, solo se pinta la última', async () => {
  let soltar;
  const lenta = new Promise(r => { soltar = r; });
  const w = montar([lenta, { ok: true, tag: 'XYZ', cambios: [{ tipo: 'Ascenso', rango: 'Miembro', rango2: 'Veterano', clan: 'Terna', fechaTxt: '02/11/2026', temporada: 27, semana: 1, dia: 3 }] }]);
  pintarFila(w, PROP);
  const b = w.document.querySelector('.btn-hist-rango');
  b.click();
  b.dataset.tag = '#XYZ'; b.dataset.nombre = 'Beto';
  b.click();
  await esperar();
  soltar({ ok: true, tag: 'ABC', cambios: [{ tipo: 'Expulsión', rango: 'Miembro', rango2: '', clan: '', fechaTxt: '01/01/2026', temporada: 1, semana: 1, dia: 1 }] });
  await esperar();
  assert.match($(w, 'crHistRangoCuerpo').textContent, /02\/11\/2026/);
  assert.doesNotMatch($(w, 'crHistRangoCuerpo').textContent, /Expulsión/);
});

test('PF286 17 (a): la × y la tecla Esc cierran la ventana', async () => {
  const w = montar([{ ok: true, tag: 'ABC', cambios: [] }, { ok: true, tag: 'ABC', cambios: [] }]);
  pintarFila(w, PROP);
  const b = w.document.querySelector('.btn-hist-rango');
  b.click(); await esperar();
  $(w, 'crHistRangoCerrar').click();
  assert.equal($(w, 'crHistRangoFondo').classList.contains('abierto'), false);
  b.click(); await esperar();
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal($(w, 'crHistRangoFondo').classList.contains('abierto'), false);
});
