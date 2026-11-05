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
// §PF368 (5-nov-2026): la tarjeta «Detección de infiltrados: revisar un clan» pasó a ser «Buscar clan» (tarjeta aparte, con ficha y las pastillas «Vetar» y «¿Infiltrado?»); sus pruebas están al final, con la tarjeta real del HTML.
// LÍMITE: DOM y backend simulados (la respuesta usa la forma real de _buscarInfiltrado(): { ok, tipo:'jugador', jugador, infoRival, historialTerna }); no prueba el backend real ni el aspecto en un navegador.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const trozo = (ini, fin, nombre) => {
  const i = HTML.indexOf(ini);
  const f = HTML.indexOf(fin, i + 1);
  assert.ok(i >= 0 && f > i, `marcadores de ${nombre} no encontrados (¿se reorganizó admin.html?)`);
  return HTML.slice(i, f);
};

const CODIGO_RENDER = trozo('function _badgeRival(infoRival){', 'let clanActual = null;', '_badgeRival()/_tablaCoincidencias()/renderInfiltrado()');
// §PF368: «Buscar clan» (ficha, «¿Infiltrado?» y «Vetar» del clan) y su tarjeta real del HTML.
const CODIGO_CLAN = trozo('let clanActual = null;', '/* 5-nov-2026 (pedido de la usuaria): «Detección de infiltrados» integrada a la ficha', '«Buscar clan»');
const TARJETA_CLAN = trozo('<div class="card pf-cinta" id="cardBuscarClan"', '<!-- 5-nov-2026 (pedido de la usuaria): el grupo «Directorio»', 'tarjeta «Buscar clan»');
const CODIGO_FICHA = trozo('function reiniciarInfiltradoFicha(j){', "document.getElementById('btnGuardar').addEventListener", 'reiniciarInfiltradoFicha()/verificarInfiltradoFicha()/pastilla');

const ESTRUCTURA = `
  <button type="button" id="btnInfiltradoPastilla" aria-expanded="false">🕵️ ¿Infiltrado?</button>
  <div id="infiltradoPanel" style="display:none">
    <h3 id="infFichaTitulo"></h3><div id="fichaInfMsg"></div><div id="fichaInfResultado"></div>
  </div>
  ${TARJETA_CLAN}`;

function montar({ respuestas = [], falla = false, respuestasPost = [], confirma = true } = {}){
  const dom = new JSDOM(`<!doctype html><html><body>${ESTRUCTURA}</body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' });
  const w = dom.window;
  w.__respuestas = respuestas.slice();
  w.__falla = falla;
  w.__respuestasPost = respuestasPost.slice();
  w.__confirma = confirma;
  w.eval(`
    var miembroActual = null, _infFichaSeq = 0, llamadas = [], llamadasPost = [], pendientes = [], SESSION_KEY = 'sess';
    localStorage.setItem('sess', 'tok123');
    window.confirm = function(){ return window.__confirma !== false; };
    async function conBotonOcupado(btn, fn){ if(!btn || btn.disabled) return; btn.disabled = true; try{ return await fn(); } finally { btn.disabled = false; } }
    function apiPost(accion, cuerpo){ llamadasPost.push({ accion, cuerpo }); const r = window.__respuestasPost.shift(); return Promise.resolve(r); }
    function normalizarTag(t){ const v = String(t||'').trim().toUpperCase().replace(/^#/, ''); return v ? '#' + v : ''; } // igual que assets/js/util.js
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
    ${CODIGO_CLAN}
    ${CODIGO_FICHA}
    window.reiniciarInfiltradoFicha = reiniciarInfiltradoFicha;
    window.verificarInfiltradoFicha = verificarInfiltradoFicha;
    window.renderInfiltrado = renderInfiltrado;
    window.buscarClan = buscarClan;
    window.reiniciarFichaClan = reiniciarFichaClan;
    window.verificarInfiltradosClan = verificarInfiltradosClan;
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
  assert.equal(id(w, 'clanInfResultado').innerHTML, '', 'no toca el resultado de «Buscar clan»');
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

test('renderInfiltrado de un clan en modo ficha: solo veredicto y tabla, sin repetir la cabecera del clan', () => {
  const w = montar();
  const cont = id(w, 'clanInfResultado');
  w.renderInfiltrado({ ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 50 }, infoRival: null,
    coincidencias: [{ tagEnClanRival: '#M1', nombreEnClanRival: 'Infiltrado Uno', rolEnClanRival: 'Miembro', coincidencias: [{ origen: 'Directorio', nombre: 'Nuestro Miembro', tag: '#M1', clan: 'Terna', razon: '' }] }] }, cont, true);
  assert.match(cont.textContent, /1 miembro actual figura en nuestro roster/);
  assert.match(cont.textContent, /Infiltrado Uno/);
  assert.doesNotMatch(cont.textContent, /50 miembros actuales/, 'la cabecera del clan ya está en la ficha');
  w.renderInfiltrado({ ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 50 }, infoRival: null, coincidencias: [] }, cont, true);
  assert.match(cont.textContent, /Sin coincidencias/);
  assert.match(cont.textContent, /no prueba que no haya infiltrados/);
  assert.equal(cont.querySelector('table'), null);
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

test('estructura de admin.html: la pastilla «¿Infiltrado?» va junto a «Vetar» en la cabecera de la ficha, siempre visible; su panel va antes del formulario de vetar; los clanes tienen su tarjeta «Buscar clan»', () => {
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
  assert.ok(g('cardBuscarClan') && g('clanTagInput') && g('btnBuscarClan'), 'los clanes tienen su propia tarjeta «Buscar clan» (§PF368)');
  assert.equal(g('cardInfiltrados'), null, 'la tarjeta «Detección de infiltrados: revisar un clan» ya no existe');
  assert.ok(HTML.includes("webAdminBuscarInfiltrado"), 'usa el mismo endpoint');
});

// ----- §PF367 (5-nov-2026): clanes externos en la pastilla y tarjeta solo para clanes -----
const EXTERNOS = [
  { tag: '#9VR2J8VP', nombre: 'Nova Perú', semanas: 3, primera: { temporada: 25, semana: 4 }, ultima: { temporada: 26, semana: 3 }, infoRival: null },
  { tag: '#RIVAL1', nombre: 'Clan Enemigo', semanas: 1, primera: { temporada: 27, semana: 1 }, ultima: { temporada: 27, semana: 1 }, infoRival: { fuente: 'manual', motivo: 'Sabotaje' } }
];
const abrirYEsperar = async (w) => { abrirFicha(w); clic(w, 'btnInfiltradoPastilla'); await esperar(); return id(w, 'fichaInfResultado'); };

test('la pastilla muestra los clanes externos donde jugó guerra, con semanas, rango y la marca de rival o conflicto', async () => {
  const w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: EXTERNOS, clanesExternosDisponible: true })] });
  const cont = await abrirYEsperar(w);
  const t = cont.textContent;
  assert.match(t, /Clanes externos donde jugó guerra/);
  assert.match(t, /Nova Perú/); assert.match(t, /#9VR2J8VP/);
  assert.match(t, /T25 S4 → T26 S3/);
  assert.match(t, /En lista de conflicto/);
  assert.equal(cont.querySelectorAll('tbody tr').length, 2);
});

test('clan actual limpio pero con un clan externo rival o en conflicto: el veredicto avisa en vez de «Sin señales»', async () => {
  const w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: EXTERNOS, clanesExternosDisponible: true })] });
  const t = (await abrirYEsperar(w)).textContent;
  assert.match(t, /Jugó en un clan rival o en conflicto/);
  assert.match(t, /Clan Enemigo/);
  assert.doesNotMatch(t, /Sin señales/);
});

test('con clanes externos limpios, «Sin señales» lo dice y mantiene la aclaración de que no prueba nada', async () => {
  const w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: [EXTERNOS[0]], clanesExternosDisponible: true })] });
  const t = (await abrirYEsperar(w)).textContent;
  assert.match(t, /Sin señales/);
  assert.match(t, /clanes externos donde jugó guerra/);
  assert.match(t, /no prueba que no sea infiltrado/);
});

test('sin clanes externos o con el JSON ilegible se dice, sin inventar nada', async () => {
  let w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: [], clanesExternosDisponible: true })] });
  assert.match((await abrirYEsperar(w)).textContent, /Sin clanes externos en su historial de guerra/);
  w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: [], clanesExternosDisponible: false })] });
  const t = (await abrirYEsperar(w)).textContent;
  assert.match(t, /No se pudo leer su historial de guerra/);
  assert.doesNotMatch(t, /Sin clanes externos/);
});

test('en la ficha su fila del Directorio (él mismo) no se repite; si además está en Inactivos o Vetados, sí se muestra', async () => {
  let w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: [], clanesExternosDisponible: true })] });
  assert.doesNotMatch((await abrirYEsperar(w)).textContent, /Sin coincidencias con nuestro propio roster|Directorio/);
  const conVetado = Object.assign(respuestaJugador(null), { clanesExternos: [], clanesExternosDisponible: true });
  conVetado.historialTerna = conVetado.historialTerna.concat([{ origen: 'Vetados', nombre: 'Miembro Registrado', tag: '#2GG8PJ8GC', clan: '', razon: 'Sabotaje' }]);
  w = montar({ respuestas: [conVetado] });
  const t = (await abrirYEsperar(w)).textContent;
  assert.match(t, /Vetados/); assert.match(t, /Sabotaje/);
});

// ----- §PF368 (5-nov-2026): temporada de Supercell en las semanas anteriores a la T1 interna -----
test('las semanas anteriores a la T1 interna (temporada <= 0) se muestran con la temporada de Supercell, con una nota; las demás siguen como «T26 S3»', async () => {
  const w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: [
    { tag: '#RYLRJ2UP', nombre: 'NICOL ARMY', semanas: 2, primera: { temporada: 0, semana: 3, temporadaRoyaleApi: 111, supercell: '2024-08' }, ultima: { temporada: 0, semana: 4, temporadaRoyaleApi: 111, supercell: '2024-08' }, infoRival: null },
    { tag: '#9VR2J8VP', nombre: 'Nova Perú', semanas: 1, primera: { temporada: 26, semana: 3, temporadaRoyaleApi: 137, supercell: '2026-10' }, ultima: { temporada: 26, semana: 3, temporadaRoyaleApi: 137, supercell: '2026-10' }, infoRival: null }
  ], clanesExternosDisponible: true })] });
  abrirFicha(w); clic(w, 'btnInfiltradoPastilla'); await esperar();
  const t = id(w, 'fichaInfResultado').textContent;
  assert.match(t, /2024-08 S3 → 2024-08 S4/);
  assert.doesNotMatch(t, /T0 S/);
  assert.match(t, /T26 S3 → T26 S3/, 'una temporada positiva sigue con su número propio');
  assert.doesNotMatch(t, /2026-10/, 'solo se usa Supercell donde la temporada propia es <= 0');
  assert.match(t, /anteriores a la T1 interna se muestran con la temporada de Supercell/);
});

test('si el backend aún no manda el id de Supercell, una temporada <= 0 se muestra como antes y sin la nota', async () => {
  const w = montar({ respuestas: [Object.assign(respuestaJugador(null), { clanesExternos: [
    { tag: '#OLD', nombre: 'Clan Viejo', semanas: 1, primera: { temporada: -7, semana: 2 }, ultima: { temporada: -7, semana: 2 }, infoRival: null }
  ], clanesExternosDisponible: true })] });
  abrirFicha(w); clic(w, 'btnInfiltradoPastilla'); await esperar();
  const t = id(w, 'fichaInfResultado').textContent;
  assert.match(t, /T-7 S2/);
  assert.doesNotMatch(t, /temporada de Supercell/);
});

// ----- §PF368 (5-nov-2026): tarjeta «Buscar clan» con su ficha y las pastillas «Vetar» y «¿Infiltrado?» -----
const CLAN = { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 48, puntos: 61234, trofeosGuerra: 3210, ubicacion: 'Perú', tipo: 'inviteOnly', copasRequeridas: 4000, esNuestro: false };
const respuestaClan = (extra = {}) => Object.assign({ ok: true, clan: Object.assign({}, CLAN, extra.clan || {}), esRivalTemporada: !!extra.infoRival, infoRival: extra.infoRival || null }, {});
const buscarClanEn = async (w, tag, respuesta) => {
  id(w, 'clanTagInput').value = tag;
  w.buscarClan(); await esperar();
};

test('«Buscar clan» consulta webAdminBuscarClan con el Tag normalizado y pinta la ficha del clan', async () => {
  const w = montar({ respuestas: [respuestaClan({ infoRival: { fuente: 'currentriverrace', clanTernaNombre: 'Terna 1' } })] });
  await buscarClanEn(w, 'clan1');
  const ll = ev(w, 'llamadas');
  assert.equal(ll.length, 1);
  assert.equal(ll[0].accion, 'webAdminBuscarClan');
  assert.equal(ll[0].params.tag, '#CLAN1');
  assert.equal(id(w, 'clanSec').style.display, 'block');
  assert.equal(id(w, 'cNombre').textContent, 'Clan Rival');
  assert.match(id(w, 'cSub').textContent, /#CLAN1 · Perú · Solo invitación/);
  assert.equal(id(w, 'cMiembros').textContent, '48');
  assert.match(id(w, 'cPuntos').textContent, /61.?234/);
  assert.match(id(w, 'cTrofeos').textContent, /3.?210/);
  assert.match(id(w, 'cBadge').textContent, /Rival de esta temporada/);
  assert.equal(id(w, 'cVerClan').href, 'https://royaleapi.com/clan/CLAN1');
  assert.equal(id(w, 'clanInfTitulo').textContent, '¿Tiene infiltrados? Clan Rival (#CLAN1)');
  assert.equal(id(w, 'btnClanVetarPastilla').disabled, false);
  assert.equal(id(w, 'btnClanVetarPastilla').textContent, '🚫 Vetar');
});

test('un clan sin señales lo dice sin afirmar de más; uno de la Familia no se puede vetar; uno ya en conflicto manual tampoco', async () => {
  let w = montar({ respuestas: [respuestaClan()] });
  await buscarClanEn(w, '#CLAN1');
  assert.match(id(w, 'cBadge').textContent, /No figura como rival ni en conflicto/);
  assert.match(id(w, 'cBadge').textContent, /Solo compara con los rivales de esta temporada/);
  w = montar({ respuestas: [respuestaClan({ clan: { esNuestro: true } })] });
  await buscarClanEn(w, '#CLAN1');
  assert.match(id(w, 'cBadge').textContent, /Clan de la Familia/);
  assert.equal(id(w, 'btnClanVetarPastilla').disabled, true);
  assert.match(id(w, 'btnClanVetarPastilla').textContent, /Clan de la Familia/);
  w = montar({ respuestas: [respuestaClan({ infoRival: { fuente: 'manual', motivo: 'Sabotaje' } })] });
  await buscarClanEn(w, '#CLAN1');
  assert.match(id(w, 'cBadge').textContent, /En lista de conflicto/);
  assert.equal(id(w, 'btnClanVetarPastilla').disabled, true);
  assert.match(id(w, 'btnClanVetarPastilla').textContent, /En conflicto/);
});

test('el clan vetado (NARANJA x) sale como «Clan vetado», no como de la Familia, y su «Vetar» queda bloqueado (5-nov-2026)', async () => {
  const w = montar({ respuestas: [respuestaClan({ infoRival: { fuente: 'vetado', nombre: 'NARANJA x', motivo: 'Clan vetado' } })] });
  await buscarClanEn(w, '#CLAN1');
  assert.match(id(w, 'cBadge').textContent, /Clan vetado/);
  assert.doesNotMatch(id(w, 'cBadge').textContent, /Clan de la Familia/);
  assert.equal(id(w, 'btnClanVetarPastilla').disabled, true);
  assert.match(id(w, 'btnClanVetarPastilla').textContent, /Clan vetado/);
});

test('el botón «Ver clan en RoyaleAPI» lleva el ícono de RoyaleAPI (ICONO_ROYALEAPI) y sigue apuntando al clan; sin ese archivo cargado queda solo el texto (5-nov-2026)', async () => {
  let w = montar({ respuestas: [respuestaClan()] });
  await buscarClanEn(w, '#CLAN1');
  assert.equal(id(w, 'cVerClan').querySelector('img'), null);
  assert.equal(id(w, 'cVerClan').textContent.trim(), 'Ver clan en RoyaleAPI');
  w = montar({ respuestas: [respuestaClan()] });
  ev(w, `var ICONO_ROYALEAPI = '<img src="https://cdn.royaleapi.com/x.png" alt="" width="14" height="14">';`);
  await buscarClanEn(w, '#CLAN1');
  assert.ok(id(w, 'cVerClan').querySelector('img'), 'el botón trae el ícono');
  assert.equal(id(w, 'cVerClan').textContent.trim(), 'Ver clan en RoyaleAPI');
  assert.equal(id(w, 'cVerClan').href, 'https://royaleapi.com/clan/CLAN1');
});

test('clan vetado: «¿Infiltrado?» lista a los jugadores nuestros que pasaron por él y ya salieron (Inactivos/Vetados), aunque no haya coincidencias con sus miembros actuales (5-nov-2026)', async () => {
  const w = montar({ respuestas: [respuestaClan({ infoRival: { fuente: 'vetado', motivo: 'Clan vetado' } }), { ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'NARANJA x', miembros: 12 }, infoRival: null, coincidencias: [],
    esClanVetado: true, exMiembros: [
      { origen: 'Inactivos', tag: '#C3', nombre: 'Ex Vetado Uno', clan: 'Terna 2', razon: 'NARANJA x' },
      { origen: 'Vetados', tag: '#E5', nombre: 'Ex Vetado Dos', clan: 'Terna 3', razon: 'NARANJA x' }] }] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  const t = id(w, 'clanInfResultado').textContent;
  assert.match(t, /Sin coincidencias/);
  assert.match(t, /Jugadores nuestros que pasaron por este clan/);
  assert.match(t, /Ex Vetado Uno/);
  assert.match(t, /Ex Vetado Dos/);
  assert.match(t, /Inactivos/);
  assert.match(t, /Vetados/);
});

test('clan vetado sin ex miembros en el roster lo dice; un clan que no es el vetado no muestra esa sección (5-nov-2026)', async () => {
  let w = montar({ respuestas: [respuestaClan(), { ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'NARANJA x', miembros: 12 }, infoRival: null, coincidencias: [], esClanVetado: true, exMiembros: [] }] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  assert.match(id(w, 'clanInfResultado').textContent, /Ninguno figura en Directorio, Inactivos ni Vetados/);
  w = montar({ respuestas: [respuestaClan(), { ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 48 }, infoRival: null, coincidencias: [] }] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  assert.doesNotMatch(id(w, 'clanInfResultado').textContent, /pasaron por este clan/);
});

const respuestaClanIndice = extra => ({ ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 48 }, infoRival: null, coincidencias: [], ...extra });

test('cualquier clan con índice de clanes externos: «¿Infiltrado?» lista a los jugadores nuestros que pasaron por él, también los «Fuera del roster» sin nombre (5-nov-2026, §PF369)', async () => {
  const w = montar({ respuestas: [respuestaClan(), respuestaClanIndice({ indiceClanesDisponible: true, exMiembros: [
    { origen: 'Inactivos', tag: '#C3', nombre: 'Ex Inactivo', clan: 'Terna 2', razon: 'Salió', semanas: 5 },
    { origen: 'Fuera del roster', tag: '#Z9', nombre: '', clan: '', razon: '', semanas: 2 }] })] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  const t = id(w, 'clanInfResultado').textContent;
  assert.match(t, /Jugadores nuestros que pasaron por este clan/);
  assert.match(t, /Ex Inactivo/);
  assert.match(t, /Fuera del roster/);
  assert.match(t, /#Z9/);
  assert.doesNotMatch(t, /Aún no hay un índice/);
});

test('clan sin índice completo (indiceClanesDisponible false): lo dice y no inventa ex miembros (5-nov-2026, §PF369)', async () => {
  const w = montar({ respuestas: [respuestaClan(), respuestaClanIndice({ indiceClanesDisponible: false, exMiembros: [] })] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  const t = id(w, 'clanInfResultado').textContent;
  assert.match(t, /Jugadores nuestros que pasaron por este clan/);
  assert.match(t, /Aún no hay un índice completo de clanes externos/);
});

test('clan con índice pero sin coincidencias: dice que ningún jugador nuestro figura en su historial (5-nov-2026, §PF369)', async () => {
  const w = montar({ respuestas: [respuestaClan(), respuestaClanIndice({ indiceClanesDisponible: true, exMiembros: [] })] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  const t = id(w, 'clanInfResultado').textContent;
  assert.match(t, /Ningún jugador nuestro figura en el historial de guerra de este clan/);
  assert.doesNotMatch(t, /Aún no hay un índice/);
});

test('«Buscar clan»: Tag vacío no consulta; un error del backend se muestra y no abre la ficha; si falla la red se avisa', async () => {
  let w = montar();
  await buscarClanEn(w, '  ');
  assert.equal(ev(w, 'llamadas').length, 0);
  assert.match(id(w, 'clanBuscarMsg').textContent, /Escribe el Tag de un clan/);
  w = montar({ respuestas: [{ ok: false, error: 'No encontré ningún clan con ese Tag.' }] });
  await buscarClanEn(w, '#NOEXISTE');
  assert.match(id(w, 'clanBuscarMsg').textContent, /No encontré ningún clan/);
  assert.notEqual(id(w, 'clanSec').style.display, 'block');
  w = montar({ falla: true });
  await buscarClanEn(w, '#CLAN1');
  assert.match(id(w, 'clanBuscarMsg').textContent, /Error de conexión: sin red/);
});

test('una búsqueda nueva oculta la ficha anterior, y una respuesta tardía de una búsqueda vieja no se pinta', async () => {
  const w = montar({ respuestas: [() => respuestaClan({ clan: { nombre: 'Clan Viejo' } }), respuestaClan({ clan: { nombre: 'Clan Nuevo', tag: '#CLAN2' } })] });
  id(w, 'clanTagInput').value = '#CLAN1'; w.buscarClan(); await esperar();   // queda en vuelo
  id(w, 'clanTagInput').value = '#CLAN2'; w.buscarClan(); await esperar();   // la segunda llega primero
  assert.equal(id(w, 'cNombre').textContent, 'Clan Nuevo');
  ev(w, 'pendientes.forEach(f => f())'); await esperar();                    // llega la vieja
  assert.equal(id(w, 'cNombre').textContent, 'Clan Nuevo', 'la respuesta vieja se descarta');
});

test('la pastilla «¿Infiltrado?» del clan pide webAdminBuscarInfiltrado con soloClan y el Tag de la ficha, y pinta el resultado una sola vez', async () => {
  const w = montar({ respuestas: [respuestaClan(), { ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 48 }, infoRival: null,
    coincidencias: [{ tagEnClanRival: '#M1', nombreEnClanRival: 'Infiltrado Uno', rolEnClanRival: 'Miembro', coincidencias: [{ origen: 'Directorio', nombre: 'Nuestro Miembro', tag: '#M1', clan: 'Terna', razon: '' }] }] }] });
  await buscarClanEn(w, '#CLAN1');
  assert.equal(id(w, 'clanInfiltradoPanel').style.display, 'none');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  const ll = ev(w, 'llamadas');
  assert.equal(ll.length, 2);
  assert.equal(ll[1].accion, 'webAdminBuscarInfiltrado');
  assert.deepEqual(JSON.parse(JSON.stringify(ll[1].params)), { tag: '#CLAN1', soloClan: '1' });
  assert.equal(id(w, 'clanInfiltradoPanel').style.display, 'block');
  assert.equal(id(w, 'btnClanInfiltradoPastilla').getAttribute('aria-expanded'), 'true');
  assert.match(id(w, 'clanInfResultado').textContent, /Infiltrado Uno/);
  clic(w, 'btnClanInfiltradoPastilla'); clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  assert.equal(ev(w, 'llamadas').length, 2, 'cerrar y volver a abrir no consulta otra vez');
});

test('«¿Infiltrado?» del clan: un error se muestra y al volver a abrir se reintenta; sin ficha no consulta', async () => {
  const w = montar({ respuestas: [respuestaClan(), { ok: false, error: 'Falló la API' }, { ok: true, tipo: 'clan', clan: { tag: '#CLAN1', nombre: 'Clan Rival', miembros: 48 }, infoRival: null, coincidencias: [] }] });
  await w.verificarInfiltradosClan();
  assert.match(id(w, 'clanInfMsg').textContent, /Primero busca un clan/);
  assert.equal(ev(w, 'llamadas').length, 0);
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  assert.match(id(w, 'clanInfMsg').textContent, /Falló la API/);
  clic(w, 'btnClanInfiltradoPastilla'); clic(w, 'btnClanInfiltradoPastilla'); await esperar();
  assert.match(id(w, 'clanInfResultado').textContent, /Sin coincidencias/);
});

test('«Vetar» del clan: sin motivo no manda nada; si se cancela la confirmación tampoco; con motivo manda webAdminVetarClan y deja el clan en conflicto', async () => {
  const w = montar({ respuestas: [respuestaClan()], respuestasPost: [{ ok: true, nombre: 'Clan Rival' }] });
  await buscarClanEn(w, '#CLAN1');
  clic(w, 'btnClanVetarPastilla');
  assert.equal(id(w, 'clanVetarPanel').style.display, 'block');
  assert.equal(id(w, 'clanVTitulo').textContent, 'Vetar el clan Clan Rival (#CLAN1)');
  clic(w, 'btnClanVetar'); await esperar();
  assert.match(id(w, 'clanVMsg').textContent, /Escribe el motivo del veto/);
  assert.equal(ev(w, 'llamadasPost').length, 0);
  id(w, 'clanVMotivo').value = '  Sabotaje en guerra  ';
  w.__confirma = false;
  clic(w, 'btnClanVetar'); await esperar();
  assert.equal(ev(w, 'llamadasPost').length, 0, 'cancelar la confirmación no manda nada');
  w.__confirma = true;
  clic(w, 'btnClanVetar'); await esperar(); await esperar();
  const post = ev(w, 'llamadasPost');
  assert.equal(post.length, 1);
  assert.equal(post[0].accion, 'webAdminVetarClan');
  assert.deepEqual(JSON.parse(JSON.stringify(post[0].cuerpo)), { sessionToken: 'tok123', datos: { tag: '#CLAN1', motivo: 'Sabotaje en guerra' } });
  assert.match(id(w, 'clanVMsg').textContent, /Clan vetado/);
  assert.match(id(w, 'cBadge').textContent, /En lista de conflicto/);
  assert.equal(id(w, 'btnClanVetarPastilla').disabled, true);
  assert.equal(id(w, 'btnClanVetarPastilla').textContent, '🚫 Vetado');
  assert.equal(id(w, 'btnClanVetar').style.display, 'none', 'no se puede vetar dos veces');
  assert.equal(id(w, 'clanVMotivo').value, '');
});

test('«Vetar» del clan: un error del backend se muestra y el clan no cambia de estado', async () => {
  const w = montar({ respuestas: [respuestaClan()], respuestasPost: [{ ok: false, error: 'Ese clan ya está en la lista de conflicto.' }] });
  await buscarClanEn(w, '#CLAN1');
  id(w, 'clanVMotivo').value = 'Motivo';
  clic(w, 'btnClanVetar'); await esperar(); await esperar();
  assert.match(id(w, 'clanVMsg').textContent, /ya está en la lista de conflicto/);
  assert.equal(id(w, 'btnClanVetarPastilla').disabled, false);
  assert.match(id(w, 'cBadge').textContent, /No figura como rival/);
});

test('estructura de admin.html: «Buscar clan» es una tarjeta aparte, del mismo estilo y nivel que «Buscar miembro», con «Vetar» y «¿Infiltrado?» en la cabecera de su ficha', () => {
  const doc = new JSDOM(HTML).window.document;
  const g = (x) => doc.getElementById(x);
  const tarjetaClan = g('cardBuscarClan');
  const tarjetaMiembro = g('tagInput').closest('.card');
  assert.ok(tarjetaClan.matches('.card.pf-cinta'), 'mismo estilo de tarjeta con cinta');
  assert.equal(tarjetaClan.querySelector('.eyebrow').textContent, 'Buscar clan');
  assert.equal(tarjetaClan.parentElement, tarjetaMiembro.parentElement, 'mismo nivel que «Buscar miembro»');
  assert.ok(tarjetaMiembro.compareDocumentPosition(tarjetaClan) & 4, 'va después de «Buscar miembro»');
  assert.ok(!tarjetaMiembro.contains(tarjetaClan), 'ya no es una subsección dentro de «Buscar miembro»');
  assert.equal(g('btnBuscarClan').textContent.trim(), 'Buscar clan');
  const cab = g('cNombre').closest('.perfil-cabecera');
  assert.ok(cab.contains(g('clanAcciones')) && g('clanAcciones').contains(g('btnClanVetarPastilla')) && g('clanAcciones').contains(g('btnClanInfiltradoPastilla')), 'las dos pastillas van en la cabecera de la ficha');
  assert.ok(g('btnClanVetarPastilla').compareDocumentPosition(g('btnClanInfiltradoPastilla')) & 4, '«¿Infiltrado?» va después de «Vetar»');
  assert.ok(!g('clanVetarPastillaBox').contains(g('btnClanInfiltradoPastilla')), '«¿Infiltrado?» no depende de la función «Vetar»');
  for (const x of ['clanSec', 'clanInfiltradoPanel', 'clanVetarPanel']) assert.equal(g(x).style.display, 'none', `#${x} empieza oculto`);
  assert.equal(g('clanVetarBox').style.display, 'none', 'el formulario de vetar empieza oculto hasta saber que tiene la función «Vetar»');
  assert.ok(g('clanInfiltradoPanel').compareDocumentPosition(g('clanVetarBox')) & 4, 'el panel va antes del formulario de vetar');
  assert.equal(g('cardInfiltrados'), null);
  assert.ok(HTML.includes("'webAdminBuscarClan'") && HTML.includes("'webAdminVetarClan'"), 'usa los endpoints nuevos');
});
