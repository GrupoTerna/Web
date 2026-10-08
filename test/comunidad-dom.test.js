'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (08-oct-2026): comunidad.html pide los ascensos primero a home.json
// (rama `data`, clave `ascensos`, vía apiGetEstatico) y solo si ese archivo
// falta, falla, está vencido (>3 h) o no trae la clave, cae a
// apiGet('webAscensosRecientes'). Esta prueba carga el <script> inline REAL
// de comunidad.html en jsdom, con apiGet/apiGetEstatico falsos.
//
// LÍMITE: prueba el FRONTEND. No prueba el bot que publica home.json ni
// Apps Script (webAscensosRecientes), ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'comunidad.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'se esperaba exactamente un <script> inline en comunidad.html');
const SCRIPT_INLINE = scripts[0][1];

const BODY = '<div id="ascensosWrap"></div>';

const ASC_A = { nombre: 'Ana Activa', tag: '#AAA111', rangoAnterior: 'Miembro', rangoNuevo: 'Veterano', clan: 'Terna 1', fechaTxt: '20 sep' };
const ASC_B = { nombre: 'Sin Tag', tag: null, rangoAnterior: 'Veterano', rangoNuevo: 'Colíder', clan: 'Terna 2', fechaTxt: '' };
const RESPUESTA = { ascensos: [ASC_A, ASC_B] };

const hace = (ms) => new Date(Date.now() - ms).toISOString();
const HORA = 60 * 60 * 1000;

// `estatico`: undefined -> apiGetEstatico rechaza (GitHub no responde);
//             'ausente' -> apiGetEstatico no existe (ReferenceError);
//             función   -> se usa tal cual.
// `apiGetImpl`: reemplaza al apiGet falso (por defecto devuelve RESPUESTA).
async function cargarPagina({ estatico, apiGetImpl } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], BODY);
  const llamadasApiGet = [];
  const llamadasEstatico = [];
  window.apiGet = async (accion, params, opts) => {
    llamadasApiGet.push({ accion, opts });
    return apiGetImpl ? apiGetImpl(accion) : RESPUESTA;
  };
  if (estatico !== 'ausente'){
    window.apiGetEstatico = async (url) => {
      llamadasEstatico.push(url);
      if (!estatico) throw new Error('sin home.json (simulado)');
      return estatico(url);
    };
  }
  window.eval(SCRIPT_INLINE);
  await new Promise(r => setTimeout(r, 30)); // deja terminar cargarAscensos()
  return { window, wrap: window.document.getElementById('ascensosWrap'), llamadasApiGet, llamadasEstatico };
}

const homeJson = (publicadoEn, ascensos = RESPUESTA) => () => ({ _publicadoEn: publicadoEn, ascensos });
const hrefsDe = (el) => [...el.querySelectorAll('a')].map(a => a.getAttribute('href'));

test('comunidad.html — home.json vigente: pinta desde el archivo y NO llama a apiGet()', async () => {
  const { wrap, llamadasApiGet, llamadasEstatico } = await cargarPagina({ estatico: homeJson(hace(10 * 60 * 1000)) });
  assert.equal(llamadasApiGet.length, 0);
  assert.equal(llamadasEstatico.length, 1);
  assert.match(llamadasEstatico[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/home\.json\?t=\d+$/);
  assert.equal(wrap.querySelectorAll('.ascenso-row').length, 2);
  assert.ok(wrap.textContent.includes('Miembro → Veterano · Terna 1'));
});

test('comunidad.html — el ascenso con tag lleva link a perfil.html; el que no, texto plano', async () => {
  const { wrap } = await cargarPagina({ estatico: homeJson(hace(1000)) });
  assert.deepEqual(hrefsDe(wrap), ['perfil.html?tag=' + encodeURIComponent('#AAA111')]);
  assert.ok(wrap.textContent.includes('Sin Tag'));
  assert.ok(!hrefsDe(wrap).some(h => /tag=(null|undefined)?$/.test(h)));
});

test('comunidad.html — fecha vacía se pinta como "—"', async () => {
  const { wrap } = await cargarPagina({ estatico: homeJson(hace(1000)) });
  const fechas = [...wrap.querySelectorAll('.an-fecha')].map(e => e.textContent);
  assert.deepEqual(fechas, ['20 sep', '—']);
});

test('comunidad.html — home.json vencido (>3 h): cae a apiGet(webAscensosRecientes) con caché de 5 min', async () => {
  const { wrap, llamadasApiGet } = await cargarPagina({ estatico: homeJson(hace(4 * HORA)) });
  assert.equal(llamadasApiGet.length, 1);
  assert.equal(llamadasApiGet[0].accion, 'webAscensosRecientes');
  assert.equal(llamadasApiGet[0].opts.ttlMs, 300000);
  assert.equal(llamadasApiGet[0].opts.staleIfError, true);
  assert.equal(wrap.querySelectorAll('.ascenso-row').length, 2);
});

test('comunidad.html — home.json sin la clave `ascensos` o con error: cae a apiGet()', async () => {
  for (const est of [
    () => ({ _publicadoEn: hace(1000) }),
    () => ({ _publicadoEn: hace(1000), ascensos: { error: 'x' } }),
    () => ({ _publicadoEn: hace(1000), ascensos: { ascensos: 'no-es-lista' } }),
    () => ({ ascensos: RESPUESTA }) // sin _publicadoEn
  ]){
    const { llamadasApiGet } = await cargarPagina({ estatico: est });
    assert.equal(llamadasApiGet.length, 1);
  }
});

test('comunidad.html — si apiGetEstatico rechaza o no existe: cae a apiGet() sin romper', async () => {
  for (const estatico of [undefined, 'ausente']){
    const { wrap, llamadasApiGet } = await cargarPagina({ estatico });
    assert.equal(llamadasApiGet.length, 1);
    assert.equal(wrap.querySelectorAll('.ascenso-row').length, 2);
  }
});

test('comunidad.html — lista vacía: mensaje "Todavía no hay ascensos registrados."', async () => {
  const { wrap } = await cargarPagina({ estatico: homeJson(hace(1000), { ascensos: [] }) });
  assert.ok(wrap.textContent.includes('Todavía no hay ascensos registrados.'));
  assert.equal(wrap.querySelectorAll('.ascenso-row').length, 0);
});

test('comunidad.html — escapa nombre y rangos antes de meterlos en el HTML', async () => {
  const malo = { nombre: '<img src=x onerror=alert(1)>', tag: null, rangoAnterior: '<b>a</b>', rangoNuevo: '"b"', clan: '<i>c</i>', fechaTxt: '<u>f</u>' };
  const { wrap } = await cargarPagina({ estatico: homeJson(hace(1000), { ascensos: [malo] }) });
  assert.equal(wrap.querySelector('img'), null);
  assert.equal(wrap.querySelector('b'), null);
  assert.equal(wrap.querySelector('i'), null);
  assert.equal(wrap.querySelector('u'), null);
  assert.ok(wrap.textContent.includes('<img src=x onerror=alert(1)>'));
});

test('comunidad.html — si el respaldo también falla: muestra "No se pudo cargar los ascensos: <mensaje>" (escapado)', async () => {
  const { wrap } = await cargarPagina({ apiGetImpl: () => { throw new Error('sin red <x>'); } });
  assert.ok(wrap.textContent.includes('No se pudo cargar los ascensos: sin red <x>'));
  assert.equal(wrap.querySelector('x'), null);
});
