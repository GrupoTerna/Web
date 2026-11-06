'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (6-nov-2026, pedido de la usuaria): clan.html reemplaza el «Roster» por «Directorio por clan», con la misma tabla de directorio.html pero solo con
// los miembros del clan de la página, y deja «Ver en el Directorio» con el clan preseleccionado (?clan=). La tabla vive en assets/js/features/roster-tabla.js.
// Se carga el archivo real y la función renderClanRoster() real de clan.html con jsdom. LÍMITE: DOM simulado, no prueba el CSS ni un navegador real.

const CLAN = fs.readFileSync(path.join(__dirname, '..', 'clan.html'), 'utf8');

function extraer(src, inicio) {
  const i = src.indexOf(inicio);
  assert.ok(i >= 0, 'no se encontró: ' + inicio);
  let nivel = 0, j = src.indexOf('{', src.indexOf(')', i));
  for (; j < src.length; j++) {
    if (src[j] === '{') nivel++;
    else if (src[j] === '}') { nivel--; if (nivel === 0) break; }
  }
  return src.slice(i, j + 1);
}

const CUERPO = '<a id="clanVerDirectorioLink" href="#"></a><div id="rosterLetraFilter"></div><div id="rosterBuscador"></div><div id="rosterWrap"></div>';
const MIEMBROS = [
  { tag: '#AAA111', nombre: 'Ana', rango: 'Líder', ranking: 1, copas: 9000, vGuerra: 120, arena: 'Leyendas', nivelXp: 70, nivelCartas: 15, antiguedad: 6, vigencia: '2026-11-05', royaleApi: 'https://royaleapi.com/player/AAA111', cwStats: 'https://cwstats.com/player/AAA111' },
  { tag: '#BBB222', nombre: 'Beto', rango: 'Miembro', ranking: 2, copas: 7000, vGuerra: 80, arena: 'Arena 20', nivelXp: 60, nivelCartas: 14, antiguedad: 3 },
  { tag: '#CCC333', nombre: 'Álvaro', rango: 'Colíder', ranking: 3, copas: 8000, vGuerra: 100, arena: 'Leyendas', nivelXp: 65, nivelCartas: 15, antiguedad: 4 },
];

function cargar() {
  const w = loadBrowserScriptsWithDom([
    'assets/js/util.js', 'assets/js/ui/filters.js', 'assets/js/ui/tables.js', 'assets/js/data/clan-badges.js',
    'assets/js/features/mini-historial.js', 'assets/js/features/roster-tabla.js',
  ], CUERPO);
  w.eval(extraer(CLAN, 'function renderClanRoster') + '\nwindow.renderClanRoster = renderClanRoster;');
  return w;
}
const filasVisibles = w => [...w.document.querySelectorAll('#rosterWrap tbody tr')].filter(f => f.style.display !== 'none').map(f => f.dataset.buscar.split(' ')[0]);

test('clan.html: la sección se llama «Directorio por clan», ya no hay «Roster» y usa los mismos id que directorio.html', () => {
  assert.match(CLAN, /<h2 class="pf-subtitulo"[^>]*>Directorio por clan<\/h2>/);
  assert.doesNotMatch(CLAN, />Roster<\/h2>/);
  for (const id of ['rosterLetraFilter', 'rosterBuscador', 'rosterWrap', 'clanVerDirectorioLink']) assert.match(CLAN, new RegExp(`id="${id}"`));
  assert.match(CLAN, /<script src="assets\/js\/features\/roster-tabla\.js"><\/script>/);
  assert.doesNotMatch(CLAN, /aplicarFiltroLetraClanRoster|clanRosterLetraSeleccionada|id="clanRosterWrap"/, 'ya no queda la tabla vieja');
});

test('«Ver en el Directorio» apunta a directorio.html con el clan preseleccionado, aunque el clan no tenga miembros', () => {
  const w = cargar();
  w.renderClanRoster({ nombre: 'Terna Élite & Co', miembros: MIEMBROS });
  assert.equal(w.document.getElementById('clanVerDirectorioLink').getAttribute('href'), 'directorio.html?clan=Terna%20%C3%89lite%20%26%20Co#roster');
  w.renderClanRoster({ nombre: 'Terna Vacío', miembros: [] });
  assert.equal(w.document.getElementById('clanVerDirectorioLink').getAttribute('href'), 'directorio.html?clan=Terna%20Vac%C3%ADo#roster');
  assert.match(w.document.getElementById('rosterWrap').textContent, /todavía no tiene miembros/);
});

test('la tabla trae las 13 columnas del Directorio por clan, solo con los miembros de este clan, y el título con su cantidad', () => {
  const w = cargar();
  w.renderClanRoster({ nombre: 'Terna Uno', miembros: MIEMBROS });
  const cab = [...w.document.querySelectorAll('#rosterWrap thead th')].map(th => th.querySelector('span').textContent);
  assert.deepEqual(cab, ['N°', 'Ranking', 'Nombre', 'Tag', 'Rango', 'Perfil', 'V. Guerra', 'Copas', 'Arena', 'Nivel (XP)', 'Nivel (cartas)', 'Antigüedad', 'Vigencia']);
  assert.equal(w.document.querySelectorAll('#rosterWrap tbody tr.js-miembro').length, 3);
  assert.match(w.document.querySelector('.roster-clan-title').textContent, /Terna Uno\s+\(3 miembros\)/);
  assert.equal(w.document.querySelector('.roster-clan-title a'), null, 'el título no se enlaza a sí mismo');
  const ana = w.document.querySelector('tr[data-tag="#AAA111"]');
  assert.equal(ana.querySelector('.rt-nombre .col-jugador-nombre').textContent, 'Ana');
  assert.ok(ana.querySelector('.rt-nombre .btn-hist-jugador'), 'el 📈 sigue junto al nombre');
  assert.equal(ana.querySelectorAll('.rt-perfil a').length, 2, 'íconos de RoyaleAPI y CWStats');
  assert.equal(ana.querySelector('.rt-antiguedad').textContent, '6 años');
});

test('filtro por letra, buscador y filtro por columna (con «Quitar filtros») funcionan sobre las filas de este clan', () => {
  const w = cargar();
  w.renderClanRoster({ nombre: 'Terna Uno', miembros: MIEMBROS });
  assert.deepEqual(filasVisibles(w), ['Ana', 'Beto', 'Álvaro']);
  const botonA = [...w.document.querySelectorAll('#rosterLetraFilter .letra-btn')].find(b => b.textContent === 'A');
  botonA.click();
  assert.deepEqual(filasVisibles(w), ['Ana'], 'misma regla que Directorio: una Á inicial cae en «#», no en la A');
  botonA.click();
  const botonNumeral = [...w.document.querySelectorAll('#rosterLetraFilter .letra-btn')].find(b => b.textContent === '#');
  botonNumeral.click();
  assert.deepEqual(filasVisibles(w), ['Álvaro']);
  botonNumeral.click(); // quita la letra: se ven todos otra vez
  assert.deepEqual(filasVisibles(w), ['Ana', 'Beto', 'Álvaro']);
  const entrada = w.document.querySelector('#rosterBuscador input');
  entrada.value = 'alva'; entrada.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.deepEqual(filasVisibles(w), ['Álvaro']);
  assert.match(w.document.querySelector('#rosterBuscador .buscador-cuenta').textContent, /1 de 3/);
  entrada.value = ''; entrada.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.deepEqual(filasVisibles(w), ['Ana', 'Beto', 'Álvaro']);
  assert.equal(w.document.getElementById('rosterLimpiarFiltros').disabled, true);
  // Filtro por columna con la interfaz real: embudo de «Arena» > desmarcar «Arena 20» > Aceptar.
  w.document.querySelector('.rt-filtro-btn[data-col="arena"]').click();
  const casilla = [...w.document.querySelectorAll('.rt-filtro-pop input[type="checkbox"]')].find(cb => cb.value === 'Arena 20');
  assert.ok(casilla, 'el desplegable lista los valores de Arena de este clan');
  casilla.click();
  w.document.querySelector('.rt-filtro-pop .rt-filtro-aceptar').click();
  assert.deepEqual(filasVisibles(w), ['Ana', 'Álvaro']);
  assert.equal(w.document.getElementById('rosterLimpiarFiltros').disabled, false);
  w.document.getElementById('rosterLimpiarFiltros').click();
  assert.deepEqual(filasVisibles(w), ['Ana', 'Beto', 'Álvaro']);
});

test('tocar una fila lleva al perfil del jugador en vez de abrir el panel de Directorio', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'features', 'roster-tabla.js'), 'utf8');
  assert.match(extraer(src, 'function rosterAbrirMiembro'), /location\.href = 'perfil\.html\?tag=' \+ encodeURIComponent\(tag\)/);
  assert.match(src, /rosterAbrirMiembro\(row\.dataset\.tag\);/);
  assert.doesNotMatch(src, /buscarMiembro\(/);
});
