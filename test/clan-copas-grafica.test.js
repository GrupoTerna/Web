'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (12-oct-2026, pedido de la usuaria): tarjeta «Copas del clan» de clan.html (webClanCopas, Guerra_Logs).
// Como perfil-copas-grafica.test.js: se extraen del <script> inline REAL las funciones por nombre.
// LÍMITE: prueba el SVG y los avisos generados, no cómo se ve en un navegador ni el endpoint real.

const html = fs.readFileSync(path.join(__dirname, '..', 'clan.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function clanCopasSvg'));
assert.ok(grande, 'no se encontró clanCopasSvg en un <script> inline de clan.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  const esAsync = src.slice(Math.max(0, ini - 6), ini) === 'async ';
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return (esAsync ? 'async ' : '') + src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}
const CODIGO = ['clanCopasSvg', 'clanCopasAviso', 'cargarCopasClan'].map(n => extraerFuncion(grande, n)).join('\n') +
  '\nwindow.__t = { clanCopasSvg, cargarCopasClan };';

function cargar(apiGetFalso){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js'], '<div id="clanCopasWrap"></div>');
  window.apiGet = apiGetFalso || (async () => ({ puntos: [] }));
  window.eval(CODIGO);
  return window;
}
const pts = (valores) => valores.map((copas, i) => ({ fecha: `${String(i + 1).padStart(2, '0')}/10/2026`, copas }));

test('dibuja un punto por día, la línea y un eje que no arranca en 0', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg(pts([138244, 138244, 138900, 138300]));
  assert.equal((svg.match(/class="cd-copas-pt"/g) || []).length, 4);
  assert.ok(svg.includes('class="cd-copas-linea"'));
  assert.equal((svg.match(/class="cd-copas-grid"/g) || []).length, 5, 'cinco marcas en el eje Y');
  assert.ok(!svg.includes('>0<'), 'con base 0 la línea sería plana');
  assert.ok(svg.includes('aria-label="01/10/2026: 138,244 copas"') || svg.includes('aria-label="01/10/2026: 138.244 copas"') || svg.includes('138244 copas'), 'cada punto lleva su texto accesible');
});

test('con todos los valores iguales no divide por cero ni da NaN', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg(pts([5000, 5000, 5000]));
  assert.ok(!svg.includes('NaN') && !svg.includes('Infinity'));
});

test('con un solo punto no dibuja línea', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg(pts([138244]));
  assert.ok(!svg.includes('cd-copas-linea"'));
  assert.equal((svg.match(/class="cd-copas-pt"/g) || []).length, 1);
});

test('cargarCopasClan pide el tag del clan y pinta la gráfica', async () => {
  let pedido = null;
  const w = cargar(async (accion, params) => { pedido = { accion, params }; return { puntos: [{ fecha: '10/10/2026', copas: 138244 }, { fecha: '11/10/2026', copas: 138300 }, { fecha: '12/10/2026', copas: 0 }] }; });
  await w.__t.cargarCopasClan({ clanTag: '#GLPC8YQGV' });
  assert.equal(JSON.stringify(pedido), JSON.stringify({ accion: 'webClanCopas', params: { tag: '#GLPC8YQGV' } }));
  const salida = w.document.getElementById('clanCopasWrap').innerHTML;
  assert.equal((salida.match(/class="cd-copas-pt"/g) || []).length, 2, 'las copas en 0 no se grafican');
});

test('sin datos, sin tag o con error de red muestra un aviso en vez de una gráfica vacía', async () => {
  let w = cargar();
  await w.__t.cargarCopasClan({ clanTag: '#GLPC8YQGV' });
  assert.ok(w.document.getElementById('clanCopasWrap').innerHTML.includes('chart-empty'));
  w = cargar();
  await w.__t.cargarCopasClan({});
  assert.ok(w.document.getElementById('clanCopasWrap').innerHTML.includes('No se pudo identificar'));
  w = cargar(async () => { throw new Error('Sin conexión'); });
  await w.__t.cargarCopasClan({ clanTag: '#GLPC8YQGV' });
  const salida = w.document.getElementById('clanCopasWrap').innerHTML;
  assert.ok(salida.includes('No se pudo cargar') && salida.includes('Sin conexión') && !salida.includes('<svg'));
});

// NUEVO (12-oct-2026, pedido de la usuaria): eje X como el de perfil.html. 01/10/2026 es jueves.
test('con más de 7 días solo rotula las fechas de los domingos, pone letra a cada día y una línea por domingo', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg(pts(Array.from({ length: 14 }, (_, i) => 138000 + i * 10)));
  assert.equal((svg.match(/class="cd-copas-domingo"/g) || []).length, 2, 'domingos 04/10 y 11/10');
  assert.equal((svg.match(/cd-copas-label-dia/g) || []).length, 14, 'una letra por día');
  assert.ok(svg.includes('>J</text>') && svg.includes('>V</text>') && svg.includes('>S</text>') && svg.includes('>D</text>'));
  const fechasRotuladas = [...svg.matchAll(/rotate\(-45[^>]*>(\d\d\/\d\d)</g)].map(m => m[1]);
  assert.equal(JSON.stringify(fechasRotuladas), JSON.stringify(['04/10', '11/10']));
});

test('con 7 días o menos rotula todas las fechas; trae el título «Fecha» y la leyenda de series', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg(pts([138000, 138100, 138200])); // jueves a sábado: sin domingo
  assert.equal(([...svg.matchAll(/rotate\(-45[^>]*>(\d\d\/\d\d)</g)]).length, 3);
  assert.ok(svg.includes('>Fecha</text>'));
  assert.ok(svg.includes('cd-copas-leyenda') && svg.includes('Copas del clan'));
  assert.ok(!svg.includes('cd-copas-domingo'), 'sin domingos no hay línea ni su leyenda');
});
