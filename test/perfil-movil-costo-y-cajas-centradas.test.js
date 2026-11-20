'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (19-nov-2026, capturas del celular de la usuaria, §PF527 y §PF528): (1) «Coste de elixir promedio» estaba con léxico de España; el resto de la web dice «costo».
// (2) «Carta favorita» (max-width:260px en línea) y «Carta de torre del mazo» (max-width:280px) quedaban pegadas a la izquierda de su tarjeta en celular.
// LÍMITE: solo lee el código como texto; no mide el aspecto en un navegador real.
const perfil = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

test('el promedio de elixir dice «Costo», no «Coste»', () => {
  assert.ok(perfil.includes('Costo de elixir promedio: <b>'));
  assert.ok(!perfil.includes('Coste de elixir promedio'));
});

test('en celular las cajas de Carta favorita y Carta de torre se centran con margen automático', () => {
  const sinComentarios = perfil.replace(/\/\*[\s\S]*?\*\//g, '');
  const sel = '#mFavoritaContenido > .col-card, .mazo-layout > .mazo-layout-torre .col-card{';
  const i = sinComentarios.indexOf(sel);
  assert.ok(i >= 0, 'no se encontró la regla de centrado');
  const cuerpo = sinComentarios.slice(i + sel.length, sinComentarios.indexOf('}', i));
  assert.match(cuerpo, /margin-left:\s*auto/);
  assert.match(cuerpo, /margin-right:\s*auto/);
  // Debe estar dentro del @media de celular (≤640 px) de las fichas de carta, no en escritorio.
  const media = sinComentarios.lastIndexOf('@media (max-width:640px){', i);
  assert.ok(media >= 0, 'la regla no está dentro de un @media (max-width:640px)');
  const cierraAntes = sinComentarios.slice(media, i).split('}\n  }').length > 1;
  assert.ok(!cierraAntes, 'el @media se cerró antes de la regla');
});

test('el centrado no toca el escritorio: la regla de max-width de la torre sigue solo en el @media de 900 px', () => {
  assert.match(perfil, /\.mazo-layout > \.mazo-layout-torre \.col-card\{max-width:280px;\}/);
});
