'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (12-oct-2026, accesibilidad, P-1): la tecla Escape cierra el menú móvil abierto y devuelve el foco al
// botón ☰ (assets/js/ui/effects.js, marcarNavActiva()). Se aplicó el 11-oct-2026 sin prueba automática; esta
// la cubre. [→ Contexto_Base_Web.md §PF018 y §PF049]
//
// LÍMITE: jsdom no calcula layout ni anima. Prueba el estado (clase `open`, aria-expanded, aria-label) y a dónde
// va el foco; no prueba que el panel se vea cerrado ni la visibilidad con CSS (styles.css, `visibility:hidden`).

const BODY = `
  <button type="button" id="navToggle" class="nav-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks">☰</button>
  <nav class="nav"><div class="links" id="navLinks">
    <a href="index.html" data-page="index">Inicio</a>
    <a href="guerra.html" data-page="guerra">Guerra</a>
  </div></nav>
  <input id="otro" type="text">`;

function montar(){
  const window = loadBrowserScriptsWithDom(['assets/js/ui/effects.js'], BODY);
  window.document.body.dataset.page = 'index';
  window.marcarNavActiva();
  const d = window.document;
  return {
    window,
    toggle: d.getElementById('navToggle'),
    links: d.getElementById('navLinks'),
    otro: d.getElementById('otro'),
    esc: () => d.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  };
}

test('Escape con el menú abierto lo cierra, actualiza aria-expanded y aria-label, y devuelve el foco a ☰', () => {
  const { window, toggle, links, otro, esc } = montar();
  toggle.click();
  assert.ok(links.classList.contains('open'), 'el clic debe abrir el menú');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Cerrar menú');
  otro.focus(); // el foco puede estar en cualquier otro control al pulsar Escape
  esc();
  assert.ok(!links.classList.contains('open'), 'Escape debe cerrar el menú');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-label'), 'Abrir menú');
  assert.equal(window.document.activeElement, toggle, 'el foco debe volver al botón ☰');
});

test('Escape con el menú cerrado no hace nada y no le roba el foco a otro control', () => {
  const { window, toggle, links, otro, esc } = montar();
  otro.focus();
  esc();
  assert.ok(!links.classList.contains('open'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(window.document.activeElement, otro, 'sin menú abierto, Escape no debe mover el foco');
});

test('otra tecla no cierra el menú abierto', () => {
  const { window, toggle, links } = montar();
  toggle.click();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.ok(links.classList.contains('open'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
});

test('después de cerrar con Escape, el botón ☰ vuelve a abrir el menú', () => {
  const { toggle, links, esc } = montar();
  toggle.click();
  esc();
  toggle.click();
  assert.ok(links.classList.contains('open'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Cerrar menú');
});

test('marcarNavActiva() marca activo el enlace de la página actual', () => {
  const { window } = montar();
  const activos = [...window.document.querySelectorAll('.nav .links a.active')].map(a => a.dataset.page);
  assert.deepEqual(activos, ['index']);
});
