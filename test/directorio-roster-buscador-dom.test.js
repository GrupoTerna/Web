'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (5-nov-2026, §PF384, pedido de la usuaria): la tabla del roster de directorio.html tiene el buscador «Buscar jugador o Tag…»
// (el mismo de guerra.html). Se extrae aplicarFiltrosRoster() del <script> inline REAL y se ejecuta con jsdom junto con filters.js.
// LÍMITE: DOM simulado, no prueba el CSS ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function aplicarFiltrosRoster'));
assert.ok(grande, 'no se encontró aplicarFiltrosRoster en directorio.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}

const CUERPO = `<div id="rosterBuscador"></div><div id="rosterWrap"><table><tbody>
  <tr class="js-miembro" data-letra="J" data-buscar="Juan Pérez #2GG8PJ8GC"></tr>
  <tr class="js-miembro" data-letra="A" data-buscar="Ángel Ñoño #9ABC"></tr>
  <tr class="js-miembro" data-letra="J" data-buscar="Julia #QWER"></tr>
</tbody></table></div>`;

function cargar(){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/ui/filters.js'], CUERPO);
  w.eval(`var rosterFiltrosSeleccion = {}, rosterLetraSeleccionada = null, rosterBusqueda = '', ROSTER_COLUMNAS = [];\n${extraerFuncion(grande, 'aplicarFiltrosRoster')}
    window.__buscar = function(v){ rosterBusqueda = v; aplicarFiltrosRoster(document.getElementById('rosterWrap')); };
    window.__letra = function(v){ rosterLetraSeleccionada = v; aplicarFiltrosRoster(document.getElementById('rosterWrap')); };`);
  w.pintarBuscadorTabla('rosterBuscador', { placeholder: 'Buscar jugador o Tag…', ariaLabel: 'Buscar jugador en el roster', fijar: v => w.__buscar(v), onCambio: () => {} });
  return w;
}
const visibles = w => [...w.document.querySelectorAll('#rosterWrap tbody tr')].filter(f => f.style.display !== 'none').map(f => f.dataset.buscar.split(' ')[0]);
const cuenta = w => w.document.querySelector('#rosterBuscador .buscador-cuenta').textContent;

test('sin texto se ven todas las filas y no hay contador', () => {
  const w = cargar();
  w.__buscar('');
  assert.deepEqual(visibles(w), ['Juan', 'Ángel', 'Julia']);
  assert.equal(cuenta(w), '');
});

test('busca por nombre parcial, sin tildes ni mayúsculas, y por Tag con o sin #', () => {
  const w = cargar();
  w.__buscar('ju'); assert.deepEqual(visibles(w), ['Juan', 'Julia']); assert.equal(cuenta(w), '2 de 3');
  w.__buscar('PEREZ juan'); assert.deepEqual(visibles(w), ['Juan']);
  w.__buscar('angel nono'); assert.deepEqual(visibles(w), ['Ángel']);
  w.__buscar('9abc'); assert.deepEqual(visibles(w), ['Ángel']);
  w.__buscar('#qwer'); assert.deepEqual(visibles(w), ['Julia']);
});

test('sin coincidencias avisa; al borrar vuelve todo', () => {
  const w = cargar();
  w.__buscar('zzz'); assert.deepEqual(visibles(w), []); assert.equal(cuenta(w), 'Sin coincidencias');
  w.__buscar(''); assert.equal(visibles(w).length, 3); assert.equal(cuenta(w), '');
});

test('se combina con el filtro por letra sin pisarse', () => {
  const w = cargar();
  w.__letra('J'); w.__buscar('ju');
  assert.deepEqual(visibles(w), ['Juan', 'Julia']);
  w.__buscar('julia'); assert.deepEqual(visibles(w), ['Julia']);
  w.__letra('A'); assert.deepEqual(visibles(w), [], 'la letra A no tiene a Julia');
});

test('la caja del componente real lleva el texto de ayuda «Buscar jugador o Tag…» y el botón ✕', () => {
  const w = cargar();
  const input = w.document.querySelector('#rosterBuscador .buscador-input');
  assert.equal(input.getAttribute('placeholder'), 'Buscar jugador o Tag…');
  assert.ok(w.document.querySelector('#rosterBuscador .buscador-limpiar'));
});

test('estructura de directorio.html: contenedor entre la fila A-Z y la tabla, data-buscar en cada fila y se pinta al armar el roster', () => {
  assert.match(html, /id="rosterLetraFilter"[^>]*><\/div>\s*(?:<!--[\s\S]*?-->\s*)?<div class="buscador-tabla" id="rosterBuscador"><\/div>\s*<div id="rosterWrap">/);
  assert.match(html, /data-buscar="\$\{esc\(\(m\.nombre \|\| ''\) \+ ' ' \+ \(m\.tag \|\| ''\)\)\}"/);
  assert.match(html, /pintarBuscadorTabla\('rosterBuscador'/);
});
