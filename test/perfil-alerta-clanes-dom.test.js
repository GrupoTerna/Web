'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF385): en el perfil, el ⚠️ de «estuvo en un clan vetado o rival» va a la IZQUIERDA del botón de RoyaleAPI y, al hacer clic, abre el modal.
// Se carga el mini-historial.js REAL y perfilAlertaPintar() se extrae de perfil.html; apiGetAuth() y esAdminLogueado() se simulan (no hay backend).
// LÍMITE: no prueba el aspecto real ni el backend; los tamaños de letra y el centrado se comprueban como reglas CSS del archivo, no medidos en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const RESUMEN = { ok: true, actualizado: '05/11/2026 18:00', jugadores: { ABC: { n: 2, tipos: ['rival', 'vetado'] } } };
const DETALLE = { ok: true, historialDisponible: true, clanes: [{ tag: '#CLAN1', nombre: 'Clan Rival', tipos: ['rival'], semanas: 1, filas: [] }] };
const esperar = () => new Promise(r => setTimeout(r, 20));

function cargar({ admin = true } = {}){
  const m = html.match(/function perfilAlertaPintar\(\)\{[\s\S]*?\n\}\ndocument\.addEventListener\('alerta-tags-listas', perfilAlertaPintar\);\n/);
  assert.ok(m, 'no se encontró perfilAlertaPintar() en perfil.html');
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/mini-historial.js'],
    '<div class="ext-links"><div id="mRoyaleCwstatsBtns" style="display:contents;"><a href="https://royaleapi.com/player/ABC">RoyaleAPI</a><a href="https://cwstats.com/player/ABC">CWStats</a></div></div>');
  w.document.body.setAttribute('data-sin-wsp-tags', '');
  w.eval(`window._pedidos = [];
    window.esAdminLogueado = function(){ return ${admin}; };
    window.apiGetAuth = function(accion, params){ window._pedidos.push([accion, params]);
      if (accion === 'webAdminTagsClanesSospechosos') return Promise.resolve(${JSON.stringify(RESUMEN)});
      if (accion === 'webAdminClanesSospechososJugador') return Promise.resolve(${JSON.stringify(DETALLE)});
      return Promise.resolve({ ok: false }); };
    let perfilAlertaJugador = { tag: '', nombre: '' };
    ${m[0]}
    window.perfilAlertaPintar = perfilAlertaPintar;
    window.perfilAlertaFijar = function(t, n){ perfilAlertaJugador = { tag: t, nombre: n }; };`);
  return w;
}
const hijos = w => Array.from(w.document.getElementById('mRoyaleCwstatsBtns').children);

test('admin con el Tag en el resumen: el ⚠️ queda como PRIMER elemento, a la izquierda de RoyaleAPI', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  w.perfilAlertaFijar('#abc', 'Ana');
  w.perfilAlertaPintar();
  const h = hijos(w);
  assert.equal(h.length, 3);
  assert.ok(h[0].classList.contains('btn-alerta-clanes'), 'el ⚠️ va primero');
  assert.match(h[1].textContent, /RoyaleAPI/);
  assert.match(h[2].textContent, /CWStats/);
  assert.equal(h[0].dataset.tag, '#abc');
  assert.match(h[0].getAttribute('title'), /Estuvo en 2 clanes vetados o rivales/);
});

test('llamar dos veces no duplica el ⚠️', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  w.perfilAlertaFijar('#ABC', 'Ana');
  w.perfilAlertaPintar();
  w.perfilAlertaPintar();
  assert.equal(w.document.querySelectorAll('.btn-alerta-clanes').length, 1);
});

test('si el resumen llega después de pintar el perfil, el evento alerta-tags-listas inserta el ⚠️', async () => {
  const w = cargar();
  w.perfilAlertaFijar('#ABC', 'Ana');
  w.perfilAlertaPintar();
  assert.equal(w.document.querySelectorAll('.btn-alerta-clanes').length, 0, 'sin resumen todavía no hay ⚠️');
  await w.alertaCargarTags();
  const h = hijos(w);
  assert.ok(h[0].classList.contains('btn-alerta-clanes'));
  assert.equal(w.document.querySelectorAll('.btn-alerta-clanes').length, 1);
});

test('un jugador que no figura en el resumen, o un visitante sin sesión de admin, no ve el ⚠️', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  w.perfilAlertaFijar('#ZZZ', 'Otro');
  w.perfilAlertaPintar();
  assert.equal(w.document.querySelectorAll('.btn-alerta-clanes').length, 0);
  const v = cargar({ admin: false });
  await v.alertaCargarTags();
  await esperar();
  assert.equal(JSON.parse(v.eval('JSON.stringify(_pedidos)')).length, 0, 'sin sesión de admin no se pide nada');
  v.perfilAlertaFijar('#ABC', 'Ana');
  v.perfilAlertaPintar();
  assert.equal(v.document.querySelectorAll('.btn-alerta-clanes').length, 0);
});

test('el clic en el ⚠️ del perfil abre el modal y pide el detalle de ese jugador', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  w.perfilAlertaFijar('#ABC', 'Ana');
  w.perfilAlertaPintar();
  w.document.querySelector('.btn-alerta-clanes').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await esperar();
  assert.ok(w.document.getElementById('alertaFondo').classList.contains('abierto'), 'el modal se abre');
  const pedidos = JSON.parse(w.eval('JSON.stringify(_pedidos)')).filter(p => p[0] === 'webAdminClanesSospechososJugador');
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0][1].tag, '#ABC');
  assert.match(w.document.getElementById('alertaCuerpo').textContent, /Clan Rival/);
});

test('renderMiembro() fija el jugador y pinta el ⚠️ justo después de armar RoyaleAPI/CWStats', () => {
  const i = html.indexOf("document.getElementById('mRoyaleCwstatsBtns').innerHTML = `");
  assert.ok(i > 0);
  const resto = html.slice(i, i + 900);
  assert.match(resto, /perfilAlertaJugador = \{ tag: j\.tag \|\| '', nombre: j\.nombre \|\| '' \};/);
  assert.match(resto, /perfilAlertaPintar\(\);/);
});

test('cuadritos: letras más chicas que las de la base compartida (19/13 px) y títulos de minigráficas centrados aunque se partan', () => {
  assert.match(html, /#mCuadritosWrap \.ext-item \.v\{font-size:16px;\}/);
  assert.match(html, /#mCuadritosWrap \.ext-item \.k\{font-size:11px;/);
  assert.match(html, /\.mini-pie-titulo\{display:flex; flex-wrap:wrap; text-align:center; align-items:center; justify-content:center;/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets/styles.css'), 'utf8');
  assert.match(css, /\.ext-item \.v\{[^}]*font-size:19px/, 'la base compartida con directorio.html no se toca');
});
