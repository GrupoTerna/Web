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


/*
 * apiGetEstaticoConEdad() — NUEVO (09-oct-2026, Fase 1 del plan "JSON estático como último recurso").
 * Devuelve el JSON estático JUNTO con su edad (vigente o no) en vez de decidir sola si sirve.
 * LÍMITE: se prueba con un fetch simulado; no se probó contra GitHub real ni en un navegador.
 */
function armarApiEstatico(respuestaFetch){
  const sandbox = {
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    URLSearchParams, setTimeout, clearTimeout, console, AbortController,
    fetch: async (url) => respuestaFetch(url)
  };
  vm.createContext(sandbox);
  vm.runInContext("const WEBAPP_URL = 'https://ejemplo.test/exec'; const WEB_MEMBER_TOKEN = 'TOKEN_PUBLICO';", sandbox);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'assets/js/core/api.js'), 'utf8');
  vm.runInContext(codigo, sandbox, { filename: 'api.js' });
  return sandbox.apiGetEstaticoConEdad;
}
const HORA_MS = 60 * 60 * 1000;
const haceMs = (ms) => new Date(Date.now() - ms).toISOString();
const okJson = (cuerpo) => ({ ok: true, status: 200, json: async () => cuerpo });

test('apiGetEstaticoConEdad(): archivo de 1 h -> vigente:true, con el JSON y la fecha de publicación', async () => {
  const f = armarApiEstatico(() => okJson({ _publicadoEn: haceMs(1 * HORA_MS), ctx: { a: 1 } }));
  const r = await f('https://ejemplo.test/guerra.json');
  assert.equal(r.vigente, true);
  assert.equal(r.est.ctx.a, 1);
  assert.ok(Math.abs(Date.now() - r.pub.getTime() - 1 * HORA_MS) < 5000);
});

test('apiGetEstaticoConEdad(): archivo de 5 h -> vigente:false pero SÍ se devuelve (último recurso)', async () => {
  const f = armarApiEstatico(() => okJson({ _publicadoEn: haceMs(5 * HORA_MS), ctx: { a: 1 } }));
  const r = await f('https://ejemplo.test/guerra.json');
  assert.equal(r.vigente, false);
  assert.equal(r.est.ctx.a, 1);
});

test('apiGetEstaticoConEdad(): el umbral por defecto es 3 h y opts.edadMaxMs lo cambia', async () => {
  const f = armarApiEstatico(() => okJson({ _publicadoEn: haceMs(2 * HORA_MS) }));
  assert.equal((await f('u')).vigente, true, '2 h < 3 h por defecto');
  assert.equal((await f('u', { edadMaxMs: 1 * HORA_MS })).vigente, false, '2 h > 1 h pedido');
});

test('apiGetEstaticoConEdad(): sin _publicadoEn o con fecha inválida -> null (no se sabe su edad)', async () => {
  for (const cuerpo of [{ ctx: {} }, { _publicadoEn: 'no-es-fecha', ctx: {} }, { _publicadoEn: '' }, null]){
    const f = armarApiEstatico(() => okJson(cuerpo));
    assert.equal(await f('u'), null);
  }
});

test('apiGetEstaticoConEdad(): HTTP distinto de 200 o sin red -> lanza (igual que apiGetEstatico)', async () => {
  const f404 = armarApiEstatico(() => ({ ok: false, status: 404, json: async () => ({}) }));
  await assert.rejects(() => f404('u'), /HTTP 404/);
  const fRed = armarApiEstatico(() => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(() => fRed('u'), /Failed to fetch/);
});


/*
 * apiGetConRespaldoEstatico() — NUEVO (09-oct-2026, Fase 2 del plan "JSON estático como último recurso").
 * Pide a Apps Script y, solo si falla, elige el MÁS NUEVO entre el JSON estático vencido (`viejo`) y el
 * respaldo de localStorage de apiGet() (si opts.staleIfError).
 * Aquí se usa el api.js real con un localStorage en memoria; `apiGet` se reemplaza en el sandbox para simular a
 * Apps Script sin pasar por los reintentos con espera de _fetchYParsear(). Una prueba usa el apiGet REAL para
 * comprobar que la clave del respaldo que lee el ayudante es la misma que guarda apiGet().
 * LÍMITE: red simulada; no se probó contra Apps Script ni GitHub reales ni en un navegador.
 */
function armarApiRespaldo(){
  const guardar = () => {
    const datos = {};
    return { datos, getItem: (k) => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); }, removeItem: (k) => { delete datos[k]; } };
  };
  const local = guardar(), sesion = guardar();
  const sandbox = {
    localStorage: local, sessionStorage: sesion, URLSearchParams, setTimeout, clearTimeout, console, AbortController,
    fetch: async () => ({ json: async () => ({ ok: true }) })
  };
  vm.createContext(sandbox);
  vm.runInContext("const WEBAPP_URL = 'https://ejemplo.test/exec'; const WEB_MEMBER_TOKEN = 'TOKEN_PUBLICO';", sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/core/api.js'), 'utf8'), sandbox, { filename: 'api.js' });
  const llamadas = [];
  const simular = (impl) => { sandbox.apiGet = async (accion, params, opts) => { llamadas.push({ accion, params, opts }); return impl(); }; };
  // Deja un respaldo local como lo dejaría apiGet(): clave terna_backup_ + terna_cache_<qs>, con { t, d }.
  const sembrarRespaldo = (accion, params, d, t) => { local.setItem('terna_backup_' + sandbox._claveCacheApiGet(accion, params), JSON.stringify({ t, d })); };
  return { sandbox, local, llamadas, simular, sembrarRespaldo };
}
const caido = () => { throw new Error('No pudimos conectar con el servidor. Intenta de nuevo en un momento.'); };
const VIEJO = () => ({ data: { clanes: [{ nombre: 'DelArchivo' }] }, desde: new Date(Date.now() - 5 * HORA_MS) });

test('apiGetConRespaldoEstatico(): sin `viejo` es exactamente apiGet() (mismas opciones, staleIfError incluido)', async () => {
  const { sandbox, llamadas, simular } = armarApiRespaldo();
  simular(() => ({ clanes: [{ nombre: 'DeApps' }] }));
  const r = await sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { ttlMs: 300000, staleIfError: true }, null);
  assert.equal(r.origen, 'apps-script');
  assert.equal(r.desde, null);
  assert.equal(r.data.clanes[0].nombre, 'DeApps');
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].opts.staleIfError, true, 'sin archivo viejo, apiGet conserva su respaldo local de siempre');
  assert.equal(llamadas[0].opts.ttlMs, 300000);
});

test('apiGetConRespaldoEstatico(): sin `viejo` y Apps Script caído, el error sube igual que antes', async () => {
  const { sandbox, simular } = armarApiRespaldo();
  simular(caido);
  await assert.rejects(() => sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { staleIfError: true }, null), /No pudimos conectar/);
});

test('apiGetConRespaldoEstatico(): con `viejo` y Apps Script sano gana Apps Script (staleIfError se apaga para poder comparar)', async () => {
  const { sandbox, llamadas, simular } = armarApiRespaldo();
  simular(() => ({ clanes: [{ nombre: 'DeApps' }] }));
  const r = await sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { ttlMs: 300000, staleIfError: true }, VIEJO());
  assert.equal(r.origen, 'apps-script');
  assert.equal(r.data.clanes[0].nombre, 'DeApps');
  assert.equal(llamadas[0].opts.staleIfError, false);
  assert.equal(llamadas[0].opts.ttlMs, 300000, 'el resto de las opciones se conserva');
});

test('REGRESIÓN apiGetConRespaldoEstatico(): con `viejo`, Apps Script caído y SIN respaldo local -> gana el archivo viejo con su fecha', async () => {
  const { sandbox, simular } = armarApiRespaldo();
  simular(caido);
  const viejo = VIEJO();
  const r = await sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { staleIfError: true }, viejo);
  assert.equal(r.origen, 'estatico-viejo');
  assert.equal(r.data.clanes[0].nombre, 'DelArchivo');
  assert.equal(r.desde.getTime(), viejo.desde.getTime());
});

test('apiGetConRespaldoEstatico(): respaldo local MÁS NUEVO que el archivo viejo -> gana el respaldo, con la fecha en que se guardó', async () => {
  const { sandbox, simular, sembrarRespaldo } = armarApiRespaldo();
  simular(caido);
  const tRespaldo = Date.now() - 10 * 60 * 1000; // hace 10 min, el archivo es de hace 5 h
  sembrarRespaldo('webClanInfo', null, { clanes: [{ nombre: 'DelRespaldo' }] }, tRespaldo);
  const r = await sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { staleIfError: true }, VIEJO());
  assert.equal(r.origen, 'respaldo-local');
  assert.equal(r.data.clanes[0].nombre, 'DelRespaldo');
  assert.equal(r.desde.getTime(), tRespaldo);
});

test('apiGetConRespaldoEstatico(): respaldo local MÁS VIEJO que el archivo -> gana el archivo (antes habría ganado el respaldo de hace días)', async () => {
  const { sandbox, simular, sembrarRespaldo } = armarApiRespaldo();
  simular(caido);
  sembrarRespaldo('webClanInfo', null, { clanes: [{ nombre: 'DelRespaldo' }] }, Date.now() - 3 * 24 * HORA_MS);
  const r = await sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { staleIfError: true }, VIEJO());
  assert.equal(r.origen, 'estatico-viejo');
  assert.equal(r.data.clanes[0].nombre, 'DelArchivo');
});

test('apiGetConRespaldoEstatico(): sin opts.staleIfError el respaldo local se ignora aunque exista', async () => {
  const { sandbox, simular, sembrarRespaldo } = armarApiRespaldo();
  simular(caido);
  sembrarRespaldo('webClanInfo', null, { clanes: [{ nombre: 'DelRespaldo' }] }, Date.now() - 1000);
  const r = await sandbox.apiGetConRespaldoEstatico('webClanInfo', null, {}, VIEJO());
  assert.equal(r.origen, 'estatico-viejo');
});

test('apiGetConRespaldoEstatico(): un `error` de aplicación del backend también cuenta como "Apps Script falló" cuando hay archivo', async () => {
  const { sandbox, simular } = armarApiRespaldo();
  simular(() => { throw new Error('Error interno del backend'); });
  const r = await sandbox.apiGetConRespaldoEstatico('webRoster', null, { staleIfError: true }, VIEJO());
  assert.equal(r.origen, 'estatico-viejo');
});

test('apiGetConRespaldoEstatico(): `viejo` mal formado (sin data o con fecha inválida) se trata como si no hubiera', async () => {
  for (const malo of [{ data: null, desde: new Date() }, { data: {}, desde: new Date('no-es-fecha') }, { data: {} }, {}]){
    const { sandbox, llamadas, simular } = armarApiRespaldo();
    simular(caido);
    await assert.rejects(() => sandbox.apiGetConRespaldoEstatico('webClanInfo', null, { staleIfError: true }, malo), /No pudimos conectar/);
    assert.equal(llamadas[0].opts.staleIfError, true, 'se pidió como un apiGet normal');
  }
});

test('apiGetConRespaldoEstatico(): la clave del respaldo que lee es la MISMA que guarda el apiGet() real (con y sin parámetros)', async () => {
  for (const params of [null, { tag: '#AAA' }]){
    const { sandbox, local, simular } = armarApiRespaldo();
    await sandbox.apiGet('webRoster', params, { ttlMs: 300000, staleIfError: true }); // apiGet REAL: deja el respaldo
    const claves = Object.keys(local.datos).filter(k => k.startsWith('terna_backup_'));
    assert.equal(claves.length, 1);
    assert.equal(claves[0], 'terna_backup_' + sandbox._claveCacheApiGet('webRoster', params));
    simular(caido); // ahora Apps Script cae: el ayudante debe encontrar ese respaldo (es más nuevo que un archivo de hace 5 h)
    const r = await sandbox.apiGetConRespaldoEstatico('webRoster', params, { staleIfError: true }, VIEJO());
    assert.equal(r.origen, 'respaldo-local');
    assert.equal(r.data.ok, true);
  }
});


/*
 * apiGetRespaldoUsado() — NUEVO (09-oct-2026, Fase 5, pedido del usuario): aviso «⚠ Datos guardados» cuando apiGet() devuelve en silencio
 * su respaldo local. Aquí se usa el apiGet() REAL con un fetch simulado que cae (maxIntentos: 1 para no esperar reintentos).
 * LÍMITE: red simulada; no se probó contra Apps Script real ni en un navegador.
 */
const caeRed = async () => { throw new TypeError('Failed to fetch'); };

test('apiGetRespaldoUsado(): apiGet() real devuelve el respaldo local por caída -> da su fecha; con respuesta buena vuelve a null', async () => {
  const { sandbox, sembrarRespaldo } = armarApiRespaldo();
  assert.equal(sandbox.apiGetRespaldoUsado('webClanInfo', null), null, 'sin llamadas previas: null');
  const t = Date.now() - 2 * 24 * HORA_MS;
  sembrarRespaldo('webClanInfo', null, { clanes: [{ nombre: 'Viejo' }] }, t);
  sandbox.fetch = caeRed;
  const d = await sandbox.apiGet('webClanInfo', null, { ttlMs: 0, staleIfError: true, maxIntentos: 1 });
  assert.equal(d.clanes[0].nombre, 'Viejo');
  assert.equal(sandbox.apiGetRespaldoUsado('webClanInfo', null).getTime(), t);
  sandbox.fetch = async () => ({ ok: true, status: 200, text: async () => '{"clanes":[]}', json: async () => ({ clanes: [] }) });
  await sandbox.apiGet('webClanInfo', null, { ttlMs: 0, staleIfError: true, maxIntentos: 1 });
  assert.equal(sandbox.apiGetRespaldoUsado('webClanInfo', null), null, 'una respuesta buena borra el aviso');
});

test('apiGetRespaldoUsado(): sin respaldo local apiGet() lanza y no queda ningún aviso; sin staleIfError tampoco', async () => {
  const { sandbox, sembrarRespaldo } = armarApiRespaldo();
  sandbox.fetch = caeRed;
  await assert.rejects(() => sandbox.apiGet('webRoster', null, { ttlMs: 0, staleIfError: true, maxIntentos: 1 }));
  assert.equal(sandbox.apiGetRespaldoUsado('webRoster', null), null);
  sembrarRespaldo('webRoster', null, { clanes: [] }, Date.now() - HORA_MS);
  await assert.rejects(() => sandbox.apiGet('webRoster', null, { ttlMs: 0, maxIntentos: 1 }));
  assert.equal(sandbox.apiGetRespaldoUsado('webRoster', null), null, 'sin staleIfError el respaldo no se usa');
});

test('apiGetRespaldoUsado(): distingue por parámetros (misma acción, otro tag)', async () => {
  const { sandbox, sembrarRespaldo } = armarApiRespaldo();
  sembrarRespaldo('webPerfil', { tag: '#AAA' }, { ok: 1 }, Date.now() - HORA_MS);
  sandbox.fetch = caeRed;
  await sandbox.apiGet('webPerfil', { tag: '#AAA' }, { ttlMs: 0, staleIfError: true, maxIntentos: 1 });
  assert.ok(sandbox.apiGetRespaldoUsado('webPerfil', { tag: '#AAA' }));
  assert.equal(sandbox.apiGetRespaldoUsado('webPerfil', { tag: '#BBB' }), null);
  assert.equal(sandbox.apiGetRespaldoUsado('webPerfil', null), null);
});

test('REGRESIÓN apiGetConRespaldoEstatico(): sin `viejo`, si apiGet() devolvió su respaldo en silencio se informa como respaldo-local con su fecha', async () => {
  const { sandbox, sembrarRespaldo } = armarApiRespaldo();
  const t = Date.now() - 3 * 24 * HORA_MS;
  sembrarRespaldo('webRankings', null, { donadores: [] }, t);
  sandbox.fetch = caeRed;
  const r = await sandbox.apiGetConRespaldoEstatico('webRankings', null, { ttlMs: 0, staleIfError: true, maxIntentos: 1 }, null);
  assert.equal(r.origen, 'respaldo-local');
  assert.equal(r.desde.getTime(), t);
  assert.equal(JSON.stringify(r.data), '{"donadores":[]}');
});

test('apiGetConRespaldoEstatico(): sin `viejo` y con Apps Script sano sigue siendo apps-script (sin aviso)', async () => {
  const { sandbox, sembrarRespaldo } = armarApiRespaldo();
  sembrarRespaldo('webRankings', null, { donadores: ['viejo'] }, Date.now() - 3 * 24 * HORA_MS);
  sandbox.fetch = async () => ({ ok: true, status: 200, text: async () => '{"donadores":[]}', json: async () => ({ donadores: [] }) });
  const r = await sandbox.apiGetConRespaldoEstatico('webRankings', null, { ttlMs: 0, staleIfError: true, maxIntentos: 1 }, null);
  assert.equal(r.origen, 'apps-script');
  assert.equal(r.desde, null);
});


/*
 * apiGetPublicoConEstatico() — NUEVO (09-oct-2026, Fase 5): JSON estático vigente -> sin Apps Script; vencido -> último recurso; mal formado -> se ignora.
 * Se simulan apiGetEstatico (red a GitHub) y apiGet (Apps Script) en el sandbox de api.js real. LÍMITE: red simulada.
 */
const URL_JSON = 'https://ejemplo.test/data/roster.json';
const extraerClanes = j => (j && Array.isArray(j.clanes) && j.clanes.length ? j : null);
const JSON_ROSTER = (horasAtras, nombre) => ({ _publicadoEn: new Date(Date.now() - horasAtras * HORA_MS).toISOString(), clanes: [{ nombre: nombre || 'DelArchivo', miembros: [] }] });
function armarPublico({ archivo, apps }){
  const ctx = armarApiRespaldo();
  const urls = [];
  ctx.sandbox.apiGetEstatico = async (url) => { urls.push(url); if (archivo === undefined) throw new Error('HTTP 404'); return archivo; };
  ctx.simular(apps || (() => ({ clanes: [{ nombre: 'DeApps', miembros: [] }] })));
  return { ...ctx, urls };
}

test('apiGetPublicoConEstatico(): archivo vigente (1 h) -> se usa, origen estatico, con su fecha, y NO se llama a Apps Script', async () => {
  const { sandbox, llamadas, urls } = armarPublico({ archivo: JSON_ROSTER(1) });
  const r = await sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes);
  assert.equal(r.origen, 'estatico');
  assert.equal(r.data.clanes[0].nombre, 'DelArchivo');
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - HORA_MS) < 5000);
  assert.equal(llamadas.length, 0);
  assert.match(urls[0], /^https:\/\/ejemplo\.test\/data\/roster\.json\?t=\d+$/);
});

test('apiGetPublicoConEstatico(): archivo vencido (5 h) con Apps Script sano -> gana Apps Script, con la caché de 5 min y staleIfError de siempre', async () => {
  const { sandbox, llamadas } = armarPublico({ archivo: JSON_ROSTER(5) });
  const r = await sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes);
  assert.equal(r.origen, 'apps-script');
  assert.equal(r.data.clanes[0].nombre, 'DeApps');
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].accion, 'webRoster');
  assert.equal(llamadas[0].opts.ttlMs, 300000);
  assert.equal(llamadas[0].opts.staleIfError, false, 'con archivo vencido se apaga para poder comparar');
});

test('REGRESIÓN apiGetPublicoConEstatico(): archivo vencido + Apps Script caído + sin respaldo local -> se usa el archivo viejo con su fecha', async () => {
  const { sandbox } = armarPublico({ archivo: JSON_ROSTER(5), apps: caido });
  const r = await sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes);
  assert.equal(r.origen, 'estatico-viejo');
  assert.equal(r.data.clanes[0].nombre, 'DelArchivo');
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - 5 * HORA_MS) < 5000);
});

test('apiGetPublicoConEstatico(): archivo vencido + Apps Script caído + respaldo local más nuevo -> gana el respaldo local', async () => {
  const { sandbox, sembrarRespaldo } = armarPublico({ archivo: JSON_ROSTER(5), apps: caido });
  const t = Date.now() - 10 * 60 * 1000;
  sembrarRespaldo('webRoster', null, { clanes: [{ nombre: 'DelRespaldo', miembros: [] }] }, t);
  const r = await sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes);
  assert.equal(r.origen, 'respaldo-local');
  assert.equal(r.desde.getTime(), t);
});

test('apiGetPublicoConEstatico(): archivo sin la forma esperada (extraer -> null) se ignora: con Apps Script sano gana Apps Script; caído, el error sube', async () => {
  const malo = { _publicadoEn: new Date().toISOString(), clanes: [] };
  const sano = armarPublico({ archivo: malo });
  assert.equal((await sano.sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes)).origen, 'apps-script');
  const caidoApps = armarPublico({ archivo: malo, apps: caido });
  await assert.rejects(() => caidoApps.sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes), /No pudimos conectar/);
});

test('apiGetPublicoConEstatico(): sin archivo (404) -> Apps Script; sin archivo y Apps Script caído -> el error sube igual que antes', async () => {
  const sano = armarPublico({ archivo: undefined });
  assert.equal((await sano.sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes)).origen, 'apps-script');
  const caidoApps = armarPublico({ archivo: undefined, apps: caido });
  await assert.rejects(() => caidoApps.sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes), /No pudimos conectar/);
});

test('apiGetPublicoConEstatico(): sin `opts` usa { ttlMs: 300000, staleIfError: true } y respeta los que se le pasen', async () => {
  const sinArchivo = armarPublico({ archivo: undefined });
  await sinArchivo.sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes);
  assert.deepEqual([sinArchivo.llamadas[0].opts.ttlMs, sinArchivo.llamadas[0].opts.staleIfError], [300000, true]);
  const conOpts = armarPublico({ archivo: undefined });
  await conOpts.sandbox.apiGetPublicoConEstatico(URL_JSON, 'webRoster', extraerClanes, { ttlMs: 1000, staleIfError: true, maxIntentos: 2 });
  assert.equal(conOpts.llamadas[0].opts.maxIntentos, 2);
});
