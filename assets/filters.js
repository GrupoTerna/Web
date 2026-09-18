/* filters.js — filtro alfabético (A-Z/#) reutilizado en varias tablas. Extraído de common.js. */



/* =========================================================================
 * Filtro por letra A-Z/# — consolidado acá (18-sep-2026, revisión de
 * código repetido entre páginas). Antes existían tres copias casi
 * idénticas de la fila de botones (pintarFiltroLetraPendientes() y
 * pintarFiltroLetraGrid() en guerra.html, pintarFiltroLetraRoster() en
 * directorio.html) más dos copias BYTE A BYTE idénticas de
 * primeraLetraFiltro() y del array de letras (LETRAS_FILTRO_PEND en
 * guerra.html, LETRAS_FILTRO en directorio.html). La única diferencia real
 * entre las tres versiones de la función de pintado era el id del wrap, el
 * getter/setter de la letra elegida y el callback de re-filtrado — el
 * resto (armar los botones, guardia por dataset.pintado, toggle de
 * seleccionado) era exactamente el mismo código. Se unifica en
 * pintarFiltroLetra(), parametrizada igual que ya lo estaba
 * pintarFiltroLetraGrid() en guerra.html (que de hecho ya se reusaba ahí
 * mismo para "Activos" y "Temporada"); cada página sigue definiendo su
 * propia variable de módulo para la letra elegida y su propia función de
 * re-filtrado (esas sí son distintas entre páginas y se quedan donde
 * estaban). Se agrega aria-label en cada botón (antes solo llevaban el
 * texto visual de la letra).
 * ========================================================================= */
const LETRAS_FILTRO = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'];


/** primeraLetraFiltro(nombre) → 'A'..'Z'/'Ñ' o '#' (números/símbolos/vacío). */
function primeraLetraFiltro(nombre){
  const t = String(nombre || '').trim();
  if (!t) return '#';
  const c = t.charAt(0).toUpperCase();
  return /^[A-ZÑ]$/.test(c) ? c : '#';
}


/**
 * pintarFiltroLetra(wrapId, letras, obtenerSel, fijarSel, onCambio)
 * Pinta la fila de botones UNA SOLA VEZ (guardia por dataset.pintado —
 * para filas que no dependen de qué llegó del backend, así que no hace
 * falta reconstruirlas en cada refresco) y engancha el toggle de
 * selección. `obtenerSel`/`fijarSel` leen y escriben la variable de
 * módulo de la página que sea (ej. letraSeleccionadaPend,
 * rosterLetraSeleccionada); `onCambio` es lo que esa página necesite
 * hacer para reaplicar el filtro sobre su tabla ya pintada.
 */
function pintarFiltroLetra(wrapId, letras, obtenerSel, fijarSel, onCambio){
  const wrap = document.getElementById(wrapId);
  if (!wrap || wrap.dataset.pintado) return;
  wrap.dataset.pintado = '1';
  wrap.innerHTML = letras.map(l => `
    <button type="button" class="tab-btn letra-btn" data-letra="${esc(l)}" aria-label="Filtrar por letra ${esc(l)}">${esc(l)}</button>`).join('');
  wrap.querySelectorAll('.letra-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = btn.dataset.letra;
      const nuevo = (obtenerSel() === l) ? null : l;
      fijarSel(nuevo);
      wrap.querySelectorAll('.letra-btn').forEach(b => b.classList.toggle('active', b.dataset.letra === nuevo));
      onCambio();
    });
  });
}
