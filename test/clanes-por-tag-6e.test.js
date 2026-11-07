'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// NUEVO (6-nov-2026, tanda 6e de Clanes por Tag, §PF416): noticias.html identifica cada clan por su Tag (clanTag) y deja el nombre solo de
// respaldo: el color de cada clan, la leyenda del «Top de medallas» y los enlaces al clan (&tag=). Se carga el noticias.html REAL en jsdom con
// el enlaceClan() REAL de util.js y un backend simulado; solo se reemplaza `window.location.replace(`, que jsdom no implementa.
// LÍMITE: DOM y backend simulados; no prueba 40_Web_Noticias.gs ni el aspecto en un navegador real.

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
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

const NOTICIAS = leer('noticias.html');
const UTIL = leer('assets/js/util.js');
const ESC_Y_ENLACE = `${extraerFuncion(UTIL, 'esc')}\n${extraerFuncion(UTIL, 'enlaceClan')}`;

const SEMANA = { lunesIso: '2026-11-02', domingoIso: '2026-11-08', temporada: 12, semana: 5 };

function montar(tablero){
  const html = NOTICIAS.replace(/<script src="[^"]*"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/noticias.html' });
  const w = dom.window;
  w.localStorage.setItem('terna_admin_token', 'tok');
  w.__redirecciones = [];
  const m = html.match(/^<script>\n([\s\S]*?)^<\/script>/m);
  assert.ok(m, 'no se encontró el <script> inline de noticias.html');
  w.eval(`
    window.__ir = (u) => window.__redirecciones.push(u);
    ${ESC_Y_ENLACE}
    function enlaceJugador(n){ return esc(n); }
    function cerrarSesionAdmin(){ localStorage.removeItem('terna_admin_token'); return Promise.resolve(); }
    async function apiGetAuth(accion){
      if(accion === 'webAdminSemanasRecientes') return { ok: true, semanas: [${JSON.stringify(SEMANA)}] };
      if(accion === 'webAdminNoticiasSemana') return ${JSON.stringify(tablero)};
      throw new Error('acción inesperada: ' + accion);
    }
    ${m[1].replace(/window\.location\.replace\(/g, 'window.__ir(')}
  `);
  return w;
}
const espera = (ms = 40) => new Promise(r => setTimeout(r, ms));
const colores = html => [...html.matchAll(/--nt:(#[0-9a-f]{6})/gi)].map(x => x[1].toLowerCase());

// Dos clanes con el MISMO nombre y distinto Tag, más uno sin Tag (dato anterior al campo clanTag).
const pos = (clan, clanTag, puesto) => ({ clan, tag: clanTag, clanTag, sinDatos: false, puesto, puestoEstimado: false, trofeos: 1000, variacionTrofeos: 0, barco: 0, coliseo: false, puestoAnterior: puesto, variacionPuesto: 0, tendencia: [] });
const TABLERO = {
  ok: true, lunesIso: SEMANA.lunesIso, semana: SEMANA,
  posiciones: { ok: true, clanes: [pos('Argentina', '#ARG111', 1), pos('Argentina', '#ARG222', 2), pos('Terna Uno', undefined, 3)] },
  guerra: {
    ok: true, clanes: [], ataquesMaxJugador: 16,
    topFame: [
      { tag: '#P1', nombre: 'Ana', clan: 'Argentina', clanTag: '#ARG111', fame: 3000, ataques: 16 },
      { tag: '#P2', nombre: 'Beto', clan: 'Argentina', clanTag: '#ARG222', fame: 2500, ataques: 16 },
      { tag: '#P3', nombre: 'Carla', clan: 'Argentina', clanTag: '#ARG111', fame: 2000, ataques: 15 },
      { tag: '#P4', nombre: 'Dani', clan: 'Terna Uno', fame: 1500, ataques: 12 }
    ]
  },
  barcos: { ok: false, error: 'sin datos' },
  ascensos: { ok: true, cambios: [
    { tag: '#A1', nombre: 'Eva', clan: 'Argentina', clanTag: '#ARG222', tipo: 'Ascenso', esAscensoClan: false, rangoAnterior: 'Miembro', rangoNuevo: 'Veterano', fechaTxt: '03/11/2026' },
    { tag: '#A2', nombre: 'Fito', clan: 'Terna Uno', tipo: 'Ascenso', esAscensoClan: false, rangoAnterior: 'Miembro', rangoNuevo: 'Veterano', fechaTxt: '04/11/2026' }
  ] },
  movimientos: { ok: true, total: 2, clanes: [], lista: [
    { tag: '#M1', nombre: 'Gina', movimiento: 'Ingreso', clan: 'Argentina', clanTag: '#ARG111', fechaTxt: '05/11/2026' },
    { tag: '#M2', nombre: 'Hugo', movimiento: 'Salida', clan: 'Terna Uno', fechaTxt: '06/11/2026' }
  ] }
};

test('§PF416 noticias: dos clanes del mismo nombre y distinto Tag no comparten color (el nombre ya no es la clave)', async () => {
  const w = montar(TABLERO);
  await espera();
  const c = colores(w.document.getElementById('noticiasDash').innerHTML);
  assert.ok(c.length >= 3, 'se pintaron las tres tarjetas de posiciones');
  assert.notEqual(c[0], c[1], 'Argentina #ARG111 y #ARG222 llevan colores distintos');
  assert.notEqual(c[0], c[2]);
  assert.notEqual(c[1], c[2]);
});

test('§PF416 noticias: la leyenda del Top de medallas separa los clanes por Tag y no repite el mismo Tag', async () => {
  const w = montar(TABLERO);
  await espera();
  const leyenda = w.document.querySelector('.nt-leyenda');
  assert.ok(leyenda, 'hay leyenda');
  const items = [...leyenda.querySelectorAll(':scope > span')].map(s => s.textContent.trim());
  assert.deepEqual(items, ['Argentina', 'Argentina', 'Terna Uno'], 'dos Argentina (Tags distintos) y un Terna Uno; el #ARG111 repetido no duplica');
});

test('§PF416 noticias: los enlaces al clan llevan &tag= cuando hay clanTag y quedan como siempre cuando no', async () => {
  const w = montar(TABLERO);
  await espera();
  const enlaces = [...w.document.querySelectorAll('#noticiasDash a.clan-link')].map(a => a.getAttribute('href'));
  assert.ok(enlaces.includes('clan.html?clan=Argentina&tag=%23ARG111'), 'tarjeta de posiciones o movimientos con Tag #ARG111');
  assert.ok(enlaces.includes('clan.html?clan=Argentina&tag=%23ARG222'), 'posiciones y ascensos con Tag #ARG222');
  assert.ok(enlaces.includes('clan.html?clan=Terna%20Uno'), 'sin clanTag el enlace es el de siempre (solo ?clan=)');
  assert.equal(enlaces.filter(h => /Terna%20Uno/.test(h) && /tag=/.test(h)).length, 0, 'Terna Uno no inventa un Tag');
});

test('§PF416 noticias: un clan sin clanTag sigue pintándose con color y enlace (respaldo al nombre)', async () => {
  const sinTag = JSON.parse(JSON.stringify(TABLERO));
  sinTag.posiciones.clanes = [pos('Terna Uno', undefined, 1), pos('Terna Dos', undefined, 2)];
  const w = montar(sinTag);
  await espera();
  const html = w.document.getElementById('noticiasDash').innerHTML;
  assert.deepEqual(new Set(colores(html)).size, 2, 'dos clanes sin Tag, dos colores por nombre');
  assert.ok(html.includes('clan.html?clan=Terna%20Uno"'));
  assert.ok(html.includes('clan.html?clan=Terna%20Dos"'));
});
