'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (06-nov-2026, §PF396, pedido de la usuaria): en las tarjetas de «Ingresos recientes» de directorio.html, el emoji de
// «⚔️ Ataques», «⭐ Medallas» y «🚢 Barcos» (bloque «Semana actual») bajaba solo a otra línea porque la etiqueta partía en el
// espacio. Ahora la etiqueta va en una línea y su letra se ajusta al ancho de la cuadrícula.
//
// LÍMITE: lee el texto de la página. No mide el dibujo real (jsdom no calcula anchos); eso se comprobó aparte, con Chrome, a
// 400, 275, 236, 214 y 200 px de ancho de cuadrícula: una sola línea y sin desborde en las tres pastillas.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');

test('la cuadrícula de «Semana actual» lleva la clase que la hace contenedor de ancho', () => {
  const i = html.indexOf("'Semana actual'");
  assert.ok(i > 0, 'no se encontró el subtítulo «Semana actual» en nuevoCardHtml()');
  const tramo = html.slice(i, i + 700);
  assert.match(tramo, /<div class="nc-stats-grid nc-stats-semana">/);
  for (const etiqueta of ['⚔️ Ataques', '⭐ Medallas', '🚢 Barcos']) {
    assert.ok(tramo.includes(`'${etiqueta}', { semana: true }`), `falta la pastilla «${etiqueta}» con { semana: true }`);
  }
});

test('el CSS deja la etiqueta de la pastilla de semana en una línea y con letra ajustable', () => {
  const contenedor = html.match(/\.nuevo-card \.nc-stats-semana\{([^}]*)\}/);
  assert.ok(contenedor, 'falta la regla .nc-stats-semana');
  assert.match(contenedor[1], /container-type:\s*inline-size/);
  const etiqueta = html.match(/\.nuevo-card \.nc-stat-semana span\{([^}]*)\}/);
  assert.ok(etiqueta, 'falta la regla .nc-stat-semana span');
  assert.match(etiqueta[1], /white-space:\s*nowrap/);
  assert.match(etiqueta[1], /overflow-wrap:\s*normal/);
  assert.match(etiqueta[1], /font-size:\s*11px/, 'falta el tamaño de respaldo para navegadores sin unidades cqw');
  assert.match(etiqueta[1], /font-size:\s*clamp\([^)]*cqw[^)]*\)/);
});
