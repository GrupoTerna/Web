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

function armarApi({ sessionTokenAdmin }){
  const almacen = (inicial) => {
    const datos = { ...(inicial || {}) };
    return {
      datos,
      getItem: (k) => (k in datos ? datos[k] : null),
      setItem: (k, v) => { datos[k] = String(v); },
      removeItem: (k) => { delete datos[k]; }
    };
  };
  const local = almacen(sessionTokenAdmin ? { terna_admin_token: sessionTokenAdmin } : {});
  const sesion = almacen();
  const urls = [];
  const sandbox = {
    localStorage: local, sessionStorage: sesion, URLSearchParams, setTimeout, console,
    fetch: async (url) => { urls.push(url); return { json: async () => ({ ok: true, n: urls.length }) }; }
  };
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
