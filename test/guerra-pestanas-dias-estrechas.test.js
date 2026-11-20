'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (19-nov-2026, revisión de móvil con navegador emulado, §PF531): a 320 px las cuatro pestañas Jue–Dom de guerra.html
// terminaban en 332 px (la última, «DOM 22-nov.», se salía 12 px de la pantalla) porque .tl-day no podía encogerse por la fecha en nowrap.
// Medido en Chromium emulado con las fuentes reales: con min-width:0 y la regla de ≤340 px, la última pestaña termina dentro del contenedor
// de 280 a 412 px y el texto de cada pestaña queda dentro de su caja de 320 px en adelante.
// LÍMITE: este archivo solo lee el código como texto; la medida en navegador no se repite en el CI.
const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = sinComentarios(html);

test('.tl-day puede encogerse (min-width:0) para que las cuatro pestañas quepan', () => {
  const m = css.match(/\.tl-day\{([^}]*)\}/);
  assert.ok(m, 'no se encontró la regla .tl-day');
  assert.match(m[1], /flex:\s*1/);
  assert.match(m[1], /min-width:\s*0/);
});

test('debajo de 340 px se reducen hueco, relleno y letra de las pestañas', () => {
  const m = css.match(/@media \(max-width:340px\)\{([^@]*?)\}\s*\n/);
  assert.ok(m, 'no se encontró la regla de ≤340 px');
  assert.match(m[1], /\.timeline\{gap:4px;?\}/);
  assert.match(m[1], /\.tl-day\{padding:12px 2px;?\}/);
  assert.match(m[1], /\.tl-day \.mark\{font-size:12\.5px;?\}/);
});

test('la fecha de la pestaña sigue en una sola línea (white-space:nowrap)', () => {
  assert.match(css, /\.tl-day \.mark\{[^}]*white-space:\s*nowrap/);
});
