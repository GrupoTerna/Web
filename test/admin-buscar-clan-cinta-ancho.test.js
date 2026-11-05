'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (5-nov-2026, pedido de la usuaria): «Buscar clan» lleva su propia cinta (antes repetía la de «Buscar miembro») y los textos de «¿Infiltrado?» usan todo el ancho de la tarjeta.
// LÍMITE: solo lee admin.html como texto; no mide el aspecto en un navegador real.
const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

function etiquetaTarjeta(id){
  const i = HTML.indexOf(`id="${id}"`);
  assert.ok(i >= 0, `no se encontró #${id}`);
  const ini = HTML.lastIndexOf('<div', i);
  return HTML.slice(ini, HTML.indexOf('>', i) + 1);
}

test('«Buscar clan» y «Buscar miembro» no comparten la misma cinta, y la de clan existe en el sitio', () => {
  const clan = etiquetaTarjeta('cardBuscarClan').match(/--cinta:url\(([^)]+)\)/);
  assert.ok(clan, 'la tarjeta de clan declara --cinta');
  const miembro = HTML.match(/<div class="card pf-cinta" style="--cinta:url\(([^)]+)\)[^"]*"[^>]*>\s*<div class="eyebrow">Buscar miembro/);
  assert.ok(miembro, 'la tarjeta de Buscar miembro declara --cinta');
  assert.notEqual(clan[1], miembro[1], 'cintas distintas');
  const archivo = path.join(__dirname, '..', 'assets', decodeURIComponent(clan[1])); // --cinta se resuelve contra assets/styles.css (§PF065)
  assert.ok(fs.existsSync(archivo), 'el archivo de la cinta existe: ' + archivo);
});

test('los textos de la sección «¿Tiene infiltrados?» no limitan el ancho con max-width', () => {
  const ini = HTML.indexOf('function _seccionExMiembrosClan(');
  const fin = HTML.indexOf('/* 5-nov-2026 (pedido de la usuaria, §PF368): «Buscar clan».', ini); // hasta donde acaba la sección «¿Tiene infiltrados?»; el texto de la ficha del clan (más abajo) no cuenta
  assert.ok(ini >= 0 && fin > ini, 'marcadores no encontrados (¿se reorganizó admin.html?)');
  const ini2 = HTML.indexOf('Sin coincidencias', ini);
  const trozo = HTML.slice(ini, fin);
  assert.ok(ini2 > ini, 'se encontró el texto «Sin coincidencias»');
  assert.ok(!/max-width:\s*\d+px/.test(trozo), 'sin max-width en px en esa sección');
});
