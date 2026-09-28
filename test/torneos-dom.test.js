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

async function cargarPagina({ esAdmin }){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], BODY);
  const llamadas = [];
  if (esAdmin) window.localStorage.setItem('terna_admin_token', 'token-de-prueba');
  window.apiGet = async (accion, params, opts) => {
    llamadas.push({ accion, opts });
    const conAdmin = !!(opts && opts.conSesion && window.localStorage.getItem('terna_admin_token'));
    return armarRespuestas(conAdmin)[accion];
  };
  window.apiGetUltimaActualizacion = () => null;
  window.fmtTiempoRelativo = () => 'hace un momento';
  window.eval(SCRIPT_INLINE);
  await new Promise(r => setTimeout(r, 30)); // deja terminar cargarTorneos()/cargarSalonDeLaFama()
  return { window, doc: window.document, llamadas };
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
