'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// NUEVO (22-nov-2026, pedido de la usuaria): el contador «21/20» va en dorado brillante cuando las copias alcanzan para el nivel máximo;
// pastilla «Llegan al máximo» y pastilla de tres estados (todas / solo al máximo / sin las del máximo) en «Colección completa».
// Se extraen de perfil.html las funciones puras y se corren aisladas. LÍMITE: el brillo y el diseño real se ven solo en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

function extraer(nombre){
  const ini = html.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró ${nombre}()`);
  let i = html.indexOf('{', ini), n = 0;
  for (; i < html.length; i++){
    if (html[i] === '{') n++;
    else if (html[i] === '}' && --n === 0) break;
  }
  return html.slice(ini, i + 1);
}

const ctx = vm.createContext({ fmtNum: v => String(v) });
vm.runInContext(['_numOrNull', '_tieneTablaCostos', '_cartaAlMaximo', '_cartaAlcanzaMaximo', '_cantidadCartasHtml'].map(extraer).join('\n'), ctx);
const f = ctx;

const base = { level: 13, maxLevel: 16, count: 8482, cartasSiguienteNivel: 20,
  costosNiveles: [{ desde: 13, hasta: 14, oro: 1, cartas: 1000 }, { desde: 14, hasta: 15, oro: 1, cartas: 2000 }], costoTotal: { oro: 2, cartas: 3000, niveles: 2 } };

test('alcanza el máximo cuando las copias cubren el total del tramo', () => {
  assert.equal(f._cartaAlcanzaMaximo(base), true);
  assert.equal(f._cartaAlcanzaMaximo({ ...base, count: 3000 }), true);
  assert.equal(f._cartaAlcanzaMaximo({ ...base, count: 2999 }), false);
});

test('no se afirma con la tabla incompleta, sin tabla, sin total o al máximo', () => {
  assert.equal(f._cartaAlcanzaMaximo({ ...base, costoCompleto: false }), false);
  assert.equal(f._cartaAlcanzaMaximo({ ...base, costosNiveles: [] }), false);
  assert.equal(f._cartaAlcanzaMaximo({ ...base, costoTotal: undefined }), false);
  assert.equal(f._cartaAlcanzaMaximo({ ...base, level: 16 }), false);
  assert.equal(f._cartaAlcanzaMaximo(null), false);
});

test('_cartaAlMaximo usa level >= maxLevel', () => {
  assert.equal(f._cartaAlMaximo({ level: 16, maxLevel: 16 }), true);
  assert.equal(f._cartaAlMaximo({ level: 15, maxLevel: 16 }), false);
  assert.equal(f._cartaAlMaximo({}), false);
});

test('el contador dorado solo sale con alcanzaMax; si no, queda verde o normal', () => {
  assert.match(f._cantidadCartasHtml(21, 20, true), /cc-count--maximo/);
  assert.match(f._cantidadCartasHtml(21, 20, false), /cc-count--alcanza/);
  assert.doesNotMatch(f._cantidadCartasHtml(21, 20, false), /cc-count--maximo/);
  assert.doesNotMatch(f._cantidadCartasHtml(5, 20, false), /cc-count--(alcanza|maximo)/);
});

test('el CSS del dorado brillante respeta prefers-reduced-motion', () => {
  assert.match(html, /\.cc-count\.cc-count--maximo\{[^}]*color:var\(--gold-light\)/);
  assert.match(html, /@keyframes cc-brillo-maximo/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{ \.cc-count\.cc-count--maximo\{animation:none;\}/);
});

test('los filtros nuevos entran en _colCartaPasaFiltro y en el reinicio de «Todas»', () => {
  assert.match(html, /f\.alcanzaMax && !_cartaAlcanzaMaximo\(c\)/);
  assert.match(html, /f\.estadoMax === 'solo' && !_cartaAlMaximo\(c\)/);
  assert.match(html, /f\.estadoMax === 'ocultar' && _cartaAlMaximo\(c\)/);
  assert.equal((html.match(/_colFiltrosActivos\.estadoMax = '';/g) || []).length, 2);
});
