'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (14-oct-2026, pedido de la usuaria; §PF071): ventana «Niveles y evoluciones» de la colección de perfil.html (diagrama de evoluciones y héroes, tabla de fragmentos y monedas,
// y dona sin leyenda en la página) y, en la dona, el oro de las cartas por desbloquear. Funciones extraídas del <script> inline real. LÍMITE: prueba el HTML/SVG generado en jsdom, no cómo se ve en un navegador.

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
const CONST_FRAG = grande.match(/const _ICONO_FRAGMENTO_HTML = [^\n]+/)[0];
const CONST_MONEDA = grande.match(/const _ICONO_MONEDA_HEROE_TABLA_HTML = [^\n]+/)[0];
const FUNCIONES = ['rarezaKey', '_evoDesbloqueada', '_heroeDesbloqueado', '_heroeTiene', '_heroeDisponible', '_evoTiene', '_evoDisponible',
  '_evoHeroeResumen', '_vennEvoHeroeHtml', '_tablaEvoHeroeHtml', '_pastelMiniHtml', 'abrirModalColeccion', 'cerrarModalColeccion',
  '_diferenciaNivelRareza', '_infoCartasBloqueadas', '_indiceCostosOro', '_oroBloqueadasHastaNivel'].map(n => extraerFuncion(grande, n)).join('\n');
const CODIGO = `${CONST_RAREZA}\n${CONST_HEROE}\n${CONST_EVO}\n${CONST_FRAG}\n${CONST_MONEDA}\nlet _difNivelPorRareza = {}; let _nivelMaxAbsoluto = null;\nlet _nivelPieModalHtml = '<div class="mini-pie" id="pie-prueba">PIE</div>'; let _coleccionModalOpener = null;\n` +
  'let _ultimasCartasColeccion = []; let _ultimasCartasBloqueadas = [];\n' + FUNCIONES +
  '\nwindow.__t = { _evoHeroeResumen, _vennEvoHeroeHtml, _tablaEvoHeroeHtml, _pastelMiniHtml, abrirModalColeccion, cerrarModalColeccion,' +
  ' _infoCartasBloqueadas, _indiceCostosOro, _oroBloqueadasHastaNivel,' +
  ' niveles: (dif, max) => { _difNivelPorRareza = dif; _nivelMaxAbsoluto = max; },' +
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
  { name: 'Rey Esqueleto', rarity: 'champion', maxEvolutionLevel: null },              // Campeón: como cualquier otra carta, el backend no le manda evolución ni héroe -> base
  { name: 'Bandida', rarity: 'epic' },                                                 // base
  { name: 'Duendes', rarity: 'common' }                                                // base
];
const BLOQUEADAS = [
  { name: 'Bruja', rarity: 'epic', maxEvolutionLevel: 3 },                             // ambos, sin desbloquear
  { name: 'Cohete', rarity: 'rare', maxEvolutionLevel: 2 },                            // solo héroe, sin desbloquear
  { name: 'Monje', rarity: 'champion' },                                               // Campeón sin desbloquear -> base
  { name: 'Zap', rarity: 'common' }                                                    // base
];

test('_evoHeroeResumen reparte las cartas en los cuatro conjuntos', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen(CARTAS, BLOQUEADAS);
  assert.deepEqual(JSON.parse(JSON.stringify(r.soloEvo)), { tot: 2, tiene: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.ambos)), { tot: 3, evo: 2, heroe: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.soloHeroe)), { tot: 2, tiene: 1 });    // Gigante (lo tiene), Cohete
  assert.deepEqual(JSON.parse(JSON.stringify(r.base)), { tot: 5, tiene: 3 });         // Bandida, Duendes, Rey Esqueleto, Zap y Monje (los dos Campeones cuentan como carta base)
  assert.equal(r.soloEvo.tot + r.ambos.tot + r.soloHeroe.tot + r.base.tot, CARTAS.length + BLOQUEADAS.length);
});

test('totales por variante; los Campeones no tienen un caso aparte', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen(CARTAS, BLOQUEADAS);
  assert.deepEqual(JSON.parse(JSON.stringify(r.evo)), { tot: 5, tiene: 3 });          // Arqueras, Mago, Caballero, Minero, Bruja; tiene Arqueras, Caballero, Minero
  assert.deepEqual(JSON.parse(JSON.stringify(r.heroe)), { tot: 5, tiene: 2 });        // Caballero, Minero, Gigante, Bruja, Cohete; tiene Caballero y Gigante
  assert.equal(r.campeones, undefined);
});

test('una carta por desbloquear nunca cuenta como desbloqueada; un Campeón sin variantes es carta base', () => {
  const t = cargar().__t;
  const r = t._evoHeroeResumen([], [{ name: 'Monje', rarity: 'champion' }, { name: 'Bruja', rarity: 'epic', maxEvolutionLevel: 3 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(r.base)), { tot: 1, tiene: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.soloHeroe)), { tot: 0, tiene: 0 });
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
  assert.match(svg, /class="venn-num" x="168" y="136">1\/2</);       // solo evolución
  // centro: evoluciones y héroes, con un punto del color de cada círculo (14-oct-2026: antes llevaban ✨ y 🦸 dentro del SVG, y el ancho del emoji depende de cada sistema)
  assert.match(svg, /venn-pt--evo"[^>]*\/>\s*<text class="venn-num-chico venn-fila"[^>]*>2\/3</);
  assert.match(svg, /venn-pt--heroe"[^>]*\/>\s*<text class="venn-num-chico venn-fila"[^>]*>1\/3</);
  assert.ok(!/[\u2728\u{1F9B8}]/u.test(svg.match(/<svg[\s\S]*?<\/svg>/)[0]), 'el SVG no debe llevar emojis (✨ ni 🦸): su ancho cambia según el sistema; la leyenda HTML de abajo sí los conserva');
  assert.match(svg, /class="venn-num" x="352" y="136">1\/2</);       // solo héroe
  assert.match(svg, /class="venn-num" x="450" y="230">3\/5</);       // carta base (con los dos Campeones)
  assert.ok(!svg.includes('Campeones'));
  // los nombres de los conjuntos quedan a los lados, fuera de los círculos (x de la Evolución < borde izquierdo 113; Héroe > borde derecho 407)
  const xEvo = Number(svg.match(/venn-lbl--evo" x="(\d+)"/)[1]); const xHeroe = Number(svg.match(/venn-lbl--heroe" x="(\d+)"/)[1]);
  assert.ok(xEvo + 40 < 113 && xHeroe - 40 > 407, `etiquetas dentro de los círculos: ${xEvo}, ${xHeroe}`);
});

test('la tabla calcula lo que falta: 6 fragmentos por evolución y 200 monedas por héroe', () => {
  const t = cargar().__t;
  const tabla = t._tablaEvoHeroeHtml(t._evoHeroeResumen(CARTAS, BLOQUEADAS));
  // evolución: 5 existen, 3 tienes, faltan 2 -> 12 fragmentos; héroe: 5 existen, 2 tienes, faltan 3 -> 600 monedas
  assert.match(tabla, /Evolución<\/td><td class="num" role="cell">5<\/td><td class="num" role="cell">3<\/td><td class="num" role="cell">2<\/td>\s*<td class="num" role="cell">6 <img class="ico-frag"[^>]*><\/td><td class="num" role="cell"><b>12<\/b> <img class="ico-frag"[^>]*><\/td>/);
  assert.match(tabla, /Héroe<\/td><td class="num" role="cell">5<\/td><td class="num" role="cell">2<\/td><td class="num" role="cell">3<\/td>\s*<td class="num" role="cell">200 <img class="ico-frag"[^>]*HeroCoin\.webp[^>]*><\/td><td class="num" role="cell"><b>600<\/b> <img class="ico-frag"[^>]*HeroCoin\.webp[^>]*><\/td>/);
  assert.ok(!/fragmentos<\/td>|monedas<\/td>/.test(tabla), 'la tabla ya no lleva las palabras fragmentos ni monedas');
  // La leyenda debajo de la tabla explica los dos íconos, igual que la de los conjuntos.
  assert.match(tabla, /<ul class="venn-leyenda">\s*<li><img class="ico-frag"[^>]*WildShard\.webp[^>]*> <b>Fragmentos de evolución<\/b><\/li>\s*<li><img class="ico-frag"[^>]*HeroCoin\.webp[^>]*> <b>Monedas de héroe<\/b><\/li>\s*<\/ul>\s*<div class="col-modal-nota">/);
});

test('si ya tiene todo, faltan 0 y el total es 0', () => {
  const t = cargar().__t;
  const todo = [{ name: 'A', rarity: 'common', maxEvolutionLevel: 3, evolutionLevel: 3 }];
  const tabla = t._tablaEvoHeroeHtml(t._evoHeroeResumen(todo, []));
  assert.match(tabla, /<b>0<\/b> <img class="ico-frag"[^>]*WildShard\.webp[^>]*><\/td>/);
  assert.match(tabla, /<b>0<\/b> <img class="ico-frag"[^>]*HeroCoin\.webp[^>]*><\/td>/);
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

test('el ícono de los fragmentos es una copia WebP de Wild Shard y la tabla lo usa', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'Imágenes', 'Íconos', 'Fankit', 'WildShard.webp')));
  assert.match(html, /src="assets\/Im%C3%A1genes\/%C3%8Dconos\/Fankit\/WildShard\.webp"/);
});

// ---- Oro de las cartas por desbloquear (aparte, bajo el oro de las desbloqueadas) ----
// Desfase por rareza (nivel máximo absoluto 16): común 0, rara 2, épica 5, legendaria 8, campeón 10 -> se desbloquean en el nivel 1, 3, 6, 9 y 11 de la app.
const DIF = { common: 0, rare: 2, epic: 5, legendary: 8, champion: 10 };
const filasOro = (desde, hasta) => { const f = []; for (let l = desde; l < hasta; l++) f.push({ desde: l, hasta: l + 1, oro: l * 100, cartas: 1 }); return f; };
const J = x => JSON.parse(JSON.stringify(x));

test('_infoCartasBloqueadas: nivel inicial = 1 + desfase de la rareza; tope = maxLevel + desfase; el Campeón es una carta más', () => {
  const t = cargar().__t; t.niveles(DIF, 16);
  const info = t._infoCartasBloqueadas([
    { rarity: 'epic', maxLevel: 11 }, { rarity: 'champion', maxLevel: 6 }, { rarity: 'common' }, { rarity: 'mitica', maxLevel: 4 }, { rarity: 'rara-sin-datos' }
  ]);
  assert.deepEqual(J(info[0]), { rk: 'epic', inicio: 6, max: 16 });
  assert.deepEqual(J(info[1]), { rk: 'champion', inicio: 11, max: 16 });
  assert.deepEqual(J(info[2]), { rk: 'common', inicio: 1, max: 16 });          // sin maxLevel: usa el nivel máximo absoluto
  assert.deepEqual(J(info[3]), { rk: 'mitica', inicio: 13, max: 16 });         // rareza que el jugador no tiene: 16 - maxLevel
  assert.deepEqual(J(info[4]), { rk: 'rara-sin-datos', inicio: null, max: null }); // ni desfase ni maxLevel: no se puede calcular
});

test('_oroBloqueadasHastaNivel suma las subidas desde el nivel inicial de cada rareza hasta el nivel pedido', () => {
  const t = cargar().__t; t.niveles(DIF, 16);
  const idx = t._indiceCostosOro([{ rarity: 'common', costosNiveles: filasOro(1, 16) }]);
  const info = t._infoCartasBloqueadas([{ rarity: 'epic', maxLevel: 11 }]);       // empieza en el 6
  assert.deepEqual(J(t._oroBloqueadasHastaNivel(info, idx, 8)), { oro: 600 + 700, incompleto: false });
  assert.deepEqual(J(t._oroBloqueadasHastaNivel(info, idx, 6)), { oro: 0, incompleto: false });   // ya está en ese nivel
  assert.deepEqual(J(t._oroBloqueadasHastaNivel(info, idx, 16)), { oro: 600 + 700 + 800 + 900 + 1000 + 1100 + 1200 + 1300 + 1400 + 1500, incompleto: false });
  assert.deepEqual(J(t._oroBloqueadasHastaNivel(info, idx, 20)), J(t._oroBloqueadasHastaNivel(info, idx, 16))); // no pasa de su nivel máximo
});

test('el desfase cambia el costo: la misma tabla cuesta menos para una carta que se desbloquea más arriba', () => {
  const t = cargar().__t; t.niveles(DIF, 16);
  const idx = t._indiceCostosOro([{ rarity: 'common', costosNiveles: filasOro(1, 16) }]);
  const total = rareza => t._oroBloqueadasHastaNivel(t._infoCartasBloqueadas([{ rarity: rareza, maxLevel: 16 - DIF[rareza] }]), idx, 16).oro;
  assert.ok(total('common') > total('rare') && total('rare') > total('epic') && total('epic') > total('legendary') && total('legendary') > total('champion'));
  assert.equal(total('champion'), 1100 + 1200 + 1300 + 1400 + 1500);
});

test('prefiere el costo de la misma rareza y cae al de cualquier rareza; si falta un nivel avisa con incompleto', () => {
  const t = cargar().__t; t.niveles(DIF, 16);
  const info = t._infoCartasBloqueadas([{ rarity: 'epic', maxLevel: 11 }]);
  const propio = t._indiceCostosOro([{ rarity: 'common', costosNiveles: filasOro(6, 8) }, { rarity: 'epic', costosNiveles: [{ desde: 6, hasta: 7, oro: 999 }] }]);
  assert.deepEqual(J(t._oroBloqueadasHastaNivel(info, propio, 8)), { oro: 999 + 700, incompleto: false });
  const sinNivel7 = t._indiceCostosOro([{ rarity: 'common', costosNiveles: filasOro(6, 7) }]);
  assert.deepEqual(J(t._oroBloqueadasHastaNivel(info, sinNivel7, 9)), { oro: 600, incompleto: true });   // sube del 6 al 7 y se detiene: no hay costo del 7 al 8
  assert.equal(t._oroBloqueadasHastaNivel(t._infoCartasBloqueadas([{ rarity: 'rara-sin-datos' }]), propio, 9).incompleto, true);
});

test('perfil.html: el oro de las bloqueadas va en la misma celda, debajo del de las desbloqueadas', () => {
  assert.match(html, /\$\{_oroBloqHtml\(_oroBloqueadasHastaNivel\(_infoBloq, _idxOro, n\), n\)\}/);
  assert.match(html, /\.cc-oro-bloq\{/);
});

test('la tabla de costos lleva roles ARIA explícitos (en móvil las filas pasan a bloques y el navegador pierde la semántica de tabla)', () => {
  const t = cargar().__t;
  const tabla = t._tablaEvoHeroeHtml(t._evoHeroeResumen(CARTAS, BLOQUEADAS));
  assert.match(tabla, /<table class="costo-tabla costo-tabla-evo" role="table">/);
  assert.equal((tabla.match(/role="columnheader"/g) || []).length, 6);
  assert.equal((tabla.match(/<tr role="row">/g) || []).length, 3);   // encabezado + evolución + héroe
  assert.equal((tabla.match(/role="cell"/g) || []).length, 12);      // 2 filas x 6 celdas
  assert.equal((tabla.match(/<td(?![^>]*role="cell")/g) || []).length, 0, 'toda celda lleva role="cell"');
});

test('perfil.html: en móvil la tabla de costos pasa a una tarjeta por variante y los números del diagrama suben de tamaño', () => {
  const m = html.match(/@media \(max-width:560px\)\{\s*\.venn-num\{[\s\S]*?\n  \}\n/);
  assert.ok(m, 'no se encontró el bloque @media (max-width:560px) del diagrama y la tabla de costos');
  assert.match(m[0], /\.venn-num\{font-size:22px;\}/);
  assert.match(m[0], /\.venn-num-chico\{font-size:18px;\}/);
  for (const [n, nombre] of [[2, 'Existen'], [3, 'Tienes'], [4, 'Faltan'], [5, 'Cada una'], [6, 'Para las que faltan']]) {
    assert.ok(m[0].includes(`td:nth-child(${n})::before{content:"${nombre}";}`), `falta la etiqueta de la columna ${n}: ${nombre}`);
  }
});

test('diagrama: los números de «solo evolución» y «solo héroe» van centrados en su región y el par del centro, en la lente (20-oct-2026)', () => {
  const t = cargar().__t;
  const svg = t._vennEvoHeroeHtml(t._evoHeroeResumen(CARTAS, BLOQUEADAS));
  const x = re => Number(svg.match(re)[1]);
  // Círculos: evolución cx 205, héroe cx 315, radio 92 -> solo evolución 113..223, lente 223..297, solo héroe 297..407.
  assert.equal(x(/class="venn-num" x="([\d.]+)"/), (113 + 223) / 2);
  const nums = [...svg.matchAll(/class="venn-num" x="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(nums[1], (297 + 407) / 2);
  const pt = x(/class="venn-pt venn-pt--evo" cx="([\d.]+)"/);
  assert.ok(pt > 223 && pt < 260, 'el par de la lente queda desplazado hacia el centro de la lente (260)');
});

test('la tabla de fragmentos y monedas centra encabezados y valores en pantalla ancha, sin tocar el móvil (20-oct-2026)', () => {
  const t = cargar().__t;
  assert.match(t._tablaEvoHeroeHtml(t._evoHeroeResumen(CARTAS, BLOQUEADAS)), /<table class="costo-tabla costo-tabla-evo" role="table">/);
  const m = html.match(/@media \(min-width:561px\)\{\s*\.col-modal-scroll \.costo-tabla\.costo-tabla-evo th[^}]*text-align:center;\}[\s\S]*?\n  \}\n/);
  assert.ok(m, 'regla de centrado dentro de @media (min-width:561px)');
  ['th', 'td', 'td.num', 'th.num'].forEach(sel => assert.ok(m[0].includes(`.costo-tabla-evo ${sel}`), sel));
});

test('en esa tabla solo los valores de la columna Variante van a la izquierda; los encabezados y el resto, centrados (20-oct-2026)', () => {
  const m = html.match(/@media \(min-width:561px\)\{\s*\.col-modal-scroll \.costo-tabla\.costo-tabla-evo th[\s\S]*?\n  \}\n/);
  assert.ok(m, 'bloque de alineación de la tabla de fragmentos y monedas');
  assert.match(m[0], /costo-tabla-evo th\.num\{text-align:center;\}/, 'encabezados y columnas numéricas centrados');
  assert.match(m[0], /\.costo-tabla\.costo-tabla-evo td:first-child\{text-align:left;\}/, 'valores de Variante a la izquierda');
  assert.ok(!/th:first-child/.test(m[0]), 'el encabezado «Variante» sigue centrado');
});
