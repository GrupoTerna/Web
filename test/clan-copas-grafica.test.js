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

// NUEVO (12-oct-2026, pedido de la usuaria): eje X como el de perfil.html, solo días de guerra (jueves a domingo).
// 01/10/2026 es jueves: 01-04 y 08-11 son jueves a domingo; 05-07 y 12-14 son lunes a miércoles (entrenamiento).
const dia = (d, copas) => ({ fecha: `${String(d).padStart(2, '0')}/10/2026`, copas });
const fechasRotuladas = svg => [...svg.matchAll(/rotate\(-45[^>]*>(\d\d\/\d\d)</g)].map(m => m[1]);

test('descarta lunes a miércoles; con más de 7 días rotula solo domingos, letra J V S D por punto y una línea por domingo', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg(Array.from({ length: 14 }, (_, i) => dia(i + 1, 138000 + i * 10)));
  assert.equal((svg.match(/class="cd-copas-pt"/g) || []).length, 8, 'solo los 8 días de guerra');
  assert.equal((svg.match(/class="cd-copas-domingo"/g) || []).length, 2, 'domingos 04/10 y 11/10');
  assert.equal((svg.match(/cd-copas-label-dia/g) || []).length, 8, 'una letra por día de guerra');
  assert.ok(svg.includes('>J</text>') && svg.includes('>V</text>') && svg.includes('>S</text>') && svg.includes('>D</text>'));
  assert.ok(!svg.includes('>L</text>') && !svg.includes('>M</text>') && !svg.includes('>X</text>'), 'sin letras de entrenamiento');
  assert.equal(JSON.stringify(fechasRotuladas(svg)), JSON.stringify(['04/10', '11/10']));
  assert.ok(!svg.includes('cd-copas-pt-vacio'), 'no hace falta placeholder: ambas semanas traen domingo');
});

test('si la semana no trae domingo deja un placeholder con esa fecha, hueco y con valor interpolado', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg([dia(1, 138000), dia(2, 138100), dia(3, 138200)]); // jueves a sábado
  assert.equal((svg.match(/class="cd-copas-pt"/g) || []).length, 3);
  assert.equal((svg.match(/cd-copas-pt cd-copas-pt-vacio/g) || []).length, 1, 'placeholder del domingo 04/10');
  assert.ok(svg.includes('04/10/2026: sin dato todavía'));
  assert.equal((svg.match(/class="cd-copas-domingo"/g) || []).length, 1);
  assert.ok(svg.includes('>D</text>'));
  assert.equal(JSON.stringify(fechasRotuladas(svg)), JSON.stringify(['01/10', '02/10', '03/10', '04/10']), 'con 7 o menos se rotulan todas');
  assert.ok(svg.includes('cd-copas-linea cd-copas-linea-disc'), 'el tramo hacia el placeholder va punteado');
  assert.ok(svg.includes('Punto solo con borde'));
  assert.ok(svg.includes('>Fecha</text>') && svg.includes('cd-copas-leyenda'));
});

test('el domingo que falta entre dos semanas se interpola entre el sábado y el jueves siguiente', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg([dia(1, 138000), dia(2, 138000), dia(3, 138000), dia(8, 138400), dia(9, 138400), dia(10, 138400), dia(11, 138400)]);
  assert.ok(svg.includes('04/10/2026: sin dato todavía (valor estimado, 138,0') || svg.includes('04/10/2026: sin dato todavía (valor estimado, 138.0'), 'domingo 04/10 interpolado: ~138 080 (1 de los 5 días entre el sábado 03 y el jueves 08)');
  assert.equal((svg.match(/cd-copas-pt cd-copas-pt-vacio/g) || []).length, 1);
  assert.equal((svg.match(/class="cd-copas-domingo"/g) || []).length, 2);
});

test('solo con lunes a miércoles no hay días de guerra y muestra un aviso', () => {
  const w = cargar();
  const svg = w.__t.clanCopasSvg([dia(5, 138000), dia(6, 138100)]);
  assert.ok(svg.includes('chart-empty') && !svg.includes('<svg'));
});
