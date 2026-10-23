'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (22-oct-2026, pedido de la usuaria): el selector de semana del «Historial de guerra» de perfil.html debe decir
// «S3 (19 OCT – 25 OCT)» (rango lunes–domingo, como Valores diarios de guerra.html), no solo «(11 OCT)».
// Se extrae del <script> inline REAL de perfil.html rangoSemanaHistorialGuerra(). LÍMITE: no prueba el <select> en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const fnDe = nombre => { const r = html.match(new RegExp('function ' + nombre + '\\(f\\)\\{[\\s\\S]*?\\n\\}\\n')); assert.ok(r, 'no se encontró ' + nombre + '() en perfil.html'); return r[0]; };
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const { rango, lunes } = new Function('MESES_ES', fnDe('lunesSemanaHistorialGuerra') + fnDe('rangoSemanaHistorialGuerra') + '\nreturn { rango: rangoSemanaHistorialGuerra, lunes: lunesSemanaHistorialGuerra };')(MESES_ES);

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

test('la temporada (año y mes) sale del lunes: una semana que cruza de mes o de año pertenece al mes y año de su lunes', () => {
  // Lunes 26-oct, domingo 01-nov: temporada de octubre aunque el último registro sea de noviembre.
  assert.deepEqual(lunes({ dia: 1, mes: 11, anio: 2026 }), { dia: 26, mes: 10, anio: 2026 });
  // Lunes 28-dic-2026, domingo 03-ene-2027: año 2026 y mes diciembre.
  assert.deepEqual(lunes({ dia: 3, mes: 1, anio: 2027 }), { dia: 28, mes: 12, anio: 2026 });
  // Lunes 30-nov, jueves 03-dic: la semana es de noviembre.
  assert.deepEqual(lunes({ dia: 3, mes: 12, anio: 2026 }), { dia: 30, mes: 11, anio: 2026 });
  // Martes a domingo del mes siguiente, lunes del mes anterior (caso de la usuaria).
  assert.deepEqual(lunes({ dia: 6, mes: 12, anio: 2026 }), { dia: 30, mes: 11, anio: 2026 });
  assert.equal(lunes(null), null);
});

test('construirSelectoresHistorialGuerra() y filasFiltradasHistorialGuerra() agrupan por el lunes, no por el último día', () => {
  assert.equal((html.match(/lunesSemanaHistorialGuerra\(f\) \|\| f/g) || []).length, 2, 'año y mes deben salir del lunes en el armado de selectores y en el filtro');
  assert.match(html, /mes: lunes \? lunes\.mes : null/);
});

test('comportamiento: la semana 26 OCT – 01 NOV queda en la temporada de octubre de 2026 y el filtro la encuentra', () => {
  const fnsHist = ['parsearFechaHistorial', 'lunesSemanaHistorialGuerra'].map(n => {
    const r = html.match(new RegExp('function ' + n + '\\([a-z]+\\)\\{[\\s\\S]*?\\n\\}\\n')); assert.ok(r, n); return r[0];
  }).join('');
  const construir = html.match(/function construirSelectoresHistorialGuerra\(registros\)\{[\s\S]*?\n\}\n/);
  assert.ok(construir, 'no se encontró construirSelectoresHistorialGuerra()');
  const api = new Function('MESES_ES', fnsHist + construir[0] + '\nreturn construirSelectoresHistorialGuerra;')(MESES_ES);
  const porAnio = api([
    { fecha: '01/11/2026 04:34:05', temporadaInterna: 6, semana: 4 }, // domingo; lunes 26-oct
    { fecha: '25/10/2026 04:34:05', temporadaInterna: 6, semana: 3 },
    { fecha: '03/01/2027 04:34:05', temporadaInterna: 9, semana: 5 }, // domingo; lunes 28-dic-2026
  ]);
  assert.deepEqual(Object.keys(porAnio).sort(), ['2026']);
  assert.equal(porAnio['2026']['6'].mes, 10);
  assert.equal(porAnio['2026']['9'].mes, 12);
  assert.deepEqual(Object.keys(porAnio['2026']['6'].semanas).sort(), ['3', '4']);
});
