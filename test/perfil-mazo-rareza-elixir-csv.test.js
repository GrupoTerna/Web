'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria): «Mazo actual» de perfil.html sacaba la rareza y el elixir solo del diccionario local
// DATOS_CARTAS_MAZO (por nombre), así que una carta que el diccionario no tiene (Ronin, Montapuercos) salía sin chip de rareza ni elixir
// aunque Backup_Cards.csv sí los trae y el backend ya los manda en mazoActual.cartas[] (rarity, elixirCost).
// Ahora manda el dato del backend y el diccionario queda de respaldo. Se extraen las líneas REALES de perfil.html y se ejecutan con jsdom.
// LÍMITE: no mide el aspecto en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

function cargar(){
  const tomar = re => { const m = html.match(re); assert.ok(m, 'no se encontró ' + re); return m[0]; };
  const lineas = [
    tomar(/const rarezaClave = [^\n]*;\n/),
    tomar(/const elixirCoste = [^\n]*;\n/),
  ].join('');
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  dom.window.eval(`
    const RAREZA_RAW_A_KEY = { common:'comun', rare:'especial', epic:'epica', legendary:'legendaria', champion:'campeon' };
    function rarezaKey(r){ return RAREZA_RAW_A_KEY[String(r || '').toLowerCase()] || ''; }
    window.resolver = function(c, d){
      ${lineas}
      return { rarezaClave, elixirCoste };
    };`);
  return dom.window;
}

test('carta que el diccionario no tiene (Ronin): rareza y elixir salen del dato del backend', () => {
  const w = cargar();
  const r = w.resolver({ name: 'Ronin', rarity: 'legendary', elixirCost: 5 }, null);
  assert.equal(r.rarezaClave, 'legendaria');
  assert.equal(r.elixirCoste, 5);
});

test('el dato del backend gana sobre el diccionario local', () => {
  const w = cargar();
  const r = w.resolver({ rarity: 'rare', elixirCost: 4 }, { rareza: 'comun', elixir: 9 });
  assert.equal(r.rarezaClave, 'especial');
  assert.equal(r.elixirCoste, 4);
});

test('sin dato del backend se usa el diccionario como respaldo', () => {
  const w = cargar();
  const r = w.resolver({ rarity: '', elixirCost: null }, { rareza: 'epica', elixir: 3 });
  assert.equal(r.rarezaClave, 'epica');
  assert.equal(r.elixirCoste, 3);
});

test('sin ninguna fuente no hay rareza ni elixir (y un elixir 0 sí cuenta)', () => {
  const w = cargar();
  const vacio = w.resolver({ rarity: '', elixirCost: null }, null);
  assert.equal(vacio.rarezaClave, '');
  assert.equal(vacio.elixirCoste, null);
  assert.equal(w.resolver({ elixirCost: 0 }, null).elixirCoste, 0);
});

test('renderMazoActual ya no pinta rareza ni elixir desde el diccionario', () => {
  const m = html.match(/function renderMazoActual\([\s\S]*?\n\}\n/);
  assert.ok(m, 'renderMazoActual');
  assert.doesNotMatch(m[0], /d\.rareza\}/, 'el chip de rareza no debe salir de d.rareza');
  assert.doesNotMatch(m[0], /String\(d\.elixir\)/, 'el elixir no debe salir de d.elixir');
  assert.match(m[0], /RAREZA_CARTA_TXT\[rarezaClave\]/);
  assert.match(m[0], /String\(elixirCoste\)/);
});
