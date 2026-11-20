'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (20-nov-2026, pedido de la usuaria: «las gráficas de la versión móvil deben ser más altas ... estilo estándar en toda la web»).
// Prueba graficaLienzo() de assets/js/util.js y que las cuatro gráficas de línea (Directorio, Ingresos recientes, perfil y clan) la usan.
// LÍMITE: no prueba cómo se ve en un navegador; las medidas (alto de 254 px a 360 px de pantalla) se tomaron en Chrome a mano.

function cargar(matches){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div></div>');
  if (matches !== undefined) window.matchMedia = q => ({ matches, media: q });
  return window;
}

test('graficaLienzo: en escritorio devuelve las medidas pedidas', () => {
  const w = cargar(false);
  assert.deepEqual(JSON.parse(JSON.stringify(w.graficaLienzo(960, 460))), { ancho: 960, alto: 460, movil: false });
  assert.deepEqual(JSON.parse(JSON.stringify(w.graficaLienzo(640, 220))), { ancho: 640, alto: 220, movil: false });
});

test('graficaLienzo: en celular devuelve el mismo lienzo 480 x 420 para todas las gráficas', () => {
  const w = cargar(true);
  const a = JSON.parse(JSON.stringify(w.graficaLienzo(960, 460)));
  const b = JSON.parse(JSON.stringify(w.graficaLienzo(960, 320)));
  const c = JSON.parse(JSON.stringify(w.graficaLienzo(640, 220)));
  assert.deepEqual(a, { ancho: 480, alto: 420, movil: true });
  assert.deepEqual(b, a);
  assert.deepEqual(c, a);
});

test('graficaLienzo: sin matchMedia usa las medidas de escritorio', () => {
  const w = cargar();
  delete w.matchMedia;
  assert.equal(w.graficaLienzo(960, 320).movil, false);
});

test('las cuatro gráficas de línea piden su lienzo a graficaLienzo()', () => {
  const raiz = path.join(__dirname, '..');
  const dir = fs.readFileSync(path.join(raiz, 'directorio.html'), 'utf8');
  const per = fs.readFileSync(path.join(raiz, 'perfil.html'), 'utf8');
  const cla = fs.readFileSync(path.join(raiz, 'clan.html'), 'utf8');
  assert.equal((dir.match(/const _lz = graficaLienzo\(/g) || []).length, 2, 'directorio.html: lineChartSvg y la de Ingresos recientes');
  assert.equal((per.match(/const _lz = graficaLienzo\(/g) || []).length, 1, 'perfil.html: la gráfica de línea del perfil');
  assert.equal((cla.match(/const _lz = graficaLienzo\(/g) || []).length, 1, 'clan.html: copas del clan');
  assert.ok(!/Math\.round\(960 \* zoom\)/.test(dir + per + cla), 'ningún lienzo de 960 fijo');
  assert.ok(!/Math\.round\(640 \* zoom\)/.test(dir), 'ningún lienzo de 640 fijo');
});
