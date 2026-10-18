'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-oct-2026, PF118): la lista «¿Cuál es el torneo principal?» ya no se limita a los torneos de hoy con Tag_Tor:
// ofrece también los planificados o sin link (marcados «(aún sin link)») y envía su ID como vínculo; y las listas de
// torneos y sorteos van de la más reciente a la más antigua. [→ Contexto_Base_Web.md §PF118]
// LÍMITE: se extraen tramos del <script> real con DOM simulado; no prueba el backend ni el aspecto en pantalla.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
function tramo(inicio, fin, nombre){
  const i = HTML.indexOf(inicio);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados`);
  return HTML.slice(i, f);
}
const CODIGO = [
  tramo('function ordenarRecientesPrimero(lista){', 'async function cargarTorneosHoy(){', 'ordenarRecientesPrimero()'),
  tramo('function renderTorneoPrincipalLista(){', '/**\n * cargarNomMultisAdmins()', 'renderTorneoPrincipalLista()')
].join('\n');

function montar(torneos, accion, seleccionado){
  const dom = new JSDOM(`<body>
    <select id="torneoAccion"><option value="${accion}" selected>x</option></select>
    <select id="tSelectHoy"><option value="${seleccionado || ''}" selected>x</option></select>
    <div id="torneoPrincipalLista"></div><div id="torneoPrincipalElegidoMsg"></div></body>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  w.eval(CODIGO + '\nthis.__orden = ordenarRecientesPrimero; this.__render = renderTorneoPrincipalLista;');
  w.eval('var torneoTorneoPrincipalTag = "";');
  w.torneosHoyData = torneos;
  w.eval('torneosHoyData = this.torneosHoyData;');
  return w;
}

const T = [
  { id: 'T1', fecha: '2026-10-16T05:00:00.000Z', hora: '21:00:00', fechaTxt: '16/10/2026', tagTor: '#AAA', link: 'https://x/?id=AAA', estado: 'Realizado' },
  { id: 'T2', fecha: '2026-10-20T05:00:00.000Z', hora: '20:00:00', fechaTxt: '20/10/2026', tagTor: '', link: '', estado: 'Planificado' },
  { id: 'T3', fecha: '2026-10-16T05:00:00.000Z', hora: '22:30:00', fechaTxt: '16/10/2026', tagTor: '#BBB', link: 'https://x/?id=BBB', estado: 'Realizado' }
];

test('ordenarRecientesPrimero: fecha y hora de más reciente a más antigua, sin mutar la lista', () => {
  const w = montar(T, 'registrar');
  const copia = JSON.stringify(T);
  assert.deepEqual(Array.from(w.__orden(T), t => t.id), ['T2', 'T3', 'T1']);
  assert.equal(JSON.stringify(T), copia);
});

test('la lista de principal incluye planificados/sin link con «(aún sin link)» y su ID como vínculo', () => {
  const w = montar(w0(), 'registrar');
  w.__render();
  const det = Array.from(w.document.querySelectorAll('#torneoPrincipalLista details'));
  assert.deepEqual(det.map(d => d.dataset.tagTor), ['T2', '#BBB', '#AAA']);
  assert.match(det[0].textContent, /\(aún sin link\)/);
  assert.doesNotMatch(det[1].textContent, /aún sin link/);
  assert.doesNotMatch(w.document.getElementById('torneoPrincipalLista').textContent, /No hay torneos de hoy/);
});

test('en «Modificar» se excluye el torneo que se está modificando', () => {
  const w = montar(w0(), 'modificar', 'T2');
  w.__render();
  const ids = Array.from(w.document.querySelectorAll('#torneoPrincipalLista .cat-titulo'), e => e.textContent.split(' ')[0]);
  assert.deepEqual(ids, ['T3', 'T1']);
});

function w0(){ return montar(T, 'registrar').__orden(T); }
