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
