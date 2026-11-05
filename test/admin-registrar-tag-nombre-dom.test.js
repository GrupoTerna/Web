'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (5-nov-2026, pedido de la usuaria: «ahora le pone #»): en «Registrar miembro nuevo» → «Ingresar tag» de admin.html, un nombre escrito en el campo Tag (p. ej. «chistris»)
// se convertía en «#CHISTRIS» y la API respondía «No encontré ese Tag». Ahora, si lo escrito no parece un Tag, el campo no se toca, no se consulta la API y se explica qué hacer.
//
// Se extraen _pareceTag() y verificarTagNuevoMiembro() REALES del <script> inline de admin.html entre marcadores. LÍMITE: DOM y backend simulados.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const trozo = (ini, fin, nombre) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f);
};
const CODIGO = trozo('function _pareceTag(texto){', 'async function buscarMiembro(){', '_pareceTag()') +
  '\n' + trozo('async function verificarTagNuevoMiembro(){', "document.getElementById('btnNmVerificar').addEventListener", 'verificarTagNuevoMiembro()');

function montar(valor){
  const dom = new JSDOM(`<!doctype html><html><body>
    <input id="nmTag" value="${valor}"><div id="nmVerificarMsg"></div><div id="nmPaso2" style="display:none"></div>
    <input id="nmNomMultiNuevo"><input id="nmPrefijo"><input id="nmCelular"><div id="nmGuardarMsg"></div>
  </body></html>`, { runScripts: 'outside-only', url: 'https://terna.example/' });
  const w = dom.window;
  w.eval(`
    var nmTagVerificado = null, llamadas = [];
    function normalizarTag(t){ let v = String(t||'').trim().toUpperCase().replace(/^#/, ''); return v ? '#' + v : ''; }
    function esc(t){ return String(t); }
    function enlaceClan(c){ return String(c); }
    function manejarRespuestaAuth(){ return false; }
    function cargarNomMultisExistentes(){}
    async function apiGetAuth(accion, params){ llamadas.push({ accion, params }); return { ok: true, fuente: 'Directorio', jugador: { tag: params.tag, nombre: 'Prueba', clan: '' } }; }
    ${CODIGO}
    window.verificar = verificarTagNuevoMiembro;
  `);
  return w;
}

test('un nombre en el campo Tag no se convierte en «#NOMBRE»: el campo queda igual, no se consulta la API y se explica qué hacer', async () => {
  const w = montar('chistris');
  await w.verificar();
  assert.equal(w.document.getElementById('nmTag').value, 'chistris', 'no le pone # ni lo pasa a mayúsculas');
  assert.equal(w.eval('llamadas.length'), 0);
  const msg = w.document.getElementById('nmVerificarMsg').textContent;
  assert.match(msg, /no parece un Tag/);
  assert.match(msg, /Buscar en Directorio/);
  assert.equal(w.document.getElementById('nmPaso2').style.display, 'none');
});

test('un Tag válido (con o sin #, en minúsculas) sigue normalizándose y verificándose', async () => {
  const w = montar('2gg8pj8gc');
  await w.verificar();
  assert.equal(w.document.getElementById('nmTag').value, '#2GG8PJ8GC');
  assert.deepEqual(JSON.parse(JSON.stringify(w.eval('llamadas'))), [{ accion: 'webAdminVerificarTag', params: { tag: '#2GG8PJ8GC' } }]);
  assert.equal(w.document.getElementById('nmPaso2').style.display, 'block');
});

test('con el campo vacío sigue pidiendo un Tag válido', async () => {
  const w = montar('');
  await w.verificar();
  assert.match(w.document.getElementById('nmVerificarMsg').textContent, /Escribe un Tag válido/);
});
