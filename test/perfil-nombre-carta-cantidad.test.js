'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF387): en las fichas de carta, la cantidad (×N o «1,611/1,000») baja a una segunda línea antes de partir el nombre.
// Se comprueban las reglas CSS del archivo. LÍMITE: jsdom no calcula el ancho de las líneas, así que el comportamiento real se ve solo en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

test('.col-nombre permite envolver y el nombre no pasa del ancho de la tarjeta', () => {
  assert.match(html, /\.col-card \.col-nombre\{flex-wrap:wrap;/);
  assert.match(html, /\.col-card \.col-nombre \.col-nombre-txt\{max-width:100%;\}/);
});

test('la cantidad no se parte y, al bajar de línea, queda pegada a la derecha', () => {
  assert.match(html, /\.col-card \.col-nombre \.cc-count\{flex-shrink:0; white-space:nowrap;\}/);
  assert.match(html, /\.col-card \.col-nombre \.cc-count\{margin-left:auto;\}/);
});

test('el nombre conserva word-break para los nombres que no caben ni solos', () => {
  assert.match(html, /\.col-card \.col-nombre \.col-nombre-txt\{[^}]*word-break:break-word;/);
});
