'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, pedido de la usuaria): directorio.html?clan=<nombre>&tag=<Tag>#roster también filtra «Ingresos recientes» para ese clan.
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

const seleccionIngresosDeClan = new Function('claveIngreso', `${extraerFuncion(grande, 'tagClanNormalizado')}; ${extraerFuncion(grande, 'seleccionIngresosDeClan')}; return seleccionIngresosDeClan;`)(n => (n && n.tag) || '');

// Dos clanes con el mismo nombre y distinto Tag (los dos «Argentina» de §PF400) y un grupo anterior a §PF405, sin Tag.
const GRUPOS = [
  { clan: 'Grupo乂Terna™', miembros: [{ tag: '#A1', clanTag: '#GCRG8L00' }, { tag: '#A2', clanTag: '#GCRG8L00' }] },
  { clan: 'GrupoXTerna™2', miembros: [{ tag: '#B1', clanTag: '#B2B2B2' }] },
  { clan: 'Argentina', miembros: [{ tag: '#C1', clanTag: '#ARG111' }] },
  { clan: 'Argentina', miembros: [{ tag: '#C2', clanTag: '#ARG222' }] },
  { clan: 'Mini乂Ternas™', miembros: [{ tag: '#D1' }] },
];

test('sin clan ni Tag en la dirección no se filtra nada (null = se ven todos)', () => {
  assert.equal(seleccionIngresosDeClan(GRUPOS, '', ''), null);
  assert.equal(seleccionIngresosDeClan(GRUPOS, null, undefined), null);
});

test('con Tag quedan marcados solo los jugadores de ese clan, con o sin #, en minúsculas y aunque el nombre no coincida', () => {
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, 'nombre viejo', ' gcrg8l00 ')].sort(), ['#A1', '#A2']);
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, '', '#B2B2B2')], ['#B1']);
});

test('el Tag manda sobre el nombre: dos clanes con el mismo nombre no se confunden', () => {
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, 'Argentina', '#ARG222')], ['#C2']);
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, 'Argentina', '#ARG111')], ['#C1']);
});

test('un Tag que no está NO cae al nombre cuando ese nombre tiene grupos con Tag: no se adivina', () => {
  assert.equal(seleccionIngresosDeClan(GRUPOS, 'Argentina', '#OTRO99'), null);
});

test('respaldo por nombre (sin confirmar por Tag) solo con grupos que no traen Tag', () => {
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, '  mini乂ternas™ ', '')], ['#D1']);
  assert.equal(seleccionIngresosDeClan(GRUPOS, 'Argentina', ''), null, 'Argentina tiene Tag en sus dos grupos: por nombre no se acepta');
  assert.deepEqual([...seleccionIngresosDeClan(GRUPOS, 'Mini乂Ternas™', '#SINGRUPO')], ['#D1']);
});

test('un clan sin ingresos o que no existe no deja la sección vacía: null (se ve todo)', () => {
  assert.equal(seleccionIngresosDeClan(GRUPOS, 'Otro clan', ''), null);
  assert.equal(seleccionIngresosDeClan([{ clan: 'Vacío', miembros: [] }], 'vacío', ''), null);
  assert.equal(seleccionIngresosDeClan(null, 'x', '#X'), null);
});

test('la carga de la página aplica la selección solo cuando no es una recarga «fresca» tras Actualizar', () => {
  assert.match(grande, /if \(!fresco\)\{\s*const selClan = seleccionIngresosDeClan\(ingresosGrupos, new URLSearchParams\(location\.search\)\.get\('clan'\), new URLSearchParams\(location\.search\)\.get\('tag'\)\);\s*if \(selClan\) ingresosSeleccionados = selClan;/);
});
