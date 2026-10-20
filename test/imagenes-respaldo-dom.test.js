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
