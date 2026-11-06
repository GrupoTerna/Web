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

// 6-nov-2026 (pedido de la usuaria): el roster simple de clan.html se reemplazó por «Directorio por clan» (assets/js/features/roster-tabla.js); estos dos tests
// pasaron a mirar la tabla nueva. El comportamiento completo está en clan-directorio-por-clan-dom.test.js.
test('clan.html: el nombre del directorio lleva ⚠️, WhatsApp y 📈 (botonHistJugador) a la derecha, como en Directorio', () => {
  assert.match(CLAN, /<script src="assets\/js\/features\/mini-historial\.js"><\/script>/);
  assert.match(CLAN, /<script src="assets\/js\/features\/roster-tabla\.js"><\/script>/);
  const TABLA = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'features', 'roster-tabla.js'), 'utf8');
  assert.match(TABLA, /key:'nombre'[^\n]*extra:m => botonHistJugador\(\{ tag:m\.tag, nombre:m\.nombre \}\)/);
  assert.match(extraer(TABLA, 'function celdaHtmlRoster'), /<div class="col-jugador-inner"><span class="col-jugador-nombre">\$\{contenido\}<\/span><span class="col-jugador-extras">\$\{col\.extra\(m, i\)\}<\/span><\/div>/);
});

test('clan.html: tabla del directorio centrada (encabezados y valores), Nombre a la izquierda en los valores', () => {
  assert.match(CLAN, /\.roster-table th, \.roster-table td\{padding:11px 13px; text-align:center; white-space:nowrap;\}/);
  assert.match(CLAN, /\.roster-table td\.rt-nombre\{font-weight:700; font-size:13px; text-align:left;\}/);
  assert.doesNotMatch(CLAN, /th\.rt-nombre\{[^}]*text-align:left/, 'el encabezado de Nombre sigue centrado');
  assert.doesNotMatch(CLAN, /td\.rt-tag\{[^}]*text-align:left/, 'Tag también va centrado');
});

// ---- admin.html: ficha de «Buscar clan» ----
const ADMIN = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function cargarAdminRanking(ranking) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div class="clan-stats" id="clanStatsRanking" style="display:none;"><span>viejo</span></div>');
  const ctx = { document: dom.window.document, fmtNum: n => Number(n).toLocaleString('en-US') };
  vm.createContext(ctx);
  vm.runInContext(extraer(CLAN_CARD, 'function clanRankingItems') + '\n' + extraer(ADMIN, 'function pintarRankingClan'), ctx);
  ctx.pintarRankingClan({ ranking });
  return dom.window.document.getElementById('clanStatsRanking');
}

test('admin.html: «Buscar clan» tiene un solo bloque de rankings y reiniciarFichaClan lo pinta', () => {
  assert.equal(ADMIN.split('id="clanStatsRanking"').length - 1, 1);
  assert.match(extraer(ADMIN, 'function reiniciarFichaClan'), /pintarRankingClan\(c\);/);
});

test('admin.html: pintarRankingClan muestra solo los rankings con puesto y limpia lo de la ficha anterior', () => {
  const cont = cargarAdminRanking({ copas: { local: 317, global: null }, guerra: { local: null, global: 4500 } });
  assert.notEqual(cont.style.display, 'none');
  const cajas = [...cont.querySelectorAll('span')].map(sp => [sp.querySelector('b').textContent, sp.textContent.replace(sp.querySelector('b').textContent, '')]);
  assert.deepEqual(cajas, [['#317', 'Copas · Perú'], ['#4,500', 'Guerra · Mundo']]);
  assert.ok(!cont.textContent.includes('viejo'));
});

test('admin.html: pintarRankingClan oculta el bloque cuando el clan no figura en ningún ranking', () => {
  for (const r of [null, undefined, { copas: { local: null, global: null }, guerra: { local: null, global: null } }]) {
    const cont = cargarAdminRanking(r);
    assert.equal(cont.style.display, 'none');
    assert.equal(cont.children.length, 0);
  }
});

// ---- perfil.html: puesto en Camino de Leyendas ----
const PERFIL = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

function pintarLeyendas(j) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div id="mLeyendasCard" style="display:none"><div id="mLeyendasContenido"></div></div>');
  const ctx = { document: dom.window.document, esc, fmtNum: n => Number(n).toLocaleString('en-US'), rawClash: x => x.rawClash || {}, _ICONO_LEYENDAS_HTML: '', MESES_ES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] };
  vm.createContext(ctx);
  vm.runInContext(extraer(PERFIL, 'function renderCaminoLeyendas'), ctx);
  ctx.renderCaminoLeyendas(j);
  return { card: dom.window.document.getElementById('mLeyendasCard'), cont: dom.window.document.getElementById('mLeyendasContenido') };
}
const RAW_LEYENDAS = { currentPathOfLegendSeasonResult: { leagueNumber: 7, trophies: 2200, rank: null } };

test('perfil.html: el puesto de Camino de Leyendas muestra Perú y mundo con su elo, y el mundial dice de qué temporada es', () => {
  const { card, cont } = pintarLeyendas({ rawClash: RAW_LEYENDAS, ranking: { fecha: '2026-11-03', temporada: '2026-10', local: { puesto: 130, elo: 2345 }, global: { puesto: 6403, elo: 2301 } } });
  assert.notEqual(card.style.display, 'none');
  const bloque = cont.querySelector('#mLeyendasRanking');
  assert.ok(bloque, 'falta el bloque de ranking');
  assert.match(bloque.textContent, /Ranking Perú #130 · 2,345 elo/);
  assert.match(bloque.textContent, /Ranking mundial #6,403 · 2,301 elo/);
  assert.match(cont.textContent, /el mundial es de octubre, 2026/);
});

test('perfil.html: muestra solo el ranking que trae puesto y se oculta del todo si no figura (ranking null)', () => {
  const solo = pintarLeyendas({ rawClash: RAW_LEYENDAS, ranking: { local: null, global: { puesto: 99, elo: 0 } } }).cont;
  assert.doesNotMatch(solo.querySelector('#mLeyendasRanking').textContent, /Perú/);
  assert.match(solo.querySelector('#mLeyendasRanking').textContent, /Ranking mundial #99$/, 'sin elo no se escribe «0 elo»');
  for (const r of [null, undefined, { local: null, global: null }, { local: { puesto: 0 }, global: {} }]) {
    const { cont } = pintarLeyendas({ rawClash: RAW_LEYENDAS, ranking: r });
    assert.equal(cont.querySelector('#mLeyendasRanking'), null);
    assert.doesNotMatch(cont.textContent, /Ranking|se actualiza cada lunes/);
  }
});

test('perfil.html: sin anillos de liga pero con ranking, la tarjeta sale con el ranking; sin ninguno de los dos, queda oculta', () => {
  const conRank = pintarLeyendas({ rawClash: {}, ranking: { local: { puesto: 5, elo: 3000 }, global: null } });
  assert.notEqual(conRank.card.style.display, 'none');
  assert.match(conRank.cont.textContent, /Ranking Perú #5/);
  assert.doesNotMatch(conRank.cont.textContent, /El anillo marca/);
  const nada = pintarLeyendas({ rawClash: {}, ranking: null });
  assert.equal(nada.card.style.display, 'none');
  assert.equal(nada.cont.innerHTML, '');
});
