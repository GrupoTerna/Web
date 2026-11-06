'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// NUEVO (6-nov-2026, pedido de la usuaria, §PF393): rankings del clan en clan.html, sin la línea divisoria de «Datos del clan», y tabla del roster con los íconos
// ⚠️, WhatsApp y 📈 a la derecha del nombre, valores y encabezados centrados (Nombre a la izquierda) y centrado vertical.
// Se extraen y ejecutan las funciones reales. LÍMITE: no mide el aspecto en un navegador real.
const CLAN = fs.readFileSync(path.join(__dirname, '..', 'clan.html'), 'utf8');
const CLAN_CARD = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'features', 'clan-card.js'), 'utf8');

function extraer(src, inicio) {
  const i = src.indexOf(inicio);
  assert.ok(i >= 0, 'no se encontró: ' + inicio);
  let nivel = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) {
    if (src[j] === '{') nivel++;
    else if (src[j] === '}') { nivel--; if (nivel === 0) break; }
  }
  return src.slice(i, j + 1);
}
// vm crea otro «realm»: se normaliza a JSON para comparar arreglos con deepEqual.
const plano = v => JSON.parse(JSON.stringify(v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cargar() {
  const ctx = { esc, fmtNum: n => Number(n).toLocaleString('en-US') };
  vm.createContext(ctx);
  vm.runInContext(extraer(CLAN_CARD, 'function clanRankingItems') + '\n' + extraer(CLAN, 'function clanRankingHtml'), ctx);
  return ctx;
}

test('clanRankingItems: solo devuelve los rankings que traen puesto, en el orden Copas Perú, Copas Mundo, Guerra Perú, Guerra Mundo', () => {
  const { clanRankingItems } = cargar();
  assert.deepEqual(plano(clanRankingItems({ copas: { local: 25, global: 927 }, guerra: { local: 3, global: 1200 } })),
    [['#25', 'Copas · Perú'], ['#927', 'Copas · Mundo'], ['#3', 'Guerra · Perú'], ['#1,200', 'Guerra · Mundo']]);
  assert.deepEqual(plano(clanRankingItems({ copas: { local: 317, global: null }, guerra: { local: null, global: null } })), [['#317', 'Copas · Perú']]);
  assert.deepEqual(plano(clanRankingItems({ copas: { local: 0, global: '' }, guerra: {} })), [], 'puestos vacíos o en 0 no cuentan');
});

test('clanRankingItems: sin ranking (null, sin campo o forma rara) no devuelve nada', () => {
  const { clanRankingItems } = cargar();
  for (const r of [null, undefined, 0, 'x', {}, { copas: null, guerra: null }]) assert.deepEqual(plano(clanRankingItems(r)), []);
});

test('clanRankingHtml: oculta la sección entera si ningún ranking trae datos y pinta solo los que sí', () => {
  const { clanRankingHtml } = cargar();
  assert.equal(clanRankingHtml({ ranking: null }), '');
  assert.equal(clanRankingHtml({}), '');
  assert.equal(clanRankingHtml({ ranking: { copas: { local: null, global: null }, guerra: { local: null, global: null } } }), '');
  const html = clanRankingHtml({ ranking: { copas: { local: 25, global: 927 }, guerra: { local: null, global: null } } });
  assert.match(html, /id="clanRankingSec"/);
  assert.match(html, /<b>#25<\/b><span>Copas · Perú<\/span>/);
  assert.match(html, /<b>#927<\/b><span>Copas · Mundo<\/span>/);
  assert.doesNotMatch(html, /Guerra/, 'el ranking de guerra viene vacío y no se muestra');
});

test('clan.html: «Datos del clan» ya no lleva línea divisoria', () => {
  const datos = extraer(CLAN, 'function clanDatosHtml');
  assert.doesNotMatch(datos, /border-top/);
  assert.match(datos, /id="clanDatosSec"/);
});

test('clan.html: la ficha pinta los rankings después de las cifras y antes de los botones', () => {
  const ficha = extraer(CLAN, 'function clanFichaHtml');
  assert.match(ficha, /\$\{clanDatosHtml\(c\)\}\$\{clanRankingHtml\(c\)\}\$\{botones\}/);
});

test('clan.html: el nombre del roster lleva ⚠️, WhatsApp y 📈 (botonHistJugador) a la derecha, como en Directorio', () => {
  assert.match(CLAN, /<script src="assets\/js\/features\/mini-historial\.js"><\/script>/);
  const roster = extraer(CLAN, 'function renderClanRoster');
  assert.match(roster, /<td class="col-nombre"><div class="col-jugador-inner"><span class="col-jugador-nombre">\$\{enlaceJugador\(m\.nombre, m\.tag\)\}<\/span><span class="col-jugador-extras">\$\{botonHistJugador\(\{ tag: m\.tag, nombre: m\.nombre \}\)\}<\/span><\/div><\/td>/);
});

test('clan.html: tabla del roster centrada (encabezados y valores), Nombre a la izquierda en los valores y todo centrado en vertical', () => {
  assert.match(CLAN, /#clanRosterWrap \.tbl-pendientes th, #clanRosterWrap \.tbl-pendientes td\{text-align:center; vertical-align:middle;/);
  assert.match(CLAN, /#clanRosterWrap \.tbl-pendientes td\.col-nombre\{text-align:left;\}/);
  assert.doesNotMatch(CLAN, /th\.col-nombre\{text-align:left/, 'el encabezado de Nombre sigue centrado');
  assert.doesNotMatch(CLAN, /td\.col-tag\{[^}]*text-align:left/, 'Tag también va centrado');
});
