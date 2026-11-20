'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (19-nov-2026, revisión de móvil): cuatro filas que se salían del ancho de la pantalla (320 a 390 px) y quedaban recortadas porque body lleva overflow-x:hidden.
// Medido con Chromium real y datos simulados (scripts/medicion-accesibilidad/lib.js): antes guerra 222 px de más, torneos hasta 377 px, mensajes hasta 364 px y el modal de costo 351 px dentro de un panel de 278 px.
// LÍMITE: solo lee el CSS como texto; no mide el aspecto en un navegador real.
const leer = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// Devuelve el cuerpo de la regla `selector{...}` (primera aparición), sin comentarios.
function regla(css, selector) {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = sinComentarios.indexOf(selector + '{');
  assert.ok(i >= 0, `no se encontró la regla ${selector}`);
  return sinComentarios.slice(i + selector.length + 1, sinComentarios.indexOf('}', i));
}

// Devuelve el contenido del primer @media (max-width:<px>px){...} que aparece después de `desde`.
function media(css, px, desde) {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const ini = sinComentarios.indexOf(desde);
  assert.ok(ini >= 0, `no se encontró ${desde}`);
  const m = sinComentarios.indexOf(`@media (max-width:${px}px){`, ini);
  assert.ok(m >= 0, `no hay @media (max-width:${px}px) después de ${desde}`);
  let nivel = 0;
  for (let k = sinComentarios.indexOf('{', m); k < sinComentarios.length; k++) {
    if (sinComentarios[k] === '{') nivel++;
    if (sinComentarios[k] === '}' && --nivel === 0) return sinComentarios.slice(sinComentarios.indexOf('{', m) + 1, k);
  }
  assert.fail('@media sin cerrar');
}

test('guerra.html: la cinta «Monitoreo en Vivo» y «Actualizar» pasan a varias líneas en móvil', () => {
  const css = media(leer('guerra.html'), 640, '.refresh-row{');
  assert.match(css, /\.pf-cinta > \.eyebrow\{[^}]*flex-wrap:wrap/);
  assert.match(css, /\.refresh-row\{[^}]*flex-wrap:wrap/);
});

test('torneos.html: la fila de «Ver todos los resultados» baja de línea en móvil en vez de salirse', () => {
  const css = media(leer('torneos.html'), 560, '.todos-resultados-fila .tr-victorias{');
  assert.match(css, /\.todos-resultados-fila\{[^}]*flex-wrap:wrap/);
  assert.match(css, /\.tr-nombre\{[^}]*flex:1 1 130px/);
});

test('mensajes.html: los botones de acción de cada contenido pueden bajar de línea', () => {
  const cuerpo = regla(leer('mensajes.html'), '.contenido-acciones');
  assert.match(cuerpo, /flex-wrap:wrap/);
  assert.match(cuerpo, /max-width:100%/);
});

test('perfil.html: la tabla del modal de costo no ensancha el panel en móvil', () => {
  const html = leer('perfil.html');
  assert.match(regla(html, '#costoModalTablaWrap'), /overflow-x:auto/);
  const css = media(html, 560, '#costoModalTablaWrap{');
  assert.match(css, /#costoModalTablaWrap \.costo-tabla td\{[^}]*padding-left:4px/);
  assert.match(css, /tfoot td:first-child\{[^}]*white-space:normal/);
});
