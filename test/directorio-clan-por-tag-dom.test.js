'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, tanda 6b de Clanes por Tag, §PF413): directorio.html decide el clan por Tag y deja el nombre solo de respaldo.
// Cubre: clanIdxDesdeQuery() (pestaña del «Directorio por clan» que arranca elegida), claveClanMiembro() y agruparPorClanEnOrden()
// (grupos y pastillas de «Ingresos recientes»), lineChartLegendHtml() (cabecera de clan en las gráficas) y que un ?tag= acompañado de
// ?clan= (el enlace «Ver en el Directorio» de clan.html) ya no redirige a perfil.html.
// Se extraen las funciones del <script> inline REAL de directorio.html (si se renombran, la prueba falla a propósito).
// LÍMITE: no prueba el pintado completo de pastillas ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function clanIdxDesdeQuery'));
assert.ok(grande, 'no se encontró clanIdxDesdeQuery en directorio.html');

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

// Dos clanes con el mismo nombre y distinto Tag (los dos «Argentina» de §PF400) y un clan anterior a §PF405, sin Tag.
const ROSTER = [
  { nombre: 'Grupo乂Terna™', clanTag: '#GCRG8L00' },
  { nombre: 'GrupoXTerna™2', clanTag: '#GYCU9YRG' },
  { nombre: 'Argentina', clanTag: '#ARG111' },
  { nombre: 'Argentina', clanTag: '#ARG222' },
  { nombre: 'Mini乂Ternas™' }, // roster.json de un backend anterior: sin Tag
];

function idx(search, roster){
  const f = new Function('location', 'rosterData', `${extraerFuncion(grande, 'tagClanNormalizado')}\n${extraerFuncion(grande, 'clanIdxDesdeQuery')}\nreturn clanIdxDesdeQuery();`);
  return f({ search }, roster || ROSTER);
}

test('§PF413: sin ?clan= ni ?tag= no se elige nada (-1)', () => {
  assert.equal(idx(''), -1);
  assert.equal(idx('?otra=1'), -1);
});

test('§PF413: ?tag= elige el clan por Tag, con o sin #, en minúsculas y aunque el nombre del enlace sea otro', () => {
  assert.equal(idx('?clan=nombre%20viejo&tag=%23GYCU9YRG'), 1);
  assert.equal(idx('?tag=gcrg8l00'), 0);
});

test('§PF413: dos clanes con el mismo nombre y distinto Tag no se confunden', () => {
  assert.equal(idx('?clan=Argentina&tag=ARG222'), 3);
  assert.equal(idx('?clan=Argentina&tag=ARG111'), 2);
});

test('§PF413: un Tag que no está NO cae al nombre cuando ese clan tiene Tag: no se adivina', () => {
  assert.equal(idx('?clan=Argentina&tag=ZZZ999'), -1);
  assert.equal(idx('?clan=GrupoXTerna%E2%84%A22&tag=ZZZ999'), -1);
});

test('§PF413: respaldo por nombre solo para clanes sin Tag (roster de un backend anterior)', () => {
  assert.equal(idx('?clan=mini%E4%B9%82ternas%E2%84%A2&tag=ZZZ999'), 4);
  assert.equal(idx('?clan=Mini%E4%B9%82Ternas%E2%84%A2'), 4);
});

test('§PF413: enlace antiguo sin ?tag= (como el «Ver clan» de Inicio): se busca por nombre', () => {
  assert.equal(idx('?clan=GrupoXTerna%E2%84%A22'), 1);
  assert.equal(idx('?clan=%20grupox%20'), -1);
});

test('§PF413: un clan que no está en el roster da -1 y no lanza', () => {
  assert.equal(idx('?clan=Otro&tag=OTRO11'), -1);
  assert.equal(idx('?clan=Otro', []), -1);
});

// ---- agrupación de «Ingresos recientes» y leyenda de las gráficas ----
const agrupar = new Function(`${extraerFuncion(grande, 'tagClanNormalizado')}\n${extraerFuncion(grande, 'claveClanMiembro')}\n${extraerFuncion(grande, 'agruparPorClanEnOrden')}\nreturn agruparPorClanEnOrden;`)();

const INGRESOS = [
  { tag: '#C1', clan: 'Argentina', clanTag: '#ARG111' },
  { tag: '#C2', clan: 'Argentina', clanTag: '#ARG222' },
  { tag: '#C3', clan: 'Argentina', clanTag: 'arg111' }, // mismo clan que #C1, Tag sin # y en minúsculas
  { tag: '#D1', clan: 'Mini乂Ternas™' },
  { tag: '#D2', clan: 'Mini乂Ternas™', clanTag: '' },
  { tag: '#E1' }, // sin clan
];

test('§PF413: agruparPorClanEnOrden separa dos clanes del mismo nombre por Tag y junta los del mismo Tag', () => {
  const g = agrupar(INGRESOS);
  assert.equal(g.length, 4);
  assert.deepEqual(g.map(x => x.clan), ['Argentina', 'Argentina', 'Mini乂Ternas™', '—']);
  assert.deepEqual(g.map(x => x.clave), ['tag:ARG111', 'tag:ARG222', 'nombre:Mini乂Ternas™', 'nombre:—']);
  assert.deepEqual(g[0].miembros.map(m => m.tag), ['#C1', '#C3']);
  assert.deepEqual(g[1].miembros.map(m => m.tag), ['#C2']);
});

test('§PF413: sin Tag (backend anterior) agrupa por nombre como antes y no lanza con entradas vacías', () => {
  const g = agrupar([{ tag: '#1', clan: 'A' }, { tag: '#2', clan: 'A' }, { tag: '#3', clan: 'B' }]);
  assert.deepEqual(g.map(x => [x.clan, x.miembros.length]), [['A', 2], ['B', 1]]);
  assert.deepEqual(agrupar([]), []);
});

function leyenda(miembros){
  const f = new Function('PALETA_SERIES', 'CLAN_LABELS_CORTOS', 'ordenClanIndex', 'enlaceClan', 'enlaceJugador',
    `${extraerFuncion(grande, 'tagClanNormalizado')}\n${extraerFuncion(grande, 'claveClanMiembro')}\n${extraerFuncion(grande, 'lineChartLegendHtml')}\nreturn lineChartLegendHtml;`);
  return f(['#111'], [], () => 0, n => `[CLAN ${n}]`, n => `[J ${n}]`)(miembros);
}

test('§PF413: la leyenda de las gráficas abre una cabecera por clan: dos clanes del mismo nombre y distinto Tag no se funden', () => {
  const h = leyenda([
    { nombre: 'Ana', tag: '#A', clan: 'Argentina', clanTag: '#ARG111' },
    { nombre: 'Beto', tag: '#B', clan: 'Argentina', clanTag: '#ARG111' },
    { nombre: 'Caro', tag: '#C', clan: 'Argentina', clanTag: '#ARG222' },
  ]);
  assert.equal((h.match(/ing-linechart-legend-clan/g) || []).length, 2, 'una cabecera por Tag');
  assert.equal((h.match(/\[CLAN Argentina\]/g) || []).length, 2);
});

test('§PF413: la leyenda sin Tag sigue agrupando por nombre', () => {
  const h = leyenda([{ nombre: 'Ana', tag: '#A', clan: 'X' }, { nombre: 'Beto', tag: '#B', clan: 'X' }, { nombre: 'Caro', tag: '#C', clan: 'Y' }]);
  assert.equal((h.match(/ing-linechart-legend-clan/g) || []).length, 2);
});

// ---- cableado en la página (la lógica de pastillas y la redirección no se pueden ejecutar sin la página entera) ----
test('§PF413: las pastillas de clan llevan data-clave y se buscan por clave, nunca por nombre', () => {
  assert.match(grande, /class="ing-pill active" data-clan="\$\{esc\(g\.clan\)\}" data-clave="\$\{esc\(g\.clave\)\}"/);
  assert.equal((grande.match(/ingresosGrupos\.find\(g => g\.clave === btn\.dataset\.clave\)/g) || []).length, 2, 'actualizarPillsIngresos() y el clic');
  assert.equal(/ingresosGrupos\.find\(g => g\.clan === /.test(grande), false, 'no debe quedar ninguna búsqueda del grupo por nombre');
});

test('§PF413: un ?tag= junto a ?clan= es el del clan y no redirige a perfil.html; solo ?tag= (jugador) sí', () => {
  assert.match(grande, /const hayClanParam = !!String\(new URLSearchParams\(location\.search\)\.get\('clan'\) \|\| ''\)\.trim\(\);/);
  assert.match(grande, /if \(tagParam && !hayClanParam\)\{ location\.replace\('perfil\.html\?tag=' \+ encodeURIComponent\(tagParam\)\); return; \}/);
  assert.equal(/if \(tagParam\)\{ location\.replace/.test(grande), false, 'la redirección sin guarda ya no debe existir');
});
