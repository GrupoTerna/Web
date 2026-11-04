'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (04-nov-2026, pedido de la usuaria: «quita el panel de permisos de admin y ponlo como los botones entre mensajes
// y admin»): el panel de permisos ya no es una tarjeta de admin.html; es el link «Permisos» del nav, entre «Mensajes» y
// «Mi panel», que solo se ve con sesión y con el visto bueno del backend (guardado en terna_panel_permisos).
//
// LÍMITE: DOM simulado. No prueba el backend real (webAdminMisPermisos) ni el aspecto en un navegador.

const RAIZ = path.join(__dirname, '..');
const AUTH = fs.readFileSync(path.join(RAIZ, 'assets/js/core/auth.js'), 'utf8');
const NAV = `<nav class="nav"><div class="links">
  <a href="mensajes.html" data-page="mensajes" style="display:none;">Mensajes</a>
  <a href="permisos.html" data-page="permisos" style="display:none;">Permisos</a>
  <a href="admin.html" data-page="admin" class="cta">Acceder</a>
</div></nav>`;

function montar({ sesion = false, permisos = false, pagina = '' } = {}){
  const dom = new JSDOM(`<!doctype html><html><body${pagina ? ` data-page="${pagina}"` : ''}>${NAV}</body></html>`, { runScripts: 'outside-only', url: 'https://terna.example/' });
  const { window } = dom;
  if(sesion) window.localStorage.setItem('terna_admin_token', 'tok');
  if(permisos) window.localStorage.setItem('terna_panel_permisos', '1');
  window.eval(AUTH + '\nwindow.__a = { actualizarNavCta, guardarAccesoPanelPermisos, cerrarSesionAdmin };');
  const permisosLink = window.document.querySelector('a[data-page="permisos"]');
  return { window, permisosLink, api: window.__a };
}

test('todas las páginas con nav llevan «Permisos» justo después de «Mensajes» y antes de Acceder/Mi panel', () => {
  const paginas = ['404','admin','clan','comunidad','directorio','guerra','index','mensajes','perfil','permisos','torneos'];
  for(const p of paginas){
    const html = fs.readFileSync(path.join(RAIZ, p + '.html'), 'utf8');
    const m = html.indexOf('data-page="mensajes" style="display:none;">Mensajes</a>');
    const pe = html.indexOf('<a href="permisos.html" data-page="permisos" style="display:none;">Permisos</a>');
    const ad = html.indexOf('<a href="admin.html" data-page="admin" class="cta">');
    assert.ok(m > 0 && pe > m && ad > pe, p + '.html: orden Mensajes < Permisos < Acceder');
  }
});

test('admin.html ya no tiene la tarjeta «Panel de permisos»', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'admin.html'), 'utf8');
  assert.equal(html.includes('id="cardPanelPermisos"'), false);
  assert.equal(html.includes('Abrir panel de permisos'), false);
});

test('sin sesión, «Permisos» sigue oculto aunque quede el flag guardado', () => {
  const { permisosLink, api } = montar({ sesion: false, permisos: true });
  api.actualizarNavCta();
  assert.equal(permisosLink.style.display, 'none');
});

test('con sesión pero sin visto bueno del backend, «Permisos» sigue oculto', () => {
  const { permisosLink, api } = montar({ sesion: true, permisos: false });
  api.actualizarNavCta();
  assert.equal(permisosLink.style.display, 'none');
});

test('con sesión y visto bueno, «Permisos» se muestra y «Acceder» pasa a «Mi panel»', () => {
  const { window, permisosLink, api } = montar({ sesion: true, permisos: true });
  api.actualizarNavCta();
  assert.equal(permisosLink.style.display, '');
  assert.equal(window.document.querySelector('a.cta').textContent, 'Mi panel');
});

test('guardarAccesoPanelPermisos() muestra y oculta el link en el acto', () => {
  const { window, permisosLink, api } = montar({ sesion: true });
  api.guardarAccesoPanelPermisos(true);
  assert.equal(permisosLink.style.display, '');
  assert.equal(window.localStorage.getItem('terna_panel_permisos'), '1');
  api.guardarAccesoPanelPermisos(false);
  assert.equal(permisosLink.style.display, 'none');
  assert.equal(window.localStorage.getItem('terna_panel_permisos'), null);
});

test('cerrar sesión borra el flag (el siguiente admin no hereda el link)', async () => {
  const { window, api } = montar({ sesion: true, permisos: true });
  window.apiPost = () => Promise.resolve();
  await api.cerrarSesionAdmin();
  assert.equal(window.localStorage.getItem('terna_panel_permisos'), null);
});

test('en permisos.html el link no desaparece mientras haya sesión (aunque el flag no esté guardado)', () => {
  const { permisosLink, api } = montar({ sesion: true, permisos: false, pagina: 'permisos' });
  api.actualizarNavCta();
  assert.equal(permisosLink.style.display, '');
  api.guardarAccesoPanelPermisos(false);
  assert.equal(permisosLink.style.display, '', 'tampoco se oculta al guardar «sin acceso» estando en esa página');
});

test('en permisos.html sin sesión el link sigue oculto', () => {
  const { permisosLink, api } = montar({ sesion: false, pagina: 'permisos' });
  api.actualizarNavCta();
  assert.equal(permisosLink.style.display, 'none');
});
