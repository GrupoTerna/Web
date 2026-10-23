'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (22-oct-2026, pedido de la usuaria; §PF172): en toda tabla con el 📈 del mini historial, a su izquierda va el ícono de WhatsApp
// (solo admins, solo si tenemos el celular de la cuenta) y el conjunto va pegado a la derecha de la celda del nombre.
// Se carga el mini-historial.js REAL con jsdom; apiGetAuth() y esAdminLogueado() se simulan. LÍMITE: no prueba el CSS ni el aspecto real.

function cargar({ admin = true, tags = [], ok = true } = {}){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/mini-historial.js'], '<table><tbody><tr><td id="celda"></td></tr></tbody></table>');
  w.eval(`window._pedidos = []; window.ICONO_WSP_SOLO = '<svg-wsp></svg-wsp>';
    window.esAdminLogueado = function(){ return ${admin}; };
    window.apiGetAuth = function(accion){ window._pedidos.push(accion); return Promise.resolve(${ok} ? { ok: true, tags: ${JSON.stringify(tags)} } : { ok: false }); };`);
  return w;
}
const esperar = () => new Promise(r => setTimeout(r, 20));

test('con sesión de admin y el Tag en la lista: el ícono de WhatsApp va a la izquierda del 📈', async () => {
  const w = cargar({ tags: ['ABC'] });
  await w.wspCargarTags();
  const h = w.botonHistJugador({ tag: '#abc', nombre: 'Ana' });
  assert.match(h, /class="hist-wsp"/);
  assert.match(h, /<svg-wsp>/);
  assert.ok(h.indexOf('hist-wsp') < h.indexOf('btn-hist-jugador'), 'el WhatsApp va antes (a la izquierda) del 📈');
  assert.doesNotMatch(h, /<a[ >]/, 'sin enlace');
  assert.ok(w._pedidos.length >= 1 && [...w._pedidos].every(x => x === 'webAdminTagsConWsp'), 'solo pide webAdminTagsConWsp (el autoarranque de jsdom puede sumar una segunda llamada)');
});

test('un Tag que no está en la lista, o sin sesión de admin, lleva solo el 📈 y no se pide nada al backend', async () => {
  const a = cargar({ tags: ['ABC'] });
  await a.wspCargarTags();
  assert.doesNotMatch(a.botonHistJugador({ tag: '#ZZZ', nombre: 'Otro' }), /hist-wsp/);
  const b = cargar({ admin: false, tags: ['ABC'] });
  await b.wspCargarTags();
  await esperar();
  assert.equal(b._pedidos.length, 0);
  assert.doesNotMatch(b.botonHistJugador({ tag: '#ABC', nombre: 'Ana', tieneWsp: true }), /hist-wsp/);
});

test('f.tieneWsp:true (Participación de Hoy) también lo muestra, solo con sesión de admin', () => {
  const w = cargar();
  assert.match(w.botonHistJugador({ tag: '#ABC', nombre: 'Ana', tieneWsp: true }), /hist-wsp/);
  assert.doesNotMatch(w.botonHistJugador({ tag: '#ABC', nombre: 'Ana', tieneWsp: false }), /hist-wsp/);
});

test('si la lista llega después de pintar la tabla, el ícono se inserta a la izquierda de cada 📈 y no se duplica', async () => {
  const w = cargar({ tags: ['ABC'] });
  const celda = w.document.getElementById('celda');
  celda.innerHTML = '<span class="col-jugador-extras">' + w.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }) + '</span><span class="col-jugador-extras">' + w.botonHistJugador({ tag: '#ZZZ', nombre: 'Otro' }) + '</span>';
  assert.equal(celda.querySelectorAll('.hist-wsp').length, 0);
  await w.wspCargarTags();
  await esperar();
  assert.equal(celda.querySelectorAll('.hist-wsp').length, 1);
  const btn = celda.querySelector('.btn-hist-jugador[data-tag="#ABC"]');
  assert.ok(btn.previousElementSibling.classList.contains('hist-wsp'));
  w.wspRepintar();
  assert.equal(celda.querySelectorAll('.hist-wsp').length, 1, 'una segunda pasada no duplica');
});

test('si el backend falla o no manda la lista, no se rompe y no se pinta nada', async () => {
  const w = cargar({ ok: false });
  await w.wspCargarTags();
  assert.doesNotMatch(w.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }), /hist-wsp/);
});

test('las celdas de Nombre llevan el nombre a la izquierda y las acciones a la derecha en Pendientes y en el Directorio', () => {
  const raiz = path.join(__dirname, '..');
  const g = fs.readFileSync(path.join(raiz, 'guerra.html'), 'utf8');
  const d = fs.readFileSync(path.join(raiz, 'directorio.html'), 'utf8');
  const css = fs.readFileSync(path.join(raiz, 'assets/styles.css'), 'utf8');
  assert.match(g, /col-nombre'\)\}<div class="col-jugador-inner">/);
  assert.match(d, /<div class="col-jugador-inner"><span class="col-jugador-nombre">\$\{contenido\}<\/span><span class="col-jugador-extras">\$\{col\.extra\(m, i\)\}<\/span><\/div>/);
  assert.match(css, /\.col-jugador-extras\{margin-left:auto;/);
  assert.match(css, /\.hist-wsp\{/);
  assert.ok(!/\.col-jugador-inner\{/.test(g), 'el CSS compartido vive solo en styles.css');
});

// NUEVO (23-oct-2026, §PF181): perfil.html lleva data-sin-wsp-tags en <body> y entonces mini-historial.js no pide webAdminTagsConWsp (el perfil solo usa la tabla del historial).
test('con data-sin-wsp-tags en <body> no se pide la lista de WhatsApp, aunque sea admin; sin el atributo sí', async () => {
  const w = cargar({ tags: ['ABC'] });
  w.document.body.setAttribute('data-sin-wsp-tags', '');
  await w.wspCargarTags();
  await esperar(); // deja correr también la carga automática de DOMContentLoaded
  assert.equal(w.eval('JSON.stringify(_pedidos)'), '[]', 'no pidió nada');
  const v = cargar({ tags: ['ABC'] });
  await v.wspCargarTags();
  assert.ok(v.eval('_pedidos.length') >= 1 && v.eval('_pedidos.every(a => a === "webAdminTagsConWsp")'), 'sin el atributo sí pide la lista (jsdom puede disparar además la carga automática de DOMContentLoaded)');
});
test('perfil.html marca su <body> con data-sin-wsp-tags', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8'), /<body data-page="perfil" data-sin-wsp-tags>/);
});
