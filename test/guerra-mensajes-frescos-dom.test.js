'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-oct-2026, §PF181): botones «Copiar» de los mensajes de guerra de guerra.html. Antes copiaban el texto guardado al repintar (sin saber su
// antigüedad); ahora piden el mensaje sin caché al hacer clic, muestran «Elaborados hace N min», avisan si pasan de 5 min y los admins con la Función
// «Actualizar roster» pueden «Regenerar ahora» (POST tipo:'mensajes') o engancharse a una regeneración en curso. Se extrae el tramo REAL del <script> inline
// y se prueba con stubs de esAdminLogueado(), apiGetAuth(), apiPost() y el portapapeles. LÍMITE: no hay navegador real, ni ClipboardItem (jsdom no lo trae:
// se prueba la vía writeText), ni servidor.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function pintarPastillaMensajesGuerra'));
assert.ok(grande, 'no se encontró pintarPastillaMensajesGuerra() en guerra.html');
const I = grande.indexOf('let msjGuerraAbierto');
const F = grande.indexOf('/* cargarAportesInactivosSiAdmin');
assert.ok(I >= 0 && F > I, 'marcadores del tramo de mensajes de guerra no encontrados');
const TRAMO = grande.slice(I, F);
const MARCADO = html.slice(html.indexOf('<span class="pend-acciones">'), html.indexOf('id="msjGuerraWrap" hidden></div>') + 40);

const MIN = 60 * 1000;
const lima = (ts) => '23/10/2026 ' + new Date(ts - 5 * 3600 * 1000).toISOString().slice(11, 19);
const elab = (haceMin) => { const ts = Date.now() - haceMin * MIN; return { generadosTs: ts, generadosLima: lima(ts), aplica: true }; };
const ops = (txt) => [{ etiqueta: 'Terna Uno', contenido: txt + ' uno' }, { etiqueta: 'Chat General', contenido: txt + ' general' }];
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };

function montar({ admin = true, inicial, fresco, permisos, estados = [], post } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], `<div>${MARCADO}</div>`);
  window.__log = [];
  window.__copiado = [];
  window.__estados = estados.slice();
  window.__cfg = { admin, inicial: inicial || { ok: true, opciones: ops('viejo'), elaboracion: elab(1) }, fresco, permisos: permisos || { ok: true, funciones: [] }, post: post || (async () => ({ ok: true, estado: 'pendiente', mensaje: 'Solicitada.' })) };
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copiado.push(t); } } });
  window.localStorage.setItem('terna_admin_token', 'TOK');
  window.eval(`function esAdminLogueado(){ return window.__cfg.admin; }
async function apiGetAuth(accion, params){
  window.__log.push({ accion, params });
  const c = window.__cfg;
  if (accion === 'webAdminMisPermisos') return c.permisos;
  if (accion === 'webAdminEstadoActualizacion') return window.__estados.length > 1 ? window.__estados.shift() : window.__estados[0];
  if (params && params.fresco === '1' && c.fresco !== undefined) { if (c.fresco instanceof Error) throw c.fresco; return c.fresco; }
  return c.inicial;
}
async function apiPost(accion, datos){ window.__log.push({ accion, datos }); return window.__cfg.post(accion, datos); }
${TRAMO}
window.__t = { cargar: cargarMensajesGuerraSiAdmin, edad: edadMensajesGuerra, regenerar: regenerarMensajesGuerra, estado: () => msjGuerraEstado };`);
  const d = window.document;
  return { window, d, wrap: d.getElementById('msjGuerraWrap'), pastilla: d.getElementById('btnMsjGuerra'), t: window.__t };
}
const botones = (w) => [...w.querySelectorAll('.btn-copiar-mg')];
const meta = (d) => d.getElementById('msjGuerraMeta');

test('edadMensajesGuerra: sin hora o categoría no generada devuelve null; marca «vieja» pasados 5 min', () => {
  const { t } = montar();
  assert.equal(t.edad(null), null);
  assert.equal(t.edad({ generadosTs: null }), null);
  assert.equal(t.edad({ generadosTs: Date.now(), aplica: false }), null);
  assert.equal(t.edad(elab(0)).texto, 'hace menos de 1 min');
  assert.equal(t.edad(elab(4)).vieja, false);
  assert.equal(t.edad(elab(6)).vieja, true);
  assert.equal(t.edad(elab(6)).texto, 'hace 6 min');
  assert.equal(t.edad(elab(135)).texto, 'hace 2 h 15 min');
  assert.match(t.edad({ generadosTs: 1, generadosLima: '23/10/2026 19:08:41' }).hora, /^19:08$/);
});

test('la fila muestra «Elaborados hace N min (hora)»; con más de 5 min sale el aviso ámbar y la pastilla lleva ⚠', async () => {
  const a = montar({ inicial: { ok: true, opciones: ops('x'), elaboracion: elab(2) } });
  await a.t.cargar({ esDiaGuerra: true });
  assert.match(meta(a.d).textContent, /Elaborados hace 2 min \(\d\d:\d\d\)/);
  assert.doesNotMatch(meta(a.d).textContent, /Pueden no incluir/);
  assert.equal(a.pastilla.classList.contains('vieja'), false);

  const b = montar({ inicial: { ok: true, opciones: ops('x'), elaboracion: elab(9) } });
  await b.t.cargar({ esDiaGuerra: true });
  assert.match(meta(b.d).textContent, /hace 9 min/);
  assert.match(meta(b.d).textContent, /Pueden no incluir los últimos ataques/);
  assert.ok(meta(b.d).classList.contains('vieja'));
  assert.ok(b.pastilla.classList.contains('vieja'));
});

test('al hacer clic se pide el mensaje SIN caché y se copia el texto fresco, no el de la carga', async () => {
  const { window, wrap, t } = montar({ inicial: { ok: true, opciones: ops('viejo'), elaboracion: elab(1) }, fresco: { ok: true, opciones: ops('NUEVO'), elaboracion: elab(0) } });
  await t.cargar({ esDiaGuerra: true });
  botones(wrap)[0].click();
  await flush();
  assert.deepEqual(window.__copiado, ['NUEVO uno']);
  const llamada = window.__log.filter(l => l.accion === 'webAdminContenido').pop();
  assert.equal(llamada.params.fresco, '1');
  assert.match(botones(wrap)[0].textContent, /Copiado/);
});

test('si los mensajes ya estaban viejos, el botón lo dice al copiar', async () => {
  const { wrap, t } = montar({ inicial: { ok: true, opciones: ops('v'), elaboracion: elab(12) }, fresco: { ok: true, opciones: ops('v'), elaboracion: elab(12) } });
  await t.cargar({ esDiaGuerra: true });
  botones(wrap)[1].click();
  await flush();
  assert.match(botones(wrap)[1].textContent, /Copiado · hace 12 min/);
});

test('si no se puede refrescar, copia lo que tenía y lo avisa en el botón', async () => {
  const { window, wrap, t } = montar({ fresco: new Error('sin red') });
  await t.cargar({ esDiaGuerra: true });
  botones(wrap)[0].click();
  await flush();
  assert.deepEqual(window.__copiado, ['viejo uno']);
  assert.match(botones(wrap)[0].textContent, /Copiado \(sin refrescar\)/);
});

test('si la opción ya no existe en la lista fresca, NO copia nada viejo y recarga la lista', async () => {
  const { window, wrap, t } = montar({ fresco: { ok: true, opciones: [{ etiqueta: 'Chat General', contenido: 'solo general' }], elaboracion: elab(0) } });
  await t.cargar({ esDiaGuerra: true });
  botones(wrap)[0].click();
  await flush();
  assert.deepEqual(window.__copiado, []);
  await flush(10);
  assert.ok(window.__log.filter(l => l.accion === 'webAdminContenido').length >= 3, 'tras avisar se vuelve a pedir la lista');
  const etiquetas = botones(wrap).map(b => b.textContent);
  assert.equal(etiquetas.length, 1, 'la lista recargada ya solo tiene la opción que sigue existiendo');
  assert.match(etiquetas[0], /Chat General/);
});

test('«Regenerar ahora» solo aparece con la Función «Actualizar roster»', async () => {
  const sin = montar({ permisos: { ok: true, funciones: ['Otra cosa'] } });
  await sin.t.cargar({ esDiaGuerra: true });
  await flush();
  assert.equal(sin.d.getElementById('btnRegenMsjGuerra'), null);

  const con = montar({ permisos: { ok: true, funciones: ['Actualizar roster'] }, estados: [{ ok: true, estado: 'ok', tipo: 'mensajes' }] });
  await con.t.cargar({ esDiaGuerra: true });
  await flush();
  assert.ok(con.d.getElementById('btnRegenMsjGuerra'));
});

test('sin sesión de admin no se consulta nada: ni mensajes, ni permisos', async () => {
  const { window, t } = montar({ admin: false });
  await t.cargar({ esDiaGuerra: true });
  await flush();
  assert.equal(window.__log.length, 0);
});

test('regenerar: pide tipo "mensajes", espera el avance y recarga los mensajes sin caché', async () => {
  const { window, wrap, t } = montar({
    permisos: { ok: true, funciones: [] },
    fresco: { ok: true, opciones: ops('NUEVO'), elaboracion: elab(0) },
    estados: [
      { ok: true, estado: 'ok', tipo: 'mensajes', puedeIniciar: true },
      { ok: true, estado: 'pendiente', tipo: 'mensajes', mensaje: 'Esperando turno: el sistema está ejecutando runGuerra.' },
      { ok: true, estado: 'ejecutando', tipo: 'mensajes', mensaje: 'Regenerando... (1 de 4 pasos hechos)' },
      { ok: true, estado: 'ok', tipo: 'mensajes', mensaje: 'Pendientes y Mensajes de guerra regenerados.' }
    ]
  });
  window.setTimeout = (fn) => { fn(); return 0; };
  await t.cargar({ esDiaGuerra: true });
  await t.regenerar();
  const post = window.__log.find(l => l.accion === 'webAdminActualizarRoster');
  assert.ok(post, 'debe pedir la regeneración');
  assert.equal(post.datos.tipo, 'mensajes');
  assert.equal(post.datos.sessionToken, 'TOK');
  const recarga = window.__log.filter(l => l.accion === 'webAdminContenido').pop();
  assert.equal(recarga.params.fresco, '1');
  assert.match(wrap.textContent, /Mensajes regenerados/);
  assert.equal(t.estado().error, false);
});

test('regenerar: si ya hay una en curso se engancha y NO pide otra', async () => {
  const { window, t } = montar({
    fresco: { ok: true, opciones: ops('NUEVO'), elaboracion: elab(0) },
    estados: [
      { ok: true, estado: 'ejecutando', tipo: 'mensajes', mensaje: 'Regenerando...' },
      { ok: true, estado: 'ok', tipo: 'mensajes', mensaje: 'listo' }
    ]
  });
  window.setTimeout = (fn) => { fn(); return 0; };
  await t.cargar({ esDiaGuerra: true });
  await t.regenerar();
  assert.equal(window.__log.filter(l => l.accion === 'webAdminActualizarRoster').length, 0);
  assert.ok(window.__log.filter(l => l.accion === 'webAdminContenido' && l.params.fresco === '1').length >= 1);
});

test('regenerar: si no se puede iniciar (espera o ventana protegida) muestra el motivo y no pide nada', async () => {
  const { window, t } = montar({ estados: [{ ok: true, estado: 'ok', tipo: 'roster', puedeIniciar: false, motivoBloqueo: 'Se actualizó hace poco. Podrás volver en 120 s.' }] });
  await t.cargar({ esDiaGuerra: true });
  await t.regenerar();
  assert.equal(window.__log.filter(l => l.accion === 'webAdminActualizarRoster').length, 0);
  assert.match(t.estado().texto, /Podrás volver en 120 s/);
  assert.equal(t.estado().error, true);
});

test('regenerar: si lo que terminó fue una actualización de Directorio, lo explica y no recarga como si fuera la regeneración', async () => {
  const { window, t } = montar({
    estados: [
      { ok: true, estado: 'ejecutando', tipo: 'roster', mensaje: 'Actualizando...' },
      { ok: true, estado: 'ok', tipo: 'roster', mensaje: 'Clanes, Directorio, Nuevos y Guerra actualizados.' }
    ]
  });
  window.setTimeout = (fn) => { fn(); return 0; };
  await t.cargar({ esDiaGuerra: true });
  const antes = window.__log.filter(l => l.accion === 'webAdminContenido').length;
  await t.regenerar();
  assert.match(t.estado().texto, /no regenera los mensajes/);
  assert.equal(window.__log.filter(l => l.accion === 'webAdminContenido').length, antes);
});

test('regenerar: si Pendientes no pudo (ok_parcial) muestra el mensaje del servidor como aviso', async () => {
  const { window, t } = montar({
    estados: [
      { ok: true, estado: 'ok', tipo: 'mensajes', puedeIniciar: true },
      { ok: true, estado: 'ok_parcial', tipo: 'mensajes', mensaje: 'No se pudieron regenerar: faltaron datos de guerra de la API.' }
    ]
  });
  window.setTimeout = (fn) => { fn(); return 0; };
  await t.cargar({ esDiaGuerra: true });
  await t.regenerar();
  assert.match(t.estado().texto, /faltaron datos de guerra/);
  assert.equal(t.estado().error, true);
});
