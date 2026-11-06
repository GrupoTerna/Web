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

test('clan.html: renderClanBasico agrega los datos sin cambiar el título de la página (primer h3 = nombre del clan)', () => {
  const cuerpo = extraer(CLAN, 'function renderClanBasico');
  assert.match(cuerpo, /clanCardHtml\(clanInfo, idx, \{ mostrarVerClan: false, mostrarUnirse: false \}\) \+ clanDatosHtml\(clanInfo\)/);
  assert.match(extraer(CLAN, 'function clanDatosHtml'), /<h2 class="pf-subtitulo">/, 'el título nuevo es h2, no h3');
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
