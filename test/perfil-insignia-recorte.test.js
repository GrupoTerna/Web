'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (19-oct-2026): recorte del margen transparente de la insignia de victorias de guerra (perfil.html).
// Se extrae _cajaOpacaDeImagen() del <script> inline REAL y se prueba aislada. LÍMITE: no prueba el canvas ni el
// CORS del CDN de imágenes (jsdom no dibuja): eso solo se comprueba en un navegador real.
const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const ini = html.indexOf('function _cajaOpacaDeImagen');
const fin = html.indexOf('const _recorteInsigniaCache');
assert.ok(ini >= 0 && fin > ini, 'no se encontró _cajaOpacaDeImagen en perfil.html (¿se reorganizó?)');
const _cajaOpacaDeImagen = new Function(html.slice(ini, fin) + '\nreturn _cajaOpacaDeImagen;')();

function imagen(ancho, alto, pintar){
  const data = new Uint8ClampedArray(ancho * alto * 4);
  pintar((x, y, a) => { data[(y * ancho + x) * 4 + 3] = a; });
  return data;
}

test('caja opaca: encuentra los límites del dibujo dentro del margen vacío', () => {
  const data = imagen(10, 10, set => { for (let y = 2; y <= 6; y++) for (let x = 3; x <= 7; x++) set(x, y, 255); });
  assert.deepEqual(_cajaOpacaDeImagen(data, 10, 10), { x0: 3, y0: 2, x1: 7, y1: 6 });
});

test('caja opaca: ignora la sombra casi invisible (alfa ≤ umbral)', () => {
  const data = imagen(10, 10, set => { set(0, 0, 5); set(9, 9, 8); set(4, 4, 255); });
  assert.deepEqual(_cajaOpacaDeImagen(data, 10, 10), { x0: 4, y0: 4, x1: 4, y1: 4 });
});

test('caja opaca: imagen totalmente transparente devuelve null', () => {
  assert.equal(_cajaOpacaDeImagen(imagen(6, 6, () => {}), 6, 6), null);
});

test('caja opaca: imagen sin margen devuelve la imagen completa', () => {
  const data = imagen(4, 3, set => { for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) set(x, y, 255); });
  assert.deepEqual(_cajaOpacaDeImagen(data, 4, 3), { x0: 0, y0: 0, x1: 3, y1: 2 });
});
