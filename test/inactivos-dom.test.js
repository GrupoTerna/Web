'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// inactivos.js entero (no solo la mitad, a diferencia de timeline-svg.js)
// necesita DOM real vía jsdom, incluida _filaInactivoHtml() aunque solo
// devuelve un string y a primera vista parezca una función pura: llama
// SIEMPRE a adminPuedeVetar() -> esAdminLogueado() -> localStorage.getItem(...),
// y `localStorage` no existe en el sandbox vacío de `vm` que usa
// loadBrowserScripts() (confirmado en esta sesión: sin jsdom, esa llamada
// revienta con "localStorage is not defined"). Por eso este archivo cubre
// TODO inactivos.js con loadBrowserScriptsWithDom(), a diferencia de
// timeline-svg.js que sí tuvo una mitad realmente pura.
//
// AMPLIACIÓN (Fase 1, 5ta tanda — cierre de inactivos.js):
// _obtenerVistaInactivos()/_renderVistaInactivos()/
// agregarTarjetaCuentasInactivasSiAdmin() (las 3 funciones que habían
// quedado sin probar de las tandas anteriores, ver
// Consolidado_Mejoras_Web_Main.md) además necesitan activarBarraScrollTabla()
// (tables.js, ya probada en su propia tanda) y fitOneLine() (ui/effects.js)
// — se agregan ambas a DEPENDENCIAS, respetando el mismo orden de carga
// que usan directorio.html/index.html vía <script src>. apiGetAuth()
// (core/api.js) NO se carga: se mockea directo como window.apiGetAuth,
// mismo criterio ya usado en este archivo para apiPost() (ver comentario
// más abajo, sección de _enviarVetoInactivo).
//
// Dependencias cargadas, en el mismo orden que usarían directorio.html/
// index.html vía <script src>: util.js (esc/fmtNum/urlValida),
// core/auth.js (esAdminLogueado/adminPuedeVetar), ui/tables.js
// (activarBarraScrollTabla), ui/effects.js (fitOneLine), data/clan-badges.js
// (ICONO_ROYALEAPI/ICONO_CWSTATS) y por último features/inactivos.js.
const DEPENDENCIAS = [
  'assets/js/util.js',
  'assets/js/core/auth.js',
  'assets/js/ui/tables.js',
  'assets/js/ui/effects.js',
  'assets/js/data/clan-badges.js',
  'assets/js/features/inactivos.js'
];

// Markup de UNA fila ya "abierta" (como la deja _renderVistaInactivos()):
// el <tr class="inactivo-row"> con sus datos, seguido del <tr
// class="inactivo-vetar-fila"> oculto que contiene el
// .js-inactivo-vetar-wrap donde _toggleFormVetarInactivo() pinta el
// mini-formulario. Se arma a mano en vez de depender de
// _renderVistaInactivos() (esa función es de otra tanda, ver consolidado)
// para no acoplar estos tests a una función que todavía no se prueba acá.
const TABLA_HTML = `
  <table>
    <tbody>
      <tr class="inactivo-row" data-inactivo-tag="#T1"><td>fila</td></tr>
      <tr class="inactivo-vetar-fila" style="display:none;">
        <td colspan="5"><div class="js-inactivo-vetar-wrap"></div></td>
      </tr>
    </tbody>
  </table>`;

function montar(htmlBody){
  const window = loadBrowserScriptsWithDom(DEPENDENCIAS, htmlBody || '');
  // AVISO ABIERTO (limitación de jsdom, no del código real): jsdom no
  // implementa Element.prototype.scrollIntoView en absoluto (confirmado en
  // esta sesión — sin este polyfill, cualquier llamada revienta con
  // "scrollIntoView is not a function"). agregarTarjetaCuentasInactivasSiAdmin()
  // la llama al abrir la vista de inactivos. Se agrega acá como no-op para
  // poder probar el resto del flujo del click sin que la falta de esta API
  // de jsdom tape una prueba real; no verifica CON qué argumentos se
  // llamaría scrollIntoView en un navegador real (ver test más abajo, que
  // sí confirma que se invoca).
  if (typeof window.Element.prototype.scrollIntoView !== 'function'){
    window.Element.prototype.scrollIntoView = function(){};
  }
  return window;
}

function admin(window, { puedeVetar } = {}){
  window.localStorage.setItem('terna_admin_token', 'TOKEN-ADMIN');
  if (puedeVetar) window.localStorage.setItem('terna_admin_info', JSON.stringify({ funciones: 'Vetar,Editar' }));
  else window.localStorage.setItem('terna_admin_info', JSON.stringify({ funciones: 'Editar' }));
}

// ---------------------------------------------------------------------
// _filaInactivoHtml(c)
// ---------------------------------------------------------------------

test('_filaInactivoHtml() sin sesión de admin: celda de acciones "—", sin botón Vetar ni fila oculta', () => {
  const window = montar();
  const html = window._filaInactivoHtml({ tag: '#T1', nombre: 'Ana', clan: 'Terna' });
  assert.match(html, /<td class="ia-td-acciones">\s*—\s*<\/td>/);
  assert.ok(!html.includes('js-inactivo-vetar-btn'));
  assert.ok(!html.includes('inactivo-vetar-fila')); // sin puedeVetar, no se agrega la 2da <tr>
});

test('_filaInactivoHtml() con admin logueado pero SIN la función "Vetar": tampoco pinta el botón', () => {
  const window = montar();
  admin(window, { puedeVetar: false });
  const html = window._filaInactivoHtml({ tag: '#T2', nombre: 'Beto', clan: 'Terna' });
  assert.ok(!html.includes('js-inactivo-vetar-btn'));
});

test('_filaInactivoHtml() con admin CON la función "Vetar": pinta el botón y la <tr> oculta del formulario', () => {
  const window = montar();
  admin(window, { puedeVetar: true });
  const html = window._filaInactivoHtml({ tag: '#T3', nombre: 'Caro', clan: 'Terna' });
  assert.match(html, /class="js-inactivo-vetar-btn inactivo-btn-vetar"/);
  assert.match(html, /<tr class="inactivo-vetar-fila" style="display:none;">/);
  assert.match(html, /data-inactivo-tag="#T3"/);
});

test('_filaInactivoHtml() con royaleApi/cwstats válidos los pinta como links; con placeholder ".../LINK" los omite (urlValida)', () => {
  const window = montar();
  const conLinks = window._filaInactivoHtml({
    tag: '#T4', nombre: 'Dani',
    royaleApi: 'https://royaleapi.com/clan/ABC', cwstats: 'https://cwstats.com/clan/ABC'
  });
  assert.match(conLinks, /RoyaleAPI/);
  assert.match(conLinks, /CWStats/);
  const sinLinks = window._filaInactivoHtml({ tag: '#T5', nombre: 'Eva', royaleApi: 'https://royaleapi.com/clan/LINK' });
  assert.ok(!sinLinks.includes('RoyaleAPI'));
});

test('_filaInactivoHtml() nunca agrega el campo Celular aunque venga en el objeto cuenta (regla dura del usuario)', () => {
  const window = montar();
  const html = window._filaInactivoHtml({ tag: '#T6', nombre: 'Fer', celular: '+51 999 999 999' });
  assert.ok(!html.includes('999 999 999'));
  assert.ok(!/celular/i.test(html));
});

test('_filaInactivoHtml() nomMulti/nivelXp/copas ausentes muestran "—"; presentes se formatean (fmtNum/esc)', () => {
  const window = montar();
  const vacio = window._filaInactivoHtml({ tag: '#T7', nombre: 'Gus' });
  assert.match(vacio, /<td class="ia-td-nommulti">—<\/td>/);
  assert.match(vacio, /<td class="ia-td-nivel">—<\/td>/);
  assert.match(vacio, /<td class="ia-td-copas">—<\/td>/);
  const lleno = window._filaInactivoHtml({ tag: '#T8', nombre: 'Hugo', nomMulti: 'HugoMulti', nivelXp: 12, copas: 5000 });
  assert.match(lleno, /<td class="ia-td-nommulti">HugoMulti<\/td>/);
  assert.match(lleno, /<td class="ia-td-nivel">12<\/td>/);
  assert.match(lleno, /<td class="ia-td-copas">5,000<\/td>/); // fmtNum()
});

test('_filaInactivoHtml() sin nombre/tag/clan cae a "Sin nombre"/"—"/"—", y escapa HTML del nombre', () => {
  const window = montar();
  const sinDatos = window._filaInactivoHtml({});
  assert.match(sinDatos, /<div class="ia-nombre">Sin nombre<\/div>/);
  assert.match(sinDatos, /<div class="ia-tag">—<\/div>/);
  assert.match(sinDatos, /<div class="ia-clan">—<\/div>/);
  const conHtml = window._filaInactivoHtml({ tag: '#T9', nombre: '<script>alert(1)</script>' });
  assert.ok(!conHtml.includes('<script>alert(1)</script>'));
  assert.match(conHtml, /&lt;script&gt;/);
});

// ---------------------------------------------------------------------
// _toggleFormVetarInactivo(wrap, tag, btnDisparador, filaContenedora)
// ---------------------------------------------------------------------

test('_toggleFormVetarInactivo() abre: pinta el formulario y muestra la fila contenedora como "table-row"', () => {
  const window = montar(TABLA_HTML);
  const { document, _toggleFormVetarInactivo } = window;
  const wrap = document.querySelector('.js-inactivo-vetar-wrap');
  const fila = document.querySelector('.inactivo-vetar-fila');
  _toggleFormVetarInactivo(wrap, '#T1', null, fila);
  assert.equal(fila.style.display, 'table-row');
  assert.equal(wrap.style.display, 'block');
  assert.ok(wrap.querySelector('.js-iv-razon'));
  assert.ok(wrap.querySelector('.js-iv-comentario'));
  assert.ok(wrap.querySelector('.js-iv-confirmar'));
  assert.match(wrap.innerHTML, /Vetar a #T1/);
});

test('_toggleFormVetarInactivo() llamado 2 veces sobre el mismo wrap: la 2da cierra (vacía el wrap y oculta la fila)', () => {
  const window = montar(TABLA_HTML);
  const { document, _toggleFormVetarInactivo } = window;
  const wrap = document.querySelector('.js-inactivo-vetar-wrap');
  const fila = document.querySelector('.inactivo-vetar-fila');
  _toggleFormVetarInactivo(wrap, '#T1', null, fila);
  _toggleFormVetarInactivo(wrap, '#T1', null, fila);
  assert.equal(fila.style.display, 'none');
  assert.equal(wrap.innerHTML, '');
});

test('_toggleFormVetarInactivo() sin filaContenedora usa el propio wrap como contenedor ("block" en vez de "table-row")', () => {
  const window = montar('<div class="js-inactivo-vetar-wrap"></div>');
  const { document, _toggleFormVetarInactivo } = window;
  const wrap = document.querySelector('.js-inactivo-vetar-wrap');
  _toggleFormVetarInactivo(wrap, '#T1', null); // filaContenedora omitida
  assert.equal(wrap.style.display, 'block');
});

test('_toggleFormVetarInactivo() escapa el tag en el título del formulario', () => {
  const window = montar(TABLA_HTML);
  const { document, _toggleFormVetarInactivo } = window;
  const wrap = document.querySelector('.js-inactivo-vetar-wrap');
  const fila = document.querySelector('.inactivo-vetar-fila');
  _toggleFormVetarInactivo(wrap, '<b>#T1</b>', null, fila);
  assert.ok(!wrap.innerHTML.includes('<b>#T1</b>'));
  assert.match(wrap.innerHTML, /&lt;b&gt;#T1&lt;\/b&gt;/);
});

test('_toggleFormVetarInactivo() cablea el botón "Confirmar veto" para llamar a _enviarVetoInactivo(wrap, tag, btnDisparador)', () => {
  const window = montar(TABLA_HTML);
  const { document, _toggleFormVetarInactivo } = window;
  const wrap = document.querySelector('.js-inactivo-vetar-wrap');
  const fila = document.querySelector('.inactivo-vetar-fila');
  const btnDisparador = document.createElement('button');
  let llamadoCon = null;
  window._enviarVetoInactivo = (w, tag, btn) => { llamadoCon = [w, tag, btn]; };
  _toggleFormVetarInactivo(wrap, '#T1', btnDisparador, fila);
  wrap.querySelector('.js-iv-confirmar').click();
  assert.deepEqual(llamadoCon, [wrap, '#T1', btnDisparador]);
});

// ---------------------------------------------------------------------
// _enviarVetoInactivo(wrap, tag, btnDisparador)
// ---------------------------------------------------------------------
// apiPost() (core/api.js) y window.confirm() NO se cargan/implementan acá:
// se sobrescriben directamente sobre el `window` de jsdom ANTES de llamar
// a _enviarVetoInactivo(). Como inactivos.js corre dentro de ese mismo
// `window` (window.eval, ver load-browser-script.js), la llamada a
// `apiPost(...)` dentro de la función resuelve el identificador contra
// `window.apiPost` en el momento de ejecutarse — confirmado en esta sesión
// con un prototipo antes de escribir este archivo — así que no hace falta
// cargar core/api.js real ni mockear `fetch`. Mismo criterio para
// `window.confirm`, que jsdom no implementa por defecto (devolvería
// `undefined`, siempre falsy, y la función cortaría el flujo de más).

function montarFormularioAbierto(){
  const window = montar(TABLA_HTML);
  const { document, _toggleFormVetarInactivo } = window;
  const wrap = document.querySelector('.js-inactivo-vetar-wrap');
  const fila = document.querySelector('.inactivo-vetar-fila');
  _toggleFormVetarInactivo(wrap, '#T1', null, fila);
  return { window, document, wrap };
}

test('_enviarVetoInactivo() sin razón elegida: mensaje de error, no llama confirm() ni apiPost()', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => { throw new Error('no debería llamarse'); };
  window.apiPost = async () => { throw new Error('no debería llamarse'); };
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Elige una Razón\./);
});

test('_enviarVetoInactivo() con razón pero confirm() cancelado: no llama apiPost() y no deja mensaje', async () => {
  const { window, wrap } = montarFormularioAbierto();
  let confirmadoConTexto = null;
  window.confirm = (texto) => { confirmadoConTexto = texto; return false; };
  let llamadoApiPost = false;
  window.apiPost = async () => { llamadoApiPost = true; return { ok: true }; };
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.equal(llamadoApiPost, false);
  assert.equal(wrap.querySelector('.js-iv-msg').innerHTML, '');
  assert.match(confirmadoConTexto, /¿Vetar a #T1\?/);
});

test('_enviarVetoInactivo() camino feliz: llama apiPost con sessionToken/tag/razon/comentario (trim), muestra "Miembro vetado." y actualiza btnDisparador', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => true;
  window.localStorage.setItem('terna_admin_token', 'TOKEN-XYZ');
  let argsApiPost = null;
  window.apiPost = async (accion, body) => { argsApiPost = { accion, body }; return { ok: true }; };
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  wrap.querySelector('.js-iv-comentario').value = '  se fue del clan sin avisar  ';
  const btnDisparador = window.document.createElement('button');
  btnDisparador.textContent = '🚫 Vetar';

  const promesa = window._enviarVetoInactivo(wrap, '#T1', btnDisparador);
  // Mientras la petición está en vuelo, el botón "Confirmar veto" debe
  // quedar deshabilitado para evitar doble envío.
  assert.equal(wrap.querySelector('.js-iv-confirmar').disabled, true);
  await promesa;

  // JSON.stringify() en vez de assert.deepEqual(): `body` lo arma
  // inactivos.js DENTRO del `window` de jsdom (otro realm), así que su
  // `Object`/`Object.prototype` no es el mismo que el de Node — con
  // deepStrictEqual (lo que usa assert.deepEqual con 'node:assert/strict')
  // eso falla con "same structure but not reference-equal" aunque el
  // contenido sea idéntico. Comparar el JSON evita depender de la
  // identidad del constructor entre realms.
  assert.equal(JSON.stringify(argsApiPost), JSON.stringify({
    accion: 'webAdminVetar',
    body: { sessionToken: 'TOKEN-XYZ', datos: { tag: '#T1', razon: 'NARANJA x', comentario: 'se fue del clan sin avisar' } }
  }));
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Miembro vetado\./);
  assert.equal(btnDisparador.disabled, true);
  // inactivos.js asigna '.6' (sin el 0 inicial), pero el CSSOM de jsdom
  // normaliza el valor guardado a '0.6' al leerlo de vuelta desde
  // .style.opacity — mismo número, forma de texto distinta.
  assert.equal(btnDisparador.style.opacity, '0.6');
  assert.equal(btnDisparador.textContent, '🚫 Vetado');
});

test('_enviarVetoInactivo() camino feliz sin btnDisparador (ej. llamada directa): no revienta', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => true;
  window.apiPost = async () => ({ ok: true });
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  await assert.doesNotReject(() => window._enviarVetoInactivo(wrap, '#T1', null));
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Miembro vetado\./);
});

test('_enviarVetoInactivo() con data.ok===false y error genérico: muestra el error (escapado) y reactiva el botón Confirmar', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => true;
  window.apiPost = async () => ({ ok: false, error: 'Tag no encontrado en el Directorio' });
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Tag no encontrado en el Directorio/);
  assert.equal(wrap.querySelector('.js-iv-confirmar').disabled, false);
});

test('_enviarVetoInactivo() con error de "sesión" muestra el aviso de volver a iniciar sesión (detección case-insensitive, con y sin tilde)', async () => {
  for (const mensajeError of ['Sesión expirada', 'sesion invalida']){
    const { window, wrap } = montarFormularioAbierto();
    window.confirm = () => true;
    window.apiPost = async () => ({ ok: false, error: mensajeError });
    wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
    await window._enviarVetoInactivo(wrap, '#T1', null);
    assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Vuelve a iniciar sesión desde el panel de admin\./);
  }
});

// AVISO ABIERTO (encontrado en esta tanda, ver Consolidado_Mejoras_Web_Main.md
// -- no se pudo dejar anotado ahí porque ese archivo no se subió en esta
// sesión; queda documentado acá hasta que se traslade): a diferencia de la
// rama de error genérico (si data.ok===false sin ser error de sesión SÍ
// reactiva btnConfirmar.disabled=false), la rama de error de "sesión" de
// _enviarVetoInactivo (inactivos.js) hace `return` sin reactivar
// btnConfirmar.disabled. Este test documenta el comportamiento REAL tal
// cual está hoy (botón "Confirmar veto" queda deshabilitado hasta
// recargar la página), no una recomendación de que así deba quedarse --
// pendiente de que el usuario confirme si es el comportamiento deseado
// (ej. "que el admin no pueda reintentar sin volver a iniciar sesión") o
// si debería reactivarse igual que en la rama de error genérico.
test('_enviarVetoInactivo() con error de "sesión": el botón Confirmar queda deshabilitado (comportamiento real, ver AVISO ABIERTO arriba)', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => true;
  window.apiPost = async () => ({ ok: false, error: 'Sesión expirada' });
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.equal(wrap.querySelector('.js-iv-confirmar').disabled, true);
});

test('_enviarVetoInactivo() si apiPost() rechaza (error de conexión): muestra "Error de conexión: <mensaje>" y reactiva el botón Confirmar', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => true;
  window.apiPost = async () => { throw new Error('Failed to fetch'); };
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Error de conexión: Failed to fetch/);
  assert.equal(wrap.querySelector('.js-iv-confirmar').disabled, false);
});

test('_enviarVetoInactivo() limpia el mensaje anterior al reintentar (msgEl.innerHTML se resetea al inicio de cada llamada)', async () => {
  const { window, wrap } = montarFormularioAbierto();
  window.confirm = () => true;
  window.apiPost = async () => ({ ok: false, error: 'Primer error' });
  wrap.querySelector('.js-iv-razon').value = 'NARANJA x';
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Primer error/);
  window.apiPost = async () => ({ ok: true });
  await window._enviarVetoInactivo(wrap, '#T1', null);
  assert.doesNotMatch(wrap.querySelector('.js-iv-msg').innerHTML, /Primer error/);
  assert.match(wrap.querySelector('.js-iv-msg').innerHTML, /Miembro vetado\./);
});

// ---------------------------------------------------------------------
// _obtenerVistaInactivos(afterEl)
// ---------------------------------------------------------------------

// grid + un hermano siguiente ya existente ("siguiente"), para poder
// comprobar que la sección se inserta EXACTAMENTE después de afterEl y no
// al final del contenedor.
function montarConGrid(htmlBody){
  const window = montar(htmlBody || '<div id="contenedor"><div id="grid"></div><div id="siguiente">ya había algo después</div></div>');
  const { document } = window;
  return { window, document, grid: document.getElementById('grid') };
}

test('_obtenerVistaInactivos() crea la sección #inactivosVista la primera vez, con título/lista/botón Cerrar', () => {
  const { window, document, grid } = montarConGrid();
  const section = window._obtenerVistaInactivos(grid);
  assert.equal(section.id, 'inactivosVista');
  assert.equal(section.className, 'card');
  assert.equal(section.style.display, 'none');
  assert.ok(section.querySelector('#inactivosVistaTitulo'));
  assert.ok(section.querySelector('#inactivosVistaLista'));
  assert.ok(section.querySelector('#inactivosVistaCerrar'));
  assert.equal(document.getElementById('inactivosVista'), section);
});

test('_obtenerVistaInactivos() reutiliza la misma sección en llamadas siguientes, sin crear una segunda', () => {
  const { window, document, grid } = montarConGrid();
  const s1 = window._obtenerVistaInactivos(grid);
  const s2 = window._obtenerVistaInactivos(grid);
  assert.equal(s1, s2);
  assert.equal(document.querySelectorAll('#inactivosVista').length, 1);
});

test('_obtenerVistaInactivos() inserta la sección justo después de afterEl, antes de cualquier hermano que ya existiera ahí', () => {
  const { window, grid } = montarConGrid();
  const section = window._obtenerVistaInactivos(grid);
  assert.equal(grid.nextElementSibling, section);
  assert.equal(section.nextElementSibling.id, 'siguiente');
});

test('_obtenerVistaInactivos() — el botón "Cerrar ✕" oculta la sección', () => {
  const { window, grid } = montarConGrid();
  const section = window._obtenerVistaInactivos(grid);
  section.style.display = 'block';
  section.querySelector('#inactivosVistaCerrar').click();
  assert.equal(section.style.display, 'none');
});

// ---------------------------------------------------------------------
// _renderVistaInactivos(section, titulo, cuentas)
// ---------------------------------------------------------------------

// Sección "mínima" con solo lo que _renderVistaInactivos() necesita leer
// (#inactivosVistaTitulo/#inactivosVistaLista) — armada a mano en vez de
// vía _obtenerVistaInactivos() para no acoplar estos tests a esa otra
// función (mismo criterio ya usado en TABLA_HTML más arriba).
function seccionVistaVacia(document){
  const section = document.createElement('section');
  section.innerHTML = '<div id="inactivosVistaTitulo"></div><div id="inactivosVistaLista"></div>';
  document.body.appendChild(section);
  return section;
}

test('_renderVistaInactivos() refleja el título recibido en #inactivosVistaTitulo', () => {
  const { window, document } = montar();
  const section = seccionVistaVacia(document);
  window._renderVistaInactivos(section, 'Cuentas inactivas — General', []);
  assert.equal(section.querySelector('#inactivosVistaTitulo').textContent, 'Cuentas inactivas — General');
});

test('_renderVistaInactivos() con cuentas=[] muestra "No hay cuentas en este grupo." y no arma tabla', () => {
  const { window, document } = montar();
  const section = seccionVistaVacia(document);
  window._renderVistaInactivos(section, 'x', []);
  const lista = section.querySelector('#inactivosVistaLista');
  assert.match(lista.innerHTML, /No hay cuentas en este grupo\./);
  assert.equal(lista.querySelector('table'), null);
});

test('_renderVistaInactivos() con cuentas arma la tabla .inactivos-table, con el encabezado Nombre/Jugador/Nivel/Copas y una fila por cuenta', () => {
  const { window, document } = montar();
  const section = seccionVistaVacia(document);
  window._renderVistaInactivos(section, 'x', [
    { tag: '#AAA', nombre: 'Ana', clan: 'Terna' },
    { tag: '#BBB', nombre: 'Beto', clan: 'Terna' }
  ]);
  const tabla = section.querySelector('#inactivosVistaLista table.inactivos-table');
  assert.ok(tabla);
  // El encabezado dice "Jugador" aunque el dato interno sea nomMulti — ver
  // FIX 07-sep-2026 en el docblock de _renderVistaInactivos: es a propósito,
  // NO un bug a "corregir" en el test.
  const encabezados = Array.from(tabla.querySelectorAll('thead th')).map(th => th.textContent);
  assert.deepEqual(encabezados, ['Nombre', 'Jugador', 'Nivel', 'Copas', '']);
  const filas = tabla.querySelectorAll('tbody tr.inactivo-row');
  assert.equal(filas.length, 2);
  assert.equal(filas[0].dataset.inactivoTag, '#AAA');
  assert.equal(filas[1].dataset.inactivoTag, '#BBB');
});

test('_renderVistaInactivos() aplica activarBarraScrollTabla() sobre .inactivos-table-wrap (barra superior con las clases de tables.js)', () => {
  const { window, document } = montar();
  const section = seccionVistaVacia(document);
  window._renderVistaInactivos(section, 'x', [{ tag: '#AAA', nombre: 'Ana' }]);
  const wrap = section.querySelector('.inactivos-table-wrap');
  assert.equal(wrap.classList.contains('tabla-scroll-wrap'), true);
  assert.equal(wrap.classList.contains('scroll-morado'), true);
  assert.equal(wrap.previousElementSibling.classList.contains('tabla-scroll-top'), true);
});

test('_renderVistaInactivos() — clic en "🚫 Vetar" de una fila abre su mini-formulario (usa _toggleFormVetarInactivo internamente)', () => {
  const { window, document } = montar();
  admin(window, { puedeVetar: true });
  const section = seccionVistaVacia(document);
  window._renderVistaInactivos(section, 'x', [{ tag: '#AAA', nombre: 'Ana' }]);
  const btn = section.querySelector('.js-inactivo-vetar-btn');
  assert.ok(btn);
  btn.click();
  const filaForm = section.querySelector('.inactivo-vetar-fila');
  assert.equal(filaForm.style.display, 'table-row');
  assert.match(filaForm.querySelector('.js-inactivo-vetar-wrap').innerHTML, /Vetar a #AAA/);
});

test('_renderVistaInactivos() llamado de nuevo con cuentas=[] reemplaza el contenido anterior, sin residuos de la tabla previa', () => {
  const { window, document } = montar();
  const section = seccionVistaVacia(document);
  window._renderVistaInactivos(section, 'x', [{ tag: '#AAA', nombre: 'Ana' }]);
  window._renderVistaInactivos(section, 'y', []);
  const lista = section.querySelector('#inactivosVistaLista');
  assert.equal(lista.querySelector('table'), null);
  assert.match(lista.innerHTML, /No hay cuentas en este grupo\./);
});

// ---------------------------------------------------------------------
// agregarTarjetaCuentasInactivasSiAdmin(grid)
// ---------------------------------------------------------------------

const CUENTAS_MOCK = [
  { tag: '#A1', nombre: 'Ana', esAdmin: true },
  { tag: '#A2', nombre: 'Beto', esAdmin: true },
  { tag: '#A3', nombre: 'Caro', esAdmin: false }
];

test('agregarTarjetaCuentasInactivasSiAdmin() sin grid: no hace nada y no rompe', async () => {
  const { window } = montarConGrid();
  admin(window);
  let llamado = false;
  window.apiGetAuth = async () => { llamado = true; return { ok: true, cuentas: CUENTAS_MOCK }; };
  await assert.doesNotReject(() => window.agregarTarjetaCuentasInactivasSiAdmin(null));
  assert.equal(llamado, false);
});

test('agregarTarjetaCuentasInactivasSiAdmin() sin sesión de admin: no llama apiGetAuth() ni agrega tarjetas', async () => {
  const { window, grid } = montarConGrid();
  let llamado = false;
  window.apiGetAuth = async () => { llamado = true; return { ok: true, cuentas: CUENTAS_MOCK }; };
  await window.agregarTarjetaCuentasInactivasSiAdmin(grid);
  assert.equal(llamado, false);
  assert.equal(grid.children.length, 0);
});

test('agregarTarjetaCuentasInactivasSiAdmin() con respuesta inválida de apiGetAuth (sin data, con error, cuentas no-array, cuentas vacío) no agrega tarjetas', async () => {
  const respuestasInvalidas = [
    null,
    { ok: false, error: 'Sesión expirada' },
    { ok: true, cuentas: 'no es un array' },
    { ok: true, cuentas: [] }
  ];
  for (const resp of respuestasInvalidas){
    const { window, grid } = montarConGrid();
    admin(window);
    window.apiGetAuth = async () => resp;
    await window.agregarTarjetaCuentasInactivasSiAdmin(grid);
    assert.equal(grid.children.length, 0);
  }
});

test('agregarTarjetaCuentasInactivasSiAdmin() con datos válidos agrega las 2 tarjetas (Admins/General) con el conteo correcto de cada grupo', async () => {
  const { window, document, grid } = montarConGrid();
  admin(window);
  window.apiGetAuth = async () => ({ ok: true, cuentas: CUENTAS_MOCK });
  await window.agregarTarjetaCuentasInactivasSiAdmin(grid);
  assert.equal(grid.children.length, 2);
  const [tarjetaAdmins, tarjetaGeneral] = Array.from(grid.children);
  assert.match(tarjetaAdmins.innerHTML, /Inactivos \(Admins\)/);
  assert.match(tarjetaAdmins.innerHTML, /2 cuenta\(s\) inactiva\(s\)/); // Ana + Beto
  assert.match(tarjetaGeneral.innerHTML, /Inactivos \(General\)/);
  assert.match(tarjetaGeneral.innerHTML, /1 cuenta\(s\) inactiva\(s\)/); // Caro
  // La vista (_obtenerVistaInactivos) ya se crea acá, aunque todavía no se
  // haya hecho clic en ninguna tarjeta -- oculta hasta el primer clic.
  const vista = document.getElementById('inactivosVista');
  assert.ok(vista);
  assert.equal(vista.style.display, 'none');
});

test('agregarTarjetaCuentasInactivasSiAdmin() si apiGetAuth() rechaza (error de red/sesión): no rompe y no agrega tarjetas (catch defensivo)', async () => {
  const { window, grid } = montarConGrid();
  admin(window);
  window.apiGetAuth = async () => { throw new Error('Failed to fetch'); };
  await assert.doesNotReject(() => window.agregarTarjetaCuentasInactivasSiAdmin(grid));
  assert.equal(grid.children.length, 0);
});

test('agregarTarjetaCuentasInactivasSiAdmin() — clic en una tarjeta abre _renderVistaInactivos con su grupo, muestra la vista y la inserta justo después del grid', async () => {
  const { window, document, grid } = montarConGrid();
  admin(window);
  window.apiGetAuth = async () => ({ ok: true, cuentas: CUENTAS_MOCK });
  await window.agregarTarjetaCuentasInactivasSiAdmin(grid);
  const tarjetaAdmins = grid.children[0];
  tarjetaAdmins.click();
  const vista = document.getElementById('inactivosVista');
  assert.equal(grid.nextElementSibling, vista);
  assert.equal(vista.style.display, 'block');
  assert.equal(vista.dataset.grupo, 'Cuentas inactivas — Administradores');
  assert.equal(vista.querySelector('#inactivosVistaTitulo').textContent, 'Cuentas inactivas — Administradores');
  assert.equal(vista.querySelectorAll('tbody tr.inactivo-row').length, 2); // Ana + Beto
});

test('agregarTarjetaCuentasInactivasSiAdmin() — un 2do clic en la MISMA tarjeta, con su grupo ya abierto, cierra la vista', async () => {
  const { window, document, grid } = montarConGrid();
  admin(window);
  window.apiGetAuth = async () => ({ ok: true, cuentas: CUENTAS_MOCK });
  await window.agregarTarjetaCuentasInactivasSiAdmin(grid);
  const tarjetaAdmins = grid.children[0];
  tarjetaAdmins.click();
  tarjetaAdmins.click();
  assert.equal(document.getElementById('inactivosVista').style.display, 'none');
});

test('agregarTarjetaCuentasInactivasSiAdmin() — clic en la OTRA tarjeta mientras la vista ya está abierta en otro grupo: cambia de grupo en vez de cerrarla', async () => {
  const { window, document, grid } = montarConGrid();
  admin(window);
  window.apiGetAuth = async () => ({ ok: true, cuentas: CUENTAS_MOCK });
  await window.agregarTarjetaCuentasInactivasSiAdmin(grid);
  const [tarjetaAdmins, tarjetaGeneral] = Array.from(grid.children);
  tarjetaAdmins.click();
  tarjetaGeneral.click();
  const vista = document.getElementById('inactivosVista');
  assert.equal(vista.style.display, 'block');
  assert.equal(vista.dataset.grupo, 'Cuentas inactivas — General');
  assert.equal(vista.querySelectorAll('tbody tr.inactivo-row').length, 1); // solo Caro
});
