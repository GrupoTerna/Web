'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (29-oct-2026, accesibilidad, decidido por Claude por encargo de la usuaria «toma las decisiones de accesibilidad»): desplegable de orden y filtro de las
// tablas de guerra.html (embudo en cada encabezado). Antes: el cuadro se añadía al final del <body> sin recibir el foco (con teclado no se llegaba a él), no se
// cerraba con Escape, no tenía rol ni nombre, el embudo no decía que abre un cuadro ni si la columna tenía filtro, y al cerrar el foco caía a <body>.
// [→ Contexto_Base_Web.md §PF293]
//
// NO se carga guerra.html entero: se extraen del <script> inline REAL los tramos entre marcadores. LÍMITE: DOM de jsdom; no prueba el CSS ni un navegador real.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo('const gridEstados = {};', 'function thFiltroGrid', 'el estado por tabla, las variables del cuadro y gridEstadoDe'),
  tramo('function thFiltroGrid', '/** 5 columnas fijas J/V/S/D/Total', 'thFiltroGrid'),
  tramo('function cerrarGridFiltroPopover(', 'function compararPorGridColumna', 'el cierre del cuadro y valoresUnicosGridColumna'),
  tramo('function gridActualizarIconos', '/* gestionarTabsClan(', 'gridActualizarIconos, abrirGridFiltroColumna e inicializarGridFiltro')
].join('\n');

function montar(){
  const dom = new JSDOM('<!doctype html><html><body><table id="t"><thead><tr></tr></thead><tbody></tbody></table><button id="otro">otro</button></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.eval(`
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function fmtNum(n){ return String(n); }
    const ICONO_FILTRO_GRID = '<svg></svg>';
    function gridAplicarFiltros(){}
    function gridRepintar(gridId, tabla){ gridActualizarIconos(gridId, tabla); }
    ${CODIGO}
    const COLUMNAS = [{ key: 'nombre', tipo: 'texto', raw: f => f.nombre }, { key: 'total', tipo: 'num', raw: f => f.total }];
    const FILAS = [{ nombre: 'Zeta', total: 3 }, { nombre: 'Ana', total: 12 }, { nombre: 'Ñoño', total: 0 }];
    document.querySelector('#t thead tr').innerHTML = thFiltroGrid('c', 'Nombre', 'nombre') + thFiltroGrid('c', 'Total', 'total');
    inicializarGridFiltro('g1', document.getElementById('t'), COLUMNAS, FILAS, f => '<tr></tr>');
  `);
  return window;
}

const esperar = () => new Promise(r => setTimeout(r, 0));
const boton = (w, col) => w.document.querySelector(`#t .rt-filtro-btn[data-col="${col}"]`);
const abrir = async (w, col) => { boton(w, col).click(); await esperar(); return w.document.querySelector('.rt-filtro-pop'); };
const escape = (w) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

test('accesibilidad guerra: el embudo declara que abre un cuadro y su estado sigue al desplegable', async () => {
  const w = montar();
  const btn = boton(w, 'nombre');
  assert.equal(btn.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  const pop = await abrir(w, 'nombre');
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(pop.getAttribute('role'), 'dialog');
  assert.equal(pop.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre', 'el cuadro tiene el mismo nombre que su embudo');
  await abrir(w, 'total');
  assert.equal(btn.getAttribute('aria-expanded'), 'false', 'abrir el de otra columna cierra el anterior');
  assert.equal(boton(w, 'total').getAttribute('aria-expanded'), 'true');
  assert.equal(w.document.querySelectorAll('.rt-filtro-pop').length, 1);
});

test('accesibilidad guerra: al abrir, el foco entra en el cuadro (que está al final del body) sin ir a ninguna caja de texto', async () => {
  const w = montar();
  const pop = await abrir(w, 'nombre');
  assert.equal(w.document.activeElement, pop, 'el foco queda en el cuadro, no en el embudo ni en <body>');
  assert.notEqual(w.document.activeElement.tagName, 'INPUT', 'no se abre el teclado del móvil');
});

test('accesibilidad guerra: Escape cierra el cuadro, y Escape, Cancelar, Aceptar u orden devuelven el foco al embudo', async () => {
  const w = montar();
  const btn = boton(w, 'nombre');
  const cierres = {
    Escape: () => escape(w),
    Cancelar: () => w.document.querySelector('.rt-filtro-cancelar').click(),
    Aceptar: () => w.document.querySelector('.rt-filtro-aceptar').click(),
    Orden: () => w.document.querySelector('.rt-orden-btn[data-dir="asc"]').click()
  };
  for (const [nombre, cerrar] of Object.entries(cierres)){
    await abrir(w, 'nombre');
    cerrar();
    assert.equal(w.document.querySelector('.rt-filtro-pop'), null, `${nombre}: el cuadro se cierra`);
    assert.equal(w.document.activeElement, btn, `${nombre}: el foco vuelve al embudo`);
    assert.equal(btn.getAttribute('aria-expanded'), 'false', `${nombre}: el embudo figura cerrado`);
  }
  await abrir(w, 'nombre');
  w.document.querySelector('.rt-orden-quitar').click();
  assert.equal(w.document.activeElement, btn, 'Quitar orden: el foco vuelve al embudo');
});

test('accesibilidad guerra: tras cerrarse, Escape ya no hace nada (el oyente se retira) y cerrar por clic fuera, scroll o resize no roba el foco', async () => {
  const w = montar();
  await abrir(w, 'nombre');
  escape(w);
  const otro = w.document.getElementById('otro');
  otro.focus();
  escape(w); // sin cuadro abierto: no debe devolver el foco al embudo
  assert.equal(w.document.activeElement, otro);
  await abrir(w, 'nombre');
  otro.focus();
  otro.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null);
  assert.equal(w.document.activeElement, otro, 'clic fuera: el foco queda donde la persona lo puso');
  await abrir(w, 'nombre');
  otro.focus();
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null);
  assert.equal(w.document.activeElement, otro, 'resize: no mueve el foco');
  assert.equal(boton(w, 'nombre').getAttribute('aria-expanded'), 'false');
});

test('accesibilidad guerra: el orden elegido se dice con aria-pressed y el embudo avisa cuando su columna tiene filtro', async () => {
  const w = montar();
  let pop = await abrir(w, 'total');
  assert.equal(pop.querySelector('[data-dir="asc"]').getAttribute('aria-pressed'), 'false');
  pop.querySelector('[data-dir="desc"]').click();
  assert.equal(boton(w, 'total').closest('th').getAttribute('aria-sort'), 'descending');
  pop = await abrir(w, 'total');
  assert.equal(pop.querySelector('[data-dir="desc"]').getAttribute('aria-pressed'), 'true');
  assert.equal(pop.querySelector('[data-dir="asc"]').getAttribute('aria-pressed'), 'false');
  escape(w);
  const btn = boton(w, 'nombre');
  assert.equal(btn.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre');
  pop = await abrir(w, 'nombre');
  pop.querySelector('[data-modo="ninguno"]').click();
  const casilla = [...pop.querySelectorAll('.rt-filtro-item input')].find(c => c.value === 'Ana');
  casilla.checked = true;
  casilla.dispatchEvent(new w.Event('change', { bubbles: true }));
  pop.querySelector('.rt-filtro-aceptar').click();
  assert.equal(btn.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre (con filtro)');
  assert.equal(boton(w, 'total').getAttribute('aria-label'), 'Ordenar o filtrar por Total', 'las demás columnas no cambian');
  pop = await abrir(w, 'nombre');
  pop.querySelector('[data-modo="todo"]').click();
  pop.querySelector('.rt-filtro-aceptar').click();
  assert.equal(btn.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre', 'marcar todo = sin filtro');
});
