'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (18-nov-2026, pedido de la usuaria): en «Ingresos recientes» de directorio.html, al apagar una tarjeta (desmarcar su casilla) esta baja al final de su clan.
// Orden de las tarjetas: 1) clan, 2) visibles antes que apagadas, 3) XP de mayor a menor, 4) nombre.
// Se extraen del <script> inline REAL las funciones por nombre (si se renombran, falla a propósito).
// LÍMITE: DOM simulado, no un navegador; no prueba el aspecto ni el salto visual de la tarjeta.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function construirFiltroIngresos'));
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
const NOMBRES = ['tagClanNormalizado', 'claveClanMiembro', 'claveIngreso', 'esCuentaAdminIngreso', 'tieneWspIngreso', 'diaActualIngresos', 'diaActualIngresosCache', 'sinPendientesIngreso', 'ingresoOculto', 'ingresoIncluido', 'textoContadorIngresos', 'agruparPorClanEnOrden',
  'actualizarPillsIngresos', 'xpIngresoNumero', 'compararTarjetasIngresos', 'reordenarTarjetasIngresos', 'aplicarFiltroIngresos', 'construirFiltroIngresos'];
const CODIGO = `
let ingresosTodosCache = [], ingresosSeleccionados = null, ingresosGrupos = [], ingresosGraficasVisibles = false, ingresosUltimosFiltrados = [], ingresosOcultarAdmins = false, ingresosOcultarConWsp = false, ingresosOcultarSinPendientes = false, ingresosClanesOcultos = new Set();
const INGRESOS_ATAQUES_DIA_MAX = 4;
let _diaActualIngresosRef = null, _diaActualIngresosIdx = -1;
function pintarGraficasIngresos(){}
${NOMBRES.map(n => extraerFuncion(grande, n)).join('\n')}
window.__t = {
  construirFiltroIngresos, aplicarFiltroIngresos,
  cargar(lista){ ingresosTodosCache = lista; construirFiltroIngresos(lista); },
  quitar(tag){ ingresosSeleccionados.delete(tag); aplicarFiltroIngresos(); },
  poner(tag){ ingresosSeleccionados.add(tag); aplicarFiltroIngresos(); }
};`;

// Ya vienen en el orden de la carga: clan y, dentro del clan, por nombre.
const GENTE = [
  { tag: '#A1', nombre: 'Ana', clan: 'Terna', nivelXp: 60 },
  { tag: '#A2', nombre: 'Berta', clan: 'Terna', nivelXp: 70 },
  { tag: '#A3', nombre: 'Carla', clan: 'Terna', nivelXp: 70 },
  { tag: '#A4', nombre: 'Dora', clan: 'Terna' },
  { tag: '#B1', nombre: 'Eva', clan: 'Terna 2', nivelXp: 50 },
  { tag: '#B2', nombre: 'Fina', clan: 'Terna 2', nivelXp: 80 }
];

function montar(lista = GENTE){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="ingClanPills"></div><span id="nuevosCount"></span><div id="nuevoGrid"></div>');
  w.eval(CODIGO);
  const grid = w.document.getElementById('nuevoGrid');
  grid.innerHTML = lista.map((n, i) => `<div class="js-nuevo-card" data-idx="${i}" data-tag="${n.tag}"><input type="checkbox" class="js-ingreso-check" data-tag="${n.tag}" checked></div>`).join('');
  w.__t.cargar(lista);
  w.__t.aplicarFiltroIngresos();
  return w;
}
const orden = w => [...w.document.querySelectorAll('#nuevoGrid .js-nuevo-card')].map(c => c.dataset.tag);

test('con todo marcado: por clan, luego XP de mayor a menor y al final nombre; sin XP va al final de su clan', () => {
  const w = montar();
  assert.deepEqual(orden(w), ['#A2', '#A3', '#A1', '#A4', '#B2', '#B1']);
});

test('al apagar una tarjeta baja al final de su clan, sin cambiar de clan', () => {
  const w = montar();
  w.__t.quitar('#A2');
  assert.deepEqual(orden(w), ['#A3', '#A1', '#A4', '#A2', '#B2', '#B1']);
});

test('las apagadas se ordenan entre sí por XP y nombre; al volver a marcar la tarjeta regresa a su lugar', () => {
  const w = montar();
  w.__t.quitar('#A1');
  w.__t.quitar('#A3');
  assert.deepEqual(orden(w), ['#A2', '#A4', '#A3', '#A1', '#B2', '#B1']);
  w.__t.poner('#A3');
  assert.deepEqual(orden(w), ['#A2', '#A3', '#A4', '#A1', '#B2', '#B1']);
  w.__t.poner('#A1');
  assert.deepEqual(orden(w), ['#A2', '#A3', '#A1', '#A4', '#B2', '#B1']);
});

test('apagar la tarjeta de un clan no mueve las del otro y el XP se compara como número, no como texto', () => {
  const w = montar([
    { tag: '#X1', nombre: 'Uno', clan: 'Terna 2', nivelXp: '9' },
    { tag: '#X2', nombre: 'Dos', clan: 'Terna 2', nivelXp: '100' },
    { tag: '#X3', nombre: 'Tres', clan: 'Terna', nivelXp: 5 }
  ]);
  assert.deepEqual(orden(w), ['#X3', '#X2', '#X1']);
  w.__t.quitar('#X2');
  assert.deepEqual(orden(w), ['#X3', '#X1', '#X2']);
});

test('conserva el foco del casillero al reordenar y los checkbox siguen su estado', () => {
  const w = montar();
  const check = w.document.querySelector('.js-nuevo-card[data-tag="#A2"] .js-ingreso-check');
  check.focus();
  check.checked = false;
  w.__t.quitar('#A2');
  assert.equal(w.document.activeElement, check);
  assert.equal(check.checked, false);
  assert.equal(w.document.querySelector('.js-nuevo-card[data-tag="#A3"] .js-ingreso-check').checked, true);
});
