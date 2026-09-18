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
