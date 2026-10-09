'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScripts } = require('./load-browser-script');

// clan-card.js depende de esc()/fmtNum()/enlaceClan() (util.js) y de
// CLAN_BADGES/CLAN_BADGES_ROL/CLAN_LABELS_CORTOS/ICONO_ROYALEAPI/
// ICONO_CWSTATS/iconoBadgeClanHtml() (data/clan-badges.js) — mismo orden de
// carga que usan index.html/directorio.html vía <script src>.
const { clanCardCabeceraHtml, clanCardHtml, chartCardHtml } = loadBrowserScripts([
  'assets/js/util.js',
  'assets/js/data/clan-badges.js',
  'assets/js/features/clan-card.js'
]);

test('clanCardCabeceraHtml() con c.nombre real arma el link clickeable a clan.html (enlaceClan)', () => {
  const html = clanCardCabeceraHtml({ nombre: 'Familia Terna', clanTag: '#ABC123' }, 0);
  assert.match(html, /<a class="clan-link" href="clan\.html\?clan=Familia(%20|\+)Terna" target="_blank" rel="noopener">Familia Terna<\/a>/);
  assert.match(html, /#ABC123/);
});

test('clanCardCabeceraHtml() sin c.nombre cae al label del badge, escapado y sin link', () => {
  const html = clanCardCabeceraHtml({}, 0);
  assert.match(html, /👑 Clan Principal/);
  assert.ok(!html.includes('<a class="clan-link"'));
});

test('clanCardCabeceraHtml() con opts.mostrarRol usa CLAN_BADGES_ROL en vez de CLAN_BADGES', () => {
  const html = clanCardCabeceraHtml({}, 1, { mostrarRol: true });
  assert.match(html, /Cantera \(Clan 2\)/);
});

test('clanCardCabeceraHtml() con badgeId agrega el ícono del escudo real vía iconoBadgeClanHtml()', () => {
  const html = clanCardCabeceraHtml({ nombre: 'Terna 2', badgeId: 16000000 }, 1);
  assert.match(html, /<img src="assets\/badges\/Flame_01\.png"/);
});

test('clanCardHtml() sin royaleApi/cwStats válidos no pinta la fila de botones externos', () => {
  const html = clanCardHtml({ nombre: 'Terna 3', lider: 'Ana', liga: 'Liga de Leyendas', requerimiento: 4000 }, 2);
  assert.ok(!html.includes('RoyaleAPI'));
  assert.ok(!html.includes('CWStats'));
  assert.match(html, /Mín\. trofeos/);
  assert.match(html, /4,000/); // fmtNum()
});

test('clanCardHtml() con links válidos pinta ambos botones', () => {
  const html = clanCardHtml({
    nombre: 'Terna 3', lider: 'Ana', liga: 'Liga de Leyendas',
    royaleApi: 'https://royaleapi.com/clan/ABC123',
    cwStats: 'https://cwstats.com/clan/ABC123'
  }, 2);
  assert.match(html, /RoyaleAPI/);
  assert.match(html, /CWStats/);
});

test('clanCardHtml() ignora un link con el placeholder ".../LINK" sin reemplazar (urlValida)', () => {
  const html = clanCardHtml({ nombre: 'Terna 3', royaleApi: 'https://royaleapi.com/clan/LINK' }, 2);
  assert.ok(!html.includes('RoyaleAPI'));
});

test('clanCardHtml() sin requerimiento muestra "—" en vez de "0+"', () => {
  const html = clanCardHtml({ nombre: 'Mini Ternas', requerimiento: 0 }, 3);
  assert.match(html, />— 🏆<\/b>/);
});

test('clanCardHtml() opts.mostrarVerClan agrega el botón "Ver clan" hacia clan.html', () => {
  const html = clanCardHtml({ nombre: 'Familia Terna' }, 0, { mostrarVerClan: true });
  assert.match(html, /<a class="btn btn-primary btn-block" href="clan\.html\?clan=Familia(%20|\+)Terna"[^>]*>Ver clan<\/a>/);
});

test('clanCardHtml() opts.mostrarUnirse agrega el botón "Unirse a este clan" con data-clan', () => {
  const html = clanCardHtml({ nombre: 'Familia Terna' }, 0, { mostrarUnirse: true });
  assert.match(html, /js-solicitar-unirme" data-clan="Familia Terna"/);
});

test('clanCardHtml() sin ninguna opt no agrega ni "Ver clan" ni "Unirse"', () => {
  const html = clanCardHtml({ nombre: 'Familia Terna' }, 0);
  assert.ok(!html.includes('Ver clan'));
  assert.ok(!html.includes('Unirse a este clan'));
});

test('chartCardHtml() usa el nombre real del clan (c.nombre) en vez de CLAN_LABELS_CORTOS cuando está disponible', () => {
  const clanes = [{ nombre: 'Familia Terna', miembros: 50 }, { nombre: 'Terna 2', miembros: 30 }];
  const html = chartCardHtml('Miembros', '👥', clanes, 'miembros');
  assert.match(html, /title="Familia Terna"/);
  assert.ok(!html.includes('title="Principal"'));
});

test('chartCardHtml() cae a CLAN_LABELS_CORTOS si el clan no trae nombre', () => {
  const clanes = [{ miembros: 50 }, { nombre: 'Terna 2', miembros: 30 }];
  const html = chartCardHtml('Miembros', '👥', clanes, 'miembros');
  assert.match(html, /title="Principal"/);
});

test('chartCardHtml() calcula el % de la barra en relación al valor máximo del grupo', () => {
  const clanes = [{ nombre: 'A', miembros: 50 }, { nombre: 'B', miembros: 25 }];
  const html = chartCardHtml('Miembros', '👥', clanes, 'miembros');
  assert.match(html, /width:100%/); // el mayor (50) llega a 100%
  assert.match(html, /width:50%/);  // el menor (25) es la mitad
});

test('chartCardHtml() con formatFn personalizado formatea el valor mostrado (ej. con "%")', () => {
  const clanes = [{ nombre: 'A', trofeos: 5000 }];
  const html = chartCardHtml('Trofeos', '🏆', clanes, 'trofeos', v => v + '%');
  assert.match(html, /<span class="chart-val">5000%<\/span>/);
});

test('chartCardHtml() trata valores no numéricos/ausentes como 0 en vez de romper', () => {
  const clanes = [{ nombre: 'A' }, { nombre: 'B', miembros: 'no-numero' }];
  const html = chartCardHtml('Miembros', '👥', clanes, 'miembros');
  assert.match(html, /<span class="chart-val">0<\/span>/g);
});


/*
 * enlazarLideresClanes() — Fase 5 (09-oct-2026): el roster sale de roster.json (rama `data`) y solo cae a webRoster si el archivo falta o no sirve.
 * Se carga api.js real; solo se simulan apiGetEstatico (red a GitHub) y apiGet (Apps Script). LÍMITE: red simulada, sin navegador real.
 */
const { loadBrowserScriptsWithDom } = require('./load-browser-script');
const HORA_CC = 60 * 60 * 1000;
const ROSTER_CC = (horasAtras) => ({ _publicadoEn: new Date(Date.now() - horasAtras * HORA_CC).toISOString(), clanes: [{ nombre: 'Terna Uno', miembros: [{ nombre: 'Ana', tag: '#AAA111', rango: 'Colíder' }, { nombre: 'Otro', tag: '#BBB222', rango: 'Líder' }] }] });

function montarLideres({ archivo, apiGetImpl } = {}){
  const window = loadBrowserScriptsWithDom(
    ['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/data/clan-badges.js', 'assets/js/core/api.js', 'assets/js/features/clan-card.js'],
    '<div id="grid"><div class="card"><div>Terna Uno</div><div>Líder: Ana</div></div></div>');
  const llamadas = [], urls = [];
  window.apiGetEstatico = async (url) => { urls.push(url); if (!archivo) throw new Error('HTTP 404 (simulado)'); return archivo(); };
  window.apiGet = async (accion, params, opts) => { llamadas.push({ accion, opts }); if (!apiGetImpl) throw new Error('No pudimos conectar con el servidor.'); return apiGetImpl(); };
  return { window, llamadas, urls, grid: window.document.getElementById('grid') };
}
const CLANES_CC = [{ nombre: 'Terna Uno', lider: 'Ana' }];

test('enlazarLideresClanes(): con roster.json vigente enlaza al líder por su nombre y NO llama a Apps Script', async () => {
  const { window, llamadas, urls, grid } = montarLideres({ archivo: () => ROSTER_CC(1) });
  await window.enlazarLideresClanes(grid, CLANES_CC);
  const a = grid.querySelector('a.clan-lider-link');
  assert.ok(a, 'debe envolver el nombre del líder');
  assert.equal(a.getAttribute('href'), 'perfil.html?tag=%23AAA111');
  assert.equal(llamadas.length, 0);
  assert.match(urls[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/roster\.json\?t=\d+$/);
});

test('enlazarLideresClanes(): sin roster.json cae a webRoster (5 min de caché y staleIfError)', async () => {
  const { window, llamadas, grid } = montarLideres({ apiGetImpl: () => ROSTER_CC(0) });
  await window.enlazarLideresClanes(grid, CLANES_CC);
  assert.ok(grid.querySelector('a.clan-lider-link'));
  assert.equal(llamadas[0].accion, 'webRoster');
  assert.equal(llamadas[0].opts.ttlMs, 300000);
});

test('enlazarLideresClanes(): roster.json vencido + Apps Script caído -> usa el archivo viejo; sin nada, la tarjeta queda igual y no revienta', async () => {
  const viejo = montarLideres({ archivo: () => ROSTER_CC(5) });
  await viejo.window.enlazarLideresClanes(viejo.grid, CLANES_CC);
  assert.ok(viejo.grid.querySelector('a.clan-lider-link'));
  const nada = montarLideres({});
  await nada.window.enlazarLideresClanes(nada.grid, CLANES_CC);
  assert.equal(nada.grid.querySelector('a.clan-lider-link'), null);
  assert.equal(nada.grid.textContent.includes('Líder: Ana'), true);
});
