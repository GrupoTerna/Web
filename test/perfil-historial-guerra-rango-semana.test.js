'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (22-oct-2026, pedido de la usuaria): el selector de semana del «Historial de guerra» de perfil.html debe decir
// «S3 (19 OCT – 25 OCT)» (rango lunes–domingo, como Valores diarios de guerra.html), no solo «(11 OCT)».
// Se extrae del <script> inline REAL de perfil.html rangoSemanaHistorialGuerra(). LÍMITE: no prueba el <select> en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const m = html.match(/function rangoSemanaHistorialGuerra\(f\)\{[\s\S]*?\n\}\n/);
assert.ok(m, 'no se encontró rangoSemanaHistorialGuerra() en perfil.html');
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const rango = new Function('MESES_ES', m[0] + '\nreturn rangoSemanaHistorialGuerra;')(MESES_ES);

test('domingo de cierre: S1 de la temporada 6 es 05 OCT – 11 OCT (captura de la usuaria)', () => {
  assert.equal(rango({ dia: 11, mes: 10, anio: 2026 }), '05 OCT – 11 OCT');
});

test('el rango no depende de qué día de jue a dom sea el último registro', () => {
  for (const dia of [22, 23, 24, 25]) assert.equal(rango({ dia, mes: 10, anio: 2026 }), '19 OCT – 25 OCT');
});

test('un registro de lunes a miércoles (entrenamiento) cuenta para la semana anterior', () => {
  for (const dia of [26, 27, 28]) assert.equal(rango({ dia, mes: 10, anio: 2026 }), '19 OCT – 25 OCT');
});

test('semana que cruza de mes y de año', () => {
  assert.equal(rango({ dia: 1, mes: 11, anio: 2026 }), '26 OCT – 01 NOV');
  assert.equal(rango({ dia: 3, mes: 1, anio: 2027 }), '28 DIC – 03 ENE');
});

test('sin fecha no devuelve rango', () => {
  assert.equal(rango(null), '');
  assert.equal(rango({}), '');
});

test('el selector usa el rango con el prefijo S, como guerra.html', () => {
  assert.match(html, /const label = 'S' \+ s \+ \(rango \? ` \(\$\{rango\}\)` : ''\);/);
  assert.ok(!html.includes("'Semana ' + s + (f ?"), 'quedó la etiqueta antigua de un solo día');
});
