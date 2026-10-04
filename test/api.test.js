'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./load-browser-script');

const { _esErrorDeRed, _mensajeErrorRed } = loadBrowserScript('assets/js/core/api.js');

test('_esErrorDeRed() reconoce los 3 mensajes de "sin conexión" (Chrome/Edge, Firefox, Safari)', () => {
  assert.equal(_esErrorDeRed(new TypeError('Failed to fetch')), true);
  assert.equal(_esErrorDeRed(new TypeError('NetworkError when attempting to fetch resource.')), true);
  assert.equal(_esErrorDeRed(new TypeError('Load failed')), true);
});

test('_esErrorDeRed() no confunde un error de la app (ej. sesión vencida) con uno de red', () => {
  assert.equal(_esErrorDeRed(new Error('Sesión vencida')), false);
  assert.equal(_esErrorDeRed(new TypeError('otro TypeError sin relación')), false);
});

test('_esErrorDeRed() no revienta si le pasan null/undefined', () => {
  assert.equal(_esErrorDeRed(null), false);
  assert.equal(_esErrorDeRed(undefined), false);
});

test('_mensajeErrorRed() devuelve un texto fijo y amigable para el visitante', () => {
  assert.equal(_mensajeErrorRed(), 'No pudimos conectar con el servidor. Intenta de nuevo en un momento.');
});


/*
 * apiGet({ conSesion }) — Fase 5b tanda A (28-sep-2026).
 * api.js usa `fetch`, `localStorage`, `sessionStorage`, `URLSearchParams` y
 * `setTimeout`, y las constantes WEBAPP_URL/WEB_MEMBER_TOKEN de config.js: se arma
 * un sandbox propio con esos globales simulados (loadBrowserScript() no los trae).
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function armarApi({ sessionTokenAdmin, respuesta, documento, actualizarNavCta, infoAdmin } = {}){
  const almacen = (inicial) => {
    const datos = { ...(inicial || {}) };
    return {
      datos,
      getItem: (k) => (k in datos ? datos[k] : null),
      setItem: (k, v) => { datos[k] = String(v); },
      removeItem: (k) => { delete datos[k]; }
    };
  };
  const local = almacen({ ...(sessionTokenAdmin ? { terna_admin_token: sessionTokenAdmin } : {}), ...(infoAdmin ? { terna_admin_info: infoAdmin } : {}) });
  const sesion = almacen();
  const urls = [];
  const sandbox = {
    localStorage: local, sessionStorage: sesion, URLSearchParams, setTimeout, console,
    fetch: async (url) => { urls.push(url); return { json: async () => (respuesta ? respuesta(urls.length) : { ok: true, n: urls.length }) }; }
  };
  if (documento) sandbox.document = documento; // pruebas del aviso de sesión vencida
  if (actualizarNavCta) sandbox.actualizarNavCta = actualizarNavCta;
  vm.createContext(sandbox);
  vm.runInContext("const WEBAPP_URL = 'https://ejemplo.test/exec'; const WEB_MEMBER_TOKEN = 'TOKEN_PUBLICO';", sandbox);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'assets/js/core/api.js'), 'utf8');
  vm.runInContext(codigo, sandbox, { filename: 'api.js' });
  return { apiGet: sandbox.apiGet, local, sesion, urls };
}

test('apiGet({conSesion}) sin admin logueado: no agrega sessionToken y cachea como siempre', async () => {
  const { apiGet, sesion, local, urls } = armarApi({});
  await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true, staleIfError: true });
  assert.equal(urls.length, 1);
  assert.ok(!urls[0].includes('sessionToken'), 'no debe mandar sessionToken');
  assert.ok(urls[0].includes('token=TOKEN_PUBLICO'));
  assert.ok(Object.keys(sesion.datos).some(k => k.startsWith('terna_cache_')), 'sessionStorage sí guarda caché');
  assert.ok(Object.keys(local.datos).some(k => k.startsWith('terna_backup_')), 'localStorage sí guarda respaldo');
  await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true, staleIfError: true });
  assert.equal(urls.length, 1, 'la segunda llamada sale del caché');
});

test('apiGet({conSesion}) con admin logueado: manda sessionToken y NO guarda nada en el navegador', async () => {
  const { apiGet, sesion, local, urls } = armarApi({ sessionTokenAdmin: 'SESION_ADMIN' });
  await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true, staleIfError: true });
  assert.ok(urls[0].includes('sessionToken=SESION_ADMIN'));
  assert.ok(urls[0].includes('token=TOKEN_PUBLICO'), 'sigue mandando el token público');
  assert.equal(Object.keys(sesion.datos).length, 0, 'nada en sessionStorage');
  assert.deepEqual(Object.keys(local.datos), ['terna_admin_token'], 'nada nuevo en localStorage salvo la sesión');
  await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true, staleIfError: true });
  assert.equal(urls.length, 2, 'cada llamada con sesión va a la red');
});

test('apiGet sin conSesion nunca manda sessionToken, aunque haya admin logueado', async () => {
  const { apiGet, urls } = armarApi({ sessionTokenAdmin: 'SESION_ADMIN' });
  await apiGet('webRoster', null, {});
  assert.ok(!urls[0].includes('sessionToken'));
});


/*
 * Sesión de admin vencida (A4/A6) — 03-oct-2026, octava sesión, tanda 3, opción 2.
 * El backend agrega sesionVencida:true cuando llega un sessionToken que ya no es válido;
 * apiGet() borra la sesión guardada, refresca el nav y muestra un aviso.
 */
const { JSDOM } = require('jsdom');

function documentoVacio(){
  return new JSDOM('<!doctype html><body><main>contenido</main></body>').window.document;
}

test('sesionVencida:true con sesión de admin: borra el token y la info, refresca el nav y muestra el aviso', async () => {
  const doc = documentoVacio();
  let navActualizado = 0;
  const { apiGet, local } = armarApi({
    sessionTokenAdmin: 'SESION_VIEJA', infoAdmin: '{"nombre":"Ana"}', documento: doc,
    actualizarNavCta: () => { navActualizado++; },
    respuesta: () => ({ ok: true, dato: 1, sesionVencida: true })
  });
  const data = await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true, staleIfError: true });
  assert.equal(data.dato, 1, 'los datos de visitante de esa respuesta se devuelven tal cual');
  assert.equal(local.datos.terna_admin_token, undefined, 'token borrado');
  assert.equal(local.datos.terna_admin_info, undefined, 'info del admin borrada');
  assert.equal(navActualizado, 1, 'el botón del nav se refresca una vez');
  const aviso = doc.getElementById('avisoSesionVencida');
  assert.ok(aviso, 'aparece el aviso');
  assert.equal(aviso.getAttribute('role'), 'alert');
  assert.match(aviso.textContent, /sesión de administrador venció/);
  assert.equal(aviso.querySelector('a').getAttribute('href'), 'admin.html');
  const cerrar = aviso.querySelector('button');
  assert.equal(cerrar.getAttribute('aria-label'), 'Cerrar aviso');
  cerrar.click();
  assert.equal(doc.getElementById('avisoSesionVencida'), null, 'el botón cierra el aviso');
});

test('sesionVencida:true: dos respuestas seguidas (peticiones en vuelo) muestran un solo aviso', async () => {
  const doc = documentoVacio();
  let navActualizado = 0;
  const { apiGet } = armarApi({
    sessionTokenAdmin: 'SESION_VIEJA', documento: doc,
    actualizarNavCta: () => { navActualizado++; },
    respuesta: () => ({ ok: true, sesionVencida: true })
  });
  await Promise.all([
    apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true }),
    apiGet('webTorneosJugador', { tag: '#AAA' }, { conSesion: true })
  ]);
  assert.equal(doc.querySelectorAll('#avisoSesionVencida').length, 1);
  assert.equal(navActualizado, 1);
});

test('sesionVencida:true pero otra pestaña ya inició sesión de nuevo: no borra la sesión nueva ni avisa', async () => {
  const doc = documentoVacio();
  let apiGetFn, local;
  const armado = armarApi({
    sessionTokenAdmin: 'SESION_VIEJA', documento: doc,
    respuesta: () => {
      local.datos.terna_admin_token = 'SESION_NUEVA'; // login en otra pestaña mientras la petición estaba en vuelo
      return { ok: true, sesionVencida: true };
    }
  });
  apiGetFn = armado.apiGet; local = armado.local;
  await apiGetFn('webPerfil', { tag: '#AAA' }, { conSesion: true });
  assert.equal(local.datos.terna_admin_token, 'SESION_NUEVA', 'la sesión nueva se conserva');
  assert.equal(doc.getElementById('avisoSesionVencida'), null, 'sin aviso');
});

test('sesionVencida:true sin admin logueado (visitante) o sin conSesion: se ignora', async () => {
  const doc = documentoVacio();
  const visitante = armarApi({ documento: doc, respuesta: () => ({ ok: true, sesionVencida: true }) });
  await visitante.apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true });
  assert.equal(doc.getElementById('avisoSesionVencida'), null);

  const sinConSesion = armarApi({ sessionTokenAdmin: 'SESION_ADMIN', documento: doc, respuesta: () => ({ ok: true, sesionVencida: true }) });
  await sinConSesion.apiGet('webRoster', null, {});
  assert.equal(sinConSesion.local.datos.terna_admin_token, 'SESION_ADMIN', 'sin conSesion no se toca la sesión');
  assert.equal(doc.getElementById('avisoSesionVencida'), null);
});

test('sin sesionVencida (backend viejo o sesión válida): la sesión y la respuesta no cambian', async () => {
  const doc = documentoVacio();
  const { apiGet, local } = armarApi({ sessionTokenAdmin: 'SESION_ADMIN', documento: doc, respuesta: () => ({ ok: true, dato: 2 }) });
  const data = await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true });
  assert.equal(data.dato, 2);
  assert.equal(local.datos.terna_admin_token, 'SESION_ADMIN');
  assert.equal(doc.getElementById('avisoSesionVencida'), null);
});

test('sesionVencida:true sin document (Node puro): borra la sesión y no revienta', async () => {
  const { apiGet, local } = armarApi({ sessionTokenAdmin: 'SESION_VIEJA', respuesta: () => ({ ok: true, sesionVencida: true }) });
  await apiGet('webPerfil', { tag: '#AAA' }, { conSesion: true });
  assert.equal(local.datos.terna_admin_token, undefined);
});
