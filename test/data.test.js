'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./load-browser-script');

const { traducirNombreCarta } = loadBrowserScript('assets/js/data/cards-es.js');
const { iconoBadgeClanHtml } = loadBrowserScript('assets/js/data/clan-badges.js');

test('traducirNombreCarta() traduce un nombre conocido de EN a ES', () => {
  assert.equal(traducirNombreCarta('Knight'), 'Caballero');
  assert.equal(traducirNombreCarta('Hog Rider'), 'Verdugo');
});

test('traducirNombreCarta() con una carta nueva (no en el diccionario) devuelve el nombre original en vez de vacío/undefined', () => {
  assert.equal(traducirNombreCarta('Carta Nunca Agregada'), 'Carta Nunca Agregada');
});

test('traducirNombreCarta() con vacío/undefined no rompe', () => {
  assert.equal(traducirNombreCarta(''), '');
  assert.equal(traducirNombreCarta(undefined), '');
});

test('iconoBadgeClanHtml() arma el <img> con el nombre de archivo correcto para el primer badge de la tabla (16000000 -> Flame_01)', () => {
  const html = iconoBadgeClanHtml(16000000);
  assert.match(html, /^<img src="assets\/badges\/Flame_01\.png"/);
  assert.match(html, /width="22" height="22"/); // tamaño por defecto
});

test('iconoBadgeClanHtml() respeta opts.size', () => {
  const html = iconoBadgeClanHtml(16000000, { size: 40 });
  assert.match(html, /width="40" height="40"/);
});

test('iconoBadgeClanHtml() con un badgeId desconocido devuelve string vacío en vez de un <img> roto', () => {
  assert.equal(iconoBadgeClanHtml(999999), '');
  assert.equal(iconoBadgeClanHtml(null), '');
});
