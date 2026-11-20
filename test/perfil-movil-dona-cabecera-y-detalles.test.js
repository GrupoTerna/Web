'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (19-nov-2026, capturas del celular de la usuaria, §PF529): (1) el gráfico «Cartas por nivel» quedaba unos 50 px a la izquierda del centro;
// (2) la cabecera fija dejaba ver el texto que pasa por detrás (fondo a 0.78); (3) «Carta favorita» quedaba pegada a su título y
// «Costo de elixir promedio» iba a la izquierda mientras las cajas van centradas.
// LÍMITE: solo lee el código como texto; no mide el aspecto en un navegador real.
const perfil = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const estilos = fs.readFileSync(path.join(__dirname, '..', 'assets', 'styles.css'), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function cuerpoDe(css, selector) {
  const i = css.indexOf(selector + '{');
  assert.ok(i >= 0, 'no se encontró la regla ' + selector);
  return { i, cuerpo: css.slice(i + selector.length + 1, css.indexOf('}', i)) };
}

test('en celular la dona de «Cartas por nivel» ocupa toda la fila y su tarjeta se centra', () => {
  const css = sinComentarios(perfil);
  const a = cuerpoDe(css, '#mColeccionNivelPie.coleccion-nivel-pie-wrap');
  assert.match(a.cuerpo, /width:\s*100%/);
  assert.match(a.cuerpo, /align-items:\s*flex-start/);
  const b = cuerpoDe(css, '#mColeccionNivelPie .mini-pie');
  assert.match(b.cuerpo, /align-self:\s*center/);
  const media = css.lastIndexOf('@media (max-width:640px){', a.i);
  assert.ok(media >= 0, 'la regla no está dentro de un @media (max-width:640px)');
  assert.equal(css.slice(media, a.i).split('}\n  }').length, 1, 'el @media se cerró antes de la regla');
});

test('en celular «Carta favorita» deja aire bajo su título y el costo de elixir va centrado', () => {
  const css = sinComentarios(perfil);
  assert.match(cuerpoDe(css, '#mFavoritaContenido > .col-card').cuerpo, /margin-top:\s*14px/);
  assert.match(cuerpoDe(css, '.mazo-elixir-prom').cuerpo, /text-align:\s*center/);
  assert.ok(perfil.includes('class="text-dim mazo-elixir-prom"'));
});

test('la cabecera fija (.nav) es opaca del todo y no lleva backdrop-filter', () => {
  const css = sinComentarios(estilos);
  const { cuerpo } = cuerpoDe(css, '.nav');
  assert.match(cuerpo, /background:\s*rgb\(4,\s*5,\s*8\)\s*;/);
  assert.doesNotMatch(cuerpo, /backdrop-filter/);
});
