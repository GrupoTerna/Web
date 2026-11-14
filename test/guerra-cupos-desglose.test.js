'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (6-nov-2026, pedido de la usuaria): desglose de cupos en guerra.html. Reservadas, reemplazables y cuentas que se pueden agregar
// se muestran por separado (bajo «N/M atacaron hoy» de cada tarjeta y en «Participación de Hoy»), con la aclaración de que las
// reemplazables NO se suman a los cupos libres. Se extraen del <script> inline REAL las funciones; se prueba texto y DOM simulado, no un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function desgloseCuposClan'));
assert.ok(grande, 'no se encontró desgloseCuposClan en guerra.html');
const ini = grande.indexOf('const ATAQUES_MAX_HOY');
const fin = grande.indexOf('/* NUEVO (24-oct-2026, tanda 14)');
assert.ok(ini >= 0 && fin > ini, 'marcadores no encontrados');

function construir(doc){
  // §PF412: aplicarCuposEnTarjetas() compara por Tag con clanTagDeNombreGuerra() (que vive fuera de este tramo); aquí no hay mapa de Tags, así que queda el respaldo por nombre. La comparación por Tag se prueba en guerra-clan-preseleccionado-dom.test.js.
  return new Function('document', `function clanTagDeNombreGuerra(){ return ''; }
    ${grande.slice(ini, fin)}
    return { desgloseCuposClan, textoReemplazablesYExtras, textoCuposTarjeta, aplicarCuposEnTarjetas, fijar: v => { cuposPorClanGuerra = v; } };`)(doc);
}
const mk = (n, extra) => Array.from({ length: n }, (_, i) => Object.assign({ tag: '#T' + i, nombre: 'J' + i }, extra));
// Ejemplo de la usuaria: 38 sin pendientes + 2 con pendientes + 2 fuera del clan = 42 reservadas; 3 reemplazables; quedan 8 de 50.
const clan = {
  clan: 'GrupoXTerna™2',
  reservadas: [...mk(38, { ataquesHoy: 4 }), ...mk(2, { ataquesHoy: 2 }), ...mk(2, { inactiva: true, ataquesHoy: 1 })],
  disponibles: mk(3, {})
};

test('el desglose separa reservadas, reemplazables y cupos libres sin mezclarlos', () => {
  const d = construir(null).desgloseCuposClan(clan);
  assert.deepEqual({ ...d }, { reservadas: 42, conPendientes: 2, sinPendientes: 38, fuera: 2, reemplazables: 3, libres: 8, extras: 5 });
  assert.equal(d.reservadas + d.libres, 50, 'reservadas + libres = tope del día');
  assert.equal(d.reemplazables + d.extras, d.libres, 'los cupos libres = reemplazables + extras (14-nov-2026)');
});

test('sin cupos libres no se inventan cuentas nuevas y el tope nunca da negativo', () => {
  const lleno = { clan: 'X', reservadas: mk(52, { ataquesHoy: 4 }), disponibles: [] };
  const c = construir(null);
  assert.equal(c.desgloseCuposClan(lleno).libres, 0);
  assert.match(c.textoCuposTarjeta(c.desgloseCuposClan(lleno)), /Sin cupos libres para cuentas nuevas/);
});

test('la línea de la tarjeta dice cuántas cuentas nuevas pueden participar y de dónde salen los cupos usados', () => {
  const c = construir(null);
  const t = c.textoCuposTarjeta(c.desgloseCuposClan(clan));
  assert.match(t, /Pueden participar <strong>8<\/strong> cuentas nuevas más/);
  assert.match(t, /3 reemplazables y 5 extras; 42 de 50 cupos usados: 38 sin ataques pendientes, 2 con ataques pendientes y 2 fuera del clan/);
});

test('aplicarCuposEnTarjetas pinta la línea en la tarjeta de su clan y oculta las demás', () => {
  const dom = new JSDOM('<div id="clanGrid"><div class="clan-cupos" data-clan="GrupoXTerna™2" hidden></div><div class="clan-cupos" data-clan="Otro" hidden></div></div>');
  const c = construir(dom.window.document);
  c.fijar([clan]);
  c.aplicarCuposEnTarjetas();
  const [a, b] = dom.window.document.querySelectorAll('.clan-cupos');
  assert.equal(a.hidden, false);
  assert.match(a.textContent, /Pueden participar 8 cuentas nuevas más/);
  assert.equal(b.hidden, true);
  c.fijar(null); // sin sesión de admin o fuera de día de guerra
  c.aplicarCuposEnTarjetas();
  assert.equal(a.hidden, true);
  assert.equal(a.innerHTML, '');
});

test('«Participación de Hoy» muestra tres filas y aclara que las reemplazables no se suman a los cupos libres', () => {
  assert.match(html, /const d = desgloseCuposClan\(c\);/);
  assert.match(html, /<span class="part-res-n">🔒 \$\{d\.reservadas\}<\/span>/);
  assert.match(html, /<span class="part-res-n">✅ \$\{d\.reemplazables\}<\/span>/);
  assert.match(html, /<span class="part-res-n">➕ \$\{d\.libres\}<\/span>/);
  assert.match(html, /<strong>\$\{textoReemplazablesYExtras\(d\)\}<\/strong>/);
  assert.match(html, /Las reemplazables ya están dentro de este número/);
});

test('la tarjeta tiene su fila propia en la grilla (cupos en la 6 y pronóstico en la 7) y se oculta al ver otro día', () => {
  assert.match(html, /grid-row:span 7;/);
  assert.match(html, /\.clan-card > \.clan-cupos\{grid-row:6;\}/);
  assert.match(html, /\.clan-card > \.clan-pron\{grid-row:7;\}/);
  assert.match(html, /<div class="clan-cupos" \$\{atributosClanGuerra\(nombre\)\} hidden><\/div>/); // §PF412: el nombre y el Tag de la tarjeta salen de atributosClanGuerra()
  assert.match(html, /cupos\.style\.display = conDia \? 'none' : ''/);
});

test('14-nov-2026: el desglose nombra las reemplazables y las extras (ejemplo de la captura: 43 reservadas, 2 reemplazables, 7 libres, 5 extras)', () => {
  const c = construir(null);
  const captura = { clan: 'GrupoXTerna™', reservadas: [...mk(42, { ataquesHoy: 4 }), ...mk(1, { ataquesHoy: 1 })], disponibles: mk(2, {}) };
  const d = c.desgloseCuposClan(captura);
  assert.equal(d.libres, 7);
  assert.equal(d.extras, 5);
  assert.equal(c.textoReemplazablesYExtras(d), '2 reemplazables y 5 extras');
  assert.equal(c.textoReemplazablesYExtras({ reemplazables: 1, extras: 1 }), '1 reemplazable y 1 extra');
  assert.equal(c.desgloseCuposClan({ clan: 'X', reservadas: mk(49, { ataquesHoy: 4 }), disponibles: mk(3, {}) }).extras, 0, 'con más reemplazables que libres, extras no baja de 0');
});
