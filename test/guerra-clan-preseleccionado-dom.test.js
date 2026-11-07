'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (6-nov-2026, pedido de la usuaria): clan.html enlaza a guerra.html?clan=<nombre> y ese clan arranca elegido en las pestañas de clan
// de las tablas de guerra. Se extrae gestionarTabsClan() del <script> inline REAL de guerra.html y se ejecuta con jsdom.
// AMPLIADO (6-nov-2026, tanda 6a de Clanes por Tag, §PF412): las pestañas y la preselección comparan por Tag (data-clan-tag, ?tag=) y el nombre
// queda de respaldo; también los cupos de las tarjetas, la cabecera (webClanInfo) y los atributos de cada tarjeta.
// LÍMITE: DOM simulado; no prueba el CSS ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'guerra.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function gestionarTabsClan'));
assert.ok(grande, 'no se encontró gestionarTabsClan en guerra.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}

const CUERPO = `<div id="tabs"></div><div id="wrap">
  <div class="ai-clan-card" data-clan="Grupo乂Terna™"></div>
  <div class="ai-clan-card" data-clan="GrupoXTerna™2"></div>
  <div class="ai-clan-card" data-clan="Mini乂Ternas™"></div></div>`;

// Mismas tarjetas, ya con el Tag que pone atributosClanGuerra() cuando guerra.json trae clanTagPorClan.
const CUERPO_TAG = `<div id="tabs"></div><div id="wrap">
  <div class="ai-clan-card" data-clan="Grupo乂Terna™" data-clan-tag="GCRG8L00"></div>
  <div class="ai-clan-card" data-clan="GrupoXTerna™2" data-clan-tag="GYCU9YRG"></div>
  <div class="ai-clan-card" data-clan="Mini乂Ternas™" data-clan-tag="GG99LCJY"></div></div>`;

// Dos clanes distintos con el mismo nombre y distinto Tag: no se confunden.
const CUERPO_HOMONIMOS = `<div id="tabs"></div><div id="wrap">
  <div class="ai-clan-card" data-clan="Argentina" data-clan-tag="ARG111"></div>
  <div class="ai-clan-card" data-clan="Argentina" data-clan-tag="ARG222"></div></div>`;

function montar(preseleccionado, tag, cuerpo){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], cuerpo || CUERPO);
  w.eval(`const TAB_TODOS = '__todos__'; const BUSCADOR_DE_SECCION = {}; function actualizarCuentaBuscador(){}
    const CLAN_PRESELECCIONADO = ${JSON.stringify(preseleccionado || '')};
    const TAG_PRESELECCIONADO = ${JSON.stringify(tag || '')};
    let sel = null;
    ${extraerFuncion(grande, 'claveClanTarjetaGuerra')}
    ${extraerFuncion(grande, 'tarjetaEsClanPreseleccionado')}
    ${extraerFuncion(grande, 'gestionarTabsClan')}
    window.__pintar = () => gestionarTabsClan('tabs', 'wrap', () => sel, v => sel = v);
    window.__sel = () => sel;`);
  w.__pintar();
  return w;
}
const visibles = w => [...w.document.querySelectorAll('#wrap .ai-clan-card')].filter(c => c.style.display !== 'none').map(c => c.dataset.clan);
const visiblesTag = w => [...w.document.querySelectorAll('#wrap .ai-clan-card')].filter(c => c.style.display !== 'none').map(c => c.dataset.clanTag || '');
const activa = w => w.document.querySelector('#tabs .tab-btn.active').textContent;

test('sin ?clan= arranca el clan Principal (el primero), como siempre', () => {
  const w = montar('');
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
  assert.equal(activa(w), 'Grupo乂Terna™');
});

test('con ?clan= arranca ese clan, sin importar mayúsculas ni espacios', () => {
  const w = montar('grupoxterna™2');
  assert.deepEqual(visibles(w), ['GrupoXTerna™2']);
  assert.equal(activa(w), 'GrupoXTerna™2');
  assert.equal(w.__sel(), 'nombre:GrupoXTerna™2'); // sin Tag en la tarjeta, la clave es el nombre
});

test('un clan que no está en la tabla no rompe nada: arranca el Principal', () => {
  const w = montar('otro clan');
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
});

test('lo que la usuaria elige después manda: un repintado no vuelve a pisar la selección', () => {
  const w = montar('mini乂ternas™');
  assert.deepEqual(visibles(w), ['Mini乂Ternas™']);
  w.document.querySelectorAll('#tabs .tab-btn')[0].click();
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
  w.__pintar();
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
});

test('§PF412: con ?tag= arranca el clan de ese Tag aunque el nombre del enlace sea otro', () => {
  const w = montar('nombre viejo del clan', 'GYCU9YRG', CUERPO_TAG);
  assert.deepEqual(visibles(w), ['GrupoXTerna™2']);
  assert.equal(w.__sel(), 'tag:GYCU9YRG');
  assert.equal(activa(w), 'GrupoXTerna™2'); // el botón sigue mostrando el nombre
});

test('§PF412: dos clanes con el mismo nombre y distinto Tag no se confunden', () => {
  const w = montar('argentina', 'ARG222', CUERPO_HOMONIMOS);
  assert.deepEqual(visiblesTag(w), ['ARG222']);
  assert.equal(w.document.querySelectorAll('#tabs .tab-btn').length, 3); // dos clanes + «Todos»
  w.document.querySelectorAll('#tabs .tab-btn')[0].click();
  assert.deepEqual(visiblesTag(w), ['ARG111']); // cada pestaña muestra solo su tarjeta
});

test('§PF412: sin Tag en ?tag= (enlace antiguo) y tarjetas con Tag, se cae al nombre de ?clan=', () => {
  const w = montar('mini乂ternas™', '', CUERPO_TAG);
  assert.deepEqual(visibles(w), ['Mini乂Ternas™']);
  assert.equal(w.__sel(), 'tag:GG99LCJY');
});

test('§PF412: con ?tag= pero tarjetas sin Tag (guerra.json de un backend anterior) se cae al nombre', () => {
  const w = montar('grupoxterna™2', 'GYCU9YRG', CUERPO);
  assert.deepEqual(visibles(w), ['GrupoXTerna™2']);
  assert.equal(w.__sel(), 'nombre:GrupoXTerna™2');
});

test('§PF412: si el Tag pedido no coincide con ninguna tarjeta, no se adivina por nombre: arranca el Principal', () => {
  const w = montar('grupoxterna™2', 'ZZZ999', CUERPO_TAG);
  assert.deepEqual(visibles(w), ['Grupo乂Terna™']);
});

// ---- Atributos de tarjeta, cupos y cabecera ----

function montarAyudantes(mapa, extra){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="clanGrid"></div>');
  w.eval(`
    let ultimoDataGuerra = ${JSON.stringify(mapa === undefined ? {} : { clanTagPorClan: mapa })};
    let cuposPorClanGuerra = null;
    let clanInfoGuerra = null;
    function _normTagGuerra(t){ return String(t || '').replace('#', '').trim().toUpperCase(); }
    function _normNombreClanGuerra(s){ return String(s || '').trim().toLowerCase(); }
    function desgloseCuposClan(c){ return c; }
    function textoCuposTarjeta(d){ return 'cupos de ' + d.clan + ' (' + d.id + ')'; }
    ${extraerFuncion(grande, 'clanTagDeNombreGuerra')}
    ${extraerFuncion(grande, 'atributosClanGuerra')}
    ${extraerFuncion(grande, 'aplicarCuposEnTarjetas')}
    ${extraerFuncion(grande, 'infoClanGuerraPorNombre')}
    window.__attrs = atributosClanGuerra;
    window.__tag = clanTagDeNombreGuerra;
    window.__setCupos = v => { cuposPorClanGuerra = v; aplicarCuposEnTarjetas(); };
    window.__setInfo = v => { clanInfoGuerra = v; };
    window.__info = (n, t) => infoClanGuerraPorNombre(n, t);
    ${extra || ''}`);
  return w;
}
const MAPA = { 'GrupoXTerna™2': '#GYCU9YRG', 'Grupo乂Terna™': '#gcrg8l00', 'Sin clan': '' };

test('§PF412: atributosClanGuerra() agrega el Tag normalizado cuando el mapa lo trae y escapa el nombre', () => {
  const w = montarAyudantes(MAPA);
  assert.equal(w.__attrs('GrupoXTerna™2'), 'data-clan="GrupoXTerna™2" data-clan-tag="GYCU9YRG"');
  assert.equal(w.__attrs('Grupo乂Terna™'), 'data-clan="Grupo乂Terna™" data-clan-tag="GCRG8L00"'); // sin # y en mayúsculas
  assert.equal(w.__attrs('Sin clan'), 'data-clan="Sin clan"'); // externo o sin clan: solo el nombre
  assert.equal(w.__attrs('Clan "raro" <b>'), 'data-clan="Clan &quot;raro&quot; &lt;b&gt;"');
});

test('§PF412: sin clanTagPorClan (backend anterior) o con un mapa roto, todo cae al nombre y nada lanza', () => {
  for (const mapa of [undefined, null, 'texto', []]){
    const w = montarAyudantes(mapa);
    assert.equal(w.__tag('GrupoXTerna™2'), '');
    assert.equal(w.__attrs('GrupoXTerna™2'), 'data-clan="GrupoXTerna™2"');
  }
  assert.equal(montarAyudantes({}).__tag(undefined), '');
});

test('§PF412: los cupos se asignan por Tag; el nombre solo de respaldo', () => {
  const w = montarAyudantes(MAPA);
  w.document.getElementById('clanGrid').innerHTML = `
    <div class="clan-cupos" data-clan="GrupoXTerna™2" data-clan-tag="GYCU9YRG" hidden></div>
    <div class="clan-cupos" data-clan="Mini乂Ternas™" hidden></div>
    <div class="clan-cupos" data-clan="Otro" data-clan-tag="OTRO11" hidden></div>`;
  w.__setCupos([
    { clan: 'GrupoXTerna™2', id: 'a' },
    { clan: 'Mini乂Ternas™', id: 'b' },     // sin Tag en el mapa: se une por nombre
    { clan: 'Sin clan', id: 'c' }
  ]);
  const el = n => w.document.querySelector(`.clan-cupos[data-clan="${n}"]`);
  assert.equal(el('GrupoXTerna™2').hidden, false);
  assert.match(el('GrupoXTerna™2').innerHTML, /GrupoXTerna™2 \(a\)/);
  assert.equal(el('Mini乂Ternas™').hidden, false);
  assert.match(el('Mini乂Ternas™').innerHTML, /\(b\)/);
  assert.equal(el('Otro').hidden, true); // ningún dato de cupos para ese clan
  w.__setCupos(null);
  assert.equal(el('GrupoXTerna™2').hidden, true);
});

test('§PF412: dos tarjetas con el mismo nombre y distinto Tag no reciben los cupos de la otra', () => {
  const w = montarAyudantes({ Argentina: '#ARG222' });
  w.document.getElementById('clanGrid').innerHTML = `
    <div class="clan-cupos" data-clan="Argentina" data-clan-tag="ARG111" hidden></div>
    <div class="clan-cupos" data-clan="Argentina" data-clan-tag="ARG222" hidden></div>`;
  w.__setCupos([{ clan: 'Argentina', id: 'x' }]);
  const [a, b] = w.document.querySelectorAll('.clan-cupos');
  assert.equal(a.hidden, true);
  assert.equal(b.hidden, false);
});

test('§PF412: la cabecera busca el clan de webClanInfo primero por Tag y luego por nombre', () => {
  const w = montarAyudantes(MAPA);
  w.__setInfo([
    { nombre: 'Clan Uno', clanTag: '#AAA111' },
    { nombre: 'GrupoXTerna™2', clanTag: '#OLD000' },      // mismo nombre, otro Tag
    { nombre: 'Nombre nuevo', clanTag: '#GYCU9YRG' }       // el del mapa
  ]);
  assert.equal(w.__info('GrupoXTerna™2').i, 2);            // por Tag (el del mapa), no por el nombre repetido
  assert.equal(w.__info('GrupoXTerna™2', 'OLD000').i, 1);  // Tag dado a mano
  assert.equal(w.__info('Clan Uno').i, 0);                 // sin Tag en el mapa: por nombre
  assert.equal(w.__info('clan uno', '').i, 0);             // Tag vacío: por nombre, sin importar mayúsculas
});
