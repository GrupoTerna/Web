'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (6-nov-2026, pedido de la usuaria): clan.html enlaza a guerra.html?clan=<nombre> y ese clan arranca elegido en las pestañas de clan
// de las tablas de guerra. Se extrae gestionarTabsClan() del <script> inline REAL de guerra.html y se ejecuta con jsdom.
// LÍMITE: DOM simulado; no prueba el CSS ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function gestionarTabsClan'));
assert.ok(grande, 'no se encontró gestionarTabsClan en guerra.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}

const CUERPO = `<div id="tabs"></div><div id="wrap">
  <div class="ai-clan-card" data-clan="Grupo乂Terna™"></div>
  <div class="ai-clan-card" data-clan="GrupoXTerna™2"></div>
  <div class="ai-clan-card" data-clan="Mini乂Ternas™"></div></div>`;

function montar(preseleccionado){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], CUERPO);
  w.eval(`const TAB_TODOS = '__todos__'; const BUSCADOR_DE_SECCION = {}; function actualizarCuentaBuscador(){}
    const CLAN_PRESELECCIONADO = ${JSON.stringify(preseleccionado)};
    let sel = null;
    ${extraerFuncion(grande, 'gestionarTabsClan')}
    window.__pintar = () => gestionarTabsClan('tabs', 'wrap', () => sel, v => sel = v);
    window.__sel = () => sel;`);
  w.__pintar();
  return w;
}
const visibles = w => [...w.document.querySelectorAll('#wrap .ai-clan-card')].filter(c => c.style.display !== 'none').map(c => c.dataset.clan);
const activa = w => w.document.querySelector('#tabs .tab-btn.active').textContent;

test('sin ?clan= arranca el clan Principal (el primero), como siempre', () => {
  const w = montar('');
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
  assert.equal(activa(w), 'Grupo乂Terna™');
});

test('con ?clan= arranca ese clan, sin importar mayúsculas ni espacios', () => {
  const w = montar('grupoxterna™2');
  assert.deepEqual(visibles(w), ['GrupoXTerna™2']);
  assert.equal(activa(w), 'GrupoXTerna™2');
  assert.equal(w.__sel(), 'GrupoXTerna™2');
});

test('un clan que no está en la tabla no rompe nada: arranca el Principal', () => {
  const w = montar('otro clan');
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
});

test('lo que la usuaria elige después manda: un repintado no vuelve a pisar la selección', () => {
  const w = montar('mini乂ternas™');
  assert.deepEqual(visibles(w), ['Mini乂Ternas™']);
  w.document.querySelectorAll('#tabs .tab-btn')[0].click();
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
  w.__pintar();
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
});
