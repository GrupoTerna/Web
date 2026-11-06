'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, pedido de la usuaria): directorio.html?clan=<nombre>#roster también filtra «Ingresos recientes» para ese clan.
// Se extrae seleccionIngresosDeClan() del <script> inline REAL de directorio.html y se ejecuta sin cargar la página entera.
// LÍMITE: prueba la decisión de qué tags quedan marcados; no prueba el pintado de pastillas ni de gráficas.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function seleccionIngresosDeClan'));
assert.ok(grande, 'no se encontró seleccionIngresosDeClan en directorio.html');

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

const seleccionIngresosDeClan = new Function('claveIngreso', `${extraerFuncion(grande, 'seleccionIngresosDeClan')}; return seleccionIngresosDeClan;`)(n => (n && n.tag) || '');

const GRUPOS = [
  { clan: 'Grupo乂Terna™', miembros: [{ tag: '#A1' }, { tag: '#A2' }] },
  { clan: 'GrupoXTerna™2', miembros: [{ tag: '#B1' }] },
];

test('sin ?clan= no se filtra nada (null = se ven todos)', () => {
  assert.equal(seleccionIngresosDeClan(GRUPOS, ''), null);
  assert.equal(seleccionIngresosDeClan(GRUPOS, null), null);
});

test('con ?clan= quedan marcados solo los tags de ese clan, sin importar mayúsculas ni espacios', () => {
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, '  grupoxterna™2 ')], ['#B1']);
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, 'Grupo乂Terna™')].sort(), ['#A1', '#A2']);
});

test('un clan sin ingresos o que no existe no deja la sección vacía: null (se ve todo)', () => {
  assert.equal(seleccionIngresosDeClan(GRUPOS, 'Mini乂Ternas™'), null);
  assert.equal(seleccionIngresosDeClan([{ clan: 'Vacío', miembros: [] }], 'vacío'), null);
  assert.equal(seleccionIngresosDeClan(null, 'x'), null);
});

test('la carga de la página aplica la selección solo cuando no es una recarga «fresca» tras Actualizar', () => {
  assert.match(grande, /if \(!fresco\)\{\s*const selClan = seleccionIngresosDeClan\(ingresosGrupos, new URLSearchParams\(location\.search\)\.get\('clan'\)\);\s*if \(selClan\) ingresosSeleccionados = selClan;/);
});
