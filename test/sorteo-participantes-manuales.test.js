'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (29-oct-2026, §PF294 punto 9): los participantes agregados a mano en sorteo.html no tienen Tag y cuentan como participantes aunque no ganen.
// Se extrae de sorteo.html la participantesManualesParaGuardar() real y se ejecuta con listas de ejemplo.

const html = fs.readFileSync(path.join(__dirname, '..', 'sorteo.html'), 'utf8');
const ini = html.indexOf('  function participantesManualesParaGuardar(ganador){');
const fin = html.indexOf('// guarda/actualiza la resolución de UN ganador', ini);
assert.ok(ini > 0 && fin > ini, 'no se encontró participantesManualesParaGuardar() en sorteo.html');
const armar = (participants) => new Function('participants', html.slice(ini, fin) + '\nreturn participantesManualesParaGuardar;')(participants);

test('solo salen los participantes sin Tag (los calificados no)', () => {
  const f = armar([
    { name: 'Ana', weight: 3, tag: '#AAA', clan: 'Grupo' },
    { name: 'Beto', weight: 1, clan: null },
    { name: 'Carla', weight: 2 }
  ]);
  assert.deepEqual(f(null), [
    { nombre: 'Beto', tickets: 1 },
    { nombre: 'Carla', tickets: 2 }
  ]);
});

test('el ganador que se guarda no viaja de nuevo, ni con el nombre editado', () => {
  const f = armar([
    { name: 'Beto', weight: 1 },
    { name: 'Carla', weight: 1 },
    { name: 'Dani', weight: 1 }
  ]);
  const lista = f({ pickedName: 'Beto', editedName: 'CARLA ' });
  assert.deepEqual(lista.map(p => p.nombre), ['Dani']);
});

test('nombres vacíos se descartan y un peso inválido queda vacío', () => {
  const f = armar([{ name: '  ' }, { name: 'Eli', weight: 'x' }, { name: ' Fer ', weight: 0 }]);
  assert.deepEqual(f(), [{ nombre: 'Eli', tickets: '' }, { nombre: 'Fer', tickets: 0 }]);
});

test('el envío al backend incluye participantesManuales', () => {
  assert.match(html, /participantesManuales: participantesManualesParaGuardar\(w\)/);
});
