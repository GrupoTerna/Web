'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-nov-2026, pedido de la usuaria; Contexto_Base_Web.md §PF567): «Log de Guerra (Histórico)» de guerra.html toma el
// aspecto de la tabla del modal del historial de guerra: clases .hist-tabla / .hist-tabla-dia (encabezado morado, columnas de
// colores), filas sombreadas de forma alterna POR TEMPORADA (.hist-sem-b en las impares, sin depender del orden de las filas) y
// el embudo de filtro y orden en cada encabezado. Se ejecuta cargarGuerraLog() REAL con datos simulados y el widget de encabezado
// real (thFiltroGrid); el motor de filtro/orden (inicializarGridFiltro) se reduce a pintar las filas.
// LÍMITE: no mide el dibujo (colores reales, anchos, móvil); no prueba el backend.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const gridJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'features', 'grid-guerra.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'styles.css'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('async function cargarGuerraLog'));
assert.ok(grande, 'no se encontró cargarGuerraLog en guerra.html');

function extraer(src, inicio){
  const ini = src.indexOf(inicio);
  assert.ok(ini >= 0, `no se encontró ${inicio}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error('llaves sin cerrar');
}

const CLANES = [
  { clan: 'Terna', semanas: [
    { temporada: 6, semana: 2, rank: 2, boat: 10, trophy: 300, trophyDelta: 20 },
    { temporada: 6, semana: 1, rank: 3, boat: 0, trophy: 280 },
    { temporada: 5, semana: 4, rank: 4, boat: 8, trophy: 200 },
    { temporada: 4, semana: 3, rank: 0, boat: null, trophy: null }
  ] }
];

async function pintar(){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'],
    '<section id="guerraLogSection" style="display:none"><div id="guerraLogTabs"></div><div id="guerraLogWrap"></div></section>');
  w.eval(`
    const NOTA_PUESTO_ESTIMADO = 'Puesto estimado.'; const ICONO_FILTRO_GRID = '<svg></svg>';
    const apiGet = async () => (${JSON.stringify({ clanes: CLANES })});
    const activarBarraScrollTabla = () => {};
    const inicializarGridFiltro = (id, tabla, cols, filas, renderFila) => { tabla.querySelector('tbody').innerHTML = filas.map(renderFila).join(''); };
    ${extraer(gridJs, 'function thFiltroGrid(')}
    ${extraer(grande, 'async function cargarGuerraLog(').replace('}catch(err){', '}catch(err){ window.__err = err;')}
    window.__log = cargarGuerraLog;`);
  await w.__log();
  assert.equal(w.__err, undefined, 'cargarGuerraLog falló por dentro: ' + (w.__err && w.__err.message)); // su catch oculta la sección sin avisar
  return w.document;
}

test('la tabla del log usa las clases del modal del historial y conserva su identificador de cuadrícula', async () => {
  const d = await pintar();
  const t = d.querySelector('table[data-grid-id="log:todos"]');
  assert.ok(t);
  for (const c of ['hist-tabla', 'hist-tabla-dia', 'tbl-log-guerra']) assert.ok(t.classList.contains(c), c);
  assert.equal(d.getElementById('guerraLogSection').style.display, '');
});

test('cada encabezado de columna conserva su embudo de filtro y orden (widget estándar)', async () => {
  const d = await pintar();
  const botones = [...d.querySelectorAll('thead .rt-filtro-btn')].map(b => b.dataset.col);
  assert.deepEqual(botones, ['temp', 'sem', 'c0-puesto', 'c0-barcos', 'c0-trofeos']);
  assert.equal(d.querySelectorAll('thead .rt-orden-indicador').length, 5);
});

test('filas sombreadas por temporada: .hist-sem-b en las impares, sin clase en las pares (todas las semanas de una temporada, igual)', async () => {
  const d = await pintar();
  const filas = [...d.querySelectorAll('tbody tr')];
  assert.deepEqual(filas.map(f => f.querySelector('[data-col="temp"]').dataset.raw), ['6', '6', '5', '4']);
  assert.deepEqual(filas.map(f => f.classList.contains('hist-sem-b')), [false, false, true, false]);
});

test('las celdas llevan los colores de las columnas del historial; lo que no hay va apagado', async () => {
  const d = await pintar();
  const f = d.querySelectorAll('tbody tr');
  const cls = (fila, col) => fila.querySelector(`[data-col="${col}"]`).className;
  assert.equal(cls(f[0], 'temp'), 'hist-c-tem');
  assert.equal(cls(f[0], 'sem'), 'hist-c-sem');
  assert.equal(cls(f[0], 'c0-puesto'), 'log-sep hist-c-pue');
  assert.equal(cls(f[0], 'c0-barcos'), 'hist-c-bar');
  assert.equal(cls(f[0], 'c0-trofeos'), 'hist-c-med');
  assert.equal(cls(f[1], 'c0-barcos'), 'hist-c-cero', 'barcos 0 va apagado, como el 0 del historial');
  assert.equal(cls(f[3], 'c0-puesto'), 'log-sep hist-c-cero');
  assert.equal(cls(f[3], 'c0-barcos'), 'hist-c-cero');
  assert.equal(cls(f[3], 'c0-trofeos'), 'hist-c-cero');
  assert.equal(f[3].querySelector('[data-col="c0-puesto"]').textContent, '—');
  assert.ok(f[0].querySelector('[data-col="c0-trofeos"]').textContent.includes('(+20)'), 'la variación de trofeos se conserva');
});

test('la nota del pie explica el sombreado por temporada y el embudo', async () => {
  const d = await pintar();
  assert.match(d.getElementById('guerraLogWrap').textContent, /sombrean de forma alterna por temporada; el embudo de cada encabezado filtra y ordena/);
});

test('el CSS compartido da color al Puesto con la misma especificidad que las demás columnas del historial', () => {
  assert.match(css, /\.hist-tabla\.hist-tabla-dia tr td\.hist-c-pue\{color:var\(--h-azul\)/);
  assert.match(css, /\.hist-tabla-dia tr\.hist-sem-b td\{background:/);
});

// NUEVO (24-nov-2026, pedido de la usuaria; Contexto_Base_Web.md §PF583): al desplazar el Log de Guerra los valores atravesaban el
// encabezado fijo porque `.hist-tabla thead th` (fondo morado translúcido) pisaba el fondo opaco de `.tabla-scroll-wrap thead th`.
// LÍMITE: solo comprueba que la regla existe y es opaca; el dibujo real se midió en Chromium emulado.
test('PF583: el encabezado fijo del Log de Guerra lleva una base opaca bajo el tinte morado', () => {
  const m = css.match(/\.tabla-scroll-wrap \.tbl-log-guerra\.hist-tabla thead th\{([^}]*)\}/);
  assert.ok(m, 'falta la regla del encabezado opaco del log');
  assert.match(m[1], /background-color:\s*#0e111c/);
  assert.match(m[1], /background-image:\s*linear-gradient/);
  assert.doesNotMatch(m[1], /background:\s*rgba/);
});
