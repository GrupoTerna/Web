'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-nov-2026, pedido de la usuaria; Contexto_Base_Web.md §PF561): pastillas Todos / Completos / Incompletos en
// «Valores diarios» y «Valores semanales» de guerra.html, con el criterio de §PF560 punto 8.
// Se ejecuta el código REAL de grid-guerra.js (funciones puras y gridAplicarFiltros) con los demás helpers reducidos a lo mínimo.
// LÍMITE: no prueba el CSS ni un navegador real, ni el backend (los datos son simulados).

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const gridJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'features', 'grid-guerra.js'), 'utf8');
const trozo = (re) => { const r = gridJs.match(re); assert.ok(r, 'no se encontró en grid-guerra.js: ' + re); return r[0]; };

function montar(cuerpoHtml) {
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], cuerpoHtml || '');
  w.eval(`
    var filtroAtaquesActivos = 'todos', filtroAtaquesTemporada = 'todos';
    const UMBRAL_VERDE_SEMANAL = 16;
    ${trozo(/function estadoAtaquesFilaDiaria\([\s\S]*?\n\}\n/)}
    ${trozo(/function estadoAtaquesFilaSemanal\([\s\S]*?\n\}\n/)}
    ${trozo(/function atqFiltroDeGridId\(gridId\)\{[\s\S]*?\n\}\n/)}
    ${trozo(/function actualizarPastillasAtaques\(gridId\)\{[\s\S]*?\n\}\n/)}
    function gridEstadoDe(){ return { filtros: {} }; }
    function letraFiltroDeGridId(){ return null; }
    function soloCeroDeGridId(){ return false; }
    function busquedaDeGridId(){ return ''; }
    function coincideBusqueda(){ return true; }
    function renumerarFilas(){}
    function gridActualizarTotales(){}
    function actualizarBotonSoloCero(){}
    function actualizarCuentaBuscador(){}
    ${trozo(/function gridAplicarFiltros\(gridId, tabla\)\{[\s\S]*?\n\}\n/)}
    window.__t = { estadoAtaquesFilaDiaria, estadoAtaquesFilaSemanal, gridAplicarFiltros, actualizarPastillasAtaques, fijar: (a, t) => { filtroAtaquesActivos = a; filtroAtaquesTemporada = t; } };`);
  return w;
}

test('Valores diarios: 4 ataques en cada día cerrado es completo; un día con 1 a 3 o con 0 es incompleto', () => {
  const T = montar().__t;
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 4, d: 4 }), 'completo');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 3, d: 4 }), 'incompleto');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 0, s: 4, d: 4 }), 'incompleto');
});

test('Valores diarios: no se suman ataques de un día a otro (sábado con 3 y domingo con 5 sigue incompleto)', () => {
  const T = montar().__t;
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 3, d: 5 }), 'incompleto');
});

test('Valores diarios: con el clan ya cruzado, 0 a 3 ataques en un día opcional no es falta; en otro día obligatorio sí', () => {
  const T = montar().__t;
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 4, d: 0, opc: ['d'] }), 'completo');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 4, d: 2, opc: ['d'] }), 'completo');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 1, s: 4, d: 0, opc: ['d'] }), 'incompleto', 'dejó ataques el viernes, que era obligatorio');
});

test('Valores diarios: null (no estuvo en el clan) y el día en curso con ataques pendientes no se juzgan', () => {
  const T = montar().__t;
  assert.equal(T.estadoAtaquesFilaDiaria({ j: null, v: null, s: null, d: null }), '');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: null, d: null }), 'completo');
  const hoy = { key: 's' };
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 2, d: null }, hoy, true), 'completo', 'sábado en curso: todavía puede atacar');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 4, s: 2, d: null }, hoy, false), 'incompleto', 'en entrenamiento el sábado ya cerró');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: 4, v: 2, s: 2, d: null }, hoy, true), 'incompleto', 'el viernes sí estaba cerrado');
  assert.equal(T.estadoAtaquesFilaDiaria({ j: null, v: null, s: 1, d: null }, hoy, true), '', 'solo tiene el día en curso: nada que juzgar');
});

test('Valores semanales: por debajo de 16 es incompleto; el umbral baja 4 por cada día opcional; la semana en curso no se juzga', () => {
  const T = montar().__t;
  const f = (semanas, opc) => ({ ataques: { semanas, opc } });
  assert.equal(T.estadoAtaquesFilaSemanal(f([16, 16], [0, 0])), 'completo');
  assert.equal(T.estadoAtaquesFilaSemanal(f([16, 15], [0, 0])), 'incompleto');
  assert.equal(T.estadoAtaquesFilaSemanal(f([12], [1])), 'completo', 'un día opcional: umbral 12');
  assert.equal(T.estadoAtaquesFilaSemanal(f([0], [4])), 'completo', 'los 4 días opcionales: umbral 0');
  assert.equal(T.estadoAtaquesFilaSemanal(f([16, null], [0, 0])), 'completo', 'null = no estuvo esa semana');
  assert.equal(T.estadoAtaquesFilaSemanal(f([null, null], [0, 0])), '');
  assert.equal(T.estadoAtaquesFilaSemanal(f([16, 8], [0, 0]), { idx: 1 }, true), 'completo', 'semana en curso con ataques pendientes');
  assert.equal(T.estadoAtaquesFilaSemanal(f([16, 8], [0, 0]), { idx: 1 }, false), 'incompleto');
  assert.equal(T.estadoAtaquesFilaSemanal(f([10, 16], [0, 0]), { idx: 1 }, true), 'incompleto');
});

test('gridAplicarFiltros(): las pastillas filtran las filas y las cuentas cubren toda la sección', () => {
  const w = montar(`
    <div id="filtroAtaquesActivos">
      <button data-atq-filtro="todos" data-atq-texto="Todos"></button>
      <button data-atq-filtro="completos" data-atq-texto="Completos"></button>
      <button data-atq-filtro="incompletos" data-atq-texto="Incompletos"></button>
    </div>
    <div id="controlActivosWrap"><table data-grid-id="activos:Terna"><tbody>
      <tr data-atq-estado="completo"></tr><tr data-atq-estado="incompleto"></tr>
      <tr data-atq-estado="completo"></tr><tr data-atq-estado=""></tr>
    </tbody></table></div>`);
  const T = w.__t;
  const tabla = w.document.querySelector('table');
  const vis = () => [...w.document.querySelectorAll('tbody tr')].map(tr => tr.style.display === 'none' ? '-' : 'o').join('');
  const txt = () => [...w.document.querySelectorAll('button')].map(b => b.textContent).join('|');
  const pulsadas = () => [...w.document.querySelectorAll('button')].map(b => b.getAttribute('aria-pressed')).join(',');

  T.fijar('todos', 'todos'); T.gridAplicarFiltros('activos:Terna', tabla);
  assert.equal(vis(), 'oooo');
  assert.equal(txt(), 'Todos (4)|Completos (2)|Incompletos (1)');
  assert.equal(pulsadas(), 'true,false,false');
  T.fijar('completos', 'todos'); T.gridAplicarFiltros('activos:Terna', tabla);
  assert.equal(vis(), 'o-o-', 'sin datos que juzgar solo aparece en Todos');
  assert.equal(txt(), 'Todos (4)|Completos (2)|Incompletos (1)', 'las cuentas no cambian al filtrar');
  assert.equal(pulsadas(), 'false,true,false');
  T.fijar('incompletos', 'todos'); T.gridAplicarFiltros('activos:Terna', tabla);
  assert.equal(vis(), '-o--');
});

test('guerra.html: cada cuadrícula tiene su grupo de pastillas con ayuda y sus filas llevan data-atq-estado', () => {
  for (const [grupo, wrap] of [['filtroAtaquesActivos', 'controlActivosWrap'], ['filtroAtaquesTemporada', 'controlTemporadaWrap']]) {
    const iG = html.indexOf(`id="${grupo}"`), iW = html.indexOf(`id="${wrap}"`);
    assert.ok(iG > 0 && iW > iG, `${grupo} debe ir antes de ${wrap}`);
    const g = html.slice(iG, iG + 900);
    for (const k of ['todos', 'completos', 'incompletos']) assert.ok(g.includes(`data-atq-filtro="${k}"`), `${grupo}: falta ${k}`);
    assert.match(html, new RegExp(`getElementById\\('${grupo}'\\)\\.addEventListener\\('click'`));
  }
  assert.match(html, /data-atq-estado="\$\{estadoAtaquesFilaDiaria\(f, colHoyDia,/);
  assert.match(html, /data-atq-estado="\$\{estadoAtaquesFilaSemanal\(f, colHoySem,/);
});
