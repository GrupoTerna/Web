/* timeline-svg.js — líneas y grillas de fecha en gráficos SVG de progreso. Extraído de common.js. */



/* =========================================================================
 * Helpers de límites temporales (año / temporada / semana) para las líneas
 * verticales de referencia de TODAS las gráficas del sitio (pedido usuario
 * 07-sep-2026): "todas las gráficas deben llevar líneas que permitan
 * distinguir dónde empieza cada año, temporada y la semana". Se agrupan
 * acá (en vez de duplicarse por página, como el resto de charts) porque es
 * lógica de fechas pura, sin nada visual, y debe coincidir SIEMPRE con el
 * mismo criterio que usa el backend (ver primerLunesDelMes()/
 * calcTemporadaDesdeRef() en 01_Config_Global.gs): en Clash Royale, cada
 * temporada empieza el PRIMER LUNES de cada mes calendario, y las semanas
 * de guerra corren de lunes a domingo.
 * ========================================================================= */

/** Primer lunes de un mes calendario (mes 0-based) — idéntico criterio que
 * primerLunesDelMes() del backend (Base.md). */
function primerLunesDelMesJS(anio, mes){
  const d = new Date(anio, mes, 1);
  const dow = d.getDay();
  const off = (dow === 1) ? 0 : (dow === 0) ? 1 : (8 - dow);
  d.setDate(1 + off);
  return d;
}


function _mismaFecha(a, b){
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}


/** true si 'fecha' ES el primer lunes de su mes — o sea, el día en que
 * empieza una temporada de Clash Royale. */
function esInicioTemporada(fecha){
  return _mismaFecha(fecha, primerLunesDelMesJS(fecha.getFullYear(), fecha.getMonth()));
}


/** true si 'fecha' es el inicio de la PRIMERA temporada del año (el
 * primer lunes de enero) — pedido usuario: "la primera temporada del año,
 * ya que una temporada no siempre termina en fin de mes; ejm: si la
 * temporada termina el 5 de enero, la primera temporada del año inicia el
 * 6 de enero". El "inicio de año" de las gráficas NO es el 1 de enero
 * calendario, sino el primer lunes de enero (coincide siempre con un
 * esInicioTemporada() además de año). */
function esInicioAnio(fecha){
  return fecha.getMonth() === 0 && _mismaFecha(fecha, primerLunesDelMesJS(fecha.getFullYear(), 0));
}


/** true si 'fecha' es lunes — inicio de una semana de guerra (siempre
 * lunes a domingo, ya que cada temporada arranca en lunes y las semanas
 * son bloques de 7 días desde ahí). */
function esInicioSemana(fecha){
  return fecha.getDay() === 1;
}


/**
 * lineasTemporalesSvg(fechas, xPos, yIni, yFin, opts)
 * Dado un arreglo de Date (una por posición del eje X, en el MISMO orden
 * que usa xPos(i) en cada gráfica), devuelve el SVG de las líneas
 * verticales de referencia: inicio de año, de temporada y (solo si
 * opts.granularidadDiaria) de semana. Reglas exactas pedidas por el
 * usuario:
 * - Valores SEMANALES (un punto = una semana): solo año y temporada —
 *   una línea de "inicio de semana" en cada punto sería redundante.
 * - Valores DIARIOS (un punto = un día): año, temporada y ADEMÁS semana.
 * Año y temporada son mutuamente excluyentes por punto (el inicio de año
 * SIEMPRE es también inicio de temporada) — se prioriza la de año.
 * opts.prefijoClase permite que cada página use su propio namespace CSS
 * (ej. "ing-") para no chocar con otras gráficas del mismo documento,
 * mismo criterio que ya usa el resto de clases de este proyecto.
 */
function lineasTemporalesSvg(fechas, xPos, yIni, yFin, opts){
  opts = opts || {};
  const pref = opts.prefijoClase || '';
  const out = [];
  (fechas || []).forEach((f, i) => {
    if (!(f instanceof Date) || isNaN(f.getTime())) return;
    const x = xPos(i).toFixed(1);
    if (esInicioAnio(f)){
      out.push(`<line class="${pref}grid-line-anio" x1="${x}" y1="${yIni}" x2="${x}" y2="${yFin}"></line>`);
    } else if (esInicioTemporada(f)){
      out.push(`<line class="${pref}grid-line-temporada" x1="${x}" y1="${yIni}" x2="${x}" y2="${yFin}"></line>`);
    } else if (opts.granularidadDiaria && esInicioSemana(f)){
      out.push(`<line class="${pref}grid-line-semana" x1="${x}" y1="${yIni}" x2="${x}" y2="${yFin}"></line>`);
    }
  });
  return out.join('');
}


/**
 * gridHorizontalMediosSvg(pasos, techo, yPos, xIni, xFin, prefijoClase)
 * Líneas horizontales SECUNDARIAS, a la mitad del espaciado entre cada par
 * de líneas principales del eje Y (pedido usuario 07-sep-2026: "en el eje
 * y, todas las gráficas deben tener líneas horizontales a la mitad del
 * espaciamiento entre los valores del eje"). Sin etiqueta numérica (esas
 * las siguen poniendo solo las líneas principales de cada gráfica).
 */
function gridHorizontalMediosSvg(pasos, techo, yPos, xIni, xFin, prefijoClase){
  const cls = (prefijoClase || '') + 'grid-line-medio';
  const out = [];
  for (let i = 0; i < pasos; i++){
    const v = (techo / pasos) * (i + 0.5);
    const y = yPos(v).toFixed(1);
    out.push(`<line class="${cls}" x1="${xIni}" y1="${y}" x2="${xFin}" y2="${y}"></line>`);
  }
  return out.join('');
}


/* =========================================================================
 * Gráficas operables por teclado y lectores de pantalla (plan B-12).
 * Antes los puntos <circle> solo mostraban su valor al pasar el mouse
 * (tooltip flotante o <title> nativo): con teclado no había forma de
 * llegar a ellos. Un solo Tab entra a la gráfica (tabindex "móvil": solo
 * un punto a la vez tiene tabindex=0, así 20 series x 15 semanas no son
 * 300 paradas de Tab). Dentro: ←/→ recorren la serie, Inicio/Fin saltan a
 * su primer/último punto, ↑/↓ pasan a la serie anterior/siguiente en la
 * misma posición horizontal (semana), y Esc oculta el tooltip.
 * ========================================================================= */

/** Texto plano de un punto de serie (aria-label) — mismo contenido que el tooltip. */
function etiquetaPuntoSerie(pt){
  const { nombre, tag, valor, clan, semana, unidad } = pt.dataset;
  return `${nombre || ''}${tag ? ' (' + tag + ')' : ''}: ${fmtNum(valor)} ${unidad || ''} — ${clan || ''} · ${semana || ''}`;
}

/** HTML del tooltip de un punto de serie: lo usan el mouse y el foco de teclado. */
function htmlTooltipPuntoSerie(pt){
  const { nombre, tag, valor, clan, semana, unidad } = pt.dataset;
  return `<b>${esc(nombre)}${tag ? ' (' + esc(tag) + ')' : ''}</b><br><span style="color:var(--text-faint);">${esc(fmtNum(valor))} ${esc(unidad)} — ${esc(clan)} · ${esc(semana)}</span>`;
}

/** Tooltip flotante compartido (#chartTooltip); si la página no lo trae, se crea (mismo estilo, viene de styles.css). */
function obtenerTooltipGrafica(){
  let tip = document.getElementById('chartTooltip');
  if (!tip){
    tip = document.createElement('div');
    tip.id = 'chartTooltip';
    tip.className = 'chart-tooltip';
    document.body.appendChild(tip);
  }
  return tip;
}

/**
 * activarTecladoPuntosGrafica(svg, opts)
 * opts.selector     selector CSS de los puntos dentro del svg (por defecto 'circle').
 * opts.serieDe(pt)  clave de la serie a la que pertenece el punto (por defecto pt.dataset.serie).
 *                   Los puntos de una misma serie deben ir en el DOM en orden de izquierda a derecha.
 * opts.etiqueta(pt) texto del aria-label (por defecto: el <title> del círculo, o etiquetaPuntoSerie).
 * opts.htmlTooltip(pt) HTML del tooltip al enfocar (por defecto: el texto del <title>).
 * opts.titulo       nombre de la gráfica para lectores (por defecto: el .chart-title de su tarjeta).
 */
function activarTecladoPuntosGrafica(svg, opts){
  opts = opts || {};
  if (!svg || svg.dataset.tecladoActivo === '1') return;
  const puntos = Array.from(svg.querySelectorAll(opts.selector || 'circle'));
  if (!puntos.length) return;
  svg.dataset.tecladoActivo = '1';

  const tituloDe = pt => { const t = pt.querySelector('title'); return t ? t.textContent : ''; };
  const serieDe = opts.serieDe || (pt => pt.dataset.serie || '');
  const etiquetaDe = opts.etiqueta || (pt => tituloDe(pt).replace(/\s*\n\s*/g, '. ') || etiquetaPuntoSerie(pt));
  const htmlDe = opts.htmlTooltip || (pt => esc(tituloDe(pt) || etiquetaDe(pt)).replace(/\n/g, '<br>'));

  // Series en el orden en que aparecen en el DOM; posDe recuerda serie/posición de cada punto.
  const series = [], claves = new Map(), posDe = new Map();
  puntos.forEach(pt => {
    const k = serieDe(pt);
    if (!claves.has(k)){ claves.set(k, series.length); series.push([]); }
    const s = claves.get(k);
    posDe.set(pt, { s, i: series[s].length });
    series[s].push(pt);
  });

  const tip = obtenerTooltipGrafica();
  tip.style.display = 'none'; // por si un SVG anterior con foco fue reemplazado sin disparar 'blur'
  const ocultar = () => { tip.style.display = 'none'; };
  const mostrar = pt => {
    tip.innerHTML = htmlDe(pt);
    tip.style.display = 'block';
    const r = pt.getBoundingClientRect();
    let x = r.right + 10, y = r.bottom + 10;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = r.left - tip.offsetWidth - 10;
    if (y + tip.offsetHeight > window.innerHeight - 8) y = r.top - tip.offsetHeight - 10;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top  = Math.max(8, y) + 'px';
  };

  // Nombre de la gráfica y modo de uso para lectores de pantalla.
  const tarjetaTitulo = svg.closest('.card') && svg.closest('.card').querySelector('.chart-title');
  const titulo = opts.titulo || (tarjetaTitulo ? tarjetaTitulo.textContent.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim() : 'Gráfica');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', `${titulo}. Usa las flechas izquierda y derecha para recorrer los puntos${series.length > 1 ? ' y arriba y abajo para cambiar de serie' : ''}.`);

  // El foco que llega por un clic de mouse no abre el tooltip de teclado (el de hover ya está visible).
  // El foco de un clic ocurre en la misma tarea que el 'pointerdown', antes de este setTimeout.
  let clicReciente = false;
  svg.addEventListener('pointerdown', () => { clicReciente = true; setTimeout(() => { clicReciente = false; }, 0); }, true);

  let activo = series[0][0];
  puntos.forEach(pt => {
    pt.setAttribute('role', 'img');
    pt.setAttribute('aria-label', etiquetaDe(pt));
    pt.setAttribute('tabindex', pt === activo ? '0' : '-1');
    pt.setAttribute('data-kb', '1');
    pt.addEventListener('focus', () => {
      activo.setAttribute('tabindex', '-1');
      pt.setAttribute('tabindex', '0');
      activo = pt;
      if (!clicReciente) mostrar(pt); // con un clic de mouse ya se ve el tooltip de hover
    });
    pt.addEventListener('blur', ocultar);
  });

  const masCercanoEnX = (serie, ref) => {
    const x0 = Number(ref.getAttribute('cx'));
    return serie.reduce((mejor, pt) => Math.abs(Number(pt.getAttribute('cx')) - x0) < Math.abs(Number(mejor.getAttribute('cx')) - x0) ? pt : mejor, serie[0]);
  };

  svg.addEventListener('keydown', e => {
    const pos = posDe.get(e.target);
    if (!pos) return;
    const serie = series[pos.s];
    let destino = null;
    switch (e.key){
      case 'ArrowRight': destino = serie[pos.i + 1]; break;
      case 'ArrowLeft':  destino = serie[pos.i - 1]; break;
      case 'Home':       destino = serie[0]; break;
      case 'End':        destino = serie[serie.length - 1]; break;
      case 'ArrowDown':  if (series[pos.s + 1]) destino = masCercanoEnX(series[pos.s + 1], e.target); break;
      case 'ArrowUp':    if (series[pos.s - 1]) destino = masCercanoEnX(series[pos.s - 1], e.target); break;
      case 'Escape':     ocultar(); return;
      default: return;
    }
    e.preventDefault(); // evita que las flechas desplacen la página
    if (destino) destino.focus();
  });
}
