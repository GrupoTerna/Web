'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria: «registrar miembro nuevo se parece bastante a buscar miembro, intégralo a la búsqueda por tag»): en admin.html «Registrar miembro nuevo» ya
// no es una tarjeta aparte con su caja de Tag y su botón «Verificar»; se identifica al jugador en «Buscar miembro» (Tag o nombre). Si el Tag ya existe sale su ficha; si no, el backend
// responde `sinRegistro` y sigue el Paso 2 de registro, solo para quien tiene la función «Registrar miembro nuevo». Reemplaza a admin-registrar-tag-nombre-dom.test.js (probaba
// verificarTagNuevoMiembro(), que ya no existe).
//
// Se extraen funciones REALES del <script> inline de admin.html entre marcadores (si alguien lo reorganiza, los marcadores fallan a propósito) y la estructura se lee del HTML real.
// LÍMITE: DOM y backend simulados; no prueba el backend real ni el aspecto en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const trozo = (ini, fin, nombre, incluirFin = false) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f + (incluirFin ? fin.length : 0));
};

const CODIGO_BUSCAR = trozo('function _pareceTag(texto){', "document.getElementById('btnBuscar').addEventListener", '_pareceTag()/buscarMiembro()');
const CODIGO_REGISTRO = trozo('function invalidarRegistroNuevo(){', "document.getElementById('nmNomMultiSelect').addEventListener('change'", 'invalidarRegistroNuevo()/mostrarRegistroNuevo()');
const CODIGO_PERMISOS = trozo('function adminPuedeRegistrar(){', '/**\n * aplicarVisibilidadPanelPermisos()', 'adminPuedeRegistrar()/aplicarVisibilidadPorFunciones()');
const CODIGO_CLICK_DIR = trozo("document.getElementById('nmDirLista').addEventListener('click'", '  buscarMiembro();\n});', 'clic en la lista del Directorio', true);

function montar({ funciones = 'Registrar miembro nuevo', respuesta, sesionRota = false } = {}){
  const dom = new JSDOM(`<!doctype html><html><body>
    <input id="tagInput" value="#2GG8PJ8GC">
    <div id="buscarSugerencias" style="display:none"></div>
    <div id="buscarMsg"></div>
    <div id="nmVerificarMsg">aviso viejo</div>
    <div id="nmPaso2" style="display:block">
      <select id="nmNomMultiSelect"></select><input id="nmNomMultiNuevo" value="x" style="display:block"><input id="nmPrefijo" value="51"><input id="nmCelular" value="999"><div id="nmGuardarMsg">viejo</div>
    </div>
    <div id="miembroSec" style="display:none"><h3 id="mNombre"></h3></div>
    <div id="nmModoCampo" style="display:none"></div><div id="cardVetar"></div><div id="directorioGrupo"></div>
  </body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = function(){ w.__scroll.push(this.id); };
  w.__scroll = [];
  w.matchMedia = () => ({ matches: true });
  w.localStorage.setItem('adm', sesionRota ? '{no es json' : JSON.stringify({ funciones }));
  w.__respuesta = respuesta;
  w.eval(`
    var SESSION_ADMIN_KEY = 'adm';
    var _sugerenciasMiembroTimer = null, _sugerenciasMiembroSeq = 0, _sugerenciasMiembroCache = [];
    var llamadas = [], fichas = [], cargasNomMulti = 0, nmTagVerificado = 'viejo';
    function normalizarTag(t){ return '#' + String(t).replace('#','').toUpperCase(); }
    function esc(t){ return String(t); }
    function enlaceClan(c){ return String(c); }
    function manejarRespuestaAuth(){ return false; }
    function renderSugerenciasMiembro(){}
    function _ordenarSugerenciasMiembro(x){ return x; }
    function renderMiembro(j){ fichas.push(j); document.getElementById('miembroSec').style.display = 'block'; }
    function cargarNomMultisExistentes(){ cargasNomMulti++; }
    async function apiGetAuth(accion, params){ llamadas.push({ accion, params }); return window.__respuesta; }
    ${CODIGO_PERMISOS}
    ${CODIGO_BUSCAR}
    ${CODIGO_REGISTRO}
    window.buscarMiembro = buscarMiembro;
  `);
  return w;
}
const ev = (w, cod) => w.eval(cod);
const id = (w, x) => w.document.getElementById(x);
const sinRegistro = { ok: true, jugador: { tag: '#2GG8PJ8GC', nombre: 'Nuevo Jugador', clan: 'Otro Clan', estado: 'Sin registro con nosotros', sinRegistro: true } };
const conRegistro = { ok: true, jugador: { tag: '#2GG8PJ8GC', nombre: 'Miembro Registrado', clan: 'Terna', estado: 'Activo' } };

test('un Tag sin registro con nosotros, con el permiso: se abre el Paso 2 con el Tag listo, sin ficha y sin llamar a webAdminVerificarTag', async () => {
  const w = montar({ respuesta: sinRegistro });
  await w.buscarMiembro();
  assert.equal(id(w, 'nmPaso2').style.display, 'block');
  assert.equal(ev(w, 'nmTagVerificado'), '#2GG8PJ8GC');
  assert.equal(ev(w, 'fichas.length'), 0, 'no hay ficha de gestión para quien no está registrado');
  assert.equal(id(w, 'miembroSec').style.display, 'none');
  assert.deepEqual(JSON.parse(JSON.stringify(ev(w, 'llamadas'))), [{ accion: 'webAdminBuscarMiembro', params: { tag: '#2GG8PJ8GC' } }]);
  const aviso = id(w, 'nmVerificarMsg').textContent;
  assert.match(aviso, /Nuevo Jugador/);
  assert.match(aviso, /Todavía no tiene registro con nosotros/);
  assert.equal(ev(w, 'cargasNomMulti'), 1, 'se carga la lista de Nom_Multi del Paso 2');
  assert.equal(id(w, 'nmPrefijo').value, '', 'los campos del Paso 2 empiezan vacíos');
  assert.equal(id(w, 'nmCelular').value, '');
  assert.equal(id(w, 'nmNomMultiNuevo').style.display, 'none');
  assert.equal(id(w, 'nmGuardarMsg').innerHTML, '');
  assert.deepEqual(w.__scroll, ['nmVerificarMsg']);
});

test('un Tag sin registro, sin el permiso «Registrar miembro nuevo»: solo se avisa; el Paso 2 queda oculto y no hay Tag listo', async () => {
  const w = montar({ funciones: 'Vetar', respuesta: sinRegistro });
  await w.buscarMiembro();
  assert.equal(id(w, 'nmPaso2').style.display, 'none');
  assert.equal(ev(w, 'nmTagVerificado'), null);
  assert.match(id(w, 'nmVerificarMsg').textContent, /No tienes permiso para registrar miembros nuevos/);
  assert.equal(ev(w, 'fichas.length'), 0);
});

test('un Tag con registro abre su ficha y oculta un Paso 2 que hubiera quedado abierto de una búsqueda anterior', async () => {
  const w = montar({ respuesta: conRegistro });
  await w.buscarMiembro();
  assert.equal(ev(w, 'fichas.length'), 1);
  assert.equal(ev(w, 'fichas[0].nombre'), 'Miembro Registrado');
  assert.equal(id(w, 'nmPaso2').style.display, 'none');
  assert.equal(id(w, 'nmVerificarMsg').innerHTML, '', 'el aviso de la búsqueda anterior se borra');
});

test('si el backend responde con error, el Paso 2 sigue oculto y el error se ve junto al buscador', async () => {
  const w = montar({ respuesta: { ok: false, error: 'No encontré ese Tag' } });
  await w.buscarMiembro();
  assert.equal(id(w, 'nmPaso2').style.display, 'none');
  assert.match(id(w, 'buscarMsg').innerHTML, /No encontré ese Tag/);
});

test('invalidarRegistroNuevo(): descarta el Tag listo, oculta el Paso 2 y borra su aviso (se usa al escribir en el buscador y al cambiar de pastilla)', () => {
  const w = montar({ respuesta: sinRegistro });
  ev(w, "nmTagVerificado = '#2GG8PJ8GC'");
  ev(w, 'invalidarRegistroNuevo()');
  assert.equal(ev(w, 'nmTagVerificado'), null);
  assert.equal(id(w, 'nmPaso2').style.display, 'none');
  assert.equal(id(w, 'nmVerificarMsg').innerHTML, '');
});

test('adminPuedeRegistrar(): solo con la función «Registrar miembro nuevo» en la sesión; sin sesión o con la sesión dañada es falso', () => {
  assert.equal(ev(montar({ funciones: 'Registrar miembro nuevo' }), 'adminPuedeRegistrar()'), true);
  assert.equal(ev(montar({ funciones: 'Vetar, Registrar miembro nuevo' }), 'adminPuedeRegistrar()'), true);
  assert.equal(ev(montar({ funciones: 'Vetar' }), 'adminPuedeRegistrar()'), false);
  assert.equal(ev(montar({ sesionRota: true }), 'adminPuedeRegistrar()'), false);
  const w = montar();
  w.localStorage.removeItem('adm');
  assert.equal(ev(w, 'adminPuedeRegistrar()'), false);
});

test('aplicarVisibilidadPorFunciones(): la pastilla «Buscar en Directorio» sale solo con «Registrar miembro nuevo»; el grupo «Directorio» y «Vetar miembro» solo con «Vetar»', () => {
  const casos = [
    ['Registrar miembro nuevo', '', 'none', 'none'],
    ['Vetar', 'none', '', ''],
    ['Registrar miembro nuevo, Vetar', '', '', ''],
    ['', 'none', 'none', 'none']
  ];
  for (const [funciones, campo, vetar, grupo] of casos){
    const w = montar({ funciones });
    ev(w, 'aplicarVisibilidadPorFunciones()');
    assert.equal(id(w, 'nmModoCampo').style.display, campo, `pastilla con «${funciones}»`);
    assert.equal(id(w, 'cardVetar').style.display, vetar, `Vetar con «${funciones}»`);
    assert.equal(id(w, 'directorioGrupo').style.display, grupo, `grupo Directorio con «${funciones}»`);
  }
});

test('un clic en un miembro de la lista del Directorio vuelve a «Tag o nombre», llena el buscador con su Tag y abre su ficha', () => {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button class="btn-toggle-nmmodo" data-modo="tag"></button><button class="btn-toggle-nmmodo activo" data-modo="directorio"></button>
    <input id="tagInput"><div id="nmDirLista"><div class="js-nm-dir-miembro" data-tag="#9PJ8CQ"><span id="hijo">Ana</span></div></div>
  </body></html>`, { runScripts: 'outside-only', url: 'https://terna.example/' });
  const w = dom.window;
  w.eval(`
    var pasos = [];
    function actualizarModoBuscarMiembro(){ pasos.push('modo:' + document.querySelector('.btn-toggle-nmmodo.activo').dataset.modo); }
    function buscarMiembro(){ pasos.push('buscar:' + document.getElementById('tagInput').value); }
    ${CODIGO_CLICK_DIR}
  `);
  w.document.getElementById('hijo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(JSON.parse(JSON.stringify(w.eval('pasos'))), ['modo:tag', 'buscar:#9PJ8CQ']);
});

test('estructura de admin.html: «Registrar miembro nuevo» vive dentro de «Buscar miembro», en orden, y la tarjeta aparte y su caja de Tag ya no existen', () => {
  const doc = new JSDOM(HTML).window.document;
  const g = (x) => doc.getElementById(x);
  assert.equal(g('cardRegistrarNuevo'), null, 'la tarjeta «Registrar miembro nuevo» aparte ya no existe');
  assert.equal(g('nmTag'), null, 'la caja de Tag del registro ya no existe');
  assert.equal(g('btnNmVerificar'), null, 'el botón «Verificar» ya no existe');
  const tarjeta = g('miembroSec').closest('.card');
  assert.match(tarjeta.querySelector('.eyebrow').textContent, /Buscar miembro/);
  for (const x of ['tagInput', 'nmModoCampo', 'nmModoSelector', 'nmModoDirBox', 'nmDirLista', 'buscarMsg', 'nmVerificarMsg', 'nmPaso2', 'btnNmGuardar', 'cardInfiltrados', 'mVerPerfil']){
    assert.ok(g(x), `falta #${x}`);
    assert.equal(g(x).closest('.card.pf-cinta'), tarjeta, `#${x} no está dentro de «Buscar miembro»`);
  }
  const antes = (a, b) => assert.ok(g(a).compareDocumentPosition(g(b)) & 4, `#${a} debe ir antes de #${b}`);
  antes('tagInput', 'nmModoDirBox'); antes('nmModoDirBox', 'buscarMsg'); antes('buscarMsg', 'nmVerificarMsg');
  antes('nmVerificarMsg', 'nmPaso2'); antes('nmPaso2', 'miembroSec'); antes('miembroSec', 'cardInfiltrados');
  assert.deepEqual([...doc.querySelectorAll('.btn-toggle-nmmodo')].map(b => [b.dataset.modo, b.textContent.trim()]), [['tag', 'Tag o nombre'], ['directorio', 'Buscar en Directorio']]);
  assert.equal(g('nmModoCampo').style.display, 'none', 'la pastilla empieza oculta hasta saber el permiso');
  assert.ok(g('directorioGrupo').contains(g('cardVetar')), '«Vetar miembro» sigue en el grupo «Directorio»');
  assert.equal(g('mVerPerfil').getAttribute('target'), '_blank');
  assert.equal(g('mVerPerfil').getAttribute('rel'), 'noopener');
  assert.ok(HTML.includes("'perfil.html?tag=' + encodeURIComponent(j.tag)"), 'renderMiembro() arma el enlace a perfil.html con el Tag');
});
