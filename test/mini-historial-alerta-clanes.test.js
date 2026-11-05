'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (5-nov-2026, pedido de la usuaria; §PF375, paso 1): ⚠️ permanente a la DERECHA del 📈 para quien estuvo en un clan vetado o rival.
// Se carga el mini-historial.js REAL con jsdom; apiGetAuth() y esAdminLogueado() se simulan (no hay backend).
// LÍMITE: no prueba el CSS ni el aspecto real; el modal del clic es el paso 2.

const RESUMEN = { ok: true, actualizado: '05/11/2026 18:00', jugadores: { ABC: { n: 2, tipos: ['rival', 'vetado'] }, XYZ: { n: 1, tipos: ['rival'] }, CERO: { n: 0, tipos: [] } } };

function cargar({ admin = true, resumen = RESUMEN, falla = false, detalle = null, detalleFalla = false } = {}){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/mini-historial.js'], '<table><tbody><tr><td id="celda"></td></tr></tbody></table>');
  w.eval(`window._pedidos = []; window.ICONO_WSP_SOLO = '<svg-wsp></svg-wsp>';
    window.esAdminLogueado = function(){ return ${admin}; };
    window.apiGetAuth = function(accion){ window._pedidos.push(accion); ${falla ? 'return Promise.reject(new Error("sin red"));' : 'return Promise.resolve(accion === "webAdminTagsClanesSospechosos" ? ' + JSON.stringify(resumen) + ' : { ok: true, tags: [] });'} };
    window._params = [];
    var _base = window.apiGetAuth;
    window.apiGetAuth = function(accion, params){
      if (accion === 'webAdminClanesSospechososJugador'){ window._params.push(params); return ${detalleFalla ? 'Promise.reject(new Error("sin red"))' : 'Promise.resolve(' + JSON.stringify(detalle) + ')'}; }
      return _base(accion, params);
    };`);
  return w;
}
const esperar = () => new Promise(r => setTimeout(r, 20));
const pedidosAlerta = w => JSON.parse(w.eval('JSON.stringify(_pedidos)')).filter(x => x === 'webAdminTagsClanesSospechosos');

test('admin con el Tag en el resumen: el ⚠️ va después (a la derecha) del 📈, con aviso accesible y sin cuenta de clanes en 0', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  const h = w.botonHistJugador({ tag: '#abc', nombre: 'Ana' });
  assert.match(h, /class="btn-alerta-clanes"/);
  assert.ok(h.indexOf('btn-hist-jugador') < h.indexOf('btn-alerta-clanes'), 'el ⚠️ va a la derecha del 📈');
  assert.match(h, /data-tag="#abc"/);
  assert.match(h, /Estuvo en 2 clanes vetados o rivales/);
  assert.match(w.botonHistJugador({ tag: '#XYZ', nombre: 'Uno' }), /Estuvo en 1 clan rival/);
  assert.doesNotMatch(w.botonHistJugador({ tag: '#CERO', nombre: 'Cero' }), /btn-alerta-clanes/, 'n = 0 no se alerta');
  assert.doesNotMatch(w.botonHistJugador({ tag: '#ZZZ', nombre: 'Otro' }), /btn-alerta-clanes/, 'un Tag fuera del resumen lleva solo el 📈');
});

test('el ⚠️ no desplaza al WhatsApp: el orden es WhatsApp, 📈, ⚠️; y con sinWsp (Ingresos recientes) el ⚠️ sigue saliendo', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  const h = w.botonHistJugador({ tag: '#ABC', nombre: 'Ana', tieneWsp: true });
  assert.ok(h.indexOf('hist-wsp') < h.indexOf('btn-hist-jugador') && h.indexOf('btn-hist-jugador') < h.indexOf('btn-alerta-clanes'));
  assert.match(w.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }, { sinWsp: true }), /btn-alerta-clanes/);
});

test('sin sesión de admin no se pide el resumen ni se pinta el ⚠️', async () => {
  const w = cargar({ admin: false });
  await w.alertaCargarTags();
  await esperar();
  assert.equal(pedidosAlerta(w).length, 0);
  assert.doesNotMatch(w.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }), /btn-alerta-clanes/);
});

test('con data-sin-wsp-tags en <body> (perfil.html) no se pide el resumen', async () => {
  const w = cargar();
  w.document.body.setAttribute('data-sin-wsp-tags', '');
  await w.alertaCargarTags();
  await esperar();
  assert.equal(pedidosAlerta(w).length, 0);
});

test('si el resumen llega después de pintar la tabla, el ⚠️ se inserta a la derecha de cada 📈 y no se duplica', async () => {
  const w = cargar();
  const celda = w.document.getElementById('celda');
  celda.innerHTML = '<span class="col-jugador-extras">' + w.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }) + '</span><span class="col-jugador-extras">' + w.botonHistJugador({ tag: '#ZZZ', nombre: 'Otro' }) + '</span>';
  assert.equal(celda.querySelectorAll('.btn-alerta-clanes').length, 0);
  await w.alertaCargarTags();
  assert.equal(celda.querySelectorAll('.btn-alerta-clanes').length, 1);
  const btn = celda.querySelector('.btn-hist-jugador[data-tag="#ABC"]');
  assert.ok(btn.nextElementSibling.classList.contains('btn-alerta-clanes'));
  w.alertaRepintar();
  assert.equal(celda.querySelectorAll('.btn-alerta-clanes').length, 1, 'una segunda pasada no duplica');
});

test('si el backend falla o no manda jugadores, no se rompe y no se pinta nada', async () => {
  const a = cargar({ falla: true });
  await a.alertaCargarTags();
  assert.doesNotMatch(a.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }), /btn-alerta-clanes/);
  const b = cargar({ resumen: { ok: false, error: 'Sesión inválida' } });
  await b.alertaCargarTags();
  assert.doesNotMatch(b.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }), /btn-alerta-clanes/);
  const c = cargar({ resumen: { ok: true } });
  await c.alertaCargarTags();
  assert.doesNotMatch(c.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }), /btn-alerta-clanes/);
});

test('el nombre con comillas o etiquetas se escapa en el ⚠️', async () => {
  const w = cargar();
  await w.alertaCargarTags();
  const h = w.botonHistJugador({ tag: '#ABC', nombre: 'A"B<i>' });
  assert.ok(!h.includes('<i>') && h.includes('A&quot;B&lt;i&gt;'));
});

const DETALLE = { ok: true, tag: '#ABC', historialDisponible: true, clanes: [
  { tag: '#CLANRIVAL', nombre: 'Rivales FC', tipos: ['rival'], semanas: 2, primera: { temporada: 4, semana: 3, temporadaRoyaleApi: 130 }, ultima: { temporada: 4, semana: 4, temporadaRoyaleApi: 130 },
    filas: [ { temporada: 4, semana: 4, ataques: 12, fame: 2800, barcos: 1, cerrada: true }, { temporada: 4, semana: 3, ataques: null, fame: null, barcos: null, cerrada: false } ] },
  { tag: '#CLANVETADO', nombre: 'Vetados <b>', tipos: ['rival', 'vetado'], semanas: 1, primera: { temporada: 0, semana: 2, supercell: '2025-12' }, ultima: { temporada: 0, semana: 2, supercell: '2025-12' }, filas: [] }
] };
const abrirAlerta = async w => { await w.alertaCargarTags(); w.document.getElementById('celda').innerHTML = w.botonHistJugador({ tag: '#ABC', nombre: 'Ana' }); w.document.querySelector('.btn-alerta-clanes').click(); await esperar(); return w.document.getElementById('alertaFondo'); };

test('clic en el ⚠️ abre su modal (no el del 📈), pide el detalle del Tag y pinta cada clan con tipo, semanas y tabla', async () => {
  const w = cargar({ detalle: DETALLE });
  const fondo = await abrirAlerta(w);
  assert.ok(fondo && fondo.classList.contains('abierto'));
  assert.equal(w.document.getElementById('histFondo'), null, 'el ⚠️ no abre el mini historial');
  assert.deepEqual(JSON.parse(w.eval('JSON.stringify(_params)')), [{ tag: '#ABC' }], 'pide el detalle del Tag del botón');
  const secciones = fondo.querySelectorAll('.alerta-clan');
  assert.equal(secciones.length, 2);
  const a = secciones[0];
  assert.match(a.textContent, /Rivales FC/);
  assert.match(a.textContent, /#CLANRIVAL/);
  assert.equal(a.querySelectorAll('.alerta-tipo-rival').length, 1);
  assert.equal(a.querySelectorAll('.alerta-tipo-vetado').length, 0);
  assert.match(a.querySelector('.alerta-clan-resumen').textContent, /2 semanas · T4 S3 → T4 S4/);
  const filas = a.querySelectorAll('tbody tr');
  assert.equal(filas.length, 2);
  const c0 = [...filas[0].querySelectorAll('td')].map(td => td.textContent);
  assert.deepEqual([c0[0], c0[1], c0[2], c0[3], c0[4]], ['1', '4', 'S4', '12', '1']);
  assert.match(c0[5], /2.?800/, 'medallas de la semana');
  assert.match(filas[1].textContent, /S3 · en curso/);
  assert.match(filas[1].textContent, /—/, 'sin valores se muestra —');
  const b = secciones[1];
  assert.equal(b.querySelectorAll('.alerta-tipo').length, 2, 'rival y vetado a la vez');
  assert.match(b.querySelector('.alerta-clan-resumen').textContent, /1 semana · 2025-12 S2 → 2025-12 S2/, 'anterior a la T1 interna: usa la temporada Supercell');
  assert.ok(!fondo.innerHTML.includes('<b>Vetados') && fondo.innerHTML.includes('Vetados &lt;b&gt;'), 'el nombre del clan se escapa');
  assert.match(b.textContent, /Sin detalle semanal guardado/);
});

test('sin el historial individual (historialDisponible:false) se muestran los clanes y se avisa', async () => {
  const w = cargar({ detalle: { ok: true, historialDisponible: false, clanes: [{ tag: '#C', nombre: 'Solo archivo', tipos: ['vetado'], semanas: 3, primera: { temporada: 5, semana: 1 }, ultima: { temporada: 5, semana: 3 }, filas: [] }] } });
  const fondo = await abrirAlerta(w);
  assert.match(fondo.textContent, /Solo archivo/);
  assert.match(fondo.textContent, /3 semanas · T5 S1 → T5 S3/);
  assert.match(fondo.textContent, /No se pudo leer el historial del jugador/);
});

test('sin clanes o con error del backend: mensaje claro y sin romper', async () => {
  const a = await abrirAlerta(cargar({ detalle: { ok: true, clanes: [] } }));
  assert.match(a.textContent, /Sin clanes vetados ni rivales registrados/);
  const b = await abrirAlerta(cargar({ detalle: { ok: false, error: 'Sesión inválida o vencida.' } }));
  assert.match(b.textContent, /No se pudo cargar el detalle/);
  const c = await abrirAlerta(cargar({ detalleFalla: true }));
  assert.match(c.textContent, /No se pudo cargar el detalle/);
});

test('el modal del ⚠️ se cierra con ×, con clic fuera y con Esc', async () => {
  const w = cargar({ detalle: DETALLE });
  const fondo = await abrirAlerta(w);
  w.document.getElementById('alertaCerrar').click();
  assert.ok(!fondo.classList.contains('abierto'));
  w.document.querySelector('.btn-alerta-clanes').click(); await esperar();
  assert.ok(fondo.classList.contains('abierto'));
  fondo.click();
  assert.ok(!fondo.classList.contains('abierto'));
  w.document.querySelector('.btn-alerta-clanes').click(); await esperar();
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.ok(!fondo.classList.contains('abierto'));
});

test('styles.css trae los estilos del ⚠️', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets/styles.css'), 'utf8');
  assert.match(css, /\.btn-alerta-clanes\{/);
  assert.match(css, /\.col-jugador-extras \.btn-alerta-clanes\{margin-left:0;\}/);
  assert.match(css, /\.alerta-panel\{/);
  assert.match(css, /\.alerta-tipo-rival\{/);
  assert.match(css, /\.alerta-tipo-vetado\{/);
});
