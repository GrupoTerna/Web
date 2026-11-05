'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria: «integra vetar miembro con buscar miembro; cuando se haya seleccionado el perfil, que se muestre una pastilla para vetarlo y ahí el resto de la sección actual»):
// en admin.html la tarjeta aparte «Directorio > Vetar miembro» (con su caja de Tag) se retiró. Ahora la ficha de «Buscar miembro» (#miembroSec) trae la pastilla #btnVetarPastilla; al pulsarla se abre
// #vetarPanel (Razón, Comentario y botón Vetar) y el Tag es el del miembro de la ficha (miembroActual). Solo la ve quien tiene la función «Vetar» (eso lo prueba admin-buscar-registrar-integrado-dom.test.js).
//
// Se extraen funciones REALES del <script> inline de admin.html entre marcadores (si alguien lo reorganiza, los marcadores fallan a propósito) y la estructura se lee del HTML real.
// LÍMITE: DOM y backend simulados; no prueba el backend real ni el aspecto en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const trozo = (ini, fin, nombre) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f);
};

const CODIGO_OCUPADO = trozo('async function conBotonOcupado(btn, fn){', '// Declaraciones de _clanesFamiliaCache', 'conBotonOcupado()');
const CODIGO_REINICIO = trozo('function reiniciarVetarMiembro(j){', '/**\n * FIX (08-sep-2026, pedido usuario', 'reiniciarVetarMiembro()');
const CODIGO_VETAR = trozo("document.getElementById('btnVetarPastilla').addEventListener", '</script>\n</body>', 'manejadores de vetar');

const ESTRUCTURA = `
  <div id="vetarPastillaBox"><button type="button" class="tab-clan" id="btnVetarPastilla" aria-expanded="false">🚫 Vetar</button></div>
  <div id="vetarMiembroBox">
    <div id="vetarPanel" style="display:none">
      <h3 id="vTitulo"></h3>
      <select id="vRazon"><option value="">Elige una razón…</option><option value="NARANJA x">NARANJA x</option><option value="Solicitud propia">Solicitud propia</option></select>
      <textarea id="vComentario"></textarea>
      <button type="button" id="btnVetar">Vetar</button>
      <div id="vMsg"></div>
    </div>
  </div>`;

function montar({ confirmar = true, respuesta = { ok: true }, falla = false } = {}){
  const dom = new JSDOM(`<!doctype html><html><body>${ESTRUCTURA}</body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  w.confirm = (txt) => { w.__confirmaciones.push(txt); return confirmar; };
  w.__confirmaciones = [];
  w.__respuesta = respuesta;
  w.__falla = falla;
  w.localStorage.setItem('tok', 'TOKEN-1');
  w.eval(`
    var SESSION_KEY = 'tok';
    var miembroActual = null, envios = [];
    function normalizarTag(t){ return '#' + String(t).replace('#','').toUpperCase(); }
    function esc(t){ return String(t); }
    function manejarRespuestaAuth(){ return false; }
    async function apiPost(accion, cuerpo){ envios.push({ accion, cuerpo }); if(window.__falla) throw new Error('sin red'); return window.__respuesta; }
    ${CODIGO_OCUPADO}
    ${CODIGO_REINICIO}
    ${CODIGO_VETAR}
    window.reiniciarVetarMiembro = reiniciarVetarMiembro;
  `);
  return w;
}
const ev = (w, cod) => w.eval(cod);
const id = (w, x) => w.document.getElementById(x);
const clic = (w, x) => id(w, x).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const esperar = () => new Promise(r => setTimeout(r, 0));
const JUGADOR = { tag: '#2GG8PJ8GC', nombre: 'Miembro Registrado' };

test('la pastilla «Vetar» abre y cierra el panel con el resto de la sección, y lo indica en aria-expanded', () => {
  const w = montar();
  ev(w, 'miembroActual = "#2GG8PJ8GC"');
  w.reiniciarVetarMiembro(JUGADOR);
  assert.equal(id(w, 'vetarPanel').style.display, 'none', 'el panel empieza cerrado');
  clic(w, 'btnVetarPastilla');
  assert.equal(id(w, 'vetarPanel').style.display, 'block');
  assert.equal(id(w, 'btnVetarPastilla').classList.contains('activo'), true);
  assert.equal(id(w, 'btnVetarPastilla').getAttribute('aria-expanded'), 'true');
  clic(w, 'btnVetarPastilla');
  assert.equal(id(w, 'vetarPanel').style.display, 'none');
  assert.equal(id(w, 'btnVetarPastilla').classList.contains('activo'), false);
  assert.equal(id(w, 'btnVetarPastilla').getAttribute('aria-expanded'), 'false');
});

test('reiniciarVetarMiembro(): una ficha nueva cierra el panel, limpia razón, comentario y aviso, y titula el formulario con el nombre y el Tag del miembro', () => {
  const w = montar();
  clic(w, 'btnVetarPastilla');
  id(w, 'vRazon').value = 'NARANJA x';
  id(w, 'vComentario').value = 'texto de la ficha anterior';
  id(w, 'vMsg').innerHTML = 'Miembro vetado.';
  id(w, 'btnVetar').style.display = 'none';
  id(w, 'btnVetarPastilla').disabled = true;
  id(w, 'btnVetarPastilla').textContent = '🚫 Vetado';
  w.reiniciarVetarMiembro(JUGADOR);
  assert.equal(id(w, 'vetarPanel').style.display, 'none');
  assert.equal(id(w, 'vRazon').value, '');
  assert.equal(id(w, 'vComentario').value, '');
  assert.equal(id(w, 'vMsg').innerHTML, '');
  assert.equal(id(w, 'btnVetar').style.display, '');
  assert.equal(id(w, 'btnVetarPastilla').disabled, false);
  assert.equal(id(w, 'btnVetarPastilla').textContent, '🚫 Vetar');
  assert.equal(id(w, 'vTitulo').textContent, 'Vetar a Miembro Registrado (#2GG8PJ8GC)');
});

test('vetar usa el Tag del miembro de la ficha, pide confirmación y manda razón y comentario a webAdminVetar', async () => {
  const w = montar();
  ev(w, 'miembroActual = "#2gg8pj8gc"');
  w.reiniciarVetarMiembro(JUGADOR);
  clic(w, 'btnVetarPastilla');
  id(w, 'vRazon').value = 'Solicitud propia';
  id(w, 'vComentario').value = '  pidió salir  ';
  clic(w, 'btnVetar');
  await esperar(); await esperar();
  assert.equal(w.__confirmaciones.length, 1);
  assert.match(w.__confirmaciones[0], /#2GG8PJ8GC/);
  assert.deepEqual(JSON.parse(JSON.stringify(ev(w, 'envios'))), [{
    accion: 'webAdminVetar',
    cuerpo: { sessionToken: 'TOKEN-1', datos: { tag: '#2GG8PJ8GC', razon: 'Solicitud propia', comentario: 'pidió salir' } }
  }]);
  assert.match(id(w, 'vMsg').textContent, /Miembro vetado/);
  assert.equal(id(w, 'btnVetar').style.display, 'none', 'tras vetar se oculta el botón para no vetar dos veces');
  assert.equal(id(w, 'btnVetarPastilla').disabled, true);
  assert.equal(id(w, 'btnVetarPastilla').textContent, '🚫 Vetado');
  assert.equal(id(w, 'vRazon').value, '');
  assert.equal(id(w, 'vComentario').value, '');
});

test('sin razón no se manda nada ni se pide confirmación', async () => {
  const w = montar();
  ev(w, 'miembroActual = "#2GG8PJ8GC"');
  w.reiniciarVetarMiembro(JUGADOR);
  clic(w, 'btnVetar');
  await esperar(); await esperar();
  assert.equal(ev(w, 'envios.length'), 0);
  assert.equal(w.__confirmaciones.length, 0);
  assert.match(id(w, 'vMsg').textContent, /Elige una Razón/);
});

test('sin miembro en la ficha («Primero busca un miembro») no se manda nada', async () => {
  const w = montar();
  id(w, 'vRazon').value = 'NARANJA x';
  clic(w, 'btnVetar');
  await esperar(); await esperar();
  assert.equal(ev(w, 'envios.length'), 0);
  assert.match(id(w, 'vMsg').textContent, /Primero busca un miembro/);
});

test('si la usuaria cancela la confirmación no se manda nada y el formulario queda como estaba', async () => {
  const w = montar({ confirmar: false });
  ev(w, 'miembroActual = "#2GG8PJ8GC"');
  w.reiniciarVetarMiembro(JUGADOR);
  id(w, 'vRazon').value = 'NARANJA x';
  clic(w, 'btnVetar');
  await esperar(); await esperar();
  assert.equal(w.__confirmaciones.length, 1);
  assert.equal(ev(w, 'envios.length'), 0);
  assert.equal(id(w, 'vRazon').value, 'NARANJA x');
  assert.equal(id(w, 'btnVetarPastilla').disabled, false);
});

test('si el backend responde con error, se muestra y el botón sigue disponible para reintentar', async () => {
  const w = montar({ respuesta: { ok: false, error: 'No tienes permiso para vetar' } });
  ev(w, 'miembroActual = "#2GG8PJ8GC"');
  w.reiniciarVetarMiembro(JUGADOR);
  id(w, 'vRazon').value = 'NARANJA x';
  clic(w, 'btnVetar');
  await esperar(); await esperar();
  assert.match(id(w, 'vMsg').textContent, /No tienes permiso para vetar/);
  assert.equal(id(w, 'btnVetar').style.display, '');
  assert.equal(id(w, 'btnVetarPastilla').disabled, false);
  assert.equal(id(w, 'vRazon').value, 'NARANJA x', 'la razón no se pierde si falló');
});

test('si falla la red, se avisa y se puede reintentar', async () => {
  const w = montar({ falla: true });
  ev(w, 'miembroActual = "#2GG8PJ8GC"');
  w.reiniciarVetarMiembro(JUGADOR);
  id(w, 'vRazon').value = 'NARANJA x';
  clic(w, 'btnVetar');
  await esperar(); await esperar();
  assert.match(id(w, 'vMsg').textContent, /Error de conexión: sin red/);
  assert.equal(id(w, 'btnVetar').style.display, '');
});

test('estructura de admin.html: la pastilla «Vetar» va en la cabecera de la ficha (arriba a la derecha) y el formulario al pie, después de los datos de gestión; ambos empiezan ocultos', () => {
  const doc = new JSDOM(HTML).window.document; // sin ejecutar scripts
  const g = (x) => doc.getElementById(x);
  const ficha = g('miembroSec');
  for (const x of ['vetarPastillaBox', 'btnVetarPastilla', 'vetarMiembroBox', 'vetarPanel', 'vTitulo', 'vRazon', 'vComentario', 'btnVetar', 'vMsg']){
    assert.ok(g(x), `falta #${x}`);
    assert.ok(ficha.contains(g(x)), `#${x} no está dentro de la ficha`);
  }
  const cabecera = g('mNombre').closest('.perfil-cabecera');
  assert.ok(cabecera.contains(g('btnVetarPastilla')), 'la pastilla va en la cabecera de la ficha, junto al nombre');
  assert.ok(g('mVerPerfil').compareDocumentPosition(g('vetarPastillaBox')) & 4, 'la pastilla va después del bloque del nombre');
  assert.ok(g('vetarPastillaBox').compareDocumentPosition(cabecera.querySelector('.stats-mini')) & 4, 'y antes de las estadísticas');
  assert.ok(!g('vetarMiembroBox').contains(g('btnVetarPastilla')), 'el formulario ya no lleva la pastilla');
  assert.ok(g('guardarMsg').compareDocumentPosition(g('vetarMiembroBox')) & 4, 'el formulario va después de «Datos de gestión»');
  assert.equal(g('vetarPastillaBox').style.display, 'none', 'oculta hasta saber que tiene la función «Vetar»');
  assert.equal(g('vetarMiembroBox').style.display, 'none', 'oculto hasta saber que tiene la función «Vetar»');
  assert.equal(g('vetarPanel').style.display, 'none', 'el panel empieza cerrado');
  assert.ok(g('btnVetarPastilla').classList.contains('tab-clan'), 'es una pastilla .tab-clan, como las de «Tag o nombre» y «Buscar en Directorio»');
  assert.equal(g('vTag'), null, 'ya no hay caja de Tag: se usa la de la ficha');
  assert.equal(g('cardVetar'), null);
  assert.equal(g('directorioGrupo'), null);
  assert.equal(doc.querySelectorAll('#vRazon option').length, 7, 'la lista de razones es la misma de antes (6 razones + «Elige una razón…»)');
});

// NUEVO (5-nov-2026, pedido de la usuaria): en «Préstamo» no se escribe un detalle, se escribe el nombre de la persona a quien se prestó la cuenta.
test('el campo «Préstamo» de la ficha pide el nombre de la persona a quien se prestó la cuenta, no un detalle', () => {
  const doc = new JSDOM(HTML).window.document;
  const ph = doc.getElementById('fPrestamo').getAttribute('placeholder');
  assert.match(ph, /Nombre de la persona a quien se prestó la cuenta/);
  assert.doesNotMatch(ph, /[Dd]etalle/);
});
