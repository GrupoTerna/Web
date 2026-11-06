/**
 * assets/js/features/grid-guerra.js — motor de las cuadrículas de guerra (Valores diarios, Valores semanales y Pendientes):
 * celdas, encabezados con filtro/orden por columna, totales, exportar, letra/buscador/«Solo con 0 ataques» y columna del día de hoy.
 * Antes vivía dentro del <script> inline de guerra.html; se movió aquí tal cual (6-nov-2026, pedido de la usuaria) para que clan.html
 * pinte la misma tabla de Valores semanales solo con su clan. Es de script clásico: comparte el ámbito global con la página.
 * La página que lo cargue debe declarar, antes de usarlo: DIAS, letraSeleccionadaPend/Activos/Temporada, busquedaPend/Activos/Temporada,
 * soloCeroActivos/Temporada y (guerra.html) lo demás de su estado. Historial en CHANGELOG.md.
 */
/* claseCeldaCA(n) / celdasMegacategoria(m, gpClase, conColor) Historial en CHANGELOG.md. */
/* Umbral del verde en Valores semanales (05-oct-2026): una semana tiene hasta 16 ataques (4 días x 4), así que verde = semana completa. Cambia este número para ajustar el criterio. */
const UMBRAL_VERDE_SEMANAL = 16;
/* NUEVO (23-oct-2026, tanda 6 del consolidado del mini historial, pedido usuario — «en guerra.html se resalte o sombree la semana o día actual (columna)»; [→ Contexto_Base_Web.md §PF176]).
 * Qué columna se marca es una decisión pura de estas funciones, sin tocar el DOM:
 *  - Día de guerra: el día de hoy según ctx.periodIndex (jueves a domingo = periodIndex % 7 de 3 a 6, igual que perfil.html), aunque aún no tenga datos (P10).
 *  - Entrenamiento (lunes a miércoles): se queda marcado el último día jugado, el domingo (data.guerraCongeladaLetra, 'D' por defecto) de la semana anterior (P9).
 *  - Solo se marca si lo que se está mostrando ES esa semana (temporada y semana elegidas = la vigente en guerra, o la última jugada en entrenamiento). Con otra semana elegida no se marca nada. */
const _mismoValorGuerra = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);
function letraHoyGuerra(data){
  const ctx = (data && data.ctx) || {};
  if (!ctx.esDiaGuerra) return (data && data.guerraCongeladaLetra) || 'D';
  if (ctx.periodIndex !== undefined && ctx.periodIndex !== null && Number.isFinite(Number(ctx.periodIndex))){
    const i = (((Number(ctx.periodIndex) % 7) + 7) % 7) - 3;
    if (i >= 0 && i < DIAS.length) return DIAS[i].letra;
  }
  return ctx.diaLetra || null;
}
function semanaHoyGuerra(data){
  const ctx = (data && data.ctx) || {};
  if (ctx.esDiaGuerra) return { temporada: ctx.temporada, sectionIndex: ctx.sectionIndex };
  const def = data && data.valoresDiariosSelectores && data.valoresDiariosSelectores.porDefecto;
  return def ? { temporada: def.temporada, sectionIndex: def.sectionIndex } : null;
}
/* Valores diarios: { key:'j'|'v'|'s'|'d', titulo } de la columna a marcar, o null. */
function colHoyDiario(data, temporadaSel, sectionIndexSel){
  const sem = semanaHoyGuerra(data);
  if (!sem || !_mismoValorGuerra(temporadaSel, sem.temporada) || !_mismoValorGuerra(sectionIndexSel, sem.sectionIndex)) return null;
  const letra = letraHoyGuerra(data);
  if (!letra) return null;
  return { key: String(letra).toLowerCase(), titulo: data.ctx && data.ctx.esDiaGuerra ? 'Hoy: día de guerra en curso' : 'Último día de guerra jugado (el domingo)' };
}
/* Valores semanales: { idx, titulo } de la columna de la semana en curso (en entrenamiento, la última jugada), o null. Las columnas se llaman 'Sem N' con N = sectionIndex + 1 (_getControlTemporadaPorClan(), 38_Web_Endpoints.gs). Si esa semana aún no tiene columna no se crea ni se marca otra (P12). `temporadaSel` null = se está mostrando la temporada vigente. */
function colHoySemanal(data, temporadaSel, semanasLabels){
  const sem = semanaHoyGuerra(data);
  if (!sem || !Array.isArray(semanasLabels)) return null;
  const temporada = (temporadaSel === undefined || temporadaSel === null || temporadaSel === '') ? (data.ctx && data.ctx.temporada) : temporadaSel;
  if (!_mismoValorGuerra(temporada, sem.temporada)) return null;
  const n = Number(sem.sectionIndex);
  if (sem.sectionIndex === null || sem.sectionIndex === undefined || !Number.isFinite(n)) return null;
  const idx = semanasLabels.findIndex(l => { const m = /(\d+)/.exec(String(l)); return !!m && Number(m[1]) === n + 1; });
  if (idx < 0) return null;
  return { idx, titulo: data.ctx && data.ctx.esDiaGuerra ? 'Semana de guerra en curso' : 'Última semana jugada' };
}
/* NUEVO (05-oct-2026): `umbral` = ataques que exige esa semana = 16 menos 4 por cada día en que el clan ya había cruzado la meta (atacar era opcional). Sin dato de días opcionales vale 16, igual que antes. */
function claseCeldaSemana(n, umbral){ const u = umbral === undefined ? UMBRAL_VERDE_SEMANAL : umbral; return n >= u ? 'ai-cell ai-cell-full' : (n > 0 ? 'ai-cell ai-cell-part' : 'ai-cell ai-cell-zero'); }
function claseCeldaCA(n){ return n >= 4 ? 'ai-cell ai-cell-full' : (n > 0 ? 'ai-cell ai-cell-part' : 'ai-cell ai-cell-zero'); }
/* celdasMegacategoria(m, gpClase, conColor, keyPrefix) Historial en CHANGELOG.md. */
function celdasMegacategoria(m, gpClase, conColor, keyPrefix, opc, colHoy){
  // NUEVO (05-oct-2026): `opc` = letras de días en que el clan ya había cruzado la meta (atacar era opcional). Solo cambia el color de un 0 en esa celda; el valor no se altera.
  const diasOpc = Array.isArray(opc) ? opc : [];
  // FIX (05-oct-2026, pedido usuario): `null` = el jugador NO estuvo en el clan ese día -> celda VACÍA (no 0). El 0 queda solo para "estuvo y no atacó". `undefined` (otras fuentes, p. ej. Inactivos) se sigue leyendo como 0.
  const val = (x) => x === null ? null : (x ?? 0);
  const j = val(m?.j), v = val(m?.v), s = val(m?.s), d = val(m?.d), total = val(m?.total);
  // NUEVO (23-oct-2026, tanda 6): `colHoy` = clave ('j','v','s','d') de la columna del día de hoy; solo vale en las cuadrículas con keyPrefix (Valores diarios), no en Inactivos. [→ Contexto_Base_Web.md §PF176]
  const hoy = (k) => keyPrefix && colHoy === k ? ' ai-hoy' : '';
  const claseDia = (k, n) => `${gpClase} ${conColor ? claseCeldaCA(n) : 'ai-num'}${hoy(k)}`;
  const claseTotal = `${gpClase} ai-total ${conColor && total >= 16 ? 'ai-total-full' : ''}`;
  const dc = (k, x) => keyPrefix ? ` data-col="${keyPrefix}-${k}" data-raw="${x === null ? '' : esc(String(x))}"` : '';
  const celdaDia = (k, n) => {
    if (n === null) return `<td class="${gpClase} ai-num${hoy(k)}"${dc(k, n)}></td>`;
    if (conColor && n === 0 && diasOpc.includes(k)) return `<td class="${gpClase} ai-cell ai-cell-opc${hoy(k)}"${dc(k, n)} data-opc="1" title="Meta ya cruzada: atacar era opcional">0</td>`;
    return `<td class="${claseDia(k, n)}"${dc(k, n)}>${conColor ? n : fmtNum(n)}</td>`;
  };
  return `
                ${celdaDia('j', j)}
                ${celdaDia('v', v)}
                ${celdaDia('s', s)}
                ${celdaDia('d', d)}
                <td class="${claseTotal}"${dc('total', total)}>${total === null ? '' : fmtNum(total)}</td>`;
}

/* celdasSemanas(megacat, gpClase, conColor) Equivalente a celdasMegacategoria() pero para el "Tipo Control_2" (Cuadrícula de Temporada): en vez de 4 columnas fijas J/V/S/D, pinta una columna por cada semana ya jugada de la temporada (megacat.semanas, Historial en CHANGELOG.md. */
/* celdasSemanas(megacat, gpClase, conColor, keyPrefix) Mismo criterio y mismo 4° parámetro `keyPrefix` (opcional) que celdasMegacategoria() de arriba — ver ese docblock. Aquí las claves de columna son "{keyPrefix}-sem{i}" (una por semana), "{keyPrefix}-resumen"… */
function celdasSemanas(megacat, gpClase, conColor, keyPrefix, idxHoy){
  const semanas = Array.isArray(megacat?.semanas) ? megacat.semanas : [];
// _getControlTemporadaPorClan() (20_Control2_ GuerraSemanal.gs) nunca devuelve un campo `resumen` -- devuelve `total` para Ataques/Barcos y `prom` para Puntaje (ver docblock de esa función). Historial en CHANGELOG.md.
  // FIX (05-oct-2026, pedido usuario): `null` = no estuvo en el clan esa semana (o semana futura) -> celda VACÍA. Resumen/% también vacíos si no hubo ninguna semana presente (null); el 0 queda solo para "estuvo y no atacó".
  const numONull = (x) => (x === null || x === undefined) ? null : (Number(x) || 0);
  const resumenRaw = megacat?.resumen ?? megacat?.total ?? megacat?.prom;
  const resumen = numONull(resumenRaw);
  const pctRaw = megacat?.pct;
  const pct = pctRaw === null ? null : (Number(pctRaw) || 0);
  // NUEVO (05-oct-2026): megacat.opc = arreglo paralelo a `semanas` con los días opcionales de cada semana (número, o arreglo de letras j/v/s/d). Si falta, todos los días cuentan (umbral 16).
  const opcArr = Array.isArray(megacat?.opc) ? megacat.opc : [];
  const diasOpcSem = (i) => { const o = opcArr[i]; const c = Array.isArray(o) ? o.length : (Number(o) || 0); return Math.max(0, Math.min(4, c)); };
  const umbralSem = (i) => UMBRAL_VERDE_SEMANAL - 4 * diasOpcSem(i);
  const umbralTotal = semanas.reduce((a, v, i) => a + (numONull(v) === null ? 0 : umbralSem(i)), 0);
  // NUEVO (23-oct-2026, tanda 6): `idxHoy` = posición de la columna de la semana en curso (ver colHoySemanal()); solo vale en las cuadrículas con keyPrefix. [→ Contexto_Base_Web.md §PF176]
  const hoy = (i) => keyPrefix && idxHoy !== undefined && idxHoy !== null && idxHoy === i ? ' ai-hoy' : '';
  const claseSemana = (n, i) => `${gpClase} ${conColor ? claseCeldaSemana(n, umbralSem(i)) : 'ai-num'}${hoy(i)}`;
  const claseResumen = `${gpClase} ai-resumen ai-total ${conColor && resumen !== null && umbralTotal > 0 && resumen >= umbralTotal ? 'ai-total-full' : ''}`;
  const dc = (k, val) => keyPrefix ? ` data-col="${keyPrefix}-${k}" data-raw="${val === null ? '' : esc(String(val))}"` : '';
  const celdasSem = semanas.map((v, i) => {
    const n = numONull(v);
    return n === null
      ? `<td class="${gpClase} ai-num${hoy(i)}"${dc('sem' + i, n)}></td>`
      : (conColor && n === 0 && diasOpcSem(i) === 4)
        ? `<td class="${gpClase} ai-cell ai-cell-opc${hoy(i)}"${dc('sem' + i, n)} data-opc="1" title="Meta ya cruzada los 4 días: atacar era opcional">0</td>`
        : `<td class="${claseSemana(n, i)}"${dc('sem' + i, n)}${conColor && diasOpcSem(i) ? ` title="${diasOpcSem(i)} día(s) opcional(es): verde desde ${umbralSem(i)} ataques"` : ''}>${conColor ? n : fmtNum(n)}</td>`;
  }).join('');
  return `${celdasSem}
                <td class="${claseResumen}"${dc('resumen', resumen)}>${resumen === null ? '' : fmtNum(resumen)}</td>
                <td class="${claseResumen}"${dc('pct', pct)}>${pct === null ? '' : pct + '%'}</td>`;
}

/* widget genérico de filtro/orden por columna, calcado del de "Directorio por clan" (directorio.html, ver ROSTER_COLUMNAS/ abrirFiltroColumna() ahí) pero generalizado para poder colgarse de CUALQUIER tabla de esta página (hay una tabla POR CLAN, tanto en… Historial en CHANGELOG.md. */
const ICONO_FILTRO_GRID = '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1 2.5A.5.5 0 0 1 1.5 2h13a.5.5 0 0 1 .4.8L10 9.4V13a.5.5 0 0 1-.2.4l-2 1.5A.5.5 0 0 1 7 14.5v-5.1L1.1 2.8A.5.5 0 0 1 1 2.5z"/></svg>';
const gridEstados = {}; // gridId -> { filtros:{colKey: Set|{{operador,valor}}}, orden:{colKey,dir}|null }
let gridFiltroPopEl = null;
let gridFiltroBtnEl = null; // el embudo que abrió el cuadro (para su aria-expanded y para devolverle el foco)
let gridFiltroAncho = 0; // ancho de la ventana al abrir el cuadro: solo un cambio de ancho (girar el móvil) lo cierra; el alto cambia con la barra de direcciones y el teclado

function gridEstadoDe(gridId){
  if (!gridEstados[gridId]) gridEstados[gridId] = { filtros:{}, orden:null };
  return gridEstados[gridId];
}

/** Th de la 2ª fila del encabezado con su botón de filtro/orden (embudo) +
 * la flechita de orden — mismo patrón visual que .rt-th-inner en
 * directorio.html. Los <th colspan> de la 1ª fila (Ataques/Puntaje/
 * Barcos) NUNCA pasan por aquí — se siguen pintando planos, sin botón. */
function thFiltroGrid(claseTh, label, colKey, attrs){
  return `<th class="${claseTh}" scope="col"${attrs ? ' ' + attrs : ''}><div class="rt-th-inner"><span>${esc(label)}</span><span class="rt-orden-indicador" data-col="${colKey}"></span><button type="button" class="rt-filtro-btn" data-col="${colKey}" title="Ordenar o filtrar por ${esc(label)}" aria-label="Ordenar o filtrar por ${esc(label)}" aria-haspopup="dialog" aria-expanded="false">${ICONO_FILTRO_GRID}</button></div></th>`;
}
/** 5 columnas fijas J/V/S/D/Total de una megacategoría (Valores diarios). */
function filaSubEncabezadosMega(gpClase, prefijo, colHoy){
  // NUEVO (23-oct-2026, tanda 6): `colHoy` ({key, titulo}, ver colHoyDiario()) marca el encabezado del día de hoy con .ai-hoy, aria-current y un title; el color no es la única señal. [→ Contexto_Base_Web.md §PF176]
  return ['J', 'V', 'S', 'D', 'Total'].map((lbl, i) => {
    const key = ['j', 'v', 's', 'd', 'total'][i];
    const esHoy = !!colHoy && colHoy.key === key;
    return thFiltroGrid(esHoy ? `${gpClase} ai-hoy` : gpClase, lbl, `${prefijo}-${key}`, esHoy ? `aria-current="true" title="${esc(colHoy.titulo)}"` : undefined);
  }).join('');
}
/** Sem 1..Sem N + Total/Prom + % de una megacategoría (Valores semanales). */
function filaSubEncabezadosSemanas(gpClase, prefijo, semanasLabels, labelResumen, colHoy){
  // NUEVO (23-oct-2026, tanda 6): `colHoy` ({idx, titulo}, ver colHoySemanal()) marca el encabezado de la semana en curso. [→ Contexto_Base_Web.md §PF176]
  const cols = semanasLabels.map((s, i) => {
    const esHoy = !!colHoy && colHoy.idx === i;
    return thFiltroGrid(esHoy ? `${gpClase} ai-hoy` : gpClase, s, `${prefijo}-sem${i}`, esHoy ? `aria-current="true" title="${esc(colHoy.titulo)}"` : undefined);
  });
  cols.push(thFiltroGrid(`${gpClase} ai-resumen`, labelResumen, `${prefijo}-resumen`));
  cols.push(thFiltroGrid(`${gpClase} ai-resumen`, '%', `${prefijo}-pct`));
  return cols.join('');
}

/* 19-oct-2026 (pedido usuario): Nombre, Rango y Estado son tres columnas con su propio filtro/orden en Valores diarios y semanales. Rango se ordena por jerarquía (Líder, Colíder, Veterano, Miembro), no alfabéticamente; Estado es Activo/Inactivo (campo activo:false del backend). */
const RANGO_ORDEN_GRID = ['Líder', 'Colíder', 'Veterano', 'Miembro'];
const rangoOrdenGrid = rango => { const i = RANGO_ORDEN_GRID.indexOf(rango); return i === -1 ? RANGO_ORDEN_GRID.length : i; }; // un rango desconocido va al final
const estadoGrid = f => (f && f.activo === false ? 'Inactivo' : 'Activo');
function columnasTextoGrid(){
  return [
    { key:'nombre', tipo:'texto', raw: f => f.nombre || f.tag || '—' },
    { key:'rango', tipo:'texto', raw: f => f.rango || '—', ord: f => rangoOrdenGrid(f.rango) },
    { key:'estado', tipo:'texto', raw: f => estadoGrid(f) },
  ];
}
/** Columnas filtrables/ordenables de la Cuadrícula de Valores diarios: 5
 * (J/V/S/D/Total) x 3 megacategorías. */
function columnasActivosDef(){
  const porMega = (prefijo, campo) => ['j', 'v', 's', 'd', 'total'].map(k => ({
    key: `${prefijo}-${k}`, raw: f => { const m = campo(f); return (m && m[k] !== null && m[k] !== undefined) ? (Number(m[k]) || 0) : (m ? null : 0); }, // null = vacío (no estuvo en el clan)
  }));
  return [
    ...columnasTextoGrid(),
    ...porMega('atq', f => ({ j: f.j, v: f.v, s: f.s, d: f.d, total: f.total })),
    ...porMega('pje', f => f.puntaje),
    ...porMega('brc', f => f.barcos),
  ];
}
/** Columnas filtrables/ordenables de la Cuadrícula de Valores semanales:
 * Sem 1..Sem N + Resumen + % x 3 megacategorías (nSem es dinámico, una
 * columna por semana ya jugada en la temporada elegida). */
function columnasTemporadaDef(nSem){
  const porMega = (prefijo, campo) => {
    const cols = [];
    for (let i = 0; i < nSem; i++){
      cols.push({ key: `${prefijo}-sem${i}`, raw: f => { const m = campo(f); if (!(m && Array.isArray(m.semanas))) return 0; const x = m.semanas[i]; return (x === null || x === undefined) ? null : (Number(x) || 0); } }); // null = vacío
    }
    cols.push({ key: `${prefijo}-resumen`, raw: f => { const m = campo(f); if (!m) return 0; const x = m.resumen ?? m.total ?? m.prom; return (x === null || x === undefined) ? null : (Number(x) || 0); } });
    cols.push({ key: `${prefijo}-pct`, raw: f => { const m = campo(f); if (!m) return 0; return m.pct === null ? null : (Number(m.pct) || 0); } });
    return cols;
  };
  return [
    ...columnasTextoGrid(),
    ...porMega('atq', f => f.ataques),
    ...porMega('pje', f => f.puntaje),
    ...porMega('brc', f => f.barcos),
  ];
}

function cerrarGridFiltroPopover(devolverFoco){
  // También es oyente de scroll y resize (ahí llega un evento): el foco solo vuelve con `true` exacto, al cerrar con Escape o con un botón del cuadro.
  if (gridFiltroPopEl){ gridFiltroPopEl.remove(); gridFiltroPopEl = null; }
  if (gridFiltroBtnEl){
    gridFiltroBtnEl.setAttribute('aria-expanded', 'false');
    if (devolverFoco === true && gridFiltroBtnEl.isConnected) gridFiltroBtnEl.focus();
    gridFiltroBtnEl = null;
  }
  document.removeEventListener('keydown', cerrarGridFiltroPopoverConEscape, true);
  document.removeEventListener('mousedown', cerrarGridFiltroPopoverSiFuera, true);
  window.removeEventListener('scroll', cerrarGridFiltroPopoverSiScrollFuera, true);
  window.removeEventListener('resize', cerrarGridFiltroPopoverSiCambiaAncho, true);
}
// 4-nov-2026: el scroll del propio cuadro (el cuadro y su lista de valores tienen overflow) no lo cierra; antes cualquier scroll lo cerraba y no se llegaba a «Aceptar». Un scroll de la página u otro bloque sí lo cierra, como antes.
function cerrarGridFiltroPopoverSiScrollFuera(e){
  if (gridFiltroPopEl && e && e.target instanceof Node && gridFiltroPopEl.contains(e.target)) return;
  cerrarGridFiltroPopover();
}
// 5-nov-2026 (PF361, 2.ª parte): en el móvil, la barra de direcciones y el teclado cambian el alto de la ventana (evento resize) y eso cerraba el cuadro mientras se desplazaba o se escribía en el buscador.
function cerrarGridFiltroPopoverSiCambiaAncho(){
  if (window.innerWidth !== gridFiltroAncho) cerrarGridFiltroPopover();
}
function cerrarGridFiltroPopoverConEscape(e){ if (e.key === 'Escape') cerrarGridFiltroPopover(true); }
function cerrarGridFiltroPopoverSiFuera(e){
  if (gridFiltroPopEl && !gridFiltroPopEl.contains(e.target)) cerrarGridFiltroPopover();
}

function valoresUnicosGridColumna(col, filas){
  const set = new Set();
  // 11-oct-2026: columnas de texto (tipo:'texto', p. ej. Tag/Nombre/Rango de Pendientes) listan el texto tal cual; las numéricas, el número formateado
  filas.forEach(f => { const r = col.raw(f); if (r !== null && r !== undefined) set.add(col.tipo === 'texto' ? String(r) : fmtNum(Number(r) || 0)); }); // las celdas vacías no entran al checklist
  return [...set].sort((a, b) => a.localeCompare(b, 'es', { numeric:true, sensitivity:'base' }));
}
function compararPorGridColumna(col, dir){
  const signo = dir === 'desc' ? -1 : 1;
  // celdas vacías (null) siempre al final, sea asc o desc
  return (f1, f2) => {
    const r1 = col.raw(f1), r2 = col.raw(f2);
    const n1 = r1 === null || r1 === undefined, n2 = r2 === null || r2 === undefined;
    if (n1 || n2) return n1 && n2 ? 0 : (n1 ? 1 : -1);
    if (col.tipo === 'texto'){
      // `ord` (opcional) da el valor de orden cuando no es alfabético (p. ej. Rango: Líder, Colíder, Veterano, Miembro)
      if (col.ord) return signo * ((Number(col.ord(f1)) || 0) - (Number(col.ord(f2)) || 0));
      return signo * String(r1).localeCompare(String(r2), 'es', { numeric:true, sensitivity:'base' });
    }
    return signo * ((Number(r1) || 0) - (Number(r2) || 0));
  };
}

/** Repinta el <tbody> de `tabla` con `filasBase` ya ordenadas según el
 * orden guardado en el estado (si hay), reaplica los filtros ya aceptados
 * y actualiza los íconos. No reconstruye el <thead>. */
function gridRepintar(gridId, tabla, columnas, filasBase, renderFila){
  const estado = gridEstadoDe(gridId);
  let filas = filasBase;
  if (estado.orden){
    const c = columnas.find(cc => cc.key === estado.orden.colKey);
    if (c) filas = [...filasBase].sort(compararPorGridColumna(c, estado.orden.dir));
  }
  const tbody = tabla.querySelector('tbody');
  if (tbody) tbody.innerHTML = filas.map(renderFila).join('');
  gridAplicarFiltros(gridId, tabla);
  gridActualizarIconos(gridId, tabla);
}

/* letraFiltroDeGridId(gridId) → letra seleccionada (o null) para la sección a la que pertenece esta tabla, según el prefijo de gridId ("activos:<clan>" o "temporada:<clan>", ver renderFilaActivos/ Historial en CHANGELOG.md. */
function letraFiltroDeGridId(gridId){
  if (gridId.startsWith('activos:')) return letraSeleccionadaActivos;
  if (gridId.startsWith('temporada:')) return letraSeleccionadaTemporada;
  if (gridId.startsWith('pend:')) return letraSeleccionadaPend; // 11-oct-2026: Pendientes de Atacar ahora usa el mismo filtro de columnas
  return null;
}

/* NUEVO (24-oct-2026, tanda 14): sección del buscador según el prefijo de gridId ("pend:", "activos:", "temporada:"). */
const BUSCADOR_DE_SECCION = {
  pend:      { wrap:'pendWrap',            caja:'pendBuscador' },
  activos:   { wrap:'controlActivosWrap',  caja:'controlActivosBuscador' },
  temporada: { wrap:'controlTemporadaWrap', caja:'controlTemporadaBuscador' }
};
function busquedaDeSeccion(prefijo){
  if (prefijo === 'pend') return busquedaPend;
  if (prefijo === 'activos') return busquedaActivos;
  if (prefijo === 'temporada') return busquedaTemporada;
  return '';
}
function busquedaDeGridId(gridId){ return busquedaDeSeccion(String(gridId).split(':')[0]); }
/* actualizarCuentaBuscador(prefijo) → escribe «N de M» (o «Sin coincidencias») junto a la caja; vacío si no hay nada escrito. Cuenta las filas de TODOS los clanes de la sección y avisa si en la pestaña de clan visible no hay ninguna. */
function actualizarCuentaBuscador(prefijo){
  const cfg = BUSCADOR_DE_SECCION[prefijo];
  const caja = cfg && document.getElementById(cfg.caja);
  const wrap = cfg && document.getElementById(cfg.wrap);
  const cuenta = caja && caja.querySelector('.buscador-cuenta');
  if (!cuenta || !wrap) return;
  const consulta = busquedaDeSeccion(prefijo);
  if (!normalizarBusqueda(consulta)){ cuenta.textContent = ''; return; }
  let total = 0, coinciden = 0, enEsteClan = 0;
  wrap.querySelectorAll('table[data-grid-id]').forEach(t => {
    const card = t.closest('.ai-clan-card');
    const visible = !(card && card.style.display === 'none');
    t.querySelectorAll('tbody tr').forEach(tr => {
      total++;
      if (coincideBusqueda(tr.dataset.buscar, consulta)){ coinciden++; if (visible) enEsteClan++; }
    });
  });
  cuenta.textContent = textoCuentaBuscador(coinciden, total, enEsteClan);
}

function gridAplicarFiltros(gridId, tabla){
  const estado = gridEstadoDe(gridId);
  const cols = Object.keys(estado.filtros);
// además de los filtros numéricos por columna (estado.filtros), cada fila también debe pasar el filtro por letra de la sección (si hay alguno elegido) para que ambos filtros se puedan combinar sin pisarse -- ver letraFiltroDeGridId() arriba y… Historial en CHANGELOG.md.
  const letraSel = letraFiltroDeGridId(gridId);
  tabla.querySelectorAll('tbody tr').forEach(fila => {
    const pasaCols = cols.every(colKey => {
      const celda = fila.querySelector(`[data-col="${colKey}"]`);
      const filtro = estado.filtros[colKey];
      if (celda && celda.dataset.tipo === 't') return filtro instanceof Set ? filtro.has(celda.dataset.raw || '') : true; // columna de texto: solo checklist
      const raw = celda && celda.dataset.raw !== undefined && celda.dataset.raw !== '' ? Number(celda.dataset.raw) : null;
      if (raw === null || isNaN(raw)) return false;
      if (filtro instanceof Set) return filtro.has(fmtNum(raw));
      switch (filtro.operador){
        case 'gt':  return raw > filtro.valor;
        case 'gte': return raw >= filtro.valor;
        case 'lt':  return raw < filtro.valor;
        case 'lte': return raw <= filtro.valor;
        case 'eq':  return raw === filtro.valor;
        default:    return true;
      }
    });
    const pasaLetra = !letraSel || fila.dataset.letra === letraSel;
    const pasaBusqueda = coincideBusqueda(fila.dataset.buscar, busquedaDeGridId(gridId)); // tanda 14: nombre o Tag
    // Parte 2: 0 real = data-raw === '0' en una celda de ataques por día/semana (ni total/resumen/% ni celdas vacías).
    const tieneCero = [...fila.querySelectorAll('[data-col^="atq-"]')].some(c => /^atq-(j|v|s|d|sem\d+)$/.test(c.dataset.col) && c.dataset.raw === '0' && !c.dataset.opc);
    fila.classList.toggle('ai-fila-cero', tieneCero);
    const pasaSoloCero = !soloCeroDeGridId(gridId) || tieneCero;
    fila.style.display = (pasaCols && pasaLetra && pasaBusqueda && pasaSoloCero) ? '' : 'none';
  });
  renumerarFilas(tabla);
  gridActualizarTotales(tabla);
  actualizarBotonSoloCero(gridId);
  actualizarCuentaBuscador(String(gridId).split(':')[0]);
}

/* Partes 3-5 (05-oct-2026) ---------------------------------------------- */
const GRUPOS_GRID = { atq:'ai-grp-atq', pje:'ai-grp-pje', brc:'ai-grp-brc' };
const NOMBRES_GRUPO_GRID = { atq:'Ataques', pje:'Medallas', brc:'Barcos' };
/* Parte 6: el mini historial de guerra por jugador (📈) vive ahora en assets/js/features/mini-historial.js, compartido con directorio.html (22-oct-2026, §PF169). */

/* 11-oct-2026: celda Nombre de las cuadrículas — nombre + insignias a la izquierda, botón 📈 (historial de guerra) a la derecha de la misma celda. */
/* 19-oct-2026 (pedido usuario): la celda devuelve TRES <td> — Nombre (con el 📈), Rango y Estado — cada una con data-col/data-raw para el filtro y el orden de su columna (mismo patrón que Pendientes de Atacar). */
function celdaJugadorGrid(f){
  const nombre = f.tag ? enlaceJugador(f.nombre || f.tag, f.tag) : esc(f.nombre || f.tag);
  const rango = f.rango || '—';
  const estado = estadoGrid(f);
  return `<td class="col-jugador" data-col="nombre" data-tipo="t" data-raw="${esc(f.nombre || f.tag || '—')}"><div class="col-jugador-inner"><span class="col-jugador-nombre">${nombre}</span><span class="col-jugador-extras">${botonHistJugador(f)}</span></div></td>`
    + `<td class="col-rango" data-col="rango" data-tipo="t" data-raw="${esc(rango)}">${insigniaRango(f.rango) || `<span class="rango-miembro">${esc(rango)}</span>`}</td>`
    + `<td class="col-estado" data-col="estado" data-tipo="t" data-raw="${estado}">${estado === 'Inactivo' ? insigniaInactivo(f) : '<span class="estado-activo">Activo</span>'}</td>`;
}
/* 11-oct-2026: numeración automática de la columna N° — cuenta solo las filas visibles de la tabla, así que se recalcula al filtrar, ordenar o elegir letra. */
function renumerarFilas(tabla){
  let n = 0;
  tabla.querySelectorAll('tbody tr').forEach(tr => {
    const c = tr.querySelector('td.col-n');
    if (!c) return;
    c.textContent = tr.style.display === 'none' ? '' : String(++n);
  });
}
/* Insignia de rango (Líder/Colíder/Veterano). "Miembro" y los rangos desconocidos no llevan insignia. */
/* NUEVO 08-oct-2026: etiqueta 'Inactivo' y contador 'N activos · M inactivos' para las cuadrículas de Valores diarios/semanales. */
function insigniaInactivo(f){ return f && f.activo === false ? '<span class="inactivo-badge" title="Participó en esta temporada pero hoy ya no está en el clan">Inactivo</span>' : ''; }
function textoContadorClan(filas){
  const nAct = filas.filter(f => f.activo !== false).length;
  const nIna = filas.length - nAct;
  return `(${nAct} activo${nAct === 1 ? '' : 's'}${nIna ? ' · ' + nIna + ' inactivo' + (nIna === 1 ? '' : 's') : ''})`;
}
let _gridDiarioTraeInactivos = false;
function insigniaRango(rango){
  const clases = { 'Líder':'rango-lider', 'Colíder':'rango-colider', 'Veterano':'rango-veterano' };
  const c = clases[rango];
  return c ? `<span class="rango-badge ${c}" title="Rango en el clan">${esc(rango)}</span>` : '';
}
/* Botones Copiar/CSV de una tarjeta de clan. Exportan lo que se ve (respetan filtros). */
function botonesExportGrid(gridId){
  return `<div class="ai-acciones"><button type="button" class="btn-grid-export" data-accion="copiar" data-grid-id="${esc(gridId)}" data-label="⧉ Copiar" title="Copia las filas visibles para pegarlas en una hoja de cálculo">⧉ Copiar</button><button type="button" class="btn-grid-export" data-accion="csv" data-grid-id="${esc(gridId)}" data-label="⬇ CSV" title="Descarga las filas visibles en CSV">⬇ CSV</button></div>`;
}
const fmtDec = n => n.toLocaleString('es', { maximumFractionDigits:1 });
/* Fila de Total y Promedio al pie de la tabla, sobre las filas visibles. Las celdas vacías (no estuvo) no cuentan, ni en el total ni en el promedio. */
function gridActualizarTotales(tabla){
  if (tabla.hasAttribute('data-sin-totales')) return; // Log de Guerra: sumar puestos/barcos de semanas distintas no tiene sentido
  const cols = [...tabla.querySelectorAll('thead tr:nth-child(2) .rt-filtro-btn')].map(b => b.dataset.col);
  if (!cols.length) return;
  const visibles = [...tabla.querySelectorAll('tbody tr')].filter(tr => tr.style.display !== 'none');
  let tfoot = tabla.querySelector('tfoot');
  if (!tfoot){
    tfoot = document.createElement('tfoot');
    tabla.appendChild(tfoot);
  }
  if (!visibles.length){ tfoot.innerHTML = ''; return; }
  // 19-oct-2026: Rango y Estado son columnas de texto (no suman ni promedian), así que sus celdas del pie quedan vacías para que las demás sigan alineadas
  const celdasTotal = ['<td class="col-n"></td><td class="col-jugador">Total (' + visibles.length + ')</td><td class="col-rango"></td><td class="col-estado"></td>'];
  const celdasProm = ['<td class="col-n"></td><td class="col-jugador">Promedio</td><td class="col-rango"></td><td class="col-estado"></td>'];
  cols.forEach(col => {
    const pref = col.split('-')[0];
    const clase = GRUPOS_GRID[pref] || '';
    const vals = [];
    visibles.forEach(tr => {
      const c = tr.querySelector(`[data-col="${col}"]`);
      if (c && c.dataset.raw !== undefined && c.dataset.raw !== ''){ const n = Number(c.dataset.raw); if (!isNaN(n)) vals.push(n); }
    });
    const esPct = col.endsWith('-pct');
    // El Puntaje semanal ya viene como promedio y los % no se suman: en esos casos la fila Total queda vacía.
    const sumable = !esPct && !(pref === 'pje' && (col.includes('-sem') || col.endsWith('-resumen')));
    const suma = vals.reduce((a, b) => a + b, 0);
    celdasTotal.push(`<td class="${clase}">${vals.length && sumable ? fmtNum(suma) : ''}</td>`);
    celdasProm.push(`<td class="${clase}">${vals.length ? fmtDec(suma / vals.length) + (esPct ? '%' : '') : ''}</td>`);
  });
  tfoot.innerHTML = `<tr class="ai-foot-total">${celdasTotal.join('')}</tr><tr>${celdasProm.join('')}</tr>`;
}
/* Exportar la tabla visible: nombre, rango, y una columna por cada columna de la cuadrícula. Las celdas vacías quedan vacías. */
function datosExportGrid(tabla){
  const cols = [...tabla.querySelectorAll('thead tr:nth-child(2) .rt-filtro-btn')].map(b => ({
    key: b.dataset.col,
    label: (b.closest('th').querySelector('span') || {}).textContent || b.dataset.col,
  }));
  const encabezado = ['Nombre', 'Rango', 'Estado', ...cols.map(c => (NOMBRES_GRUPO_GRID[c.key.split('-')[0]] || '') + ' ' + c.label)];
  const filas = [...tabla.querySelectorAll('tbody tr')].filter(tr => tr.style.display !== 'none').map(tr => [
    ((tr.querySelector('.col-jugador-nombre a, .col-jugador-nombre') || {}).firstChild || {}).textContent || (tr.querySelector('.col-jugador-nombre') || {}).textContent || '',
    tr.dataset.rango || '',
    ((tr.querySelector('[data-col="estado"]') || {}).dataset || {}).raw || '',
    ...cols.map(c => { const td = tr.querySelector(`[data-col="${c.key}"]`); return td ? (td.dataset.raw || '') : ''; }),
  ]);
  return [encabezado, ...filas];
}
const csvEscapar = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
async function copiarTextoGrid(texto){
  try{ await navigator.clipboard.writeText(texto); return true; }
  catch(e){
    try{
      const ta = document.createElement('textarea'); ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    }catch(e2){ return false; }
  }
}
function slugExport(t){ return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
document.addEventListener('click', async e => {
  const btn = e.target.closest && e.target.closest('.btn-grid-export');
  if (!btn) return;
  const gridId = btn.dataset.gridId;
  const tabla = document.querySelector(`table[data-grid-id="${CSS.escape(gridId)}"]`);
  if (!tabla) return;
  const datos = datosExportGrid(tabla);
  const original = btn.dataset.label;
  let ok = true;
  if (btn.dataset.accion === 'copiar'){
    ok = await copiarTextoGrid(datos.map(f => f.join('\t')).join('\n'));
  } else {
    const csv = '\ufeff' + datos.map(f => f.map(csvEscapar).join(',')).join('\r\n');
    const [seccion, clan] = [gridId.split(':')[0], gridId.slice(gridId.indexOf(':') + 1)];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    a.download = `guerra-${seccion === 'activos' ? 'diarios' : 'semanales'}-${slugExport(clan)}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  btn.textContent = ok ? '✔ Listo' : 'No se pudo';
  btn.classList.toggle('ok', ok);
  setTimeout(() => { btn.textContent = original; btn.classList.remove('ok'); }, 1600);
});

function soloCeroDeGridId(gridId){
  if (gridId.startsWith('activos:')) return soloCeroActivos;
  if (gridId.startsWith('temporada:')) return soloCeroTemporada;
  return false;
}
/* Cuenta las filas con 0 real de toda la sección y lo muestra en el botón. */
function actualizarBotonSoloCero(gridId){
  if (!gridId.startsWith('activos:') && !gridId.startsWith('temporada:')) return; // las demás tablas (Pendientes, Log) no tienen este botón
  const act = gridId.startsWith('activos:');
  const btn = document.getElementById(act ? 'soloCeroActivosBtn' : 'soloCeroTemporadaBtn');
  const wrap = document.getElementById(act ? 'controlActivosWrap' : 'controlTemporadaWrap');
  if (!btn || !wrap) return;
  const n = wrap.querySelectorAll('tbody tr.ai-fila-cero').length;
  btn.textContent = 'Solo con 0 ataques' + (n ? ' (' + n + ')' : '');
  btn.setAttribute('aria-pressed', String(act ? soloCeroActivos : soloCeroTemporada));
}

function gridActualizarIconos(gridId, tabla){
  const estado = gridEstadoDe(gridId);
  tabla.querySelectorAll('.rt-filtro-btn').forEach(btn => {
    const conFiltro = !!estado.filtros[btn.dataset.col];
    btn.classList.toggle('activo', conFiltro);
    btn.setAttribute('aria-label', btn.getAttribute('title') + (conFiltro ? ' (con filtro)' : '')); // antes el filtro activo solo se veía por el color
  });
  tabla.querySelectorAll('.rt-orden-indicador').forEach(sp => {
    const activo = estado.orden && estado.orden.colKey === sp.dataset.col;
    sp.textContent = activo ? (estado.orden.dir === 'desc' ? '↓' : '↑') : '';
    const th = sp.closest('th');
    if (th) th.setAttribute('aria-sort', activo ? (estado.orden.dir === 'desc' ? 'descending' : 'ascending') : 'none');
  });
}

/** Abre el desplegable de orden/filtro de una columna — mismo contenido y
 * mismo comportamiento que abrirFiltroColumna() de directorio.html
 * (orden asc/desc + quitar orden, filtro de comparación numérica, buscador
 * + checklist de valores únicos + seleccionar todo/ninguno), adaptado para
 * trabajar sobre `tabla`/`gridId` en vez de la tabla única del roster. */
function abrirGridFiltroColumna(gridId, col, btnEl, tabla, filasBase, columnas, renderFila){
  const estado = gridEstadoDe(gridId);
  const yaAbierto = gridFiltroPopEl && gridFiltroPopEl.dataset.gridId === gridId && gridFiltroPopEl.dataset.col === col.key;
  cerrarGridFiltroPopover();
  if (yaAbierto) return;

  const valores = valoresUnicosGridColumna(col, filasBase);
  const seleccionPrevia = estado.filtros[col.key];
  const esComparacionPrevia = seleccionPrevia && !(seleccionPrevia instanceof Set);
  const temp = new Set(seleccionPrevia instanceof Set ? [...seleccionPrevia] : valores);
  const ordenActivo = estado.orden && estado.orden.colKey === col.key ? estado.orden.dir : null;

  const pop = document.createElement('div');
  pop.className = 'rt-filtro-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Ordenar o filtrar por ' + btnEl.getAttribute('title').replace(/^Ordenar o filtrar por /, ''));
  pop.dataset.gridId = gridId;
  pop.dataset.col = col.key;
  pop.innerHTML = `
    <div class="rt-filtro-orden">
      <button type="button" class="rt-orden-btn${ordenActivo === 'asc' ? ' activo' : ''}" data-dir="asc" aria-pressed="${ordenActivo === 'asc'}">${col.tipo === 'texto' ? (col.ord ? '↑ Primero' : '↑ A → Z') : '↑ Menor a mayor'}</button>
      <button type="button" class="rt-orden-btn${ordenActivo === 'desc' ? ' activo' : ''}" data-dir="desc" aria-pressed="${ordenActivo === 'desc'}">${col.tipo === 'texto' ? (col.ord ? '↓ Último' : '↓ Z → A') : '↓ Mayor a menor'}</button>
      ${ordenActivo ? '<button type="button" class="rt-orden-quitar">✕ Quitar orden</button>' : ''}
    </div>
    <div class="rt-filtro-divisor"></div>
    <div class="rt-filtro-comparar"${col.tipo === 'texto' ? ' hidden' : ''}>
      <select class="rt-comparar-operador" aria-label="Condición de comparación">
        <option value="">Sin condición de comparación</option>
        <option value="gt">Mayor que…</option>
        <option value="gte">Mayor o igual que…</option>
        <option value="lt">Menor que…</option>
        <option value="lte">Menor o igual que…</option>
        <option value="eq">Igual a…</option>
      </select>
      <input type="number" class="rt-comparar-valor" placeholder="Valor…" aria-label="Valor a comparar">
    </div>
    <div class="rt-filtro-divisor"${col.tipo === 'texto' ? ' hidden' : ''}></div>
    <input type="text" class="rt-filtro-buscar" placeholder="Buscar valor…" aria-label="Buscar valor">
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
  gridFiltroPopEl = pop;
  gridFiltroBtnEl = btnEl;
  btnEl.setAttribute('aria-expanded', 'true');

  pop.querySelectorAll('.rt-orden-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      estado.orden = { colKey: col.key, dir: btn.dataset.dir };
      cerrarGridFiltroPopover(true);
      gridRepintar(gridId, tabla, columnas, filasBase, renderFila);
    });
  });
  const btnQuitarOrden = pop.querySelector('.rt-orden-quitar');
  if (btnQuitarOrden){
    btnQuitarOrden.addEventListener('click', () => {
      estado.orden = null;
      cerrarGridFiltroPopover(true);
      gridRepintar(gridId, tabla, columnas, filasBase, renderFila);
    });
  }

  if (esComparacionPrevia){
    pop.querySelector('.rt-comparar-operador').value = seleccionPrevia.operador;
    pop.querySelector('.rt-comparar-valor').value = seleccionPrevia.valor;
  }

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
  pop.querySelector('.rt-filtro-buscar').addEventListener('input', e => pintarLista(e.target.value));
  pop.querySelector('[data-modo="todo"]').addEventListener('click', () => { valores.forEach(v => temp.add(v)); pintarLista(pop.querySelector('.rt-filtro-buscar').value); });
  pop.querySelector('[data-modo="ninguno"]').addEventListener('click', () => { temp.clear(); pintarLista(pop.querySelector('.rt-filtro-buscar').value); });

  pop.querySelector('.rt-filtro-cancelar').addEventListener('click', () => cerrarGridFiltroPopover(true));
  pop.querySelector('.rt-filtro-aceptar').addEventListener('click', () => {
    const operador = pop.querySelector('.rt-comparar-operador').value;
    const valorCrudo = pop.querySelector('.rt-comparar-valor').value;
    if (operador && valorCrudo !== ''){
      const valorNumerico = Number(valorCrudo);
      if (!isNaN(valorNumerico)) estado.filtros[col.key] = { operador, valor: valorNumerico };
      else delete estado.filtros[col.key];
    } else if (temp.size >= valores.length){
      delete estado.filtros[col.key];
    } else {
      estado.filtros[col.key] = temp;
    }
    cerrarGridFiltroPopover(true);
    gridAplicarFiltros(gridId, tabla);
    gridActualizarIconos(gridId, tabla);
  });

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
  gridFiltroAncho = window.innerWidth;
  pop.tabIndex = -1; // el cuadro es el último nodo del <body>: sin esto, con teclado no se llega a él
  pop.style.outline = 'none';
  pop.focus({ preventScroll: true });

  setTimeout(() => {
    document.addEventListener('keydown', cerrarGridFiltroPopoverConEscape, true);
    document.addEventListener('mousedown', cerrarGridFiltroPopoverSiFuera, true);
    window.addEventListener('scroll', cerrarGridFiltroPopoverSiScrollFuera, true);
    window.addEventListener('resize', cerrarGridFiltroPopoverSiCambiaAncho, true);
  }, 0);
}

/** Punto de entrada: llamar una vez por tabla recién insertada en el DOM
 * (tbody vacío). Aplica el orden/filtro ya guardado para `gridId` (si el
 * usuario ya lo había elegido antes de este refresco), pinta las filas y
 * engancha el click de cada botón de embudo. */
function inicializarGridFiltro(gridId, tabla, columnas, filasBase, renderFila){
  gridRepintar(gridId, tabla, columnas, filasBase, renderFila);
  tabla.querySelectorAll('.rt-filtro-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = columnas.find(c => c.key === btn.dataset.col);
      if (col) abrirGridFiltroColumna(gridId, col, btn, tabla, filasBase, columnas, renderFila);
    });
  });
}
/* fin del motor de cuadrículas de guerra */
