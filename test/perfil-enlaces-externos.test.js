'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (24-oct-2026, tanda 12 de Consolidado_Mini_Historial_y_Perfil.md, §PF200): botones RoyaleAPI y CWStats del perfil.
// Fallo: un jugador inactivo no traía ext.royaleApi/ext.cwStats (las celdas de Inactivos están casi todas vacías) y el admin no veía los botones.
// enlacesPerfilExterno() se extrae de perfil.html y se ejecuta con jsdom. LÍMITE: no prueba el backend ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

function cargar(){
  const m = html.match(/function enlacesPerfilExterno\(ext, tag, esAdmin\)\{[\s\S]*?\n\}\n/);
  assert.ok(m, 'no se encontró enlacesPerfilExterno() en perfil.html');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  const util = fs.readFileSync(path.join(__dirname, '..', 'assets/js/util.js'), 'utf8');
  dom.window.eval(util + '\n;\n' + m[0] + '\nwindow.enlacesPerfilExterno = enlacesPerfilExterno;');
  return dom.window.enlacesPerfilExterno;
}

test('admin + inactivo sin enlaces en el backend: se arman desde el Tag', () => {
  const f = cargar();
  assert.deepEqual({ ...f({}, '#2GG8PJ8GC', true) }, { royaleApi: 'https://royaleapi.com/player/2GG8PJ8GC', cwStats: 'https://cwstats.com/player/2GG8PJ8GC' });
  assert.equal(f(undefined, '2gg8pj8gc', true).royaleApi, 'https://royaleapi.com/player/2GG8PJ8GC');
});

test('si el backend ya mandó el enlace, manda el del backend (aunque sea admin)', () => {
  const f = cargar();
  const r = f({ royaleApi: 'https://royaleapi.com/player/ABC', cwStats: '' }, '#2GG8PJ8GC', true);
  assert.equal(r.royaleApi, 'https://royaleapi.com/player/ABC');
  assert.equal(r.cwStats, 'https://cwstats.com/player/2GG8PJ8GC');
});

test('un visitante no recibe enlaces inventados: solo los que manda el backend', () => {
  const f = cargar();
  assert.deepEqual({ ...f({}, '#2GG8PJ8GC', false) }, { royaleApi: '', cwStats: '' });
  assert.equal(f({ royaleApi: 'https://royaleapi.com/player/ABC' }, '#2GG8PJ8GC', false).royaleApi, 'https://royaleapi.com/player/ABC');
});

test('un Tag inválido o vacío no genera enlaces ni siquiera para admin', () => {
  const f = cargar();
  for (const t of ['', '#', '#AB<script>', '#ZZZZ', null, undefined]) assert.deepEqual({ ...f({}, t, true) }, { royaleApi: '', cwStats: '' }, String(t));
});

test('renderMiembro() usa enlacesPerfilExterno() con la sesión de admin', () => {
  assert.match(html, /enlacesPerfilExterno\(ext, j\.tag, esAdminLogueado\(\)\)/);
});
