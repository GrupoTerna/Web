'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF377): Torneos, Sorteos y Cambio de rango son tres tarjetas propias de admin.html, sin selector de pastillas.
// Parte 2: pastillas de acción (select y «Continuar» ocultos) y una sola línea dorada abierta por tarjeta.
// LÍMITE: lee admin.html como texto y ejecuta en jsdom solo el tramo de las pastillas y el acordeón; no mide el aspecto ni el flujo completo en un navegador real.
const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function tarjeta(titulo){
  const m = HTML.match(new RegExp('<div class="card admin-grupo pf-cinta" data-acordeon style="--cinta:url\\(([^)]+)\\)[^"]*">\\s*<div class="eyebrow">' + titulo + '</div>'));
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

function tramoScript(){
  const i = HTML.indexOf("[['torneoAccion','btnTorneoPaso1','torneoAccionPastillas']");
  const f = HTML.indexOf('/** Wizard de Sorteos, por tramos', i);
  assert.ok(i > 0 && f > i, 'no se encontró el tramo de pastillas y acordeón');
  return HTML.slice(i, f);
}

test('cada wizard trae sus pastillas y conserva el select y «Continuar» ocultos', () => {
  const esperadas = { torneo: ['planificar', 'registrar', 'modificar'], sorteo: ['planificar', 'registrar', 'modificar'], cr: ['registrar', 'modificar', 'ver', 'verificar'] };
  for (const [pref, acciones] of Object.entries(esperadas)) {
    const g = HTML.match(new RegExp('id="' + pref + 'AccionPastillas"[\\s\\S]*?</div>'));
    assert.ok(g, 'grupo de pastillas de ' + pref);
    assert.deepEqual([...g[0].matchAll(/data-accion="([^"]+)"/g)].map(m => m[1]), acciones);
  }
  for (const id of ['torneoAccion', 'sorteoAccion', 'crAccion']) assert.ok(HTML.includes('<select id="' + id + '">'), id + ' sigue en el HTML');
  for (const id of ['btnTorneoPaso1', 'btnSorteoPaso1', 'btnCrPaso1']) assert.match(HTML, new RegExp('id="' + id + '" style="display:none;"'));
});

test('una pastilla pone el valor del select y pulsa «Continuar»; solo una queda activa', () => {
  const dom = new JSDOM(`<body>
    <select id="torneoAccion"><option value=""></option><option value="registrar">r</option><option value="modificar">m</option></select>
    <button id="btnTorneoPaso1"></button>
    <div id="torneoAccionPastillas"><button data-accion="registrar">R</button><button data-accion="modificar">M</button></div>
    <select id="sorteoAccion"></select><button id="btnSorteoPaso1"></button><div id="sorteoAccionPastillas"></div>
    <select id="crAccion"></select><button id="btnCrPaso1"></button><div id="crAccionPastillas"></div>
  </body>`, { runScripts: 'outside-only' });
  const w = dom.window;
  let pulsaciones = 0;
  w.document.getElementById('btnTorneoPaso1').addEventListener('click', () => { pulsaciones++; });
  w.eval(tramoScript());
  const [r, m] = w.document.querySelectorAll('#torneoAccionPastillas [data-accion]');
  m.click();
  assert.equal(w.document.getElementById('torneoAccion').value, 'modificar');
  assert.equal(pulsaciones, 1);
  assert.ok(m.classList.contains('activo') && m.getAttribute('aria-pressed') === 'true');
  r.click();
  assert.equal(w.document.getElementById('torneoAccion').value, 'registrar');
  assert.ok(r.classList.contains('activo') && !m.classList.contains('activo') && m.getAttribute('aria-pressed') === 'false');
  assert.equal(pulsaciones, 2);
});

test('acordeón: abrir una línea dorada cierra la otra de la misma tarjeta, pero no las de otra tarjeta', async () => {
  const dom = new JSDOM(`<body>
    <div data-acordeon><details class="admin-subseccion" id="a1"></details><details class="admin-subseccion" id="a2"></details></div>
    <div data-acordeon><details class="admin-subseccion" id="b1" open></details></div>
  </body>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(tramoScript());
  const $ = id => w.document.getElementById(id);
  $('a1').open = true; await new Promise(r => setTimeout(r, 20));
  $('a2').open = true; await new Promise(r => setTimeout(r, 20));
  assert.equal($('a1').open, false, 'a1 se cerró al abrir a2');
  assert.equal($('a2').open, true);
  assert.equal($('b1').open, true, 'la otra tarjeta no se toca');
});
