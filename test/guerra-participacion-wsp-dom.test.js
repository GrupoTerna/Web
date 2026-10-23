'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (22-oct-2026, pedido de la usuaria; §PF171): en «Participación de Hoy» de guerra.html cada cuenta lleva el 📈 del mini historial
// y, solo para admins y cuando el backend manda tieneWsp:true, el ícono de WhatsApp (sin enlace, sin número).
// Se extraen del <script> inline REAL las funciones que arman la lista. LÍMITE: se prueba el HTML como texto, no un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function _liCuentaParticipacion'));
assert.ok(grande, 'no se encontró _liCuentaParticipacion en guerra.html');
const ini = grande.indexOf('function _extrasCuentaParticipacion');
const fin = grande.indexOf('const ATAQUES_MAX_HOY');
assert.ok(ini >= 0 && fin > ini, 'marcadores de las funciones de Participación de Hoy no encontrados');

function construir(esAdmin){
  return new Function('esAdminLogueado', `
    const esc = s => String(s == null ? '' : s);
    const enlaceJugador = n => n;
    const ICONO_WSP_SOLO = '<svg-wsp></svg-wsp>';
    const botonHistJugador = f => f && f.tag ? '<button class="btn-hist-jugador" data-tag="' + f.tag + '">📈</button>' : '';
    ${grande.slice(ini, fin)}
    return { _liCuentaParticipacion, _listaCuentasHtml };`)(() => esAdmin);
}
const cta = (extra) => Object.assign({ tag: '#ABC', nombre: 'Ana', ataquesHoy: 2 }, extra);

test('con sesión de admin y tieneWsp:true: lleva el 📈 y el ícono de WhatsApp, sin enlace', () => {
  const h = construir(true)._liCuentaParticipacion(cta({ tieneWsp: true }), 2);
  assert.match(h, /btn-hist-jugador/);
  assert.match(h, /class="part-wsp"/);
  assert.match(h, /<svg-wsp>/);
  assert.doesNotMatch(h, /<a[^>]*part-wsp/);
  assert.ok(h.indexOf('btn-hist-jugador') < h.indexOf('part-pend'), 'los íconos van antes de los pendientes');
});

test('sin tieneWsp, con tieneWsp:false o sin sesión de admin: solo el 📈', () => {
  const a = construir(true), b = construir(false);
  for (const h of [a._liCuentaParticipacion(cta({}), 2), a._liCuentaParticipacion(cta({ tieneWsp: false }), 2), b._liCuentaParticipacion(cta({ tieneWsp: true }), 2)]) {
    assert.match(h, /btn-hist-jugador/);
    assert.doesNotMatch(h, /part-wsp/);
  }
});

test('una cuenta sin tag no lleva el 📈 pero se pinta igual', () => {
  const h = construir(true)._liCuentaParticipacion({ nombre: 'Sin tag', tieneWsp: true }, null);
  assert.doesNotMatch(h, /btn-hist-jugador/);
  assert.match(h, /Sin tag/);
});

test('el bloque de «más de un clan hoy» también lleva los íconos', () => {
  assert.match(html, /\$\{esc\(m\.tag \|\| ''\)\}<\/span>\$\{_extrasCuentaParticipacion\(m\)\} — /);
});

test('la constante del ícono de WhatsApp vive solo en clan-badges.js', () => {
  const cb = fs.readFileSync(path.join(__dirname, '..', 'assets/js/data/clan-badges.js'), 'utf8');
  assert.match(cb, /const ICONO_WSP_SOLO = /);
  assert.ok(!/const ICONO_WSP_SOLO/.test(html), 'guerra.html no debe redefinir el ícono');
});
