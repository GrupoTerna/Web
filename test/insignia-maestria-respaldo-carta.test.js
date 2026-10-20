'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (20-oct-2026): cadena completa de una insignia de MAESTRÍA en perfil.html cuando la imagen falla.
// Regla de la usuaria: si el enlace de la insignia no da imagen y sus respaldos tampoco, se usa la imagen de la CARTA,
// y la carta también debe poder caer a su copia local (assets/cards/api/ y luego Fankit).
// Orden esperado: enlace de la insignia → assets/playerbadges/api/ → enlace remoto de la carta → assets/cards/api/
//                 → assets/cards/Fankit/ → se oculta.
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

function montar(indice) {
  const window = loadBrowserScriptsWithDom(['assets/js/ui/imagenes-respaldo.js'], '<div id="c"></div>');
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(indice || {}) });
  const el = window.document.createElement('img');
  el.setAttribute('src', CDN + 'playerbadges/512/' + BADGE);
  el.setAttribute('data-fallback', CDN + 'cards/300/' + CARTA);
  const codigo = onerrorDePerfil();
  el.onerror = function (ev) { new window.Function('event', codigo).call(el, ev); };
  window.document.getElementById('c').appendChild(el);
  const falla = () => el.dispatchEvent(new window.Event('error'));
  const esperar = () => new Promise(r => setTimeout(r, 0));
  return { el, falla, esperar };
}

test('maestría: enlace → copia api de la insignia → enlace remoto de la carta', () => {
  const { el, falla } = montar();
  falla();
  assert.equal(el.getAttribute('src'), 'assets/playerbadges/api/' + BADGE);
  falla();
  assert.equal(el.getAttribute('src'), CDN + 'cards/300/' + CARTA);
  assert.notEqual(el.style.visibility, 'hidden');
});

test('maestría: si la carta remota también falla, se prueba la copia local de la carta (api)', () => {
  const { el, falla } = montar();
  falla(); falla();
  falla(); // falla la carta remota
  assert.equal(el.getAttribute('src'), 'assets/cards/api/' + CARTA);
  assert.notEqual(el.style.visibility, 'hidden');
});

test('maestría: si la copia api de la carta falla, se prueba Fankit; si también falla, se oculta', async () => {
  const { el, falla, esperar } = montar({ [CARTA]: 'ronin.png' });
  falla(); falla(); falla();
  falla(); // falla assets/cards/api/
  await esperar();
  assert.equal(el.getAttribute('src'), 'assets/cards/Fankit/ronin.png');
  falla(); // falla Fankit
  assert.equal(el.style.visibility, 'hidden');
});

test('maestría sin carta en el índice de Fankit: tras fallar la copia api se oculta', async () => {
  const { el, falla, esperar } = montar({});
  falla(); falla(); falla(); falla();
  await esperar();
  assert.equal(el.style.visibility, 'hidden');
});
