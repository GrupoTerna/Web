'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (21-nov-2026, §PF556): «📊 Dashboard de guerra» de guerra.html, solo admins y solo en día de guerra. Una tarjeta por clan con el puesto de HOY (medallas del día,
// la misma definición de _puestoMedallasDiaPorClan_() del backend, §PF532), las medallas que faltan para el 1.º, los ataques pendientes y «Copiar mensaje». Se extrae el
// tramo REAL del <script> inline (mensajes de guerra + dashboard + los ayudantes de Tag) y se prueba con stubs de esAdminLogueado(), apiGetAuth(), apiPost() y el
// portapapeles. LÍMITE: no hay navegador real, ni ClipboardItem (jsdom no lo trae: se prueba la vía writeText), ni servidor.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function puestoMedallasDiaDeGrupo'));
assert.ok(grande, 'no se encontró puestoMedallasDiaDeGrupo() en guerra.html');

const entre = (ini, fin) => {
  const i = grande.indexOf(ini);
  const f = grande.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores no encontrados: ${ini} … ${fin}`);
  return grande.slice(i, f);
};
// Una función declarada en la raíz del script, por llaves balanceadas.
const funcion = (nombre) => {
  const i = grande.indexOf(`function ${nombre}(`);
  assert.ok(i >= 0, `no se encontró function ${nombre}()`);
  let j = grande.indexOf('{', i), n = 0;
  for (; j < grande.length; j++) {
    if (grande[j] === '{') n++;
    else if (grande[j] === '}' && --n === 0) break;
  }
  return grande.slice(i, j + 1);
};

const AYUDANTES = ['_normNombreClanGuerra', '_normTagGuerra', 'clanTagDeNombreGuerra', 'atributosClanGuerra', 'agruparPronosticoPorClan'].map(funcion).join('\n');
const MENSAJES = entre('let msjGuerraAbierto', '/* cargarAportesInactivosSiAdmin');
const DASHBOARD = entre('let dashGuerraVisible', '/* cargarParticipacionHoySiAdmin');
const SECCION = html.slice(html.indexOf('<section id="dashGuerraSection"'), html.indexOf('</section>', html.indexOf('<section id="dashGuerraSection"')) + '</section>'.length);
const PASTILLA = html.slice(html.indexOf('<span class="pend-acciones">'), html.indexOf('id="msjGuerraWrap" hidden></div>') + 40);
assert.ok(SECCION.includes('id="dashGuerraWrap"'), 'no se encontró la sección del dashboard en guerra.html');

const MIN = 60 * 1000;
const lima = (ts) => '21/11/2026 ' + new Date(ts - 5 * 3600 * 1000).toISOString().slice(11, 19);
const elab = (haceMin) => { const ts = Date.now() - haceMin * MIN; return { generadosTs: ts, generadosLima: lima(ts), aplica: true }; };
const flush = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };

// Tres clanes de la Familia (el orden sale de ordenClanIndex en util.js: principal, «2», «3», «Mini») y sus Tags.
const MAPA_TAGS = { 'Grupo乂Terna™': '#AAA', 'Terna 2': '#BBB', 'Mini Ternas': '#CCC' };
const clanPron = (clanTag, nombre, fameHoy, extra) => Object.assign({ clanTag, nombre, esRival: false, clanesEnCarrera: 3, fameHoy, puesto: 2 }, extra || {});
const rival = (clanTernaTag, nombre, fameHoy) => ({ clanTag: '#R' + nombre, nombre, esRival: true, clanTernaTag, fameHoy });

function pronosticoBase() {
  return { ok: true, clanes: [
    clanPron('#AAA', 'Grupo乂Terna™', 2350),
    rival('#AAA', 'Rival B', 2800), rival('#AAA', 'Rival C', 1000),
    clanPron('#BBB', 'Terna 2', 3100),
    rival('#BBB', 'Rival D', 2700), rival('#BBB', 'Rival E', 500),
    clanPron('#CCC', 'Mini Ternas', 0),
    rival('#CCC', 'Rival F', 0), rival('#CCC', 'Rival G', 0)
  ] };
}
const datosBase = () => ({
  ctx: { esDiaGuerra: true },
  clanTagPorClan: MAPA_TAGS,
  guerraPorClan: { 'Mini Ternas': { atacaron: 1, totalHoy: 3 }, 'Terna 2': { atacaron: 2, totalHoy: 4 }, 'Grupo乂Terna™': { atacaron: 0, totalHoy: 2 } },
  pendientes: [
    { clan: 'Grupo乂Terna™', tag: '#1', faltantes: 4 }, { clan: 'Grupo乂Terna™', tag: '#2', faltantes: 2 },
    { clan: 'Terna 2', tag: '#3', faltantes: 1 }
  ]
});
const opcionesBase = () => [
  { etiqueta: 'Grupo乂Terna™', subcategoria: 'Particular', clan: 'Grupo乂Terna™', contenido: 'mensaje terna' },
  { etiqueta: 'Terna 2', subcategoria: 'Particular', clan: 'Terna 2', contenido: 'mensaje italia' },
  { etiqueta: 'Chat General', subcategoria: 'Chat General', clan: '', contenido: 'mensaje general' }
];

function montar({ admin = true, data, pron, inicial, fresco, permisos, estados = [], post } = {}) {
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], `<div>${PASTILLA}${SECCION}</div>`);
  window.__log = [];
  window.__copiado = [];
  window.__estados = estados.slice();
  window.__cfg = {
    admin,
    data: data === undefined ? datosBase() : data,
    pron: pron === undefined ? pronosticoBase() : pron,
    inicial: inicial || { ok: true, opciones: opcionesBase(), elaboracion: elab(1) },
    fresco,
    permisos: permisos || { ok: true, funciones: [] },
    post: post || (async () => ({ ok: true, mensaje: 'Solicitada.' }))
  };
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
let ultimoDataGuerra = window.__cfg.data;
let ultimoPronosticoData = null;
async function cargarPronosticoGuerra(ctx, manual){ window.__log.push({ accion: 'pronostico', manual: !!manual }); if (window.__cfg.pron) { ultimoPronosticoData = window.__cfg.pron; pintarDashboardGuerra(); } return !!window.__cfg.pron; }
${AYUDANTES}
${MENSAJES}
${DASHBOARD}
window.__t = {
  puesto: puestoMedallasDiaDeGrupo, agrupar: agruparPronosticoPorClan,
  cargarDash: cargarDashboardGuerraSiAdmin, cargarMsj: cargarMensajesGuerraSiAdmin, regenerar: regenerarMensajesGuerra,
  pintar: pintarDashboardGuerra, estado: () => msjGuerraEstado,
  poner: (d, p) => { ultimoDataGuerra = d; ultimoPronosticoData = p; }
};`);
  const d = window.document;
  return { window, d, t: window.__t, sec: d.getElementById('dashGuerraSection'), wrap: d.getElementById('dashGuerraWrap'), meta: d.getElementById('dashGuerraMeta') };
}
const tarjetas = (wrap) => [...wrap.querySelectorAll('.dash-clan')];
const nums = (card) => [...card.querySelectorAll('.dash-num')].map(n => ({ valor: n.querySelector('b').textContent, texto: n.querySelector('span').textContent }));
const llamadas = (w, accion) => w.__log.filter(l => l.accion === accion);

// ---------- el cálculo del puesto (mismos casos de §PF532) ----------
function grupo(yo, otros, enCarrera) {
  return { propio: { nombre: 'Mi clan', clanTag: '#AAA', clanesEnCarrera: enCarrera === undefined ? otros.length + 1 : enCarrera, fameHoy: yo },
    rivales: otros.map((f, i) => ({ nombre: 'Rival ' + String.fromCharCode(66 + i), fameHoy: f })) };
}

test('puesto de hoy: tercero de cinco, faltan 450 para el 1.º (caso de §PF532)', () => {
  const { t } = montar();
  const r = t.puesto(grupo(2350, [2800, 2400, 1000, 500]));
  assert.equal(r.puesto, 3);
  assert.equal(r.total, 5);
  assert.equal(r.estado, 'detras');
  assert.equal(r.diferencia, 450);
  assert.equal(r.rival.nombre, 'Rival B');
  assert.equal(r.rival.medallas, 2800);
});

test('puesto de hoy: primeros, el 2.º nos alcanzaría con 400 medallas más', () => {
  const { t } = montar();
  const r = t.puesto(grupo(3100, [2700, 500]));
  assert.equal(r.puesto, 1);
  assert.equal(r.estado, 'primero');
  assert.equal(r.diferencia, 400);
  assert.equal(r.rival.nombre, 'Rival B');
});

test('puesto de hoy: empate en el 1.º comparte puesto y no tiene diferencia', () => {
  const { t } = montar();
  const r = t.puesto(grupo(3100, [3100, 500]));
  assert.equal(r.puesto, 1);
  assert.equal(r.estado, 'empate');
  assert.equal(r.diferencia, 0);
});

test('puesto de hoy: no se inventa si a algún clan le falta la fama de hoy, si nadie suma o si la carrera no está completa', () => {
  const { t } = montar();
  assert.equal(t.puesto(grupo(2350, [2800, null])), null, 'un rival sin fama de hoy');
  assert.equal(t.puesto(grupo(2350, [2800, undefined])), null);
  assert.deepEqual(JSON.parse(JSON.stringify(t.puesto(grupo(0, [0, 0])))), { sinMedallas: true, total: 3 });
  assert.equal(t.puesto(grupo(2350, [2800, 1000], 5)), null, 'la carrera dice 5 clanes y solo se conocen 3');
  assert.equal(t.puesto(null), null);
  assert.equal(t.puesto(grupo(2350, [])), null, 'un clan solo no tiene puesto que comparar');
});

test('puesto de hoy: un backend anterior (sin fameHoy) NO cae al acumulado de la semana', () => {
  const { t } = montar();
  const g = grupo(2350, [2800, 1000]);
  [g.propio, ...g.rivales].forEach(c => { delete c.fameHoy; c.fameActual = 63000; });
  assert.equal(t.puesto(g), null);
});

// ---------- la sección ----------
test('admin en día de guerra: se ve, con una tarjeta por clan en el orden fijo y los tres números', async () => {
  const { t, sec, wrap } = montar();
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  assert.notEqual(sec.style.display, 'none');
  const cards = tarjetas(wrap);
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map(c => c.dataset.clan), ['Grupo乂Terna™', 'Terna 2', 'Mini Ternas'], 'orden fijo de la Familia, no el del backend');
  assert.deepEqual(cards.map(c => c.dataset.clanTag), ['AAA', 'BBB', 'CCC']);

  const [terna, italia, dos] = cards.map(nums);
  assert.deepEqual(terna[0], { valor: '2.º', texto: 'de 3 clanes · hoy' });
  assert.deepEqual(terna[1], { valor: '450', texto: 'faltan para el 1.º' });
  assert.equal(terna[2].valor, '6', 'ataques pendientes = suma de faltantes del clan');
  assert.match(terna[2].texto, /2 jugadores/);
  assert.deepEqual(italia[0], { valor: '1.º', texto: 'de 3 clanes · hoy' });
  assert.deepEqual(italia[1], { valor: '+400', texto: 'de ventaja sobre el 2.º' });
  assert.match(italia[2].texto, /1 jugador$/);
  assert.equal(dos[0].valor, '—', 'nadie suma medallas: sin puesto');
  assert.equal(dos[2].valor, '0');
  assert.match(cards[0].querySelector('.dash-detalle').textContent, /Hoy: 2.?350 medallas\. 1\.º: Rival B \(2.?800\)\./);
  assert.match(cards[0].querySelector('.dash-detalle').textContent, /Acumulado de la semana: 2\.º/);
});

test('se identifica el clan por Tag: el mensaje y los pendientes se unen aunque el nombre escrito sea otro', async () => {
  const data = datosBase();
  data.clanTagPorClan = Object.assign({}, MAPA_TAGS, { 'Grupo Terna (nombre viejo)': '#AAA' });
  data.pendientes = [{ clan: 'Grupo Terna (nombre viejo)', tag: '#1', faltantes: 3 }];
  const inicial = { ok: true, elaboracion: elab(1), opciones: [{ etiqueta: 'Grupo Terna (nombre viejo)', subcategoria: 'Particular', clan: 'Grupo Terna (nombre viejo)', contenido: 'm viejo' }] };
  const { t, wrap } = montar({ data, inicial });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  const terna = tarjetas(wrap)[0];
  assert.equal(nums(terna)[2].valor, '3', 'los pendientes llegaron por Tag');
  assert.ok(terna.querySelector('.dash-copiar'), 'el mensaje llegó por Tag');
  assert.equal(tarjetas(wrap)[1].querySelector('.dash-copiar'), null, 'el mensaje de otro clan no se pega a Terna 2');
});

test('sin el mapa clanTagPorClan (backend anterior) todo cae al nombre, como antes', async () => {
  const data = datosBase();
  delete data.clanTagPorClan;
  const { t, wrap } = montar({ data });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  const cards = tarjetas(wrap);
  assert.equal(nums(cards[0])[2].valor, '6');
  assert.ok(cards[0].querySelector('.dash-copiar'));
  assert.deepEqual(nums(cards[0])[0], { valor: '2.º', texto: 'de 3 clanes · hoy' });
});

test('«Copiar mensaje» pide el texto SIN caché y copia el fresco, no el de la carga', async () => {
  const fresco = { ok: true, elaboracion: elab(0), opciones: opcionesBase().map(o => Object.assign({}, o, { contenido: o.contenido + ' NUEVO' })) };
  const { window, t, wrap } = montar({ fresco });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  tarjetas(wrap)[1].querySelector('.dash-copiar').click();
  await flush();
  assert.deepEqual(window.__copiado, ['mensaje italia NUEVO']);
  assert.equal(llamadas(window, 'webAdminContenido').pop().params.fresco, '1');
  assert.match(tarjetas(wrap)[1].querySelector('.dash-copiar').textContent, /Copiado/);
});

test('«Copiar mensaje»: si la opción ya no existe en la lista fresca no copia nada viejo y la tarjeta pasa a «Sin mensaje»', async () => {
  const fresco = { ok: true, elaboracion: elab(0), opciones: [{ etiqueta: 'Chat General', subcategoria: 'Chat General', clan: '', contenido: 'solo general' }] };
  const { window, t, wrap } = montar({ fresco });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  tarjetas(wrap)[0].querySelector('.dash-copiar').click();
  await flush();
  assert.deepEqual(window.__copiado, []);
  assert.equal(tarjetas(wrap)[0].querySelector('.dash-copiar'), null);
  assert.match(tarjetas(wrap)[0].textContent, /todavía no se genera/);
});

test('«Copiar mensaje»: si no se puede refrescar copia lo que había y lo avisa', async () => {
  const { window, t, wrap } = montar({ fresco: new Error('sin red') });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  tarjetas(wrap)[0].querySelector('.dash-copiar').click();
  await flush();
  assert.deepEqual(window.__copiado, ['mensaje terna']);
  assert.match(tarjetas(wrap)[0].querySelector('.dash-copiar').textContent, /sin refrescar/);
});

test('un clan sin pendientes no tiene mensaje y la tarjeta lo explica', async () => {
  const { t, wrap } = montar();
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  assert.match(tarjetas(wrap)[2].textContent, /no tiene jugadores pendientes/);
});

test('si fallan los mensajes, la tarjeta dice el motivo en vez de quedarse en blanco', async () => {
  const { t, wrap } = montar({ inicial: { ok: false, error: 'No tienes acceso a esta categoría.' } });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  assert.match(tarjetas(wrap)[0].textContent, /No se pudo cargar el mensaje: .*No tienes acceso a esta categoría/);
});

test('sin pronóstico la tarjeta igual muestra pendientes y mensaje, y el puesto dice que carga', async () => {
  const { window, t, wrap } = montar({ pron: null });
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  const card = tarjetas(wrap)[0];
  assert.equal(nums(card)[0].valor, '—');
  assert.equal(nums(card)[2].valor, '6');
  assert.ok(card.querySelector('.dash-copiar'));
  assert.match(card.querySelector('.dash-detalle').textContent, /Cargando puestos/);
  assert.equal(llamadas(window, 'pronostico').length, 1, 'se pide el pronóstico una vez, sin caché');
  assert.equal(llamadas(window, 'pronostico')[0].manual, true);
});

test('sin sesión de admin o fuera de día de guerra: la sección se oculta y no se pide nada', async () => {
  const a = montar({ admin: false });
  await a.t.cargarDash({ esDiaGuerra: true });
  assert.equal(a.sec.style.display, 'none');
  assert.equal(a.wrap.innerHTML, '');
  assert.equal(a.window.__log.length, 0);

  const b = montar();
  await b.t.cargarMsj({ esDiaGuerra: true });
  await b.t.cargarDash({ esDiaGuerra: true });
  assert.notEqual(b.sec.style.display, 'none');
  await b.t.cargarDash({ esDiaGuerra: false });
  assert.equal(b.sec.style.display, 'none');
  assert.equal(b.wrap.innerHTML, '');
  assert.equal(b.meta.hidden, true);
});

test('si nada cambió, repintar no reemplaza las tarjetas (no se pierde el «✔ Copiado» ni el foco)', async () => {
  const { t, wrap } = montar();
  await t.cargarMsj({ esDiaGuerra: true });
  await t.cargarDash({ esDiaGuerra: true });
  const antes = wrap.querySelector('.dash-copiar');
  t.pintar();
  t.pintar();
  assert.equal(wrap.querySelector('.dash-copiar'), antes);
});

// ---------- antigüedad y actualización automática ----------
test('con mensajes viejos y la Función «Actualizar roster», la actualización se pide sola UNA vez y se ve el aviso', async () => {
  const { window, t, meta } = montar({
    inicial: { ok: true, opciones: opcionesBase(), elaboracion: elab(9) },
    fresco: { ok: true, opciones: opcionesBase(), elaboracion: elab(0) },
    permisos: { ok: true, funciones: ['Actualizar roster'] },
    estados: [
      { ok: true, estado: 'ok', tipo: 'mensajes', puedeIniciar: true },
      { ok: true, estado: 'ejecutando', tipo: 'mensajes', mensaje: 'Regenerando... (1 de 4 pasos hechos)' },
      { ok: true, estado: 'ok', tipo: 'mensajes', mensaje: 'listo' }
    ]
  });
  window.setTimeout = (fn) => { fn(); return 0; };
  await t.cargarDash({ esDiaGuerra: true });
  await t.cargarMsj({ esDiaGuerra: true });
  await flush(40);
  const posts = llamadas(window, 'webAdminActualizarRoster');
  assert.equal(posts.length, 1, 'se pidió una sola regeneración');
  assert.equal(posts[0].datos.tipo, 'mensajes');
  // repintados posteriores (cada minuto) no vuelven a pedirla aunque los mensajes sigan viejos
  await t.cargarDash({ esDiaGuerra: true });
  await t.cargarMsj({ esDiaGuerra: true });
  await flush(20);
  assert.equal(llamadas(window, 'webAdminActualizarRoster').length, 1);
  assert.ok(llamadas(window, 'pronostico').some(l => l.manual), 'al terminar se piden puesto y medallas sin caché del navegador');
  assert.ok(meta.querySelector('#btnRegenDashGuerra'), 'el botón «Actualizar ahora» también está en el dashboard');
});

test('con mensajes recientes no se pide nada solo', async () => {
  const { window, t } = montar({ permisos: { ok: true, funciones: ['Actualizar roster'] }, estados: [{ ok: true, estado: 'ok', tipo: 'mensajes', puedeIniciar: true }] });
  await t.cargarDash({ esDiaGuerra: true });
  await t.cargarMsj({ esDiaGuerra: true });
  await flush(20);
  assert.equal(llamadas(window, 'webAdminActualizarRoster').length, 0);
});

test('sin la Función «Actualizar roster» no se pide nada, pero el dashboard avisa que pueden faltar ataques', async () => {
  const { window, t, meta } = montar({ inicial: { ok: true, opciones: opcionesBase(), elaboracion: elab(12) }, permisos: { ok: true, funciones: [] } });
  await t.cargarDash({ esDiaGuerra: true });
  await t.cargarMsj({ esDiaGuerra: true });
  await flush(20);
  assert.equal(llamadas(window, 'webAdminActualizarRoster').length, 0);
  assert.match(meta.textContent, /elaborados hace 12 min/);
  assert.match(meta.textContent, /Pueden no incluir los últimos ataques/);
  assert.equal(meta.querySelector('#btnRegenDashGuerra'), null);
  assert.ok(meta.classList.contains('vieja'));
});

test('si no se puede iniciar la actualización automática, el dashboard muestra el motivo y no insiste', async () => {
  const { window, t, meta } = montar({
    inicial: { ok: true, opciones: opcionesBase(), elaboracion: elab(9) },
    permisos: { ok: true, funciones: ['Actualizar roster'] },
    estados: [{ ok: true, estado: 'ok', tipo: 'roster', puedeIniciar: false, motivoBloqueo: 'Se actualizó hace poco. Podrás volver en 120 s.' }]
  });
  await t.cargarDash({ esDiaGuerra: true });
  await t.cargarMsj({ esDiaGuerra: true });
  await flush(30);
  assert.equal(llamadas(window, 'webAdminActualizarRoster').length, 0);
  assert.match(meta.textContent, /Podrás volver en 120 s/);
  const consultas = llamadas(window, 'webAdminEstadoActualizacion').length;
  await t.cargarMsj({ esDiaGuerra: true });
  await flush(20);
  assert.equal(llamadas(window, 'webAdminActualizarRoster').length, 0);
  assert.ok(llamadas(window, 'webAdminEstadoActualizacion').length <= consultas + 1, 'no vuelve a lanzar otra regeneración');
});
