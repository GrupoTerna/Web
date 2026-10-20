// Cada escudo de clan que arma iconoBadgeClanHtml() debe existir como archivo en
// assets/Imágenes/badges/Fankit/. El <img> se quita solo con onerror, así que un archivo
// faltante no se ve en pantalla ni lo detectan check-links ni las demás pruebas.
// [→ Contexto_Base_Web.md §PF130]
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScript } = require('./load-browser-script');

const { iconoBadgeClanHtml } = loadBrowserScript('assets/js/data/clan-badges.js');
const RAIZ = path.join(__dirname, '..');

test('todos los escudos de BADGE_NOMBRES_POR_ID tienen su PNG en badges/Fankit', () => {
  const faltan = [];
  let total = 0;
  for (let id = 16000000; ; id++) {
    const html = iconoBadgeClanHtml(id);
    if (!html) break;
    total++;
    const src = /src="([^"]+)"/.exec(html)[1];
    if (!fs.existsSync(path.join(RAIZ, decodeURI(src)))) faltan.push(src);
  }
  assert.ok(total > 100, 'la tabla de escudos parece vacía: ' + total);
  assert.deepEqual(faltan, []);
});
