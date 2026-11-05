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

function cargar({ admin = true, resumen = RESUMEN, falla = false } = {}){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/mini-historial.js'], '<table><tbody><tr><td id="celda"></td></tr></tbody></table>');
  w.eval(`window._pedidos = []; window.ICONO_WSP_SOLO = '<svg-wsp></svg-wsp>';
    window.esAdminLogueado = function(){ return ${admin}; };
    window.apiGetAuth = function(accion){ window._pedidos.push(accion); ${falla ? 'return Promise.reject(new Error("sin red"));' : 'return Promise.resolve(accion === "webAdminTagsClanesSospechosos" ? ' + JSON.stringify(resumen) + ' : { ok: true, tags: [] });'} };`);
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

test('styles.css trae los estilos del ⚠️', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets/styles.css'), 'utf8');
  assert.match(css, /\.btn-alerta-clanes\{/);
  assert.match(css, /\.col-jugador-extras \.btn-alerta-clanes\{margin-left:0;\}/);
});
