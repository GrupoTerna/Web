'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (14-oct-2026, pedido de la usuaria; §PF070): ventana única «Sugerencias de mazo» de perfil.html. Las funciones se extraen del <script> inline real.
// Los textos esperados salen de correr las funciones reales del backend (31_Cards_Mazos.gs: _generarUrlMazoDesdeMapas, _generarUrlMazo2DesdeMapas,
// _generarUrlMazo3DesdeMapas) con este mismo catálogo; si la regla cambia en el backend, hay que volver a generarlos. LÍMITE: no abre RoyaleAPI ni prueba un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function mazoUrlRoyaleApi'));
assert.ok(grande, 'no se encontró mazoUrlRoyaleApi en un <script> inline de perfil.html');

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
const BASE = grande.match(/const MAZO_URL_BASE = [^\n]+/)[0];
const AYUDA = grande.match(/const MAZO_AYUDA_MODO = \{[\s\S]*?\};/)[0];
const FUNCIONES = ['mazoCartasValidas', 'mazoNivelPromedio', 'mazoNivelesDisponibles', 'mazoUrlRoyaleApi',
  '_mazoModalAyudas', 'abrirModalMazo', 'cerrarModalMazo'].map(n => extraerFuncion(grande, n)).join('\n');
const CODIGO = `${BASE}\n${AYUDA}\nlet _mazoModalCartas = []; let _mazoModalOpener = null;\n${FUNCIONES}` +
  '\nwindow.__t = { mazoCartasValidas, mazoNivelPromedio, mazoNivelesDisponibles, mazoUrlRoyaleApi, abrirModalMazo, cerrarModalMazo, estado: () => _mazoModalCartas };';

const MODAL = html.match(/<div class="costo-modal-overlay" id="mazoModalOverlay"[\s\S]*?\n<\/div>\n(?=\n|<script)/)[0];

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], MODAL);
  window.eval(CODIGO);
  return window;
}

// Catálogo: [slug, nivel del jugador, evoLevel, maxEvoLevel]
const CARTAS = [
  ['caballero', 14, -1, -1],      // solo normal
  ['arqueras', 12, 1, 1],         // tiene la evolución
  ['mago', 6, -1, 1],             // evolución existe y no la tiene
  ['gigante', 15, 2, 2],          // tiene el héroe
  ['minero', 9, -1, 3],           // evolución y héroe existen, no tiene ninguno
  ['bruja', 0, -1, 3],            // no la tiene
  ['cohete', 0, -1, -1]           // no la tiene
];
const MAZO = {
  ambos: '&inc=caballero&inc=arqueras&inc=arqueras-ev1&inc=mago&inc=gigante&inc=gigante-hero&inc=minero&exc=mago-ev1&exc=minero-ev1&exc=minero-hero&exc=bruja&exc=bruja-ev1&exc=bruja-hero&exc=cohete',
  excluir: '&exc=mago-ev1&exc=minero-ev1&exc=minero-hero&exc=bruja&exc=bruja-ev1&exc=bruja-hero&exc=cohete',
  incluir: '&inc=caballero&inc=arqueras&inc=arqueras-ev1&inc=mago&inc=gigante&inc=gigante-hero&inc=minero',
  excluirNivel10: '&exc=mago&exc=mago-ev1&exc=minero&exc=minero-ev1&exc=minero-hero&exc=bruja&exc=bruja-ev1&exc=bruja-hero&exc=cohete'
};

test('«incluir y excluir» sin nivel mínimo es la sugerencia (1) de antes; «solo excluir», la (2)', () => {
  const t = cargar().__t;
  assert.equal(t.mazoUrlRoyaleApi(CARTAS, 'ambos', 0), t.mazoUrlRoyaleApi(CARTAS, 'ambos', 1));
  assert.ok(t.mazoUrlRoyaleApi(CARTAS, 'ambos', 0).endsWith(MAZO.ambos));
  assert.ok(t.mazoUrlRoyaleApi(CARTAS, 'excluir', 0).endsWith(MAZO.excluir));
  assert.ok(t.mazoUrlRoyaleApi(CARTAS, 'ambos', 0).startsWith('https://royaleapi.com/decks/popular?time=7d&sort=win'));
});

test('«solo incluir» no manda ningún exc=', () => {
  const t = cargar().__t;
  const url = t.mazoUrlRoyaleApi(CARTAS, 'incluir', 0);
  assert.ok(url.endsWith(MAZO.incluir));
  assert.equal((url.match(/&exc=/g) || []).length, 0);
});

test('nivel mínimo: la carta por debajo se trata como no desbloqueada (también su evolución y su héroe), como la sugerencia (3)', () => {
  const t = cargar().__t;
  assert.ok(t.mazoUrlRoyaleApi(CARTAS, 'excluir', 10).endsWith(MAZO.excluirNivel10));
  // con el nivel recomendado (11 = máximo entero del promedio 11.2) sale lo mismo que la sugerencia (3) del backend
  assert.ok(t.mazoUrlRoyaleApi(CARTAS, 'excluir', 11).endsWith(MAZO.excluirNivel10));
  // con nivel mínimo 15 solo queda el gigante
  const url15 = t.mazoUrlRoyaleApi(CARTAS, 'incluir', 15);
  assert.ok(url15.endsWith('&inc=gigante&inc=gigante-hero'));
});

test('nivel promedio y niveles del desplegable', () => {
  const t = cargar().__t;
  const p = t.mazoNivelPromedio(CARTAS);                 // (14+12+6+15+9)/5 = 11.2; las de nivel 0 no cuentan
  assert.equal(p.cartas, 5);
  assert.ok(Math.abs(p.promedio - 11.2) < 1e-9);
  assert.equal(p.nivelMinimo, 11);
  assert.equal(t.mazoNivelPromedio([['x', 0, -1, -1]]), null);
  assert.deepEqual(Array.from(t.mazoNivelesDisponibles(CARTAS)), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.equal(t.mazoNivelesDisponibles([['x', 17, -1, -1]]).length, 17);
});

test('entradas mal formadas se ignoran y una lista no válida no rompe', () => {
  const t = cargar().__t;
  assert.deepEqual(Array.from(t.mazoCartasValidas(null)), []);
  assert.equal(t.mazoCartasValidas([['a', 1, -1, -1], null, 'b', [5], []]).length, 1);
  assert.ok(t.mazoUrlRoyaleApi([], 'ambos', 5).startsWith('https://royaleapi.com/decks/popular'));
});

test('la ventana: abre con «Incluir y excluir» y el nivel recomendado (máximo entero del promedio) elegido', () => {
  const window = cargar();
  const d = window.document;
  window.__t.abrirModalMazo(CARTAS, null);
  assert.ok(d.getElementById('mazoModalOverlay').classList.contains('open'));
  assert.equal(d.getElementById('mazoModalModo').value, 'ambos');
  assert.equal(d.getElementById('mazoModalNivel').value, '11');
  assert.equal(d.getElementById('mazoModalNivel').options.length, 16);
  assert.ok(d.getElementById('mazoModalNivel').selectedOptions[0].textContent.includes('recomendado'));
  assert.ok(d.getElementById('mazoModalSub').textContent.includes('11.2'));
  assert.ok(d.getElementById('mazoModalModoAyuda').textContent.length > 0);
  window.__t.cerrarModalMazo();
  assert.ok(!d.getElementById('mazoModalOverlay').classList.contains('open'));
  assert.equal(d.getElementById('mazoModalOverlay').getAttribute('aria-hidden'), 'true');
});

test('perfil.html: la ventana tiene los dos desplegables y la pastilla «Generar enlace»', () => {
  assert.match(html, /id="mazoModalModo"/);
  assert.match(html, /id="mazoModalNivel"/);
  assert.match(html, /id="mazoModalGenerar"[^>]*>Generar enlace</);
  assert.match(html, /<option value="ambos" selected>Incluir y excluir cartas</);
  assert.match(html, /<option value="incluir">Solo incluir cartas</);
  assert.match(html, /<option value="excluir">Solo excluir cartas</);
});
