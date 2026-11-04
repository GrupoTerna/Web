'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (12-oct-2026, pedido de la usuaria): eje X de las gráficas de perfil.html: pocas fechas = todas; muchas = solo domingos; sin domingo = placeholder
// interpolado con esa fecha. Mismo método que perfil-tope-grafica.test.js (funciones extraídas del <script> inline real). LÍMITE: prueba el SVG, no un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'perfil.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function perfilLineChartSvg'));
assert.ok(grande, 'no se encontró perfilLineChartSvg en un <script> inline de perfil.html');

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
const NOMBRES = ['parseFechaDDMMYYYY', 'semanaLabelCortaPerfil', 'filtrarDiasGuerraPerfil', 'puntosSobreTope',
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'filtrarUltimasTemporadasPerfil', 'barraVistaPerfilHtml', 'repintarGraficasPerfil', 'activarTooltipEjeXPerfil', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil'];
const CODIGO = NOMBRES.map(n => extraerFuncion(grande, n)).join('\n') +
  "\nconst PERFIL_VISTA = { ultimas6: true, zoom: 1 }; const PERFIL_ZOOMS = [1, 1.5, 2, 3, 4, 6]; const PERFIL_TEMPORADAS_VISTA = 6; const PERFIL_GRAFICAS_PINTADAS = new Map(); const COLOR_SERIE_PERFIL = '#a239ff'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
  '\nwindow.__t = { perfilLineChartSvg, pintarGraficaPerfil, puntosSobreTope, filtrarDiasGuerraPerfil, etiquetaPuntoPerfil, htmlTooltipPuntoPerfil };';

function cargar(){
  const window = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/timeline-svg.js'], '<div id="g"></div>');
  window.eval(CODIGO);
  return window;
}


// 2026-10-01 es jueves.
const pt = (semana, valor, real = true) => ({ semana, valor, real, clan: 'Terna' });
const rotuladas = svg => [...svg.matchAll(/rotate\(-45[^>]*>(\d\d\/\d\d)</g)].map(m => m[1]);
const huecos = svg => (svg.match(/ing-serie-pt serie-pt-vacio/g) || []).length;

test('con más de 7 días rotula solo las fechas de los domingos', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(['01', '02', '03', '04', '08', '09', '10', '11'].map((d, i) => pt(`${d}/10/2026`, 10 + i)), {});
  assert.equal(JSON.stringify(rotuladas(svg)), JSON.stringify(['04/10', '11/10']));
  assert.equal((svg.match(/class="linea-domingo"/g) || []).length, 2);
  assert.equal(huecos(svg), 0, 'ambas semanas traen domingo: no hay placeholder');
});

test('con 7 días o menos rotula todos, y si falta el domingo agrega un placeholder con esa fecha', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 10), pt('02/10/2026', 20), pt('03/10/2026', 30)], {});
  assert.equal(JSON.stringify(rotuladas(svg)), JSON.stringify(['01/10', '02/10', '03/10', '04/10']));
  assert.equal(huecos(svg), 1);
  assert.equal((svg.match(/class="linea-domingo"/g) || []).length, 1);
  assert.ok(svg.includes('>D</text>'));
  assert.ok(svg.includes('data-semana="04/10/2026"'));
  assert.ok(svg.includes('data-valor="30"'), 'sin vecino posterior mantiene el último valor');
});

test('el domingo que falta entre dos semanas se interpola entre el sábado y el jueves siguiente; con más de 7 puntos solo rotula domingos', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 100), pt('02/10/2026', 100), pt('03/10/2026', 100),
    pt('08/10/2026', 600), pt('09/10/2026', 600), pt('10/10/2026', 600), pt('11/10/2026', 600)], {});
  assert.equal(huecos(svg), 1);
  assert.ok(svg.includes('data-semana="04/10/2026"') && svg.includes('data-valor="200"'), '04/10: 1 de los 5 días entre el 03 (100) y el 08 (600)');
  assert.equal(JSON.stringify(rotuladas(svg)), JSON.stringify(['04/10', '11/10']));
});

test('un domingo ya presente como hueco sin dato no se duplica con un placeholder', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('02/10/2026', 5), pt('03/10/2026', 6), pt('04/10/2026', 0, false)], {});
  assert.equal(huecos(svg), 1);
  assert.equal((svg.match(/data-semana="04\/10\/2026"/g) || []).length, 1);
});

test('el placeholder no cuenta como anomalía ni altera el aviso de topes', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg([pt('01/10/2026', 3), pt('02/10/2026', 4), pt('03/10/2026', 4)], { tope: 4 });
  assert.ok(!svg.includes('serie-pt-anomalia'));
});

// §PF348 (3-nov-2026, pedido de la usuaria): con muchos datos en el eje X las fechas se pisaban; ahora la letra se achica y, si ni así caben, se omiten algunas.
// Semanas de guerra (jueves a domingo) consecutivas desde el jueves 03/10/2024.
function semanasDeGuerra(cantidad){
  const salida = [];
  const inicio = Date.UTC(2024, 9, 3);
  for (let s = 0; s < cantidad; s++){
    for (let d = 0; d < 4; d++){
      const f = new Date(inicio + (s * 7 + d) * 86400000);
      salida.push(pt(`${String(f.getUTCDate()).padStart(2, '0')}/${String(f.getUTCMonth() + 1).padStart(2, '0')}/${f.getUTCFullYear()}`, 8 + d));
    }
  }
  return salida;
}
const tamanosFechas = svg => [...svg.matchAll(/<text class="ing-axis-label"[^>]*rotate\(-45[^>]*?(?:style="font-size:([\d.]+)px")?>\d\d\/\d\d</g)].map(m => m[1] ? Number(m[1]) : 15);
const letrasDia = svg => (svg.match(/ing-axis-label-dia/g) || []).length;

test('tamanoLetraEjeXRotado: cabe todo, se achica, o se omiten etiquetas', () => {
  const w = cargar();
  const f = (sep) => JSON.stringify(w.tamanoLetraEjeXRotado(sep, 15, 7));
  assert.equal(f(100), '{"fs":15,"cada":1}');
  assert.equal(f(17), '{"fs":10,"cada":1}');
  assert.equal(f(5), '{"fs":7,"cada":3}'); // ni con 7 caben: una de cada N
  assert.equal(f(0), '{"fs":7,"cada":1}');
});

test('con pocas semanas las fechas y las letras J V S D conservan su tamaño de siempre', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(semanasDeGuerra(8), {});
  assert.ok(!/ing-axis-label"[^>]*style=/.test(svg), 'las fechas no llevan tamaño propio');
  assert.ok(!/ing-axis-label-dia"[^>]*style=/.test(svg), 'las letras no llevan tamaño propio');
  assert.equal(letrasDia(svg), 32);
});

test('con muchas semanas las fechas se achican pero nunca bajan de 7 y todas siguen rotuladas si caben', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(semanasDeGuerra(60), {}); // 240 puntos
  const t = tamanosFechas(svg);
  assert.ok(t.length > 0);
  assert.ok(t.every(x => x >= 7 && x < 15), 'tamaños: ' + t.join(','));
  assert.equal(t.length, 60, 'una fecha por domingo mientras caben con 7 o más');
});

test('con muchísimos puntos las fechas bajan a 7 y se omiten algunas; la fila J V S D desaparece', () => {
  const w = cargar();
  const svg = w.__t.perfilLineChartSvg(semanasDeGuerra(110), {}); // 440 puntos
  const t = tamanosFechas(svg);
  assert.ok(t.length > 0 && t.length < 110, 'se omiten fechas: ' + t.length);
  assert.ok(t.every(x => x === 7), 'tamaños: ' + t.join(','));
  assert.equal(letrasDia(svg), 0, 'letras ilegibles: se omiten');
  // la última fecha (la más reciente) siempre se rotula
  const ultima = [...svg.matchAll(/rotate\(-45[^>]*>(\d\d\/\d\d)</g)].map(m => m[1]).pop();
  assert.equal(ultima, '08/11'); // domingo de la semana 110 (03/10/2024 + 109 semanas + 3 días)
});
