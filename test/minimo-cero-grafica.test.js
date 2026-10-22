'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (19-oct-2026, pedido de la usuaria): ataques, barcos y medallas nunca pueden ser menores que cero.
// Las gráficas de perfil.html y directorio.html (Ingresos recientes y Cara a cara) tienen ese mínimo, pero
// su línea punteada «Mínimo: 0» SOLO se dibuja si hay algún valor por debajo; entonces el eje baja hasta
// incluirlo, el punto sale como anomalía (rojo) y se avisa. Sin negativos todo queda como antes.
// Se extraen de los <script> inline REALES las funciones por nombre. LÍMITE: SVG con DOM simulado.

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
const scriptDe = (archivo, marca) => {
  const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  const t = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(x => x.includes(marca));
  assert.ok(t, `no se encontró ${marca} en ${archivo}`);
  return t;
};
const UTIL = ['assets/js/util.js', 'assets/js/features/timeline-svg.js'];

// ---------------- perfil.html ----------------
const PERFIL = scriptDe('perfil.html', 'function perfilLineChartSvg');
const NOMBRES_PERFIL = ['parseFechaDDMMYYYY', 'fmtFechaLargaDDMMYYYYPerfil', 'semanaLabelCortaPerfil', 'filtrarDiasGuerraPerfil', 'puntosSobreTope',
  'ordenarHistorialPorSemana', 'completarSemanasSinDato', '_periodIndexRegistro', '_historialDiasGuerra', '_valoresDiariosDesdeAcumulado',
  'textoTemporadaSemanaDiaPerfil', 'attrsTemporadaSemanaDiaPerfil', 'perfilLineChartSvg', 'leyendaPuntosGraficaHtml', 'pintarGraficaPerfil', 'etiquetaPuntoPerfil', 'htmlTooltipPuntoPerfil', 'renderMetricaSemanal'];
function cargarPerfil(){
  const w = loadBrowserScriptsWithDom(UTIL, '<section id="mChartCard"><div id="mChart"></div></section>');
  w.eval(NOMBRES_PERFIL.map(n => extraerFuncion(PERFIL, n)).join('\n') +
    "\nconst TOPE_ATAQUES_DIA = 4; const COLOR_SERIE_PERFIL = '#a239ff'; const COLOR_SERIE_ACUMULADO_PERFIL = '#3ddc97'; let perfilGraficaCtx = { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna' };" +
    '\nwindow.__t = { renderMetricaSemanal, htmlTooltipPuntoPerfil, etiquetaPuntoPerfil };');
  return w;
}
const reg = (fecha, ataques, barcos, puntaje) => ({ semana: fecha, ataques, barcos, puntaje, clan: 'Terna' });
const SEM = [reg('01/10/2026', 4, 2, 800), reg('02/10/2026', 8, 5, 1700), reg('03/10/2026', 12, 9, 2600), reg('04/10/2026', 16, 13, 3500)];
const pintarPerfil = (w, h, campo, opts) => { w.__t.renderMetricaSemanal('mChart', h, campo, Object.assign({ tituloEje: 'Ataques' }, opts)); return w.document.getElementById('mChart'); };

test('perfil: sin valores negativos no hay línea de mínimo ni aviso, y el eje sigue empezando en 0', () => {
  const w = cargarPerfil();
  const wrap = pintarPerfil(w, SEM, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.equal(wrap.querySelectorAll('.linea-minimo').length, 0);
  assert.ok(!wrap.textContent.includes('Mínimo'));
  assert.ok(!wrap.textContent.includes('por debajo del mínimo'));
  assert.ok(!wrap.innerHTML.includes('>-'), 'ninguna marca negativa en el eje');
});

test('perfil: con un valor por debajo de cero aparece la línea «Mínimo: 0», el eje baja y el punto sale rojo con aviso', () => {
  const w = cargarPerfil();
  const h = SEM.map(r => Object.assign({}, r));
  h[1].ataques = -3; // viernes: contador negativo → valor diario negativo
  const wrap = pintarPerfil(w, h, 'ataques', { tope: 4, topeSemanal: 16 });
  assert.equal(wrap.querySelectorAll('.linea-minimo').length, 1);
  assert.ok(wrap.textContent.includes('Mínimo: 0'));
  const rojos = [...wrap.querySelectorAll('.ing-serie-pt')].filter(c => c.dataset.minimo === '0');
  assert.ok(rojos.length >= 1 && rojos.every(c => c.classList.contains('serie-pt-anomalia')));
  assert.ok(/>-\d/.test(wrap.innerHTML), 'el eje tiene marcas negativas');
  assert.ok(wrap.textContent.includes('por debajo del mínimo de 0'));
  assert.ok(w.__t.htmlTooltipPuntoPerfil(rojos[0]).includes('Por debajo del mínimo de 0'));
  assert.ok(w.__t.etiquetaPuntoPerfil(rojos[0]).includes('por debajo del mínimo'));
});

test('perfil: el punto negativo queda por debajo de la línea del mínimo', () => {
  const w = cargarPerfil();
  const h = SEM.map(r => Object.assign({}, r));
  h[1].ataques = -3;
  const wrap = pintarPerfil(w, h, 'ataques', { tope: 4 });
  const y = Number(wrap.querySelector('.linea-minimo').getAttribute('y1'));
  const punto = [...wrap.querySelectorAll('.ing-serie-pt')].find(c => c.dataset.minimo === '0');
  assert.ok(Number(punto.getAttribute('cy')) > y, 'el punto negativo queda por debajo de la línea del mínimo');
});

// ---------------- directorio.html: Ingresos recientes ----------------
const DIR = scriptDe('directorio.html', 'function lineChartSvg');
const NOMBRES_DIR = ['semanaLabel', 'semanaOrden', 'numeroSemanaVieja', 'semanaLabelCorta', 'construirFechasEstimadasSemanasViejas',
  'fmtFechaCortaDDMM', 'fmtFechaLargaDDMMYYYY', 'textoTemporadaSemanaDiaIngreso', 'attrsTemporadaSemanaDiaIngreso', 'lineChartSvg', 'etiquetaPuntoIngreso', 'htmlTooltipPuntoIngreso', 'guerraComparadorMetricaSvg', 'fmtFecha'];
function cargarDir(){
  const w = loadBrowserScriptsWithDom(UTIL, '<div id="g"></div>');
  w.eval("const PALETA_SERIES = ['#a239ff','#f3a922','#3ddc97'];\n" + NOMBRES_DIR.map(n => extraerFuncion(DIR, n)).join('\n') +
    '\nwindow.__t = { lineChartSvg, htmlTooltipPuntoIngreso, guerraComparadorMetricaSvg };');
  return w;
}
const SEMANAS = ['07/09/2026', '14/09/2026', '21/09/2026', '28/09/2026'];
const miembro = (valores, campo) => ({ nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna',
  historialSemanal: SEMANAS.map((semana, i) => ({ semana, clan: 'Terna', [campo]: valores[i] })) });

test('ingresos recientes: sin negativos no hay línea de mínimo y las marcas del eje no cambian', () => {
  const w = cargarDir();
  const svg = w.__t.lineChartSvg([miembro([16, 12, 8, 16], 'ataques')], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16, minimo: 0 });
  assert.ok(!svg.includes('linea-minimo') && !svg.includes('data-minimo'));
  assert.ok(!svg.includes('>-'));
  const sinOpcion = w.__t.lineChartSvg([miembro([16, 12, 8, 16], 'ataques')], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16 });
  assert.equal(svg, sinOpcion, 'con minimo:0 y sin negativos el SVG es idéntico al de antes');
});

test('ingresos recientes: un valor negativo dibuja «Mínimo: 0», baja el eje y pinta el punto rojo', () => {
  const w = cargarDir();
  const svg = w.__t.lineChartSvg([miembro([16, -4, 8, 16], 'ataques')], 'ataques', SEMANAS, { unidad: 'ataques', tope: 16, minimo: 0 });
  assert.equal((svg.match(/class="linea-minimo"/g) || []).length, 1);
  assert.ok(svg.includes('Mínimo: 0'));
  assert.equal((svg.match(/data-minimo="0"/g) || []).length, 1);
  assert.equal((svg.match(/serie-pt-anomalia/g) || []).length, 1);
  assert.ok(/>-\d/.test(svg), 'marcas negativas en el eje');
  const pt = loadPunto(w, { valor: '-4', minimo: '0' });
  assert.ok(w.__t.htmlTooltipPuntoIngreso(pt).includes('Por debajo del mínimo de 0'));
});
function loadPunto(w, extra){
  const pt = w.document.createElement('circle');
  Object.assign(pt.dataset, { nombre: 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna', semana: '14/09/2026', unidad: 'ataques' }, extra);
  return pt;
}

// ---------------- directorio.html: Cara a cara ----------------
const fila = (fecha, v) => ({ fecha, ataques: v, fame: v, barcos: v });
const FECHAS = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
const indice = new Map(FECHAS.map((f, i) => [f, i]));
const cc = (w, a, b) => w.__t.guerraComparadorMetricaSvg(a, b, 'ataques', 'Ataques', FECHAS, indice, 'Ana', 'Terna', 'Beto', 'Terna 2');

test('cara a cara: sin negativos no se dibuja la línea de mínimo y el piso sigue en 0', () => {
  const w = cargarDir();
  const svg = cc(w, FECHAS.map((f, i) => fila(f, 4 + i)), FECHAS.map((f, i) => fila(f, 3 + i)));
  assert.ok(!svg.includes('linea-minimo') && !svg.includes('Mínimo'));
  assert.ok(!svg.includes('>-'));
});

test('cara a cara: un valor negativo dibuja «Mínimo: 0», baja el eje y pinta el punto rojo con aviso', () => {
  const w = cargarDir();
  const svg = cc(w, FECHAS.map((f, i) => fila(f, i === 1 ? -5 : 4)), FECHAS.map((f, i) => fila(f, 3 + i)));
  assert.equal((svg.match(/class="linea-minimo"/g) || []).length, 1);
  assert.ok(svg.includes('Mínimo: 0'));
  assert.ok(/>-\d/.test(svg), 'marcas negativas en el eje');
  assert.equal((svg.match(/fill="var\(--danger\)"/g) || []).length, 1);
  assert.ok(svg.includes('Por debajo del mínimo de 0'));
});
