'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria: «al lado de vetar, pon una pastilla para verificar si es infiltrado, integrando también esa sección»): la ficha de «Buscar miembro» (#miembroSec) trae, junto
// a «Vetar», la pastilla #btnInfiltradoPastilla. Al abrirla consulta webAdminBuscarInfiltrado con el Tag de la ficha (miembroActual) y pinta el resultado en #infiltradoPanel. A diferencia de «Vetar»
// no pide una función aparte: todo admin con sesión puede consultarla, igual que la tarjeta «Detección de infiltrados», que sigue aparte porque también revisa el Tag de un CLAN rival.
//
// Se extraen funciones REALES del <script> inline de admin.html entre marcadores (si alguien lo reorganiza, los marcadores fallan a propósito) y la estructura se lee del HTML real.
// LÍMITE: DOM y backend simulados (la respuesta usa la forma real de _buscarInfiltrado(): { ok, tipo:'jugador', jugador, infoRival, historialTerna }); no prueba el backend real ni el aspecto en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const trozo = (ini, fin, nombre) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f);
};

const CODIGO_RENDER = trozo('function _badgeRival(infoRival){', 'async function buscarInfiltrado(){', '_badgeRival()/_tablaCoincidencias()/renderInfiltrado()');
const CODIGO_FICHA = trozo('function reiniciarInfiltradoFicha(j){', "document.getElementById('btnGuardar').addEventListener", 'reiniciarInfiltradoFicha()/verificarInfiltradoFicha()/pastilla');

const ESTRUCTURA = `
  <button type="button" id="btnInfiltradoPastilla" aria-expanded="false">🕵️ ¿Infiltrado?</button>
  <div id="infiltradoPanel" style="display:none">
    <h3 id="infFichaTitulo"></h3><div id="fichaInfMsg"></div><div id="fichaInfResultado"></div>
  </div>
  <div id="infResultado"></div>`;

function montar({ respuestas = [], falla = false } = {}){
  const dom = new JSDOM(`<!doctype html><html><body>${ESTRUCTURA}</body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  w.__respuestas = respuestas.slice();
  w.__falla = falla;
  w.eval(`
    var miembroActual = null, _infFichaSeq = 0, llamadas = [], pendientes = [];
    function normalizarTag(t){ return '#' + String(t).replace('#','').toUpperCase(); }
    function esc(t){ return String(t); }
    function enlaceJugador(n){ return String(n); }
    function enlaceClan(c){ return String(c); }
    function activarBarraScrollTabla(){}
    function manejarRespuestaAuth(){ return false; }
    // Cada llamada devuelve la siguiente respuesta preparada; si es una función, se resuelve a mano (para probar respuestas que llegan tarde).
    function apiGetAuth(accion, params){
      llamadas.push({ accion, params });
      if(window.__falla) return Promise.reject(new Error('sin red'));
      const r = window.__respuestas.shift();
      if(typeof r === 'function') return new Promise(res => pendientes.push(() => res(r())));
      return Promise.resolve(r);
    }
    ${CODIGO_RENDER}
    ${CODIGO_FICHA}
    window.reiniciarInfiltradoFicha = reiniciarInfiltradoFicha;
    window.verificarInfiltradoFicha = verificarInfiltradoFicha;
    window.renderInfiltrado = renderInfiltrado;
  `);
  return w;
}
const ev = (w, cod) => w.eval(cod);
const id = (w, x) => w.document.getElementById(x);
const clic = (w, x) => id(w, x).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const esperar = () => new Promise(r => setTimeout(r, 0));
const JUGADOR = { tag: '#2GG8PJ8GC', nombre: 'Miembro Registrado' };
const abrirFicha = (w) => { ev(w, 'miembroActual = "#2gg8pj8gc"'); w.reiniciarInfiltradoFicha(JUGADOR); };
const respuestaJugador = (infoRival) => ({
  ok: true, tipo: 'jugador',
  jugador: { nombre: 'Miembro Registrado', tag: '#2GG8PJ8GC', clanActual: 'Clan Rival', clanActualTag: '#RIVAL1' },
  infoRival,
  historialTerna: [{ origen: 'Directorio', nombre: 'Miembro Registrado', tag: '#2GG8PJ8GC', clan: 'Terna', razon: '' }]
});

test('la pastilla abre el panel y consulta webAdminBuscarInfiltrado con el Tag de la ficha, sin escribirlo', async () => {
  const w = montar({ respuestas: [respuestaJugador({ fuente: 'currentriverrace', clanTernaNombre: 'Terna 2' })] });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla');
  assert.equal(id(w, 'infiltradoPanel').style.display, 'block');
  assert.equal(id(w, 'btnInfiltradoPastilla').classList.contains('activo'), true);
  assert.equal(id(w, 'btnInfiltradoPastilla').getAttribute('aria-expanded'), 'true');
  assert.match(id(w, 'fichaInfMsg').textContent, /Verificando/);
  await esperar();
  assert.deepEqual(JSON.parse(JSON.stringify(ev(w, 'llamadas'))), [{ accion: 'webAdminBuscarInfiltrado', params: { tag: '#2GG8PJ8GC' } }]);
  assert.equal(id(w, 'fichaInfMsg').innerHTML, '');
  assert.match(id(w, 'fichaInfResultado').textContent, /Rival de esta temporada/);
  assert.match(id(w, 'fichaInfResultado').textContent, /vs\. Terna 2/);
  assert.match(id(w, 'fichaInfResultado').textContent, /Clan actual: Clan Rival \(#RIVAL1\)/);
  assert.equal(id(w, 'infResultado').innerHTML, '', 'no toca el resultado de la tarjeta «Detección de infiltrados»');
});

test('cerrar y volver a abrir muestra lo mismo sin volver a consultar', async () => {
  const w = montar({ respuestas: [respuestaJugador({ fuente: 'manual', motivo: 'Lo avisaron' })] });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla'); await esperar();
  clic(w, 'btnInfiltradoPastilla');
  assert.equal(id(w, 'infiltradoPanel').style.display, 'none');
  assert.equal(id(w, 'btnInfiltradoPastilla').getAttribute('aria-expanded'), 'false');
  clic(w, 'btnInfiltradoPastilla');
  assert.equal(id(w, 'infiltradoPanel').style.display, 'block');
  assert.equal(ev(w, 'llamadas.length'), 1);
  assert.match(id(w, 'fichaInfResultado').textContent, /En lista de conflicto/);
});

test('sin señales dice «Sin señales» y aclara que eso no prueba que no sea infiltrado', async () => {
  const w = montar({ respuestas: [respuestaJugador(null)] });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla'); await esperar();
  const t = id(w, 'fichaInfResultado').textContent;
  assert.match(t, /Sin señales/);
  assert.match(t, /no prueba que no sea infiltrado/);
});

test('la tarjeta «Detección de infiltrados» de siempre (renderInfiltrado sin argumentos) sigue pintando en #infResultado y sin el veredicto «Sin señales»', () => {
  const w = montar();
  w.renderInfiltrado(respuestaJugador(null));
  assert.match(id(w, 'infResultado').textContent, /Miembro Registrado/);
  assert.doesNotMatch(id(w, 'infResultado').textContent, /Sin señales/);
  assert.equal(id(w, 'fichaInfResultado').innerHTML, '');
});

test('si el backend responde con error, se muestra; al cerrar y volver a abrir se reintenta', async () => {
  const w = montar({ respuestas: [{ ok: false, error: 'No existe ese Tag' }, respuestaJugador(null)] });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla'); await esperar();
  assert.match(id(w, 'fichaInfMsg').textContent, /No existe ese Tag/);
  assert.equal(id(w, 'fichaInfResultado').innerHTML, '');
  clic(w, 'btnInfiltradoPastilla'); clic(w, 'btnInfiltradoPastilla'); await esperar();
  assert.equal(ev(w, 'llamadas.length'), 2);
  assert.match(id(w, 'fichaInfResultado').textContent, /Sin señales/);
  assert.equal(id(w, 'fichaInfMsg').innerHTML, '');
});

test('si falla la red, se avisa', async () => {
  const w = montar({ falla: true });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla'); await esperar();
  assert.match(id(w, 'fichaInfMsg').textContent, /Error de conexión: sin red/);
});

test('una respuesta que llega tarde, de la ficha anterior, no se pinta en la ficha nueva', async () => {
  const w = montar({ respuestas: [() => respuestaJugador({ fuente: 'currentriverrace' })] });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla');
  w.reiniciarInfiltradoFicha({ tag: '#OTRO', nombre: 'Otra Persona' }); // se abrió otra ficha mientras la consulta seguía en vuelo
  ev(w, 'pendientes.shift()()');
  await esperar();
  assert.equal(id(w, 'fichaInfResultado').innerHTML, '', 'no se pinta el resultado de la ficha anterior');
  assert.equal(id(w, 'infiltradoPanel').style.display, 'none');
});

test('sin ficha («Primero busca un miembro») no se consulta nada', async () => {
  const w = montar();
  await w.verificarInfiltradoFicha();
  assert.equal(ev(w, 'llamadas.length'), 0);
  assert.match(id(w, 'fichaInfMsg').textContent, /Primero busca un miembro/);
});

test('reiniciarInfiltradoFicha(): una ficha nueva cierra el panel, borra el resultado y titula con el nombre y el Tag', async () => {
  const w = montar({ respuestas: [respuestaJugador(null)] });
  abrirFicha(w);
  clic(w, 'btnInfiltradoPastilla'); await esperar();
  w.reiniciarInfiltradoFicha({ tag: '#OTRO', nombre: 'Otra Persona' });
  assert.equal(id(w, 'infiltradoPanel').style.display, 'none');
  assert.equal(id(w, 'btnInfiltradoPastilla').classList.contains('activo'), false);
  assert.equal(id(w, 'btnInfiltradoPastilla').getAttribute('aria-expanded'), 'false');
  assert.equal(id(w, 'fichaInfResultado').innerHTML, '');
  assert.equal(id(w, 'fichaInfMsg').innerHTML, '');
  assert.equal(id(w, 'infFichaTitulo').textContent, '¿Es infiltrado? Otra Persona (#OTRO)');
});

test('estructura de admin.html: la pastilla «¿Infiltrado?» va junto a «Vetar» en la cabecera de la ficha, siempre visible; su panel va antes del formulario de vetar; la tarjeta «Detección de infiltrados» sigue', () => {
  const doc = new JSDOM(HTML).window.document; // sin ejecutar scripts
  const g = (x) => doc.getElementById(x);
  const ficha = g('miembroSec');
  for (const x of ['fichaAcciones', 'btnInfiltradoPastilla', 'infiltradoPanel', 'infFichaTitulo', 'fichaInfMsg', 'fichaInfResultado']) assert.ok(ficha.contains(g(x)), `#${x} no está dentro de la ficha`);
  const cabecera = g('mNombre').closest('.perfil-cabecera');
  assert.ok(cabecera.contains(g('fichaAcciones')), 'las acciones van en la cabecera de la ficha');
  assert.ok(g('fichaAcciones').contains(g('btnVetarPastilla')) && g('fichaAcciones').contains(g('btnInfiltradoPastilla')), '«Vetar» y «¿Infiltrado?» comparten contenedor');
  assert.ok(g('btnVetarPastilla').compareDocumentPosition(g('btnInfiltradoPastilla')) & 4, '«¿Infiltrado?» va al lado de «Vetar», después');
  assert.ok(!g('vetarPastillaBox').contains(g('btnInfiltradoPastilla')), 'no depende de la función «Vetar»');
  assert.equal(g('fichaAcciones').style.display, 'flex');
  assert.notEqual(g('vetarPastillaBox').style.display, '', 'la caja de «Vetar» sí empieza oculta');
  assert.equal(g('infiltradoPanel').style.display, 'none', 'el panel empieza cerrado');
  assert.ok(g('infiltradoPanel').compareDocumentPosition(g('vetarMiembroBox')) & 4, 'el panel va antes del formulario de vetar');
  assert.ok(g('guardarMsg').compareDocumentPosition(g('infiltradoPanel')) & 4, 'y después de «Datos de gestión»');
  assert.ok(g('cardInfiltrados') && g('infTagInput') && g('btnBuscarInfiltrado'), 'la tarjeta «Detección de infiltrados» (que también revisa clanes rivales) sigue');
  assert.ok(HTML.includes("webAdminBuscarInfiltrado"), 'usa el mismo endpoint');
});
