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
function cargar({ estatico, apiGetImpl } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '');
  const llamadasApiGet = [], llamadasEstatico = [], renders = [], notas = [];
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
  assert.equal(llamadasApiGet[0].opts.staleIfError, true);
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
