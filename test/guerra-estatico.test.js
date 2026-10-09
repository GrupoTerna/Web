'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (09-oct-2026, Fase 1 del plan "JSON estático como último recurso").
// guerra.html lee guerra.json (rama `data`) primero y cae a apiGet('webGuerraEnVivo') si el archivo falta,
// falla o está vencido (>3 h). Cambio de esta fase: si el archivo está vencido PERO Apps Script también
// falla, se muestra el archivo viejo (viejo:true) y la barra de estado avisa "Datos guardados".
//
// guerra.html tiene miles de líneas de script, así que NO se carga entero: se extraen del <script> inline
// REAL (a) obtenerDatosGuerra() con sus constantes y (b) _haceCorto()/_horaLima()/actualizarAgoText().
// Si alguien reorganiza esos tramos, los marcadores de abajo fallan a propósito. api.js se carga de verdad
// para usar la apiGetEstaticoConEdad() real; solo se simulan apiGetEstatico (red a GitHub) y apiGet (Apps Script).
//
// LÍMITE: prueba el FRONTEND con red simulada. No prueba el bot que publica guerra.json, Apps Script real,
// GitHub real ni el dibujo de la página (render() no se ejecuta).

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('const GUERRA_ESTATICO_URL'));
assert.ok(grande, 'no se encontró el tramo de guerra.json en un <script> inline de guerra.html');

const I1 = grande.indexOf('const GUERRA_ESTATICO_URL');
const F1 = grande.indexOf('/* El archivo estático lleva los pendientes SIN nomMulti/prestamo');
assert.ok(I1 >= 0 && F1 > I1, 'marcadores de obtenerDatosGuerra() no encontrados (¿se reorganizó guerra.html?)');
const TRAMO_OBTENER = grande.slice(I1, F1);
assert.ok(TRAMO_OBTENER.includes('async function obtenerDatosGuerra'));

const I2 = grande.indexOf('function _haceCorto');
const F2 = grande.indexOf('function iniciarProgreso');
assert.ok(I2 >= 0 && F2 > I2, 'marcadores de actualizarAgoText() no encontrados (¿se reorganizó guerra.html?)');
const TRAMO_AGO = grande.slice(I2, F2);
assert.ok(TRAMO_AGO.includes('function actualizarAgoText'));

const PRELUDIO = 'let lastFetchAt = null, lastApiAt = null, lastPublicadoAt = null, lastEsViejo = false;\n';
const EPILOGO = '\nwindow.__t = { obtenerDatosGuerra, actualizarAgoText, set: (o) => { if ("f" in o) lastFetchAt = o.f; if ("a" in o) lastApiAt = o.a; if ("p" in o) lastPublicadoAt = o.p; if ("v" in o) lastEsViejo = o.v; } };';

const HORA = 60 * 60 * 1000;
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const VIGENTE = { _publicadoEn: hace(1 * HORA), ctx: { periodIndex: 17 }, origen: 'estatico' };
const VENCIDO = { _publicadoEn: hace(5 * HORA), ctx: { periodIndex: 17 }, origen: 'estatico-viejo' };
const DE_APPS = { ctx: { periodIndex: 18 }, origen: 'apps-script' };

// `estatico`: undefined -> apiGetEstatico rechaza (sin archivo / sin red a GitHub); función -> se usa tal cual.
// `apiGetImpl`: comportamiento de apiGet (por defecto devuelve DE_APPS); lanzar para simular Apps Script caído.
function montar({ estatico, apiGetImpl } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/core/api.js'], '<span id="agoText"></span>');
  const llamadasApiGet = [], llamadasEstatico = [];
  window.apiGetEstatico = async (url) => {
    llamadasEstatico.push(url);
    if (!estatico) throw new Error('sin guerra.json (simulado)');
    return estatico(url);
  };
  window.apiGet = async (accion, params, opts) => {
    llamadasApiGet.push({ accion, opts });
    return apiGetImpl ? apiGetImpl() : DE_APPS;
  };
  window.eval(PRELUDIO + TRAMO_OBTENER + TRAMO_AGO + EPILOGO);
  return { t: window.__t, window, llamadasApiGet, llamadasEstatico };
}
const appsScriptCaido = () => { throw new Error('No pudimos conectar con el servidor. Intenta de nuevo en un momento.'); };

test('guerra.json vigente: se usa, NO se llama a Apps Script y no es "viejo"', async () => {
  const { t, llamadasApiGet, llamadasEstatico } = montar({ estatico: () => VIGENTE });
  const r = await t.obtenerDatosGuerra();
  assert.equal(r.data.origen, 'estatico');
  assert.equal(r.estatico, true);
  assert.equal(r.viejo, false);
  assert.equal(llamadasApiGet.length, 0);
  assert.match(llamadasEstatico[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/guerra\.json\?t=\d+$/);
});

test('guerra.json vigente con Apps Script caído: ni siquiera se necesita Apps Script', async () => {
  const { t } = montar({ estatico: () => VIGENTE, apiGetImpl: appsScriptCaido });
  const r = await t.obtenerDatosGuerra();
  assert.equal(r.data.origen, 'estatico');
});

test('guerra.json vencido (5 h) y Apps Script sano: gana Apps Script (el umbral de 3 h se mantiene)', async () => {
  const { t, llamadasApiGet } = montar({ estatico: () => VENCIDO });
  const r = await t.obtenerDatosGuerra();
  assert.equal(r.data.origen, 'apps-script');
  assert.equal(r.estatico, false);
  assert.equal(r.viejo, false);
  assert.equal(llamadasApiGet.length, 1);
  assert.equal(llamadasApiGet[0].accion, 'webGuerraEnVivo');
  assert.equal(llamadasApiGet[0].opts.sinCache, true);
  assert.equal(llamadasApiGet[0].opts.conSesion, true);
  assert.equal(llamadasApiGet[0].opts.maxIntentos, 2);
});

test('REGRESIÓN: guerra.json vencido (5 h) y Apps Script caído: se muestra el archivo viejo con viejo:true', async () => {
  const { t } = montar({ estatico: () => VENCIDO, apiGetImpl: appsScriptCaido });
  const r = await t.obtenerDatosGuerra();
  assert.equal(r.data.origen, 'estatico-viejo');
  assert.equal(r.estatico, true);
  assert.equal(r.viejo, true);
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - 5 * HORA) < 5000, 'desde = fecha de publicación del archivo, no "ahora"');
});

test('archivo vencido SIN `ctx` + Apps Script caído: no se usa como último recurso, el error sube', async () => {
  const { t } = montar({ estatico: () => ({ _publicadoEn: hace(5 * HORA), otro: 1 }), apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerDatosGuerra(), /No pudimos conectar/);
});

test('sin archivo (GitHub no responde) + Apps Script caído: el error sube igual que antes', async () => {
  const { t } = montar({ estatico: undefined, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerDatosGuerra(), /No pudimos conectar/);
});

test('archivo sin _publicadoEn (edad desconocida) + Apps Script caído: no se usa, el error sube', async () => {
  const { t } = montar({ estatico: () => ({ ctx: { periodIndex: 17 } }), apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerDatosGuerra(), /No pudimos conectar/);
});

test('sin archivo + Apps Script sano: se usa Apps Script como siempre', async () => {
  const { t } = montar({ estatico: undefined });
  const r = await t.obtenerDatosGuerra();
  assert.equal(r.data.origen, 'apps-script');
  assert.equal(r.viejo, false);
});

test('barra de estado: con datos guardados avisa; sin ellos, no', () => {
  const { t, window } = montar({ estatico: () => VIGENTE });
  const ago = () => window.document.getElementById('agoText');
  t.set({ f: new Date(), a: new Date(Date.now() - 5 * HORA), v: true });
  t.actualizarAgoText();
  assert.ok(ago().textContent.includes('Datos guardados: el servidor no responde'));
  assert.ok(ago().textContent.includes('API: hace 5 h'));
  assert.ok(ago().title.includes('Apps Script no respondió'));
  t.set({ v: false });
  t.actualizarAgoText();
  assert.ok(!ago().textContent.includes('Datos guardados'));
  assert.ok(!ago().title.includes('Apps Script no respondió'));
});
