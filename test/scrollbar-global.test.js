'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Regla de la usuaria (24-oct-2026): toda barra de desplazamiento, actual o futura, usa el estilo morado de las tablas de guerra.
// Se comprueba en el CSS (jsdom no pinta barras): la regla debe valer para `*` y no solo para .scroll-morado, y ninguna página debe
// apagar las barras ni darles otro color.

const raiz = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(raiz, 'assets', 'styles.css'), 'utf8');

test('styles.css pinta de morado las barras de TODOS los elementos, no solo de .scroll-morado', () => {
  assert.match(css, /\*, \.scroll-morado\s*\{\s*scrollbar-width:thin; scrollbar-color:var\(--purple-light\)/);
  for (const parte of ['', '-track', '-thumb', '-thumb:hover']) {
    assert.ok(css.includes('*::-webkit-scrollbar' + parte + ', .scroll-morado::-webkit-scrollbar' + parte + '{'), 'falta la regla global ::-webkit-scrollbar' + parte);
  }
});

test('ninguna página ni script apaga las barras ni les da otro color', () => {
  const archivos = fs.readdirSync(raiz).filter((f) => f.endsWith('.html')).map((f) => path.join(raiz, f));
  (function agregar(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) agregar(p); else if (e.name.endsWith('.js')) archivos.push(p);
    }
  })(path.join(raiz, 'assets', 'js'));
  for (const f of archivos) {
    const t = fs.readFileSync(f, 'utf8');
    for (const c of t.match(/scrollbar-color\s*:\s*[^;}]+/g) || []) {
      assert.ok(/var\(--purple-light\)\s+rgba\(255,255,255,\.06\)/.test(c), path.basename(f) + ' define otra barra: ' + c);
    }
    assert.ok(!/::-webkit-scrollbar[^{]*\{[^}]*display\s*:\s*none/.test(t), path.basename(f) + ' oculta una barra');
    assert.ok(!/scrollbar-width\s*:\s*none/.test(t), path.basename(f) + ' oculta una barra (scrollbar-width:none)');
  }
});
