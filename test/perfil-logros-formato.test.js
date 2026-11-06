'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF388): en «Logros» el rótulo es más ancho (para que «Recompensas del torneo» quepa en una línea) y la descripción gris lleva sangría.
// Se ejecuta el renderLogros() REAL de perfil.html con jsdom. LÍMITE: no mide anchos en un navegador; el ancho se comprueba como regla CSS.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

test('renderLogros() marca la descripción con .logro-info y no cambia el resto', () => {
  const m = html.match(/function renderLogros\(j\)\{[\s\S]*?\n\}\n/);
  assert.ok(m);
  const dom = new JSDOM('<!doctype html><body><div id="mLogrosCard"></div><div id="mLogrosContenido"></div></body>', { runScripts: 'outside-only' });
  dom.window.eval(`
    function rawClash(j){ return j; }
    function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
    function fmtNum(n){ return String(n); }
    function barraRequisito(l, a, r){ return '<div class="req-row"><div class="lbl">' + esc(l) + '</div></div>'; }
    ${m[0]}
    renderLogros({ achievements: [
      { nombreEs: 'Recompensas del torneo', value: 0, target: 1000, infoEs: 'Gana 1000 cartas en torneos' },
      { nombreEs: 'Sin descripción', value: 1, target: 1 } ] });`);
  const d = dom.window.document;
  assert.equal(d.querySelectorAll('.logro-info').length, 1, 'solo la que tiene descripción');
  assert.equal(d.querySelector('.logro-info').textContent, 'Gana 1000 cartas en torneos');
  assert.equal(d.querySelectorAll('.req-row').length, 2);
});

test('CSS: rótulo de 172 px y sangría solo dentro de #mLogrosContenido; la base compartida sigue en 140 px', () => {
  assert.match(html, /#mLogrosContenido \.req-row \.lbl\{width:172px;\}/);
  assert.match(html, /#mLogrosContenido \.logro-info\{padding-left:14px;\}/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets/styles.css'), 'utf8');
  assert.match(css, /\.req-row \.lbl\{width:140px;/);
});
