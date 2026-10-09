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
// REAL (a) obtenerDatosGuerra() con sus constantes y (b) actualizarAgoText().
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

const I2 = grande.indexOf('function actualizarAgoText');
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
// `extra`: código adicional que se evalúa en el MISMO eval (jsdom no comparte los const/let de un window.eval con el siguiente).
function montar({ estatico, apiGetImpl, extra = '' } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/core/api.js'], '<span id="agoText"></span>'); // util.js: actualizarAgoText() usa fmtTresTiempos()
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
  window.eval(PRELUDIO + TRAMO_OBTENER + TRAMO_AGO + extra + EPILOGO);
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
  assert.ok(ago().textContent.includes('API Supercell: hace 5 h'));
  assert.ok(ago().title.includes('el servidor no respondió'));
  t.set({ v: false });
  t.actualizarAgoText();
  assert.ok(!ago().textContent.includes('Datos guardados'));
  assert.ok(!ago().title.includes('el servidor no respondió'));
});

// ---------------------------------------------------------------- Unificación con fmtTresTiempos() (09-oct-2026, pedido del usuario)
// La barra de estado ya no tiene formato propio: usa el mismo componente que el resto del sitio (util.js).

test('barra de estado — archivo vigente: «Consulta · JSON publicado · API Supercell», en ese orden', () => {
  const { t, window } = montar({ estatico: () => VIGENTE });
  const ago = () => window.document.getElementById('agoText');
  t.set({ f: new Date(Date.now() - 3000), p: new Date(Date.now() - 40 * 60 * 1000), a: new Date(Date.now() - 52 * 60 * 1000), v: false });
  t.actualizarAgoText();
  assert.match(ago().textContent, /^Consulta: hace 3 s · JSON publicado: hace 40 min · API Supercell: hace 52 min$/);
  assert.ok(ago().title.includes('Última consulta del bot a la API de Supercell'));
  assert.ok(ago().title.includes('Archivo JSON publicado'));
  assert.ok(ago().title.includes('Esta página consultó'));
});

test('barra de estado — datos de Apps Script (sin archivo): no sale «JSON publicado»', () => {
  const { t, window } = montar({ estatico: undefined });
  const ago = () => window.document.getElementById('agoText');
  t.set({ f: new Date(Date.now() - 2000), p: null, a: new Date(Date.now() - 10 * 60 * 1000), v: false });
  t.actualizarAgoText();
  assert.match(ago().textContent, /^Consulta: hace 2 s · API Supercell: hace 10 min$/);
  assert.ok(!ago().textContent.includes('JSON publicado'));
});

test('barra de estado — sin la hora de la API (el dato no la trae): solo se omite esa parte', () => {
  const { t, window } = montar({ estatico: () => VIGENTE });
  const ago = () => window.document.getElementById('agoText');
  t.set({ f: new Date(Date.now() - 1000), p: new Date(Date.now() - 60 * 1000), a: null, v: false });
  t.actualizarAgoText();
  assert.match(ago().textContent, /^Consulta: hace 1 s · JSON publicado: hace 1 min$/);
});

test('barra de estado — archivo viejo + Apps Script caído: Consulta real, JSON publicado de hace horas y el aviso', async () => {
  const { t, window } = montar({ estatico: () => VENCIDO, apiGetImpl: appsScriptCaido });
  const r = await t.obtenerDatosGuerra();
  assert.equal(r.viejo, true);
  t.set({ f: new Date(Date.now() - 1000), p: r.desde, a: null, v: r.viejo });
  t.actualizarAgoText();
  assert.match(window.document.getElementById('agoText').textContent, /^Consulta: hace 1 s · JSON publicado: hace 5 h( \d+ min)? · ⚠ Datos guardados: el servidor no responde$/);
});

test('barra de estado — sin lastFetchAt no pinta nada (como antes)', () => {
  const { t, window } = montar({ estatico: () => VIGENTE });
  t.actualizarAgoText();
  assert.equal(window.document.getElementById('agoText').textContent, '');
});

test('guerra.html ya no trae su propio formato de hora: usa fmtTresTiempos() de util.js', () => {
  assert.ok(!grande.includes('function _haceCorto') && !grande.includes('function _horaLima'));
  assert.ok(TRAMO_AGO.includes('fmtTresTiempos('));
});


// ---------------------------------------------------------------- Fase 5 (09-oct-2026): cabeceras de clan desde home.json
// cargarClanInfoGuerra() lee home.json (clave clanInfo) primero y cae a apiGet('webClanInfo'); ver apiGetPublicoConEstatico() en api.js.
const I3 = grande.indexOf('async function cargarClanInfoGuerra');
const F3 = grande.indexOf('/* cargarPronosticoGuerra');
assert.ok(I3 >= 0 && F3 > I3, 'marcadores de cargarClanInfoGuerra() no encontrados (¿se reorganizó guerra.html?)');
const TRAMO_CLANINFO = grande.slice(I3, F3);

function montarClanInfo(opts){
  // Un solo eval: cargarClanInfoGuerra() usa HOME_ESTATICO_URL, un const del tramo de obtenerDatosGuerra().
  const m = montar({ ...opts, extra: '\nlet clanInfoGuerra = null; let __cab = 0; function actualizarCabecerasClanes(){ __cab++; }\n' + TRAMO_CLANINFO +
    '\nwindow.__c = { cargarClanInfoGuerra, info: () => clanInfoGuerra, cab: () => __cab };\n' });
  m.c = m.window.__c;
  return m;
}
const HOME_JSON = (horasAtras) => ({ _publicadoEn: hace(horasAtras * HORA), clanInfo: { clanes: [{ nombre: 'Terna Uno (archivo)' }, null] } });
const INFO_APPS = () => ({ clanes: [{ nombre: 'Terna Uno (apps)' }] });

test('Fase 5, cabeceras de clan: home.json vigente se usa (sin nulos) y NO se llama a Apps Script', async () => {
  const { c, llamadasApiGet, llamadasEstatico } = montarClanInfo({ estatico: () => HOME_JSON(1), apiGetImpl: INFO_APPS });
  await c.cargarClanInfoGuerra();
  assert.equal(c.info().length, 1);
  assert.equal(c.info()[0].nombre, 'Terna Uno (archivo)');
  assert.equal(c.cab(), 1, 'se repintan las cabeceras');
  assert.equal(llamadasApiGet.length, 0);
  assert.match(llamadasEstatico[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/home\.json\?t=\d+$/);
});

test('Fase 5, cabeceras de clan: sin home.json o con home.json vencido y Apps Script sano -> webClanInfo (5 min de caché)', async () => {
  for (const estatico of [undefined, () => HOME_JSON(5)]){
    const { c, llamadasApiGet } = montarClanInfo({ estatico, apiGetImpl: INFO_APPS });
    await c.cargarClanInfoGuerra();
    assert.equal(c.info()[0].nombre, 'Terna Uno (apps)');
    assert.equal(llamadasApiGet[0].accion, 'webClanInfo');
    assert.equal(llamadasApiGet[0].opts.ttlMs, 300000);
  }
});

test('Fase 5, cabeceras de clan: home.json vencido + Apps Script caído -> se usa el archivo viejo; sin nada, no revienta y las tarjetas quedan como antes', async () => {
  const viejo = montarClanInfo({ estatico: () => HOME_JSON(5), apiGetImpl: appsScriptCaido });
  await viejo.c.cargarClanInfoGuerra();
  assert.equal(viejo.c.info()[0].nombre, 'Terna Uno (archivo)');
  const nada = montarClanInfo({ estatico: undefined, apiGetImpl: appsScriptCaido });
  await nada.c.cargarClanInfoGuerra();
  assert.equal(nada.c.info(), null);
  assert.equal(nada.c.cab(), 0);
});

test('Fase 5, cabeceras de clan: home.json sin clanInfo válido (vacío o con error) se ignora y se pide a Apps Script', async () => {
  for (const clanInfo of [{ clanes: [] }, { error: 'x', clanes: [{ nombre: 'Mal' }] }, undefined]){
    const { c, llamadasApiGet } = montarClanInfo({ estatico: () => ({ _publicadoEn: hace(HORA), clanInfo }), apiGetImpl: INFO_APPS });
    await c.cargarClanInfoGuerra();
    assert.equal(c.info()[0].nombre, 'Terna Uno (apps)');
    assert.equal(llamadasApiGet.length, 1);
  }
});
