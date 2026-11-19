'use strict';
// 19-nov-2026 (pedido de la usuaria, §PF378): en «Buscar clan» las filas de la tabla de inactivos atravesaban el encabezado fijo al desplazar,
// porque la regla `.inf-panel … thead th` de admin.html lo dejaba casi transparente. El fondo debe ser un color sólido.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

test('los encabezados de las tablas del panel «Cruce con roster» tienen fondo opaco', () => {
  const reglas = HTML.split('\n').filter(l => /\.inf-panel \.roster-table thead th, \.inf-panel \.tabla-coincidencias-wrap thead th\{/.test(l));
  assert.ok(reglas.length >= 1, 'no se encontró la regla de encabezado del panel (¿se reorganizó admin.html?)');
  reglas.forEach(r => {
    const m = r.match(/background(?:-color)?:\s*([^;]+);/);
    if (!m) return;
    assert.ok(/^#[0-9a-f]{6}\b/i.test(m[1].trim()), 'fondo no opaco: ' + m[1]);
  });
});
