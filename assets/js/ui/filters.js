/* filters.js — filtro alfabético (A-Z/#) reutilizado en varias tablas. Extraído de common.js. */



/* =========================================================================
 * Filtro por letra A-Z/# — consolidado aquí (18-sep-2026, revisión de
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


/* =========================================================================
 * Buscador de jugadores para las tablas de guerra (24-oct-2026, tanda 14 de Consolidado_Mini_Historial_y_Perfil.md, pedido de la usuaria:
 * «en cada tabla de guerra, agrégale un cuadrito arriba donde me permita buscar por nombre o similar»). Una caja con lupa y ✕ por tabla, que
 * oculta las filas que no coinciden SIN recalcular nada y se combina con las pestañas de clan, la letra A-Z y los filtros por columna.
 * La coincidencia ignora mayúsculas, tildes (ñ cuenta como n) y el orden: todas las palabras escritas deben aparecer en el nombre o en el Tag.
 * [→ Contexto_Base_Web.md §PF224]
 * ========================================================================= */

/** normalizarBusqueda(texto) → minúsculas, sin tildes ni espacios sobrantes ('Ñoño ' → 'nono'). */
function normalizarBusqueda(texto){
  return String(texto == null ? '' : texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** coincideBusqueda(textoFila, consulta) → true si la consulta está vacía o TODAS sus palabras aparecen en el texto de la fila. */
function coincideBusqueda(textoFila, consulta){
  const palabras = normalizarBusqueda(consulta).split(/\s+/).filter(Boolean);
  if (!palabras.length) return true;
  const base = normalizarBusqueda(textoFila);
  return palabras.every(p => base.includes(p));
}

/**
 * pintarBuscadorTabla(wrapId, { placeholder, ariaLabel, fijar, onCambio })
 * Pinta UNA SOLA VEZ (guardia por dataset.pintado, igual que pintarFiltroLetra) la caja de búsqueda dentro de #wrapId. `fijar(texto)` guarda
 * lo escrito en la variable de la página y `onCambio()` reaplica el filtro sobre la tabla ya pintada. El contador de la derecha
 * (.buscador-cuenta) lo escribe la página con textoCuentaBuscador().
 */
function pintarBuscadorTabla(wrapId, opts){
  const wrap = document.getElementById(wrapId);
  if (!wrap || wrap.dataset.pintado) return;
  wrap.dataset.pintado = '1';
  wrap.setAttribute('role', 'search');
  wrap.innerHTML = `
    <div class="buscador-caja">
      <span class="buscador-lupa" aria-hidden="true">🔍</span>
      <input type="search" class="buscador-input" placeholder="${esc(opts.placeholder || 'Buscar jugador…')}" aria-label="${esc(opts.ariaLabel || 'Buscar jugador')}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      <button type="button" class="buscador-limpiar" aria-label="Borrar la búsqueda" hidden>✕</button>
    </div>
    <span class="buscador-cuenta" aria-live="polite"></span>`;
  const input = wrap.querySelector('.buscador-input');
  const limpiar = wrap.querySelector('.buscador-limpiar');
  const aplicar = () => { opts.fijar(input.value); limpiar.hidden = !input.value; opts.onCambio(); };
  input.addEventListener('input', aplicar);
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value){ input.value = ''; aplicar(); } });
  limpiar.addEventListener('click', () => { input.value = ''; aplicar(); input.focus(); });
}

/** textoCuentaBuscador(coinciden, total, enEsteClan) → texto corto del contador; '' si no hay búsqueda (la página no lo llama). */
function textoCuentaBuscador(coinciden, total, enEsteClan){
  if (!coinciden) return 'Sin coincidencias';
  return `${coinciden} de ${total}` + (enEsteClan === 0 ? ' · en otro clan' : '');
}

