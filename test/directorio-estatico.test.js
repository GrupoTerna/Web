'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (09-oct-2026, Fase 3 del plan "JSON estático como último recurso").
// directorio.html tiene dos fuentes con archivo estático: la info de clanes (parte superior; antes pedía webClanInfo directo y
// se saltaba home.json) y el roster (roster.json). Cambio de esta fase: si el archivo está vencido (>3 h) PERO Apps Script
// también falla, se usa el archivo viejo, salvo que el respaldo local (localStorage) sea más nuevo. Además cada resultado informa
// su origen y, si el dato lo trae, el momento en que el bot consultó a Supercell (tiempos.api.ultimaConsultaTs).
//
// La página es larga: NO se carga entera. Se extraen de su <script> inline REAL los dos tramos que importan (si alguien los
// reorganiza, los marcadores fallan a propósito). config.js, util.js y api.js se cargan de verdad; solo se simulan
// apiGetEstatico (red a GitHub) y apiGet (Apps Script). El respaldo local es el localStorage real de jsdom.
//
// LÍMITE: prueba el FRONTEND con red simulada. No prueba el dibujo de la página, el bot que publica los JSON, ni Apps Script/GitHub reales.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('async function obtenerRoster'));
assert.ok(script, 'no se encontró el <script> inline con obtenerRoster() en directorio.html');
const tramo = (desde, hasta, etiqueta) => {
  const i = script.indexOf(desde), f = script.indexOf(hasta, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${etiqueta} no encontrados (¿se reorganizó la página?)`);
  return script.slice(i, f);
};
const TRAMO_INFO = tramo('const HOME_ESTATICO_URL', 'async function cargarClanInfoYCharts', 'obtenerClanInfoDirectorio()');
const TRAMO_ROSTER = tramo('const ROSTER_ESTATICO_URL', 'async function cargarRoster', 'obtenerRoster()');
const CUERPO_CARGAR_INFO = tramo('async function cargarClanInfoYCharts', '\ncargarClanInfoYCharts();', 'cargarClanInfoYCharts()');

const HORA = 60 * 60 * 1000;
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const appsScriptCaido = () => { throw new Error('No pudimos conectar con el servidor.'); };
const CLAN_INFO = (n) => ({ clanes: [{ nombre: n }] });
const ROSTER = (n) => ({ clanes: [{ nombre: n, miembros: [] }] });

function montar({ archivos = {}, apiGetImpl } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], '');
  const llamadasApiGet = [], llamadasEstatico = [];
  window.apiGetEstatico = async (url) => {
    llamadasEstatico.push(url);
    const nombre = url.split('/').pop().split('?')[0];
    if (!(nombre in archivos)) throw new Error('HTTP 404 (simulado)');
    return archivos[nombre];
  };
  window.apiGet = async (accion, params, opts) => {
    llamadasApiGet.push({ accion, opts });
    return apiGetImpl ? apiGetImpl(accion) : { origen: 'apps-script:' + accion, clanes: [{ nombre: 'Terna Uno (Apps Script)' }] };
  };
  window.eval(TRAMO_INFO + TRAMO_ROSTER + '\nwindow.__t = { obtenerClanInfoDirectorio, obtenerRoster };');
  const sembrarRespaldo = (accion, d, t) => window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet(accion, null), JSON.stringify({ t, d }));
  return { t: window.__t, window, llamadasApiGet, llamadasEstatico, sembrarRespaldo };
}

// ---------------------------------------------------------------- estructura de la página

test('directorio.html: la parte superior ya no pide webClanInfo directo a Apps Script', () => {
  assert.ok(!CUERPO_CARGAR_INFO.includes("apiGet('webClanInfo'"), 'cargarClanInfoYCharts() no debe saltarse home.json');
  assert.ok(CUERPO_CARGAR_INFO.includes('obtenerClanInfoDirectorio()'));
});

// ---------------------------------------------------------------- info de clanes (home.json)

test('info: home.json vigente (1 h) se usa y NO se llama a Apps Script', async () => {
  const { t, llamadasApiGet } = montar({ archivos: { 'home.json': { _publicadoEn: hace(HORA), clanInfo: CLAN_INFO('Terna Uno') } } });
  const r = await t.obtenerClanInfoDirectorio();
  assert.equal(r.origen, 'estatico');
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno');
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - HORA) < 5000);
  assert.equal(llamadasApiGet.length, 0);
});

test('info: informa la fecha de Supercell si viene en la sección o en la raíz de home.json, y null si no viene', async () => {
  const ts = Date.now() - 50 * 60 * 1000;
  const enSeccion = montar({ archivos: { 'home.json': { _publicadoEn: hace(HORA), clanInfo: { ...CLAN_INFO('A'), tiempos: { api: { ultimaConsultaTs: ts } } } } } });
  assert.equal((await enSeccion.t.obtenerClanInfoDirectorio()).api.getTime(), ts);
  const enRaiz = montar({ archivos: { 'home.json': { _publicadoEn: hace(HORA), tiempos: { api: { ultimaConsultaTs: ts } }, clanInfo: CLAN_INFO('A') } } });
  assert.equal((await enRaiz.t.obtenerClanInfoDirectorio()).api.getTime(), ts);
  const sin = montar({ archivos: { 'home.json': { _publicadoEn: hace(HORA), clanInfo: CLAN_INFO('A') } } });
  assert.equal((await sin.t.obtenerClanInfoDirectorio()).api, null);
});

test('REGRESIÓN info: home.json vencido (5 h) + Apps Script caído -> usa el archivo viejo con su fecha y origen estatico-viejo', async () => {
  const { t } = montar({ archivos: { 'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: CLAN_INFO('Terna Uno (viejo)') } }, apiGetImpl: appsScriptCaido });
  const r = await t.obtenerClanInfoDirectorio();
  assert.equal(r.origen, 'estatico-viejo');
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (viejo)');
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - 5 * HORA) < 5000, 'desde = fecha de publicación del archivo');
});

test('info: home.json vencido + Apps Script sano -> manda Apps Script (origen apps-script)', async () => {
  const { t, llamadasApiGet } = montar({ archivos: { 'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: CLAN_INFO('viejo') } } });
  const r = await t.obtenerClanInfoDirectorio();
  assert.equal(r.origen, 'apps-script');
  assert.equal(llamadasApiGet.length, 1);
  assert.equal(llamadasApiGet[0].accion, 'webClanInfo');
});

test('info: respaldo local más nuevo que el archivo vencido gana; si el archivo es más nuevo, gana el archivo', async () => {
  const a = montar({ archivos: { 'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: CLAN_INFO('archivo') } }, apiGetImpl: appsScriptCaido });
  a.sembrarRespaldo('webClanInfo', CLAN_INFO('respaldo-reciente'), Date.now() - 10 * 60 * 1000);
  const ra = await a.t.obtenerClanInfoDirectorio();
  assert.deepEqual([ra.origen, ra.data.clanes[0].nombre], ['respaldo-local', 'respaldo-reciente']);
  assert.ok(Math.abs(Date.now() - ra.desde.getTime() - 10 * 60 * 1000) < 5000);

  const b = montar({ archivos: { 'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: CLAN_INFO('archivo') } }, apiGetImpl: appsScriptCaido });
  b.sembrarRespaldo('webClanInfo', CLAN_INFO('respaldo-de-hace-dias'), Date.now() - 48 * HORA);
  const rb = await b.t.obtenerClanInfoDirectorio();
  assert.deepEqual([rb.origen, rb.data.clanes[0].nombre], ['estatico-viejo', 'archivo']);
});

test('info: archivo sin `clanes`, con error o sin _publicadoEn + Apps Script caído -> el error sube (no se usa)', async () => {
  for (const home of [
    { _publicadoEn: hace(5 * HORA), clanInfo: { clanes: [] } },
    { _publicadoEn: hace(5 * HORA), clanInfo: { error: 'x', clanes: [{ nombre: 'a' }] } },
    { _publicadoEn: hace(5 * HORA) },
    { clanInfo: CLAN_INFO('sin fecha') }
  ]){
    const { t } = montar({ archivos: { 'home.json': home }, apiGetImpl: appsScriptCaido });
    await assert.rejects(() => t.obtenerClanInfoDirectorio(), /No pudimos conectar/);
  }
});

test('info: sin archivo (404) -> Apps Script con staleIfError (respaldo local como siempre)', async () => {
  const { t, llamadasApiGet } = montar({ archivos: {} });
  const r = await t.obtenerClanInfoDirectorio();
  assert.equal(r.origen, 'apps-script');
  assert.equal(llamadasApiGet[0].opts.staleIfError, true);
});

// ---------------------------------------------------------------- roster (roster.json)

test('roster: vigente (1 h) se usa, estatico:true, y NO se llama a Apps Script', async () => {
  const { t, llamadasApiGet } = montar({ archivos: { 'roster.json': { _publicadoEn: hace(HORA), ...ROSTER('Terna Uno') } } });
  const r = await t.obtenerRoster();
  assert.deepEqual([r.estatico, r.origen], [true, 'estatico']);
  assert.equal(llamadasApiGet.length, 0);
});

test('REGRESIÓN roster: roster.json vencido (5 h) + Apps Script caído -> usa el archivo viejo (antes quedaba sin directorio)', async () => {
  const { t } = montar({ archivos: { 'roster.json': { _publicadoEn: hace(5 * HORA), ...ROSTER('Terna Uno (viejo)') } }, apiGetImpl: appsScriptCaido });
  const r = await t.obtenerRoster();
  assert.deepEqual([r.estatico, r.origen], [true, 'estatico-viejo']);
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (viejo)');
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - 5 * HORA) < 5000);
});

test('roster: vencido + Apps Script sano -> Apps Script (estatico:false); con respaldo local más nuevo y Apps Script caído -> respaldo local', async () => {
  const sano = montar({ archivos: { 'roster.json': { _publicadoEn: hace(5 * HORA), ...ROSTER('viejo') } } });
  const rs = await sano.t.obtenerRoster();
  assert.deepEqual([rs.estatico, rs.origen], [false, 'apps-script']);

  const caido = montar({ archivos: { 'roster.json': { _publicadoEn: hace(5 * HORA), ...ROSTER('viejo') } }, apiGetImpl: appsScriptCaido });
  caido.sembrarRespaldo('webRoster', ROSTER('respaldo'), Date.now() - 5 * 60 * 1000);
  const rc = await caido.t.obtenerRoster();
  assert.deepEqual([rc.estatico, rc.origen, rc.data.clanes[0].nombre], [false, 'respaldo-local', 'respaldo']);
});

test('roster: vencido y sin `clanes` válidos + Apps Script caído -> el error sube', async () => {
  const { t } = montar({ archivos: { 'roster.json': { _publicadoEn: hace(5 * HORA), clanes: [] } }, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerRoster(), /No pudimos conectar/);
});

test('roster: informa la fecha de Supercell solo si el JSON la trae', async () => {
  const ts = Date.now() - 20 * 60 * 1000;
  const con = montar({ archivos: { 'roster.json': { _publicadoEn: hace(HORA), tiempos: { api: { ultimaConsultaTs: ts } }, ...ROSTER('A') } } });
  assert.equal((await con.t.obtenerRoster()).api.getTime(), ts);
  const sin = montar({ archivos: { 'roster.json': { _publicadoEn: hace(HORA), ...ROSTER('A') } } });
  assert.equal((await sin.t.obtenerRoster()).api, null);
});

// ---------------------------------------------------------------- Fase 4: hora real de «Consulta» (09-oct-2026)

test('roster e info: con origen apps-script el resultado trae `accion` y «Consulta» es la hora real del último guardado, no «ahora»', async () => {
  const { t, window, sembrarRespaldo } = montar({});
  sembrarRespaldo('webRoster', ROSTER('x'), Date.now() - 2 * 24 * HORA);
  sembrarRespaldo('webClanInfo', CLAN_INFO('x'), Date.now() - 6 * HORA);
  const rr = await t.obtenerRoster();
  assert.equal(rr.origen, 'apps-script');
  assert.equal(rr.accion, 'webRoster');
  assert.match(window.fmtTresTiemposDeResultado(rr).texto, /^Consulta: hace 2 d$/);
  const ri = await t.obtenerClanInfoDirectorio();
  assert.equal(ri.accion, 'webClanInfo');
  assert.match(window.fmtTresTiemposDeResultado(ri).texto, /^Consulta: hace 6 h$/);
});

test('roster: con el archivo vigente «Consulta» sigue siendo ahora (la página acaba de bajarlo)', async () => {
  const { t, window } = montar({ archivos: { 'roster.json': { _publicadoEn: hace(HORA), clanes: [{ nombre: 'A', miembros: [] }] } } });
  assert.match(window.fmtTresTiemposDeResultado(await t.obtenerRoster()).texto, /^Consulta: hace \d+ s · JSON publicado: hace 1 h$/);
});
