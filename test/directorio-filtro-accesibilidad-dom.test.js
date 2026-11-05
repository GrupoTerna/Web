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
  w.innerWidth = w.innerWidth - 200; // 5-nov-2026: solo un cambio de ancho cierra el cuadro
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

// NUEVO (4-nov-2026, pedido de la usuaria: «cuando trato de bajar para aceptar el filtro, se cierra»): el scroll del propio cuadro o de su lista de valores no lo cierra; el de la página sí.
test('accesibilidad directorio: el scroll dentro del cuadro no lo cierra y el de la página sí', async () => {
  const w = montar();
  const pop = await abrir(w, 'nombre');
  pop.dispatchEvent(new w.Event('scroll')); // el cuadro tiene max-height y overflow: se desplaza para llegar a «Aceptar»
  assert.ok(w.document.querySelector('.rt-filtro-pop'), 'scroll del cuadro: sigue abierto');
  pop.querySelector('.rt-filtro-lista').dispatchEvent(new w.Event('scroll'));
  assert.ok(w.document.querySelector('.rt-filtro-pop'), 'scroll de la lista de valores: sigue abierto');
  assert.equal(boton(w, 'nombre').getAttribute('aria-expanded'), 'true');
  w.document.dispatchEvent(new w.Event('scroll'));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null, 'scroll de la página: se cierra, como antes');
  assert.equal(boton(w, 'nombre').getAttribute('aria-expanded'), 'false');
  await abrir(w, 'nombre');
  w.document.querySelector('.rt-filtro-aceptar').click();
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null, 'Aceptar sigue cerrando el cuadro');
});

// NUEVO (5-nov-2026, PF361 2.ª parte: «todavía no se puede desplazar en el filtro, se desaparece»): el cuadro se mide y se coloca para que «Aceptar» quede a la vista,
// y el resize del móvil (barra de direcciones, teclado) ya no lo cierra. LÍMITE: jsdom no calcula el diseño; aquí se simulan el alto del contenido y la posición del embudo.
const medir = (w, scrollHeight, rect) => {
  Object.defineProperty(w.HTMLElement.prototype, 'scrollHeight', { get(){ return scrollHeight; }, configurable: true });
  w.HTMLElement.prototype.getBoundingClientRect = function(){ return Object.assign({ left: 20, right: 60, width: 40, height: 20 }, rect); };
};

test('accesibilidad directorio: si el cuadro no cabe bajo el embudo pero sí encima, se coloca encima y no sobresale de la ventana', async () => {
  const w = montar();
  w.innerHeight = 800;
  medir(w, 560, { top: 600, bottom: 620 }); // abajo quedan 166 px; arriba 578 px
  const pop = await abrir(w, 'nombre');
  const top = parseFloat(pop.style.top);
  assert.ok(top >= 8 && top + 560 <= 600 - 6, `encima del embudo y dentro de la ventana (top=${top})`);
  assert.ok(parseFloat(pop.style.maxHeight) >= 560, 'cabe entero: sin recorte');
});

test('accesibilidad directorio: si no cabe ni arriba ni abajo, su alto máximo es el espacio libre y se desplaza por dentro hasta «Aceptar»', async () => {
  const w = montar();
  w.innerHeight = 500;
  medir(w, 560, { top: 240, bottom: 260 }); // abajo 226 px; arriba 226 px
  const pop = await abrir(w, 'nombre');
  const top = parseFloat(pop.style.top);
  const maxH = parseFloat(pop.style.maxHeight);
  assert.ok(maxH < 560, 'el alto se limita: el cuadro tiene scroll propio');
  assert.ok(top + maxH <= 500 - 8, `no sobresale por abajo (top=${top}, máx=${maxH})`);
  assert.ok(top >= 8, 'no sobresale por arriba');
});

test('accesibilidad directorio: el resize que solo cambia el alto (barra de direcciones, teclado) no cierra el cuadro; uno que cambia el ancho sí', async () => {
  const w = montar();
  const pop = await abrir(w, 'nombre');
  w.innerHeight = w.innerHeight - 120;
  w.dispatchEvent(new w.Event('resize'));
  assert.ok(w.document.querySelector('.rt-filtro-pop') === pop, 'solo cambió el alto: sigue abierto');
  w.innerWidth = w.innerWidth - 200;
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.querySelector('.rt-filtro-pop'), null, 'cambió el ancho (giro del móvil): se cierra');
});

test('estilos directorio: el cuadro y su lista no pasan el arrastre a la página al llegar al final', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'styles.css'), 'utf8');
  assert.match(css, /\.rt-filtro-pop\{[^}]*overscroll-behavior:contain/);
  assert.match(css, /\.rt-filtro-lista\{[^}]*overscroll-behavior:contain/);
});
