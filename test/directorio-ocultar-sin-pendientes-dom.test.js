'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (24-oct-2026, pedido de la usuaria, tanda 9; P17 a P20): pastilla «⚔️ Ocultar sin pendientes» en «Ingresos recientes» de
// directorio.html. Oculta (tarjeta, contador y gráficas) a quien ya hizo sus 4 ataques del día; se queda quien tiene 0 a 3.
// La ven todos. El «día actual» sale de los datos (último día J/V/S/D con dato de ataques), no del calendario: de lunes a miércoles
// (guerra congelada) es el domingo, y la pastilla sigue disponible. Se extraen del <script> inline REAL las funciones por nombre.
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
const INGRESOS_ATAQUES_DIA_MAX = 4;
let _diaActualIngresosRef = null, _diaActualIngresosIdx = -1;
function pintarGraficasIngresos(){}
${NOMBRES.map(n => extraerFuncion(grande, n)).join('\n')}
window.__t = {
  sinPendientesIngreso, diaActualIngresos, aplicarFiltroIngresos,
  cargar(lista){ ingresosTodosCache = lista; construirFiltroIngresos(lista); },
  get filtrados(){ return ingresosUltimosFiltrados; }
};`;

const ataques = a => ({ guerraSemanaDias: { dias: ['J', 'V', 'S', 'D'], ataques: a } });
// Viernes: el jueves ya está cerrado y hoy (V) cada uno lleva lo suyo.
const VIERNES = [
  { tag: '#A1', nombre: 'Ana', clan: 'Terna', ...ataques([4, 4, null, null]) },   // terminó hoy
  { tag: '#A2', nombre: 'Ben', clan: 'Terna', ...ataques([4, 3, null, null]) },   // le queda 1
  { tag: '#B1', nombre: 'Cai', clan: 'Terna 2', ...ataques([2, 0, null, null]) }, // 0 hoy: pendiente (los 4)
  { tag: '#B2', nombre: 'Dan', clan: 'Terna 2', ...ataques([4, null, null, null]) }, // sin dato de hoy: se queda
  { tag: '#C1', nombre: 'Eli', clan: 'Terna 3' }                                  // sin guerraSemanaDias: se queda
];

function montar(lista){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="ingClanPills"></div><span id="nuevosCount"></span><div id="nuevoGrid"></div>');
  w.eval(CODIGO);
  w.document.getElementById('nuevoGrid').innerHTML = lista.map(n => `<div class="js-nuevo-card" data-tag="${n.tag}"><input type="checkbox" class="js-ingreso-check" data-tag="${n.tag}" checked></div>`).join('');
  w.__t.cargar(lista);
  w.__t.aplicarFiltroIngresos();
  return w;
}
const pill = w => w.document.querySelector('#ingClanPills .ing-pill[data-clan="__pend__"]');
const tags = w => w.__t.filtrados.map(n => n.tag);

test('el día actual sale de los datos: el último día J/V/S/D con ataques de alguno', () => {
  const w = montar(VIERNES);
  assert.equal(w.__t.diaActualIngresos(VIERNES), 1);
  assert.equal(w.__t.diaActualIngresos([{ tag: '#X' }]), -1);
  assert.equal(w.__t.diaActualIngresos([]), -1);
});

test('pendiente = menos de 4 ataques hoy (0 a 3); 4 = sin pendientes; sin dato de hoy se queda visible', () => {
  const w = montar(VIERNES);
  const s = n => w.__t.sinPendientesIngreso(n);
  assert.equal(s(VIERNES[0]), true);
  assert.equal(s(VIERNES[1]), false, '3 ataques deja 1 pendiente');
  assert.equal(s(VIERNES[2]), false, '0 ataques también es pendiente');
  assert.equal(s(VIERNES[3]), false, 'sin dato de hoy no se oculta');
  assert.equal(s(VIERNES[4]), false, 'sin guerraSemanaDias no se oculta');
});

test('la pastilla la ve todo el público (no depende de esCuentaAdmin ni tieneWsp) y cuenta a quienes ocultaría', () => {
  const w = montar(VIERNES);
  assert.ok(pill(w));
  assert.match(pill(w).textContent, /Ocultar sin pendientes/);
  assert.equal(pill(w).querySelector('.ing-pill-count').textContent, '1');
  assert.equal(pill(w).getAttribute('aria-pressed'), 'false');
});

test('al activarla salen de contador, gráficas y tarjeta quienes terminaron; al apagarla vuelven', () => {
  const w = montar(VIERNES);
  assert.deepEqual(tags(w), ['#A1', '#A2', '#B1', '#B2', '#C1']);
  pill(w).click();
  assert.deepEqual(tags(w), ['#A2', '#B1', '#B2', '#C1']);
  assert.equal(w.document.getElementById('nuevosCount').textContent, '4 de 5 jugadores');
  assert.equal(pill(w).getAttribute('aria-pressed'), 'true');
  assert.ok(w.document.querySelector('.js-nuevo-card[data-tag="#A1"]').classList.contains('oculto-pend'));
  assert.ok(!w.document.querySelector('.js-nuevo-card[data-tag="#A2"]').classList.contains('oculto-pend'));
  pill(w).click();
  assert.deepEqual(tags(w), ['#A1', '#A2', '#B1', '#B2', '#C1']);
  assert.ok(!w.document.querySelector('.js-nuevo-card[data-tag="#A1"]').classList.contains('oculto-pend'));
});

test('lunes a miércoles (guerra congelada): sigue disponible y usa el último día, congelado como quedó el domingo', () => {
  const DOMINGO = [
    { tag: '#A1', nombre: 'Ana', clan: 'Terna', ...ataques([4, 4, 4, 4]) },
    { tag: '#A2', nombre: 'Ben', clan: 'Terna', ...ataques([4, 4, 4, 2]) },
    { tag: '#B1', nombre: 'Cai', clan: 'Terna 2', ...ataques([4, 4, 4, 4]) }
  ];
  const w = montar(DOMINGO);
  assert.equal(w.__t.diaActualIngresos(DOMINGO), 3);
  assert.ok(pill(w), 'la pastilla se muestra en entrenamiento');
  pill(w).click();
  assert.deepEqual(tags(w), ['#A2']);
});

test('sin ningún dato de ataques (guerra sin empezar) la pastilla no aparece y nadie se oculta', () => {
  const w = montar([{ tag: '#A1', nombre: 'Ana', clan: 'Terna' }, { tag: '#B1', nombre: 'Beto', clan: 'Terna 2', ...ataques([null, null, null, null]) }]);
  assert.equal(pill(w), null);
  assert.deepEqual(tags(w), ['#A1', '#B1']);
});

test('se combina con las otras pastillas de «Ocultar»: basta con que una oculte la tarjeta', () => {
  const lista = [
    { tag: '#A1', nombre: 'Ana', clan: 'Terna', esCuentaAdmin: true, ...ataques([4, 1, null, null]) },
    { tag: '#A2', nombre: 'Ben', clan: 'Terna', ...ataques([4, 4, null, null]) },
    { tag: '#B1', nombre: 'Cai', clan: 'Terna 2', ...ataques([4, 2, null, null]) }
  ];
  const w = montar(lista);
  pill(w).click();
  w.document.querySelector('#ingClanPills .ing-pill[data-clan="__admins__"]').click();
  assert.deepEqual(tags(w), ['#B1']);
});

// NUEVO (31-oct-2026, PF225 caso (b) de P18; la usuaria dijo «sí»): si el clan ya había cruzado la meta en el día actual (atacar era
// opcional), la cuenta cuenta como sin pendientes aunque tenga 0 a 3 ataques o ni siquiera dato de ese día. Lo marca el backend en
// `diasOpcionales` (4 booleanos J/V/S/D). Sin ese campo, o con otro día marcado, nada cambia.
test('día opcional (meta del clan cruzada): sin pendientes aunque tenga 0 a 3 ataques o no tenga dato de hoy', () => {
  const op = (viernes, n) => ({ ...n, diasOpcionales: [false, viernes, false, false] });
  const lista = [
    op(true, VIERNES[1]),  // 3 ataques, pero el clan ya cruzó la meta hoy
    op(true, VIERNES[2]),  // 0 ataques hoy, pero el jueves dejó 2: con la regla de la semana sigue con pendientes
    op(true, VIERNES[3]),  // sin dato de hoy, mismo caso
    op(true, VIERNES[4]),  // sin guerraSemanaDias, mismo caso
    op(false, VIERNES[2]), // el clan no cruzó la meta: 0 ataques sigue siendo pendiente
    { ...VIERNES[2], diasOpcionales: [false, false, true, false] }, // marcado otro día (sábado), no el actual
    { ...VIERNES[2], diasOpcionales: 'x' },                          // campo mal formado: se ignora
    VIERNES[0]
  ];
  const w = montar(lista);
  const s = n => w.__t.sinPendientesIngreso(n);
  assert.deepEqual(lista.map(s), [true, false, true, true, false, false, false, true]);
});

test('día opcional: la pastilla oculta a esas cuentas y las cuenta en su número', () => {
  const lista = [
    { ...VIERNES[1], tag: '#O1', diasOpcionales: [false, true, false, false] },
    { ...VIERNES[2], tag: '#O2' },
    VIERNES[0]
  ];
  const w = montar(lista);
  const hechas = lista.filter(n => w.__t.sinPendientesIngreso(n)).map(n => n.tag);
  assert.deepEqual(hechas, ['#O1', '#A1']);
});

// NUEVO (21-nov-2026, pedido de la usuaria): «sin pendientes» se mide por la SEMANA de guerra, no solo por el día actual, para no ocultar a
// quien dejó ataques incompletos en un día anterior. Cuentan todos los días de jueves al día actual (el último con dato); un día opcional
// (meta del clan cruzada) no exige nada; un día sin dato cuenta como pendiente salvo antes de su primer dato (aún no estaba).
test('semana: un día anterior incompleto deja pendientes aunque hoy esté completo', () => {
  const lista = [
    { tag: '#S1', nombre: 'Uno', clan: 'Terna', ...ataques([3, 4, null, null]) },   // jueves incompleto
    { tag: '#S2', nombre: 'Dos', clan: 'Terna', ...ataques([4, 4, null, null]) },   // todo completo
    { tag: '#S3', nombre: 'Tres', clan: 'Terna', ...ataques([null, 4, null, null]) }, // entró el viernes: el jueves no cuenta
    { tag: '#S4', nombre: 'Cuatro', clan: 'Terna', ...ataques([4, null, null, null]) }, // sin dato de hoy: se queda
    { tag: '#S5', nombre: 'Cinco', clan: 'Terna', ...ataques([0, 4, null, null]) }  // 0 el jueves: pendiente
  ];
  const w = montar(lista);
  assert.deepEqual(lista.map(n => w.__t.sinPendientesIngreso(n)), [false, true, true, false, false]);
  pill(w).click();
  assert.deepEqual(tags(w), ['#S1', '#S4', '#S5']);
});

test('semana: un día opcional en el medio no exige ataques y un día sin dato tras el primer dato sí', () => {
  const lista = [
    { tag: '#T1', nombre: 'Uno', clan: 'Terna', diasOpcionales: [false, true, false, false], ...ataques([4, 1, 4, null]) },
    { tag: '#T2', nombre: 'Dos', clan: 'Terna', ...ataques([4, null, 4, null]) }, // hueco el viernes tras haber jugado el jueves
    { tag: '#T3', nombre: 'Tres', clan: 'Terna', ...ataques([4, 4, 4, null]) }
  ];
  const w = montar(lista);
  assert.deepEqual(lista.map(n => w.__t.sinPendientesIngreso(n)), [true, false, true]);
});

test('semana: con la guerra congelada (lunes a miércoles) se mide toda la semana hasta el domingo', () => {
  const lista = [
    { tag: '#D1', nombre: 'Uno', clan: 'Terna', ...ataques([4, 4, 4, 4]) },
    { tag: '#D2', nombre: 'Dos', clan: 'Terna', ...ataques([4, 2, 4, 4]) }, // el viernes quedó incompleto
    { tag: '#D3', nombre: 'Tres', clan: 'Terna', ...ataques([4, 4, 4, 3]) }
  ];
  const w = montar(lista);
  assert.deepEqual(lista.map(n => w.__t.sinPendientesIngreso(n)), [true, false, false]);
});
