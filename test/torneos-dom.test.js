'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// Fase 5b, tanda D (AVISO A9): torneos.html pinta el nombre de cada
// participante como link a perfil.html SOLO cuando el backend manda `tag`
// (activo, o cualquiera si hay sesión de admin). Sin `tag` (ex-miembro sin
// sesión de admin) el nombre sale como texto plano. Esta prueba carga el
// <script> inline REAL de torneos.html en jsdom, con un apiGet falso que
// imita el criterio del backend (tag real o null según activo/admin), y
// revisa los 5 lugares donde se pinta un nombre.
//
// LÍMITE: prueba el FRONTEND. No prueba el backend real (34_Web_API.gs) ni
// un navegador real (layout escritorio/móvil): eso sigue pendiente.
//
// CAMBIO (09-oct-2026, Fase 4): torneos.html ahora usa apiGetEstaticoConEdad() y
// apiGetConRespaldoEstatico() (api.js) y fmtTresTiempos*() (util.js), así que el
// cargador trae config.js, util.js y api.js REALES (solo se simulan apiGet(),
// apiGetEstatico(), el localStorage de jsdom y, en algunos casos, la hora de
// guardado del respaldo). Las pruebas nuevas están al final del archivo.

const html = fs.readFileSync(path.join(__dirname, '..', 'torneos.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'se esperaba exactamente un <script> inline en torneos.html');
const SCRIPT_INLINE = scripts[0][1];

const BODY = `
  <div id="torneosActualizadoTxt"></div>
  <div id="ganadoresWrap"></div>
  <div id="ganadoresResultadosWrap"></div>
  <div id="torneosWrap"></div>
  <div id="salonWrap"></div>
  <div id="rankingVictoriasWrap"></div>`;

// Datos "como los manda el backend" — la función tagPara() decide el `tag`.
const ACTIVO = { nombre: 'Activo Uno', tag: '#AAA111', clan: 'Terna 1' };
const EXMIEMBRO = { nombre: 'Ex Miembro', tag: '#BBB222', clan: 'Terna 1' };
const OTRO = { nombre: 'Otro Activo', tag: '#CCC333', clan: 'Terna 2' };
const ACTIVOS = new Set(['#AAA111', '#CCC333']);

function particip(base, puesto, victorias, esAdmin){
  const visible = ACTIVOS.has(base.tag) || esAdmin;
  return { puesto, nombre: base.nombre, clan: base.clan, victorias, tag: visible ? base.tag : null };
}

function armarRespuestas(esAdmin){
  const p = (b, pu, v) => particip(b, pu, v, esAdmin);
  const reciente = {
    idTorneo: 10, fecha: '2026-09-20', clan: 'Terna 1',
    top3: [p(ACTIVO, 1, 5), p(EXMIEMBRO, 2, 3)],
    participantes: [p(ACTIVO, 1, 5), p(EXMIEMBRO, 2, 3), p(OTRO, 3, 1)]
  };
  const anterior = {
    idTorneo: 9, fecha: '2026-09-13', clan: 'Terna 2',
    top3: [p(EXMIEMBRO, 1, 4), p(OTRO, 2, 2)],
    participantes: [p(EXMIEMBRO, 1, 4), p(OTRO, 2, 2), p(ACTIVO, 3, 1)]
  };
  return {
    webTorneos: {
      ganadores: reciente,
      torneos: [
        { idTorneo: 10, fecha: '2026-09-20', clan: 'Terna 1' },
        { idTorneo: 9, fecha: '2026-09-13', clan: 'Terna 2' }
      ]
    },
    webHistorialTorneos: { historial: [reciente, anterior] }
  };
}

// `estatico`: qué hace apiGetEstatico() (el torneos.json de la rama `data`).
//   undefined -> falla (como si GitHub no respondiera): la página cae a apiGet(), ruta de los tests de abajo.
//   función   -> se usa tal cual (para probar la ruta estática de visitante).
async function cargarPagina({ esAdmin, estatico, sinApiEstatico, apiGetImpl, ultimaReal, respaldos } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], BODY);
  const llamadas = [];
  if (esAdmin) window.localStorage.setItem('terna_admin_token', 'token-de-prueba');
  // `respaldos`: { accion: { t, d } } -> se siembra el respaldo local (lo que guarda apiGet() al responder bien).
  for (const [accion, r] of Object.entries(respaldos || {})){
    window.localStorage.setItem('terna_backup_' + window._claveCacheApiGet(accion, null), JSON.stringify(r));
  }
  window.apiGet = async (accion, params, opts) => {
    llamadas.push({ accion, opts });
    if (apiGetImpl) return apiGetImpl(accion);
    const conAdmin = !!(opts && opts.conSesion && window.localStorage.getItem('terna_admin_token'));
    return armarRespuestas(conAdmin)[accion];
  };
  window.estaticoLlamadas = [];
  if (!sinApiEstatico) window.apiGetEstatico = async (url) => {
    window.estaticoLlamadas.push(url);
    if (!estatico) throw new Error('sin torneos.json (simulado)');
    return estatico(url);
  };
  else window.apiGetEstatico = undefined; // simula que la función no existe
  if (!ultimaReal) window.apiGetUltimaActualizacion = () => null;
  window.eval(SCRIPT_INLINE);
  await new Promise(r => setTimeout(r, 30)); // deja terminar cargarTorneos()/cargarSalonDeLaFama()
  return { window, doc: window.document, llamadas, estaticoLlamadas: window.estaticoLlamadas, txt: window.document.getElementById('torneosActualizadoTxt') };
}

const linksDe = (el) => [...el.querySelectorAll('a.participante-link')].map(a => a.textContent);
const textoPlanoDe = (el, nombre) => el.textContent.includes(nombre) && !linksDe(el).includes(nombre);

for (const escenario of [{ esAdmin: false, etiqueta: 'sin sesión de admin' }, { esAdmin: true, etiqueta: 'con sesión de admin' }]){
  test(`torneos.html — ${escenario.etiqueta}`, async (t) => {
    const { doc, llamadas } = await cargarPagina(escenario);
    const admin = escenario.esAdmin;

    await t.test('las peticiones piden conSesion:true', () => {
      assert.ok(llamadas.length >= 2);
      assert.ok(llamadas.every(l => l.opts && l.opts.conSesion === true));
    });

    const lugares = [
      ['podio reciente', () => doc.getElementById('ganadoresWrap')],
      ['ver todos los resultados', () => doc.getElementById('ganadoresResultadosWrap')],
      ['torneos recientes', () => doc.getElementById('torneosWrap')],
      ['salón de la fama', () => doc.getElementById('salonWrap')],
      ['ranking de victorias', () => doc.getElementById('rankingVictoriasWrap')]
    ];
    for (const [nombreLugar, get] of lugares){
      await t.test(nombreLugar, () => {
        const el = get();
        assert.ok(el.textContent.includes(ACTIVO.nombre) || el.textContent.includes(OTRO.nombre) || el.textContent.includes(EXMIEMBRO.nombre), 'el lugar debe pintar nombres');
        // el ex-miembro SIGUE apareciendo en la lista, si el lugar lo incluye
        if (el.textContent.includes(EXMIEMBRO.nombre)){
          if (admin){
            assert.ok(linksDe(el).includes(EXMIEMBRO.nombre), 'admin: el ex-miembro debe tener link');
          } else {
            assert.ok(textoPlanoDe(el, EXMIEMBRO.nombre), 'visitante: el ex-miembro debe salir sin link');
          }
        }
        // un activo con link SIEMPRE que aparezca
        if (el.textContent.includes(ACTIVO.nombre)){
          assert.ok(linksDe(el).includes(ACTIVO.nombre), 'el activo debe tener link');
        }
      });
    }

    await t.test('el href del link usa el Tag real, codificado', () => {
      const a = [...doc.querySelectorAll('a.participante-link')].find(x => x.textContent === ACTIVO.nombre);
      assert.equal(a.getAttribute('href'), 'perfil.html?tag=' + encodeURIComponent('#AAA111'));
      assert.equal(a.getAttribute('target'), '_blank');
      assert.equal(a.getAttribute('rel'), 'noopener');
    });

    await t.test('ningún link apunta a un Tag null/undefined', () => {
      const malos = [...doc.querySelectorAll('a.participante-link')].filter(a => /tag=(null|undefined)?$/.test(a.getAttribute('href')));
      assert.equal(malos.length, 0);
    });
  });
}

test('calcularRankingVictoriasTorneos() arrastra el primer tag no nulo, agrupando por nombre+clan', async () => {
  const { window } = await cargarPagina({ esAdmin: false });
  const ranking = window.calcularRankingVictoriasTorneos([
    { participantes: [{ nombre: 'X', clan: 'C', victorias: 2, tag: null }] },
    { participantes: [{ nombre: 'X', clan: 'C', victorias: 1, tag: '#XXX' }] },
    { participantes: [{ nombre: 'X', clan: 'D', victorias: 9, tag: null }] }
  ]);
  const xc = ranking.find(r => r.nombre === 'X' && r.clan === 'C');
  assert.equal(xc.victorias, 3);
  assert.equal(xc.tag, '#XXX');
  const xd = ranking.find(r => r.clan === 'D');
  assert.equal(xd.tag, null);
});

test('enlaceParticipante() escapa el nombre y no arma link sin tag', async () => {
  const { window } = await cargarPagina({ esAdmin: false });
  assert.equal(window.enlaceParticipante('<b>x</b>', null), '&lt;b&gt;x&lt;/b&gt;');
  assert.match(window.enlaceParticipante('<b>x</b>', '#T'), /&lt;b&gt;x&lt;\/b&gt;<\/a>$/);
});

// NUEVO (08-oct-2026): sin sesión de admin, torneos.html lee primero torneos.json
// (rama `data`) y solo cae a apiGet() si falta, está vencido (>3 h) o trae error.
function estaticoCon(esAdminDatos, publicadoEn){
  const r = armarRespuestas(esAdminDatos);
  return () => ({ _publicadoEn: publicadoEn, torneos: r.webTorneos, historial: r.webHistorialTorneos });
}

test('torneos.html — visitante con torneos.json vigente: pinta desde el archivo y NO llama a apiGet()', async () => {
  const { doc, llamadas, estaticoLlamadas } = await cargarPagina({
    esAdmin: false,
    estatico: estaticoCon(false, new Date().toISOString())
  });
  assert.equal(llamadas.length, 0, 'no debe pedir apiGet() si el JSON estático sirve');
  assert.equal(estaticoLlamadas.length, 1, 'una sola petición compartida para las dos acciones');
  assert.match(estaticoLlamadas[0], /^https:\/\/raw\.githubusercontent\.com\/GrupoTerna\/Web\/data\/torneos\.json\?t=\d+$/);
  assert.ok(doc.getElementById('ganadoresWrap').textContent.includes(ACTIVO.nombre));
  assert.ok(linksDe(doc.getElementById('ganadoresWrap')).includes(ACTIVO.nombre));
  const ex = doc.getElementById('torneosWrap');
  assert.ok(!linksDe(ex).includes(EXMIEMBRO.nombre), 'visitante: el ex-miembro sin link');
});

test('torneos.html — visitante con torneos.json vencido (>3 h): cae a apiGet() con conSesion:true', async () => {
  const viejo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { doc, llamadas } = await cargarPagina({ esAdmin: false, estatico: estaticoCon(false, viejo) });
  assert.ok(llamadas.length >= 2);
  assert.ok(llamadas.every(l => l.opts && l.opts.conSesion === true));
  assert.ok(doc.getElementById('ganadoresWrap').textContent.includes(ACTIVO.nombre));
});

test('torneos.html — admin con sesión: ni siquiera pide torneos.json', async () => {
  const { llamadas, estaticoLlamadas } = await cargarPagina({
    esAdmin: true,
    estatico: estaticoCon(false, new Date().toISOString())
  });
  assert.equal(estaticoLlamadas.length, 0);
  assert.ok(llamadas.length >= 2);
});

test('torneos.html — si apiGetEstatico no existe, la página igual carga por apiGet()', async () => {
  const { window, doc, llamadas } = await cargarPagina({ esAdmin: false, sinApiEstatico: true });
  assert.equal(typeof window.apiGetEstatico, 'undefined');
  assert.ok(llamadas.length >= 2);
  assert.ok(llamadas.every(l => l.opts && l.opts.conSesion === true));
  assert.ok(doc.getElementById('ganadoresWrap').textContent.includes(ACTIVO.nombre));
});

// ---------------------------------------------------------------- Fase 4: último recurso + tres momentos (09-oct-2026)

const HORA = 60 * 60 * 1000;
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const appsScriptCaido = () => { throw new Error('No pudimos conectar con el servidor.'); };

test('REGRESIÓN torneos.html — torneos.json vencido (5 h) + Apps Script caído: pinta el archivo viejo y avisa', async () => {
  const { doc, txt, llamadas } = await cargarPagina({ esAdmin: false, estatico: estaticoCon(false, hace(5 * HORA)), apiGetImpl: appsScriptCaido });
  assert.ok(llamadas.length >= 2, 'primero intenta Apps Script');
  assert.ok(doc.getElementById('ganadoresWrap').textContent.includes(ACTIVO.nombre));
  assert.ok(!linksDe(doc.getElementById('torneosWrap')).includes(EXMIEMBRO.nombre), 'es la versión de visitante: ex-miembro sin link');
  assert.match(txt.textContent, /JSON publicado: hace 5 h/);
  assert.match(txt.textContent, /Datos guardados: el servidor no responde/);
});

test('torneos.html — archivo vencido + Apps Script caído: los dos intentos a Apps Script llevan conSesion:true y staleIfError:false (lo decide el ayudante)', async () => {
  const { llamadas } = await cargarPagina({ esAdmin: false, estatico: estaticoCon(false, hace(5 * HORA)), apiGetImpl: appsScriptCaido });
  assert.ok(llamadas.every(l => l.opts.conSesion === true && l.opts.staleIfError === false && l.opts.ttlMs === 300000));
});

test('torneos.html — sin archivo utilizable: apiGet() conserva staleIfError:true (respaldo local como siempre)', async () => {
  const { llamadas } = await cargarPagina({ esAdmin: false });
  assert.ok(llamadas.length >= 2);
  assert.ok(llamadas.every(l => l.opts.staleIfError === true && l.opts.conSesion === true));
});

test('torneos.html — archivo vencido sin la clave pedida o con error + Apps Script caído: no hay nada que mostrar, sale el mensaje de error', async () => {
  for (const est of [
    () => ({ _publicadoEn: hace(5 * HORA) }),
    () => ({ _publicadoEn: hace(5 * HORA), torneos: { error: 'x' }, historial: { error: 'x' } })
  ]){
    const { doc } = await cargarPagina({ esAdmin: false, estatico: est, apiGetImpl: appsScriptCaido });
    assert.ok(doc.getElementById('ganadoresWrap').textContent.includes('No se pudo cargar la info de torneos'));
  }
});

test('torneos.html — admin con sesión + archivo vencido + Apps Script caído: el archivo NO se usa (tiene los Tags de visitante)', async () => {
  const { doc, estaticoLlamadas } = await cargarPagina({ esAdmin: true, estatico: estaticoCon(false, hace(5 * HORA)), apiGetImpl: appsScriptCaido });
  assert.equal(estaticoLlamadas.length, 0);
  assert.ok(doc.getElementById('ganadoresWrap').textContent.includes('No se pudo cargar la info de torneos'));
});

test('torneos.html — respaldo local más nuevo que el archivo vencido: gana el respaldo local', async () => {
  const r = armarRespuestas(false);
  const MAS_NUEVO = { ...r.webTorneos, ganadores: { ...r.webTorneos.ganadores, top3: [{ puesto: 1, nombre: 'Solo En Respaldo', clan: 'Terna 1', victorias: 7, tag: '#ZZZ999' }] } };
  const t = Date.now() - 10 * 60 * 1000;
  const { doc, txt } = await cargarPagina({
    esAdmin: false, estatico: estaticoCon(false, hace(5 * HORA)), apiGetImpl: appsScriptCaido,
    respaldos: { webTorneos: { t, d: MAS_NUEVO }, webHistorialTorneos: { t, d: r.webHistorialTorneos } }
  });
  assert.ok(doc.getElementById('ganadoresWrap').textContent.includes('Solo En Respaldo'));
  assert.match(txt.textContent, /Respaldo guardado: hace 10 min/);
  assert.match(txt.textContent, /Datos guardados: el servidor no responde/);
  assert.ok(!txt.textContent.includes('JSON publicado'));
});

test('torneos.html — respaldo local más viejo que el archivo vencido: gana el archivo', async () => {
  const r = armarRespuestas(false);
  const VIEJO = { ...r.webTorneos, ganadores: { ...r.webTorneos.ganadores, top3: [{ puesto: 1, nombre: 'Solo En Respaldo', clan: 'Terna 1', victorias: 7, tag: '#ZZZ999' }] } };
  const t = Date.now() - 9 * HORA;
  const { doc, txt } = await cargarPagina({
    esAdmin: false, estatico: estaticoCon(false, hace(5 * HORA)), apiGetImpl: appsScriptCaido,
    respaldos: { webTorneos: { t, d: VIEJO }, webHistorialTorneos: { t, d: r.webHistorialTorneos } }
  });
  const g = doc.getElementById('ganadoresWrap').textContent;
  assert.ok(g.includes(ACTIVO.nombre) && !g.includes('Solo En Respaldo'));
  assert.match(txt.textContent, /JSON publicado: hace 5 h/);
});

test('torneos.html — archivo vigente: muestra consulta + JSON publicado + API Supercell si el dato la trae', async () => {
  const ts = Date.now() - 55 * 60 * 1000;
  const { txt } = await cargarPagina({ esAdmin: false, estatico: () => ({ ...estaticoCon(false, hace(40 * 60 * 1000))(), tiempos: { api: { ultimaConsultaTs: ts } } }) });
  assert.match(txt.textContent, /^Consulta: hace \d+ s · JSON publicado: hace 40 min · API Supercell: hace 55 min$/);
  assert.match(txt.title, /Esta página consultó: .* \| Archivo JSON publicado: .* \| Última consulta del bot a la API de Supercell: /);
});

test('torneos.html — la fecha de Supercell también se lee de la sección (torneos) y no se inventa si falta', async () => {
  const ts = Date.now() - 20 * 60 * 1000;
  const conSeccion = await cargarPagina({ esAdmin: false, estatico: () => { const e = estaticoCon(false, hace(10 * 60 * 1000))(); e.torneos = { ...e.torneos, tiempos: { api: { ultimaConsultaTs: ts } } }; return e; } });
  assert.match(conSeccion.txt.textContent, /API Supercell: hace 20 min/);
  const sin = await cargarPagina({ esAdmin: false, estatico: estaticoCon(false, hace(10 * 60 * 1000)) });
  assert.ok(!sin.txt.textContent.includes('API Supercell'));
  assert.match(sin.txt.textContent, /JSON publicado: hace 10 min/);
});

test('torneos.html — Apps Script sano (archivo vencido): solo «Consulta», sin JSON publicado ni aviso', async () => {
  const { txt } = await cargarPagina({ esAdmin: false, estatico: estaticoCon(false, hace(5 * HORA)) });
  assert.match(txt.textContent, /^Consulta: hace \d+ s$/);
});

test('torneos.html — admin con sesión (Apps Script sano): solo «Consulta»', async () => {
  const { txt } = await cargarPagina({ esAdmin: true });
  assert.match(txt.textContent, /^Consulta: hace \d+ s$/);
});

test('torneos.html — sin archivo y apiGet() devolvió su respaldo de hace 2 días sin avisar: «Consulta» muestra esa hora vieja, no «ahora»', async () => {
  const r = armarRespuestas(false);
  const t = Date.now() - 2 * 24 * HORA;
  const { txt } = await cargarPagina({ esAdmin: false, ultimaReal: true, respaldos: { webTorneos: { t, d: r.webTorneos } } });
  assert.match(txt.textContent, /^Consulta: hace 2 d$/);
});

test('torneos.html — admin con sesión: «Consulta» es ahora aunque exista un respaldo viejo de visitante (la llamada de admin no usa ese respaldo)', async () => {
  const r = armarRespuestas(false);
  const { txt } = await cargarPagina({ esAdmin: true, ultimaReal: true, respaldos: { webTorneos: { t: Date.now() - 2 * 24 * HORA, d: r.webTorneos } } });
  assert.match(txt.textContent, /^Consulta: hace \d+ s$/);
});
