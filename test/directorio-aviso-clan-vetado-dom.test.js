'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (18-nov-2026, pedido de la usuaria): en «Ingresos recientes» de directorio.html, un clan de la hoja
// Conflictos (fuente 'manual', el que se veta desde «Buscar clan», p. ej. LA GRAN CAMPAÑA) debe rotularse
// «vetado», no «rival». Se extrae ingBadgeRivalHtml del <script> inline REAL.
// LÍMITE: se prueba el HTML generado como texto, no un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function ingBadgeRivalHtml'));
assert.ok(grande, 'no se encontró ingBadgeRivalHtml en directorio.html');

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

const badge = new Function(`
  const esc = s => String(s == null ? '' : s);
  ${extraerFuncion(grande, 'ingBadgeRivalHtml')}
  return ingBadgeRivalHtml;
`)();

test('clan de la hoja Conflictos (fuente manual) sale como vetado, con su motivo', () => {
  const h = badge(true, { nombre: 'LA GRAN CAMPAÑA', fuente: 'manual', motivo: 'Clan hostil (Web: Diana, 18/11/2026)', confirmacion: 'tag' });
  assert.match(h, /Estuvo en un clan vetado</);
  assert.doesNotMatch(h, /clan rival/);
  assert.match(h, /estuvo en LA GRAN CAMPAÑA · Clan hostil/);
});

test('clan de la carrera de la temporada sigue saliendo como rival', () => {
  const h = badge(true, { nombre: 'OTRO', fuente: 'currentriverrace', motivo: '', confirmacion: 'tag' });
  assert.match(h, /Estuvo en un clan rival</);
});

test('rival y vetado a la vez dice las dos cosas; sin fuente se conserva «rival»; sin marca no hay aviso', () => {
  assert.match(badge(true, { nombre: 'X', fuente: 'currentriverrace+manual' }), /Estuvo en un clan vetado y rival</);
  assert.match(badge(true, { nombre: 'X' }), /Estuvo en un clan rival</);
  assert.equal(badge(false, null), '');
});

// NUEVO (18-nov-2026, §PF520): con un clan vetado y uno rival a la vez, el aviso lista los dos y dice cuál es cuál.
test('dos clanes (uno vetado y uno rival): el aviso muestra ambos, cada uno con su tipo', () => {
  const principal = { nombre: 'OTRO', fuente: 'currentriverrace', motivo: '', confirmacion: 'tag' };
  const h = badge(true, principal, [principal, { nombre: 'NARANJA x', fuente: 'vetado', motivo: 'Clan vetado', confirmacion: 'tag' }]);
  assert.match(h, /Estuvo en clanes vetados y rivales</);
  assert.match(h, /estuvo en OTRO \(rival\)/);
  assert.match(h, /estuvo en NARANJA x \(vetado\) · Clan vetado/);
  assert.equal((h.match(/ing-rival-detalle/g) || []).length, 2);
});

test('la lista con un solo clan se ve igual que antes, y dos vetados dicen «clanes vetados»', () => {
  const uno = { nombre: 'NARANJA x', fuente: 'vetado', motivo: 'Clan vetado' };
  assert.match(badge(true, uno, [uno]), /Estuvo en un clan vetado</);
  assert.doesNotMatch(badge(true, uno, [uno]), /\(vetado\)/);
  assert.match(badge(true, uno, [uno, { nombre: 'Z', fuente: 'manual' }]), /Estuvo en clanes vetados</);
});
