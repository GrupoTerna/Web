'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// NUEVO (5-nov-2026, pedido de la usuaria: «un mejor aspecto, como los perfiles de jugadores»): la ficha de «Buscar clan» de admin.html toma el aspecto de la cabecera de perfil.html.
// LÍMITE: lee el HTML y el CSS reales como texto; no mide el aspecto en un navegador (eso lo ve la usuaria al abrir la página).
const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

test('la tarjeta de la ficha del clan lleva la cinta de cabecera, como el perfil de jugador', () => {
  const i = HTML.indexOf('<div id="clanSec"');
  assert.ok(i >= 0);
  const tarjeta = HTML.slice(i, i + 400);
  assert.match(tarjeta, /class="card pf-cinta pf-cinta--cabecera"/);
  assert.match(tarjeta, /--cinta:url\(Im%C3%A1genes\/Banners\/Fankit\/cinta-clan-cabecera\.webp\)/);
  assert.match(HTML, /\.pf-cinta--cabecera > \.perfil-cabecera\{position:relative; z-index:1;\}/);
});

test('el nombre del clan va en dorado brillante, igual que #mNombre de perfil.html', () => {
  const perfil = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
  const degradado = 'linear-gradient(180deg,#fff3b8 0%,#ffd84d 45%,#f3a922 100%)';
  assert.ok(perfil.includes('#mNombre{background:' + degradado));
  assert.ok(HTML.includes('#cNombre{background:' + degradado));
});

test('las estadísticas del clan van en una grilla pareja de cuadritos y ninguna letra baja de 13 px', () => {
  assert.match(HTML, /\.clan-stats\{display:grid; grid-template-columns:repeat\(auto-fill,minmax\(150px,1fr\)\);/);
  const bloque = HTML.slice(HTML.indexOf('.clan-stats{display:grid'), HTML.indexOf('#cLider:empty'));
  const tamanos = [...bloque.matchAll(/font-size:(\d+)px/g)].map(m => Number(m[1]));
  assert.ok(tamanos.length > 0 && tamanos.every(n => n >= 13), 'tamaños: ' + tamanos.join(', '));
});

test('Líder, descripción y fuente no dejan huecos cuando vienen vacíos', () => {
  assert.match(HTML, /#cLider:empty, #cDescripcion:empty, #cFuente:empty\{display:none;\}/);
});
