'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (09-oct-2026, Fase 2 del plan "JSON estático como último recurso").
// index.html (obtenerHome / obtenerGuerraTop) y clan.html (clanObtenerInfo / clanObtenerRoster / clanObtenerGuerra) leen
// archivos estáticos de la rama `data` (home.json, guerra_top.json, roster.json, guerra.json) y caen a Apps Script si
// faltan, fallan o están vencidos (>3 h). Cambio de esta fase: si el archivo está vencido PERO Apps Script también falla,
// se usa el archivo viejo, salvo que el respaldo local (localStorage) sea más nuevo. clan.html además avisa en su
// tarjeta de guerra que son «Datos guardados».
//
// Las dos páginas son largas, así que NO se cargan enteras: se extraen de su <script> inline REAL los tramos que
// importan (si alguien los reorganiza, los marcadores de abajo fallan a propósito). api.js, util.js y config.js se
// cargan de verdad; solo se simulan apiGetEstatico (red a GitHub) y apiGet (Apps Script). El respaldo local es el
// localStorage real de jsdom.
//
// LÍMITE: prueba el FRONTEND con red simulada. No prueba el bot que publica los JSON, Apps Script real, GitHub real ni
// el dibujo completo de las páginas (solo el de la tarjeta de guerra de clan.html).

const leerScripts = (archivo) => {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
};
const tramo = (texto, desde, hasta, etiqueta) => {
  const i = texto.indexOf(desde), f = texto.indexOf(hasta, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${etiqueta} no encontrados (¿se reorganizó la página?)`);
  return texto.slice(i, f);
};

const scriptIndex = leerScripts('index.html').find(t => t.includes('const HOME_ESTATICO_URL'));
assert.ok(scriptIndex, 'no se encontró el tramo de home.json en un <script> inline de index.html');
const TRAMO_INDEX = tramo(scriptIndex, 'const HOME_ESTATICO_URL', 'async function cargarClanes', 'obtenerHome()/obtenerGuerraTop()');
assert.ok(TRAMO_INDEX.includes('async function obtenerHome') && TRAMO_INDEX.includes('async function obtenerGuerraTop'));

const scriptClan = leerScripts('clan.html').find(t => t.includes('const HOME_ESTATICO_URL'));
assert.ok(scriptClan, 'no se encontró el tramo de archivos estáticos en un <script> inline de clan.html');
const TRAMO_CLAN_FUENTES = tramo(scriptClan, 'const HOME_ESTATICO_URL', '/** Resumen de guerra: se carga aparte', 'clanObtenerInfo()/Roster()/Guerra()');
const TRAMO_CLAN_CARGAR_GUERRA = tramo(scriptClan, '/** Resumen de guerra: se carga aparte', 'async function cargarClan()', 'cargarGuerraClan()');
const TRAMO_CLAN_RENDER_GUERRA = tramo(scriptClan, '/** Pinta el resumen de guerra', '/** Pinta la tabla básica del roster', 'renderClanGuerra()');
const TRAMO_CLAN_COINCIDE = tramo(scriptClan, 'function clanCoincide', 'function mostrarErrorClan', 'clanCoincide()');
assert.ok(TRAMO_CLAN_FUENTES.includes('async function clanObtenerInfo') && TRAMO_CLAN_FUENTES.includes('async function clanObtenerGuerra'));

const HORA = 60 * 60 * 1000;
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const appsScriptCaido = () => { throw new Error('No pudimos conectar con el servidor. Intenta de nuevo en un momento.'); };
const JS_BASE = ['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'];

/*
 * `archivos`: { 'home.json': objeto, ... } -> lo que "devuelve GitHub" por nombre de archivo (sin ?t=); lo que no esté rechaza como un 404.
 * `apiGetImpl(accion)`: comportamiento de apiGet (por defecto devuelve { origen: 'apps-script:<accion>' }); lanzar para simular Apps Script caído.
 */
function montar(extra, { archivos = {}, apiGetImpl } = {}){
  const window = loadBrowserScriptsWithDom(JS_BASE, '<div id="clanGuerraWrap"></div><div id="clanGuerraTitulo"></div>');
  const llamadasApiGet = [], llamadasEstatico = [];
  window.apiGetEstatico = async (url) => {
    llamadasEstatico.push(url);
    const nombre = url.split('/').pop().split('?')[0];
    if (!(nombre in archivos)) throw new Error('HTTP 404 (simulado)');
    return archivos[nombre];
  };
  window.apiGet = async (accion, params, opts) => {
    llamadasApiGet.push({ accion, opts });
    return apiGetImpl ? apiGetImpl(accion) : { origen: 'apps-script:' + accion };
  };
  window.eval(extra);
  const sembrarRespaldo = (accion, d, t) => window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet(accion, null), JSON.stringify({ t, d }));
  return { t: window.__t, window, llamadasApiGet, llamadasEstatico, sembrarRespaldo };
}
const montarIndex = (o) => montar(TRAMO_INDEX + '\nwindow.__t = { obtenerHome, obtenerGuerraTop };', o);
const montarClan = (o) => montar(
  'const NOMBRE_CLAN_QUERY = "Terna Uno";\n' + TRAMO_CLAN_COINCIDE + TRAMO_CLAN_FUENTES + TRAMO_CLAN_CARGAR_GUERRA + TRAMO_CLAN_RENDER_GUERRA +
  '\nwindow.__t = { clanObtenerInfo, clanObtenerRoster, clanObtenerGuerra, cargarGuerraClan, renderClanGuerra };', o);

const CLAN_INFO = (n) => ({ clanes: [{ nombre: n }] });
const HOME = (horasAtras) => ({ _publicadoEn: hace(horasAtras * HORA), clanInfo: CLAN_INFO('Terna Uno (archivo)'), rankings: { top: ['a'] } });

// ---------------------------------------------------------------- index.html: obtenerHome()

test('index: home.json vigente (1 h) se usa y NO se llama a Apps Script', async () => {
  const { t, llamadasApiGet } = montarIndex({ archivos: { 'home.json': HOME(1) } });
  const r = await t.obtenerHome('clanInfo', 'webClanInfo');
  assert.equal(r.estatico, true);
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (archivo)');
  assert.equal(llamadasApiGet.length, 0);
});

test('index: home.json vencido (5 h) con Apps Script sano -> gana Apps Script (el umbral de 3 h se mantiene)', async () => {
  const { t, llamadasApiGet } = montarIndex({ archivos: { 'home.json': HOME(5) } });
  const r = await t.obtenerHome('clanInfo', 'webClanInfo');
  assert.equal(r.estatico, false);
  assert.equal(r.desde, null);
  assert.equal(r.data.origen, 'apps-script:webClanInfo');
  assert.equal(llamadasApiGet.length, 1);
  assert.equal(llamadasApiGet[0].opts.ttlMs, 300000);
});

test('REGRESIÓN index: home.json vencido (5 h) + Apps Script caído + sin respaldo local -> se muestra el archivo con su fecha', async () => {
  const { t } = montarIndex({ archivos: { 'home.json': HOME(5) }, apiGetImpl: appsScriptCaido });
  const r = await t.obtenerHome('clanInfo', 'webClanInfo');
  assert.equal(r.estatico, true);
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (archivo)');
  assert.ok(Math.abs(Date.now() - r.desde.getTime() - 5 * HORA) < 5000, 'desde = fecha de publicación del archivo, no "ahora"');
});

test('index: home.json vencido + Apps Script caído + respaldo local MÁS NUEVO -> gana el respaldo (la página lee su fecha con apiGetUltimaActualizacion)', async () => {
  const { t, sembrarRespaldo, window } = montarIndex({ archivos: { 'home.json': HOME(5) }, apiGetImpl: appsScriptCaido });
  const tRespaldo = Date.now() - 10 * 60 * 1000;
  sembrarRespaldo('webClanInfo', CLAN_INFO('Terna Uno (respaldo)'), tRespaldo);
  const r = await t.obtenerHome('clanInfo', 'webClanInfo');
  assert.equal(r.estatico, false);
  assert.equal(r.desde, null);
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (respaldo)');
  assert.equal(window.apiGetUltimaActualizacion('webClanInfo', null).getTime(), tRespaldo);
});

test('index: home.json vencido + Apps Script caído + respaldo local de hace 3 días -> gana el archivo (más nuevo)', async () => {
  const { t, sembrarRespaldo } = montarIndex({ archivos: { 'home.json': HOME(5) }, apiGetImpl: appsScriptCaido });
  sembrarRespaldo('webClanInfo', CLAN_INFO('Terna Uno (respaldo)'), Date.now() - 72 * HORA);
  const r = await t.obtenerHome('clanInfo', 'webClanInfo');
  assert.equal(r.estatico, true);
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (archivo)');
});

test('index: el archivo vencido solo sirve para las claves que trae; una sección que no está en el archivo sigue fallando', async () => {
  const { t } = montarIndex({ archivos: { 'home.json': HOME(5) }, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerHome('aniversarios', 'webAniversarios'), /No pudimos conectar/);
  const ok = await t.obtenerHome('rankings', 'webRankings');
  assert.equal(ok.data.top[0], 'a');
});

test('index: una clave del archivo con `error` no se usa como último recurso', async () => {
  const home = { ...HOME(5), rankings: { error: 'falló al publicar' } };
  const { t } = montarIndex({ archivos: { 'home.json': home }, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerHome('rankings', 'webRankings'), /No pudimos conectar/);
});

test('index: home.json sin _publicadoEn (edad desconocida) + Apps Script caído -> no se usa, el error sube', async () => {
  const sinFecha = { clanInfo: CLAN_INFO('x') };
  const { t } = montarIndex({ archivos: { 'home.json': sinFecha }, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerHome('clanInfo', 'webClanInfo'), /No pudimos conectar/);
});

test('index: sin home.json (404) + Apps Script caído -> el error sube igual que antes; con Apps Script sano se usa Apps Script', async () => {
  const caido = montarIndex({ archivos: {}, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => caido.t.obtenerHome('clanInfo', 'webClanInfo'), /No pudimos conectar/);
  const sano = montarIndex({ archivos: {} });
  const r = await sano.t.obtenerHome('clanInfo', 'webClanInfo');
  assert.equal(r.data.origen, 'apps-script:webClanInfo');
});

test('index: las 4 secciones comparten UNA sola descarga de home.json', async () => {
  const { t, llamadasEstatico } = montarIndex({ archivos: { 'home.json': HOME(1) } });
  await Promise.all([t.obtenerHome('clanInfo', 'a'), t.obtenerHome('rankings', 'b'), t.obtenerHome('clanInfo', 'c'), t.obtenerHome('rankings', 'd')]);
  assert.equal(llamadasEstatico.length, 1);
  assert.match(llamadasEstatico[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/home\.json\?t=\d+$/);
});

// ---------------------------------------------------------------- index.html: obtenerGuerraTop()

const TOP = (horasAtras, origen) => ({ _publicadoEn: hace(horasAtras * HORA), valoresDiariosSelectores: { porDefecto: { temporada: 1, sectionIndex: 0 } }, origen });

test('index top: guerra_top.json vigente se usa sin llamar a Apps Script', async () => {
  const { t, llamadasApiGet } = montarIndex({ archivos: { 'guerra_top.json': TOP(1, 'archivo') } });
  assert.equal((await t.obtenerGuerraTop()).origen, 'archivo');
  assert.equal(llamadasApiGet.length, 0);
});

test('index top: guerra_top.json vencido + Apps Script sano -> gana Apps Script', async () => {
  const { t, llamadasApiGet } = montarIndex({ archivos: { 'guerra_top.json': TOP(5, 'archivo') } });
  assert.equal((await t.obtenerGuerraTop()).origen, 'apps-script:webGuerraEnVivo');
  assert.equal(llamadasApiGet[0].opts.ttlMs, 120000);
});

test('REGRESIÓN index top: guerra_top.json vencido + Apps Script caído -> se usa el archivo viejo', async () => {
  const { t } = montarIndex({ archivos: { 'guerra_top.json': TOP(5, 'archivo-viejo') }, apiGetImpl: appsScriptCaido });
  assert.equal((await t.obtenerGuerraTop()).origen, 'archivo-viejo');
});

test('index top: archivo vencido sin valoresDiariosSelectores + Apps Script caído -> el error sube (la sección se oculta, como antes)', async () => {
  const { t } = montarIndex({ archivos: { 'guerra_top.json': { _publicadoEn: hace(5 * HORA), otro: 1 } }, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.obtenerGuerraTop(), /No pudimos conectar/);
});

// ---------------------------------------------------------------- clan.html: fuentes

test('clan: info, roster y guerra vigentes (1 h) se usan y NO se llama a Apps Script', async () => {
  const archivos = {
    'home.json': { _publicadoEn: hace(HORA), clanInfo: CLAN_INFO('Terna Uno') },
    'roster.json': { _publicadoEn: hace(HORA), clanes: [{ nombre: 'Terna Uno', miembros: [] }] },
    'guerra.json': { _publicadoEn: hace(HORA), ctx: { temporada: 7 }, guerraPorClan: {} }
  };
  const { t, llamadasApiGet } = montarClan({ archivos });
  const [i, r, g] = await Promise.all([t.clanObtenerInfo(), t.clanObtenerRoster(), t.clanObtenerGuerra()]);
  assert.deepEqual([i.estatico, r.estatico, g.estatico], [true, true, true]);
  assert.deepEqual([i.viejo, r.viejo, g.viejo], [false, false, false]);
  assert.equal(llamadasApiGet.length, 0);
});

test('REGRESIÓN clan: archivos vencidos (5 h) + Apps Script caído -> las 3 fuentes usan el archivo viejo con viejo:true y su fecha', async () => {
  const archivos = {
    'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: CLAN_INFO('Terna Uno') },
    'roster.json': { _publicadoEn: hace(5 * HORA), clanes: [{ nombre: 'Terna Uno', miembros: [] }] },
    'guerra.json': { _publicadoEn: hace(5 * HORA), ctx: { temporada: 7 }, guerraPorClan: {} }
  };
  const { t } = montarClan({ archivos, apiGetImpl: appsScriptCaido });
  for (const r of await Promise.all([t.clanObtenerInfo(), t.clanObtenerRoster(), t.clanObtenerGuerra()])){
    assert.equal(r.viejo, true);
    assert.equal(r.estatico, true);
    assert.ok(Math.abs(Date.now() - r.desde.getTime() - 5 * HORA) < 5000);
  }
});

test('clan: archivos vencidos + Apps Script sano -> gana Apps Script (guerra conserva maxIntentos:2)', async () => {
  const archivos = {
    'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: CLAN_INFO('Terna Uno') },
    'guerra.json': { _publicadoEn: hace(5 * HORA), ctx: { temporada: 7 } }
  };
  const { t, llamadasApiGet } = montarClan({ archivos });
  const i = await t.clanObtenerInfo();
  const g = await t.clanObtenerGuerra();
  assert.equal(i.estatico, false); assert.equal(i.viejo, false); assert.equal(i.data.origen, 'apps-script:webClanInfo');
  assert.equal(g.estatico, false); assert.equal(g.viejo, false);
  const llamadaGuerra = llamadasApiGet.find(c => c.accion === 'webGuerraEnVivo');
  assert.equal(llamadaGuerra.opts.maxIntentos, 2);
  assert.equal(llamadaGuerra.opts.ttlMs, 120000);
});

test('clan: archivo vencido + Apps Script caído + respaldo local más nuevo -> gana el respaldo y NO se marca como viejo', async () => {
  const archivos = { 'roster.json': { _publicadoEn: hace(5 * HORA), clanes: [{ nombre: 'Terna Uno (archivo)', miembros: [] }] } };
  const { t, sembrarRespaldo } = montarClan({ archivos, apiGetImpl: appsScriptCaido });
  sembrarRespaldo('webRoster', { clanes: [{ nombre: 'Terna Uno (respaldo)', miembros: [] }] }, Date.now() - 60 * 1000);
  const r = await t.clanObtenerRoster();
  assert.equal(r.viejo, false);
  assert.equal(r.estatico, false);
  assert.equal(r.data.clanes[0].nombre, 'Terna Uno (respaldo)');
});

test('clan: un archivo vencido sin la forma esperada (clanes vacío, sin ctx) no se usa como último recurso', async () => {
  const archivos = {
    'home.json': { _publicadoEn: hace(5 * HORA), clanInfo: { clanes: [] } },
    'roster.json': { _publicadoEn: hace(5 * HORA), clanes: [] },
    'guerra.json': { _publicadoEn: hace(5 * HORA), otro: 1 }
  };
  const { t } = montarClan({ archivos, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.clanObtenerInfo(), /No pudimos conectar/);
  await assert.rejects(() => t.clanObtenerRoster(), /No pudimos conectar/);
  await assert.rejects(() => t.clanObtenerGuerra(), /No pudimos conectar/);
});

test('clan: sin archivos (404) + Apps Script caído -> el error sube igual que antes', async () => {
  const { t } = montarClan({ archivos: {}, apiGetImpl: appsScriptCaido });
  await assert.rejects(() => t.clanObtenerInfo(), /No pudimos conectar/);
});

// ---------------------------------------------------------------- clan.html: tarjeta de guerra

const GUERRA_CLAN = (horasAtras) => ({
  _publicadoEn: hace(horasAtras * HORA),
  ctx: { temporada: 7, sectionIndex: 1 },
  guerraPorClan: { 'Terna Uno': { ataques: 120, fame: 5000, barcos: 3, atacaron: 30, totalHoy: 50 } },
  pendientes: [{ clan: 'Terna Uno' }, { clan: 'Otro' }]
});

test('clan, tarjeta de guerra: con guerra.json vencido y Apps Script caído se ve el aviso «Datos guardados» con la edad', async () => {
  const { t, window } = montarClan({ archivos: { 'guerra.json': GUERRA_CLAN(5) }, apiGetImpl: appsScriptCaido });
  await t.cargarGuerraClan('Terna Uno');
  const wrap = window.document.getElementById('clanGuerraWrap');
  const aviso = wrap.querySelector('.js-guerra-aviso-viejo');
  assert.ok(aviso, 'debe haber aviso');
  assert.ok(aviso.textContent.includes('Datos guardados: el servidor no responde'));
  assert.ok(aviso.textContent.includes('hace 5 h'));
  assert.ok(wrap.textContent.includes('120'), 'igual se muestran los números del archivo');
});

test('clan, tarjeta de guerra: con guerra.json vigente NO hay aviso', async () => {
  const { t, window } = montarClan({ archivos: { 'guerra.json': GUERRA_CLAN(1) } });
  await t.cargarGuerraClan('Terna Uno');
  assert.equal(window.document.querySelector('.js-guerra-aviso-viejo'), null);
  assert.ok(window.document.getElementById('clanGuerraWrap').textContent.includes('120'));
});

test('clan, tarjeta de guerra: con Apps Script sano y archivo vencido NO hay aviso (son datos frescos)', async () => {
  const { t, window } = montarClan({ archivos: { 'guerra.json': GUERRA_CLAN(5) }, apiGetImpl: () => GUERRA_CLAN(0) });
  await t.cargarGuerraClan('Terna Uno');
  assert.equal(window.document.querySelector('.js-guerra-aviso-viejo'), null);
});

test('clan, tarjeta de guerra: el aviso también sale si el clan no tiene datos en el archivo viejo', () => {
  const { t, window } = montarClan({});
  t.renderClanGuerra({ ctx: { temporada: 7, sectionIndex: 1 }, guerraPorClan: {} }, 'Terna Uno', new Date(Date.now() - 2 * HORA));
  const wrap = window.document.getElementById('clanGuerraWrap');
  assert.ok(wrap.textContent.includes('Sin datos de guerra registrados'));
  assert.ok(wrap.querySelector('.js-guerra-aviso-viejo').textContent.includes('hace 2 h'));
});

test('clan, tarjeta de guerra: sin el tercer argumento (llamada de siempre) no hay aviso', () => {
  const { t, window } = montarClan({});
  t.renderClanGuerra(GUERRA_CLAN(1), 'Terna Uno');
  assert.equal(window.document.querySelector('.js-guerra-aviso-viejo'), null);
});
