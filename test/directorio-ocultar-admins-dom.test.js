'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026, pedido de la usuaria): en «Ingresos recientes» de directorio.html hay una
// pastilla «Ocultar admins». Con ella activa, las cuentas de los administradores (las que marca el
// backend con esCuentaAdmin, solo con sesión de admin) quedan fuera de las gráficas y del contador y sus
// tarjetas DESAPARECEN mientras se marcan y desmarcan clanes; al apagarla vuelven. Admin NO es el rango Líder/Colíder.
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
  { tag: '#A2', nombre: 'Cuenta de admin', clan: 'Terna', rango: 'Miembro', esCuentaAdmin: true },
  { tag: '#B1', nombre: 'Beto', clan: 'Terna 2', rango: 'Líder' }, // Líder del juego, pero NO administrador
  { tag: '#B2', nombre: 'Otra de admin', clan: 'Terna 2', rango: 'Veterano', esCuentaAdmin: true },
  { tag: '#C1', nombre: 'Sin marca', clan: 'Terna 3' }
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

test('solo es cuenta de admin la que el backend marca; ser Líder o Colíder del juego no cuenta', () => {
  const w = montar();
  assert.ok(w.__t.esCuentaAdminIngreso({ esCuentaAdmin: true }));
  assert.ok(!w.__t.esCuentaAdminIngreso({ rango: 'Líder' }));
  assert.ok(!w.__t.esCuentaAdminIngreso({ rango: 'Colíder' }));
  assert.ok(!w.__t.esCuentaAdminIngreso({ esCuentaAdmin: false }));
  assert.ok(!w.__t.esCuentaAdminIngreso({}));
  assert.ok(!w.__t.esCuentaAdminIngreso(null));
});

test('la pastilla «Ocultar admins» aparece solo si hay cuentas de admin (sin sesión de admin el backend no manda la marca)', () => {
  const w = montar();
  assert.ok(pill(w, '__admins__'));
  assert.equal(pill(w, '__admins__').getAttribute('aria-pressed'), 'false');
  w.__t.cargar(GENTE.map(n => ({ tag: n.tag, nombre: n.nombre, clan: n.clan, rango: n.rango })));
  assert.equal(pill(w, '__admins__'), null);
});

test('al activarla, los admins salen de las gráficas y del contador y SUS TARJETAS DESAPARECEN; al apagarla vuelven', () => {
  const w = montar();
  const tarjeta = tag => w.document.querySelector(`.js-nuevo-card[data-tag="${tag}"]`);
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#A2', '#B1', '#B2', '#C1']);
  pill(w, '__admins__').click();
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#B1', '#C1']);
  assert.equal(w.document.getElementById('nuevosCount').textContent, '3 de 5 jugadores');
  assert.equal(pill(w, '__admins__').getAttribute('aria-pressed'), 'true');
  assert.ok(tarjeta('#A2').classList.contains('oculto-admin'));
  assert.ok(tarjeta('#B2').classList.contains('oculto-admin'));
  assert.ok(!tarjeta('#B1').classList.contains('oculto-admin'), 'un Líder que no es admin sigue visible');
  pill(w, '__admins__').click();
  assert.ok(!tarjeta('#A2').classList.contains('oculto-admin'));
  assert.ok(!tarjeta('#B2').classList.contains('oculto-admin'));
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#A2', '#B1', '#B2', '#C1']);
});

test('seguir desmarcando y marcando clanes no devuelve a los admins mientras la pastilla está activa', () => {
  const w = montar();
  pill(w, '__admins__').click();
  pill(w, 'Terna 2').click(); // quita a Beto (la otra cuenta del clan ya estaba fuera)
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#C1']);
  pill(w, 'Terna 2').click(); // lo vuelve a poner
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#B1', '#C1']);
  assert.equal(pill(w, 'Terna 2').getAttribute('aria-pressed'), 'true', 'el clan figura completo: sus visibles están todos marcados');
  assert.ok(w.document.querySelector('.js-nuevo-card[data-tag="#B2"]').classList.contains('oculto-admin'), 'la cuenta de admin sigue oculta');
  pill(w, '__todos__').click();
  assert.deepEqual(tagsFiltrados(w), ['#A1', '#B1', '#C1'], '«Todos» no desactiva la pastilla de admins');
});

test('al desactivarla vuelven los admins con la selección de clanes que había', () => {
  const w = montar();
  pill(w, 'Terna').click(); // desmarca todo Terna (Ana y la cuenta de admin)
  pill(w, '__admins__').click();
  assert.deepEqual(tagsFiltrados(w), ['#B1', '#C1']);
  pill(w, '__admins__').click();
  assert.deepEqual(tagsFiltrados(w), ['#B1', '#B2', '#C1'], '#A2 sigue desmarcado porque Terna estaba desmarcado; #B2 vuelve');
  assert.ok(!w.document.querySelector('.js-nuevo-card[data-tag="#B2"]').classList.contains('oculto-admin'));
});
