/* vista-grafica.js — vista de las gráficas de línea: pastilla «Últimas 6 temporadas», zoom +/− con barra de desplazamiento y tooltip grande
   con la fecha al acercar el mouse al eje X. (4-nov-2026, pedido de la usuaria: las mismas características que ya tienen las gráficas del perfil,
   §PF352, en el resto de la web, salvo las minigráficas; §PF353.)
   Lo usan clan.html (copas del clan) y directorio.html («… por semana» de Ingresos recientes y el «Cara a cara»). perfil.html conserva su propia copia
   (sus funciones se extraen por nombre en test/perfil-*-grafica.test.js), con el mismo aspecto y el mismo comportamiento.
   Depende de util.js (esc), de timeline-svg.js (claveTemporadaFecha, obtenerTooltipGrafica, posicionarTooltipGrafica) y de los estilos .pf-vista* y
   .perfil-chart-scroll de assets/styles.css.
   Cómo se usa: cada gráfica va en un contenedor vacío; vistaGraficaMontar(contenedor, dibujar, despues) lo pinta con la barra de la vista, el SVG dentro de
   un contenedor con barra de desplazamiento y el tooltip del eje X, y lo registra para repintarlo cuando cambie la vista (el estado es COMPARTIDO por todas
   las gráficas de la página). dibujar(vista) devuelve { html, total, antes? }: html = el <svg>; total = cuántas temporadas tiene la serie completa (la pastilla
   se desactiva si no pasan de 6); antes = HTML opcional (p. ej. la leyenda) que va encima de la barra, fuera del desplazamiento. El SVG debe traer
   data-gv-fechas (JSON con una fecha legible por posición del eje X) y data-gv-geom ("x0,anchoVB,altoVB,xIni,xFin,yFin": origen y tamaño del viewBox y
   el recuadro de trazado, en unidades del SVG). */

const VISTA_GRAFICA = { ultimas6: true, zoom: 1 };
const VISTA_GRAFICA_ZOOMS = [1, 1.5, 2, 3, 4, 6];
const VISTA_GRAFICA_TEMPORADAS = 6;
const VISTA_GRAFICAS_MONTADAS = new Map();
const VISTA_GRAFICA_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** true si `x` es una fecha (Date) válida; no usa instanceof para que valga también con un Date de otro documento o ventana. */
function vistaGraficaEsFecha(x){
  return Object.prototype.toString.call(x) === '[object Date]' && !isNaN(x.getTime());
}

/** Fecha legible o null. Acepta Date, «dd/MM/yyyy» (con hora pegada o no) y «yyyy-MM-dd»; lo demás (p. ej. «Semana 12») es null. */
function vistaGraficaFecha(s){
  if (Object.prototype.toString.call(s) === '[object Date]') return vistaGraficaEsFecha(s) ? s : null;
  const t = String(s == null ? '' : s).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

/** «dd/MM/yyyy» de un Date. */
function vistaGraficaFmtFecha(d){
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Qué posiciones del eje X se ven si solo se dejan las últimas `n` temporadas (misma clave de temporada que el sombreado: claveTemporadaFecha).
 * fechas = una por posición (Date o null; las ilegibles se conservan, no hay forma de saber de qué temporada son).
 * Devuelve { visibles: boolean[], total, recortado }; total = temporadas distintas de la serie completa.
 */
function vistaGraficaVisibles(fechas, n){
  const claves = fechas.map(f => vistaGraficaEsFecha(f) ? claveTemporadaFecha(f) : null);
  const orden = Array.from(new Set(claves.filter(k => k != null))).sort((a, b) => a - b);
  if (!(n > 0) || orden.length <= n) return { visibles: fechas.map(() => true), total: orden.length, recortado: false };
  const minK = orden[orden.length - n];
  return { visibles: claves.map(k => k == null || k >= minK), total: orden.length, recortado: true };
}

/** Barra de la vista: pastilla de temporadas y zoom − / + (mismo HTML y mismas clases que la de perfil.html). */
function vistaGraficaBarraHtml(total){
  const hay = total > VISTA_GRAFICA_TEMPORADAS;
  const iz = VISTA_GRAFICA_ZOOMS.indexOf(VISTA_GRAFICA.zoom);
  const etZoom = String(VISTA_GRAFICA.zoom).replace('.', ',') + '×';
  return `<div class="pf-vista" role="group" aria-label="Vista de la gráfica">
      <button type="button" class="pf-vista-pill" data-pv="ultimas6" aria-pressed="${VISTA_GRAFICA.ultimas6 ? 'true' : 'false'}"${hay ? '' : ' disabled title="Solo hay ' + total + ' temporada' + (total === 1 ? '' : 's') + ': ya se ven todas."'}>Últimas ${VISTA_GRAFICA_TEMPORADAS} temporadas</button>
      <span class="pf-vista-zoom">
        <button type="button" class="pf-vista-btn" data-pv="menos" aria-label="Alejar el eje de fechas"${iz <= 0 ? ' disabled' : ''}>−</button>
        <span class="pf-vista-zoom-et" aria-live="polite">Zoom ${etZoom}</span>
        <button type="button" class="pf-vista-btn" data-pv="mas" aria-label="Acercar el eje de fechas"${iz >= VISTA_GRAFICA_ZOOMS.length - 1 ? ' disabled' : ''}>+</button>
      </span>
    </div>`;
}

/** Atributos de ancho que lleva el <svg> con zoom > 1: se muestra a zoom×100 % de ancho (el viewBox ya es zoom veces más ancho) y mantiene su proporción. */
function vistaGraficaEstiloSvg(zoom, W, H){
  return zoom > 1 ? ` style="width:${Math.round(zoom * 100)}%; aspect-ratio:${W}/${H}; max-width:none;"` : '';
}

/** Pinta `cont` con la vista actual y lo registra para repintarlo al cambiar la vista (ver el encabezado del archivo). */
function vistaGraficaMontar(cont, dibujar, despues){
  if (!cont) return;
  VISTA_GRAFICAS_MONTADAS.set(cont, { dibujar, despues });
  vistaGraficaPintar(cont);
}

function vistaGraficaPintar(cont){
  const reg = VISTA_GRAFICAS_MONTADAS.get(cont);
  if (!reg) return;
  const r = reg.dibujar(VISTA_GRAFICA) || { html: '', total: 0 };
  const hayGrafica = /<svg[\s>]/.test(r.html || '');
  cont.innerHTML = `${r.antes || ''}${hayGrafica ? vistaGraficaBarraHtml(r.total || 0) : ''}<div class="perfil-chart-scroll">${r.html || ''}</div>`;
  cont.querySelectorAll('.pf-vista [data-pv]').forEach(b => b.addEventListener('click', () => {
    const a = b.getAttribute('data-pv'), iz = VISTA_GRAFICA_ZOOMS.indexOf(VISTA_GRAFICA.zoom);
    if (a === 'ultimas6') VISTA_GRAFICA.ultimas6 = !VISTA_GRAFICA.ultimas6;
    else if (a === 'mas') VISTA_GRAFICA.zoom = VISTA_GRAFICA_ZOOMS[Math.min(VISTA_GRAFICA_ZOOMS.length - 1, iz + 1)];
    else if (a === 'menos') VISTA_GRAFICA.zoom = VISTA_GRAFICA_ZOOMS[Math.max(0, iz - 1)];
    vistaGraficaRepintarTodas();
  }));
  const sc = cont.querySelector('.perfil-chart-scroll');
  if (sc) sc.scrollLeft = sc.scrollWidth; // lo más reciente a la vista
  cont.querySelectorAll('svg[data-gv-fechas]').forEach(svg => vistaGraficaTooltipEjeX(svg, { puntoSelector: 'circle' }));
  if (reg.despues) reg.despues(cont);
}

/** Repinta todas las gráficas montadas; cada una conserva su posición de desplazamiento (si estaba sin desplazar, va al final = lo más reciente). */
function vistaGraficaRepintarTodas(){
  VISTA_GRAFICAS_MONTADAS.forEach((reg, cont) => {
    if (!cont.isConnected){ VISTA_GRAFICAS_MONTADAS.delete(cont); return; }
    const sc = cont.querySelector('.perfil-chart-scroll');
    const sinDesplazar = !sc || sc.scrollWidth <= sc.clientWidth + 1;
    const centro = sc && sc.scrollWidth ? (sc.scrollLeft + sc.clientWidth / 2) / sc.scrollWidth : 1;
    vistaGraficaPintar(cont);
    const nuevo = cont.querySelector('.perfil-chart-scroll');
    if (nuevo && !sinDesplazar) nuevo.scrollLeft = Math.max(0, centro * nuevo.scrollWidth - nuevo.clientWidth / 2);
  });
}

/**
 * Tooltip grande con la fecha al acercar el mouse a la franja del eje X (las etiquetas se achican o se omiten con muchos puntos).
 * Lee data-gv-fechas y data-gv-geom del <svg>. opts.puntoSelector: selector de los puntos del SVG, que traen su propio tooltip y mandan sobre este.
 * opts.extra(i, fecha): HTML opcional de una segunda línea (más chica).
 */
function vistaGraficaTooltipEjeX(svg, opts){
  opts = opts || {};
  let fechas, g;
  try{ fechas = JSON.parse(svg.getAttribute('data-gv-fechas') || '[]'); g = (svg.getAttribute('data-gv-geom') || '').split(',').map(Number); }catch(err){ return; }
  if (!Array.isArray(fechas) || !fechas.length || g.length < 6 || g.some(isNaN)) return;
  const [x0, vbW, vbH, xIni, xFin, yFin] = g;
  const tip = obtenerTooltipGrafica();
  let visible = false;
  const ocultar = () => { if (visible){ tip.style.display = 'none'; visible = false; } };
  const salir = () => { tip.style.display = 'none'; visible = false; }; // al salir del SVG siempre se oculta (aunque el último pase haya sido sobre un punto)
  svg.addEventListener('mousemove', e => {
    if (opts.puntoSelector && e.target && e.target.closest && e.target.closest(opts.puntoSelector)){ visible = false; return; } // el tooltip del punto manda
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height){ ocultar(); return; }
    const ux = x0 + (e.clientX - r.left) / r.width * vbW, uy = (e.clientY - r.top) / r.height * vbH;
    if (uy < yFin + 4 || ux < xIni - 12 || ux > xFin + 12){ ocultar(); return; }
    const i = fechas.length <= 1 ? 0 : Math.min(fechas.length - 1, Math.max(0, Math.round((ux - xIni) / (xFin - xIni) * (fechas.length - 1))));
    const f = String(fechas[i]);
    const d = f.charAt(0) === '≈' ? null : vistaGraficaFecha(f); // la fecha estimada no lleva día de la semana
    const dia = d ? VISTA_GRAFICA_DIAS[d.getDay()] + ' ' : '';
    const extra = opts.extra ? opts.extra(i, f) : '';
    tip.innerHTML = `<div style="font-size:20px; font-weight:700; white-space:nowrap;">${esc(dia + f)}</div>${extra ? `<div style="font-size:13px; opacity:.85;">${extra}</div>` : ''}`;
    tip.style.display = 'block';
    visible = true;
    posicionarTooltipGrafica(tip, e.clientX, e.clientY);
  });
  svg.addEventListener('mouseleave', salir);
}
