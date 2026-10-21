'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (20-oct-2026, pedido de la usuaria): «el valor diario siempre debe mostrarse sobre el valor acumulado
// o semanal en caso de que coincidan». En las minigráficas de perfil.html (_dispersionMiniHtml), la serie marcada
// `acumulado: true` se dibuja PRIMERO y con el radio mayor (6,5); el valor diario, después y más chico (3,5), así
// el verde/morado asoma como un aro y el diario queda encima. Sin ninguna serie acumulada (p. ej. «Ataques y
// barcos por día») se conserva el criterio del 12-oct-2026: la primera serie abajo (r 5) y las siguientes encima (r 3,5).
// LÍMITE: se extrae la función del <script> inline REAL y se mira el SVG como texto, no en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const fuente = scripts.find(t => t.includes('function _dispersionMiniHtml('));
assert.ok(fuente, 'no se encontró _dispersionMiniHtml en perfil.html');

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

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="x"></div>');
  window.eval(extraerFuncion(fuente, '_dispersionMiniHtml') + '\nwindow.__mini = _dispersionMiniHtml;');
  return window;
}

const DIAS = ['J', 'V', 'S', 'D'];
// Lee los círculos de puntos en el orden en que se dibujan: [{ r, color }].
const puntos = svg => [...svg.matchAll(/<circle class="md-punto"[^>]*? r="([\d.]+)" fill="([^"]+)"/g)].map(m => ({ r: Number(m[1]), color: m[2] }));
const lineas = svg => [...svg.matchAll(/<path class="md-linea"[^>]*? stroke="([^"]+)"/g)].map(m => m[1]);

test('con serie acumulada: el acumulado se dibuja primero y más grande (6,5); el diario, después y más chico (encima)', () => {
  const w = cargar();
  // Los valores del día coinciden con el acumulado (todo el trabajo en el jueves).
  const svg = w.__mini('Medallas de guerra por día', DIAS, [
    { etiqueta: 'Medallas de guerra', color: 'var(--gold)', valores: [700, 0, 0, 0] },
    { etiqueta: 'Acumulado', color: 'var(--purple)', acumulado: true, valores: [700, 700, 700, 700] }
  ], { icono: '🔥' });
  const p = puntos(svg);
  assert.equal(p.length, 8);
  // Por cada día: primero el acumulado (morado, r 5) y luego el diario (dorado, r 3,5).
  // 20-oct-2026: el aro grande (6,5) solo donde coincide con el diario (día 0: 700 y 700); donde no coinciden, radio normal (5).
  for (let d = 0; d < 4; d++){
    assert.deepEqual(p[d * 2], { r: d === 0 ? 6.5 : 5, color: 'var(--purple)' }, `día ${d}: el acumulado va primero${d === 0 ? ' y grande (coincide)' : ' y normal (no coincide)'}`);
    assert.deepEqual(p[d * 2 + 1], { r: 3.5, color: 'var(--gold)' }, `día ${d}: el diario va después y chico`);
  }
  assert.deepEqual(lineas(svg), ['var(--purple)', 'var(--gold)'], 'la línea del acumulado también va debajo de la del diario');
});

test('el orden de las series con acumulado no depende de en qué posición se pasen', () => {
  const w = cargar();
  const svg = w.__mini('Medallas', DIAS, [
    { etiqueta: 'Acumulado', color: 'var(--purple)', acumulado: true, valores: [5, 5, 5, 5] },
    { etiqueta: 'Diario', color: 'var(--gold)', valores: [5, 0, 0, 0] }
  ]);
  const p = puntos(svg);
  assert.deepEqual(p[0], { r: 6.5, color: 'var(--purple)' });
  assert.deepEqual(p[1], { r: 3.5, color: 'var(--gold)' });
});

test('sin serie acumulada se conserva el criterio anterior: la primera abajo (r 5) y la segunda encima (r 3,5)', () => {
  const w = cargar();
  const svg = w.__mini('Ataques y barcos por día', DIAS, [
    { etiqueta: 'Ataques', color: 'var(--gold)', valores: [4, 4, 4, 4] },
    { etiqueta: 'Barcos', color: 'var(--purple)', valores: [4, 4, 4, 4] }
  ], { icono: '⚔️' });
  const p = puntos(svg);
  assert.equal(p.length, 8);
  for (let d = 0; d < 4; d++){
    assert.deepEqual(p[d * 2], { r: 5, color: 'var(--gold)' });
    assert.deepEqual(p[d * 2 + 1], { r: 3.5, color: 'var(--purple)' });
  }
  assert.deepEqual(lineas(svg), ['var(--gold)', 'var(--purple)']);
});

test('la llamada real de «Medallas de guerra por día» marca la serie «Acumulado» con acumulado: true', () => {
  assert.ok(/etiqueta: 'Acumulado', color: 'var\(--purple\)', acumulado: true,/.test(fuente));
  // «Ataques y barcos por día» no lleva acumulado: ninguna de sus dos series lo es.
  const llamada = fuente.slice(fuente.indexOf("_dispersionMiniHtml('Ataques y barcos por día'"));
  assert.ok(!llamada.slice(0, llamada.indexOf("_dispersionMiniHtml('Medallas")).includes('acumulado: true'));
});
