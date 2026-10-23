'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (23-oct-2026, tanda 5 parte 2, §PF181): tarjeta «Historial de guerra» de perfil.html (solo admins, a pedido, entre «Batallas más recientes» y «Ciclo de cofres»)
// con la MISMA fuente y el MISMO armado de tabla que el mini historial. La estructura se comprueba sobre el HTML real y verHistorialGuerraPerfil() se extrae del <script> inline
// y se ejecuta con jsdom + mini-historial.js real. LÍMITE: no prueba el CSS ni un navegador real; apiGet() se simula.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');

test('la tarjeta nace oculta, va entre Batallas y Cofres, con su botón y su contenedor, y mini-historial.js se carga', () => {
  const iB = html.indexOf('id="mBatallasRecientesCard"');
  const iH = html.indexOf('id="mHistorialGuerraCard"');
  const iC = html.indexOf('id="mCicloCofresCard"');
  assert.ok(iB > 0 && iH > iB && iC > iH, 'orden: Batallas, Historial de guerra, Cofres');
  assert.match(html, /id="mHistorialGuerraCard" style="display:none;/, 'oculta hasta que renderMiembro() confirme sesión de admin');
  assert.match(html, /<button type="button" id="mVerHistorialGuerraBtn">📜 Ver historial de guerra<\/button>/);
  assert.match(html, /id="mHistorialGuerraTablaWrap" style="display:none;/, 'la tabla solo se pide a pedido');
  assert.ok(html.indexOf('assets/js/features/mini-historial.js') < html.indexOf('assets/common.js'), 'mini-historial.js se carga antes del script inline');
});

test('el botón «📜 Historial de guerra» de la cabecera, los tres selectores y el historial semanal viejo ya no están (parte 3)', () => {
  assert.ok(!html.includes('btnVerHistorialGuerra'));
  assert.ok(!html.includes('histGuerraAnioSelect') && !html.includes('histGuerraTemporadaSelect') && !html.includes('histGuerraSemanaSelect'));
  assert.ok(!html.includes("apiGetAuth('webHistorialGuerraJugador'"), 'el perfil ya no pide el historial semanal');
  assert.ok(!/function verHistorialGuerra\(/.test(html) && !/function construirSelectoresHistorialGuerra\(/.test(html));
  assert.match(html, /const MESES_ES = \['enero'/, 'MESES_ES se conserva: lo usa la gráfica');
});

test('renderMiembro() muestra la tarjeta solo con sesión de admin (misma regla que el botón de arriba)', () => {
  assert.match(html, /getElementById\('mHistorialGuerraCard'\)\.style\.display = esAdminLogueado\(\) \? 'block' : 'none';/);
});

function dias(n){ const out = []; const d = new Date(2026, 9, 25); while (out.length < n){ const w = d.getDay(); if (w === 0 || w >= 4) out.push({ fecha: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, ataques: 4, fame: 0, barcos: 0, temporada: 6, semana: 4 }); d.setDate(d.getDate() - 1); } return out; }
function cargar(respuesta){
  const r = html.match(/async function verHistorialGuerraPerfil\(\)\{[\s\S]*?\n\}\n/);
  assert.ok(r, 'no se encontró verHistorialGuerraPerfil() en perfil.html');
  const dom = new JSDOM('<!doctype html><html><body><div id="mHistorialGuerraTablaWrap" style="display:none;"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  const leer = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  // Un solo eval, como si fueran <script> clásicos que comparten el ámbito global (las const de mini-historial.js, como HIST_FILAS_INICIALES, solo se ven dentro del mismo eval en jsdom).
  w.eval([leer('assets/js/util.js'), leer('assets/js/features/mini-historial.js'),
    'var _llamadas = []; var TAG_PERFIL = "#2GG8PJ8GC"; window.apiGet = function(n, p, o){ _llamadas.push({ n, p, o }); return window._resp && window._resp.__falla ? Promise.reject(new Error(window._resp.__falla)) : Promise.resolve(window._resp); }; function msgErrorJson(e, base){ return base + ": " + e.message; }',
    r[0] + '\nwindow.verHistorialGuerraPerfil = verHistorialGuerraPerfil;'].join('\n;\n'));
  w._resp = respuesta;
  return w;
}

test('pide el comparador del jugador del perfil (la misma fuente del mini historial) y pinta 28 filas con «Ver más»', async () => {
  const w = cargar({ a: dias(60) });
  await w.verHistorialGuerraPerfil();
  const llamadas = JSON.parse(w.eval('JSON.stringify(_llamadas)'));
  assert.deepEqual(llamadas.map(l => [l.n, l.p]), [['webHistorialGuerraComparador', { tag1: '#2GG8PJ8GC', tag2: '' }]]);
  assert.equal(llamadas[0].o.conSesion, true);
  const wrap = w.document.getElementById('mHistorialGuerraTablaWrap');
  assert.equal(wrap.style.display, 'block');
  assert.equal(wrap.querySelectorAll('.hist-tabla-dia tbody tr').length, 28);
  assert.equal(wrap.querySelector('#histSelComp'), null, 'sin el selector «Comparar con»');
  wrap.querySelector('[data-hist-mas]').click();
  assert.equal(wrap.querySelectorAll('.hist-tabla-dia tbody tr').length, 56);
});

test('el perfil y el mini historial muestran lo mismo: la tabla del perfil es exactamente la de histPintarEn() con los mismos registros (el 4 de ataques no sale como 0)', async () => {
  const regs = [{ fecha: '2026-10-22', ataques: 4, fame: 3200, barcos: 1, temporada: 6, semana: 4 }];
  const w = cargar({ a: regs });
  await w.verHistorialGuerraPerfil();
  const wrap = w.document.getElementById('mHistorialGuerraTablaWrap');
  const celdas = [...wrap.querySelectorAll('.hist-tabla-dia tbody tr')[0].children].map(td => td.textContent);
  assert.deepEqual(celdas.slice(1, 8), ['22/10/2026', '6', 'S4', 'J', '4', '1', '3.200'].map((v, i) => i === 6 ? celdas[7] : v), 'fecha, temporada, semana, día y ataques del registro');
  assert.equal(celdas[5], '4', 'Ataques');
  const otro = w.document.createElement('div'); w.document.body.appendChild(otro);
  w.histPintarEn(otro, w.histSoloGuerra(regs), 28);
  assert.equal(otro.innerHTML, wrap.innerHTML);
});

test('sin registros y con error del backend se muestra un aviso, sin romper', async () => {
  let w = cargar({ a: [] });
  await w.verHistorialGuerraPerfil();
  assert.match(w.document.getElementById('mHistorialGuerraTablaWrap').textContent, /Sin registros de guerra/);
  w = cargar({ error: 'x' });
  await w.verHistorialGuerraPerfil();
  assert.match(w.document.getElementById('mHistorialGuerraTablaWrap').textContent, /No se pudo cargar el historial de guerra/);
  w = cargar({ __falla: 'red' });
  await w.verHistorialGuerraPerfil();
  assert.match(w.document.getElementById('mHistorialGuerraTablaWrap').textContent, /No se pudo cargar el historial de guerra: red/);
});
