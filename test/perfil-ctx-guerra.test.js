'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (08-oct-2026): perfil.html solo necesita `ctx` de webGuerraEnVivo
// (~920 KB), así que lo lee de guerra_ctx.json (~1 KB, rama `data`) vía
// apiGetEstatico y solo cae a apiGet('webGuerraEnVivo') si el archivo falta,
// falla, está vencido (>3 h) o no trae `ctx`.
//
// perfil.html tiene ~5.800 líneas de script que dibujan toda la ficha, así
// que NO se carga entero: se extrae el tramo exacto de obtenerCtxGuerra() y
// cargarCtxGuerraPerfil() del <script> inline REAL y se ejecuta aislado. Si
// alguien reorganiza ese tramo, los marcadores de abajo fallan a propósito.
//
// LÍMITE: prueba el FRONTEND. No prueba el bot que publica guerra_ctx.json
// ni Apps Script, ni el dibujo de la ficha (renderExtendido se simula).
//
// CAMBIO (09-oct-2026, Fase 4): obtenerCtxGuerra() ahora usa apiGetEstaticoConEdad()
// y apiGetConRespaldoEstatico() (api.js), así que el cargador trae config.js,
// util.js y api.js REALES (solo se simulan apiGet(), apiGetEstatico() y el
// localStorage de jsdom). Las pruebas nuevas están al final del archivo.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('const CTX_GUERRA_ESTATICO_URL'));
assert.ok(grande, 'no se encontró el tramo de guerra_ctx.json en un <script> inline de perfil.html');

const INICIO = grande.indexOf('const CTX_GUERRA_ESTATICO_URL');
const FIN = grande.indexOf('function _guerraDiasDesdeHistorial');
assert.ok(INICIO >= 0 && FIN > INICIO, 'marcadores del tramo de ctx de guerra no encontrados (¿se reorganizó perfil.html?)');
const TRAMO = grande.slice(INICIO, FIN);
assert.ok(TRAMO.includes('async function obtenerCtxGuerra') && TRAMO.includes('function cargarCtxGuerraPerfil'));

const PRELUDIO = 'let _ctxGuerraPerfil = null, _ctxGuerraPerfilPedido = false, _jPerfilActual = null;\n';
const EPILOGO = '\nwindow.__t = { obtenerCtxGuerra, cargarCtxGuerraPerfil, ctx: () => _ctxGuerraPerfil, setJ: (j) => { _jPerfilActual = j; } };';

const CTX = { periodIndex: 17, esDiaGuerra: true };
const RESPUESTA_APS = { ctx: { periodIndex: 99 }, otro: 'dato' };
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const HORA = 60 * 60 * 1000;

// `estatico`: undefined -> apiGetEstatico rechaza; 'ausente' -> no existe; función -> se usa tal cual.
function cargar({ estatico, apiGetImpl, respaldo } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], '');
  const llamadasApiGet = [], llamadasEstatico = [], renders = [], notas = [];
  // `respaldo`: { t, d } -> respaldo local de webGuerraEnVivo (lo que guarda apiGet() al responder bien).
  if (respaldo) window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet('webGuerraEnVivo', null), JSON.stringify(respaldo));
  window.apiGet = async (accion, params, opts) => {
    llamadasApiGet.push({ accion, opts });
    return apiGetImpl ? apiGetImpl() : RESPUESTA_APS;
  };
  if (estatico !== 'ausente'){
    window.apiGetEstatico = async (url) => {
      llamadasEstatico.push(url);
      if (!estatico) throw new Error('sin guerra_ctx.json (simulado)');
      return estatico(url);
    };
  } else {
    window.apiGetEstatico = undefined; // simula que la función no existe
  }
  window.renderExtendido = (ext, j) => renders.push({ ext, j });
  window.actualizarNotasGuerraCongelada = (ext) => notas.push(ext);
  window.eval(PRELUDIO + TRAMO + EPILOGO);
  return { t: window.__t, llamadasApiGet, llamadasEstatico, renders, notas };
}
const espera = () => new Promise(r => setTimeout(r, 20));
const archivo = (publicadoEn, extra) => () => Object.assign({ _publicadoEn: publicadoEn, ctx: CTX }, extra);

test('perfil.html ctx de guerra — guerra_ctx.json vigente: se usa y NO se llama a apiGet()', async () => {
  const { t, llamadasApiGet, llamadasEstatico } = cargar({ estatico: archivo(hace(10 * 60 * 1000)) });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d.ctx, CTX);
  assert.equal(llamadasApiGet.length, 0);
  assert.equal(llamadasEstatico.length, 1);
  assert.match(llamadasEstatico[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/guerra_ctx\.json\?t=\d+$/);
});

test('perfil.html ctx de guerra — archivo vencido (>3 h): cae a apiGet(webGuerraEnVivo) con caché de 2 min', async () => {
  const { t, llamadasApiGet } = cargar({ estatico: archivo(hace(4 * HORA)) });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d, RESPUESTA_APS);
  assert.equal(llamadasApiGet.length, 1);
  assert.equal(llamadasApiGet[0].accion, 'webGuerraEnVivo');
  assert.equal(llamadasApiGet[0].opts.ttlMs, 120000);
  // CAMBIO (09-oct-2026, Fase 4): con un archivo vencido, apiGetConRespaldoEstatico() apaga staleIfError en la llamada interna para poder comparar
  // el respaldo local con el archivo (gana el más nuevo); el respaldo sigue usándose, lo decide el ayudante y no apiGet().
  assert.equal(llamadasApiGet[0].opts.staleIfError, false);
});

test('perfil.html ctx de guerra — sin archivo utilizable: apiGet() conserva staleIfError:true (respaldo local como siempre)', async () => {
  const { t, llamadasApiGet } = cargar({ estatico: undefined });
  await t.obtenerCtxGuerra();
  assert.equal(llamadasApiGet[0].opts.staleIfError, true);
  assert.equal(llamadasApiGet[0].opts.ttlMs, 120000);
});

test('perfil.html ctx de guerra — sin `ctx`, sin _publicadoEn o fecha inválida: cae a apiGet()', async () => {
  for (const est of [
    () => ({ _publicadoEn: hace(1000) }),
    () => ({ ctx: CTX }),
    () => ({ _publicadoEn: 'no-es-fecha', ctx: CTX }),
    () => null
  ]){
    const { t, llamadasApiGet } = cargar({ estatico: est });
    await t.obtenerCtxGuerra();
    assert.equal(llamadasApiGet.length, 1);
  }
});

test('perfil.html ctx de guerra — apiGetEstatico rechaza o no existe: cae a apiGet() sin romper', async () => {
  for (const estatico of [undefined, 'ausente']){
    const { t, llamadasApiGet } = cargar({ estatico });
    const d = await t.obtenerCtxGuerra();
    assert.deepEqual(d, RESPUESTA_APS);
    assert.equal(llamadasApiGet.length, 1);
  }
});

test('cargarCtxGuerraPerfil() — guarda el ctx y vuelve a pintar la ficha si ya hay un jugador cargado', async () => {
  const { t, renders, notas } = cargar({ estatico: archivo(hace(1000)) });
  const j = { extendido: { x: 1 } };
  t.setJ(j);
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.deepEqual(t.ctx(), CTX);
  assert.equal(renders.length, 1);
  assert.equal(renders[0].ext, j.extendido);
  assert.equal(renders[0].j, j);
  assert.equal(notas.length, 1);
});

test('cargarCtxGuerraPerfil() — sin jugador cargado guarda el ctx pero no pinta nada', async () => {
  const { t, renders, notas } = cargar({ estatico: archivo(hace(1000)) });
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.deepEqual(t.ctx(), CTX);
  assert.equal(renders.length, 0);
  assert.equal(notas.length, 0);
});

test('cargarCtxGuerraPerfil() — pide el ctx una sola vez aunque se llame varias', async () => {
  const { t, llamadasEstatico } = cargar({ estatico: archivo(hace(1000)) });
  t.cargarCtxGuerraPerfil();
  t.cargarCtxGuerraPerfil();
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.equal(llamadasEstatico.length, 1);
});

test('cargarCtxGuerraPerfil() — si todo falla (archivo y apiGet): no revienta ni pinta', async () => {
  const { t, renders } = cargar({ apiGetImpl: () => { throw new Error('sin red'); } });
  t.setJ({ extendido: {} });
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.equal(t.ctx(), null);
  assert.equal(renders.length, 0);
});

test('cargarCtxGuerraPerfil() — respuesta sin `ctx`: no cambia nada', async () => {
  const { t, renders } = cargar({ estatico: undefined, apiGetImpl: () => ({ otro: 1 }) });
  t.setJ({ extendido: {} });
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.equal(t.ctx(), null);
  assert.equal(renders.length, 0);
});

// ---------------------------------------------------------------- Fase 4: último recurso (09-oct-2026)

const appsScriptCaido = () => { throw new Error('No pudimos conectar con el servidor.'); };

test('REGRESIÓN perfil.html ctx de guerra — guerra_ctx.json vencido (5 h) + Apps Script caído: se usa el archivo viejo', async () => {
  const { t, llamadasApiGet } = cargar({ estatico: archivo(hace(5 * HORA)), apiGetImpl: appsScriptCaido });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d.ctx, CTX);
  assert.equal(llamadasApiGet.length, 1, 'primero intenta Apps Script');
});

test('REGRESIÓN cargarCtxGuerraPerfil() — archivo vencido + Apps Script caído: guarda el ctx viejo y vuelve a pintar la ficha', async () => {
  const { t, renders, notas } = cargar({ estatico: archivo(hace(5 * HORA)), apiGetImpl: appsScriptCaido });
  const j = { extendido: { x: 1 } };
  t.setJ(j);
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.deepEqual(t.ctx(), CTX);
  assert.equal(renders.length, 1);
  assert.equal(notas.length, 1);
});

test('perfil.html ctx de guerra — archivo vencido SIN `ctx` (o sin _publicadoEn) + Apps Script caído: no hay nada que usar, el error sube', async () => {
  for (const est of [() => ({ _publicadoEn: hace(5 * HORA) }), () => ({ ctx: CTX })]){
    const { t } = cargar({ estatico: est, apiGetImpl: appsScriptCaido });
    await assert.rejects(() => t.obtenerCtxGuerra(), /No pudimos conectar/);
  }
});

test('perfil.html ctx de guerra — respaldo local más nuevo que el archivo vencido: gana el respaldo local', async () => {
  const RESP = { ctx: { periodIndex: 50, esDiaGuerra: false }, otro: 'del respaldo' };
  const { t } = cargar({ estatico: archivo(hace(5 * HORA)), apiGetImpl: appsScriptCaido, respaldo: { t: Date.now() - 10 * 60 * 1000, d: RESP } });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(JSON.parse(JSON.stringify(d)), RESP); // el respaldo lo crea el JSON.parse de jsdom (otro realm): se compara por contenido
});

test('perfil.html ctx de guerra — respaldo local más viejo que el archivo vencido: gana el archivo', async () => {
  const RESP = { ctx: { periodIndex: 50 }, otro: 'del respaldo' };
  const { t } = cargar({ estatico: archivo(hace(5 * HORA)), apiGetImpl: appsScriptCaido, respaldo: { t: Date.now() - 9 * HORA, d: RESP } });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d.ctx, CTX);
});

test('perfil.html ctx de guerra — archivo vencido + Apps Script sano: manda Apps Script (el archivo viejo no se usa)', async () => {
  const { t } = cargar({ estatico: archivo(hace(5 * HORA)) });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d, RESPUESTA_APS);
});

test('perfil.html ctx de guerra — archivo vigente + Apps Script caído: ni siquiera se pide a Apps Script', async () => {
  const { t, llamadasApiGet } = cargar({ estatico: archivo(hace(1000)), apiGetImpl: appsScriptCaido });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d.ctx, CTX);
  assert.equal(llamadasApiGet.length, 0);
});

// ---------------------------------------------------------------- Límite de edad del ctx: 24 h (09-oct-2026, decisión del usuario)
//
// El día de guerra (periodIndex) cambia a diario, así que un ctx de más de CTX_GUERRA_EDAD_MAX_MS (24 h) se ignora
// aunque venga del archivo viejo o del respaldo local: obtenerCtxGuerra() devuelve null y la ficha sigue como sin ctx.
// El límite se mide con la fecha del dato: `desde` de apiGetConRespaldoEstatico() (archivo viejo o respaldo local) y, cuando
// apiGet() responde "sano" pero pudo haber devuelto su respaldo sin avisar (origen 'apps-script'), con la hora real del
// último guardado (horaConsultaApiGet() de util.js). Con el archivo vigente (<3 h) o con Apps Script respondiendo de verdad no se mide nada.

test('límite 24 h — archivo viejo de 30 h + Apps Script caído: el ctx se ignora (null)', async () => {
  const { t } = cargar({ estatico: archivo(hace(30 * HORA)), apiGetImpl: appsScriptCaido });
  assert.equal(await t.obtenerCtxGuerra(), null);
});

test('límite 24 h — archivo viejo de 23 h + Apps Script caído: todavía se usa', async () => {
  const { t } = cargar({ estatico: archivo(hace(23 * HORA)), apiGetImpl: appsScriptCaido });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(d.ctx, CTX);
});

test('límite 24 h — el corte es 24 h: 1 min antes se usa, 1 min después se ignora', async () => {
  const dentro = cargar({ estatico: archivo(hace(24 * HORA - 60 * 1000)), apiGetImpl: appsScriptCaido });
  assert.deepEqual((await dentro.t.obtenerCtxGuerra()).ctx, CTX);
  const fuera = cargar({ estatico: archivo(hace(24 * HORA + 60 * 1000)), apiGetImpl: appsScriptCaido });
  assert.equal(await fuera.t.obtenerCtxGuerra(), null);
});

test('límite 24 h — respaldo local de 30 h (más nuevo que el archivo de 40 h) + Apps Script caído: se ignora', async () => {
  const RESP = { ctx: { periodIndex: 50 }, otro: 'del respaldo' };
  const { t } = cargar({ estatico: archivo(hace(40 * HORA)), apiGetImpl: appsScriptCaido, respaldo: { t: Date.now() - 30 * HORA, d: RESP } });
  assert.equal(await t.obtenerCtxGuerra(), null);
});

test('límite 24 h — respaldo local de 20 h + Apps Script caído: todavía se usa', async () => {
  const RESP = { ctx: { periodIndex: 50 }, otro: 'del respaldo' };
  const { t } = cargar({ estatico: archivo(hace(40 * HORA)), apiGetImpl: appsScriptCaido, respaldo: { t: Date.now() - 20 * HORA, d: RESP } });
  const d = await t.obtenerCtxGuerra();
  assert.deepEqual(JSON.parse(JSON.stringify(d)), RESP);
});

test('límite 24 h — SIN archivo, apiGet() devuelve en silencio su respaldo de 30 h (origen apps-script): se ignora', async () => {
  // El caso silencioso: apiGet(..., staleIfError:true) no avisa que usó el respaldo. Se detecta con la hora real del último guardado.
  const RESP = { ctx: { periodIndex: 50 } };
  const { t } = cargar({ estatico: undefined, apiGetImpl: () => RESP, respaldo: { t: Date.now() - 30 * HORA, d: RESP } });
  assert.equal(await t.obtenerCtxGuerra(), null);
});

test('límite 24 h — SIN archivo, Apps Script sano (último guardado de hace 1 h o sin respaldo): se usa', async () => {
  const reciente = cargar({ estatico: undefined, respaldo: { t: Date.now() - HORA, d: RESPUESTA_APS } });
  assert.deepEqual(await reciente.t.obtenerCtxGuerra(), RESPUESTA_APS);
  const sinRespaldo = cargar({ estatico: undefined });
  assert.deepEqual(await sinRespaldo.t.obtenerCtxGuerra(), RESPUESTA_APS);
});

test('límite 24 h — archivo vigente (<3 h): no se mide nada y se usa', async () => {
  const { t } = cargar({ estatico: archivo(hace(2 * HORA)), apiGetImpl: appsScriptCaido, respaldo: { t: Date.now() - 90 * HORA, d: RESPUESTA_APS } });
  assert.deepEqual((await t.obtenerCtxGuerra()).ctx, CTX);
});

test('límite 24 h — cargarCtxGuerraPerfil() con un ctx ignorado: no guarda el ctx, no vuelve a pintar y no revienta', async () => {
  const { t, renders, notas } = cargar({ estatico: archivo(hace(30 * HORA)), apiGetImpl: appsScriptCaido });
  t.setJ({ extendido: { x: 1 } });
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.equal(t.ctx(), null);
  assert.equal(renders.length, 0);
  assert.equal(notas.length, 0);
});

test('límite 24 h — cargarCtxGuerraPerfil() con un ctx de 23 h: se guarda y se vuelve a pintar', async () => {
  const { t, renders, notas } = cargar({ estatico: archivo(hace(23 * HORA)), apiGetImpl: appsScriptCaido });
  t.setJ({ extendido: { x: 1 } });
  t.cargarCtxGuerraPerfil();
  await espera();
  assert.deepEqual(t.ctx(), CTX);
  assert.equal(renders.length, 1);
  assert.equal(notas.length, 1);
});
