'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript, loadBrowserScriptsWithDom } = require('./load-browser-script');

const {
  esc, fmtNum, ordenClanIndex, ordenarClanes,
  urlValida, normalizarTag, enlaceJugador, fmtTiempoRelativo,
  fmtHaceCorto, fmtFechaHoraLima, tsApiDeDatos, fmtTresTiempos, fmtTresTiemposDeResultado
} = loadBrowserScript('assets/js/util.js');

test('esc() escapa los 5 caracteres especiales de HTML', () => {
  assert.equal(esc(`<script>&"'</script>`), '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;');
});

test('esc() no revienta con null/undefined (los trata como texto vacío)', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('esc() acepta números y los deja intactos como texto', () => {
  assert.equal(esc(1234), '1234');
});

test('fmtNum() separa miles con coma (14000 -> "14,000")', () => {
  assert.equal(fmtNum(14000), '14,000');
  assert.equal(fmtNum(999), '999');
});

test('fmtNum() con un valor no numérico devuelve "0" en vez de "NaN" o romper', () => {
  assert.equal(fmtNum(NaN), '0');
  assert.equal(fmtNum(Infinity), '0');
  assert.equal(fmtNum('no es numero'), '0');
});

test('ordenClanIndex() respeta el orden fijo: Principal, 2, 3, Mini', () => {
  assert.equal(ordenClanIndex('Familia Terna'), 0);
  assert.equal(ordenClanIndex('Terna 2'), 1);
  assert.equal(ordenClanIndex('Terna 3'), 2);
  assert.equal(ordenClanIndex('Mini Ternas'), 3);
});

test('ordenarClanes() reordena aunque el backend los mande en otro orden (ej. alfabético)', () => {
  const clanes = [{ nombre: 'Terna 3' }, { nombre: 'Mini Ternas' }, { nombre: 'Terna 2' }, { nombre: 'Terna' }];
  const ordenado = ordenarClanes(clanes).map(c => c.nombre);
  assert.deepEqual(ordenado, ['Terna', 'Terna 2', 'Terna 3', 'Mini Ternas']);
});

test('urlValida() rechaza vacío, links sin http(s) y el placeholder ".../LINK"', () => {
  assert.equal(urlValida(''), false);
  assert.equal(urlValida('royaleapi.com/clan/ABC'), false);
  assert.equal(urlValida('https://royaleapi.com/clan/LINK'), false);
  assert.equal(urlValida('https://royaleapi.com/clan/LINK/'), false);
});

test('urlValida() acepta un link http(s) real sin el placeholder', () => {
  assert.equal(urlValida('https://royaleapi.com/clan/ABC123'), true);
});

test('normalizarTag() pone mayúsculas y un solo "#" al inicio, sin espacios', () => {
  assert.equal(normalizarTag('  #r09228v '), '#R09228V');
  assert.equal(normalizarTag('r09228v'), '#R09228V');
  assert.equal(normalizarTag(''), '');
});

test('enlaceJugador() sin tag devuelve el nombre escapado, sin <a> (mejor texto plano que link roto)', () => {
  assert.equal(enlaceJugador('<b>Nombre</b>', ''), '&lt;b&gt;Nombre&lt;/b&gt;');
});

test('enlaceJugador() con tag arma el link a perfil.html, target=_blank por defecto', () => {
  const html = enlaceJugador('Jugador', '#R09228V');
  assert.equal(html, '<a class="jugador-link" href="perfil.html?tag=%23R09228V" target="_blank" rel="noopener">Jugador</a>');
});

test('enlaceJugador() con opts.mismaVentana no agrega target', () => {
  const html = enlaceJugador('Jugador', '#R09228V', { mismaVentana: true });
  assert.ok(!html.includes('target='));
});

test('fmtTiempoRelativo(null) avisa que no hay datos guardados', () => {
  assert.equal(fmtTiempoRelativo(null), 'sin datos guardados');
});

test('fmtTiempoRelativo() responde "ahora mismo" para una fecha recién creada', () => {
  assert.equal(fmtTiempoRelativo(new Date()), 'actualizado ahora mismo');
});

// NUEVO (09-oct-2026): los tres momentos (consulta de la página, publicación del JSON, consulta del bot a Supercell).
const HORA_MS = 60 * 60 * 1000;
const haceMs = (ms) => new Date(Date.now() - ms);

test('fmtHaceCorto() da segundos, minutos, horas con minutos y días; con algo que no es fecha devuelve \"—\"', () => {
  assert.equal(fmtHaceCorto(haceMs(5000)), 'hace 5 s');
  assert.equal(fmtHaceCorto(haceMs(12 * 60 * 1000)), 'hace 12 min');
  assert.equal(fmtHaceCorto(haceMs(3 * HORA_MS + 20 * 60 * 1000)), 'hace 3 h 20 min');
  assert.equal(fmtHaceCorto(haceMs(2 * 24 * HORA_MS)), 'hace 2 d');
  assert.equal(fmtHaceCorto(null), '—');
  assert.equal(fmtHaceCorto(new Date('x')), '—');
});

test('fmtFechaHoraLima() usa la zona de Lima (UTC-5) y no revienta con una fecha inválida', () => {
  const txt = fmtFechaHoraLima(new Date('2026-10-09T15:30:00Z'));
  assert.match(txt, /10:30/);
  assert.equal(fmtFechaHoraLima(undefined), '—');
});

test('tsApiDeDatos() lee tiempos.api.ultimaConsultaTs y devuelve null si falta o no es válido (no inventa fechas)', () => {
  const ts = Date.now() - 60000;
  assert.equal(tsApiDeDatos({ tiempos: { api: { ultimaConsultaTs: ts } } }).getTime(), ts);
  assert.equal(tsApiDeDatos({ tiempos: { api: { ultimaConsultaTs: String(ts) } } }).getTime(), ts);
  for (const malo of [null, undefined, {}, { tiempos: {} }, { tiempos: { api: {} } }, { tiempos: { api: { ultimaConsultaTs: 0 } } }, { tiempos: { api: { ultimaConsultaTs: 'x' } } }, { _publicadoEn: new Date().toISOString() }]){
    assert.equal(tsApiDeDatos(malo), null);
  }
});

test('fmtTresTiempos() con los tres momentos: texto y tooltip llevan los tres', () => {
  const r = fmtTresTiempos({ consulta: haceMs(3000), publicado: haceMs(40 * 60 * 1000), api: haceMs(52 * 60 * 1000) });
  assert.equal(r.texto, 'Consulta: hace 3 s · JSON publicado: hace 40 min · API Supercell: hace 52 min');
  assert.match(r.titulo, /Esta página consultó/);
  assert.match(r.titulo, /Archivo JSON publicado/);
  assert.match(r.titulo, /API de Supercell/);
});

test('fmtTresTiempos() omite lo que no existe: sin JSON ni API queda solo la consulta', () => {
  assert.equal(fmtTresTiempos({ consulta: haceMs(1000) }).texto, 'Consulta: hace 1 s');
  assert.equal(fmtTresTiempos({ consulta: haceMs(1000), publicado: haceMs(60000) }).texto, 'Consulta: hace 1 s · JSON publicado: hace 1 min');
  const vacio = fmtTresTiempos();
  assert.equal(vacio.texto, '');
  assert.equal(vacio.titulo, '');
});

test('fmtTresTiempos() con datos guardados suma el respaldo y el aviso de que el servidor no responde', () => {
  const r = fmtTresTiempos({ consulta: haceMs(1000), respaldo: haceMs(2 * HORA_MS), esViejo: true });
  assert.equal(r.texto, 'Consulta: hace 1 s · Respaldo guardado: hace 2 h · ⚠ Datos guardados: el servidor no responde');
  assert.match(r.titulo, /Respaldo local guardado/);
});

test('fmtTresTiemposDeResultado() traduce el origen: estático vigente, archivo viejo, respaldo local y Apps Script', () => {
  const desde = haceMs(40 * 60 * 1000), api = haceMs(55 * 60 * 1000);
  assert.match(fmtTresTiemposDeResultado({ origen: 'estatico', desde, api }).texto, /^Consulta: hace \d+ s · JSON publicado: hace 40 min · API Supercell: hace 55 min$/);
  const viejo = fmtTresTiemposDeResultado({ origen: 'estatico-viejo', desde, api: null }).texto;
  assert.match(viejo, /JSON publicado: hace 40 min/);
  assert.match(viejo, /Datos guardados: el servidor no responde/);
  const local = fmtTresTiemposDeResultado({ origen: 'respaldo-local', desde }).texto;
  assert.match(local, /Respaldo guardado: hace 40 min/);
  assert.ok(!local.includes('JSON publicado'));
  assert.match(local, /Datos guardados/);
  assert.match(fmtTresTiemposDeResultado({ origen: 'apps-script', desde: null }).texto, /^Consulta: hace \d+ s$/);
  assert.match(fmtTresTiemposDeResultado().texto, /^Consulta: hace \d+ s$/);
});

// ---------------------------------------------------------------- Fase 4: hora real de «Consulta» (09-oct-2026)

test('horaConsultaApiGet() — sin api.js (apiGetUltimaActualizacion no existe) devuelve la hora actual, sin romper', () => {
  const { horaConsultaApiGet } = loadBrowserScript('assets/js/util.js');
  assert.ok(Math.abs(Date.now() - horaConsultaApiGet('webRoster').getTime()) < 2000);
});

test('horaConsultaApiGet() — con respaldo local devuelve la hora de ese guardado; sin respaldo, ahora', () => {
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], '');
  assert.ok(Math.abs(Date.now() - window.horaConsultaApiGet('webRoster').getTime()) < 2000, 'sin respaldo: ahora');
  const t = Date.now() - 2 * 24 * 60 * 60 * 1000;
  window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet('webRoster', null), JSON.stringify({ t, d: {} }));
  assert.equal(window.horaConsultaApiGet('webRoster').getTime(), t);
  window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet('webRoster', null), '{"t":"no-es-fecha"}');
  assert.ok(Math.abs(Date.now() - window.horaConsultaApiGet('webRoster').getTime()) < 2000, 'fecha inválida: ahora');
});

test('fmtTresTiemposDeResultado() — origen apps-script con `accion` usa la hora real del último guardado; sin `accion` o con otro origen, ahora', () => {
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], '');
  const t = Date.now() - 3 * 60 * 60 * 1000;
  window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet('webRoster', null), JSON.stringify({ t, d: {} }));
  assert.match(window.fmtTresTiemposDeResultado({ origen: 'apps-script', accion: 'webRoster' }).texto, /^Consulta: hace 3 h$/);
  assert.match(window.fmtTresTiemposDeResultado({ origen: 'apps-script' }).texto, /^Consulta: hace \d+ s$/);
  assert.match(window.fmtTresTiemposDeResultado({ origen: 'estatico', accion: 'webRoster', desde: new Date() }).texto, /^Consulta: hace \d+ s · JSON publicado/);
});

test('fmtTresTiemposDeResultado() — si el resultado trae `consulta` válida se usa tal cual (p. ej. admin con sesión: ahora)', () => {
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], '');
  window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet('webRoster', null), JSON.stringify({ t: Date.now() - 86400000, d: {} }));
  const ahora = new window.Date();
  assert.match(window.fmtTresTiemposDeResultado({ origen: 'apps-script', accion: 'webRoster', consulta: ahora }).texto, /^Consulta: hace \d+ s$/);
});
