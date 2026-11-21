'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (21-nov-2026, pedido de la usuaria): pastilla «🚢 Solo con barcos» en «Ingresos recientes» de directorio.html. Al revés que las de
// «Ocultar»: activa, SOLO quedan (tarjeta, contador y gráficas) quienes hicieron ataques de barcos en la semana de guerra, en cualquier día de
// jueves a sábado (el domingo no cuenta). La semana la fija el backend por periodIndex y la congela de lunes a miércoles como quedó el domingo:
// la pastilla lee `guerraSemanaDias.barcos` y nunca la fecha del navegador. Se extraen del <script> inline REAL las funciones por nombre.
// LÍMITE: DOM simulado, no un navegador.

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
const NOMBRES = ['tagClanNormalizado', 'claveClanMiembro', 'claveIngreso', 'esCuentaAdminIngreso', 'tieneWspIngreso', 'diaActualIngresos', 'diaActualIngresosCache', 'sinPendientesIngreso', 'conBarcosSemanaIngreso',
  'ingresoOculto', 'ingresoIncluido', 'textoContadorIngresos', 'agruparPorClanEnOrden', 'actualizarPillsIngresos', 'xpIngresoNumero', 'compararTarjetasIngresos', 'reordenarTarjetasIngresos', 'aplicarFiltroIngresos', 'construirFiltroIngresos'];
const CODIGO = `
let ingresosTodosCache = [], ingresosSeleccionados = null, ingresosGrupos = [], ingresosGraficasVisibles = false, ingresosUltimosFiltrados = [], ingresosOcultarAdmins = false, ingresosOcultarConWsp = false, ingresosOcultarSinPendientes = false, ingresosSoloBarcos = false, ingresosClanesOcultos = new Set();
const INGRESOS_ATAQUES_DIA_MAX = 4, INGRESOS_DIAS_BARCOS = 3;
let _diaActualIngresosRef = null, _diaActualIngresosIdx = -1;
function pintarGraficasIngresos(){}
${NOMBRES.map(n => extraerFuncion(grande, n)).join('\n')}
window.__t = {
  sinPendientesIngreso, conBarcosSemanaIngreso, diaActualIngresos, aplicarFiltroIngresos,
  cargar(lista){ ingresosTodosCache = lista; construirFiltroIngresos(lista); },
  get filtrados(){ return ingresosUltimosFiltrados; }
};`;

const barcos = b => ({ guerraSemanaDias: { dias: ['J', 'V', 'S', 'D'], ataques: [4, 4, 4, 4], barcos: b } });
const LISTA = [
  { tag: '#A1', nombre: 'Ana', clan: 'Terna', ...barcos([0, 2, 0, 0]) },        // viernes
  { tag: '#A2', nombre: 'Ben', clan: 'Terna', ...barcos([0, 0, 0, 0]) },        // ninguno
  { tag: '#B1', nombre: 'Cai', clan: 'Terna 2', ...barcos([1, null, null, null]) }, // jueves
  { tag: '#B2', nombre: 'Dan', clan: 'Terna 2', ...barcos([0, 0, 0, 3]) },      // solo domingo: no cuenta
  { tag: '#C1', nombre: 'Eli', clan: 'Terna 3', ...barcos([null, null, 5, null]) }, // sábado
  { tag: '#C2', nombre: 'Fio', clan: 'Terna 3', ...barcos([null, null, null, null]) } // sin días jugados
];

function montar(lista){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="ingClanPills"></div><span id="nuevosCount"></span><div id="nuevoGrid"></div>');
  w.eval(CODIGO);
  w.document.getElementById('nuevoGrid').innerHTML = lista.map(n => `<div class="js-nuevo-card" data-tag="${n.tag}"><input type="checkbox" class="js-ingreso-check" data-tag="${n.tag}" checked></div>`).join('');
  w.__t.cargar(lista);
  w.__t.aplicarFiltroIngresos();
  return w;
}
const pill = w => w.document.querySelector('#ingClanPills .ing-pill[data-clan="__barcos__"]');
const tags = w => w.__t.filtrados.map(n => n.tag);

test('con barcos = algún día de jueves a sábado con más de 0; el domingo y los días sin dato no cuentan', () => {
  const w = montar(LISTA);
  assert.deepEqual(LISTA.map(n => w.__t.conBarcosSemanaIngreso(n)), [true, false, true, false, true, false]);
});

test('sin desglose diario usa el total de barcos de la semana (es lo único que hay); sin nada, no cuenta', () => {
  const w = montar(LISTA);
  const f = n => w.__t.conBarcosSemanaIngreso(n);
  assert.equal(f({ guerraSemana: { barcos: 3 } }), true);
  assert.equal(f({ guerraSemana: { barcos: 0 } }), false);
  assert.equal(f({ tag: '#X' }), false);
  assert.equal(f(null), false);
});

test('la pastilla la ve todo el público y cuenta a quienes dejaría', () => {
  const w = montar(LISTA);
  assert.ok(pill(w));
  assert.match(pill(w).textContent, /Solo con barcos/);
  assert.equal(pill(w).querySelector('.ing-pill-count').textContent, '3');
  assert.equal(pill(w).getAttribute('aria-pressed'), 'false');
});

test('al activarla solo quedan en contador, gráficas y tarjetas quienes hicieron barcos; al apagarla vuelven todos', () => {
  const w = montar(LISTA);
  assert.deepEqual(tags(w), ['#A1', '#A2', '#B1', '#B2', '#C1', '#C2']);
  pill(w).click();
  assert.deepEqual(tags(w), ['#A1', '#B1', '#C1']);
  assert.equal(w.document.getElementById('nuevosCount').textContent, '3 de 6 jugadores');
  assert.equal(pill(w).getAttribute('aria-pressed'), 'true');
  assert.ok(pill(w).classList.contains('active'));
  const oculta = t => w.document.querySelector(`.js-nuevo-card[data-tag="${t}"]`).classList.contains('oculto-barcos');
  assert.equal(oculta('#A2'), true);
  assert.equal(oculta('#B2'), true, 'solo domingo: oculta');
  assert.equal(oculta('#A1'), false);
  pill(w).click();
  assert.deepEqual(tags(w), ['#A1', '#A2', '#B1', '#B2', '#C1', '#C2']);
  assert.equal(oculta('#A2'), false);
});

test('de lunes a miércoles (congelada) se lee lo que mandó el backend, sin mirar el calendario del navegador', () => {
  // El backend ya manda la semana fijada por periodIndex y congelada como quedó el domingo; la pastilla solo lee guerraSemanaDias.barcos.
  const w = montar(LISTA);
  assert.ok(!/new Date\(|Date\.now\(/.test(w.__t.conBarcosSemanaIngreso.toString()), 'la regla no debe usar la fecha del navegador');
  pill(w).click();
  assert.deepEqual(tags(w), ['#A1', '#B1', '#C1']);
});

test('si nadie hizo barcos la pastilla no aparece y nadie se oculta', () => {
  const w = montar([{ tag: '#A1', nombre: 'Ana', clan: 'Terna', ...barcos([0, 0, 0, 0]) }, { tag: '#B1', nombre: 'Beto', clan: 'Terna 2' }]);
  assert.equal(pill(w), null);
  assert.deepEqual(tags(w), ['#A1', '#B1']);
});

test('se combina con las de «Ocultar»: basta con que una saque la tarjeta', () => {
  const lista = [
    { tag: '#A1', nombre: 'Ana', clan: 'Terna', esCuentaAdmin: true, ...barcos([2, 0, 0, 0]) },
    { tag: '#A2', nombre: 'Ben', clan: 'Terna', ...barcos([1, 0, 0, 0]) },
    { tag: '#B1', nombre: 'Cai', clan: 'Terna 2', ...barcos([0, 0, 0, 0]) }
  ];
  const w = montar(lista);
  pill(w).click();
  w.document.querySelector('#ingClanPills .ing-pill[data-clan="__admins__"]').click();
  assert.deepEqual(tags(w), ['#A2']);
});
