'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF377): Torneos, Sorteos y Cambio de rango son tres tarjetas propias de admin.html, sin selector de pastillas.
// LÍMITE: solo lee admin.html como texto; no mide el aspecto ni el comportamiento en un navegador real.
const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tarjeta(titulo){
  const m = HTML.match(new RegExp('<div class="card admin-grupo pf-cinta" style="--cinta:url\\(([^)]+)\\)[^"]*">\\s*<div class="eyebrow">' + titulo + '</div>'));
  assert.ok(m, 'existe la tarjeta «' + titulo + '»');
  const ini = m.index;
  const sig = HTML.indexOf('<div class="card', ini + 10);
  const fin = sig < 0 ? HTML.length : sig;
  return { cinta: m[1], html: HTML.slice(ini, fin) };
}

test('hay tres tarjetas, cada una con su cinta distinta y existente', () => {
  const t = [tarjeta('Torneos'), tarjeta('Sorteos'), tarjeta('Cambio de rango')];
  assert.equal(new Set(t.map(x => x.cinta)).size, 3, 'tres cintas distintas');
  for (const x of t) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', decodeURIComponent(x.cinta))), 'existe ' + x.cinta);
});

test('cada tema trae su panel y sus dependencias dentro de su tarjeta', () => {
  const t = tarjeta('Torneos'), s = tarjeta('Sorteos'), c = tarjeta('Cambio de rango');
  assert.ok(t.html.includes('id="panelTorneosAccion"') && t.html.includes('Ganadores del torneo más reciente'));
  assert.ok(s.html.includes('id="panelSorteosAccion"') && s.html.includes('Ruleta de sorteos'));
  assert.ok(c.html.includes('id="panelCambioRangoAccion"') && c.html.includes('Editar autor de ascenso'));
  assert.ok(!t.html.includes('Ruleta de sorteos') && !t.html.includes('Editar autor de ascenso'));
  assert.ok(!s.html.includes('Ganadores del torneo más reciente') && !s.html.includes('Editar autor de ascenso'));
});

test('ya no existen el encabezado engañoso, las pastillas del selector ni los paneles ocultos', () => {
  assert.ok(!HTML.includes('Planificar, registrar o modificar torneos o sorteos</span>'));
  assert.ok(!/class="[^"]*btn-toggle-torsor/.test(HTML));
  assert.ok(!/id="panel(Sorteos|CambioRango)Accion" style="display:none/.test(HTML));
});
