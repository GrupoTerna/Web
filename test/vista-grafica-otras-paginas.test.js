'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (04-nov-2026, pedido de la usuaria, §PF353): las características de las gráficas del perfil (§PF352) —pastilla «Últimas 6 temporadas», zoom +/− con
// barra de desplazamiento y tooltip grande con la fecha en el eje X— ahora también están en el resto de la web, salvo las minigráficas: copas del clan
// (clan.html), «Ataques/Medallas/Barcos por semana» de Ingresos recientes y «Cara a cara» (directorio.html). Todo sale de assets/js/features/vista-grafica.js.
// Mismo método que perfil-vista-grafica.test.js: las funciones de las páginas se extraen por nombre del <script> inline real.
// LÍMITE: jsdom no hace layout; el tamaño del <svg> se simula con getBoundingClientRect y no se prueba el aspecto en un navegador real.

const UTIL = ['assets/js/util.js', 'assets/js/features/timeline-svg.js', 'assets/js/features/vista-grafica.js'];

function scriptDe(pagina, marca){
  const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
  const s = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes(marca));
  assert.ok(s, `no se encontró ${marca} en un <script> inline de ${pagina}`);
  return s;
}
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
// jsdom no comparte los const de un eval con el siguiente: las constantes de vista-grafica.js que usan las páginas se declaran de nuevo en el código extraído.
const CONST_VISTA = 'const VISTA_GRAFICA_TEMPORADAS = 6;\n';

const dd = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// 14 domingos separados por 35 días desde 2026-01-04 (domingo): cubren más de 6 temporadas.
function domingos(n = 14){
  const out = [];
  const d = new Date(2026, 0, 4);
  for (let i = 0; i < n; i++){ out.push(new Date(d)); d.setDate(d.getDate() + 35); }
  return out;
}
const attrJson = v => JSON.stringify(v).replace(/"/g, '&quot;');

// ---------------- vista-grafica.js ----------------
function cargarVista(){ return loadBrowserScriptsWithDom(UTIL, '<div id="g"></div><div id="g2"></div>'); }

test('vistaGraficaFecha lee dd/MM/yyyy (con hora), yyyy-MM-dd y Date; lo demás es null', () => {
  const w = cargarVista();
  assert.equal(w.vistaGraficaFmtFecha(w.vistaGraficaFecha('07/09/2026')), '07/09/2026');
  assert.equal(w.vistaGraficaFmtFecha(w.vistaGraficaFecha('07/09/2026 00:00:00')), '07/09/2026');
  assert.equal(w.vistaGraficaFmtFecha(w.vistaGraficaFecha('2026-10-04')), '04/10/2026');
  assert.equal(w.vistaGraficaFecha('Semana 12'), null);
  assert.equal(w.vistaGraficaFecha(null), null);
  assert.equal(w.vistaGraficaFecha(new w.Date(2026, 9, 4)).getMonth(), 9);
});

test('vistaGraficaVisibles deja las últimas N temporadas, conserva las fechas ilegibles y cuenta el total', () => {
  const w = cargarVista();
  const ds = domingos();
  const r = w.vistaGraficaVisibles(ds, 6);
  assert.ok(r.recortado && r.total > 6);
  assert.equal(r.visibles[ds.length - 1], true, 'conserva lo más reciente');
  assert.equal(r.visibles[0], false, 'quita lo más antiguo');
  const conNula = w.vistaGraficaVisibles([null].concat(ds), 6);
  assert.equal(conNula.visibles[0], true, 'una fecha ilegible se conserva');
  const pocas = w.vistaGraficaVisibles(ds.slice(-3), 6);
  assert.equal(pocas.recortado, false);
  assert.ok(pocas.visibles.every(Boolean));
  const todo = w.vistaGraficaVisibles(ds, Infinity);
  assert.equal(todo.recortado, false);
  assert.equal(todo.total, r.total);
});

// SVG de prueba: 5 posiciones; el recuadro de trazado va de x=100 a x=900 y termina en y=200 (viewBox 1000×300).
function svgPrueba(zoom){
  const W = Math.round(1000 * zoom);
  const fechas = ['01/10/2026', '02/10/2026', '03/10/2026', '≈ 04/10/2026 (estimada)', '05/10/2026'];
  return `<svg viewBox="0 0 ${W} 300"${W !== 1000 ? ` style="width:${zoom * 100}%"` : ''} data-gv-geom="0,${W},300,100,${W - 100},200" data-gv-fechas="${attrJson(fechas)}"><circle cx="100" cy="100" r="5"></circle></svg>`;
}

test('vistaGraficaMontar: barra de vista, svg dentro del contenedor con scroll y pastilla que repinta', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g');
  let llamadas = 0;
  w.vistaGraficaMontar(g, vista => { llamadas++; return { antes: '<p class="antes">leyenda</p>', html: svgPrueba(vista.zoom), total: 9 }; });
  assert.ok(g.querySelector('.pf-vista'), 'trae la barra');
  assert.ok(g.querySelector('.perfil-chart-scroll svg'), 'el svg va dentro del contenedor con scroll');
  assert.ok(g.firstElementChild.classList.contains('antes'), 'lo de «antes» va encima de la barra');
  const pill = g.querySelector('[data-pv="ultimas6"]');
  assert.equal(pill.getAttribute('aria-pressed'), 'true');
  assert.match(pill.textContent, /Últimas 6 temporadas/);
  pill.click();
  assert.equal(g.querySelector('[data-pv="ultimas6"]').getAttribute('aria-pressed'), 'false');
  assert.equal(llamadas, 2, 'se repintó con la vista nueva');
});

test('vistaGraficaMontar: sin gráfica (solo aviso) no pinta la barra', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g');
  w.vistaGraficaMontar(g, () => ({ html: '<div class="chart-empty">Todavía no hay datos.</div>', total: 0 }));
  assert.equal(g.querySelector('.pf-vista'), null);
  assert.match(g.textContent, /Todavía no hay datos/);
});

test('con pocas temporadas la pastilla queda deshabilitada y explica por qué', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g');
  w.vistaGraficaMontar(g, () => ({ html: svgPrueba(1), total: 3 }));
  const pill = g.querySelector('[data-pv="ultimas6"]');
  assert.ok(pill.disabled);
  assert.match(pill.title, /Solo hay 3 temporadas: ya se ven todas/);
});

test('el zoom se comparte entre las gráficas de la página y los botones se deshabilitan en los extremos', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g'), g2 = w.document.getElementById('g2');
  const dibujar = vista => ({ html: svgPrueba(vista.zoom), total: 9 });
  w.vistaGraficaMontar(g, dibujar);
  w.vistaGraficaMontar(g2, dibujar);
  assert.ok(g.querySelector('[data-pv="menos"]').disabled, 'en 1× no se puede alejar más');
  g.querySelector('[data-pv="mas"]').click(); // 1,5×
  g.querySelector('[data-pv="mas"]').click(); // 2×
  assert.match(g.textContent, /Zoom 2×/);
  assert.match(g2.textContent, /Zoom 2×/, 'la otra gráfica también se repintó');
  assert.match(g2.querySelector('svg').getAttribute('viewBox'), /^0 0 2000 300$/);
  g2.querySelector('[data-pv="menos"]').click();
  assert.match(g.textContent, /Zoom 1,5×/);
  for (let i = 0; i < 10; i++){ const b = g.querySelector('[data-pv="mas"]'); if (!b.disabled) b.click(); }
  assert.ok(g.querySelector('[data-pv="mas"]').disabled);
  assert.match(g.textContent, /Zoom 6×/);
});

test('al repintar con zoom, la gráfica sin desplazar queda con lo más reciente a la vista (scrollLeft al final)', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g');
  const alto = Object.getOwnPropertyDescriptor(w.HTMLElement.prototype, 'scrollWidth');
  Object.defineProperty(w.HTMLElement.prototype, 'scrollWidth', { configurable: true, get(){ return this.classList && this.classList.contains('perfil-chart-scroll') ? 3000 : 0; } });
  try{
    w.vistaGraficaMontar(g, vista => ({ html: svgPrueba(vista.zoom), total: 9 }));
    assert.equal(g.querySelector('.perfil-chart-scroll').scrollLeft, 3000, 'arranca en lo más reciente');
  } finally {
    if (alto) Object.defineProperty(w.HTMLElement.prototype, 'scrollWidth', alto); else delete w.HTMLElement.prototype.scrollWidth;
  }
});

test('el tooltip grande del eje X muestra el día y la fecha, cede ante los puntos y se oculta dentro del trazado', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g');
  w.vistaGraficaMontar(g, () => ({ html: svgPrueba(1), total: 9 }));
  const svg = g.querySelector('svg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 300 });
  const tip = () => w.document.getElementById('chartTooltip');
  const mover = (x, y, destino) => (destino || svg).dispatchEvent(new w.MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));

  mover(900, 250); // extremo derecho, bajo el trazado
  assert.equal(tip().style.display, 'block');
  assert.match(tip().textContent, /Lunes 05\/10\/2026|Martes 05\/10\/2026/, 'día de la semana + fecha: ' + tip().textContent);
  assert.match(tip().innerHTML, /font-size:\s*20px/);
  mover(100, 250);
  assert.ok(tip().textContent.includes('01/10/2026'));
  mover(600, 250); // al medio: la fecha estimada va sin día de la semana
  assert.ok(tip().textContent.includes('≈ 04/10/2026 (estimada)'));
  assert.ok(!/(Lunes|Martes|Domingo|Sábado) ≈/.test(tip().textContent));

  mover(500, 100); // dentro del trazado: se oculta
  assert.equal(tip().style.display, 'none');
  mover(500, 250);
  assert.equal(tip().style.display, 'block');
  mover(100, 100, svg.querySelector('circle')); // sobre un punto manda el tooltip del punto: este no se vuelve a pintar
  assert.equal(tip().style.display, 'block', 'no lo oculta: lo maneja el tooltip del punto');
  svg.dispatchEvent(new w.MouseEvent('mouseleave'));
  assert.equal(tip().style.display, 'none');
});

test('el tooltip del eje X respeta un viewBox con origen negativo (Cara a cara: -16 0 …)', () => {
  const w = cargarVista();
  const g = w.document.getElementById('g');
  const fechas = ['01/10/2026', '02/10/2026', '03/10/2026'];
  w.vistaGraficaMontar(g, () => ({ html: `<svg viewBox="-16 0 656 236" data-gv-geom="-16,656,236,50,624,180" data-gv-fechas="${attrJson(fechas)}"></svg>`, total: 9 }));
  const svg = g.querySelector('svg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 656, height: 236 });
  const tip = () => w.document.getElementById('chartTooltip');
  // el extremo derecho del trazado (x=624 del SVG) está en el píxel 624 − (−16) = 640
  svg.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 640, clientY: 200, bubbles: true }));
  assert.ok(tip().textContent.includes('03/10/2026'), tip().textContent);
  svg.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 66, clientY: 200, bubbles: true })); // x=50 del SVG
  assert.ok(tip().textContent.includes('01/10/2026'));
});

// ---------------- clan.html: copas del clan ----------------
const CLAN = scriptDe('clan.html', 'function clanCopasSvg');
function cargarClan(apiGetFalso){
  const w = loadBrowserScriptsWithDom(UTIL, '<div id="clanCopasWrap"></div>');
  w.apiGet = apiGetFalso || (async () => ({ puntos: [] }));
  w.eval(CONST_VISTA + ['clanCopasSvg', 'clanCopasAviso', 'cargarCopasClan'].map(n => extraerFuncion(CLAN, n)).join('\n') + '\nwindow.__t = { clanCopasSvg, cargarCopasClan };');
  return w;
}
// Un punto por día, de jueves a domingo, del 1-ene al 31-oct-2026 (más de 6 temporadas).
function puntosCopas(){
  const out = [];
  const d = new Date(2026, 0, 1);
  let copas = 130000;
  while (d <= new Date(2026, 9, 31)){
    if (d.getDay() === 0 || d.getDay() >= 4){ copas += 37; out.push({ fecha: dd(d), copas }); }
    d.setDate(d.getDate() + 1);
  }
  return out;
}
const ptsCopas = svg => (svg.match(/class="cd-copas-pt/g) || []).length;

test('clan.html: con opts.ultimasN solo se dibujan las últimas temporadas y devuelve el total', () => {
  const w = cargarClan();
  const pts = puntosCopas();
  const todo = w.__t.clanCopasSvg(pts, { partes: true });
  const recorte = w.__t.clanCopasSvg(pts, { partes: true, ultimasN: 6 });
  assert.ok(todo.total > 6, 'hay más de 6 temporadas: ' + todo.total);
  assert.equal(recorte.total, todo.total, 'el total cuenta la serie completa');
  assert.ok(ptsCopas(recorte.svg) < ptsCopas(todo.svg) && ptsCopas(recorte.svg) > 0);
  const ultimas = JSON.parse(recorte.svg.match(/data-gv-fechas="([^"]*)"/)[1].replace(/&quot;/g, '"'));
  assert.ok(ultimas.includes(pts[pts.length - 1].fecha), 'conserva lo más reciente');
  assert.equal(ultimas.length, ptsCopas(recorte.svg));
  assert.ok(!recorte.leyenda.includes('<svg class'), 'la leyenda va aparte del svg');
});

test('clan.html: sin opts devuelve lo de siempre (leyenda + svg, todo el historial, sin zoom)', () => {
  const w = cargarClan();
  const pts = puntosCopas();
  const txt = w.__t.clanCopasSvg(pts);
  assert.equal(typeof txt, 'string');
  assert.match(txt, /viewBox="0 0 960 320"/);
  assert.ok(!/style="width:calc/.test(txt));
  const partes = w.__t.clanCopasSvg(pts, { partes: true });
  assert.equal(txt, partes.leyenda + partes.svg);
});

test('clan.html: el zoom ensancha el lienzo (no la altura) y deja la geometría del tooltip del eje X', () => {
  const w = cargarClan();
  const pts = puntosCopas();
  const r = w.__t.clanCopasSvg(pts, { partes: true, ultimasN: 6, zoom: 2 });
  assert.match(r.svg, /viewBox="0 0 1920 320"/);
  assert.match(r.svg, /width:calc\(min\(100%, 960px\) \* 2\)/);
  const [x0, vbW, vbH, xIni, xFin, yFin] = r.svg.match(/data-gv-geom="([^"]*)"/)[1].split(',').map(Number);
  assert.deepEqual([x0, vbW, vbH, yFin], [0, 1920, 320, 230]);
  assert.ok(xIni >= 74 && xFin < 1920 && xFin > xIni);
});

test('clan.html: cargarCopasClan monta la barra de vista; apagar la pastilla muestra todo el historial', async () => {
  const pts = puntosCopas();
  const w = cargarClan(async () => ({ puntos: pts }));
  w.__t.cargarCopasClan({ clanTag: '#ABC' });
  await new Promise(r => setTimeout(r, 20));
  const wrap = w.document.getElementById('clanCopasWrap');
  assert.ok(wrap.querySelector('.pf-vista'), 'trae la barra');
  assert.ok(wrap.querySelector('.cd-copas-leyenda'), 'la leyenda sigue arriba');
  assert.ok(wrap.querySelector('.perfil-chart-scroll svg.cd-copas-svg'));
  const recortado = ptsCopas(wrap.innerHTML);
  assert.equal(wrap.querySelector('[data-pv="ultimas6"]').getAttribute('aria-pressed'), 'true');
  wrap.querySelector('[data-pv="ultimas6"]').click();
  assert.ok(ptsCopas(wrap.innerHTML) > recortado, 'apagada: se ven más puntos');
});

test('clan.html: sin historial solo sale el aviso, sin barra de vista', async () => {
  const w = cargarClan(async () => ({ puntos: [] }));
  w.__t.cargarCopasClan({ clanTag: '#ABC' });
  await new Promise(r => setTimeout(r, 20));
  const wrap = w.document.getElementById('clanCopasWrap');
  assert.equal(wrap.querySelector('.pf-vista'), null);
  assert.match(wrap.textContent, /Todavía no hay historial de copas/);
});

// ---------------- directorio.html: Ingresos recientes y Cara a cara ----------------
const DIR = scriptDe('directorio.html', 'function lineChartSvg');
const NOMBRES_DIR = ['tagClanNormalizado', 'claveClanMiembro', 'semanaLabel', 'semanaOrden', 'construirSemanasMaestras', 'numeroSemanaVieja', 'semanaLabelCorta', 'construirFechasEstimadasSemanasViejas',
  'fmtFechaCortaDDMM', 'fmtFechaLargaDDMMYYYY', 'textoTemporadaSemanaDiaIngreso', 'attrsTemporadaSemanaDiaIngreso', 'lineChartSvg',
  'etiquetaPuntoIngreso', 'htmlTooltipPuntoIngreso', 'activarTooltipsGraficasIngresos', 'lineChartLegendHtml', 'ingresosSeriesPorValorY', 'renderComparativaSemanal',
  'guerraComparadorMetricaSvg', 'montarComparadorGuerraChart', 'renderComparadorGuerraChart', 'fmtFecha'];
function cargarDir(){
  const w = loadBrowserScriptsWithDom(UTIL, '<div id="g"></div><div id="chartsWrap"></div><div id="comp"></div>');
  w.eval(CONST_VISTA + "const PALETA_SERIES = ['#a239ff','#f3a922','#3ddc97'];\nconst TOPE_ATAQUES_SEMANA = 16, TOPE_MEDALLAS_SEMANA = 3600, TOPE_BARCOS_SEMANA = 16, MIN_SEMANAS_POR_MIEMBRO = 5;\nconst ingresosFiltroY = { ataques: null, puntaje: null, barcos: null };\n" +
    (DIR.match(/let COMPARADOR_GRAFICA_CTX = null;/) || [''])[0] + '\n' +
    NOMBRES_DIR.map(n => extraerFuncion(DIR, n)).join('\n') +
    '\nwindow.__t = { lineChartSvg, ingresosSeriesPorValorY, guerraComparadorMetricaSvg, renderComparativaSemanal, renderComparadorGuerraChart, montarComparadorGuerraChart };');
  return w;
}
const SEMANAS14 = domingos().map(dd);
const miembro = (campo, nombre) => ({ nombre: nombre || 'Chistris', tag: '#2GG8PJ8GC', clan: 'Terna',
  historialSemanal: SEMANAS14.map((semana, i) => ({ semana, clan: 'Terna', [campo]: 8 + (i % 5) })) });
const ptsSerie = svg => (svg.match(/class="ing-serie-pt/g) || []).length;

test('ingresos recientes: lineChartSvg con opts.visibles deja solo esas semanas y el eje se ajusta a lo que se ve', () => {
  const w = cargarDir();
  const m = miembro('ataques');
  const fechas = domingos();
  const v = w.vistaGraficaVisibles(fechas, 6);
  const todo = w.__t.lineChartSvg([m], 'ataques', SEMANAS14, { unidad: 'ataques', tope: 16 });
  const rec = w.__t.lineChartSvg([m], 'ataques', SEMANAS14, { unidad: 'ataques', tope: 16, visibles: v.visibles });
  assert.equal(ptsSerie(todo), SEMANAS14.length);
  assert.equal(ptsSerie(rec), v.visibles.filter(Boolean).length);
  assert.ok(ptsSerie(rec) < ptsSerie(todo));
  const f = JSON.parse(rec.match(/data-gv-fechas="([^"]*)"/)[1].replace(/&quot;/g, '"'));
  assert.equal(f.length, ptsSerie(rec));
  assert.equal(f[f.length - 1], SEMANAS14[SEMANAS14.length - 1]);
  const sinVisibles = w.__t.lineChartSvg([m], 'ataques', SEMANAS14, { unidad: 'ataques', tope: 16, visibles: null });
  assert.equal(sinVisibles, todo, 'visibles:null es lo mismo que no pasarlo');
});

test('ingresos recientes: el zoom ensancha el lienzo y deja la geometría del eje X', () => {
  const w = cargarDir();
  const svg = w.__t.lineChartSvg([miembro('ataques')], 'ataques', SEMANAS14, { unidad: 'ataques', zoom: 3 });
  assert.match(svg, /viewBox="0 0 2880 460"/);
  assert.match(svg, /style="width:300%; aspect-ratio:2880\/460;"/);
  const [x0, vbW, vbH, xIni, xFin, yFin] = svg.match(/data-gv-geom="([^"]*)"/)[1].split(',').map(Number);
  assert.deepEqual([x0, vbW, vbH, yFin], [0, 2880, 460, 376]);
  assert.ok(xIni >= 74 && xFin > xIni && xFin < 2880);
  const normal = w.__t.lineChartSvg([miembro('ataques')], 'ataques', SEMANAS14, { unidad: 'ataques' });
  assert.match(normal, /viewBox="0 0 960 460"/);
  assert.ok(!/style="width:/.test(normal));
});

// Los miembros se arman con datos de ataques, puntaje y barcos. La lista maestra de semanas llega hasta la 5.ª semana más reciente del miembro más atrasado
// (construirSemanasMaestras): con un miembro que solo trae las primeras 5 semanas, el eje cubre las 14 y hay más de 6 temporadas.
const conTodo = m => Object.assign(m, { historialSemanal: m.historialSemanal.map(h => Object.assign({ puntaje: 1500, barcos: 8 }, h)) });
const antiguo = () => { const m = conTodo(miembro('ataques', 'Beto')); m.tag = '#BETO'; m.historialSemanal = m.historialSemanal.slice(0, 5); return m; };

test('ingresos recientes: renderComparativaSemanal arma tres gráficas con barra de vista y recorta a 6 temporadas', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [conTodo(miembro('ataques')), antiguo()]);
  assert.equal(cont.querySelectorAll('.pf-vista').length, 3, 'una barra por gráfica');
  assert.equal(cont.querySelectorAll('.perfil-chart-scroll svg.ing-linechart-svg').length, 3);
  assert.ok(cont.querySelector('.ing-chart-leyenda'), 'la leyenda sigue arriba de cada gráfica');
  const todos = SEMANAS14.length + 5;
  const recortado = ptsSerie(cont.querySelector('svg.ing-linechart-svg').outerHTML);
  assert.ok(recortado > 0 && recortado < todos, `se recorta: ${recortado} de ${todos}`);
  assert.equal(cont.querySelector('[data-pv="ultimas6"]').disabled, false, 'hay más de 6 temporadas: la pastilla se puede apagar');
  cont.querySelector('[data-pv="ultimas6"]').click();
  assert.equal(ptsSerie(cont.querySelector('svg.ing-linechart-svg').outerHTML), todos, 'apagada: se ven todas');
  cont.querySelector('[data-pv="mas"]').click();
  cont.querySelectorAll('svg.ing-linechart-svg').forEach(s => assert.match(s.getAttribute('viewBox'), /^0 0 1440 460$/));
});

test('ingresos recientes: con pocas semanas (lo normal) la pastilla queda desactivada y el zoom sigue disponible', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [conTodo(miembro('ataques'))]);
  const pill = cont.querySelector('[data-pv="ultimas6"]');
  assert.ok(pill.disabled);
  assert.equal(ptsSerie(cont.querySelector('svg.ing-linechart-svg').outerHTML), 5, 'la lista maestra trae las 5 semanas más recientes');
  assert.equal(cont.querySelector('[data-pv="mas"]').disabled, false);
});

test('ingresos recientes: el tooltip de un punto sigue funcionando tras repintar (y no se duplica)', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [conTodo(miembro('ataques'))]);
  cont.querySelector('[data-pv="mas"]').click();
  const pt = cont.querySelector('svg.ing-linechart-svg .ing-serie-pt');
  pt.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 50, clientY: 50, bubbles: true }));
  const tip = w.document.getElementById('chartTooltip');
  assert.equal(tip.style.display, 'block');
  assert.match(tip.innerHTML, /Chistris/);
  pt.dispatchEvent(new w.MouseEvent('mouseleave'));
  assert.equal(tip.style.display, 'none');
});

const fila = (fecha, v) => ({ fecha, ataques: v, fame: v, barcos: v });
function histDias(n = 70){ // n días corridos desde 2026-01-01 (solo importa la fecha: el comparador los trata como días de guerra)
  const out = [];
  const d = new Date(2026, 0, 1);
  for (let i = 0; i < n * 5; i += 5){ const x = new Date(d); x.setDate(x.getDate() + i); out.push({ fecha: iso(x), ataques: 1 + (i % 4), fame: 100 + i, barcos: i % 3 }); }
  return out;
}

test('cara a cara: guerraComparadorMetricaSvg con zoom ensancha el lienzo y deja la geometría con el origen -16', () => {
  const w = cargarDir();
  const fechas = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
  const indice = new Map(fechas.map((f, i) => [f, i]));
  const cc = opts => w.__t.guerraComparadorMetricaSvg(fechas.map((f, i) => fila(f, 4 + i)), fechas.map((f, i) => fila(f, 3 + i)), 'ataques', 'Ataques', fechas, indice, 'Ana', 'Terna', 'Beto', 'Terna 2', opts);
  const normal = cc();
  assert.match(normal, /viewBox="-16 0 656 236"/);
  assert.ok(!/aspect-ratio/.test(normal));
  assert.equal(normal, cc({ zoom: 1 }));
  const g = cc({ zoom: 2 });
  assert.match(g, /viewBox="-16 0 1296 236"/);
  assert.match(g, /width:200%; aspect-ratio:1296\/236;/);
  const [x0, vbW, vbH, xIni, xFin, yFin] = g.match(/data-gv-geom="([^"]*)"/)[1].split(',').map(Number);
  assert.deepEqual([x0, vbW, vbH, xIni, xFin, yFin], [-16, 1296, 236, 50, 1264, 180]);
  assert.deepEqual(JSON.parse(g.match(/data-gv-fechas="([^"]*)"/)[1].replace(/&quot;/g, '"')), ['01/10/2026', '02/10/2026', '03/10/2026', '04/10/2026']);
});

test('cara a cara: montarComparadorGuerraChart pinta las tres gráficas con barra de vista y recorta a 6 temporadas', () => {
  const w = cargarDir();
  const comp = w.document.getElementById('comp');
  comp.innerHTML = w.__t.renderComparadorGuerraChart(histDias(), histDias(), 'Ana', 'Beto', 'Terna', 'Terna 2', '#A', '#B');
  assert.equal(comp.querySelectorAll('.gv-chart').length, 3);
  assert.equal(comp.querySelector('svg.linechart-svg'), null, 'antes de montar solo están los huecos');
  w.__t.montarComparadorGuerraChart(comp);
  assert.equal(comp.querySelectorAll('.pf-vista').length, 3);
  const svgs = () => [...comp.querySelectorAll('.perfil-chart-scroll svg.linechart-svg')];
  assert.equal(svgs().length, 3);
  const circ = s => s.querySelectorAll('circle').length;
  const recortado = circ(svgs()[0]);
  comp.querySelector('[data-pv="ultimas6"]').click();
  assert.ok(circ(svgs()[0]) > recortado, 'apagada: se ven más puntos');
  comp.querySelector('[data-pv="ultimas6"]').click();
  assert.equal(circ(svgs()[0]), recortado);
  comp.querySelector('[data-pv="mas"]').click();
  svgs().forEach(s => assert.match(s.getAttribute('viewBox'), /^-16 0 976 236$/));
});

test('cara a cara: el teclado de cada gráfica se vuelve a activar al repintar', () => {
  const w = cargarDir();
  const comp = w.document.getElementById('comp');
  comp.innerHTML = w.__t.renderComparadorGuerraChart(histDias(), histDias(), 'Ana', 'Beto', 'Terna', 'Terna 2', '#A', '#B');
  w.__t.montarComparadorGuerraChart(comp);
  comp.querySelector('[data-pv="mas"]').click();
  const svg = comp.querySelector('svg.linechart-svg');
  assert.ok(svg.hasAttribute('tabindex') || svg.querySelector('[data-kb]') || svg.getAttribute('role'), 'el svg quedó accesible por teclado');
});

test('cara a cara: sin historial solo sale el aviso y montar no pinta nada', () => {
  const w = cargarDir();
  const comp = w.document.getElementById('comp');
  comp.innerHTML = w.__t.renderComparadorGuerraChart([], [], 'Ana', 'Beto', 'Terna', 'Terna 2', '#A', '#B');
  w.__t.montarComparadorGuerraChart(comp);
  assert.equal(comp.querySelector('.pf-vista'), null);
  assert.match(comp.textContent, /Todavía no hay historial de días de guerra/);
});


// ---------------- directorio.html: filtro por valor de Y en las gráficas de Ingresos recientes (18-nov-2026, §PF512) ----------------
// Pedido de la usuaria: ver solo las series cuyos valores (todos) estén por debajo de un tope (Ataques, Medallas) o por encima de un piso (Barcos).
// LÍMITE: DOM simulado (jsdom), no un navegador; el temporizador de escritura se salta con el evento «change».
const serieFija = (nombre, tag, ataques, puntaje, barcos) => ({ nombre, tag, clan: 'Terna',
  historialSemanal: SEMANAS14.map(semana => ({ semana, clan: 'Terna', ataques, puntaje, barcos })) });
const BAJO = () => serieFija('Bajito', '#BAJO', 6, 1500, 8);   // ataques 6, medallas 1500, barcos 8
const ALTO = () => serieFija('Altote', '#ALTO', 14, 3000, 14); // ataques 14, medallas 3000, barcos 14
const tagsDe = svgOuter => [...new Set((svgOuter.match(/data-tag="[^"]*"/g) || []))].sort();
const graficas = cont => [...cont.querySelectorAll('.ing-linechart-card')];
function escribirFiltro(w, cont, campo, valor){
  const inp = cont.querySelector(`#ingFiltroY-${campo}`);
  inp.value = String(valor);
  inp.dispatchEvent(new w.Event('change', { bubbles: true }));
}

test('filtro Y: ingresosSeriesPorValorY compara con estrictos, usa solo los registros reales y conserva la posición original', () => {
  const w = cargarDir();
  const f = w.__t.ingresosSeriesPorValorY;
  const ms = [BAJO(), ALTO(), serieFija('Sin datos', '#NADA', 1, 1, 1)];
  ms[2].historialSemanal = [];
  const menor = f(ms, 'ataques', 'menor', 12, null);
  assert.deepEqual(menor.lista.map(m => m.tag), ['#BAJO']);
  assert.equal(menor.idxs.join(','), '0');
  const mayor = f(ms, 'barcos', 'mayor', 10, null);
  assert.deepEqual(mayor.lista.map(m => m.tag), ['#ALTO']);
  assert.equal(mayor.idxs.join(','), '1', 'conserva su posición en la lista completa (color estable)');
  assert.equal(f(ms, 'ataques', 'menor', 6, null).lista.length, 0, 'igual al tope NO cuenta: «menos de 6» deja fuera a quien tiene 6');
  assert.equal(f(ms, 'barcos', 'mayor', 14, null).lista.length, 0, 'igual al piso NO cuenta: «mayor que 14» deja fuera a quien tiene 14');
  assert.equal(f(ms, 'ataques', 'menor', 100, null).lista.length, 2, 'un miembro sin registros nunca se muestra con filtro');
});

test('filtro Y: todos los valores deben cumplirlo; un solo valor que lo rompa deja fuera a la serie', () => {
  const w = cargarDir();
  const m = serieFija('Mixto', '#MIX', 6, 1500, 8);
  m.historialSemanal[3].ataques = 13;
  assert.equal(w.__t.ingresosSeriesPorValorY([m], 'ataques', 'menor', 12, null).lista.length, 0);
  assert.equal(w.__t.ingresosSeriesPorValorY([m], 'ataques', 'menor', 14, null).lista.length, 1);
  const etiquetas = new Set(SEMANAS14.filter((s, i) => i !== 3));
  assert.equal(w.__t.ingresosSeriesPorValorY([m], 'ataques', 'menor', 12, etiquetas).lista.length, 1, 'si la semana que lo rompe no se ve, no cuenta');
});

test('filtro Y: cada gráfica trae su control (Ataques y Medallas «menores», Barcos «mayores») y arranca sin filtro', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  const cartas = graficas(cont);
  assert.equal(cartas.length, 3);
  assert.match(cartas[0].querySelector('.ing-filtro-y label').textContent, /menores que/);
  assert.match(cartas[1].querySelector('.ing-filtro-y label').textContent, /menores que/);
  assert.match(cartas[2].querySelector('.ing-filtro-y label').textContent, /mayores que/);
  cartas.forEach(c => {
    assert.equal(c.querySelector('.ing-filtro-y-input').value, '');
    assert.equal(c.querySelector('.ing-filtro-y-quitar').hidden, true);
    assert.deepEqual(tagsDe(c.querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"', 'data-tag="#BAJO"']);
  });
});

test('filtro Y: «menos de 12 ataques» deja solo a la serie con todos sus valores por debajo; las otras gráficas no cambian', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  escribirFiltro(w, cont, 'ataques', 12);
  const [ataques, medallas, barcos] = graficas(cont);
  assert.deepEqual(tagsDe(ataques.querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#BAJO"']);
  assert.deepEqual(tagsDe(medallas.querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"', 'data-tag="#BAJO"'], 'medallas sin filtro');
  assert.deepEqual(tagsDe(barcos.querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"', 'data-tag="#BAJO"'], 'barcos sin filtro');
  assert.equal(ataques.querySelector('.ing-filtro-y-quitar').hidden, false);
  assert.match(ataques.textContent, /Filtro: solo series con todos sus valores menores que 12 · 1 de 2 series/);
});

test('filtro Y: la leyenda lista solo las series que se ven y cada una conserva su color', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  escribirFiltro(w, cont, 'ataques', 20); // las dos pasan
  escribirFiltro(w, cont, 'puntaje', 2400); // solo la baja
  const medallas = graficas(cont)[1];
  const leyenda = medallas.querySelector('.ing-linechart-legend').textContent;
  assert.match(leyenda, /Bajito/);
  assert.doesNotMatch(leyenda, /Altote/);
  const barcos = graficas(cont)[2];
  escribirFiltro(w, cont, 'barcos', 10); // «mayor que 10»: solo la alta, que es la 2.ª de la lista completa
  const svg = graficas(cont)[2].querySelector('svg.ing-linechart-svg').outerHTML;
  assert.match(svg, /stroke="#f3a922"/, 'Altote es la serie 2: conserva el color 2 de la paleta, no pasa a ser el 1');
  assert.doesNotMatch(svg, /stroke="#a239ff"/);
  assert.match(graficas(cont)[2].querySelector('.ing-linechart-legend').innerHTML, /background:#f3a922/);
  assert.ok(barcos);
});

test('filtro Y: Barcos usa «mayor que» (deja a quien tiene todos sus valores por encima)', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  escribirFiltro(w, cont, 'barcos', 10);
  assert.deepEqual(tagsDe(graficas(cont)[2].querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"']);
  assert.match(graficas(cont)[2].textContent, /mayores que 10 · 1 de 2 series/);
});

test('filtro Y: si ninguna serie cumple se avisa en la gráfica y se puede quitar el filtro', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  escribirFiltro(w, cont, 'ataques', 3);
  const carta = graficas(cont)[0];
  assert.match(carta.querySelector('.gv-chart').textContent, /Ninguna serie tiene todos sus valores menores que 3/);
  assert.equal(carta.querySelector('svg.ing-linechart-svg'), null);
  carta.querySelector('.ing-filtro-y-quitar').click();
  const despues = graficas(cont)[0];
  assert.deepEqual(tagsDe(despues.querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"', 'data-tag="#BAJO"']);
  assert.equal(despues.querySelector('.ing-filtro-y-input').value, '');
  assert.equal(despues.querySelector('.ing-filtro-y-quitar').hidden, true);
});

test('filtro Y: un valor vacío o inválido equivale a no filtrar, y el 0 sí es un valor válido', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  escribirFiltro(w, cont, 'ataques', 12);
  escribirFiltro(w, cont, 'ataques', '');
  assert.deepEqual(tagsDe(graficas(cont)[0].querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"', 'data-tag="#BAJO"']);
  escribirFiltro(w, cont, 'barcos', 0); // «mayor que 0»: pasan las dos
  assert.deepEqual(tagsDe(graficas(cont)[2].querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#ALTO"', 'data-tag="#BAJO"']);
  assert.match(graficas(cont)[2].textContent, /mayores que 0 · 2 de 2 series/);
});

test('filtro Y: el filtro se conserva al repintar las gráficas (cambia la selección de miembros) y respeta la vista de temporadas', () => {
  const w = cargarDir();
  const cont = w.document.getElementById('chartsWrap');
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO()]);
  escribirFiltro(w, cont, 'ataques', 12);
  w.__t.renderComparativaSemanal(cont, [BAJO(), ALTO(), serieFija('Otro', '#OTRO', 2, 900, 3)]);
  const carta = graficas(cont)[0];
  assert.equal(carta.querySelector('.ing-filtro-y-input').value, '12', 'el campo vuelve con el valor guardado');
  assert.deepEqual(tagsDe(carta.querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#BAJO"', 'data-tag="#OTRO"']);
});

test('filtro Y: con «Últimas 6 temporadas» se miden solo las semanas que se ven (una semana vieja alta no descalifica a la serie)', () => {
  const w = cargarDir();
  const c = w.document.getElementById('chartsWrap');
  const reciente = serieFija('Reciente', '#REC', 6, 1500, 8);
  reciente.historialSemanal[0].ataques = 15; // la semana más vieja de la serie
  const viejo = serieFija('Viejo', '#VIEJO', 1, 1500, 8); // solo trae las 5 semanas más antiguas: amplía el eje a más de 6 temporadas
  viejo.historialSemanal = viejo.historialSemanal.slice(0, 5);
  w.__t.renderComparativaSemanal(c, [reciente, viejo]);
  const pill = c.querySelector('[data-pv="ultimas6"]');
  assert.equal(pill.disabled, false, 'hay más de 6 temporadas: la vista recortada está disponible (si no, esta prueba no prueba nada)');
  escribirFiltro(w, c, 'ataques', 12);
  assert.deepEqual(tagsDe(graficas(c)[0].querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#REC"'], 'recortada: la semana vieja de Reciente no cuenta y Viejo no tiene semanas visibles');
  c.querySelector('[data-pv="ultimas6"]').click(); // ver todas las temporadas
  assert.deepEqual(tagsDe(graficas(c)[0].querySelector('svg.ing-linechart-svg').outerHTML), ['data-tag="#VIEJO"'], 'con todas las semanas, Reciente (15 en la más vieja) queda fuera y Viejo entra');

});
