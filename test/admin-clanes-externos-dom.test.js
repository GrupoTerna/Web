'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (18-nov-2026, pedido de la usuaria, §PF508 y §PF509): tarjeta «Clanes externos» de admin.html. Tres categorías (Rivales agrupados por el clan nuestro al que enfrentan, Vetados, Externos), «Ver más», activos e inactivos y filtro de clanes con activos;
// clanes y jugadores llevan enlace dentro de la web y a RoyaleAPI y CWStats con su ícono. Se extraen las funciones REALES del <script> de admin.html entre marcadores y la estructura se lee del HTML real.
// LÍMITE: DOM y backend simulados; no prueba el backend real ni el aspecto en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const UTIL = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'util.js'), 'utf8');
const trozo = (ini, fin, nombre) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f);
};
const CODIGO = trozo('let _ceDatos = null;', 'async function verificarInfiltradosClan(){', 'tarjeta Clanes externos');
const ETIQUETA = trozo('function _etiquetaPuntoClan(p){', '/** Tabla de «pasaron por este clan»', '_etiquetaPuntoClan()');
const TARJETA = trozo('<div class="card pf-cinta" id="cardClanesExternos"', '<!-- 5-nov-2026 (pedido de la usuaria): el grupo «Directorio»', 'HTML de la tarjeta');

const jug = (n, activo) => ({ tag: '#P' + n, nombre: 'J' + n, activo, semanas: 2, primera: { temporada: 5, semana: 1, supercell: '' }, ultima: { temporada: 5, semana: 3, supercell: '' } });
const DATOS = { ok: true, actualizado: '2026-11-17 09:05', indiceCompleto: true, total: 5, clanes: [
  { tag: '#AAA111', nombre: 'Rivales <b>X</b>', tipos: ['rival'], hoy: true, ternaTag: '#T2', ternaNombre: 'Terna Dos', activos: 1, inactivos: 1, jugadores: [jug(1, true), { ...jug(2, false), primera: { temporada: -7, semana: 2, supercell: '2024-08' }, ultima: { temporada: -7, semana: 2, supercell: '2024-08' } }] },
  { tag: '#AAA222', nombre: 'Rival Uno', tipos: ['rival'], hoy: true, ternaTag: '#T1', ternaNombre: 'Terna Uno', activos: 0, inactivos: 1, jugadores: [jug(4, false)] },
  { tag: '#OLD444', nombre: 'Rival Viejo', tipos: ['rival'], hoy: false, ternaTag: '', ternaNombre: '', activos: 1, inactivos: 0, jugadores: [jug(5, true)] },
  { tag: '#BBB222', nombre: 'Vetado Uno', tipos: ['vetado'], hoy: true, ternaTag: '', ternaNombre: '', activos: 0, inactivos: 0, jugadores: [] },
  { tag: '#CCC333', nombre: 'Solo Externo', tipos: [], hoy: false, ternaTag: '', ternaNombre: '', activos: 0, inactivos: 1, jugadores: [{ ...jug(3, false), primera: null, ultima: null }] }
] };
const muchos = n => ({ ok: true, actualizado: 'x', indiceCompleto: true, total: n, clanes: Array.from({ length: n }, (_, i) => ({ tag: '#E' + String(i).padStart(3, '0'), nombre: 'Ext ' + String(i).padStart(3, '0'), tipos: [], hoy: false, ternaTag: '', ternaNombre: '', activos: 0, inactivos: 1, jugadores: [jug(i, false)] })) });

function montar(respuesta = DATOS){
  const dom = new JSDOM(`<!doctype html><html><body>${TARJETA}<input id="clanTagInput"><div id="cardBuscarClan"></div></body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  w.__respuesta = respuesta; w.__buscados = []; w.__llamadas = [];
  w.eval(`
    var ICONO_ROYALEAPI = '<img class="ico-ra" alt="">', ICONO_CWSTATS = '<img class="ico-cw" alt="">';
    function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function normalizarTag(t){ let v = String(t||'').trim().toUpperCase().replace(/^#/, ''); return v ? '#' + v : ''; }
    function manejarRespuestaAuth(){ return false; }
    async function conBotonOcupado(b, fn){ return fn(); }
    async function apiGetAuth(accion){ window.__llamadas.push(accion); return window.__respuesta; }
    async function buscarClan(){ window.__buscados.push(document.getElementById('clanTagInput').value); }
    ${UTIL.slice(UTIL.indexOf('function enlaceJugador('), UTIL.indexOf('/**\n * enlaceClan('))}
    ${ETIQUETA}
    ${CODIGO}
  `);
  return w;
}
const id = (w, x) => w.document.getElementById(x);
const esperar = () => new Promise(r => setTimeout(r, 0));
const cargar = async w => { id(w, 'btnCargarClanesExternos').click(); await esperar(); };
const categoria = (w, t) => w.document.querySelector(`[data-ce-tipo="${t}"]`).click();
const nombres = w => [...w.document.querySelectorAll('.ce-nombre')].map(x => x.textContent);
const abrir = (w, el) => { el.open = true; el.dispatchEvent(new w.Event('toggle')); };

test('al cargar salen primero las tres categorías con su conteo y todavía ningún clan', async () => {
  const w = montar();
  await cargar(w);
  assert.deepEqual(w.__llamadas, ['webAdminClanesExternos']);
  const cats = [...w.document.querySelectorAll('.ce-cat')].map(b => [b.getAttribute('data-ce-tipo'), b.querySelector('b').textContent, b.querySelector('small').textContent]);
  assert.deepEqual(cats, [['rival', '3', '2 con miembros activos'], ['vetado', '1', '0 con miembros activos'], ['externo', '1', '0 con miembros activos']]);
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 0);
  assert.equal(id(w, 'ceControles').style.display, 'none', 'el filtro aparece al elegir categoría');
});

test('Rivales se agrupa por el clan nuestro al que enfrentan y deja los de semanas anteriores al final', async () => {
  const w = montar();
  await cargar(w);
  categoria(w, 'rival');
  const grupos = [...w.document.querySelectorAll('.ce-grupo')].map(h => h.textContent);
  assert.deepEqual(grupos, ['Enfrentan a Terna Dos (1)', 'Enfrentan a Terna Uno (1)', 'Rivales de semanas anteriores (1)']);
  assert.deepEqual(nombres(w), ['Rivales <b>X</b>', 'Rival Uno', 'Rival Viejo'], 'por nombre del clan nuestro; los de antes, al final');
});

test('cada clan cuenta activos e inactivos y la tabla distingue el estado de cada jugador, con los activos primero', async () => {
  const w = montar();
  await cargar(w);
  categoria(w, 'rival');
  const clan = [...w.document.querySelectorAll('.ce-clan')].find(d => d.querySelector('.ce-tag').textContent === '#AAA111');
  assert.match(clan.querySelector('.ce-cuenta').textContent, /1 activo · 1 inactivo · 2 en total/);
  assert.equal(clan.querySelector('table'), null, 'la tabla no se arma hasta abrir el clan');
  abrir(w, clan);
  const estados = [...clan.querySelectorAll('tbody tr')].map(tr => tr.children[2].textContent);
  assert.deepEqual(estados, ['Activo', 'Inactivo']);
  assert.match(clan.textContent, /2024-08 S2/);
});

test('«Solo clanes con miembros activos» oculta los clanes sin activos y el texto busca entre los jugadores', async () => {
  const w = montar();
  await cargar(w);
  categoria(w, 'rival');
  id(w, 'ceSoloActivos').checked = true;
  id(w, 'ceSoloActivos').dispatchEvent(new w.Event('change'));
  assert.deepEqual(nombres(w), ['Rivales <b>X</b>', 'Rival Viejo']);
  id(w, 'ceFiltroTexto').value = 'j5';
  id(w, 'ceFiltroTexto').dispatchEvent(new w.Event('input'));
  assert.deepEqual(nombres(w), ['Rival Viejo']);
});

test('Vetados y Externos muestran su categoría; un vetado sin jugadores lo dice', async () => {
  const w = montar();
  await cargar(w);
  categoria(w, 'vetado');
  assert.deepEqual(nombres(w), ['Vetado Uno']);
  assert.equal(w.document.querySelector('.ce-grupo'), null, 'solo los rivales se agrupan');
  abrir(w, w.document.querySelector('.ce-clan'));
  assert.match(w.document.querySelector('.ce-cuerpo').textContent, /Ningún jugador nuestro/);
  categoria(w, 'externo');
  assert.deepEqual(nombres(w), ['Solo Externo']);
});

test('«Ver más» muestra de a 20, conserva los clanes abiertos y desaparece al terminar', async () => {
  const w = montar(muchos(45));
  await cargar(w);
  categoria(w, 'externo');
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 20);
  assert.match(id(w, 'ceVerMas').textContent, /25 restantes/);
  abrir(w, w.document.querySelectorAll('.ce-clan')[3]);
  id(w, 'ceVerMas').click();
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 40);
  assert.equal(w.document.querySelectorAll('.ce-clan')[3].open, true);
  assert.ok(w.document.querySelectorAll('.ce-clan')[3].querySelector('table'), 'sigue abierto y con su tabla');
  id(w, 'ceVerMas').click();
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 45);
  assert.equal(id(w, 'ceVerMas'), null);
});

test('enlaces: clan dentro de la web, y RoyaleAPI y CWStats con ícono en el clan y en cada jugador', async () => {
  const w = montar();
  await cargar(w);
  categoria(w, 'rival');
  const clan = w.document.querySelector('.ce-clan');
  assert.equal(clan.querySelector('a.ce-clan-link').getAttribute('href'), 'admin.html?clan=%23AAA111#cardBuscarClan');
  assert.deepEqual([...clan.querySelectorAll('summary .ce-ext a')].map(a => a.href), ['https://royaleapi.com/clan/AAA111', 'https://cwstats.com/clan/AAA111']);
  assert.equal(clan.querySelectorAll('summary .ce-ext img').length, 2);
  abrir(w, clan);
  const fila = clan.querySelector('tbody tr');
  assert.equal(fila.querySelector('a.jugador-link').getAttribute('href'), 'perfil.html?tag=%23P1');
  assert.deepEqual([...fila.querySelectorAll('.ce-ext a')].map(a => a.href), ['https://royaleapi.com/player/P1', 'https://cwstats.com/player/P1']);
  const ev = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  clan.querySelector('a.ce-clan-link').dispatchEvent(ev);
  assert.equal(ev.defaultPrevented, true);
  assert.deepEqual(w.__buscados, ['#AAA111']);
});

// NUEVO (18-nov-2026, pedido de la usuaria): columna «Clan actual» en la tabla de jugadores; el activo trae su clan nuestro (con enlace a «Buscar clan») y el inactivo, «—».
test('la tabla trae la columna «Clan actual»: enlace para el activo y «—» para el inactivo', async () => {
  const datos = { ...DATOS, clanes: [{ ...DATOS.clanes[0], jugadores: [{ ...jug(1, true), clanActual: 'Grupo Terna <i>1</i>', clanActualTag: '#T1' }, jug(2, false)] }] };
  const w = montar(datos);
  await cargar(w);
  categoria(w, 'rival');
  const clan = w.document.querySelector('.ce-clan');
  abrir(w, clan);
  const cab = [...clan.querySelectorAll('thead th')].map(th => th.textContent);
  assert.deepEqual(cab, ['Jugador', 'Tag', 'Estado', 'Clan actual', 'Semanas', 'Primera → última', 'Enlaces']);
  const filas = clan.querySelectorAll('tbody tr');
  const celdaActivo = filas[0].querySelectorAll('td')[3];
  assert.equal(celdaActivo.querySelector('a.ce-clan-link').getAttribute('href'), 'admin.html?clan=%23T1#cardBuscarClan');
  assert.equal(celdaActivo.querySelector('i'), null, 'el HTML del nombre del clan no se interpreta');
  assert.equal(filas[1].querySelectorAll('td')[3].textContent.trim(), '—');
});

test('lo que manda el backend se escapa y un error del backend se muestra', async () => {
  const w = montar();
  await cargar(w);
  categoria(w, 'rival');
  assert.equal(w.document.querySelector('.ce-nombre b'), null, 'el HTML del nombre no se interpreta');
  const w2 = montar({ ok: false, error: 'Aún no hay un índice' });
  await cargar(w2);
  assert.match(id(w2, 'ceMsg').textContent, /Aún no hay un índice/);
});

// NUEVO (18-nov-2026, pedido de la usuaria): números con coma como separador de miles (solo visual) y opciones de orden por nombre, Tag, activos, inactivos y totales.
const ORDEN_DATOS = (() => {
  const js = n => Array.from({ length: n }, (_, i) => jug(i, false));
  const c = (tag, nombre, activos, inactivos) => ({ tag, nombre, tipos: [], hoy: false, ternaTag: '', ternaNombre: '', activos, inactivos, jugadores: js(activos + inactivos) });
  // Los Tags no siguen el orden alfabético de los nombres, para distinguir un orden del otro.
  return { ok: true, actualizado: 'x', indiceCompleto: true, total: 4, clanes: [c('#CCC', 'Beta', 2, 1), c('#DDD', 'alfa', 0, 5), c('#AAA', 'Charlie', 2, 4), c('#BBB', 'Delta', 1, 0)] };
})();
const ordenar = (w, criterio, sentido) => {
  const sel = id(w, 'ceOrden');
  sel.value = criterio;
  sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  if(sentido){
    const d = id(w, 'ceOrdenDir');
    d.value = sentido;
    d.dispatchEvent(new w.Event('change', { bubbles: true }));
  }
};

test('los números de la tarjeta llevan coma como separador de miles y los datos no cambian', async () => {
  const w = montar({ ...muchos(1234), clanes: [{ tag: '#BIG111', nombre: 'Grande', tipos: [], hoy: false, ternaTag: '', ternaNombre: '', activos: 1234, inactivos: 5678, jugadores: [jug(1, true)] }, ...muchos(1233).clanes] });
  await cargar(w);
  assert.equal(w.document.querySelector('[data-ce-tipo="externo"] b').textContent, '1,234');
  assert.match(id(w, 'ceMsg').textContent, /1,234 clanes en total/);
  categoria(w, 'externo');
  assert.match(id(w, 'ceMsg').textContent, /Mostrando 20 de 1,234 clanes/);
  assert.match(id(w, 'ceVerMas').textContent, /1,214 restantes/);
  assert.match(w.document.querySelector('.ce-cuenta').textContent, /1,234 activos · 5,678 inactivos · 1 en total/);
  assert.equal(w.__respuesta.clanes[0].activos, 1234, 'el dato sigue siendo un número, sin coma');
  assert.equal(w.eval('_ceNum(999)'), '999');
  assert.equal(w.eval('_ceNum(1000)'), '1,000');
  assert.equal(w.eval('_ceNum(1234567)'), '1,234,567');
});

test('«Ordenar por» ordena por nombre, Tag, activos, inactivos y totales, en los dos sentidos', async () => {
  const w = montar(ORDEN_DATOS);
  await cargar(w);
  categoria(w, 'externo');
  assert.deepEqual(nombres(w), ['Charlie', 'Beta', 'Delta', 'alfa'], 'predeterminado: más activos, luego más totales y luego nombre');
  assert.equal(id(w, 'ceOrdenDir').disabled, true, 'sin criterio no hay sentido que elegir');
  const casos = [
    ['nombre', 'asc', ['alfa', 'Beta', 'Charlie', 'Delta']],
    ['nombre', 'desc', ['Delta', 'Charlie', 'Beta', 'alfa']],
    ['tag', 'asc', ['Charlie', 'Delta', 'Beta', 'alfa']],
    ['tag', 'desc', ['alfa', 'Beta', 'Delta', 'Charlie']],
    ['activos', 'desc', ['Beta', 'Charlie', 'Delta', 'alfa']],
    ['activos', 'asc', ['alfa', 'Delta', 'Beta', 'Charlie']],
    ['inactivos', 'desc', ['alfa', 'Charlie', 'Beta', 'Delta']],
    ['inactivos', 'asc', ['Delta', 'Beta', 'Charlie', 'alfa']],
    ['total', 'desc', ['Charlie', 'alfa', 'Beta', 'Delta']],
    ['total', 'asc', ['Delta', 'Beta', 'alfa', 'Charlie']]
  ];
  for(const [criterio, sentido, esperado] of casos){
    ordenar(w, criterio, sentido);
    assert.deepEqual(nombres(w), esperado, `${criterio} ${sentido}`);
    assert.equal(id(w, 'ceOrdenDir').disabled, false);
  }
  ordenar(w, '');
  assert.deepEqual(nombres(w), ['Charlie', 'Beta', 'Delta', 'alfa'], 'volver a «Predeterminado»');
  assert.equal(id(w, 'ceOrdenDir').disabled, true);
});

test('al cambiar el criterio, el sentido vuelve al natural y «Ver más» vuelve a empezar', async () => {
  const w = montar(muchos(45));
  await cargar(w);
  categoria(w, 'externo');
  id(w, 'ceVerMas').click();
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 40);
  ordenar(w, 'nombre');
  assert.equal(id(w, 'ceOrdenDir').value, 'asc', 'nombre: de A a Z');
  assert.equal(w.document.querySelectorAll('.ce-clan').length, 20, 'al cambiar el orden se vuelve a la primera página');
  ordenar(w, 'activos');
  assert.equal(id(w, 'ceOrdenDir').value, 'desc', 'cantidades: de mayor a menor');
  ordenar(w, 'tag');
  assert.equal(id(w, 'ceOrdenDir').value, 'asc');
});

test('en Rivales el orden elegido se aplica dentro de cada grupo y los grupos se mantienen', async () => {
  const dato = { ok: true, actualizado: 'x', indiceCompleto: true, total: 3, clanes: [
    { tag: '#R1', nombre: 'Zeta', tipos: ['rival'], hoy: true, ternaTag: '#T1', ternaNombre: 'Terna Uno', activos: 1, inactivos: 0, jugadores: [jug(1, true)] },
    { tag: '#R2', nombre: 'Alfa', tipos: ['rival'], hoy: true, ternaTag: '#T1', ternaNombre: 'Terna Uno', activos: 0, inactivos: 2, jugadores: [jug(2, false), jug(3, false)] },
    { tag: '#R3', nombre: 'Beta', tipos: ['rival'], hoy: true, ternaTag: '#T0', ternaNombre: 'Terna Cero', activos: 0, inactivos: 0, jugadores: [] }
  ] };
  const w = montar(dato);
  await cargar(w);
  categoria(w, 'rival');
  ordenar(w, 'nombre', 'asc');
  assert.deepEqual([...w.document.querySelectorAll('.ce-grupo')].map(h => h.textContent), ['Enfrentan a Terna Cero (1)', 'Enfrentan a Terna Uno (2)']);
  assert.deepEqual(nombres(w), ['Beta', 'Alfa', 'Zeta']);
  ordenar(w, 'nombre', 'desc');
  assert.deepEqual(nombres(w), ['Beta', 'Zeta', 'Alfa'], 'dentro de «Terna Uno» se invierte; el grupo no se mueve');
  assert.match(id(w, 'ceMsg').textContent, /El orden se aplica dentro de cada grupo/);
});
