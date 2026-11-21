'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (18-nov-2026, pedido de la usuaria; §PF512): en «Ingresos recientes» de directorio.html, desmarcar un CLAN con su pastilla oculta las
// tarjetas de ese clan (clase .oculto-clan); la pastilla se queda para volver a marcarlo. Desmarcar un miembro con su checkbox NO oculta su tarjeta
// (solo se atenúa con .excluido). «Todos» devuelve las tarjetas de los clanes desmarcados. Se extraen del <script> inline REAL las funciones por nombre.
// LÍMITE: DOM simulado, no un navegador; las tarjetas se simulan con el mínimo (js-nuevo-card + checkbox), sin nuevoCardHtml.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function construirFiltroIngresos'));
assert.ok(grande, 'no se encontró construirFiltroIngresos en directorio.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}
const NOMBRES = ['tagClanNormalizado', 'claveClanMiembro', 'claveIngreso', 'esCuentaAdminIngreso', 'tieneWspIngreso', 'diaActualIngresos', 'diaActualIngresosCache', 'sinPendientesIngreso', 'conBarcosSemanaIngreso', 'conInactividadIngreso', 'conAlertaClanIngreso', 'ocultoPorFiltrosIngreso', 'claveFiltroIngreso', 'pillsSoloMuestraIngresosHtml',
  'ingresoOculto', 'ingresoIncluido', 'textoContadorIngresos', 'agruparPorClanEnOrden', 'actualizarPillsIngresos', 'xpIngresoNumero', 'compararTarjetasIngresos', 'reordenarTarjetasIngresos', 'aplicarFiltroIngresos', 'construirFiltroIngresos'];
const CODIGO = `
let ingresosTodosCache = [], ingresosSeleccionados = null, ingresosGrupos = [], ingresosGraficasVisibles = false, ingresosUltimosFiltrados = [], ingresosOcultarAdmins = false, ingresosOcultarConWsp = false, ingresosOcultarSinPendientes = false, ingresosFiltros = { barcos: false, sinBarcos: false, inactivo: false, alerta: false }, ingresosClanesOcultos = new Set();
const INGRESOS_ATAQUES_DIA_MAX = 4;
let _diaActualIngresosRef = null, _diaActualIngresosIdx = -1;
function pintarGraficasIngresos(){}
${NOMBRES.map(n => extraerFuncion(grande, n)).join('\n')}
window.__t = {
  aplicarFiltroIngresos,
  cargar(lista){ ingresosTodosCache = lista; construirFiltroIngresos(lista); },
  get filtrados(){ return ingresosUltimosFiltrados; },
  get ocultos(){ return JSON.stringify([...ingresosClanesOcultos]); },
  quitarSel(tags){ tags.forEach(t => ingresosSeleccionados.delete(t)); aplicarFiltroIngresos(); },
  fijarSeleccion(tags){ ingresosSeleccionados = new Set(tags); ingresosClanesOcultos = new Set(ingresosGrupos.filter(g => !g.miembros.some(m => ingresosSeleccionados.has(claveIngreso(m)))).map(g => g.clave)); aplicarFiltroIngresos(); }
};`;

const LISTA = [
  { tag: '#A1', nombre: 'Ana', clan: 'Terna' },
  { tag: '#A2', nombre: 'Ben', clan: 'Terna' },
  { tag: '#B1', nombre: 'Cai', clan: 'Terna 2' },
  { tag: '#B2', nombre: 'Dan', clan: 'Terna 2' },
  { tag: '#C1', nombre: 'Eli', clan: 'Terna 3' }
];

function montar(lista){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="ingClanPills"></div><span id="nuevosCount"></span><div id="nuevoGrid"></div>');
  w.eval(CODIGO);
  w.document.getElementById('nuevoGrid').innerHTML = lista.map(n => `<div class="js-nuevo-card" data-tag="${n.tag}"><input type="checkbox" class="js-ingreso-check" data-tag="${n.tag}" checked></div>`).join('');
  w.__t.cargar(lista);
  w.__t.aplicarFiltroIngresos();
  return w;
}
const pillClan = (w, clan) => w.document.querySelector(`#ingClanPills .ing-pill[data-clan="${clan}"]`);
const card = (w, tag) => w.document.querySelector(`.js-nuevo-card[data-tag="${tag}"]`);
const ocultas = w => [...w.document.querySelectorAll('.js-nuevo-card.oculto-clan')].map(c => c.dataset.tag);

test('al arrancar no hay tarjetas ocultas por clan', () => {
  const w = montar(LISTA);
  assert.deepEqual(ocultas(w), []);
  assert.equal(w.__t.ocultos, '[]');
});

test('desmarcar un clan con su pastilla oculta las tarjetas de ese clan y solo las de ese clan', () => {
  const w = montar(LISTA);
  pillClan(w, 'Terna 2').click();
  assert.deepEqual(ocultas(w), ['#B1', '#B2']);
  assert.ok(!card(w, '#A1').classList.contains('oculto-clan'));
  assert.ok(!card(w, '#C1').classList.contains('oculto-clan'));
  assert.deepEqual(w.__t.filtrados.map(n => n.tag), ['#A1', '#A2', '#C1'], 'también salen del contador y de las gráficas');
});

test('la pastilla del clan desmarcado NO se oculta: sigue ahí, apagada y con su cuenta', () => {
  const w = montar(LISTA);
  pillClan(w, 'Terna 2').click();
  const p = pillClan(w, 'Terna 2');
  assert.ok(p, 'la pastilla sigue en la fila');
  assert.equal(p.getAttribute('aria-pressed'), 'false');
  assert.equal(p.querySelector('.ing-pill-count').textContent, '2');
  assert.equal(w.document.querySelectorAll('#ingClanPills .ing-pill').length, 4, 'Todos + 3 clanes, ninguna desapareció');
});

test('volver a pulsar la pastilla marca el clan y le devuelve las tarjetas', () => {
  const w = montar(LISTA);
  pillClan(w, 'Terna 2').click();
  pillClan(w, 'Terna 2').click();
  assert.deepEqual(ocultas(w), []);
  assert.deepEqual(w.__t.filtrados.map(n => n.tag), ['#A1', '#A2', '#B1', '#B2', '#C1']);
  assert.equal(pillClan(w, 'Terna 2').getAttribute('aria-pressed'), 'true');
});

test('desmarcar a UN miembro (como hace su checkbox) no oculta su tarjeta: solo la atenúa y la saca de las gráficas', () => {
  const w = montar(LISTA);
  w.__t.quitarSel(['#A1']);
  assert.deepEqual(ocultas(w), []);
  assert.ok(card(w, '#A1').classList.contains('excluido'));
  assert.deepEqual(w.__t.filtrados.map(n => n.tag), ['#A2', '#B1', '#B2', '#C1']);
  assert.equal(pillClan(w, 'Terna').getAttribute('aria-pressed'), 'mixed');
});

test('desmarcar a todos los miembros de un clan uno por uno tampoco oculta tarjetas (solo la pastilla de clan lo hace)', () => {
  const w = montar(LISTA);
  w.__t.quitarSel(['#B1', '#B2']);
  assert.deepEqual(ocultas(w), []);
  assert.ok(card(w, '#B1').classList.contains('excluido'), 'se atenúa, no desaparece');
  assert.equal(pillClan(w, 'Terna 2').getAttribute('aria-pressed'), 'false');
});

test('«Todos» devuelve las tarjetas de los clanes desmarcados', () => {
  const w = montar(LISTA);
  pillClan(w, 'Terna').click();
  pillClan(w, 'Terna 3').click();
  assert.deepEqual(ocultas(w), ['#A1', '#A2', '#C1']);
  pillClan(w, '__todos__').click();
  assert.deepEqual(ocultas(w), []);
  assert.equal(w.__t.ocultos, '[]');
  assert.equal(w.__t.filtrados.length, 5);
});

test('se pueden desmarcar todos los clanes: no queda ninguna tarjeta pero todas las pastillas siguen para volver a marcarlos', () => {
  const w = montar(LISTA);
  ['Terna', 'Terna 2', 'Terna 3'].forEach(c => pillClan(w, c).click());
  assert.equal(ocultas(w).length, 5);
  assert.equal(w.document.querySelectorAll('#ingClanPills .ing-pill').length, 4);
  pillClan(w, 'Terna 3').click();
  assert.deepEqual(ocultas(w), ['#A1', '#A2', '#B1', '#B2']);
});

test('una carga nueva (p. ej. tras «Actualizar») reinicia los clanes ocultos', () => {
  const w = montar(LISTA);
  pillClan(w, 'Terna').click();
  assert.equal(ocultas(w).length, 2);
  w.__t.cargar(LISTA);
  w.__t.aplicarFiltroIngresos();
  assert.deepEqual(ocultas(w), []);
});

test('la tarjeta nace con .oculto-clan si su clan está desmarcado, y la regla CSS la saca de la vista', () => {
  assert.match(grande, /\$\{ingresosClanesOcultos\.has\(claveClanMiembro\(n\)\) \? ' oculto-clan' : ''\}/);
  assert.match(html, /\.nuevo-card\.oculto-clan\s*\{\s*display:none;\s*\}/);
});

test('al llegar con ?clan=&tag= los demás clanes llegan desmarcados, y sus tarjetas ocultas (el clan elegido se ve)', () => {
  assert.match(grande, /if \(selClan\) ingresosClanesOcultos = new Set\(ingresosGrupos\.filter\(g => !g\.miembros\.some\(m => selClan\.has\(claveIngreso\(m\)\)\)\)\.map\(g => g\.clave\)\);/);
  // La misma expresión, ejecutada sobre grupos reales: queda oculto solo lo que no está en la selección.
  const w = montar(LISTA);
  const sel = new Set(['#A1', '#A2']);
  w.__t.fijarSeleccion([...sel]);
  assert.deepEqual(ocultas(w), ['#B1', '#B2', '#C1']);
  assert.ok(pillClan(w, 'Terna 2'), 'sus pastillas siguen');
});
