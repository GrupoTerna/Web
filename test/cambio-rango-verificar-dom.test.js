'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (28-oct-2026, PF286 punto 11 (c)): rama «verificar» de Cambio de rango en admin.html. Compara las propuestas de la corrida más reciente
// de Historial_A/D con lo realmente aplicado (webCRListaVerificar) y dice si falta aplicar algo o si algo se aplicó sin estar propuesto.
// [→ Contexto_Base_Web.md §PF286]
//
// NO se carga admin.html entero: se extraen del <script> inline REAL los tramos entre marcadores. LÍMITE: DOM y funciones auxiliares simulados;
// la respuesta del backend es un dato de prueba, así que no prueba Apps Script ni el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const FILTROS = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'ui', 'filters.js'), 'utf8'); // pintarBuscadorTabla(), coincideBusqueda(), textoCuentaBuscador()

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo("document.getElementById('btnCrPaso1').addEventListener('click'", "document.getElementById('crVolverPaso1')", 'el listener de btnCrPaso1'),
  tramo("document.getElementById('crVolverPaso1').addEventListener('click'", '/**\n * Rama «verificar» de Cambio de rango', 'el listener de crVolverPaso1'),
  tramo('function _cambioVerificacionCR(x){', '/**\n * seleccionarCorridaParaVerPropuestas(idAscenso)', 'las funciones de verificación')
].join('\n');

const CUERPO = `<!doctype html><html><body>
  <div id="crPaso1">
    <select id="crAccion">
      <option value="">Elige…</option><option value="registrar">r</option><option value="modificar">m</option>
      <option value="ver">v</option><option value="verificar">verificar</option>
    </select>
    <button id="btnCrPaso1">Continuar</button>
  </div>
  <div id="crPaso2" style="display:none">
    <a id="crVolverPaso1" href="#">c</a>
    <div id="crSelectorParBox" style="display:none"><select id="crSelectPar"><option value="">Elige…</option></select></div>
    <div id="crPaso2Msg"></div>
    <div id="crVerificarBox" style="display:none">
      <select id="crVerificarPar"><option value="">La más reciente con propuestas</option></select>
      <button id="btnCrVerificar">Volver a verificar</button>
      <div id="crVerificarMsg"></div><div id="crVerificarResultado"></div>
    </div>
    <div id="crPaso3" style="display:none"><div id="crPrecargarUltimoBox" style="display:none"></div></div>
    <div id="crPropuestasBloque"></div>
  </div>
</body></html>`;

const ITEM = (o) => Object.assign({ tag: '#A', nombre: 'Ana', clan: 'Terna', tipo: 'Ascenso', rango: 'Miembro', rango2: 'Veterano', fechaTxt: '27/10/2026' }, o);
const BASE = { ok: true, hayCorrida: true, diaTxt: '27/10/2026', temporada: 5, semana: 2, dia: 3, propuestasN: 3, aplicadas: [], pendientes: [], excepcionales: [] };

function montar(respuesta){
  const dom = new JSDOM(CUERPO, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.__pedidos = [];
  window.__respuesta = respuesta;
  window.__fallar = (typeof respuesta === 'string') ? respuesta : '';
  window.eval(`
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function enfocarPrimerControl(){}
    function actualizarTextoPropuestasSinGuardar(){}
    function actualizarVisibilidadPropuestasCR(){}
    function cargarCRListaPares(){}
    async function limpiarFormularioCR(){}
    function manejarRespuestaAuth(){ return false; }
    function etiquetaParCR(p){ return 'Corrida ' + p.idAscenso; }
    function activarBarraScrollTabla(){}
    async function conBotonOcupado(btn, fn){ await fn(); }
    const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const SESSION_KEY = 'terna_admin_token';
    async function apiPost(accion, cuerpo){ const params = Object.assign({}, cuerpo); delete params.sessionToken; window.__pedidos.push({ accion, params }); if(window.__fallar) throw new Error(window.__fallar); return window.__respuesta; }
    let crIdExistenteActual = '';
    let crIdDescensoActual = '';
    ${FILTROS}
    ${CODIGO}
  `);
  return window;
}

const $ = (w, id) => w.document.getElementById(id);
const visible = (w, id) => $(w, id).style.display !== 'none';
const esperar = () => new Promise(r => setTimeout(r, 0));
async function verificar(w){
  $(w, 'crAccion').value = 'verificar';
  $(w, 'btnCrPaso1').click();
  await esperar();
}

test('PF286 11 (c): elegir «Verificar» muestra el bloque de verificación, oculta las propuestas y pide webCRListaVerificar', async () => {
  const w = montar(BASE);
  await verificar(w);
  assert.equal(visible(w, 'crPaso2'), true);
  assert.equal(visible(w, 'crVerificarBox'), true);
  assert.equal(visible(w, 'crPropuestasBloque'), false);
  assert.equal(visible(w, 'crSelectorParBox'), false, 'no hay selector de corrida');
  assert.equal(visible(w, 'crPaso3'), false, 'no hay formulario');
  // Los objetos de jsdom son de otro «realm»: se comparan como JSON.
  assert.equal(JSON.stringify(w.__pedidos), JSON.stringify([{ accion: 'webCRListaVerificarYMarcar', params: {} }]));
});

test('PF286 11 (c): lo pendiente y lo aplicado sin propuesta se listan con su nota y su motivo', async () => {
  const w = montar(Object.assign({}, BASE, {
    aplicadas: [ITEM({ tag: '#1', nombre: 'Ok' })],
    pendientes: [ITEM({ tag: '#2', nombre: 'Falta' }), ITEM({ tag: '#3', nombre: 'Manual', tipo: 'Expulsión', rango: 'Miembro', rango2: '', confirmaManual: true }),
      ITEM({ tag: '#5', nombre: 'Admin', tipo: 'Elegible Admin', rango: '', rango2: '', confirmaManual: true }), ITEM({ tag: '#6', nombre: 'Clan', tipo: 'Ascenso de clan', rango: '', rango2: '', confirmaManual: true })],
    excepcionales: [ITEM({ tag: '#4', nombre: 'Rara', fechaTxt: '28/10/2026', motivo: 'No tenía propuesta en la corrida.' })]
  }));
  await verificar(w);
  const texto = $(w, 'crVerificarResultado').textContent;
  assert.match(texto, /27\/10\/2026 \(temporada 5, semana 2, día 3\)/);
  assert.match(texto, /Falta aplicar 4 propuesta\(s\)/);
  assert.match(texto, /1 cambio\(s\) se aplicaron sin estar propuestos/);
  assert.match(texto, /Falta aplicar \(4\)/);
  assert.match(texto, /Aplicados de forma excepcional \(1\)/);
  assert.match(texto, /Aplicados conforme a la propuesta \(1\)/);
  assert.match(texto, /Ascenso de Miembro a Veterano/);
  assert.match(texto, /Se marca «Realizado» sola/, 'la propuesta con rangos se resuelve sola');
  assert.match(texto, /Se marca «Realizado» sola cuando la cuenta figure como inactiva\./, 'la Expulsión se marca sola cuando la cuenta pasa a Inactivos');
  assert.match(texto, /Se marca «Realizado» sola cuando la cuenta ya sea admin\./, 'Elegible Admin se marca sola cuando la cuenta ya es admin');
  assert.match(texto, /Se marca «Realizado» sola cuando la cuenta figure activa en el clan de destino\./, 'Ascenso de clan se marca sola cuando la cuenta está en el clan de destino');
  assert.doesNotMatch(texto, /márcala «Realizado» a mano|No se marca sola/, 'ya no se pide marcar nada a mano');
  assert.match(texto, /No tenía propuesta en la corrida\./);
  assert.equal($(w, 'crVerificarResultado').querySelector('.msg-ok'), null);
});

test('PF286: el cambio sin propuesta muestra el requisito de Ascenso que no cumplió, o por qué no se pudo evaluar', async () => {
  const w = montar(Object.assign({}, BASE, {
    excepcionales: [
      ITEM({ tag: '#4', nombre: 'Rara', motivo: 'No tenía propuesta en la corrida.', incumple: ['Medallas 850 (se pide 1000)', 'Ataques 12 (se pide 16)'], evaluadoContra: 'Ascenso A_05_S_01_N_01, Miembro de Terna' }),
      ITEM({ tag: '#5', nombre: 'Otra', motivo: 'No tenía propuesta en la corrida.', requisitoNota: 'No se pudo evaluar: las semanas del par todavía no terminan.' }),
      ITEM({ tag: '#6', nombre: '<i>x</i>', motivo: 'm', incumple: ['<b>Medallas</b>'] })
    ]
  }));
  await verificar(w);
  const res = $(w, 'crVerificarResultado');
  assert.match(res.textContent, /No cumplía: Medallas 850 \(se pide 1000\); Ataques 12 \(se pide 16\)\./);
  assert.match(res.textContent, /Ascenso A_05_S_01_N_01, Miembro de Terna/);
  assert.match(res.textContent, /No se pudo evaluar: las semanas del par todavía no terminan\./);
  assert.equal(res.querySelector('b'), null, 'el texto del backend se escapa');
  const w2 = montar(Object.assign({}, BASE, { excepcionales: [ITEM({ tag: '#9', tipo: 'Expulsión', rango: 'Miembro', rango2: '', motivo: 'm', incumple: ['Medallas 100 (se pide 500)'], evaluadoContra: 'Descenso D_05_S_01_N_01, Miembro de Terna', requisitoNota: 'Alcanzaba Min_G (50): correspondía Descenso, no Expulsión.' })] }));
  await verificar(w2);
  assert.match($(w2, 'crVerificarResultado').textContent, /No cumplía: Medallas 100 \(se pide 500\)\..*Descenso D_05_S_01_N_01.*Alcanzaba Min_G \(50\)/, 'se muestran juntos los requisitos y la nota');
});

test('PF286: lo que se marcó «Realizado» al verificar se lista con su motivo, y la nota del backend sustituye a la genérica', async () => {
  const w = montar(Object.assign({}, BASE, {
    marcadas: [ITEM({ tag: '#7', nombre: 'Marcada', motivo: 'su rango actual es Veterano (propuesto: Veterano)' })],
    pendientes: [ITEM({ tag: '#8', nombre: 'Revisar', nota: 'La cuenta se movió del clan Terna al clan Mini: revisa a mano si el cambio se aplicó.' })]
  }));
  await verificar(w);
  const texto = $(w, 'crVerificarResultado').textContent;
  assert.match(texto, /Se marcaron «Realizado» 1 propuesta\(s\) al verificar\./);
  assert.match(texto, /Marcadas «Realizado» ahora \(1\)/);
  assert.match(texto, /su rango actual es Veterano/);
  assert.match(texto, /La cuenta se movió del clan Terna al clan Mini: revisa a mano si el cambio se aplicó\./);
  assert.doesNotMatch(texto, /Se marca «Realizado» sola cuando/);
});

test('PF286 11 (c): si todo coincide lo dice y no muestra tablas de problemas', async () => {
  const w = montar(Object.assign({}, BASE, { aplicadas: [ITEM()], propuestasN: 1 }));
  await verificar(w);
  const res = $(w, 'crVerificarResultado');
  assert.ok(res.querySelector('.msg-ok'), 'aviso de que todo coincide');
  assert.equal(res.querySelector('.msg-error'), null);
  assert.doesNotMatch(res.textContent, /Falta aplicar \(/);
  assert.doesNotMatch(res.textContent, /excepcional/);
});

test('PF286 11 (c): sin ninguna propuesta registrada avisa que no hay nada que verificar', async () => {
  const w = montar({ ok: true, hayCorrida: false, diaTxt: '', temporada: '', semana: '', dia: '', propuestasN: 0, aplicadas: [], pendientes: [], excepcionales: [] });
  await verificar(w);
  assert.match($(w, 'crVerificarResultado').textContent, /no hay nada que verificar/);
});

test('PF286 11 (c): los textos de la hoja se escapan y los errores del backend y de conexión se muestran', async () => {
  const w = montar(Object.assign({}, BASE, { excepcionales: [ITEM({ nombre: '<img src=x>', motivo: '<b>m</b>' })] }));
  await verificar(w);
  assert.equal($(w, 'crVerificarResultado').querySelector('img'), null);
  assert.equal($(w, 'crVerificarResultado').querySelector('b'), null);

  const w2 = montar({ ok: false, error: 'Sesión inválida' });
  await verificar(w2);
  assert.match($(w2, 'crVerificarMsg').textContent, /Sesión inválida/);

  const w3 = montar('sin red');
  await verificar(w3);
  assert.match($(w3, 'crVerificarMsg').textContent, /Error de conexión: sin red/);
});

test('PF286 11 (c): «Volver a verificar» repite el pedido y volver o elegir otra acción restituye las propuestas', async () => {
  const w = montar(BASE);
  await verificar(w);
  $(w, 'btnCrVerificar').click();
  await esperar();
  assert.equal(w.__pedidos.length, 2);

  $(w, 'crVolverPaso1').click();
  assert.equal(visible(w, 'crVerificarBox'), false);
  assert.equal(visible(w, 'crPropuestasBloque'), true);
  assert.equal(visible(w, 'crPaso1'), true);

  $(w, 'crAccion').value = 'ver';
  $(w, 'btnCrPaso1').click();
  await esperar();
  assert.equal(visible(w, 'crVerificarBox'), false);
  assert.equal(visible(w, 'crPropuestasBloque'), true);
  assert.equal(visible(w, 'crSelectorParBox'), true, '«Ver propuestas» sigue usando el selector de corrida');
  assert.equal(w.__pedidos.length, 2, 'las otras ramas no piden la verificación');
});

test('PF286: el selector de corrida se llena con los pares de la respuesta y elegir uno pide esa corrida', async () => {
  const pares = [{ idAscenso: 'A_05_S_02_N_01', fechaTxt: '27/10/2026' }, { idAscenso: 'A_05_S_01_N_01', fechaTxt: '20/09/2026' }];
  const w = montar(Object.assign({}, BASE, { parId: 'A_05_S_02_N_01', pares }));
  await verificar(w);
  const sel = $(w, 'crVerificarPar');
  assert.equal(sel.options.length, 2, 'la opción por defecto (la más reciente) y la otra corrida: la más reciente no se repite');
  assert.equal(sel.value, '', 'por defecto sigue pidiendo la corrida más reciente');
  assert.equal(sel.options[0].textContent, '2026 · Octubre · Corrida A_05_S_02_N_01 (Más reciente con propuestas)', 'la opción por defecto dice año, mes y cuál es');
  assert.equal(sel.options[1].textContent, '2026 · Septiembre · Corrida A_05_S_01_N_01', 'las demás también llevan año y mes');
  assert.match($(w, 'crVerificarResultado').textContent, /Corrida A_05_S_02_N_01 · Propuestas del 27\/10\/2026/, 'el resumen dice qué corrida se verificó');

  sel.value = 'A_05_S_01_N_01';
  sel.dispatchEvent(new w.Event('change'));
  await esperar();
  assert.equal(JSON.stringify(w.__pedidos[1]), JSON.stringify({ accion: 'webCRListaVerificarYMarcar', params: { idAscenso: 'A_05_S_01_N_01' } }));
  assert.equal(sel.value, 'A_05_S_01_N_01', 'conserva la corrida elegida al volver a llenar el selector');
  assert.match(sel.options[0].textContent, /Octubre.*\(Más reciente con propuestas\)/, 'con otra corrida elegida, la opción por defecto sigue siendo la más reciente');
});

test('PF286: sin fecha válida el selector muestra solo la etiqueta, y sin saber cuál es la más reciente la opción por defecto no inventa una', async () => {
  const w = montar(Object.assign({}, BASE, { parId: '', pares: [{ idAscenso: 'A_05_S_02_N_01' }, { idAscenso: 'A_05_S_01_N_01', fechaTxt: 'sin fecha' }] }));
  await verificar(w);
  const sel = $(w, 'crVerificarPar');
  assert.equal(sel.options[0].textContent, 'La más reciente con propuestas');
  assert.equal(sel.options[1].textContent, 'Corrida A_05_S_02_N_01');
  assert.equal(sel.options[2].textContent, 'Corrida A_05_S_01_N_01');
});

test('PF286: una corrida elegida sin propuestas lo dice, y volver a entrar restablece la más reciente', async () => {
  const w = montar({ ok: true, hayCorrida: false, parId: 'A_05_S_02_N_01', pares: [{ idAscenso: 'A_05_S_02_N_01' }, { idAscenso: 'A_05_S_01_N_01' }], diaTxt: '', temporada: '', semana: '', dia: '', propuestasN: 0, aplicadas: [], pendientes: [], excepcionales: [] });
  await verificar(w);
  const sel = $(w, 'crVerificarPar');
  sel.value = 'A_05_S_01_N_01';
  sel.dispatchEvent(new w.Event('change'));
  await esperar();
  assert.match($(w, 'crVerificarResultado').textContent, /Esa corrida no tiene propuestas/);

  $(w, 'crVolverPaso1').click();
  await verificar(w);
  assert.equal(sel.value, '', 'al entrar otra vez vuelve a la corrida más reciente');
});

test('PF286: el desplegable «Corrida a verificar» va dentro de .field, que es donde está el estilo oscuro de los select', () => {
  const i = HTML.indexOf('<select id="crVerificarPar"');
  assert.ok(i > 0, 'el select existe en admin.html');
  const antes = HTML.slice(Math.max(0, i - 260), i);
  assert.match(antes, /<div class="field">\s*<label for="crVerificarPar">/, 'envuelto en .field con su label');
});

test('PF286: las tablas de «verificar» van centradas, con el contenido de Nombre a la izquierda, y la tabla de «Ver propuestas» no cambia', async () => {
  const w = montar(Object.assign({}, BASE, { parId: 'A_05_S_02_N_01', pares: [{ idAscenso: 'A_05_S_02_N_01' }], pendientes: [ITEM({})] }));
  await verificar(w);
  const wrap = $(w, 'crVerificarResultado').querySelector('.tabla-propuestas-cr-wrap');
  assert.ok(wrap && wrap.classList.contains('tabla-verificacion-cr'), 'la tabla de verificación lleva la clase que la centra');
  assert.match(HTML, /\.tabla-verificacion-cr th, \.tabla-verificacion-cr td\{text-align:center; vertical-align:middle;\}/, 'encabezado y celdas centrados en horizontal y en vertical');
  assert.match(HTML, /\.tabla-verificacion-cr td:first-child\{text-align:left;\}/, 'solo el contenido de Nombre va a la izquierda');
  assert.equal((HTML.match(/tabla-propuestas-cr-wrap tabla-verificacion-cr"/g) || []).length, 1, 'ninguna otra tabla usa la clase');
});

// NUEVO (28-oct-2026, PF286; pedido de la usuaria): búsqueda arriba de cada tabla de «verificar» y botones de filtro que también ordenan, como en guerra.html.
const PEND3 = [
  ITEM({ tag: '#1', nombre: 'Zeta', clan: 'Terna', fechaTxt: '01/10/2026' }),
  ITEM({ tag: '#2', nombre: 'Ana', clan: 'Mini', fechaTxt: '15/09/2026' }),
  ITEM({ tag: '#3', nombre: 'Ñoño', clan: 'Terna', tipo: 'Expulsión', rango: 'Miembro', rango2: '', fechaTxt: '20/10/2026' })
];
const filasDe = (w, clave) => [...w.document.querySelectorAll(`.tabla-propuestas-cr-wrap[data-crv="${clave}"] tbody tr`)].map(tr => tr.cells[0].textContent);
const botonCol = (w, clave, col) => w.document.querySelector(`.tabla-propuestas-cr-wrap[data-crv="${clave}"] .rt-filtro-btn[data-col="${col}"]`);
const escribir = (w, clave, texto) => { const inp = w.document.querySelector(`#crvBuscador-${clave} .buscador-input`); inp.value = texto; inp.dispatchEvent(new w.Event('input', { bubbles: true })); };

test('PF286: cada tabla de «verificar» tiene su barra de búsqueda arriba y busca sin tildes ni mayúsculas por nombre, Tag, clan o cambio', async () => {
  const w = montar(Object.assign({}, BASE, { pendientes: PEND3, aplicadas: [ITEM({ tag: '#9', nombre: 'Ok' })] }));
  await verificar(w);
  assert.ok($(w, 'crvBuscador-falta').querySelector('.buscador-input'), 'barra de búsqueda de «Falta aplicar»');
  assert.ok($(w, 'crvBuscador-aplicados').querySelector('.buscador-input'), 'también la de la tabla de aplicados');
  const wrap = w.document.querySelector('.tabla-propuestas-cr-wrap[data-crv="falta"]');
  assert.equal(wrap.previousElementSibling, $(w, 'crvBuscador-falta'), 'la barra va justo antes de la tabla');
  assert.equal(filasDe(w, 'falta').length, 3);
  escribir(w, 'falta', 'MINI');
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Ana']));
  assert.equal($(w, 'crvBuscador-falta').querySelector('.buscador-cuenta').textContent, '1 de 3');
  escribir(w, 'falta', 'nono');
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Ñoño']), 'la ñ cuenta como n');
  escribir(w, 'falta', 'expulsion');
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Ñoño']), 'busca también en la columna Cambio');
  escribir(w, 'falta', '#1');
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Zeta']), 'busca por Tag');
  escribir(w, 'falta', 'xxxx');
  assert.match(wrap.querySelector('tbody').textContent, /Sin coincidencias/);
  assert.equal($(w, 'crvBuscador-falta').querySelector('.buscador-cuenta').textContent, 'Sin coincidencias');
  escribir(w, 'falta', '');
  assert.equal(filasDe(w, 'falta').length, 3);
  assert.equal($(w, 'crvBuscador-falta').querySelector('.buscador-cuenta').textContent, '', 'sin búsqueda no hay contador');
  assert.equal(filasDe(w, 'aplicados').length, 1, 'la búsqueda de una tabla no toca a las otras');
});

test('PF286: el botón de filtro de cada encabezado ordena (texto y fecha) y «Quitar orden» vuelve al orden original', async () => {
  const w = montar(Object.assign({}, BASE, { pendientes: PEND3 }));
  await verificar(w);
  assert.equal(w.document.querySelectorAll('.tabla-propuestas-cr-wrap[data-crv="falta"] .rt-filtro-btn').length, 6, 'un botón por columna');
  botonCol(w, 'falta', 'nombre').click();
  const pop = w.document.querySelector('.rt-filtro-pop');
  assert.ok(pop, 'se abre el desplegable');
  pop.querySelector('[data-dir="asc"]').click();
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Ana', 'Ñoño', 'Zeta']));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null, 'el desplegable se cierra al elegir');
  assert.equal(w.document.querySelector('.tabla-propuestas-cr-wrap[data-crv="falta"] .rt-orden-indicador[data-col="nombre"]').textContent, '↑');
  botonCol(w, 'falta', 'nombre').click();
  w.document.querySelector('.rt-filtro-pop [data-dir="desc"]').click();
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Zeta', 'Ñoño', 'Ana']));
  botonCol(w, 'falta', 'fecha').click();
  w.document.querySelector('.rt-filtro-pop [data-dir="asc"]').click();
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Ana', 'Zeta', 'Ñoño']), 'la fecha se ordena como fecha (15/09, 01/10, 20/10), no como texto');
  botonCol(w, 'falta', 'fecha').click();
  w.document.querySelector('.rt-filtro-pop .rt-orden-quitar').click();
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Zeta', 'Ana', 'Ñoño']), 'sin orden, el de la respuesta');
});

test('PF286: el filtro por columna deja solo los valores marcados, se combina con la búsqueda y se borra al volver a verificar', async () => {
  const w = montar(Object.assign({}, BASE, { pendientes: PEND3 }));
  await verificar(w);
  botonCol(w, 'falta', 'clan').click();
  const pop = w.document.querySelector('.rt-filtro-pop');
  pop.querySelector('[data-modo="ninguno"]').click();
  const casilla = [...pop.querySelectorAll('.rt-filtro-item input')].find(c => c.value === 'Mini');
  casilla.checked = true;
  casilla.dispatchEvent(new w.Event('change', { bubbles: true }));
  pop.querySelector('.rt-filtro-aceptar').click();
  assert.equal(JSON.stringify(filasDe(w, 'falta')), JSON.stringify(['Ana']));
  assert.ok(botonCol(w, 'falta', 'clan').classList.contains('activo'), 'el botón de una columna filtrada se marca');
  escribir(w, 'falta', 'zeta');
  assert.match(w.document.querySelector('.tabla-propuestas-cr-wrap[data-crv="falta"] tbody').textContent, /Sin coincidencias/, 'búsqueda y filtro se combinan');
  escribir(w, 'falta', '');
  // Marcar todo otra vez = sin filtro.
  botonCol(w, 'falta', 'clan').click();
  w.document.querySelector('.rt-filtro-pop [data-modo="todo"]').click();
  w.document.querySelector('.rt-filtro-pop .rt-filtro-aceptar').click();
  assert.equal(filasDe(w, 'falta').length, 3);
  assert.equal(botonCol(w, 'falta', 'clan').classList.contains('activo'), false);
  // Volver a verificar borra el estado.
  botonCol(w, 'falta', 'clan').click();
  w.document.querySelector('.rt-filtro-pop [data-modo="ninguno"]').click();
  w.document.querySelector('.rt-filtro-pop .rt-filtro-aceptar').click();
  assert.match(w.document.querySelector('.tabla-propuestas-cr-wrap[data-crv="falta"] tbody').textContent, /Sin coincidencias/, 'sin ningún valor marcado no queda ninguna fila');
  $(w, 'btnCrVerificar').click();
  await esperar();
  assert.equal(filasDe(w, 'falta').length, 3, 'la nueva verificación empieza sin filtros');
});

test('PF286: las tablas salen en el orden aplicadas, aplicadas de forma excepcional y por último las que faltan; Motivo y Nota van en una sola línea', async () => {
  const w = montar(Object.assign({}, BASE, { aplicadas: [ITEM({ tag: '#1' })], excepcionales: [ITEM({ tag: '#2', motivo: 'm' })], pendientes: [ITEM({ tag: '#3' })] }));
  await verificar(w);
  const t = $(w, 'crVerificarResultado').textContent;
  const a = t.indexOf('Aplicados conforme a la propuesta'), b = t.indexOf('Aplicados de forma excepcional'), c = t.indexOf('Falta aplicar (');
  assert.ok(a >= 0 && a < b && b < c, 'orden: aplicados, excepcionales, falta aplicar');
  assert.match(HTML, /\.tabla-verificacion-cr td:last-child\{white-space:nowrap; min-width:0;\}/, 'la última columna no salta de línea');
});
