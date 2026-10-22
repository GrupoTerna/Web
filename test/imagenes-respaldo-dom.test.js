'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026): respaldo de las imágenes de la API de Supercell (assets/js/ui/imagenes-respaldo.js).
// Orden: enlace de la API → assets/Imágenes/<tipo>/API/ → assets/Imágenes/cards/Fankit/ (índice) → onerror propio de la etiqueta.
// [→ Contexto_Base_Web.md §PF130]
//
// LÍMITE: jsdom no descarga imágenes; el error de carga se simula disparando el evento «error» sobre la <img>.
// No prueba que el CDN, las copias `api` ni los PNG de Fankit existan de verdad (eso lo cubre check-local-links
// solo para rutas estáticas; el índice se comprueba contra la carpeta en la prueba de abajo).

const CDN = 'https://api-assets.clashroyale.com/';
const H = 'aBcD_1-xyz.png';

function montar(indice) {
  const window = loadBrowserScriptsWithDom(['assets/js/ui/imagenes-respaldo.js'], '<div id="c"></div>');
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(indice || {}) });
  const c = window.document.getElementById('c');
  function img(src, extra) {
    const el = window.document.createElement('img');
    el.setAttribute('src', src);
    if (extra) el.onerror = extra;
    c.appendChild(el);
    return el;
  }
  const falla = el => el.dispatchEvent(new window.Event('error'));
  return { window, img, falla };
}

test('carta: API → copia api → Fankit → onerror propio, y el onerror propio no corre antes', async () => {
  const { img, falla } = montar({ [H]: 'knight.png' });
  let propios = 0;
  const el = img(CDN + 'cards/300/' + H, () => { propios++; });
  falla(el);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/cards/API/' + H);
  assert.equal(propios, 0);
  falla(el);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/cards/Fankit/knight.png');
  assert.equal(propios, 0);
  falla(el);
  assert.equal(propios, 1, 'sin más etapas corre el onerror de la etiqueta');
});

test('evolución y héroe también usan assets/Imágenes/cards/API/', () => {
  const { img, falla } = montar();
  const a = img(CDN + 'cardevolutions/300/' + H); falla(a);
  const b = img(CDN + 'cardheroes/300/' + H); falla(b);
  assert.equal(a.getAttribute('src'), 'assets/Im%C3%A1genes/cards/API/' + H);
  assert.equal(b.getAttribute('src'), 'assets/Im%C3%A1genes/cards/API/' + H);
});

test('insignia de jugador: API → badges/API/Maestrías → badges/API/Insignias → onerror propio (no hay Fankit)', () => {
  const { img, falla } = montar({ [H]: 'knight.png' });
  let propios = 0;
  const el = img(CDN + 'playerbadges/512/' + H, () => { propios++; });
  falla(el);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Maestr%C3%ADas/' + H);
  falla(el);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Insignias/' + H);
  falla(el);
  assert.equal(propios, 1);
});

test('carta sin entrada en el índice de Fankit: termina en el onerror propio', async () => {
  const { img, falla } = montar({});
  let propios = 0;
  const el = img(CDN + 'cards/300/' + H, () => { propios++; });
  falla(el); falla(el);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(propios, 1);
});

test('imágenes que no son de la API no se tocan', () => {
  const { img, falla } = montar();
  let propios = 0;
  const el = img('https://cdn.royaleapi.com/x.png', () => { propios++; });
  falla(el);
  assert.equal(el.getAttribute('src'), 'https://cdn.royaleapi.com/x.png');
  assert.equal(propios, 1);
});

test('direcciones con rutas raras de la API no se aceptan', () => {
  const { img, falla } = montar();
  const el = img(CDN + 'cards/300/../../x.png');
  falla(el);
  assert.equal(el.getAttribute('src'), CDN + 'cards/300/../../x.png');
});

test('el índice de Fankit solo apunta a archivos que existen', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'assets', 'Imágenes', 'cards', 'Fankit');
  const indice = JSON.parse(fs.readFileSync(path.join(dir, 'indice.json'), 'utf8'));
  const claves = Object.keys(indice);
  assert.ok(claves.length > 100);
  for (const k of claves) assert.ok(fs.existsSync(path.join(dir, indice[k])), k + ' → ' + indice[k]);
});

// NUEVO (22-oct-2026): modo «local primero» para insignias de jugador (ImagenesRespaldo.primero / aplicar). [→ Contexto_Base_Web.md §PF162]
// Las copias locales ya no traen margen (PF161); el enlace de Supercell sí, así que se pide al final.
// LÍMITE: jsdom no descarga imágenes; el error de carga se simula con el evento «error».
const ENL = CDN + 'playerbadges/512/' + H;
const MAE = 'assets/Im%C3%A1genes/badges/API/Maestr%C3%ADas/' + H;
const INS = 'assets/Im%C3%A1genes/badges/API/Insignias/' + H;

function montarLocal() {
  const m = montar();
  const el = m.window.document.createElement('img');
  m.window.document.getElementById('c').appendChild(el);
  return Object.assign({}, m, { el });
}

test('primero(): una insignia de maestría arranca en Maestrías, la otra en Insignias', () => {
  const { window } = montar();
  const a = window.ImagenesRespaldo.primero(ENL, true);
  const b = window.ImagenesRespaldo.primero(ENL, false);
  assert.equal(a.src, MAE);
  assert.equal(b.src, INS);
  assert.match(a.attrs, /data-resp-modo="local"/);
  assert.match(a.attrs, /data-resp-remoto="https:\/\/api-assets\.clashroyale\.com\/playerbadges\/512\/aBcD_1-xyz\.png"/);
});

test('primero(): lo que no es insignia de jugador se devuelve igual y sin atributos', () => {
  const { window } = montar();
  for (const u of [CDN + 'cards/300/' + H, 'https://cdn.royaleapi.com/x.png', CDN + 'playerbadges/512/../x.png', '']) {
    const r = window.ImagenesRespaldo.primero(u, true);
    assert.equal(r.src, u);
    assert.equal(r.attrs, '');
  }
});

test('local primero (no maestría): Insignias → Maestrías → enlace de Supercell → onerror propio', () => {
  const { window, el, falla } = montarLocal();
  let propios = 0;
  el.onerror = () => { propios++; };
  window.ImagenesRespaldo.aplicar(el, ENL, false);
  assert.equal(el.getAttribute('src'), INS);
  falla(el); assert.equal(el.getAttribute('src'), MAE);
  falla(el); assert.equal(el.getAttribute('src'), ENL);
  assert.equal(propios, 0, 'el onerror propio no corre mientras quede una etapa');
  falla(el); assert.equal(propios, 1);
});

test('local primero (maestría): Maestrías → Insignias → enlace de Supercell', () => {
  const { window, el, falla } = montarLocal();
  window.ImagenesRespaldo.aplicar(el, ENL, true);
  assert.equal(el.getAttribute('src'), MAE);
  falla(el); assert.equal(el.getAttribute('src'), INS);
  falla(el); assert.equal(el.getAttribute('src'), ENL);
});

test('aplicar(): un enlace que no es de insignia se pone tal cual y sigue el orden normal', () => {
  const { window, el, falla } = montarLocal();
  window.ImagenesRespaldo.aplicar(el, CDN + 'cards/300/' + H, false);
  assert.equal(el.getAttribute('src'), CDN + 'cards/300/' + H);
  falla(el);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/cards/API/' + H);
});

test('aplicar() sobre una <img> reutilizada reinicia el estado de la vez anterior', () => {
  const { window, el, falla } = montarLocal();
  window.ImagenesRespaldo.aplicar(el, ENL, false);
  falla(el); falla(el); falla(el); // llegó al final
  const otro = CDN + 'playerbadges/512/Otra_2-z.png';
  window.ImagenesRespaldo.aplicar(el, otro, false);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Insignias/Otra_2-z.png');
  falla(el);
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/badges/API/Maestr%C3%ADas/Otra_2-z.png');
});

test('tras agotar el modo local, una imagen que el onerror propio pone después sigue el orden normal', () => {
  const { window, el, falla } = montarLocal();
  const CARTA = CDN + 'cards/300/Carta_3-w.png';
  el.onerror = () => { el.dataset.respEtapa = ''; el.src = CARTA; }; // como el data-fallback de perfil.html
  window.ImagenesRespaldo.aplicar(el, ENL, true);
  falla(el); falla(el); falla(el); // Maestrías → Insignias → enlace → onerror propio
  assert.equal(el.getAttribute('src'), CARTA);
  falla(el); // la carta falla: copia local de cards/API
  assert.equal(el.getAttribute('src'), 'assets/Im%C3%A1genes/cards/API/Carta_3-w.png');
});

test('perfil.html conecta el modo local primero en la tarjeta, en V. Guerra / Nivel de colección y en la cabecera', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
  assert.ok(html.includes('window.ImagenesRespaldo.primero(icono, insigniaEsMaestria(b))'), 'tarjeta de insignias');
  assert.ok(html.includes('window.ImagenesRespaldo.aplicar(img, u, false)'), 'V. Guerra y Nivel de colección');
  assert.ok(html.includes('window.ImagenesRespaldo.primero(uG, false)'), 'insignia de guerra de la cabecera');
});
