'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (29-oct-2026, accesibilidad, decidido por Claude por encargo de la usuaria «toma las decisiones de accesibilidad»): desplegable de orden y filtro del
// roster de directorio.html (el original del que se calcó el de guerra.html). Mismos defectos que en guerra: el cuadro no recibía el foco, no se cerraba con
// Escape, no tenía rol ni nombre, el embudo no decía que abre un cuadro ni si la columna tenía filtro, y al cerrar el foco caía a <body>.
// [→ Contexto_Base_Web.md §PF293]
//
// NO se carga directorio.html entero: se extraen del <script> inline REAL los tramos entre marcadores. LÍMITE: DOM de jsdom; no prueba el CSS ni un navegador real.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');

function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return HTML.slice(i, f);
}

const CODIGO = [
  tramo('let rosterFiltrosSeleccion = {};', '/** Colorea el ícono de embudo', 'el estado del roster, el cierre y abrirFiltroColumna'),
  tramo('function actualizarIconosFiltro', 'function actualizarBotonLimpiarFiltros', 'actualizarIconosFiltro')
].join('\n');

const COLUMNAS = `[
  { key: 'nombre', label: 'Nombre', tipo: 'texto', get: m => m.nombre },
  { key: 'ranking', label: 'Ranking', tipo: 'numero', get: m => String(m.ranking), raw: m => m.ranking }
]`;

function montar(){
  const dom = new JSDOM(`<!doctype html><html><body><div id="w"><table><thead><tr>
    <th scope="col"><button type="button" class="rt-filtro-btn" data-col="nombre" title="Ordenar o filtrar por Nombre" aria-label="Ordenar o filtrar por Nombre" aria-haspopup="dialog" aria-expanded="false"></button><span class="rt-orden-indicador" data-col="nombre"></span></th>
    <th scope="col"><button type="button" class="rt-filtro-btn" data-col="ranking" title="Ordenar o filtrar por Ranking" aria-label="Ordenar o filtrar por Ranking" aria-haspopup="dialog" aria-expanded="false"></button><span class="rt-orden-indicador" data-col="ranking"></span></th>
  </tr></thead><tbody></tbody></table></div><button id="otro">otro</button></body></html>`,
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const { window } = dom;
  window.eval(`
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function fmtNum(n){ return String(n); }
    function normalizarBusqueda(s){ return String(s == null ? '' : s).toLowerCase(); }
    const ROSTER_COLUMNAS = ${COLUMNAS};
    function debounce(f){ return f; }
    function aplicarFiltrosRoster(){}
    function actualizarBotonLimpiarFiltros(){}
    function reordenarYRepintarRoster(wrap){ actualizarIconosFiltro(wrap); }
    ${CODIGO}
    rosterMiembrosBase = [{ nombre: 'Zeta', ranking: 3 }, { nombre: 'Ana', ranking: 12 }];
    const COLS = ${COLUMNAS};
    document.querySelectorAll('#w .rt-filtro-btn').forEach(b => b.addEventListener('click', () => abrirFiltroColumna(COLS.find(c => c.key === b.dataset.col), b, document.getElementById('w'))));
  `);
  return window;
}

const esperar = () => new Promise(r => setTimeout(r, 0));
const boton = (w, col) => w.document.querySelector(`#w .rt-filtro-btn[data-col="${col}"]`);
const abrir = async (w, col) => { boton(w, col).click(); await esperar(); return w.document.querySelector('.rt-filtro-pop'); };
const escape = (w) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

test('accesibilidad directorio: el encabezado real del roster declara el embudo con aria-haspopup y aria-expanded', () => {
  assert.match(HTML, /class="rt-filtro-btn" data-col="\$\{c\.key\}" title="Ordenar o filtrar por \$\{esc\(c\.label\)\}" aria-label="Ordenar o filtrar por \$\{esc\(c\.label\)\}" aria-haspopup="dialog" aria-expanded="false"/);
});

test('accesibilidad directorio: el estado del embudo sigue al cuadro, que tiene rol y nombre, y el foco entra en él sin abrir el teclado', async () => {
  const w = montar();
  const btn = boton(w, 'nombre');
  const pop = await abrir(w, 'nombre');
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(pop.getAttribute('role'), 'dialog');
  assert.equal(pop.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre');
  assert.equal(w.document.activeElement, pop);
  await abrir(w, 'ranking');
  assert.equal(btn.getAttribute('aria-expanded'), 'false', 'abrir el de otra columna cierra el anterior');
  assert.equal(w.document.querySelectorAll('.rt-filtro-pop').length, 1);
});

test('accesibilidad directorio: Escape cierra el cuadro, y Escape, Cancelar, Aceptar u orden devuelven el foco al embudo', async () => {
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

test('accesibilidad directorio: cerrar por clic fuera, scroll o resize no roba el foco, y Escape sin cuadro abierto no hace nada', async () => {
  const w = montar();
  const otro = w.document.getElementById('otro');
  await abrir(w, 'nombre');
  escape(w);
  otro.focus();
  escape(w);
  assert.equal(w.document.activeElement, otro);
  await abrir(w, 'nombre');
  otro.focus();
  otro.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null);
  assert.equal(w.document.activeElement, otro);
  await abrir(w, 'nombre');
  otro.focus();
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null);
  assert.equal(w.document.activeElement, otro);
  assert.equal(boton(w, 'nombre').getAttribute('aria-expanded'), 'false');
});

test('accesibilidad directorio: el orden elegido se dice con aria-pressed y el embudo avisa cuando su columna tiene filtro', async () => {
  const w = montar();
  let pop = await abrir(w, 'ranking');
  assert.equal(pop.querySelector('[data-dir="desc"]').getAttribute('aria-pressed'), 'false');
  pop.querySelector('[data-dir="desc"]').click();
  pop = await abrir(w, 'ranking');
  assert.equal(pop.querySelector('[data-dir="desc"]').getAttribute('aria-pressed'), 'true');
  assert.equal(pop.querySelector('[data-dir="asc"]').getAttribute('aria-pressed'), 'false');
  assert.equal(boton(w, 'ranking').closest('th').getAttribute('aria-sort'), 'descending');
  escape(w);
  const btn = boton(w, 'nombre');
  pop = await abrir(w, 'nombre');
  pop.querySelector('[data-modo="ninguno"]').click();
  const casilla = [...pop.querySelectorAll('.rt-filtro-item input')].find(c => c.value === 'Ana');
  casilla.checked = true;
  casilla.dispatchEvent(new w.Event('change', { bubbles: true }));
  pop.querySelector('.rt-filtro-aceptar').click();
  assert.equal(btn.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre (con filtro)');
  assert.equal(boton(w, 'ranking').getAttribute('aria-label'), 'Ordenar o filtrar por Ranking', 'las demás columnas no cambian');
  pop = await abrir(w, 'nombre');
  pop.querySelector('[data-modo="todo"]').click();
  pop.querySelector('.rt-filtro-aceptar').click();
  assert.equal(btn.getAttribute('aria-label'), 'Ordenar o filtrar por Nombre');
});
