'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (29-oct-2026, §PF294): los participantes agregados a mano en sorteo.html (elegidos de las sugerencias, con Tag, o «de fuera», sin Tag) cuentan como
// participantes aunque no ganen. Se extrae de sorteo.html la participantesManualesParaGuardar() real y se ejecuta con listas de ejemplo.

const html = fs.readFileSync(path.join(__dirname, '..', 'sorteo.html'), 'utf8');
const ini = html.indexOf('  function participantesManualesParaGuardar(ganador){');
const fin = html.indexOf('// guarda/actualiza la resolución de UN ganador', ini);
assert.ok(ini > 0 && fin > ini, 'no se encontró participantesManualesParaGuardar() en sorteo.html');
const armar = (participants, winners) =>
  new Function('participants', 'winners', html.slice(ini, fin) + '\nreturn participantesManualesParaGuardar;')(participants, winners || []);

test('solo salen los agregados a mano; los calificados no', () => {
  const f = armar([
    { name: 'Ana', weight: 3, tag: '#AAA', clan: 'Grupo' },
    { name: 'Beto', weight: 1, clan: null, manual: true },
    { name: 'Carla', weight: 2, tag: '#CCC', clan: 'Mini', manual: true }
  ]);
  assert.deepEqual(f(null), [
    { nombre: 'Beto', tag: '', tickets: 1 },
    { nombre: 'Carla', tag: '#CCC', tickets: 2 }
  ]);
});

test('el ganador que se guarda no viaja de nuevo, ni con el nombre editado ni por Tag', () => {
  const f = armar([
    { name: 'Beto', weight: 1, manual: true },
    { name: 'Carla', weight: 1, manual: true },
    { name: 'Dani', weight: 1, manual: true, tag: '#DDD' },
    { name: 'Eli', weight: 1, manual: true }
  ]);
  const lista = f({ pickedName: 'Beto', editedName: 'CARLA ', tag: '#ddd' });
  assert.deepEqual(lista.map(p => p.nombre), ['Eli']);
});

test('los ganadores ya guardados antes tampoco viajan', () => {
  const f = armar(
    [{ name: 'Beto', weight: 1, manual: true }, { name: 'Fer', weight: 1, manual: true }],
    [{ pickedName: 'Beto', editedName: 'Beto Pérez', tag: null }]
  );
  assert.deepEqual(f({ pickedName: 'Otro', editedName: 'Otro' }).map(p => p.nombre), ['Fer']);
});

test('nombres vacíos se descartan y un peso inválido queda vacío', () => {
  const f = armar([{ name: '  ', manual: true }, { name: 'Eli', weight: 'x', manual: true }, { name: ' Fer ', weight: 0, manual: true }]);
  assert.deepEqual(f(), [{ nombre: 'Eli', tag: '', tickets: '' }, { nombre: 'Fer', tag: '', tickets: 0 }]);
});

test('el envío al backend incluye participantesManuales', () => {
  assert.match(html, /participantesManuales: participantesManualesParaGuardar\(w\)/);
});

test('hay sugerencias de miembros con el endpoint existente y un botón «Agregar de fuera»', () => {
  assert.match(html, /webAdminBuscarMiembroSugerencias/);
  assert.match(html, /id="sugerenciasParticipante"[^>]*role="listbox"/);
  assert.match(html, /id="newParticipant"[^>]*role="combobox"/);
  assert.match(html, />Agregar de fuera</);
});

test('el miembro elegido entra con su Tag y su clan', () => {
  const i = html.indexOf('  function agregarMiembroSugerido(m){');
  const j = html.indexOf('  function elegirSugerencia(i){', i);
  assert.ok(i > 0 && j > i);
  const cuerpo = html.slice(i, j);
  assert.match(cuerpo, /clan: m\.clan \|\| null, tag: m\.tag, manual: true/);
  assert.match(cuerpo, /ya está en la lista/);
});

test('el ganador sin Tag recibe un aviso y el foco en el campo Tag', () => {
  assert.match(html, /id="winnerResTagAviso"/);
  assert.match(html, /winnerResolucionForm\.dataset\.sinTag = w\.tag \? '' : '1'/);
  assert.match(html, /if \(!w\.tag\) winnerResTag\.focus\(/);
});

test('el ganador sin Tag puede buscar su Tag por nombre con la misma acción de sugerencias', () => {
  assert.match(html, /id="winnerResTagBuscarWrap"/);
  assert.match(html, /id="winnerResTagBuscarBtn"/);
  const i = html.indexOf('  function buscarTagGanador(){');
  const j = html.indexOf("document.getElementById('winnerResTagBuscarBtn')", i);
  assert.ok(i > 0 && j > i);
  const cuerpo = html.slice(i, j);
  assert.match(cuerpo, /webAdminBuscarMiembroSugerencias/);
  assert.match(cuerpo, /elegirTagGanador\(m\.tag, m\.nombre\)/);
  assert.match(html, /winnerResTagBuscar\.value = w\.editedName/);
});

test('el buscador del ganador acepta Tag o nombre, se ve siempre y ofrece usar un Tag que no está en el directorio', () => {
  assert.match(html, /placeholder="Buscar por Tag o nombre/);
  assert.match(html, /winnerResTagBuscarWrap\.style\.display = 'block'/);
  const i = html.indexOf('  function normalizarTagBuscado(q){');
  const j = html.indexOf('  function elegirTagGanador(tag, nombre){', i);
  assert.ok(i > 0 && j > i, 'no se encontraron las funciones del buscador');
  const f = new Function(html.slice(i, j) + '\nreturn { normalizarTagBuscado, ordenarResultadosTag };')();
  // un Tag escrito con o sin # y en minúsculas se normaliza; un nombre no parece Tag
  assert.equal(f.normalizarTagBuscado('#8pq2y'), '#8PQ2Y');
  assert.equal(f.normalizarTagBuscado('  8PQ2Y '), '#8PQ2Y');
  assert.equal(f.normalizarTagBuscado('Antonio'), '');
  assert.equal(f.normalizarTagBuscado('#8P'), '');
  // el Tag exacto sale primero
  const lista = [{ tag: '#8PQ2YL', nombre: 'Otro' }, { tag: '#8PQ2Y', nombre: 'Justo' }];
  assert.equal(f.ordenarResultadosTag(lista, '8pq2y')[0].nombre, 'Justo');
  // si no hay coincidencia exacta, se conserva el orden recibido
  assert.deepEqual(f.ordenarResultadosTag(lista, 'ant').map(m => m.nombre), ['Otro', 'Justo']);
});

test('los resultados del buscador de Tag son un grupo de botones y el autocompletado conserva su listbox con la regla silenciada a propósito', () => {
  assert.match(html, /id="winnerResTagResultados" role="group"/);
  assert.doesNotMatch(html, /id="winnerResTagResultados"[^>]*role="listbox"/);
  const i = html.indexOf('  function buscarTagGanador(){');
  const j = html.indexOf("document.getElementById('winnerResTagBuscarBtn')", i);
  assert.doesNotMatch(html.slice(i, j), /setAttribute\('role', 'option'\)/);
  assert.match(html, /<!-- \[html-validate-disable-next prefer-native-element -- [^\]]*\] -->\s*<div id="sugerenciasParticipante"/);
});
