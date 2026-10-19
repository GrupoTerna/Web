'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026, pedido de la usuaria): en «Ingresos recientes» de directorio.html hay una
// pastilla «Ocultar admins». Con ella activa, las cuentas de admin (rango Líder o Colíder) quedan
// fuera de las gráficas y del contador mientras se marcan y desmarcan clanes; sus tarjetas se quedan.
// Se extraen del <script> inline REAL las funciones por nombre (si se renombran, falla a propósito).
// LÍMITE: DOM simulado, no un navegador.

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
const NOMBRES = ['claveIngreso', 'esCuentaAdminIngreso', 'ingresoIncluido', 'textoContadorIngresos', 'agruparPorClanEnOrden',
  'actualizarPillsIngresos', 'aplicarFiltroIngresos', 'construirFiltroIngresos'];
const CODIGO = `
let ingresosTodosCache = [], ingresosSeleccionados = null, ingresosGrupos = [], ingresosGraficasVisibles = false, ingresosUltimosFiltrados = [], ingresosOcultarAdmins = false;
function pintarGraficasIngresos(){}
${NOMBRES.map(n => extraerFuncion(grande, n)).join('\n')}
window.__t = {
  esCuentaAdminIngreso, ingresoIncluido, construirFiltroIngresos, aplicarFiltroIngresos,
  cargar(lista){ ingresosTodosCache = lista; construirFiltroIngresos(lista); },
  get filtrados(){ return ingresosUltimosFiltrados; },
  get seleccionados(){ return ingresosSeleccionados; }
};`;

const GENTE = [
  { tag: '#A1', nombre: 'Ana', clan: 'Terna', rango: 'Miembro' },
  { tag: '#A2', nombre: 'Boss', clan: 'Terna', rango: 'Líder' },
  { tag: '#B1', nombre: 'Beto', clan: 'Terna 2', rango: 'Veterano' },
  { tag: '#B2', nombre: 'Coco', clan: 'Terna 2', rango: 'Colíder' },
  { tag: '#C1', nombre: 'Sin rango', clan: 'Terna 3' }
];

function montar(){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="ingClanPills"></div><span id="nuevosCount"></span><div id="nuevoGrid"></div>');
  w.eval(CODIGO);
  const grid = w.document.getElementById('nuevoGrid');
  grid.innerHTML = GENTE.map(n => `<div class="js-nuevo-card" data-tag="${n.tag}"><input type="checkbox" class="js-ingreso-check" data-tag="${n.tag}" checked></div>`).join('');
  w.__t.cargar(GENTE);
  w.__t.aplicarFiltroIngresos();
  return w;
}
const pill = (w, clan) => w.document.querySelector(`#ingClanPills .ing-pill[data-clan="${clan}"]`);
const tagsFiltrados = w => w.__t.filtrados.map(n => n.tag);

test('Líder y Colíder (con o sin tilde) son cuentas de admin; el resto no', () => {
  const w = montar();
  const es = rango => w.__t.esCuentaAdminIngreso({ rango });
  assert.ok(es('Líder') && es('Colíder') && es('lider') && es('COLIDER'));
  assert.ok(!es('Miembro') && !es('Veterano') && !es('') && !es(undefined));
});

test('la pastilla «Ocultar admins» aparece solo si hay cuentas de admin', () => {
  const w = montar();
  assert.ok(pill(w, '__admins__'));
  assert.equal(pill(w, '__admins__').getAttribute('aria-pressed'), 'false');
  w.__t.cargar(GENTE.filter(n => n.rango !== 'Líder' && n.rango !== 'Colíder'));
  assert.equal(pill(w, '__admins__'), null);
});

test('al activarla, los admins salen de las gráficas y del contador, y sus tarjetas se atenúan sin desaparecer', () => {
  const w = montar();
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#A2', '#B1', '#B2', '#C1']);
  pill(w, '__admins__').click();
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#B1', '#C1']);
  assert.equal(w.document.getElementById('nuevosCount').textContent, '3 de 5 jugadores');
  assert.equal(pill(w, '__admins__').getAttribute('aria-pressed'), 'true');
  const cardAdmin = w.document.querySelector('.js-nuevo-card[data-tag="#A2"]');
  assert.ok(cardAdmin.classList.contains('excluido'), 'la tarjeta sigue ahí, atenuada');
  const check = cardAdmin.querySelector('.js-ingreso-check');
  assert.equal(check.checked, false);
  assert.equal(check.disabled, true);
});

test('seguir desmarcando y marcando clanes no devuelve a los admins mientras la pastilla está activa', () => {
  const w = montar();
  pill(w, '__admins__').click();
  pill(w, 'Terna 2').click(); // quita a Beto (los admins ya estaban fuera)
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#C1']);
  pill(w, 'Terna 2').click(); // lo vuelve a poner
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#B1', '#C1']);
  assert.equal(pill(w, 'Terna 2').getAttribute('aria-pressed'), 'true', 'el clan figura completo: sus visibles están todos marcados');
  pill(w, '__todos__').click();
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#B1', '#C1'], '«Todos» no desactiva la pastilla de admins');
});

test('al desactivarla vuelven los admins con la selección de clanes que había', () => {
  const w = montar();
  pill(w, 'Terna').click(); // desmarca todo Terna (Ana y Boss)
  pill(w, '__admins__').click();
  assert.deepEqual(tagsFiltrados(w), ['#B1', '#C1']);
  pill(w, '__admins__').click();
  assert.deepEqual(tagsFiltrados(w), ['#B1', '#B2', '#C1'], 'Boss sigue desmarcado porque Terna estaba desmarcado; Coco vuelve');
  const check = w.document.querySelector('.js-nuevo-card[data-tag="#B2"] .js-ingreso-check');
  assert.equal(check.disabled, false);
});
