'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria: «mueve el panel de noticias a su propio botón entre comunidad y mensajes»): el tablero
// «Noticias de la semana» ya no es una tarjeta de admin.html; es la página noticias.html, con el link «Noticias» del nav entre
// «Comunidad» y «Mensajes», que solo se ve con sesión de admin (mismo mecanismo que «Mensajes», 19-sep-2026).
//
// Se carga el noticias.html REAL en jsdom y se simulan apiGetAuth() y la redirección. Lo único que se reemplaza en el script es
// `window.location.replace(`, que jsdom no implementa.
// LÍMITE: DOM y backend simulados; no prueba el backend real (webAdminSemanasRecientes, webAdminNoticiasSemana) ni el aspecto
// del tablero en un navegador.

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const AUTH = leer('assets/js/core/auth.js');
const NOTICIAS = leer('noticias.html');

test('las 12 páginas con barra llevan «Noticias» justo después de «Comunidad» y antes de «Mensajes»', () => {
  const paginas = ['404', 'admin', 'clan', 'comunidad', 'directorio', 'guerra', 'index', 'mensajes', 'noticias', 'perfil', 'permisos', 'torneos'];
  for(const p of paginas){
    const html = leer(p + '.html');
    const c = html.indexOf('<a href="comunidad.html" data-page="comunidad"');
    const n = html.indexOf('<a href="noticias.html" data-page="noticias" style="display:none;">Noticias</a>');
    const m = html.indexOf('<a href="mensajes.html" data-page="mensajes" style="display:none;">Mensajes</a>');
    assert.ok(c > 0 && n > c && m > n, p + '.html: orden Comunidad < Noticias < Mensajes');
    assert.equal(html.split('data-page="noticias" style="display:none;"').length - 1, 1, p + '.html: un solo link «Noticias»');
  }
});

test('admin.html ya no tiene el tablero de Noticias y vuelve a noticias.html con ?volver=noticias', () => {
  const html = leer('admin.html');
  for(const resto of ['id="noticiasGrupo"', 'id="noticiasDash"', 'id="noticiasSemana"', 'btnRefrescarNoticias', 'function renderNoticias(', 'function poblarSelectorNoticias(', 'function cargarNoticias(', '.nt-kpis{', '.nt-panel{']){
    assert.equal(html.includes(resto), false, 'admin.html todavía contiene ' + resto);
  }
  assert.ok(html.includes("get('volver') === 'noticias'") && html.includes("window.location.replace('noticias.html')"));
  assert.ok(html.includes('input[aria-invalid="true"]{border-color:var(--danger);}'), 'la regla PF110 que compartía comentario con el tablero debe seguir');
});

test('«Noticias» sigue oculto sin sesión y se muestra con sesión (auth.js)', () => {
  const NAV = '<nav class="nav"><div class="links"><a href="noticias.html" data-page="noticias" style="display:none;">Noticias</a><a href="mensajes.html" data-page="mensajes" style="display:none;">Mensajes</a><a href="admin.html" data-page="admin" class="cta">Acceder</a></div></nav>';
  for(const [sesion, visible] of [[false, false], [true, true]]){
    const dom = new JSDOM(`<!doctype html><body>${NAV}</body>`, { runScripts: 'outside-only', url: 'https://terna.example/' });
    const w = dom.window;
    if(sesion) w.localStorage.setItem('terna_admin_token', 'tok');
    w.eval(AUTH + '\nactualizarNavCta();');
    assert.equal(w.document.querySelector('a[data-page="noticias"]').style.display, visible ? '' : 'none', sesion ? 'con sesión' : 'sin sesión');
  }
});

test('robots.txt y noticias.html piden que no se indexe', () => {
  assert.ok(leer('robots.txt').includes('Disallow: /noticias.html'));
  assert.ok(NOTICIAS.includes('<meta name="robots" content="noindex, nofollow">'));
});

// ---------- comportamiento de la página ----------

const SEMANAS = [
  { lunesIso: '2026-11-02', domingoIso: '2026-11-08', temporada: 12, semana: 5 },
  { lunesIso: '2026-10-26', domingoIso: '2026-11-01', temporada: 12, semana: 4 }
];
// Cada sección trae su propio ok/error; con todas en error el tablero se pinta igual (los paneles muestran su aviso).
const TABLERO = (lunes) => ({ ok: true, lunesIso: lunes, semana: SEMANAS.find(s => s.lunesIso === lunes) || {}, posiciones: { ok: false, error: 'sin datos' }, guerra: { ok: false, error: 'sin datos' }, barcos: { ok: false, error: 'sin datos' }, ascensos: { ok: false, error: 'sin datos' }, movimientos: { ok: false, error: 'sin datos' } });

function montar({ sesion = true, admin = null, semanas = { ok: true, semanas: SEMANAS }, noticias = TABLERO } = {}){
  const html = NOTICIAS.replace(/<script src="[^"]*"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/noticias.html' });
  const w = dom.window;
  if(sesion) w.localStorage.setItem('terna_admin_token', 'tok');
  if(admin) w.localStorage.setItem('terna_admin_info', JSON.stringify(admin));
  w.__llamadas = [];
  w.__redirecciones = [];
  w.__semanas = semanas;
  w.__noticias = noticias;
  const m = html.match(/^<script>\n([\s\S]*?)^<\/script>/m);
  assert.ok(m, 'no se encontró el <script> inline de noticias.html');
  assert.equal((m[1].match(/window\.location\.replace\(/g) || []).length, 2, 'cambió la cantidad de redirecciones del script');
  w.eval(`
    function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function enlaceJugador(n){ return esc(n); }
    function enlaceClan(n){ return esc(n); }
    function cerrarSesionAdmin(){ window.__cerro = true; localStorage.removeItem('terna_admin_token'); return Promise.resolve(); }
    async function apiGetAuth(accion, params){
      window.__llamadas.push({ accion, params });
      if(accion === 'webAdminSemanasRecientes') return typeof window.__semanas === 'function' ? window.__semanas() : window.__semanas;
      if(accion === 'webAdminNoticiasSemana') return window.__noticias(params.lunesIso);
      throw new Error('acción inesperada: ' + accion);
    }
    ${m[1].replace(/window\.location\.replace\(/g, 'window.__ir(')}
  `.replace('function esc(', 'window.__ir = (u) => window.__redirecciones.push(u);\n    function esc('));
  return w;
}
const espera = (w, ms = 30) => new Promise(r => setTimeout(r, ms));
const id = (w, x) => w.document.getElementById(x);
const acciones = (w) => w.__llamadas.map(l => l.accion);

test('sin sesión no se muestra nada y se vuelve al login con ?volver=noticias', async () => {
  const w = montar({ sesion: false });
  await espera(w);
  assert.deepEqual(w.__redirecciones, ['admin.html?volver=noticias']);
  assert.equal(id(w, 'panelSec').style.display, 'none');
  assert.equal(w.__llamadas.length, 0, 'sin sesión no se pide nada al backend');
});

test('con sesión: pide las semanas, elige la más reciente y arma el tablero sin pedir nada más', async () => {
  const w = montar({ admin: { nomMulti: 'Diana', nombre: 'Diana P.' } });
  await espera(w);
  assert.equal(id(w, 'panelSec').style.display, 'block');
  assert.equal(id(w, 'noticiasBienvenida').textContent, 'Hola, Diana');
  assert.deepEqual(acciones(w), ['webAdminSemanasRecientes', 'webAdminNoticiasSemana']);
  assert.equal(w.__llamadas[1].params.lunesIso, '2026-11-02', 'la semana elegida por defecto es la más reciente');
  const sel = id(w, 'noticiasSemana');
  assert.equal(sel.options.length, 2);
  assert.match(sel.options[0].textContent, /Temporada 12 \(noviembre\) Semana 5 \(02 nov - 08 nov\)/);
  const dash = id(w, 'noticiasDash').innerHTML;
  assert.ok(dash.includes('nt-grid'), 'el tablero se pintó');
  assert.equal(dash.includes('Armando el tablero'), false);
  assert.equal(id(w, 'noticiasMsg').innerHTML, '');
  assert.deepEqual(w.__redirecciones, []);
});

test('cambiar de semana pide la otra; volver a la primera sale de la caché; «Actualizar» fuerza la petición', async () => {
  const w = montar();
  await espera(w);
  const sel = id(w, 'noticiasSemana');
  sel.value = '2026-10-26';
  sel.dispatchEvent(new w.Event('change'));
  await espera(w);
  sel.value = '2026-11-02';
  sel.dispatchEvent(new w.Event('change'));
  await espera(w);
  assert.deepEqual(w.__llamadas.filter(l => l.accion === 'webAdminNoticiasSemana').map(l => l.params.lunesIso), ['2026-11-02', '2026-10-26'], 'la primera semana ya estaba en caché');
  id(w, 'btnRefrescarNoticias').click();
  await espera(w);
  assert.deepEqual(w.__llamadas.filter(l => l.accion === 'webAdminNoticiasSemana').map(l => l.params.lunesIso), ['2026-11-02', '2026-10-26', '2026-11-02']);
});

test('sesión vencida al pedir las semanas: vuelve al login', async () => {
  const w = montar({ semanas: { ok: false, error: 'Tu sesión expiró, vuelve a iniciar sesión.' } });
  await espera(w);
  assert.deepEqual(w.__redirecciones, ['admin.html?volver=noticias']);
  assert.equal(acciones(w).includes('webAdminNoticiasSemana'), false);
});

test('sesión vencida al pedir el tablero: vuelve al login', async () => {
  const w = montar({ noticias: () => ({ ok: false, error: 'Sesión inválida.' }) });
  await espera(w);
  assert.deepEqual(w.__redirecciones, ['admin.html?volver=noticias']);
});

test('otro error al pedir el tablero: se muestra el motivo, sin redirigir', async () => {
  const w = montar({ noticias: () => ({ ok: false, error: 'La hoja no está disponible.' }) });
  await espera(w);
  assert.deepEqual(w.__redirecciones, []);
  assert.match(id(w, 'noticiasMsg').innerHTML, /La hoja no está disponible\./);
  assert.equal(id(w, 'noticiasDash').innerHTML, '');
});

test('sin semanas por un fallo del servidor: avisa el motivo y «Actualizar» reintenta y arma el tablero', async () => {
  const w = montar({ semanas: { ok: false, error: 'El servidor está ocupado.' } });
  await espera(w);
  assert.match(id(w, 'noticiasMsg').innerHTML, /No se pudieron cargar las semanas: El servidor está ocupado\./);
  assert.match(id(w, 'noticiasMsg').innerHTML, /Actualizar/);
  assert.equal(id(w, 'noticiasSemana').value, '');
  w.__semanas = { ok: true, semanas: SEMANAS };
  id(w, 'btnRefrescarNoticias').click();
  await espera(w);
  assert.equal(id(w, 'noticiasMsg').innerHTML, '');
  assert.ok(id(w, 'noticiasDash').innerHTML.includes('nt-grid'));
  assert.equal(acciones(w).filter(a => a === 'webAdminSemanasRecientes').length, 2);
});

test('«Cerrar sesión» cierra la sesión local y vuelve al login con ?volver=noticias', async () => {
  const w = montar();
  await espera(w);
  id(w, 'logoutBtn').click();
  await espera(w, 60);
  assert.equal(w.__cerro, true);
  assert.deepEqual(w.__redirecciones, ['admin.html?volver=noticias']);
});

test('si otra pestaña cierra la sesión, esta página vuelve al login', async () => {
  const w = montar();
  await espera(w);
  w.dispatchEvent(new w.StorageEvent('storage', { key: 'terna_admin_token', newValue: null }));
  assert.deepEqual(w.__redirecciones, ['admin.html?volver=noticias']);
});
