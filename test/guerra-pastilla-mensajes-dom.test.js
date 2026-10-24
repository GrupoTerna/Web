'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-oct-2026, tanda 7 del consolidado del mini historial; Contexto_Base_Web.md §PF177): pastilla «✉ Mensajes de guerra»
// junto a «Pendientes de Atacar», solo para admins en día de guerra, que muestra u oculta la fila de botones «Copiar».
// Se extrae del <script> inline REAL de guerra.html el tramo msjGuerraAbierto … cargarMensajesGuerraSiAdmin() y se prueba con
// stubs de esAdminLogueado() y apiGetAuth(). LÍMITE: no prueba el diseño real (ancho en móvil) ni el servidor.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function pintarPastillaMensajesGuerra'));
assert.ok(grande, 'no se encontró pintarPastillaMensajesGuerra() en guerra.html');
const I = grande.indexOf('let msjGuerraAbierto');
const F = grande.indexOf('/* cargarAportesInactivosSiAdmin');
assert.ok(I >= 0 && F > I, 'marcadores del tramo de mensajes de guerra no encontrados');
const TRAMO = grande.slice(I, F);

// el HTML real de la fila del título, para comprobar también el marcado inicial
const MARCADO = html.slice(html.indexOf('<span class="pend-acciones">'), html.indexOf('id="msjGuerraWrap" hidden></div>') + 40);
assert.ok(MARCADO.includes('btnMsjGuerra') && MARCADO.includes('msjGuerraWrap'));

function montar({ admin = true, respuesta } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], `<div>${MARCADO}</div>`);
  window.__llamadas = 0;
  window.__cfg = { admin, respuesta: respuesta || { opciones: [{ etiqueta: 'Terna Uno', contenido: 'hola' }, { etiqueta: 'Chat General', contenido: 'x' }] } };
  window.eval(`function esAdminLogueado(){ return window.__cfg.admin; }
async function apiGetAuth(){ window.__llamadas++; return window.__cfg.respuesta; }
${TRAMO}
window.__t = { cargar: cargarMensajesGuerraSiAdmin };`);
  const d = window.document;
  return { window, d, btn: d.getElementById('btnMsjGuerra'), wrap: d.getElementById('msjGuerraWrap'), cargar: window.__t.cargar };
}

test('marcado inicial: la pastilla y la fila nacen ocultas, con aria-expanded y aria-controls', () => {
  const { btn, wrap } = montar();
  assert.ok(btn.hidden && wrap.hidden);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(btn.getAttribute('aria-controls'), 'msjGuerraWrap');
});

test('admin en día de guerra: la pastilla se ve, la fila sigue oculta y se abre y cierra con la pastilla', async () => {
  const { btn, wrap, cargar } = montar();
  await cargar({ esDiaGuerra: true });
  assert.equal(btn.hidden, false);
  assert.equal(wrap.hidden, true, 'la fila arranca oculta (P13)');
  assert.equal(wrap.querySelectorAll('.btn-copiar-mg').length, 2, 'los botones ya están cargados');
  btn.click();
  assert.equal(wrap.hidden, false);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  btn.click();
  assert.equal(wrap.hidden, true);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
});

test('el estado abierto sobrevive al repintado periódico', async () => {
  const { btn, wrap, cargar } = montar();
  await cargar({ esDiaGuerra: true });
  btn.click();
  await cargar({ esDiaGuerra: true });
  assert.equal(wrap.hidden, false);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(btn.hidden, false);
});

test('sin sesión de admin: ni pastilla, ni fila, ni petición al servidor', async () => {
  const { window, btn, wrap, cargar } = montar({ admin: false });
  await cargar({ esDiaGuerra: true });
  assert.ok(btn.hidden && wrap.hidden);
  assert.equal(wrap.innerHTML, '');
  assert.equal(window.__llamadas, 0);
});

test('fuera de día de guerra: nada se muestra y el estado vuelve a cerrado', async () => {
  const { window, btn, wrap, cargar } = montar();
  await cargar({ esDiaGuerra: true });
  btn.click();
  await cargar({ esDiaGuerra: false });
  assert.ok(btn.hidden && wrap.hidden);
  assert.equal(wrap.innerHTML, '');
  await cargar({ esDiaGuerra: true });
  assert.equal(wrap.hidden, true, 'al volver la guerra arranca cerrada otra vez');
  // 3 = 2 cargas de mensajes (solo en día de guerra) + 1 consulta de permisos para «Regenerar ahora» (§PF181, una sola vez por página); fuera de día de guerra no se pide nada.
  assert.equal(window.__llamadas, 3, 'no se pide nada fuera de día de guerra');
});

test('si el servidor falla, el admin ve el motivo al abrir la pastilla', async () => {
  const { btn, wrap, cargar } = montar({ respuesta: { ok: false, error: 'No tienes acceso a esta categoría.' } });
  await cargar({ esDiaGuerra: true });
  assert.equal(wrap.hidden, true);
  btn.click();
  assert.equal(wrap.hidden, false);
  assert.match(wrap.textContent, /No tienes acceso a esta categoría/);
});
