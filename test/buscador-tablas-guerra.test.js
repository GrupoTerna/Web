'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (24-oct-2026, tanda 14 de Consolidado_Mini_Historial_y_Perfil.md, §PF224): buscador por nombre o Tag en las tablas de guerra.
// Cubre (1) las funciones puras y la caja de assets/js/ui/filters.js, (2) aplicarBusquedaParticipacion() y gridAplicarFiltros() extraídas de guerra.html
// y ejecutadas con jsdom, y (3) la estructura del HTML. LÍMITE: no prueba el CSS ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const cargar = (body) => loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/ui/filters.js'], body || '');

test('normalizarBusqueda(): minúsculas, sin tildes, ñ cuenta como n, sin espacios sobrantes', () => {
  const w = cargar();
  assert.equal(w.normalizarBusqueda('  ÁNGEL Ñoño '), 'angel nono');
  assert.equal(w.normalizarBusqueda(null), '');
  assert.equal(w.normalizarBusqueda(undefined), '');
});

test('coincideBusqueda(): consulta vacía coincide con todo; todas las palabras deben aparecer, en cualquier orden', () => {
  const w = cargar();
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', ''), true);
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', '   '), true);
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', 'perez juan'), true);
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', 'JUA pe'), true, 'coincidencia parcial («o similar»)');
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', '2gg8'), true, 'también por Tag, con o sin #');
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', '#2gg8pj8gc'), true);
  assert.equal(w.coincideBusqueda('Juan Pérez #2GG8PJ8GC', 'juan zzz'), false);
  assert.equal(w.coincideBusqueda('', 'a'), false);
  assert.equal(w.coincideBusqueda(undefined, 'a'), false);
});

test('textoCuentaBuscador(): sin coincidencias, «N de M» y aviso si la pestaña visible no tiene ninguna', () => {
  const w = cargar();
  assert.equal(w.textoCuentaBuscador(0, 40, 0), 'Sin coincidencias');
  assert.equal(w.textoCuentaBuscador(3, 40, 3), '3 de 40');
  assert.equal(w.textoCuentaBuscador(3, 40, 0), '3 de 40 · en otro clan');
});

test('pintarBuscadorTabla(): pinta una sola vez, avisa al escribir, muestra y usa la ✕ y Escape borra', () => {
  const w = cargar('<div id="caja"></div>');
  let texto = '', cambios = 0;
  const opts = { placeholder: 'Buscar…', ariaLabel: 'Buscar jugador en X', fijar: v => { texto = v; }, onCambio: () => { cambios++; } };
  w.pintarBuscadorTabla('caja', opts);
  w.pintarBuscadorTabla('caja', opts); // segunda vez: no duplica
  const caja = w.document.getElementById('caja');
  assert.equal(caja.querySelectorAll('input').length, 1);
  assert.equal(caja.getAttribute('role'), 'search');
  const input = caja.querySelector('.buscador-input');
  const x = caja.querySelector('.buscador-limpiar');
  assert.equal(input.getAttribute('aria-label'), 'Buscar jugador en X');
  assert.equal(x.hidden, true, 'sin texto no hay ✕');
  input.value = 'ana';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(texto, 'ana');
  assert.equal(cambios, 1);
  assert.equal(x.hidden, false);
  x.click();
  assert.equal(input.value, '');
  assert.equal(texto, '');
  assert.equal(cambios, 2);
  assert.equal(x.hidden, true);
  input.value = 'luis';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(input.value, '');
  assert.equal(texto, '');
});

test('aplicarBusquedaParticipacion(): oculta cuentas y tarjetas sin coincidencias y cuenta; sin búsqueda muestra todo', () => {
  const w = cargar(`
    <div id="participacionHoyBuscador"><span class="buscador-cuenta"></span></div>
    <div id="participacionHoyWrap">
      <div class="ai-clan-card" data-clan="A"><ul><li data-buscar="Ana #AAA">Ana</li><li data-buscar="Beto #BBB">Beto</li></ul></div>
      <div class="ai-clan-card" data-clan="B" style="display:none"><ul><li data-buscar="Carla #CCC">Carla</li></ul></div>
      <div class="card" data-multi="1"><ul><li data-buscar="Dani #DDD">Dani</li></ul></div>
    </div>`);
  const m = html.match(/function aplicarBusquedaParticipacion\(\)\{[\s\S]*?\n\}\n/);
  assert.ok(m, 'no se encontró aplicarBusquedaParticipacion() en guerra.html');
  w.eval(`var busquedaParticipacion = ''; ${m[0]}; window.aplicarBusquedaParticipacion = aplicarBusquedaParticipacion; window.fijar = v => { busquedaParticipacion = v; };`);
  const lis = () => [...w.document.querySelectorAll('li')].map(li => li.classList.contains('busq-oculta') ? 'x' : 'o').join('');
  const tarjetas = () => [...w.document.querySelectorAll('.ai-clan-card, [data-multi]')].map(c => c.classList.contains('busq-oculta') ? 'x' : 'o').join('');
  const cuenta = () => w.document.querySelector('.buscador-cuenta').textContent;

  w.aplicarBusquedaParticipacion();
  assert.equal(lis(), 'oooo');
  assert.equal(cuenta(), '');

  w.fijar('ana'); w.aplicarBusquedaParticipacion();
  assert.equal(lis(), 'oxxx');
  assert.equal(tarjetas(), 'oxx', 'las tarjetas sin coincidencias se ocultan');
  assert.equal(cuenta(), '1 de 4');

  w.fijar('carla'); w.aplicarBusquedaParticipacion();
  assert.equal(cuenta(), '1 de 4 · en otro clan', 'la coincidencia está en un clan cuya pestaña no se ve');

  w.fijar('#ddd'); w.aplicarBusquedaParticipacion();
  assert.equal(tarjetas(), 'xxo');

  w.fijar('nadie'); w.aplicarBusquedaParticipacion();
  assert.equal(cuenta(), 'Sin coincidencias');

  w.fijar(''); w.aplicarBusquedaParticipacion();
  assert.equal(lis(), 'oooo');
  assert.equal(tarjetas(), 'ooo');
});

test('gridAplicarFiltros(): la búsqueda se combina con la letra y renumera solo las filas visibles', () => {
  const w = cargar(`
    <div id="pendBuscador"><span class="buscador-cuenta"></span></div>
    <div id="pendWrap"><div class="ai-clan-card">
      <table data-grid-id="pend:Terna"><tbody>
        <tr data-letra="A" data-buscar="Ana #AAA"><td class="col-n"></td></tr>
        <tr data-letra="A" data-buscar="Alberto #ALB"><td class="col-n"></td></tr>
        <tr data-letra="B" data-buscar="Beto #BBB"><td class="col-n"></td></tr>
      </tbody></table></div></div>`);
  const trozo = (re) => { const r = html.match(re); assert.ok(r, 'no se encontró en guerra.html: ' + re); return r[0]; };
  // Se ejecuta el cuerpo REAL de gridAplicarFiltros() con los helpers de las demás partes de la página reducidos a lo mínimo.
  const cuerpo = trozo(/function gridAplicarFiltros\(gridId, tabla\)\{[\s\S]*?\n\}\n/);
  w.eval(`
    var letraSel = null, busquedaPend = '', busquedaActivos = '', busquedaTemporada = '';
    function gridEstadoDe(){ return { filtros: {} }; }
    function letraFiltroDeGridId(){ return letraSel; }
    function soloCeroDeGridId(){ return false; }
    function renumerarFilas(tabla){ let n = 0; tabla.querySelectorAll('tbody tr').forEach(tr => { tr.querySelector('td.col-n').textContent = tr.style.display === 'none' ? '' : String(++n); }); }
    function gridActualizarTotales(){}
    function actualizarBotonSoloCero(){}
    ${trozo(/const BUSCADOR_DE_SECCION = \{[\s\S]*?\n\};\n/)}
    ${trozo(/function busquedaDeSeccion\(prefijo\)\{[\s\S]*?\n\}\n/)}
    ${trozo(/function busquedaDeGridId\(gridId\)\{[^\n]*\}\n/)}
    ${trozo(/function actualizarCuentaBuscador\(prefijo\)\{[\s\S]*?\n\}\n/)}
    ${cuerpo}
    window.correr = (letra, busq) => { letraSel = letra; busquedaPend = busq; gridAplicarFiltros('pend:Terna', document.querySelector('table')); };`);
  const vis = () => [...w.document.querySelectorAll('tbody tr')].map(tr => tr.style.display === 'none' ? '-' : tr.querySelector('.col-n').textContent).join(',');
  const cuenta = () => w.document.querySelector('.buscador-cuenta').textContent;

  w.correr(null, ''); assert.equal(vis(), '1,2,3'); assert.equal(cuenta(), '');
  w.correr(null, 'al'); assert.equal(vis(), '-,1,-'); assert.equal(cuenta(), '1 de 3');
  w.correr('A', 'a'); assert.equal(vis(), '1,2,-', 'letra A y la búsqueda «a»: Beto no tiene letra A');
  w.correr('B', 'ana'); assert.equal(vis(), '-,-,-', 'letra y búsqueda sin intersección'); assert.equal(cuenta(), '1 de 3');
  w.correr(null, 'zzz'); assert.equal(cuenta(), 'Sin coincidencias');
});

test('guerra.html: cada tabla de jugadores tiene su caja arriba de las pestañas de clan y sus filas llevan data-buscar', () => {
  for (const [caja, tabs] of [['pendBuscador', 'pendClanTabs'], ['participacionHoyBuscador', 'participacionHoyClanTabs'], ['controlActivosBuscador', 'controlActivosClanTabs'], ['controlTemporadaBuscador', 'controlTemporadaClanTabs']]) {
    const iC = html.indexOf(`id="${caja}"`), iT = html.indexOf(`id="${tabs}"`);
    assert.ok(iC > 0 && iT > iC, `${caja} debe ir antes de ${tabs}`);
    assert.match(html, new RegExp(`pintarBuscadorTabla\\('${caja}'`), `${caja} se pinta`);
  }
  assert.equal((html.match(/<tr data-letra="[^"]*" data-buscar="/g) || []).length, 3, 'las filas de Pendientes, Valores diarios y Valores semanales llevan data-buscar');
  assert.ok((html.match(/<li data-buscar="/g) || []).length >= 2, 'Participación de Hoy: cuentas y multiclan llevan data-buscar');
  assert.match(html, /coincideBusqueda\(fila\.dataset\.buscar, busquedaDeGridId\(gridId\)\)/);
});
