'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// NUEVO (6-nov-2026, tanda 6a de Clanes por Tag, §PF412): clan.html identifica el clan de la página por su Tag (?tag= o el que trae webClanInfo)
// y deja el nombre de ?clan= de respaldo. Se extraen las funciones REALES del <script> inline de clan.html y se ejecutan en un sandbox.
// LÍMITE: no abre la página; prueba solo la comparación.

const html = fs.readFileSync(path.join(__dirname, '..', 'clan.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function clanCoincide'));
assert.ok(grande, 'no se encontró clanCoincide en clan.html');

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

function montar({ clan, tag, mapa }){
  const ctx = vm.createContext({ URLSearchParams, location: { search: '' } });
  vm.runInContext(`
    const NOMBRE_CLAN_QUERY = ${JSON.stringify(clan || '')};
    ${extraerFuncion(grande, 'normTagClanPagina')}
    let tagClanPagina = normTagClanPagina(${JSON.stringify(tag || '')});
    let mapaTagPorClan = ${JSON.stringify(mapa === undefined ? null : mapa)};
    ${extraerFuncion(grande, 'tagDeNombreClanPagina')}
    ${extraerFuncion(grande, 'clanCoincide')}
    globalThis.coincide = clanCoincide;
    globalThis.fijarTag = t => { tagClanPagina = normTagClanPagina(t); };
    globalThis.fijarMapa = m => { mapaTagPorClan = m; };
  `, ctx);
  return ctx;
}
const MAPA = { 'GrupoXTerna™2': '#GYCU9YRG', 'Grupo乂Terna™': '#GCRG8L00' };

test('sin Tag en la página ni en el objeto, compara por nombre como siempre (sin importar mayúsculas ni espacios)', () => {
  const c = montar({ clan: 'GrupoXTerna™2' });
  assert.equal(c.coincide('  grupoxterna™2 '), true);
  assert.equal(c.coincide('Grupo乂Terna™'), false);
  assert.equal(c.coincide(undefined), false);
});

test('con ?tag= y objetos con clanTag: compara por Tag, aunque el nombre cambie', () => {
  const c = montar({ clan: 'Nombre viejo', tag: '#gycu9yrg' });
  assert.equal(c.coincide('Nombre nuevo', '#GYCU9YRG'), true);
  assert.equal(c.coincide('Nombre viejo', '#OTRO11'), false); // el mismo nombre con otro Tag no es este clan
});

test('con ?tag= y el mapa clanTagPorClan de guerra.json: los objetos que solo traen el nombre se unen por su Tag', () => {
  const c = montar({ clan: 'GrupoXTerna™2', tag: 'GYCU9YRG', mapa: MAPA });
  assert.equal(c.coincide('GrupoXTerna™2'), true);
  assert.equal(c.coincide('Grupo乂Terna™'), false);
});

test('enlace antiguo sin ?tag=: al hallar el clan en webClanInfo se fija su Tag y de ahí en adelante se compara por Tag', () => {
  const c = montar({ clan: 'GrupoXTerna™2', mapa: MAPA });
  assert.equal(c.coincide('GrupoXTerna™2', '#GYCU9YRG'), true); // sin Tag en la página todavía: por nombre
  c.fijarTag('#GYCU9YRG');
  assert.equal(c.coincide('Cualquier nombre', '#GYCU9YRG'), true);
  assert.equal(c.coincide('GrupoXTerna™2', '#OTRO11'), false);
});

test('si falta el Tag del objeto o el mapa (guerra.json de un backend anterior, clan externo), se cae al nombre y no lanza', () => {
  const c = montar({ clan: 'GrupoXTerna™2', tag: 'GYCU9YRG', mapa: null });
  assert.equal(c.coincide('GrupoXTerna™2'), true);
  assert.equal(c.coincide('Grupo乂Terna™'), false);
  for (const roto of ['texto', [], 7]){
    c.fijarMapa(roto);
    assert.equal(c.coincide('GrupoXTerna™2'), true);
  }
});
