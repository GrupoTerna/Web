'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// NUEVO (5-nov-2026, pedido de la usuaria, §PF391): más datos de /clans en «Buscar clan» (admin.html) y en «Datos del clan» (clan.html).
// Se extraen y ejecutan las funciones reales de cada página. LÍMITE: no mide el aspecto en un navegador real.
const ADMIN = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const CLAN = fs.readFileSync(path.join(__dirname, '..', 'clan.html'), 'utf8');

function extraer(html, inicio) {
  const i = html.indexOf(inicio);
  assert.ok(i >= 0, 'no se encontró: ' + inicio);
  let abre = html.indexOf('{', i);
  let nivel = 0, j = abre;
  for (; j < html.length; j++) {
    if (html[j] === '{') nivel++;
    else if (html[j] === '}') { nivel--; if (nivel === 0) break; }
  }
  return html.slice(i, j + 1);
}

function cargarClan() {
  const ctx = { esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), fmtNum: n => Number(n).toLocaleString('en-US') };
  vm.createContext(ctx);
  vm.runInContext(CLAN.slice(CLAN.indexOf('const TIPOS_CLAN'), CLAN.indexOf('\n', CLAN.indexOf('const TIPOS_CLAN'))) + '\n' + extraer(CLAN, 'function clanDatosHtml'), ctx);
  return ctx;
}

test('clan.html: «Datos del clan» muestra miembros, puntos de clan, trofeos de guerra, donaciones, tipo y país con las etiquetas correctas', () => {
  const html = cargarClan().clanDatosHtml({ miembros: 45, copas: 133923, trofeos: 3420, donaciones: 456, tipo: 'inviteOnly', pais: 'Peru', descripcion: '' });
  assert.match(html, /<b>45\/50<\/b><span>Miembros<\/span>/);
  assert.match(html, /<b>133,923<\/b><span>Puntos de clan<\/span>/, 'copas de webClanInfo = puntos de clan (clanScore)');
  assert.match(html, /<b>3,420<\/b><span>Trofeos de guerra<\/span>/, 'trofeos de webClanInfo = trofeos de guerra (clanWarTrophies)');
  assert.match(html, /<b>456<\/b><span>Donaciones por semana<\/span>/);
  assert.match(html, /<b>Solo invitación<\/b><span>Tipo<\/span>/);
  assert.match(html, /<b>Peru<\/b><span>País<\/span>/);
  assert.doesNotMatch(html, /clanDescripcion/, 'sin descripción no hay párrafo');
});

test('clan.html: solo se pintan los datos que existen, y un clan sin nada no deja tarjeta vacía', () => {
  const { clanDatosHtml } = cargarClan();
  assert.equal(clanDatosHtml({ nombre: 'X', miembros: 0, copas: 0, trofeos: 0, donaciones: 0, tipo: '', pais: '', descripcion: '' }), '');
  const parcial = clanDatosHtml({ miembros: 10, copas: 0, trofeos: 0, donaciones: 0, tipo: 'raro', pais: '', descripcion: '' });
  assert.match(parcial, /Miembros/);
  assert.doesNotMatch(parcial, /Puntos de clan|Trofeos de guerra|Donaciones|Tipo|País/);
});

test('clan.html: la descripción se escapa (la escribe el líder del clan)', () => {
  const html = cargarClan().clanDatosHtml({ miembros: 1, descripcion: '<img src=x onerror=alert(1)> & más' });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; más/);
});

test('clan.html: renderClanBasico pinta una sola tarjeta (clanFichaHtml) y «Datos del clan» ya no es una tarjeta aparte; el título de la página sigue siendo el primer h3', () => {
  const cuerpo = extraer(CLAN, 'function renderClanBasico');
  assert.match(cuerpo, /wrap\.innerHTML = clanFichaHtml\(clanInfo, idx\);/);
  assert.doesNotMatch(cuerpo, /clanCardHtml\(clanInfo/, 'ya no se llama a la tarjeta compartida');
  const datos = extraer(CLAN, 'function clanDatosHtml');
  assert.doesNotMatch(datos, /<h2|Datos del clan<\/h/, 'desde el 6-nov-2026 la sección no lleva título (pedido de la usuaria)');
  assert.doesNotMatch(datos, /class="card"/, 'ya no es una tarjeta aparte');
});

function cargarFicha() {
  const ctx = { esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), fmtNum: n => Number(n).toLocaleString('en-US'),
    urlValida: u => /^https:\/\//.test(String(u || '')), ICONO_ROYALEAPI: '<i>R</i>', ICONO_CWSTATS: '<i>C</i>', clanCardCabeceraHtml: () => '<h3>CABECERA</h3>' };
  vm.createContext(ctx);
  vm.runInContext(CLAN.slice(CLAN.indexOf('const TIPOS_CLAN'), CLAN.indexOf('\n', CLAN.indexOf('const TIPOS_CLAN'))) + '\n' + extraer(CLAN, 'function clanDatosHtml') + '\n' + extraer(CLAN, 'function clanFichaHtml'), ctx);
  return ctx;
}
const CLAN_FICHA = { nombre: 'X', lider: 'Caandre', liga: 'Legendaria II', requerimiento: 14000, miembros: 49, copas: 138905, trofeos: 4151, donaciones: 12720, tipo: 'open', pais: 'Peru',
  descripcion: 'Familia Terna', royaleApi: 'https://royaleapi.com/clan/X', cwStats: 'https://cwstats.com/clan/X' };

test('clan.html: la ficha es una sola tarjeta y va en orden: cabecera, Líder, Liga, Mín. trofeos, las cifras del clan (sin título desde el 6-nov-2026) y, al final, RoyaleAPI y CWStats', () => {
  const html = cargarFicha().clanFichaHtml(CLAN_FICHA, 0);
  assert.equal((html.match(/class="card /g) || []).length, 1, 'una sola tarjeta');
  const pos = ['CABECERA', 'Líder:', 'Liga:', 'Mín. trofeos:', 'Miembros', 'Donaciones por semana', 'País', 'Familia Terna', 'RoyaleAPI', 'CWStats'].map(x => html.indexOf(x));
  assert.ok(pos.every(n => n >= 0), 'faltan: ' + pos.join(','));
  assert.deepEqual(pos, [...pos].sort((a, b) => a - b), 'orden: ' + pos.join(','));
});

test('clan.html: «Mín. trofeos» lleva el mismo estilo que Liga (ícono, texto y valor en negrita blanca), no a la derecha', () => {
  const html = cargarFicha().clanFichaHtml(CLAN_FICHA, 0);
  assert.match(html, /<span class="text-dim">🛡️ Liga: <b style="color:var\(--text\);">Legendaria II<\/b><\/span>/);
  assert.match(html, /<span class="text-dim">🏆 Mín\. trofeos: <b style="color:var\(--text\);">14,000\+<\/b><\/span>/);
  assert.doesNotMatch(html, /justify-content:space-between/, 'ya no va en una fila aparte a la derecha');
  assert.match(cargarFicha().clanFichaHtml({ ...CLAN_FICHA, requerimiento: 0 }, 0), /Mín\. trofeos: <b[^>]*>—<\/b>/);
});

test('clan.html: sin enlaces válidos no hay botones, y un clan sin datos no deja una sección vacía', () => {
  const { clanFichaHtml } = cargarFicha();
  const sin = clanFichaHtml({ nombre: 'X', lider: 'A', liga: 'B', requerimiento: 0, royaleApi: '', cwStats: '' }, 0);
  assert.doesNotMatch(sin, /RoyaleAPI|CWStats|clanEnlacesExt/);
  assert.doesNotMatch(sin, /Datos del clan/);
  assert.match(clanFichaHtml({ ...CLAN_FICHA, cwStats: '' }, 0), /RoyaleAPI/);
});

test('admin.html: la ficha de «Buscar clan» tiene los elementos nuevos y la descripción va con textContent', () => {
  for (const id of ['cEscudo', 'cLiga', 'cDonaciones', 'cCopasProm', 'cActivos', 'cCopasReq', 'cLider', 'cDescripcion', 'cFuente']) {
    assert.equal(ADMIN.split(`id="${id}"`).length - 1, 1, `#${id} debe existir una sola vez`);
  }
  const f = extraer(ADMIN, 'function reiniciarFichaClan');
  assert.match(f, /getElementById\('cDescripcion'\)\.textContent = c\.descripcion/);
  assert.match(f, /getElementById\('cLider'\)\.textContent/);
  assert.doesNotMatch(f, /cDescripcion'\)\.innerHTML/);
});

test('admin.html: el texto de la fuente avisa cuando los datos son de una consulta anterior', () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extraer(ADMIN, 'function _textoFuenteClan'), ctx);
  assert.match(ctx._textoFuenteClan('05/11/2026 10:30', 'api'), /consultados el 05\/11\/2026 10:30.*una vez al día/);
  assert.match(ctx._textoFuenteClan('05/11/2026 10:30', 'drive_hoy'), /consultados el 05\/11\/2026 10:30/);
  assert.match(ctx._textoFuenteClan('04/11/2026 22:00', 'drive_anterior'), /^⚠ Supercell no respondió.*\(04\/11\/2026 22:00\)/);
  assert.equal(ctx._textoFuenteClan('', 'api'), '');
});
