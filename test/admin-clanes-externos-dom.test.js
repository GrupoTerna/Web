'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-nov-2026, pedido de la usuaria, §PF508): tarjeta «Clanes externos» de admin.html. Lista los clanes externos, vetados y rivales con los jugadores nuestros que pasaron por ellos;
// clanes y jugadores llevan enlace dentro de la web y a RoyaleAPI y CWStats con su ícono. Se extraen las funciones REALES del <script> de admin.html entre marcadores y la estructura se lee del HTML real.
// LÍMITE: DOM y backend simulados; no prueba el backend real ni el aspecto en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const UTIL = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'util.js'), 'utf8');
const trozo = (ini, fin, nombre) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f);
};
const CODIGO = trozo('let _ceDatos = null;', 'async function verificarInfiltradosClan(){', 'tarjeta Clanes externos');
const ETIQUETA = trozo('function _etiquetaPuntoClan(p){', '/** Tabla de «pasaron por este clan»', '_etiquetaPuntoClan()');
const TARJETA = trozo('<div class="card pf-cinta" id="cardClanesExternos"', '<!-- 5-nov-2026 (pedido de la usuaria): el grupo «Directorio»', 'HTML de la tarjeta');

const DATOS = { ok: true, actualizado: '2026-11-17 09:05', indiceCompleto: true, total: 3, clanes: [
  { tag: '#AAA111', nombre: 'Rivales <b>X</b>', tipos: ['rival'], hoy: true, jugadores: [
    { tag: '#PJ1', nombre: 'Ana', semanas: 3, primera: { temporada: 5, semana: 1, supercell: '' }, ultima: { temporada: 5, semana: 3, supercell: '' } },
    { tag: '#PJ2', nombre: 'Beto', semanas: 1, primera: { temporada: -7, semana: 2, supercell: '2024-08' }, ultima: { temporada: -7, semana: 2, supercell: '2024-08' } } ] },
  { tag: '#BBB222', nombre: 'Vetado Uno', tipos: ['rival', 'vetado'], hoy: true, jugadores: [] },
  { tag: '#CCC333', nombre: 'Solo Externo', tipos: [], hoy: false, jugadores: [
    { tag: '#PJ3', nombre: 'Cami', semanas: 2, primera: null, ultima: null } ] }
] };

function montar(respuesta = DATOS){
  const dom = new JSDOM(`<!doctype html><html><body>${TARJETA}<input id="clanTagInput"><div id="cardBuscarClan"></div></body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  w.__respuesta = respuesta; w.__buscados = []; w.__llamadas = [];
  w.eval(`
    var ICONO_ROYALEAPI = '<img class="ico-ra" alt="">', ICONO_CWSTATS = '<img class="ico-cw" alt="">';
    function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function normalizarTag(t){ let v = String(t||'').trim().toUpperCase().replace(/^#/, ''); return v ? '#' + v : ''; }
    function manejarRespuestaAuth(){ return false; }
    async function conBotonOcupado(b, fn){ return fn(); }
    async function apiGetAuth(accion){ window.__llamadas.push(accion); return window.__respuesta; }
    async function buscarClan(){ window.__buscados.push(document.getElementById('clanTagInput').value); }
    ${UTIL.slice(UTIL.indexOf('function enlaceJugador('), UTIL.indexOf('/**\n * enlaceClan('))}
    ${ETIQUETA}
    ${CODIGO}
  `);
  return w;
}
const id = (w, x) => w.document.getElementById(x);
const esperar = () => new Promise(r => setTimeout(r, 0));
const cargar = async w => { id(w, 'btnCargarClanesExternos').click(); await esperar(); };

test('«Cargar lista» pide webAdminClanesExternos y pinta un bloque por clan, con el filtro visible', async () => {
  const w = montar();
  await cargar(w);
  assert.deepEqual(w.__llamadas, ['webAdminClanesExternos']);
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 3);
  assert.equal(id(w, 'ceFiltros').style.display, 'flex');
});

test('el nombre del clan enlaza dentro de la web y el clan y cada jugador llevan RoyaleAPI y CWStats con ícono', async () => {
  const w = montar();
  await cargar(w);
  const clan = w.document.querySelector('.ce-clan');
  const interno = clan.querySelector('a.ce-clan-link');
  assert.equal(interno.getAttribute('href'), 'admin.html?clan=%23AAA111#cardBuscarClan');
  const ext = [...clan.querySelectorAll('summary .ce-ext a')].map(a => a.href);
  assert.deepEqual(ext, ['https://royaleapi.com/clan/AAA111', 'https://cwstats.com/clan/AAA111']);
  assert.equal(clan.querySelectorAll('summary .ce-ext img').length, 2, 'cada pastilla lleva su ícono');
  const fila = clan.querySelector('tbody tr');
  assert.equal(fila.querySelector('a.jugador-link').getAttribute('href'), 'perfil.html?tag=%23PJ1');
  assert.deepEqual([...fila.querySelectorAll('.ce-ext a')].map(a => a.href), ['https://royaleapi.com/player/PJ1', 'https://cwstats.com/player/PJ1']);
});

test('lo que manda el backend se escapa y las semanas antiguas salen con la temporada de Supercell', async () => {
  const w = montar();
  await cargar(w);
  const clan = w.document.querySelector('.ce-clan');
  assert.equal(clan.querySelector('.ce-nombre b'), null, 'el HTML del nombre no se interpreta');
  assert.match(clan.querySelector('.ce-nombre').textContent, /Rivales <b>X<\/b>/);
  assert.match(clan.textContent, /2024-08 S2/);
});

test('los filtros por tipo y por texto reducen la lista', async () => {
  const w = montar();
  await cargar(w);
  w.document.querySelector('[data-ce-tipo="vetado"]').click();
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 1);
  assert.equal(w.document.querySelector('.ce-nombre').textContent, 'Vetado Uno');
  w.document.querySelector('[data-ce-tipo="externo"]').click();
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 1);
  w.document.querySelector('[data-ce-tipo="todos"]').click();
  id(w, 'ceFiltroTexto').value = 'cami';
  id(w, 'ceFiltroTexto').dispatchEvent(new w.Event('input'));
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 1, 'el texto también busca entre los jugadores');
  assert.equal(w.document.querySelector('.ce-nombre').textContent, 'Solo Externo');
});

test('el enlace interno del clan abre «Buscar clan» con su Tag sin navegar', async () => {
  const w = montar();
  await cargar(w);
  const a = w.document.querySelector('a.ce-clan-link');
  const ev = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  a.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, true);
  assert.deepEqual(w.__buscados, ['#AAA111']);
});

test('un clan sin jugadores lo dice, y un error del backend se muestra', async () => {
  const w = montar();
  await cargar(w);
  assert.match(w.document.querySelectorAll('.ce-clan')[1].textContent, /Ningún jugador nuestro/);
  const w2 = montar({ ok: false, error: 'Aún no hay un índice' });
  await cargar(w2);
  assert.match(id(w2, 'ceMsg').textContent, /Aún no hay un índice/);
});
