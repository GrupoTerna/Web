/*
 * roster-tabla.js — tabla de «Directorio por clan» para una página que muestra UN solo clan (clan.html).
 *
 * NUEVO (6-nov-2026, pedido de la usuaria): clan.html reemplaza su roster simple por la misma tabla de «Directorio por clan» de directorio.html
 * (N°, Ranking, Nombre, Tag, Rango, Perfil, V. Guerra, Copas, Arena, Nivel XP, Nivel cartas, Antigüedad y Vigencia; filtro y orden por columna,
 * letras A-Z/#, buscador por nombre o Tag, «Quitar filtros» y barras de desplazamiento moradas), pero solo con los miembros del clan de la página.
 *
 * Es una COPIA del código inline de directorio.html (formatearAntiguedad, ROSTER_COLUMNAS y todo hasta reordenarYRepintarRoster), con dos cambios:
 *   1. Tocar una fila abre el perfil del jugador (rosterAbrirMiembro()) en vez del panel «Buscar miembro» de Directorio.
 *   2. renderRosterClan(clan) recibe el clan en vez de leer rosterData[clanActivoIdx] y no tiene pastillas de clan.
 * Mantiene los mismos id (#rosterWrap, #rosterLetraFilter, #rosterBuscador, #rosterLimpiarFiltros, #rosterTopScroll, #rosterTableWrap).
 * Si cambia la tabla en directorio.html, hay que repetir el cambio aquí (unificarlas exige reescribir los tests de directorio, que extraen sus
 * funciones del <script> inline). Historial en CHANGELOG.md.
 *
 * Usa de otros archivos: esc/fmtNum/urlValida/fmtFechaVigenciaCorta (util.js), pintarFiltroLetra/pintarBuscadorTabla/coincideBusqueda/
 * textoCuentaBuscador/normalizarBusqueda/primeraLetraFiltro/LETRAS_FILTRO (ui/filters.js), activarBarraScrollTabla (ui/tables.js),
 * ICONO_ROYALEAPI/ICONO_CWSTATS (data/clan-badges.js) y botonHistJugador (features/mini-historial.js).
 */

/** Abre el perfil del jugador al tocar su fila (en Directorio se abre el panel «Buscar miembro» de la misma página; aquí no existe). */
function rosterAbrirMiembro(tag){
  if (!tag) return;
  location.href = 'perfil.html?tag=' + encodeURIComponent(tag);
}

function formatearAntiguedad(antiguedad){
  if (antiguedad === null || antiguedad === undefined || antiguedad === '') return null;
  const anios = Number(antiguedad);
  if (isNaN(anios)) return null;
  return `${anios} año${anios === 1 ? '' : 's'}`;
}

/**
 * ROSTER_COLUMNAS
 * FIX (07-sep-2026, pedido usuario — "aumentar el tamaño de letra... se
 * debe agregar el dato del ranking en el clan, Nivel (xp), Nivel
 * (cartas), Antigüedad, Copas, Arena, V_Guerra... numeración a la
 * izquierda del nombre (N°)... filtros en cada columna"): antes el
 * Directorio por clan era una lista de .miembro-row (nombre + tag +
 * rango + vigencia); ahora es una tabla real armada desde este arreglo
 * de columnas, así el encabezado, el ícono de filtro y cada celda salen
 * del mismo lugar (evita repetir 12 <th> a mano). `filtrable:false` deja
 * una columna sin ícono de filtro (no aplica para N°, es solo la
 * numeración visual de la fila).
 * FIX (08-sep-2026, pedido usuario — "Mueve las columnas V.GUERRA, COPAS
 * y ARENA a la derecha de RANGO"): antes iban después de Antigüedad
 * (junto a los demás datos "de progreso"); ahora quedan pegadas a la
 * derecha de Rango, en ese mismo orden (V. Guerra, Copas, Arena), y el
 * resto de columnas (Nivel XP, Nivel cartas, Antigüedad, Vigencia)
 * mantiene su orden relativo tal cual estaba.
 * FIX (08-sep-2026, pedido usuario — "Los filtros del directorio por
 * clan deben tener la opción de ordenar según sus valores (mayor a
 * menos, a a la z, etc) y también de filtrar (mayor o menor o igual
 * que). También debe haber la opción de seleccionar todas las
 * alternativas o desmarcar todas"): cada columna suma ahora dos campos
 * nuevos, además de `get` (que sigue siendo el TEXTO ya formateado que
 * se pinta en la celda):
 *   - `tipo`: 'numero' | 'fecha' | 'texto'. Decide cómo se ordena (numérico,
 *     cronológico o alfabético) y si tiene sentido ofrecerle el filtro de
 *     comparación (mayor/menor/igual que) — solo 'numero' y 'fecha' lo
 *     tienen, ver abrirFiltroColumna() más abajo.
 *   - `raw(m,i)`: el valor SIN formatear (número o fecha) que se usa para
 *     ordenar y comparar. Si no se define, la columna se ordena/filtra
 *     por el mismo texto de `get` (alfabético) — es el caso de Nombre,
 *     Tag, Rango y Arena, que ya son texto libre.
 * `sortable:false` (junto con `filtrable:false`, que ya existía) deja a
 * "N°" fuera de ambos: no tiene sentido ordenar por la numeración visual
 * de la fila ni filtrarla.
 */
const ROSTER_COLUMNAS = [
  { key:'num',         label:'N°',            cls:'rt-num',        filtrable:false, sortable:false, get:(m, i) => i + 1 },
  { key:'ranking',     label:'Ranking',       cls:'rt-ranking',     tipo:'numero', get:m => (m.ranking != null ? fmtNum(m.ranking) : null), raw:m => m.ranking },
  // 22-oct-2026 (pedido de la usuaria): `extra` agrega HTML después del texto de la celda sin tocar `get` (que sigue siendo lo que se ordena y filtra): aquí, el 📈 del mini historial de guerra (assets/js/features/mini-historial.js, mismo ícono que en guerra.html). [→ Contexto_Base_Web.md §PF169]
  { key:'nombre',      label:'Nombre',        cls:'rt-nombre',      tipo:'texto',  get:m => m.nombre, extra:m => botonHistJugador({ tag:m.tag, nombre:m.nombre }) },
  { key:'tag',         label:'Tag',           cls:'rt-tag',         tipo:'texto',  get:m => m.tag },
  { key:'rango',       label:'Rango',         cls:'rt-rango',       tipo:'texto',  get:m => m.rango },
  // FIX (17-sep-2026, pedido usuario — "agrega la columna perfil (de
  // guerra.html, que trae los íconos con link al perfil en royaleapi y
  // cwstats) e insértalo entre la columna Rango y V.Guerra"): mismo
  // patrón visual que .col-perfil-icons de guerra.html (ICONO_ROYALEAPI/
  // ICONO_CWSTATS + urlValida()), pero aquí sale de ROSTER_COLUMNAS como
  // cualquier otra columna de la tabla. Sin `tipo` (no es numérica ni de
  // fecha) y con `filtrable:false, sortable:false` porque son solo
  // enlaces, no un valor por el que tenga sentido ordenar/filtrar (mismo
  // criterio que la columna 'num'). `html:true` le dice a
  // celdaHtmlRoster() (más abajo) que el resultado de `get` ya es HTML
  // armado y no debe pasar por esc() como el resto de columnas de texto.
  { key:'perfil',      label:'Perfil',        cls:'rt-perfil',      filtrable:false, sortable:false, html:true, get:m => {
      const royaleOk = urlValida(m.royaleApi);
      const cwOk = urlValida(m.cwStats);
      if (!royaleOk && !cwOk) return '';
      return `${royaleOk ? `<a href="${esc(m.royaleApi)}" target="_blank" rel="noopener" aria-label="RoyaleAPI" title="RoyaleAPI">${ICONO_ROYALEAPI}</a>` : ''}${cwOk ? `<a href="${esc(m.cwStats)}" target="_blank" rel="noopener" aria-label="CWStats" title="CWStats">${ICONO_CWSTATS}</a>` : ''}`;
    } },
  { key:'vGuerra',     label:'V. Guerra',     cls:'rt-vguerra',     tipo:'numero', get:m => { const v = m.vGuerra != null ? m.vGuerra : m.victoriasGuerra; return v != null ? fmtNum(v) : null; }, raw:m => (m.vGuerra != null ? m.vGuerra : m.victoriasGuerra) },
  { key:'copas',       label:'Copas',         cls:'rt-copas',       tipo:'numero', get:m => (m.copas != null ? fmtNum(m.copas) : null), raw:m => m.copas },
  { key:'arena',       label:'Arena',         cls:'rt-arena',       tipo:'texto',  get:m => m.arena },
  { key:'nivelXp',     label:'Nivel (XP)',    cls:'rt-nivelxp',     tipo:'numero', get:m => (m.nivelXp != null ? fmtNum(m.nivelXp) : null), raw:m => m.nivelXp },
  { key:'nivelCartas', label:'Nivel (cartas)',cls:'rt-nivelcartas', tipo:'numero', get:m => (m.nivelCartas != null ? fmtNum(m.nivelCartas) : null), raw:m => m.nivelCartas },
  { key:'antiguedad',  label:'Antigüedad',    cls:'rt-antiguedad',  tipo:'numero', get:m => formatearAntiguedad(m.antiguedad), raw:m => (m.antiguedad === '' ? null : m.antiguedad) },
  { key:'vigencia',    label:'Vigencia',      cls:'rt-vigencia',    tipo:'fecha',  get:m => (m.vigencia ? fmtFechaVigenciaCorta(m.vigencia) : null), raw:m => m.vigencia },
];

const ICONO_FILTRO = '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1 2.5A.5.5 0 0 1 1.5 2h13a.5.5 0 0 1 .4.8L10 9.4V13a.5.5 0 0 1-.2.4l-2 1.5A.5.5 0 0 1 7 14.5v-5.1L1.1 2.8A.5.5 0 0 1 1 2.5z"/></svg>';

/** Estado de los filtros y del orden de la tabla activa.
 * rosterFiltrosSeleccion: por columna filtrada, o bien:
 *   - un Set de valores de texto (checklist "estilo hoja de cálculo"), o
 *   - un objeto { operador, valor } (filtro de comparación numérica o de
 *     fecha: operador es 'gt'|'gte'|'lt'|'lte'|'eq', valor ya viene
 *     convertido a número/timestamp — ver aplicarFiltrosRoster()).
 * Una columna sin entrada aquí = sin filtro (se ven todos).
 * rosterOrden: { colKey, dir } ('asc'|'desc') de la columna por la que
 * está ordenada la tabla ahora mismo, o null si no hay orden aplicado
 * (se respeta el orden que ya trae el backend, por Rango).
 * Ambos se reinician cada vez que se cambia de pestaña de clan (ver
 * renderRosterClanActivo()).
 * FIX (08-sep-2026, pedido usuario — "Los filtros del directorio por
 * clan deben tener la opción de ordenar según sus valores (mayor a
 * menos, a a la z, etc) y también de filtrar (mayor o menor o igual
 * que). También debe haber la opción de seleccionar todas las
 * alternativas o desmarcar todas"): antes el desplegable de cada
 * columna solo tenía el checklist de valores únicos; ahora suma también
 * los dos botones de orden, el filtro de comparación (en columnas
 * numéricas/fecha) y "Seleccionar todo"/"Desmarcar todo" — ver
 * abrirFiltroColumna() más abajo. */
let rosterFiltrosSeleccion = {};
let rosterOrden = null;
let rosterFiltroPopEl = null; // popover de filtro abierto actualmente (o null)
let rosterFiltroBtnEl = null; // el embudo que abrió el cuadro (para su aria-expanded y para devolverle el foco)
let rosterFiltroAncho = 0; // ancho de la ventana al abrir el cuadro: solo un cambio de ancho (girar el móvil) lo cierra; el alto cambia con la barra de direcciones y el teclado
let rosterMiembrosBase = []; // miembros del clan activo, en el orden original del backend (sin ordenar)
// Letra A-Z/# elegida en #rosterLetraFilter; se reinicia al cambiar de clan y se combina con los demás filtros sin pisarse. Historial en CHANGELOG.md.
let rosterLetraSeleccionada = null;
// Texto del buscador #rosterBuscador (nombre o Tag, §PF384). Se conserva al cambiar de clan y se combina con la letra y los filtros por columna.
let rosterBusqueda = '';

/** Todos los valores distintos (ya formateados como texto de celda, "—"
 * incluido si aplica) que puede tomar una columna en la lista de
 * miembros actual, ordenados. */
function valoresUnicosColumna(col, miembros){
  const set = new Set();
  miembros.forEach((m, i) => {
    const val = col.get(m, i);
    set.add(val === null || val === undefined || val === '' ? '—' : String(val));
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'es', { numeric:true, sensitivity:'base' }));
}

/** Valor "crudo" comparable de una celda: número, timestamp de fecha, o
 * (si la columna no define `raw`, ej. Nombre/Tag/Rango/Arena) el mismo
 * texto de get(). Se usa tanto para ordenar la tabla
 * (compararPorColumna()) como para guardarlo en data-raw de cada <td> y
 * poder filtrar por comparación (>, <, =) sin recalcular nada — ver
 * aplicarFiltrosRoster(). Devuelve null si el miembro no tiene valor. */
function rawColumna(col, m, i){
  if (col.raw){
    const r = col.raw(m, i);
    if (r === null || r === undefined || r === '') return null;
    if (col.tipo === 'fecha'){
      const d = r instanceof Date ? r : new Date(r);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    const n = Number(r);
    return isNaN(n) ? null : n;
  }
  const val = col.get(m, i);
  return (val === null || val === undefined || val === '') ? null : val;
}

/** Comparador para ordenar una lista de miembros según una columna +
 * dirección ('asc'|'desc'). Numérico/fecha: por rawColumna(); texto:
 * alfabético (localeCompare con numeric:true, para que "2" ordene antes
 * que "10" dentro de texto libre). Los valores vacíos ("—") siempre
 * quedan al final sin importar la dirección, que es el criterio más
 * predecible para quien esté mirando la tabla. */
function compararPorColumna(col, dir){
  const signo = dir === 'desc' ? -1 : 1;
  return (m1, m2) => {
    const a = rawColumna(col, m1, 0);
    const b = rawColumna(col, m2, 0);
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    if (col.tipo === 'texto' || !col.raw){
      return signo * String(a).localeCompare(String(b), 'es', { numeric:true, sensitivity:'base' });
    }
    return signo * (a - b);
  };
}

/** Etiquetas de los dos botones de orden según el tipo de columna:
 * "Menor a mayor"/"Mayor a menor" para números, "Más antiguo"/"Más
 * reciente primero" para fechas, "A → Z"/"Z → A" para texto. */
function etiquetasOrden(col){
  if (col.tipo === 'numero') return { asc:'Menor a mayor', desc:'Mayor a menor' };
  if (col.tipo === 'fecha')  return { asc:'Más antiguo primero', desc:'Más reciente primero' };
  return { asc:'A → Z', desc:'Z → A' };
}

function cerrarFiltroPopover(devolverFoco){
  // También es oyente de scroll y resize (ahí llega un evento): el foco solo vuelve con `true` exacto, al cerrar con Escape o con un botón del cuadro.
  if (rosterFiltroPopEl){ rosterFiltroPopEl.remove(); rosterFiltroPopEl = null; }
  if (rosterFiltroBtnEl){
    rosterFiltroBtnEl.setAttribute('aria-expanded', 'false');
    if (devolverFoco === true && rosterFiltroBtnEl.isConnected) rosterFiltroBtnEl.focus();
    rosterFiltroBtnEl = null;
  }
  document.removeEventListener('keydown', cerrarFiltroPopoverConEscape, true);
  document.removeEventListener('mousedown', cerrarFiltroPopoverSiFuera, true);
  window.removeEventListener('scroll', cerrarFiltroPopoverSiScrollFuera, true);
  window.removeEventListener('resize', cerrarFiltroPopoverSiCambiaAncho, true);
}
// 4-nov-2026: el scroll del propio cuadro (el cuadro y su lista de valores tienen overflow) no lo cierra; antes cualquier scroll lo cerraba y no se llegaba a «Aceptar». Un scroll de la página u otro bloque sí lo cierra, como antes.
function cerrarFiltroPopoverSiScrollFuera(e){
  if (rosterFiltroPopEl && e && e.target instanceof Node && rosterFiltroPopEl.contains(e.target)) return;
  cerrarFiltroPopover();
}
// 5-nov-2026 (PF361, 2.ª parte): en el móvil, la barra de direcciones y el teclado cambian el alto de la ventana (evento resize) y eso cerraba el cuadro mientras se desplazaba o se escribía en el buscador.
function cerrarFiltroPopoverSiCambiaAncho(){
  if (window.innerWidth !== rosterFiltroAncho) cerrarFiltroPopover();
}
function cerrarFiltroPopoverConEscape(e){ if (e.key === 'Escape') cerrarFiltroPopover(true); }
function cerrarFiltroPopoverSiFuera(e){
  if (rosterFiltroPopEl && !rosterFiltroPopEl.contains(e.target)) cerrarFiltroPopover();
}

/**
 * abrirFiltroColumna(col, btnEl, wrap)
 * Arma el desplegable estilo hoja de cálculo, de arriba a abajo:
 *   1) Ordenar (2 botones según el tipo de columna, ver etiquetasOrden())
 *      + "Quitar orden" si esta columna ya está ordenando la tabla ahora
 *      mismo. Se aplica al toque, sin esperar a "Aceptar" — no hay nada
 *      que confirmar.
 *   2) Filtro de comparación (solo columnas numéricas/fecha): operador
 *      (mayor/mayor o igual/menor/menor o igual/igual que) + valor.
 *   3) Buscador + "Seleccionar todo"/"Desmarcar todo" + checklist de
 *      valores únicos (todos tildados si la columna no tenía filtro
 *      previo, o reflejando la selección guardada).
 * Las casillas se tildan/destildan en una selección TEMPORAL (`temp`)
 * que solo se guarda en rosterFiltrosSeleccion al tocar "Aceptar" —
 * "Cancelar" descarta los cambios sin tocar el filtro ya aplicado. Si al
 * aceptar el filtro de comparación tiene operador + valor válidos,
 * reemplaza al checklist para esa columna (son mutuamente excluyentes:
 * no tiene sentido combinar "Copas > 3000" con una lista de valores
 * tildados a la vez).
 */
function abrirFiltroColumna(col, btnEl, wrap){
  const yaAbierto = rosterFiltroPopEl && rosterFiltroPopEl.dataset.col === col.key;
  cerrarFiltroPopover();
  if (yaAbierto) return; // click de nuevo en el mismo ícono: solo cierra

  const miembros = rosterMiembrosBase;
  const valores = valoresUnicosColumna(col, miembros);
  const seleccionPrevia = rosterFiltrosSeleccion[col.key];
  const esComparacionPrevia = seleccionPrevia && !(seleccionPrevia instanceof Set);
  const temp = new Set(seleccionPrevia instanceof Set ? [...seleccionPrevia] : valores);

  const tieneComparacion = col.tipo === 'numero' || col.tipo === 'fecha';
  const et = etiquetasOrden(col);
  const ordenActivo = rosterOrden && rosterOrden.colKey === col.key ? rosterOrden.dir : null;

  const pop = document.createElement('div');
  pop.className = 'rt-filtro-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', btnEl.getAttribute('title'));
  pop.dataset.col = col.key;
  pop.innerHTML = `
    ${col.sortable === false ? '' : `
    <div class="rt-filtro-orden">
      <button type="button" class="rt-orden-btn${ordenActivo === 'asc' ? ' activo' : ''}" data-dir="asc" aria-pressed="${ordenActivo === 'asc'}">↑ ${esc(et.asc)}</button>
      <button type="button" class="rt-orden-btn${ordenActivo === 'desc' ? ' activo' : ''}" data-dir="desc" aria-pressed="${ordenActivo === 'desc'}">↓ ${esc(et.desc)}</button>
      ${ordenActivo ? '<button type="button" class="rt-orden-quitar">✕ Quitar orden</button>' : ''}
    </div>
    <div class="rt-filtro-divisor"></div>`}
    ${tieneComparacion ? `
    <div class="rt-filtro-comparar">
      <select class="rt-comparar-operador" aria-label="Condición de comparación para ${esc(col.label)}">
        <option value="">Sin condición de comparación</option>
        <option value="gt">Mayor que…</option>
        <option value="gte">Mayor o igual que…</option>
        <option value="lt">Menor que…</option>
        <option value="lte">Menor o igual que…</option>
        <option value="eq">Igual a…</option>
      </select>
      <input type="${col.tipo === 'fecha' ? 'date' : 'number'}" class="rt-comparar-valor" placeholder="Valor…" aria-label="Valor a comparar para ${esc(col.label)}">
    </div>
    <div class="rt-filtro-divisor"></div>` : ''}
    <input type="text" class="rt-filtro-buscar" placeholder="Buscar valor…" aria-label="Buscar valor de ${esc(col.label)}">
    <div class="rt-filtro-todos">
      <button type="button" class="rt-filtro-todos-btn" data-modo="todo">Seleccionar todo</button>
      <button type="button" class="rt-filtro-todos-btn" data-modo="ninguno">Desmarcar todo</button>
    </div>
    <div class="rt-filtro-lista"></div>
    <div class="rt-filtro-acciones">
      <button type="button" class="rt-filtro-cancelar">Cancelar</button>
      <button type="button" class="rt-filtro-aceptar">Aceptar</button>
    </div>`;
  document.body.appendChild(pop);
  rosterFiltroPopEl = pop;
  rosterFiltroBtnEl = btnEl;
  btnEl.setAttribute('aria-expanded', 'true');

  // ---- Orden (se aplica al toque, no espera a "Aceptar") ----
  pop.querySelectorAll('.rt-orden-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      rosterOrden = { colKey: col.key, dir: btn.dataset.dir };
      cerrarFiltroPopover(true);
      reordenarYRepintarRoster(wrap);
    });
  });
  const btnQuitarOrden = pop.querySelector('.rt-orden-quitar');
  if (btnQuitarOrden){
    btnQuitarOrden.addEventListener('click', () => {
      rosterOrden = null;
      cerrarFiltroPopover(true);
      reordenarYRepintarRoster(wrap);
    });
  }

  // ---- Comparación: precarga el valor si ya había uno guardado ----
  if (tieneComparacion && esComparacionPrevia){
    pop.querySelector('.rt-comparar-operador').value = seleccionPrevia.operador;
    pop.querySelector('.rt-comparar-valor').value = col.tipo === 'fecha'
      ? new Date(seleccionPrevia.valor).toISOString().slice(0, 10)
      : seleccionPrevia.valor;
  }

  // ---- Checklist ----
  const listaEl = pop.querySelector('.rt-filtro-lista');
  const pintarLista = (filtroTexto) => {
    const q = (filtroTexto || '').trim().toLowerCase();
    const visibles = q ? valores.filter(v => v.toLowerCase().includes(q)) : valores;
    listaEl.innerHTML = visibles.length ? visibles.map(v => `
      <label class="rt-filtro-item">
        <input type="checkbox" value="${esc(v)}"${temp.has(v) ? ' checked' : ''}>
        <span>${esc(v)}</span>
      </label>`).join('') : '<div class="empty" style="padding:8px 5px; font-size:13px; font-style:normal; text-align:left;">Sin coincidencias.</div>';
    listaEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => { cb.checked ? temp.add(cb.value) : temp.delete(cb.value); });
    });
  };
  pintarLista('');

  // El buscador del popover tiene debounce de 180ms antes de repintar la lista. Historial en CHANGELOG.md.
  pop.querySelector('.rt-filtro-buscar').addEventListener('input', debounce(e => pintarLista(e.target.value), 180));

  // "Seleccionar todo"/"Desmarcar todo" actúan sobre todos los valores de la columna, no solo los visibles tras el buscador. Historial en CHANGELOG.md.
  pop.querySelector('[data-modo="todo"]').addEventListener('click', () => {
    valores.forEach(v => temp.add(v));
    pintarLista(pop.querySelector('.rt-filtro-buscar').value);
  });
  pop.querySelector('[data-modo="ninguno"]').addEventListener('click', () => {
    temp.clear();
    pintarLista(pop.querySelector('.rt-filtro-buscar').value);
  });

  pop.querySelector('.rt-filtro-cancelar').addEventListener('click', () => cerrarFiltroPopover(true));
  pop.querySelector('.rt-filtro-aceptar').addEventListener('click', () => {
    const operador = tieneComparacion ? pop.querySelector('.rt-comparar-operador').value : '';
    const valorCrudo = tieneComparacion ? pop.querySelector('.rt-comparar-valor').value : '';
    if (operador && valorCrudo !== ''){
      // Filtro de comparación activo: reemplaza al checklist para esta
      // columna (no tiene sentido combinar ambos a la vez).
      const valorNumerico = col.tipo === 'fecha' ? new Date(valorCrudo).getTime() : Number(valorCrudo);
      if (!isNaN(valorNumerico)) rosterFiltrosSeleccion[col.key] = { operador, valor: valorNumerico };
      else delete rosterFiltrosSeleccion[col.key];
    } else if (temp.size >= valores.length){
      // Todos tildados y sin comparación = sin filtro — se borra la
      // entrada en vez de guardar un Set completo (más simple de leer).
      delete rosterFiltrosSeleccion[col.key];
    } else {
      rosterFiltrosSeleccion[col.key] = temp;
    }
    cerrarFiltroPopover(true);
    aplicarFiltrosRoster(wrap);
    actualizarIconosFiltro(wrap);
  });

  // El popover cuelga del ícono clickeado (position:fixed) y se ajusta para no salirse de la ventana. Historial en CHANGELOG.md.
  const r = btnEl.getBoundingClientRect();
  const popAncho = 250;
  let left = Math.min(r.left, window.innerWidth - popAncho - 12);
  pop.style.left = Math.max(8, left) + 'px';
  // 5-nov-2026 (PF361, 2.ª parte): el cuadro mide más de lo que se suponía (≈560 px) y, al colgar de un embudo a media pantalla, «Aceptar» quedaba bajo el borde de la ventana; como es `position:fixed` y cabe en 80vh no tenía scroll propio, así que al arrastrar solo se movía la página y eso lo cerraba. Ahora se mide, se pone del lado con más espacio y su alto máximo es el espacio libre de ese lado: si no cabe, se desplaza por dentro hasta «Aceptar».
  const margenV = 8;
  const libreAbajo = window.innerHeight - r.bottom - 6 - margenV;
  const libreArriba = r.top - 6 - margenV;
  const altoCuadro = pop.scrollHeight; // alto natural del contenido (0 en jsdom)
  const abajo = altoCuadro <= libreAbajo || libreAbajo >= libreArriba;
  const altoMax = Math.max(abajo ? libreAbajo : libreArriba, 100);
  pop.style.maxHeight = altoMax + 'px';
  pop.style.top = (abajo ? r.bottom + 6 : Math.max(margenV, r.top - 6 - Math.min(altoCuadro, altoMax))) + 'px';
  rosterFiltroAncho = window.innerWidth;
  pop.tabIndex = -1; // el cuadro es el último nodo del <body>: sin esto, con teclado no se llega a él
  pop.style.outline = 'none';
  pop.focus({ preventScroll: true });

  setTimeout(() => {
    document.addEventListener('keydown', cerrarFiltroPopoverConEscape, true);
    document.addEventListener('mousedown', cerrarFiltroPopoverSiFuera, true);
    window.addEventListener('scroll', cerrarFiltroPopoverSiScrollFuera, true);
    window.addEventListener('resize', cerrarFiltroPopoverSiCambiaAncho, true);
  }, 0);
}

/** Colorea el ícono de embudo de cada columna que tiene un filtro activo
 * (rosterFiltrosSeleccion[col.key] existe, sea checklist o comparación),
 * y la flechita (↑/↓) de la columna que ordena la tabla ahora mismo. */
function actualizarIconosFiltro(wrap){
  wrap.querySelectorAll('.rt-filtro-btn').forEach(btn => {
    const conFiltro = !!rosterFiltrosSeleccion[btn.dataset.col];
    btn.classList.toggle('activo', conFiltro);
    btn.setAttribute('aria-label', btn.getAttribute('title') + (conFiltro ? ' (con filtro)' : '')); // antes el filtro activo solo se veía por el color
  });
  wrap.querySelectorAll('.rt-orden-indicador').forEach(sp => {
    const activo = rosterOrden && rosterOrden.colKey === sp.dataset.col;
    sp.textContent = activo ? (rosterOrden.dir === 'desc' ? '↓' : '↑') : '';
    const th = sp.closest('th');
    if (th) th.setAttribute('aria-sort', activo ? (rosterOrden.dir === 'desc' ? 'descending' : 'ascending') : 'none');
  });
  actualizarBotonLimpiarFiltros(wrap);
}

/** Habilita el botón "Quitar filtros" solo si hay al menos una columna
 * filtrada ahora mismo (pedido usuario 08-sep-2026) — deshabilitado
 * (opacidad baja, sin click) cuando no hay nada que limpiar. */
function actualizarBotonLimpiarFiltros(wrap){
  const btn = wrap.querySelector('#rosterLimpiarFiltros');
  if (btn) btn.disabled = !Object.keys(rosterFiltrosSeleccion).length;
}

/** Aplica los filtros ya ACEPTADOS (rosterFiltrosSeleccion) sobre las
 * filas ya pintadas de la tabla — oculta (display:none) las que no
 * calcen con TODAS las columnas filtradas a la vez (AND entre columnas).
 * Cada entrada puede ser un Set (checklist, compara contra el TEXTO de
 * la celda) o un objeto {operador, valor} (comparación numérica/fecha,
 * compara contra el data-raw del <td> — ver rawColumna()/celdaHtmlRoster()).
 * Se llama al tocar "Aceptar" en cualquier columna y también tras
 * reordenar la tabla, sin volver a pedir datos al backend. */
function aplicarFiltrosRoster(wrap){
  const cols = Object.keys(rosterFiltrosSeleccion);
  const filas = wrap.querySelectorAll('tbody tr.js-miembro');
  let coincidenBusqueda = 0; // filas del clan activo que calzan con el buscador (para el contador «N de M»)
  filas.forEach(fila => {
    const pasaCols = cols.every(colKey => {
      const col = ROSTER_COLUMNAS.find(c => c.key === colKey);
      const celda = fila.querySelector(`.${col.cls}`);
      const filtro = rosterFiltrosSeleccion[colKey];
      if (filtro instanceof Set){
        const texto = celda ? celda.textContent : '—';
        return filtro.has(texto);
      }
      // Filtro de comparación: sin valor numérico/fecha en esta fila, no
      // puede satisfacer ninguna condición de comparación.
      const raw = celda && celda.dataset.raw !== undefined && celda.dataset.raw !== '' ? Number(celda.dataset.raw) : null;
      if (raw === null || isNaN(raw)) return false;
      switch (filtro.operador){
        case 'gt':  return raw > filtro.valor;
        case 'gte': return raw >= filtro.valor;
        case 'lt':  return raw < filtro.valor;
        case 'lte': return raw <= filtro.valor;
        case 'eq':  return raw === filtro.valor;
        default:    return true;
      }
    });
    // La fila también debe pasar el filtro por letra elegido, además de los filtros por columna. Historial en CHANGELOG.md.
    const pasaLetra = !rosterLetraSeleccionada || fila.dataset.letra === rosterLetraSeleccionada;
    // Buscador por nombre o Tag (§PF384): coincidencia parcial, sin tildes ni mayúsculas, todas las palabras en cualquier orden.
    const pasaBusqueda = coincideBusqueda(fila.dataset.buscar, rosterBusqueda);
    if (pasaBusqueda) coincidenBusqueda++;
    fila.style.display = (pasaCols && pasaLetra && pasaBusqueda) ? '' : 'none';
  });
  const cuenta = document.querySelector('#rosterBuscador .buscador-cuenta');
  if (cuenta) cuenta.textContent = normalizarBusqueda(rosterBusqueda) ? textoCuentaBuscador(coincidenBusqueda, filas.length, coincidenBusqueda) : '';
}

/** Arma el <td> de una celda, agregando data-raw (el valor crudo, sin
 * formatear) cuando la columna es numérica o de fecha — lo usa el
 * filtro de comparación (aplicarFiltrosRoster()) sin tener que volver a
 * calcularlo a partir del arreglo de miembros.
 * FIX (17-sep-2026, pedido usuario — columna "Perfil" con íconos de
 * RoyaleAPI/CWStats): columnas con `html:true` (ver ROSTER_COLUMNAS) ya
 * devuelven su propio HTML armado (enlaces + SVG) desde `get` — a
 * diferencia del resto de columnas (texto plano), NO deben pasar por
 * esc(), o los <a> quedarían escapados como texto literal en vez de
 * renderizarse como enlaces. */
function celdaHtmlRoster(col, m, i){
  const val = col.get(m, i);
  const raw = rawColumna(col, m, i);
  const dataRaw = (col.tipo === 'numero' || col.tipo === 'fecha') && raw !== null ? ` data-raw="${esc(String(raw))}"` : '';
  const contenido = col.html
    ? (val || '—')
    : (val === null || val === undefined || val === '' ? '—' : esc(val));
  // 22-oct-2026 (§PF172): con `extra` (el 📈 y el ícono de WhatsApp) el nombre va a la izquierda y las acciones pegadas a la derecha de la celda, como en Valores diarios de guerra.html.
  const interior = col.extra
    ? `<div class="col-jugador-inner"><span class="col-jugador-nombre">${contenido}</span><span class="col-jugador-extras">${col.extra(m, i)}</span></div>`
    : contenido;
  return `<td class="${col.cls}"${dataRaw}>${interior}</td>`;
}

function filasHtmlRoster(miembros){
  return miembros.map((m, i) => {
    const celdas = ROSTER_COLUMNAS.map(c => celdaHtmlRoster(c, m, i)).join('');
    return `<tr class="js-miembro" data-tag="${esc(m.tag)}" data-letra="${esc(primeraLetraFiltro(m.nombre))}" data-buscar="${esc((m.nombre || '') + ' ' + (m.tag || ''))}">${celdas}</tr>`;
  }).join('');
}

/** Repinta SOLO el <tbody> de la tabla activa (por ejemplo, tras cambiar
 * el orden), reengancha el click de cada fila, reaplica los filtros ya
 * aceptados y actualiza el ícono de embudo + la flechita de orden. No
 * toca el <thead> ni el resto del wrap (barra de scroll, botón "Quitar
 * filtros"), así reordenar no reinicia nada de eso. */
function pintarFilasRoster(wrap, miembros){
  const tbody = wrap.querySelector('.roster-table tbody');
  if (!tbody) return;
  tbody.innerHTML = filasHtmlRoster(miembros);
  tbody.querySelectorAll('.js-miembro').forEach(row => {
    row.addEventListener('click', e => {
      // La columna "Perfil" trae enlaces reales a RoyaleAPI/CWStats (target="_blank"): si el clic cae en cualquier <a>, actúa ese enlace y no se abre también el perfil interno.
      // Igual con el 📈 del mini historial (22-oct-2026): abre su propia ventana y no debe abrir además el perfil.
      // Igual con el ⚠️ de clanes vetados o rivales (5-nov-2026, §PF375): abre su propio modal.
      if (e.target.closest('a, .btn-hist-jugador, .btn-alerta-clanes')) return;
      rosterAbrirMiembro(row.dataset.tag);
    });
  });
  aplicarFiltrosRoster(wrap);
  actualizarIconosFiltro(wrap);
}

/** Ordena rosterMiembrosBase según rosterOrden (o lo deja tal cual si no
 * hay orden aplicado, es decir, el orden que ya trae el backend por
 * Rango) y repinta la tabla con ese resultado. */
function reordenarYRepintarRoster(wrap){
  let miembros = rosterMiembrosBase;
  if (rosterOrden){
    const col = ROSTER_COLUMNAS.find(c => c.key === rosterOrden.colKey);
    if (col) miembros = [...rosterMiembrosBase].sort(compararPorColumna(col, rosterOrden.dir));
  }
  pintarFilasRoster(wrap, miembros);
}

/** Pinta «Directorio por clan» de UN clan: { nombre, miembros:[…] } tal como viene en roster.json. */
function renderRosterClan(clan){
  const wrap = document.getElementById('rosterWrap');
  if (!clan){ wrap.innerHTML = '<div class="card"><div class="empty">No hay datos del clan para mostrar.</div></div>'; return; }

  const miembros = clan.miembros;
  if (!miembros.length){
    wrap.innerHTML = '<div class="card"><div class="empty">Este clan todavía no tiene miembros registrados.</div></div>';
    return;
  }

  cerrarFiltroPopover();
  rosterFiltrosSeleccion = {}; // cambiar de clan resetea los filtros — cada clan tiene sus propios valores
  rosterOrden = null;          // ...y también el orden — cada clan arranca de nuevo en el orden del backend (por Rango)
  rosterLetraSeleccionada = null; // ...y también la letra elegida (mismo criterio, ver docblock de arriba)
  rosterMiembrosBase = miembros;

  // pintarFiltroLetra() solo pinta la primera vez; en cada cambio de clan solo se limpia el estado "active" de la letra anterior. Historial en CHANGELOG.md.
  pintarFiltroLetra('rosterLetraFilter', LETRAS_FILTRO, () => rosterLetraSeleccionada, v => rosterLetraSeleccionada = v, () => {
    const rosterWrap = document.getElementById('rosterWrap');
    if (rosterWrap) aplicarFiltrosRoster(rosterWrap);
  });
  // Buscador por nombre o Tag: se pinta una sola vez (guardia dentro de pintarBuscadorTabla()); lo escrito se conserva al cambiar de clan. §PF384
  pintarBuscadorTabla('rosterBuscador', { placeholder:'Buscar jugador o Tag…', ariaLabel:'Buscar jugador en el roster', fijar: v => rosterBusqueda = v, onCambio: () => {
    const rosterWrap = document.getElementById('rosterWrap');
    if (rosterWrap) aplicarFiltrosRoster(rosterWrap);
  } });
  const letraFilterWrap = document.getElementById('rosterLetraFilter');
  if (letraFilterWrap) letraFilterWrap.querySelectorAll('.letra-btn').forEach(b => b.classList.remove('active'));

  const encabezado = ROSTER_COLUMNAS.map(c => `
    <th scope="col"><div class="rt-th-inner"><span>${esc(c.label)}</span>${c.sortable === false ? '' : `<span class="rt-orden-indicador" data-col="${c.key}"></span>`}${c.filtrable === false ? '' :
      `<button type="button" class="rt-filtro-btn" data-col="${c.key}" title="Ordenar o filtrar por ${esc(c.label)}" aria-label="Ordenar o filtrar por ${esc(c.label)}" aria-haspopup="dialog" aria-expanded="false">${ICONO_FILTRO}</button>`
    }</div></th>`).join('');

  wrap.innerHTML = `
    <div class="card" style="padding:0;">
      <div class="roster-clan-header">
        <h3 class="roster-clan-title">${esc(clan.nombre)} <span class="text-faint" style="font-family:var(--f-mono); font-size:13px; font-weight:400;">(${fmtNum(miembros.length)} miembro${miembros.length === 1 ? '' : 's'})</span></h3>
        <button type="button" class="rt-limpiar-filtros" id="rosterLimpiarFiltros" title="Desmarcar todos los filtros" aria-label="Desmarcar todos los filtros" disabled>✕ Quitar filtros</button>
      </div>
      <div class="roster-topbar">
        <div class="roster-top-scroll scroll-morado" id="rosterTopScroll"><div class="roster-top-scroll-inner tabla-scroll-top-inner" id="rosterTopScrollInner"></div></div>
      </div>
      <div class="roster-table-wrap" id="rosterTableWrap">
        <table class="roster-table">
          <thead><tr>${encabezado}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  pintarFilasRoster(wrap, rosterMiembrosBase);

  // FIX (18-sep-2026, pedido usuario — "en directorio por clan no se ve la
  // barra superior, la inferior sí" + "todas las tablas deben tener barra
  // superior, inferior y vertical, todas moradas, ninguna nativa"): el
  // armado manual de aquí (que solo fijaba el ancho de la barra superior
  // UNA vez, justo al pintar, sin esperar a que las fuentes web terminaran
  // de cargar) se reemplaza por activarBarraScrollTabla() —ver
  // assets/common.js—, que hace lo mismo pero recalculando también tras
  // el swap de fuentes y ante cualquier cambio de tamaño real de la tabla
  // (ResizeObserver), y de paso agrega el límite de alto + scroll vertical
  // morado a la derecha que esta tabla no tenía. Se le pasa la franja
  // superior que ya existe en el HTML (#rosterTopScroll) para no crear una
  // segunda de más. Historial en CHANGELOG.md.
  const tableWrap = document.getElementById('rosterTableWrap');
  activarBarraScrollTabla(tableWrap, { barraSuperior: document.getElementById('rosterTopScroll') });

  // Botón "Quitar filtros" borra todas las columnas filtradas de un toque; se habilita/deshabilita según haya filtros activos. Historial en CHANGELOG.md.
  document.getElementById('rosterLimpiarFiltros').addEventListener('click', () => {
    rosterFiltrosSeleccion = {};
    aplicarFiltrosRoster(wrap);
    actualizarIconosFiltro(wrap);
  });
  actualizarBotonLimpiarFiltros(wrap);
  wrap.querySelectorAll('.rt-filtro-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = ROSTER_COLUMNAS.find(c => c.key === btn.dataset.col);
      abrirFiltroColumna(col, btn, wrap);
    });
  });
}
