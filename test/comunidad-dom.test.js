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

const BODY = '<div id="ascensosActualizadoTxt"></div><div id="ascensosWrap"></div>';

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
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], BODY);
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
  return { window, wrap: window.document.getElementById('ascensosWrap'), txt: window.document.getElementById('ascensosActualizadoTxt'), llamadasApiGet, llamadasEstatico };
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
  // CAMBIO (09-oct-2026, Fase 3): con un archivo vencido, apiGetConRespaldoEstatico() apaga staleIfError en la llamada interna para poder comparar
  // el respaldo local con el archivo (gana el más nuevo); el respaldo sigue usándose, lo decide el ayudante y no apiGet().
  assert.equal(llamadasApiGet[0].opts.staleIfError, false);
  assert.equal(wrap.querySelectorAll('.ascenso-row').length, 2);
});

test('comunidad.html — sin archivo utilizable: apiGet() conserva staleIfError:true (respaldo local como siempre)', async () => {
  const { llamadasApiGet } = await cargarPagina({ estatico: undefined });
  assert.equal(llamadasApiGet[0].opts.staleIfError, true);
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

// ---------------------------------------------------------------- Fase 3: último recurso + tres momentos (09-oct-2026)

const appsScriptCaido = () => { throw new Error('No pudimos conectar con el servidor.'); };

test('REGRESIÓN comunidad.html — home.json vencido (5 h) + Apps Script caído: pinta los ascensos del archivo viejo y avisa', async () => {
  const { wrap, txt } = await cargarPagina({ estatico: homeJson(hace(5 * HORA)), apiGetImpl: appsScriptCaido });
  assert.equal(wrap.querySelectorAll('.ascenso-row').length, 2);
  assert.match(txt.textContent, /JSON publicado: hace 5 h/);
  assert.match(txt.textContent, /Datos guardados: el servidor no responde/);
});

test('comunidad.html — archivo vencido sin la clave `ascensos` + Apps Script caído: el error sube (no hay nada que mostrar)', async () => {
  const { wrap } = await cargarPagina({ estatico: () => ({ _publicadoEn: hace(5 * HORA) }), apiGetImpl: appsScriptCaido });
  assert.ok(wrap.textContent.includes('No se pudo cargar los ascensos'));
});

test('comunidad.html — respaldo local más nuevo que el archivo vencido: gana el respaldo local', async () => {
  const MAS_NUEVO = { ascensos: [ASC_A] };
  const { wrap, txt, window } = await (async () => {
    // el respaldo se siembra antes de eval: se arma la página a mano para poder hacerlo
    const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], BODY);
    window.apiGet = async () => { throw new Error('caído'); };
    window.apiGetEstatico = async () => ({ _publicadoEn: hace(5 * HORA), ascensos: RESPUESTA });
    window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet('webAscensosRecientes', null), JSON.stringify({ t: Date.now() - 10 * 60 * 1000, d: MAS_NUEVO }));
    window.eval(SCRIPT_INLINE);
    await new Promise(r => setTimeout(r, 30));
    return { window, wrap: window.document.getElementById('ascensosWrap'), txt: window.document.getElementById('ascensosActualizadoTxt') };
  })();
  assert.equal(wrap.querySelectorAll('.ascenso-row').length, 1);
  assert.match(txt.textContent, /Respaldo guardado: hace 10 min/);
  assert.ok(window);
});

test('comunidad.html — archivo vigente: muestra consulta + JSON publicado + API Supercell si el dato la trae', async () => {
  const ts = Date.now() - 55 * 60 * 1000;
  const { txt } = await cargarPagina({ estatico: () => ({ _publicadoEn: hace(40 * 60 * 1000), tiempos: { api: { ultimaConsultaTs: ts } }, ascensos: RESPUESTA }) });
  assert.match(txt.textContent, /^Consulta: hace \d+ s · JSON publicado: hace 40 min · API Supercell: hace 55 min$/);
});

test('comunidad.html — sin fecha de Supercell en el JSON: no se muestra ni se inventa', async () => {
  const { txt } = await cargarPagina({ estatico: homeJson(hace(10 * 60 * 1000)) });
  assert.ok(!txt.textContent.includes('API Supercell'));
  assert.match(txt.textContent, /JSON publicado: hace 10 min/);
});

test('comunidad.html — Apps Script sano (archivo vencido): solo «Consulta», sin JSON publicado ni aviso', async () => {
  const { txt } = await cargarPagina({ estatico: homeJson(hace(5 * HORA)) });
  assert.match(txt.textContent, /^Consulta: hace \d+ s$/);
});
