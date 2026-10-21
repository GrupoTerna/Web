'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScripts } = require('./load-browser-script');

// NUEVO (20-oct-2026, pedido de la usuaria): sombreado ligero e intercalado por temporada en las gráficas.
// Una temporada empieza el primer lunes del mes. La banda va desde el último punto de la temporada anterior
// hasta el último punto de la temporada; solo se sombrean las temporadas de clave par (mes par: enero, marzo…).
// LÍMITE: prueba el SVG generado, no cómo se ve en un navegador.
const ctx = loadBrowserScripts(['assets/js/features/timeline-svg.js']);
const d = (y, m, dia) => new ctx.Date(y, m - 1, dia); // el Date del sandbox: el de Node no pasa el instanceof de la función
const xPos = i => 100 + i * 10;

test('claveTemporadaFecha: antes del primer lunes del mes sigue en la temporada anterior', () => {
  // Septiembre 2026: el primer lunes es el 7.
  assert.equal(ctx.claveTemporadaFecha(d(2026, 9, 6)), ctx.claveTemporadaFecha(d(2026, 8, 20)), 'domingo 6/9 aún es agosto');
  assert.notEqual(ctx.claveTemporadaFecha(d(2026, 9, 7)), ctx.claveTemporadaFecha(d(2026, 9, 6)), 'lunes 7/9 abre septiembre');
  // Enero 2026: el primer lunes es el 5; el 4/1 todavía es diciembre de 2025.
  assert.equal(ctx.claveTemporadaFecha(d(2026, 1, 4)), 2025 * 12 + 11);
});

test('sombrea solo las temporadas de clave par, desde el último punto de la anterior hasta el último de la suya', () => {
  // Julio (clave par: mes 6) = índices 0-1; agosto (mes 7) = 2-3; septiembre (mes 8, par) = 4-5.
  const fechas = [d(2026, 7, 16), d(2026, 7, 19), d(2026, 8, 6), d(2026, 8, 9), d(2026, 9, 10), d(2026, 9, 13)];
  const svg = ctx.bandasTemporadaSvg(fechas, xPos, 20, 220, 100);
  const rects = [...svg.matchAll(/<rect class="banda-temporada" x="([\d.]+)" y="20" width="([\d.]+)" height="200">/g)];
  assert.equal(rects.length, 2, 'julio y septiembre llevan sombra; agosto no');
  assert.deepEqual([rects[0][1], rects[0][2]], ['100.0', '10.0'], 'julio: del borde izquierdo a su último punto (índice 1)');
  assert.deepEqual([rects[1][1], rects[1][2]], ['130.0', '20.0'], 'septiembre: del último punto de agosto (3) al último de septiembre (5)');
});

test('una sola temporada, sin fechas o con puntos sin fecha no rompe nada', () => {
  assert.equal(ctx.bandasTemporadaSvg([], xPos, 0, 100, 100), '');
  assert.equal(ctx.bandasTemporadaSvg([null, null], xPos, 0, 100, 100), '');
  // Una temporada impar (agosto) sola: sin sombra.
  assert.equal(ctx.bandasTemporadaSvg([d(2026, 8, 6), d(2026, 8, 9)], xPos, 0, 100, 100), '');
  // Un punto sin fecha en medio se cuenta en la temporada del anterior (septiembre, par).
  const svg = ctx.bandasTemporadaSvg([d(2026, 9, 10), null, d(2026, 9, 13)], xPos, 0, 100, 100);
  assert.equal((svg.match(/<rect/g) || []).length, 1);
  assert.ok(svg.includes('width="20.0"'));
});

test('el prefijo de clase se respeta', () => {
  const svg = ctx.bandasTemporadaSvg([d(2026, 7, 16), d(2026, 7, 19)], xPos, 0, 100, 100, { prefijoClase: 'ing-' });
  assert.ok(svg.includes('class="ing-banda-temporada"'));
});
