'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (24-oct-2026, tanda 10 de Consolidado_Mini_Historial_y_Perfil.md, §PF196): tarjeta «¿Es infiltrado?» de perfil.html (solo admins, a pedido), con el mismo
// criterio y el mismo endpoint (webAdminBuscarInfiltrado) de la «Detección de infiltrados» de admin.html. La estructura se comprueba sobre el HTML real y
// verificarInfiltradoPerfil() se extrae del <script> inline y se ejecuta con jsdom. LÍMITE: no prueba el CSS ni un navegador real; apiGetAuth() se simula con la
// forma real de la respuesta (_buscarInfiltrado(), 15_DeteccionInfiltrados.gs: { ok, tipo:'jugador', jugador:{…}, infoRival, historialTerna }).

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

test('la tarjeta nace oculta, va después del historial de guerra y antes de los cofres, con su botón y su contenedor', () => {
  const iH = html.indexOf('id="mHistorialGuerraCard"');
  const iI = html.indexOf('id="mInfiltradoCard"');
  const iC = html.indexOf('id="mCicloCofresCard"');
  assert.ok(iH > 0 && iI > iH && iC > iI, 'orden: Historial de guerra, ¿Es infiltrado?, Cofres');
  assert.match(html, /id="mInfiltradoCard" style="display:none;/, 'oculta hasta que renderMiembro() confirme sesión de admin');
  assert.match(html, /<button type="button" id="mVerificarInfiltradoBtn">🕵️ Verificar si es infiltrado<\/button>/);
  assert.match(html, /id="mInfiltradoResultado" style="display:none;/, 'el resultado solo se pide a pedido');
});

test('renderMiembro() muestra la tarjeta solo con sesión de admin (misma regla que el historial de guerra)', () => {
  assert.match(html, /getElementById\('mInfiltradoCard'\)\.style\.display = esAdminLogueado\(\) \? 'block' : 'none';/);
});

function cargar(respuesta){
  const extraer = re => { const r = html.match(re); assert.ok(r, 'no se encontró en perfil.html: ' + re); return r[0]; };
  const codigo = [
    extraer(/function msgErrorJson\(err, base\)\{[\s\S]*?\n\}\n/),
    extraer(/function infiltradoVeredictoHtml\(infoRival\)\{[\s\S]*?\n\}\n/),
    extraer(/async function verificarInfiltradoPerfil\(\)\{[\s\S]*?\n\}\n/),
  ].join('\n');
  const dom = new JSDOM('<!doctype html><html><body><div id="mInfiltradoResultado" style="display:none;"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/perfil.html' });
  const w = dom.window;
  const util = fs.readFileSync(path.join(__dirname, '..', 'assets/js/util.js'), 'utf8');
  w.eval([util,
    'var _llamadas = []; var TAG_PERFIL = "#2GG8PJ8GC"; window.apiGetAuth = function(n, p){ _llamadas.push({ n, p }); return window._resp && window._resp.__falla ? Promise.reject(new Error(window._resp.__falla)) : Promise.resolve(window._resp); };',
    codigo + '\nwindow.verificarInfiltradoPerfil = verificarInfiltradoPerfil;'].join('\n;\n'));
  w._resp = respuesta;
  return w;
}
const JUGADOR = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clanActual: 'Clan Rival', clanActualTag: '#RIVAL1' };

test('pide webAdminBuscarInfiltrado con el Tag del perfil', async () => {
  const w = cargar({ ok: true, tipo: 'jugador', jugador: JUGADOR, infoRival: null, historialTerna: [] });
  await w.verificarInfiltradoPerfil();
  const llamadas = JSON.parse(w.eval('JSON.stringify(_llamadas)'));
  assert.deepEqual(llamadas.map(l => [l.n, l.p]), [['webAdminBuscarInfiltrado', { tag: '#2GG8PJ8GC' }]]);
  assert.equal(w.document.getElementById('mInfiltradoResultado').style.display, 'block');
});

test('clan rival de la temporada: veredicto de advertencia con el clan contra el que juega y el motivo', async () => {
  const w = cargar({ ok: true, tipo: 'jugador', jugador: JUGADOR,
    infoRival: { fuente: 'currentriverrace+manual', clanTernaNombre: 'Terna 1', motivo: 'Sabotaje previo' }, historialTerna: [] });
  await w.verificarInfiltradoPerfil();
  const el = w.document.getElementById('mInfiltradoResultado');
  assert.ok(el.querySelector('.badge-warn'));
  assert.match(el.textContent, /Rival de esta temporada \+ conflicto manual/);
  assert.match(el.textContent, /vs\. Terna 1/);
  assert.match(el.textContent, /Sabotaje previo/);
  assert.match(el.textContent, /Clan actual: Clan Rival \(#RIVAL1\)/);
});

test('solo lista de conflicto: etiqueta «En lista de conflicto»', async () => {
  const w = cargar({ ok: true, tipo: 'jugador', jugador: JUGADOR, infoRival: { fuente: 'manual', motivo: 'x' }, historialTerna: [] });
  await w.verificarInfiltradoPerfil();
  assert.match(w.document.getElementById('mInfiltradoResultado').textContent, /En lista de conflicto/);
});

test('sin señales: no se pinta advertencia y se aclara que no prueba que no sea infiltrado', async () => {
  const w = cargar({ ok: true, tipo: 'jugador', jugador: { ...JUGADOR, clanActual: '', clanActualTag: '' }, infoRival: null, historialTerna: [] });
  await w.verificarInfiltradoPerfil();
  const el = w.document.getElementById('mInfiltradoResultado');
  assert.equal(el.querySelector('.badge-warn'), null);
  assert.match(el.textContent, /Sin señales/);
  assert.match(el.textContent, /no prueba que no sea infiltrado/);
  assert.match(el.textContent, /Clan actual: Sin clan/);
  assert.match(el.textContent, /Sin historial en nuestro roster/);
});

test('el historial en nuestros clanes sale en una tabla y escapa el texto', async () => {
  const w = cargar({ ok: true, tipo: 'jugador', jugador: JUGADOR, infoRival: null,
    historialTerna: [{ origen: 'Inactivos', nombre: '<img src=x onerror=1>', tag: '#AAA', clan: 'Terna 2', razon: 'Inactividad prolongada' }] });
  await w.verificarInfiltradoPerfil();
  const el = w.document.getElementById('mInfiltradoResultado');
  const filas = el.querySelectorAll('table tbody tr');
  assert.equal(filas.length, 1);
  assert.match(filas[0].textContent, /Inactivos/);
  assert.match(filas[0].textContent, /Terna 2/);
  assert.match(filas[0].textContent, /Inactividad prolongada/);
  assert.equal(el.querySelector('img'), null, 'el nombre se escapa, no se inyecta HTML');
});

test('error del backend (sesión vencida, Tag no encontrado) y fallo de red se muestran como aviso, sin romper', async () => {
  let w = cargar({ ok: false, error: 'Sesión inválida o expirada.' });
  await w.verificarInfiltradoPerfil();
  assert.match(w.document.getElementById('mInfiltradoResultado').textContent, /No se pudo verificar: Sesión inválida o expirada\./);
  w = cargar({ ok: true, tipo: 'clan', clan: { nombre: 'X' } });
  await w.verificarInfiltradoPerfil();
  assert.match(w.document.getElementById('mInfiltradoResultado').textContent, /No se pudo verificar/);
  w = cargar({ __falla: 'red' });
  await w.verificarInfiltradoPerfil();
  assert.match(w.document.getElementById('mInfiltradoResultado').textContent, /No se pudo verificar: red/);
});
