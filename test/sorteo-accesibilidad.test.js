'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (12-oct-2026, accesibilidad): auditoría con axe-core sobre las 12 páginas; solo sorteo.html tenía hallazgos
// (regla `label`, 4 controles de «Reglas del sorteo» sin nombre accesible: el texto estaba en un <span> hermano, no en
// una etiqueta asociada). Se les puso aria-label (el mismo texto visible) y aria-describedby hacia el texto de ayuda, y
// los interruptores recibieron un contorno de foco (el input real mide 0x0 con opacity:0, así que con Tab no se veía el
// foco). [→ Contexto_Base_Web.md §PF049]
//
// LÍMITE: prueba el marcado y que exista la regla CSS. No prueba que el contorno se vea ni su contraste real en un
// navegador (jsdom no calcula estilos de pseudoclases), ni lo que anuncia un lector de pantalla.

const html = fs.readFileSync(path.join(__dirname, '..', 'sorteo.html'), 'utf8');
const doc = new JSDOM(html).window.document;

const CONTROLES = [
  { id: 'prizeCountInput',           nombre: 'Cantidad de premios',            ayuda: 'prizeCountHint' },
  { id: 'discardToggle',             nombre: 'Descartar ganadores',            ayuda: 'discardHint' },
  { id: 'discardTrialsToggle',       nombre: 'Descartar intentos de prueba',   ayuda: 'discardTrialsHint' },
  { id: 'removeTicketPerSpinToggle', nombre: 'Quitar un ticket por cada giro', ayuda: 'removeTicketHint' }
];

for (const c of CONTROLES) {
  test(`#${c.id} tiene nombre accesible igual al texto visible y su ayuda enlazada`, () => {
    const el = doc.getElementById(c.id);
    assert.ok(el, `no existe #${c.id}`);
    assert.equal(el.getAttribute('aria-label'), c.nombre);
    assert.equal(el.getAttribute('aria-describedby'), c.ayuda);
    const ayuda = doc.getElementById(c.ayuda);
    assert.ok(ayuda, `no existe #${c.ayuda}`);
    assert.ok(ayuda.textContent.trim().length > 10, 'el texto de ayuda no debe estar vacío');
    // El nombre debe aparecer en el texto visible de su fila (WCAG 2.5.3, la etiqueta visible está dentro del nombre).
    const fila = el.closest('.setting-row');
    assert.ok(fila && fila.textContent.includes(c.nombre), 'el aria-label debe coincidir con el texto visible de la fila');
  });
}

test('los ids de ayuda son únicos en la página', () => {
  for (const c of CONTROLES) {
    assert.equal(doc.querySelectorAll(`[id="${c.ayuda}"]`).length, 1, `#${c.ayuda} repetido`);
  }
});

test('los interruptores (.switch) tienen contorno de foco con teclado (:focus-visible)', () => {
  assert.match(html, /\.switch input:focus-visible \+ \.slider\s*\{[^}]*outline:\s*2px solid var\(--ink\)/);
});

test('ningún <input>, <select> ni <textarea> visible de la página queda sin nombre accesible', () => {
  const sinNombre = [...doc.querySelectorAll('input, select, textarea')].filter(el => {
    if (el.type === 'hidden' || el.type === 'file') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const conLabel = el.id && doc.querySelector(`label[for="${el.id}"]`);
    const envuelto = el.closest('label') && el.closest('label').textContent.trim().length > 0;
    return !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || conLabel || envuelto);
  }).map(el => `${el.tagName.toLowerCase()}#${el.id || '(sin id)'}`);
  assert.deepEqual(sinNombre, [], `controles sin nombre accesible: ${sinNombre.join(', ')}`);
});
