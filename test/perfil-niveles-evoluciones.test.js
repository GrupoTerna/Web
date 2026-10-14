'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (14-oct-2026, pedido de la usuaria; §PF071): ventana «Niveles y evoluciones» de la colección de perfil.html (diagrama de evoluciones y héroes, tabla de fragmentos y monedas,
// y dona sin leyenda en la página). Funciones extraídas del <script> inline real. LÍMITE: prueba el HTML/SVG generado en jsdom, no cómo se ve en un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function _evoHeroeResumen'));
assert.ok(grande, 'no se encontró _evoHeroeResumen en un <script> inline de perfil.html');

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
const CONST_RAREZA = grande.match(/const RAREZA_RAW_A_KEY = [^\n]+/)[0];
const CONST_HEROE = grande.match(/const COSTO_DESBLOQUEO_HEROE = \d+;/)[0];
const CONST_EVO = grande.match(/const COSTO_FRAGMENTOS_EVO = \d+;/)[0];
const FUNCIONES = ['rarezaKey', '_evoDesbloqueada', '_heroeDesbloqueado', '_heroeTiene', '_heroeDisponible', '_evoTiene', '_evoDisponible',
  '_evoHeroeResumen', '_vennEvoHeroeHtml', '_tablaEvoHeroeHtml', '_pastelMiniHtml', 'abrirModalColeccion', 'cerrarModalColeccion'].map(n => extraerFuncion(grande, n)).join('\n');
const CODIGO = `${CONST_RAREZA}\n${CONST_HEROE}\n${CONST_EVO}\nlet _nivelPieModalHtml = '<div class="mini-pie" id="pie-prueba">PIE</div>'; let _coleccionModalOpener = null;\n` +
  'let _ultimasCartasColeccion = []; let _ultimasCartasBloqueadas = [];\n' + FUNCIONES +
  '\nwindow.__t = { _evoHeroeResumen, _vennEvoHeroeHtml, _tablaEvoHeroeHtml, _pastelMiniHtml, abrirModalColeccion, cerrarModalColeccion,' +
  ' poner: (a, b) => { _ultimasCartasColeccion = a; _ultimasCartasBloqueadas = b; } };';

const MODAL = html.match(/<div class="costo-modal-overlay" id="coleccionModalOverlay"[\s\S]*?\n<\/div>\n(?=\n|<script)/)[0];

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], MODAL);
  window.eval(CODIGO);
  return window;
}

// Desbloqueadas (evolutionLevel: 1 evo, 2 héroe, 3 ambos, 0/ausente nada) y por desbloquear
const CARTAS = [
  { name: 'Arqueras', rarity: 'common', maxEvolutionLevel: 1, evolutionLevel: 1 },     // solo evo, la tiene
  { name: 'Mago', rarity: 'rare', maxEvolutionLevel: 1 },                              // solo evo, no la tiene
  { name: 'Caballero', rarity: 'common', maxEvolutionLevel: 3, evolutionLevel: 3 },    // ambos, tiene los dos
  { name: 'Minero', rarity: 'legendary', maxEvolutionLevel: 3, evolutionLevel: 1 },    // ambos, solo la evolución
  { name: 'Gigante', rarity: 'rare', maxEvolutionLevel: 2, evolutionLevel: 2 },        // solo héroe, lo tiene
  { name: 'Rey Esqueleto', rarity: 'champion', maxEvolutionLevel: null },              // Campeón: héroe por defecto
  { name: 'Bandida', rarity: 'epic' },                                                 // base
  { name: 'Duendes', rarity: 'common' }                                                // base
];
const BLOQUEADAS = [
  { name: 'Bruja', rarity: 'epic', maxEvolutionLevel: 3 },                             // ambos, sin desbloquear
  { name: 'Cohete', rarity: 'rare', maxEvolutionLevel: 2 },                            // solo héroe, sin desbloquear
  { name: 'Monje', rarity: 'champion' },                                               // Campeón sin desbloquear
  { name: 'Zap', rarity: 'common' }                                                    // base
];

test('_evoHeroeResumen reparte las cartas en los cuatro conjuntos', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen(CARTAS, BLOQUEADAS);
  assert.deepEqual(JSON.parse(JSON.stringify(r.soloEvo)), { tot: 2, tiene: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.ambos)), { tot: 3, evo: 2, heroe: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.soloHeroe)), { tot: 4, tiene: 2 });    // Gigante, Rey Esqueleto, Cohete, Monje
  assert.deepEqual(JSON.parse(JSON.stringify(r.base)), { tot: 3, tiene: 2 });
  assert.equal(r.soloEvo.tot + r.ambos.tot + r.soloHeroe.tot + r.base.tot, CARTAS.length + BLOQUEADAS.length);
});

test('totales por variante: el héroe no cuenta a los Campeones', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen(CARTAS, BLOQUEADAS);
  assert.deepEqual(JSON.parse(JSON.stringify(r.evo)), { tot: 5, tiene: 3 });          // Arqueras, Mago, Caballero, Minero, Bruja; tiene Arqueras, Caballero, Minero
  assert.deepEqual(JSON.parse(JSON.stringify(r.heroe)), { tot: 5, tiene: 2 });        // Caballero, Minero, Gigante, Bruja, Cohete; tiene Caballero y Gigante
  assert.equal(r.campeones, 2);
});

test('una carta por desbloquear nunca cuenta como desbloqueada, ni siquiera un Campeón', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen([], [{ name: 'Monje', rarity: 'champion' }, { name: 'Bruja', rarity: 'epic', maxEvolutionLevel: 3 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(r.soloHeroe)), { tot: 1, tiene: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.ambos)), { tot: 1, evo: 0, heroe: 0 });
});

test('listas vacías o ausentes no rompen', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen(null, undefined);
  assert.equal(r.evo.tot + r.heroe.tot + r.base.tot + r.soloHeroe.tot, 0);
});

test('el diagrama muestra x/y de cada región y el centro con evolución y héroe por separado', () => {
  const t = cargar().__t;
  const svg = t._vennEvoHeroeHtml(t._evoHeroeResumen(CARTAS, BLOQUEADAS));
  assert.match(svg, /<svg class="venn-svg"/);
  assert.match(svg, /class="venn-num" x="150" y="136">1\/2</);       // solo evolución
  assert.match(svg, /✨ 2\/3/);                                        // centro: evoluciones
  assert.match(svg, /🦸 1\/3/);                                        // centro: héroes
  assert.match(svg, /class="venn-num" x="370" y="136">2\/4</);       // solo héroe
  assert.match(svg, /class="venn-num" x="450" y="230">2\/3</);       // carta base
  assert.match(svg, /los Campeones traen su héroe/);
  // los nombres de los conjuntos quedan a los lados, fuera de los círculos (x de la Evolución < borde izquierdo 113; Héroe > borde derecho 407)
  const xEvo = Number(svg.match(/venn-lbl--evo" x="(\d+)"/)[1]); const xHeroe = Number(svg.match(/venn-lbl--heroe" x="(\d+)"/)[1]);
  assert.ok(xEvo + 40 < 113 && xHeroe - 40 > 407, `etiquetas dentro de los círculos: ${xEvo}, ${xHeroe}`);
});

test('la tabla calcula lo que falta: 6 fragmentos por evolución y 200 monedas por héroe', () => {
  const t = cargar().__t;
  const tabla = t._tablaEvoHeroeHtml(t._evoHeroeResumen(CARTAS, BLOQUEADAS));
  // evolución: 5 existen, 3 tienes, faltan 2 -> 12 fragmentos; héroe: 5 existen, 2 tienes, faltan 3 -> 600 monedas
  assert.match(tabla, /Evolución<\/td><td class="num">5<\/td><td class="num">3<\/td><td class="num">2<\/td>\s*<td class="num">6 fragmentos<\/td><td class="num"><b>12<\/b> fragmentos/);
  assert.match(tabla, /Héroe<\/td><td class="num">5<\/td><td class="num">2<\/td><td class="num">3<\/td>\s*<td class="num">200 monedas<\/td><td class="num"><b>600<\/b> monedas/);
});

test('si ya tiene todo, faltan 0 y el total es 0', () => {
  const t = cargar().__t;
  const todo = [{ name: 'A', rarity: 'common', maxEvolutionLevel: 3, evolutionLevel: 3 }];
  const tabla = t._tablaEvoHeroeHtml(t._evoHeroeResumen(todo, []));
  assert.match(tabla, /<b>0<\/b> fragmentos/);
  assert.match(tabla, /<b>0<\/b> monedas/);
});

test('_pastelMiniHtml con soloDonut no pinta leyenda ni nota; sin él, sí', () => {
  const t = cargar().__t;
  const porciones = [{ etiqueta: 'Nv. 15', valor: 3, color: '#f3a922', columna: '<span>x</span>' }, { etiqueta: 'Nv. 14', valor: 2, color: '#a239ff' }];
  const solo = t._pastelMiniHtml('Cartas por nivel', porciones, [], { soloDonut: true, nota: 'NOTA' });
  assert.ok(!solo.includes('mini-pie-leyenda'));
  assert.ok(!solo.includes('NOTA'));
  assert.ok(solo.includes('mini-pie-donut-wrap'));
  assert.ok(solo.includes('Nv. 15: 3'));   // el resumen accesible conserva los datos
  const completo = t._pastelMiniHtml('Cartas por nivel', porciones, [], { nota: 'NOTA' });
  assert.ok(completo.includes('mini-pie-leyenda'));
  assert.ok(completo.includes('NOTA'));
});

test('la ventana abre con la dona completa, el diagrama y la tabla; se cierra y devuelve el foco', () => {
  const window = cargar();
  const d = window.document;
  const boton = d.createElement('button'); d.body.appendChild(boton);
  window.__t.poner(CARTAS, BLOQUEADAS);
  window.__t.abrirModalColeccion(boton);
  const ov = d.getElementById('coleccionModalOverlay');
  assert.ok(ov.classList.contains('open'));
  assert.equal(ov.getAttribute('aria-hidden'), 'false');
  const cont = d.getElementById('coleccionModalContenido');
  assert.ok(cont.querySelector('#pie-prueba'));
  assert.deepEqual([...cont.querySelectorAll('.col-modal-seccion > h4')].map(h => h.textContent), ['Cartas por nivel', 'Evoluciones y héroes', 'Fragmentos y monedas que faltan']);
  assert.ok(cont.querySelector('svg.venn-svg'));
  assert.ok(cont.querySelector('table.costo-tabla'));
  window.__t.cerrarModalColeccion();
  assert.ok(!ov.classList.contains('open'));
  assert.equal(d.activeElement, boton);
});

test('sin cartas con evolución ni héroe, la ventana solo muestra la dona', () => {
  const window = cargar();
  window.__t.poner([{ name: 'A', rarity: 'common' }], []);
  window.__t.abrirModalColeccion(null);
  const cont = window.document.getElementById('coleccionModalContenido');
  assert.ok(cont.querySelector('#pie-prueba'));
  assert.ok(!cont.querySelector('svg.venn-svg'));
});

test('perfil.html: la pastilla queda junto a la dona y la ventana existe', () => {
  assert.match(html, /id="mColeccionNivelBtn"[^>]*>Ver niveles y evoluciones</);
  assert.match(html, /id="coleccionModalOverlay"/);
  assert.match(html, /soloDonut: true/);
});
