'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (20-oct-2026): cadena completa de una insignia de MAESTRÍA en perfil.html cuando la imagen falla.
// Regla de la usuaria: si el enlace de la insignia no da imagen y sus respaldos tampoco, se usa la imagen de la CARTA,
// y la carta también debe poder caer a su copia local (assets/Imágenes/cards/API/ y luego Fankit).
// Orden esperado (22-oct-2026, «local primero», PF162: las copias locales no traen margen y el enlace sí):
//   badges/API/Maestrías → badges/API/Insignias → enlace de la insignia → enlace remoto de la carta → assets/Imágenes/cards/API/
//   → assets/Imágenes/cards/Fankit/ → ícono genérico (ICONO_INSIGNIA_GENERICO) → se oculta.
// Las insignias que no son de maestría no tienen carta: badges/API/Insignias → badges/API/Maestrías → enlace → ícono genérico → se oculta.
// El onerror se lee del propio perfil.html (_insigniaItemHtml), para que la prueba siga al código real.
// LÍMITE: jsdom no descarga imágenes; el error de carga se simula disparando el evento «error».
// [→ Contexto_Base_Web.md §PF130]

const CDN = 'https://api-assets.clashroyale.com/';
const BADGE = 'MasteryRoninHash_1-x.png';
const CARTA = 'CartaRonin_2-y.png';

function onerrorDePerfil() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
  const m = /onerror="(if\(this\.dataset\.fallback\)[^"]*)"/.exec(html);
  assert.ok(m, 'no se encontró el onerror de _insigniaItemHtml en perfil.html');
  return m[1];
}

function rutaGenerica() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
  const m = /const ICONO_INSIGNIA_GENERICO = '([^']+)';/.exec(html);
  assert.ok(m, 'no se encontró ICONO_INSIGNIA_GENERICO en perfil.html');
  return m[1];
}

function montar(indice, sinCarta) {
  const window = loadBrowserScriptsWithDom(['assets/js/ui/imagenes-respaldo.js'], '<div id="c"></div>');
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(indice || {}) });
  const el = window.document.createElement('img');
  if (!sinCarta) el.setAttribute('data-fallback', CDN + 'cards/300/' + CARTA);
  el.setAttribute('data-generico', rutaGenerica());
  const codigo = onerrorDePerfil();
  el.onerror = function (ev) { new window.Function('event', codigo).call(el, ev); };
  window.document.getElementById('c').appendChild(el);
  // Igual que _insigniaItemHtml(): arranca con la copia local (Maestrías si es maestría, Insignias si no).
  window.ImagenesRespaldo.aplicar(el, CDN + 'playerbadges/512/' + BADGE, !sinCarta);
  const falla = () => el.dispatchEvent(new window.Event('error'));
  const esperar = () => new Promise(r => setTimeout(r, 0));
  return { el, falla, esperar };
}

test('maestría: copia local de la insignia → enlace de Supercell → enlace remoto de la carta', () => {
  const { el, falla } = montar();
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Maestr%C3%ADas/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Insignias/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), CDN + 'playerbadges/512/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), CDN + 'cards/300/' + CARTA);
  assert.notEqual(el.style.visibility, 'hidden');
});

test('maestría: si la carta remota también falla, se prueba la copia local de la carta (api)', () => {
  const { el, falla } = montar();
  falla(); falla(); falla();
  falla(); // falla la carta remota
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/cards/API/' + CARTA);
  assert.notEqual(el.style.visibility, 'hidden');
});

test('maestría: si la copia api de la carta falla, se prueba Fankit; si también falla, va el ícono genérico', async () => {
  const { el, falla, esperar } = montar({ [CARTA]: 'ronin.png' });
  falla(); falla(); falla(); falla();
  falla(); // falla assets/Imágenes/cards/API/
  await esperar();
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/cards/Fankit/ronin.png');
  falla(); // falla Fankit
  assert.equal(el.getAttribute('src'), rutaGenerica());
  assert.notEqual(el.style.visibility, 'hidden');
});

test('maestría sin carta en el índice de Fankit: tras fallar la copia api va el ícono genérico', async () => {
  const { el, falla, esperar } = montar({});
  falla(); falla(); falla(); falla(); falla();
  await esperar();
  assert.equal(el.getAttribute('src'), rutaGenerica());
});

test('si el ícono genérico también falla, se oculta y no entra en bucle', async () => {
  const { el, falla, esperar } = montar({});
  falla(); falla(); falla(); falla(); falla();
  await esperar();
  assert.equal(el.getAttribute('src'), rutaGenerica());
  falla(); // falla el genérico
  assert.equal(el.style.visibility, 'hidden');
  assert.equal(el.getAttribute('src'), rutaGenerica());
});

test('insignia que no es de maestría (sin carta): copia local → enlace de Supercell → ícono genérico', () => {
  const { el, falla } = montar({}, true);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Insignias/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Maestr%C3%ADas/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), CDN + 'playerbadges/512/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), rutaGenerica());
  assert.notEqual(el.style.visibility, 'hidden');
  falla();
  assert.equal(el.style.visibility, 'hidden');
});

test('el ícono genérico existe y la insignia sin enlace lo usa en vez de un recuadro vacío', () => {
  const ruta = rutaGenerica();
  assert.ok(fs.existsSync(path.join(__dirname, '..', decodeURI(ruta))), ruta);
  const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
  assert.ok(html.includes('<img src="${ICONO_INSIGNIA_GENERICO}"'), 'falta el <img> genérico para la insignia sin enlace');
  assert.ok(!html.includes('<div class="badge-ico-vacio"></div>'), 'sigue el recuadro vacío');
});
