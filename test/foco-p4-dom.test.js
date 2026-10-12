'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (12-oct-2026, accesibilidad, P-4): a dónde va el foco tras un veto exitoso (perfil.html, enviarVeto()) y
// tras «Marcar visto en el grupo» (admin.html, listener de #ganadoresLista). Claude lo decidió el 06-oct-2026 por
// encargo de la usuaria y quedó en el código sin prueba automática ni registro; esta prueba lo cubre.
// [→ Contexto_Base_Web.md §PF018 y §PF049]
//
// perfil.html y admin.html tienen miles de líneas de script, así que NO se cargan enteros: se extraen del <script>
// inline REAL los tramos de enviarVeto() y del listener, entre marcadores. Si alguien los reorganiza, los marcadores
// fallan a propósito. Se simulan apiPost, marcarVistoEnGrupo, manejarRespuestaAuth y cargarGanadoresTorneo.
//
// Un botón que se deshabilita o se quita del DOM pierde el foco en un navegador real y el foco cae en <body>; jsdom no
// siempre lo reproduce, así que cada simulación lo imita a propósito con perderFoco().
//
// LÍMITE: prueba el estado del foco con DOM simulado. No prueba lo que un lector de pantalla anuncia ni el aspecto
// del foco (contorno); tampoco el backend real.

function leer(archivo){ return fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'); }

function tramo(html, inicio, fin, nombre){
  const i = html.indexOf(inicio);
  const f = html.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó el archivo?)`);
  return html.slice(i, f);
}

const TRAMO_VETO = tramo(
  leer('perfil.html'),
  'async function enviarVeto(tag){',
  "document.getElementById('btnVetarJugador').addEventListener('click', function(){",
  'enviarVeto() de perfil.html'
);

const TRAMO_MARCAR = tramo(
  leer('admin.html'),
  "document.getElementById('ganadoresLista').addEventListener('click', async (ev) => {",
  'function abrirResolucionForm(tag, nombre, resolucionActual){',
  'el listener de #ganadoresLista de admin.html'
);

function nuevaVentana(body){
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/'
  });
  const { window } = dom;
  window.esc = (s) => String(s == null ? '' : s);
  return window;
}

const esperar = () => new Promise(r => setTimeout(r, 0));

// Imita al navegador (Chromium 141, medido el 04-oct-2026): un botón enfocado que se deshabilita pierde el foco y este
// cae en <body>. jsdom no lo hace y su blur() no actúa sobre un elemento deshabilitado, así que se habilita un instante.
function perderFoco(d){
  const a = d.activeElement;
  if (!a || a === d.body) return;
  const estabaDeshabilitado = a.disabled === true;
  a.disabled = false; a.blur(); a.disabled = estabaDeshabilitado;
}

/* ---------- perfil.html · enviarVeto() ---------- */

const BODY_VETO = `
  <button id="btnVetarJugador" data-tag="#T1">🚫 Vetar</button>
  <div id="mVetarWrap">
    <select id="vjRazon"><option value="NARANJA x" selected>NARANJA x</option></select>
    <textarea id="vjComentario"></textarea>
    <button id="btnVjConfirmar">Confirmar veto</button>
    <div id="vjMsg"></div>
  </div>`;

function montarVeto(respuestaApi){
  const window = nuevaVentana(BODY_VETO);
  window.confirm = () => true;
  window.localStorage.setItem('terna_admin_token', 'token-de-prueba');
  // apiPost real deshabilita el botón antes: aquí se imita el efecto sobre el foco (cae en <body>).
  window.apiPost = async () => {
    perderFoco(window.document);
    if (respuestaApi instanceof Error) throw respuestaApi;
    return respuestaApi;
  };
  window.eval(TRAMO_VETO);
  const d = window.document;
  const btn = d.getElementById('btnVjConfirmar');
  btn.focus();
  assert.equal(d.activeElement, btn, 'el botón debe tener el foco antes de enviar');
  return { window, d, btn, enviar: () => window.enviarVeto('#T1') };
}

test('veto exitoso: el foco pasa al mensaje «Miembro vetado.» (tabindex=-1), no cae en <body>', async () => {
  const { d, btn, enviar } = montarVeto({ ok: true });
  await enviar();
  const msg = d.querySelector('#vjMsg .msg-ok');
  assert.ok(msg, 'debe mostrar el mensaje de éxito');
  assert.equal(msg.textContent, 'Miembro vetado.');
  assert.equal(msg.getAttribute('tabindex'), '-1');
  assert.equal(d.activeElement, msg, 'el foco debe quedar en el mensaje de éxito');
  assert.ok(btn.disabled, 'tras vetar, Confirmar sigue deshabilitado (no se puede vetar dos veces)');
  assert.equal(d.getElementById('btnVetarJugador').textContent, '🚫 Vetado');
});

test('veto con error del servidor: el botón se rehabilita y recupera el foco', async () => {
  const { d, btn, enviar } = montarVeto({ ok: false, error: 'No autorizado' });
  await enviar();
  assert.ok(!btn.disabled);
  assert.equal(d.activeElement, btn);
  assert.match(d.getElementById('vjMsg').textContent, /No autorizado/);
});

test('veto sin conexión: el botón se rehabilita y recupera el foco', async () => {
  const { d, btn, enviar } = montarVeto(new Error('sin red'));
  await enviar();
  assert.ok(!btn.disabled);
  assert.equal(d.activeElement, btn);
  assert.match(d.getElementById('vjMsg').textContent, /Error de conexión: sin red/);
});

test('veto sin razón: no envía nada y el foco se queda en el botón', async () => {
  const { window, d, btn, enviar } = montarVeto({ ok: true });
  d.getElementById('vjRazon').innerHTML = '<option value="" selected>Elige una razón…</option>';
  let llamadas = 0;
  window.apiPost = async () => { llamadas++; return { ok: true }; };
  await enviar();
  assert.equal(llamadas, 0);
  assert.equal(d.activeElement, btn);
  assert.match(d.getElementById('vjMsg').textContent, /Elige una Razón/);
});

/* ---------- admin.html · «Marcar visto en el grupo» ---------- */

const BODY_MARCAR = `
  <div id="ganadoresMsg"></div>
  <div id="ganadoresLista">
    <div class="fila"><button type="button" class="btnMarcarGrupoManual" data-tag="#A" data-nombre="Ana">Marcar visto en el grupo</button></div>
    <div class="fila"><button type="button" class="btnMarcarGrupoManual" data-tag="#B" data-nombre="Beto">Marcar visto en el grupo</button></div>
  </div>`;

function montarMarcar(respuesta){
  const window = nuevaVentana(BODY_MARCAR);
  const d = window.document;
  window.manejarRespuestaAuth = () => false;
  window.marcarVistoEnGrupo = async () => {
    perderFoco(d); // botón deshabilitado: pierde el foco
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  };
  // El repintado real vuelve a dibujar la lista: el botón de #A desaparece y aparece su insignia (data-visto-tag).
  window.cargarGanadoresTorneo = async () => {
    d.getElementById('ganadoresLista').innerHTML =
      '<div class="fila"><span class="badge badge-ok" data-visto-tag="#A">Visto en el grupo (manual)</span></div>' +
      '<div class="fila"><button type="button" class="btnMarcarGrupoManual" data-tag="#B" data-nombre="Beto">Marcar visto en el grupo</button></div>';
    d.body.focus();
  };
  window.eval(TRAMO_MARCAR);
  const btnA = d.querySelector('.btnMarcarGrupoManual[data-tag="#A"]');
  btnA.focus();
  assert.equal(d.activeElement, btnA);
  return { window, d, btnA };
}

test('«Marcar visto» exitoso: el foco pasa a la insignia «Visto en el grupo (manual)» de la MISMA fila', async () => {
  const { d, btnA } = montarMarcar({ ok: true });
  btnA.click();
  await esperar(); await esperar();
  const insignia = d.querySelector('[data-visto-tag="#A"]');
  assert.ok(insignia, 'tras repintar debe existir la insignia de #A');
  assert.equal(insignia.getAttribute('tabindex'), '-1');
  assert.equal(d.activeElement, insignia, 'el foco debe quedar en la insignia, no en <body>');
  assert.equal(d.querySelector('[data-visto-tag="#B"]'), null, 'no debe afectar a la fila de otra cuenta');
});

test('«Marcar visto» con error del servidor: el botón se restaura y recupera el foco', async () => {
  const { d, btnA } = montarMarcar({ ok: false, error: 'No se pudo' });
  btnA.click();
  await esperar(); await esperar();
  assert.ok(!btnA.disabled);
  assert.equal(btnA.textContent, 'Marcar visto en el grupo');
  assert.equal(d.activeElement, btnA);
  assert.match(d.getElementById('ganadoresMsg').textContent, /No se pudo/);
});

test('«Marcar visto» sin conexión: el botón se restaura y recupera el foco', async () => {
  const { d, btnA } = montarMarcar(new Error('sin red'));
  btnA.click();
  await esperar(); await esperar();
  assert.ok(!btnA.disabled);
  assert.equal(d.activeElement, btnA);
  assert.match(d.getElementById('ganadoresMsg').textContent, /Error de conexión: sin red/);
});

test('«Marcar visto» con el foco movido a OTRO control mientras espera: no se lo roba al repintar la lista', async () => {
  const { d, btnA } = montarMarcar({ ok: true });
  d.body.insertAdjacentHTML('beforeend', '<input id="otro" type="text">');
  btnA.click();                          // el listener ya leyó teniaFoco = true; la petición queda en vuelo
  d.getElementById('otro').focus();      // la persona sigue con Tab o con el mouse mientras espera la respuesta
  await esperar(); await esperar();
  assert.ok(d.querySelector('[data-visto-tag="#A"]'), 'la lista sí se repinta');
  assert.equal(d.activeElement, d.getElementById('otro'), 'el foco debe seguir donde la persona lo puso');
});

test('«Marcar visto» con clic de mouse que no deja el foco en el botón (Safari): igual lleva el foco a la insignia si cayó en <body>', async () => {
  const { window, d, btnA } = montarMarcar({ ok: true });
  window.marcarVistoEnGrupo = async () => ({ ok: true });
  perderFoco(d);                         // en Safari un botón pulsado con el mouse no recibe foco: teniaFoco = false
  btnA.click();
  await esperar(); await esperar();
  const insignia = d.querySelector('[data-visto-tag="#A"]');
  assert.ok(insignia);
  assert.equal(d.activeElement, insignia);
});
