/* mini-historial.js — mini historial de guerra por jugador (botón 📈 + ventana) y comparación con otro jugador.
   Compartido por guerra.html y directorio.html (22-oct-2026, pedido de la usuaria: ícono del mini historial en la tabla del Directorio; antes el código vivía solo en guerra.html). [→ Contexto_Base_Web.md §PF169]
   Depende de util.js (esc, fmtNum, guerraAValoresDiarios) y de api.js (apiGet). Los estilos están en assets/styles.css (.hist-*, .btn-hist-jugador, .btn-solo-cero).
   Uso: poner botonHistJugador({tag, nombre}) en la celda del nombre; el clic lo atiende el listener de este archivo. La ventana (#histFondo) se crea sola la primera vez que se abre. */
const HIST_ATAQUES_MAX = 4; // ataques por día de guerra
const histFmtDec = n => n.toLocaleString('es', { maximumFractionDigits:1 });
function histAsegurarModal(){
  if (document.getElementById('histFondo')) return;
  const d = document.createElement('div');
  d.className = 'hist-fondo'; d.id = 'histFondo'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'histTitulo');
  d.innerHTML = '<div class="hist-panel"><div class="hist-cab"><div><h3 id="histTitulo">Historial de guerra</h3><div class="hist-nota" id="histSub" style="margin:2px 0 0;"></div></div>'
    + '<button type="button" class="hist-cerrar" id="histCerrar" aria-label="Cerrar">×</button></div><div id="histPerfil" class="hist-perfil"></div><div id="histCuerpo" aria-live="polite"></div></div>';
  document.body.appendChild(d);
}
/* Parte 6 (05-oct-2026): mini historial de guerra por jugador. Usa webHistorialGuerraComparador (público): solo días de guerra, últimos ~180 días.
   Si el jugador no tiene registro en un día (aún no estaba en el clan), ese día simplemente no aparece: se distingue del 0 real igual que en las cuadrículas. */
/* 22-oct-2026 (pedido de la usuaria, §PF172): junto a todo 📈 va, a su IZQUIERDA y solo para admins, el ícono de WhatsApp que indica que tenemos el celular de la cuenta (sin enlace ni número). Los Tags con celular los pide wspCargarTags() al backend (webAdminTagsConWsp); si la lista llega después de pintar una tabla, wspRepintar() inserta el ícono en los botones ya existentes. `f.tieneWsp === true` (lo manda «Participación de Hoy») también lo muestra. */
let wspTags = null; // Set de Tags en mayúsculas y sin #; null = sin cargar o sin sesión de admin
function wspClaveTag(tag){ return String(tag || '').replace('#', '').toUpperCase(); }
function wspTieneTag(tag){ return !!(wspTags && wspTags.has(wspClaveTag(tag))); }
function iconoWspHistHtml(f){
  const n = f.nombre || f.tag;
  return `<span class="hist-wsp" role="img" aria-label="Tenemos el número de WhatsApp de ${esc(n)}" title="Tenemos su número de WhatsApp">${ICONO_WSP_SOLO}</span>`;
}
/* opts.sinWsp (23-oct-2026, tanda 2): la tarjeta de «Ingresos recientes» ya pinta su propio ícono de WhatsApp (.ico-wsp), así que aquí no se antepone otro ni wspRepintar() lo añade después. */
function botonHistJugador(f, opts){
  if (!f || !f.tag) return '';
  const sinWsp = !!(opts && opts.sinWsp);
  const adminOk = typeof esAdminLogueado === 'function' && esAdminLogueado();
  const wsp = (!sinWsp && adminOk && (f.tieneWsp === true || wspTieneTag(f.tag))) ? iconoWspHistHtml(f) : '';
  return wsp + `<button type="button" class="btn-hist-jugador"${sinWsp ? ' data-sin-wsp="1"' : ''} data-tag="${esc(f.tag)}" data-nombre="${esc(f.nombre || f.tag)}" title="Ver historial de guerra" aria-label="Historial de guerra de ${esc(f.nombre || f.tag)}">📈</button>`;
}
function wspRepintar(){
  document.querySelectorAll('.btn-hist-jugador').forEach(b => {
    if (b.dataset.sinWsp) return;
    const prev = b.previousElementSibling;
    if (prev && prev.classList.contains('hist-wsp')) return;
    if (!wspTieneTag(b.dataset.tag)) return;
    b.insertAdjacentHTML('beforebegin', iconoWspHistHtml({ tag: b.dataset.tag, nombre: b.dataset.nombre }));
  });
}
async function wspCargarTags(){
  if (typeof esAdminLogueado !== 'function' || !esAdminLogueado()) return;
  if (document.body && document.body.hasAttribute('data-sin-wsp-tags')) return; // 23-oct-2026 (§PF181): perfil.html solo usa la tabla del historial, no pinta 📈 con WhatsApp; así no pide webAdminTagsConWsp de más
  try{
    const data = await apiGetAuth('webAdminTagsConWsp', {});
    if (!data || data.ok === false || !Array.isArray(data.tags)) return;
    wspTags = new Set(data.tags.map(wspClaveTag));
    wspRepintar();
  }catch(_){ /* sin la lista solo falta el ícono de WhatsApp; el 📈 sigue igual */ }
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wspCargarTags); else wspCargarTags(); }
/* 23-oct-2026 (tanda 4, P3): cabecera con los datos del perfil (clan actual, torre del rey, nivel de XP, colección, victorias de guerra, copas y vigencia). Es PÚBLICA y sale de `webPerfil` (los mismos campos que la cabecera de perfil.html: j.clan, rawClash.kingTowerLevel, rawClash.expLevel o extendido.nivelXp, extendido.nivelCartas, j.vGuerra, j.copas, j.vigencia). Se pide aparte y DESPUÉS de pintar la tabla (histAbrir no la espera); si falla o no trae ningún dato, la cabecera no aparece. [→ Contexto_Base_Web.md §PF179] */
function histFechaVigencia(v){
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return esc(String(v));
  const fecha = d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'America/Lima' });
  const hora = d.toLocaleTimeString('es-PE', { hour:'numeric', minute:'2-digit', hour12:true, timeZone:'America/Lima' });
  return esc(`${fecha}, ${hora}`);
}
function histCabeceraPerfilHtml(j){
  if (!j || typeof j !== 'object') return '';
  const ext = j.extendido || {};
  const raw = j.rawClash || ext.rawClash || {};
  const num = v => (v !== null && v !== undefined && v !== '' && isFinite(Number(v))) ? fmtNum(Number(v)) : null;
  const vig = j.vigencia ?? ext.vigencia ?? ext.ultimaConexion;
  const datos = [
    ['Clan', j.clan ? enlaceClan(j.clan) : null],
    ['Torre del rey', num(raw.kingTowerLevel)],
    ['Nivel de XP', num(raw.expLevel !== undefined && raw.expLevel !== null ? raw.expLevel : ext.nivelXp)],
    ['Colección', num(ext.nivelCartas)],
    ['Victorias de guerra', num(j.vGuerra)],
    ['Copas', num(j.copas)],
    ['Vigencia', vig ? histFechaVigencia(vig) : null],
  ].filter(d => d[1] !== null);
  return datos.map(d => `<span class="hist-perfil-dato">${d[0]}: <b>${d[1]}</b></span>`).join('');
}
/* 24-oct-2026 (tanda 8, corrección a la tanda 4; regla 9): la respuesta real de `webPerfil` viene ENVUELTA, `{ ok: true, jugador: { … } }` (perfil.html hace `renderMiembro(data.jugador)`). Antes se le pasaba la respuesta entera a histCabeceraPerfilHtml(), que lee los campos en el primer nivel: todos salían `undefined`, la cabecera quedaba vacía y no se veía. Por tolerancia, si algún día no viene `jugador` se usa el objeto tal cual. [→ Contexto_Base_Web.md §PF179, §PF195] */
function histJugadorDeRespuesta(data){
  if (!data || typeof data !== 'object' || data.error || data.ok === false) return null;
  if (data.jugador && typeof data.jugador === 'object') return data.jugador;
  return data;
}
async function histCargarCabecera(tag, mia){
  try{
    const data = await apiGet('webPerfil', { tag }, { ttlMs: 300000, staleIfError: true, conSesion: true });
    const j = histJugadorDeRespuesta(data);
    if (mia !== histSolicitud || !j) return;
    const el = document.getElementById('histPerfil');
    if (el) el.innerHTML = histCabeceraPerfilHtml(j);
  }catch(_){ /* sin la cabecera solo falta ese resumen; la tabla ya está pintada */ }
}
const HIST_FILAS_INICIALES = 28;
const HIST_FILAS_MAS = 28; // 23-oct-2026 (P6): cada clic en «Ver más» agrega 28 filas más
let histSolicitud = 0;
/* 22-oct-2026 (pedido de la usuaria, tanda 1 de Consolidado_Mini_Historial_y_Perfil.md): fecha como 22/10/2026, día en una letra (J, V, S, D), color de la fila según los ataques y sombreado alternado por semana. */
function histFechaDMA(iso){
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y) return esc(iso);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}
function histDiaLetra(iso){
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y) return '';
  return ['D','L','M','X','J','V','S'][new Date(y, m - 1, d).getDay()]; // en guerra solo salen J, V, S y D
}
/* La semana se agrupa por el lunes que contiene la fecha (jueves a domingo de guerra caen en la misma semana lunes-domingo). */
function histLunesIso(iso){
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y) return String(iso);
  const dt = new Date(y, m - 1, d - ((new Date(y, m - 1, d).getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
/* 23-oct-2026 (tanda 3, P2): Temporada = número de temporada interna; Semana = etiqueta corta S1, S2… (no el rango de fechas). Ambos vienen del backend (webHistorialGuerraComparador: temporada, semana 1-based); si faltan (respuesta vieja o fila sin dato) la celda muestra «–» y el sombreado por semana vuelve a agruparse por el lunes. [→ Contexto_Base_Web.md §PF178] */
function histTemporadaTxt(r){ return (r && Number(r.temporada) > 0) ? String(Number(r.temporada)) : '–'; }
function histSemanaTxt(r){ return (r && Number(r.semana) > 0) ? 'S' + Number(r.semana) : '–'; }
function histClaveSemana(r){
  if (r && Number(r.temporada) > 0 && Number(r.semana) > 0) return `T${Number(r.temporada)}-S${Number(r.semana)}`;
  return r ? histLunesIso(r.fecha) : '';
}
/* Verde con 4 ataques, amarillo con 1, 2 y 3, rojo con 0 (solo si no es opcional: histEsFalta). Sin registro (celda vacía de la comparación) no lleva color. */
function histClaseColorAtaques(r){
  if (!r) return '';
  if (histEsFalta(r)) return 'hist-cero';
  const a = r.ataques || 0;
  if (a >= HIST_ATAQUES_MAX) return 'hist-a4';
  if (a >= 1) return 'hist-a13'; // 1, 2 o 3 ataques: amarillo (la usuaria confirmó el 22-oct-2026 que el 1 también va en amarillo)
  return '';
}
function histCerrar(){ document.getElementById('histFondo').classList.remove('abierto'); histSolicitud++; }
let histTag = '', histNombre = '', histRegsA = [];
/* Solo días de guerra (jueves a domingo): un registro de lunes a miércoles es entrenamiento y no se muestra ni se cuenta. */
function histSoloGuerra(regs){
  const guerra = (Array.isArray(regs) ? regs : []).filter(r => {
    const [y, m, d] = String(r.fecha).split('-').map(Number);
    if (!y) return false;
    const w = new Date(y, m - 1, d).getDay();
    return w === 0 || w >= 4;
  });
  return guerraAValoresDiarios(guerra); // util.js: fame y barcos del día (el backend los manda acumulados de la semana)
}
/* Un día con `opcional: true` (meta ya cruzada por el clan) con 0 ataques no cuenta como falta. */
const histEsFalta = r => !r.ataques && r.opcional !== true;
/* Día en curso (aún no cerrado): su fila se sombrea. Si tiene menos de 4 ataques y no es opcional, el número lleva un asterisco en superíndice con su nota al pie. El 0 se sigue mostrando tal como está registrado. */
function histHoyIso(){ const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`; }
const histPendiente = (r, hoyIso) => !!r && r.fecha === hoyIso && r.opcional !== true && (r.ataques || 0) < HIST_ATAQUES_MAX;
const HIST_ASTERISCO = '<sup class="hist-ast" title="Día en curso: todavía tiene ataques pendientes" aria-hidden="true">*</sup><span class="hist-sr"> (día en curso, con ataques pendientes)</span>';
function histNotasDiaEnCurso(hayHoy, hayPend){
  return (hayHoy ? ' La fila sombreada es el día en curso: todavía no se cierra.' : '')
       + (hayPend ? '</p><p class="hist-nota"><sup class="hist-ast" aria-hidden="true">*</sup> Día en curso: todavía tiene ataques pendientes.' : '');
}
function histStats(regs){
  const n = regs.length;
  const t = (k) => regs.reduce((a, r) => a + (r[k] || 0), 0);
  return { n, ceros: regs.filter(histEsFalta).length, atq: t('ataques'), fame: t('fame'), barcos: t('barcos') };
}
function histSelectorComparar(valor){
  const vistos = {};
  document.querySelectorAll('.btn-hist-jugador').forEach(b => { if (b.dataset.tag !== histTag) vistos[b.dataset.tag] = b.dataset.nombre; });
  const opts = Object.keys(vistos).sort((a, b) => vistos[a].localeCompare(vistos[b], 'es'))
    .map(t => `<option value="${esc(t)}" data-nombre="${esc(vistos[t])}"${t === valor ? ' selected' : ''}>${esc(vistos[t])}</option>`).join('');
  return `<div class="hist-comparar"><label>Comparar con <select id="histSelComp"><option value="">— elegir jugador —</option>${opts}</select></label></div>`;
}
function histEnlazarSelector(){
  const sel = document.getElementById('histSelComp');
  if (!sel) return;
  sel.addEventListener('change', () => {
    if (!sel.value) histPintar(histRegsA);
    else histComparar(sel.value, sel.options[sel.selectedIndex].dataset.nombre || sel.value);
  });
}
/* 23-oct-2026 (tanda 5, parte 1): resumen + tabla de días + «Ver más» + nota, SIN el selector «Comparar con», para que lo usen la ventana del mini historial y la tarjeta «Historial de guerra» del perfil con la MISMA fuente y el MISMO armado (así los números coinciden; P6: 28 filas al abrir y 28 más por «Ver más»). `registros` ya pasó por histSoloGuerra(). `limite` = cuántas filas se ven. [→ Contexto_Base_Web.md §PF181] */
function histCuerpoDiaHtml(registros, limite){
  const desc = registros.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const st = histStats(desc), n = st.n;
  const hoyIso = histHoyIso();
  const visibles = desc.slice(0, limite);
  const hayHoy = visibles.some(r => r.fecha === hoyIso), hayPend = visibles.some(r => histPendiente(r, hoyIso));
  let semPrev = null, semAlt = false;
  const filas = visibles.map((r, idx) => {
    const sem = histClaveSemana(r);
    if (semPrev !== null && sem !== semPrev) semAlt = !semAlt;
    semPrev = sem;
    const clases = [histClaseColorAtaques(r), semAlt ? 'hist-sem-b' : '', r.fecha === hoyIso ? 'hist-hoy' : ''].filter(Boolean).join(' ');
    return `<tr class="${clases}"><td>${idx + 1}</td><td>${histFechaDMA(r.fecha)}${r.fecha === hoyIso ? ' · en curso' : ''}${r.opcional === true ? ' · opcional (meta cruzada)' : ''}</td><td>${histTemporadaTxt(r)}</td><td>${histSemanaTxt(r)}</td><td>${histDiaLetra(r.fecha)}</td><td>${fmtNum(r.ataques || 0)}${histPendiente(r, hoyIso) ? HIST_ASTERISCO : ''}</td><td>${fmtNum(r.barcos || 0)}</td><td>${fmtNum(r.fame || 0)}</td></tr>`;
  }).join('');
  return `
    <div class="hist-resumen">
      <div><b>${n}</b>días de guerra</div>
      <div><b>${fmtNum(st.atq)}</b>ataques</div>
      <div class="${st.ceros ? 'hist-malo' : ''}"><b>${st.ceros}</b>días con 0 ataques</div>
      <div><b>${histFmtDec(st.atq / n)}</b>ataques por día</div>
      <div><b>${fmtNum(st.fame)}</b>medallas</div>
      <div><b>${fmtNum(st.barcos)}</b>barcos</div>
    </div>
    <div class="hist-tabla-scroll"><table class="hist-tabla hist-tabla-dia"><thead><tr><th>N°</th><th>Fecha</th><th>Temporada</th><th>Semana</th><th>Día</th><th>Ataques</th><th>Barcos</th><th>Medallas</th></tr></thead><tbody>${filas}</tbody></table></div>
    ${n > visibles.length ? `<button type="button" class="btn-solo-cero hist-mas" data-hist-mas="1">Ver más</button>` : ''}
    <p class="hist-nota">Un 0 es un día de guerra en el que estuvo registrado y no atacó. Los días anteriores a su ingreso al clan no aparecen. Un día marcado como opcional (meta ya cruzada) no cuenta como falta. Solo se muestran días de guerra, no de entrenamiento.${histNotasDiaEnCurso(hayHoy, hayPend)}</p>`;
}
/* Pinta en `el` el cuerpo de días de un jugador y deja funcionando «Ver más». opts.prefijo() devuelve HTML que va antes (el selector «Comparar con» en la ventana); opts.despues() corre tras cada pintado (enlazar ese selector). Devuelve false si no hay registros de guerra. */
function histPintarEn(el, registros, limite, opts){
  const o = opts || {};
  const prefijo = typeof o.prefijo === 'function' ? o.prefijo : () => '';
  const lim = limite > 0 ? limite : HIST_FILAS_INICIALES;
  if (!registros.length){
    el.innerHTML = prefijo() + '<p class="hist-nota">Sin registros de guerra para este jugador en los últimos 180 días (cuenta nueva o inactiva).</p>';
    if (typeof o.despues === 'function') o.despues();
    return false;
  }
  el.innerHTML = prefijo() + histCuerpoDiaHtml(registros, lim);
  if (typeof o.despues === 'function') o.despues();
  const mas = el.querySelector('[data-hist-mas]');
  if (mas) mas.addEventListener('click', () => histPintarEn(el, registros, lim + HIST_FILAS_MAS, o));
  return true;
}
function histPintar(registros, limite){
  registros = histSoloGuerra(registros);
  histRegsA = registros;
  histPintarEn(document.getElementById('histCuerpo'), registros, limite, { prefijo: () => histSelectorComparar(''), despues: histEnlazarSelector });
}
/* Comparación lado a lado de dos jugadores (mismo endpoint, tag1 + tag2). Una celda vacía = ese jugador no tenía registro ese día. */
async function histComparar(tag2, nombre2){
  const cuerpo = document.getElementById('histCuerpo');
  cuerpo.innerHTML = histSelectorComparar(tag2) + '<p class="hist-nota">Cargando comparación…</p>';
  histEnlazarSelector();
  const mia = ++histSolicitud;
  try{
    const data = await apiGet('webHistorialGuerraComparador', { tag1: histTag, tag2 }, { conSesion: true });
    if (mia !== histSolicitud) return;
    if (!data || data.error) throw new Error('sin respuesta');
    histPintarComparacion(Array.isArray(data.a) ? data.a : [], Array.isArray(data.b) ? data.b : [], nombre2);
  }catch(e){
    if (mia !== histSolicitud) return;
    cuerpo.innerHTML = histSelectorComparar(tag2) + '<p class="hist-nota">No se pudo cargar la comparación. Intenta de nuevo en un momento.</p>';
    histEnlazarSelector();
  }
}
function histPintarComparacion(ra, rb, nombre2, limite){
  ra = histSoloGuerra(ra); rb = histSoloGuerra(rb);
  const cuerpo = document.getElementById('histCuerpo');
  const tag2 = (document.getElementById('histSelComp') || {}).value || '';
  const A = {}, B = {};
  ra.forEach(r => A[r.fecha] = r); rb.forEach(r => B[r.fecha] = r);
  const fechas = Object.keys(Object.assign({}, A, B)).sort((x, y) => y.localeCompare(x));
  const sa = histStats(ra), sb = histStats(rb);
  const prom = st => st.n ? histFmtDec(st.atq / st.n) : '';
  const fila = (tit, a, b) => `<tr><td>${tit}</td><td>${a}</td><td>${b}</td></tr>`;
  const celda = (r, k) => r ? fmtNum(r[k] || 0) : '';
  const lim = limite > 0 ? limite : HIST_FILAS_INICIALES;
  const visibles = fechas.slice(0, lim);
  // 23-oct-2026 (tanda 1b): el color de cada jugador sale de SUS ataques y lo comparten sus celdas de Ataques y Medallas.
  const cls = r => { const c = histClaseColorAtaques(r); return c ? ` class="${c}"` : ''; };
  const hoyIso = histHoyIso();
  const hayHoy = visibles.includes(hoyIso), hayPend = visibles.some(f => histPendiente(A[f], hoyIso) || histPendiente(B[f], hoyIso));
  const astAtq = r => histPendiente(r, hoyIso) ? HIST_ASTERISCO : '';
  let semPrev = null, semAlt = false;
  const filasDia = visibles.map((f, idx) => {
    const rf = A[f] || B[f]; // misma fecha = misma temporada y semana para los dos jugadores
    const sem = histClaveSemana(rf);
    if (semPrev !== null && sem !== semPrev) semAlt = !semAlt;
    semPrev = sem;
    const clases = [semAlt ? 'hist-sem-b' : '', f === hoyIso ? 'hist-hoy' : ''].filter(Boolean).join(' ');
    return `<tr${clases ? ` class="${clases}"` : ''}><td>${idx + 1}</td><td>${histFechaDMA(f)}${f === hoyIso ? ' · en curso' : ''}</td><td>${histTemporadaTxt(rf)}</td><td>${histSemanaTxt(rf)}</td><td>${histDiaLetra(f)}</td><td${cls(A[f])}>${celda(A[f], 'ataques')}${astAtq(A[f])}</td><td${cls(B[f])}>${celda(B[f], 'ataques')}${astAtq(B[f])}</td><td${cls(A[f])}>${celda(A[f], 'fame')}</td><td${cls(B[f])}>${celda(B[f], 'fame')}</td></tr>`;
  }).join('');
  const na = enlaceJugador(histNombre, histTag), nb = enlaceJugador(nombre2, tag2); // 23-oct-2026: nombre clicable hacia su perfil (nueva pestaña)
  cuerpo.innerHTML = histSelectorComparar(tag2) + `
    <div class="hist-tabla-scroll"><table class="hist-tabla"><thead><tr><th></th><th>${na}</th><th>${nb}</th></tr></thead><tbody>
      ${fila('Días de guerra', sa.n, sb.n)}${fila('Ataques', fmtNum(sa.atq), fmtNum(sb.atq))}${fila('Días con 0', sa.ceros, sb.ceros)}${fila('Ataques por día', prom(sa), prom(sb))}${fila('Medallas', fmtNum(sa.fame), fmtNum(sb.fame))}${fila('Barcos', fmtNum(sa.barcos), fmtNum(sb.barcos))}
    </tbody></table></div>
    <div class="hist-tabla-scroll"><table class="hist-tabla hist-tabla-dia" style="margin-top:12px;"><thead><tr><th rowspan="2">N°</th><th rowspan="2">Fecha</th><th rowspan="2">Temporada</th><th rowspan="2">Semana</th><th rowspan="2">Día</th><th colspan="2">Ataques</th><th colspan="2">Medallas</th></tr><tr><th>${na}</th><th>${nb}</th><th>${na}</th><th>${nb}</th></tr></thead><tbody>${filasDia || '<tr><td colspan="9">Sin registros</td></tr>'}</tbody></table></div>
    ${fechas.length > visibles.length ? `<button type="button" class="btn-solo-cero hist-mas" id="histMas">Ver más</button>` : ''}
    <p class="hist-nota">Celda vacía: ese jugador no tenía registro ese día (aún no estaba en el clan). Un 0 en rojo es que estuvo y no atacó.${histNotasDiaEnCurso(hayHoy, hayPend)}</p>`;
  histEnlazarSelector();
  const mas = document.getElementById('histMas');
  if (mas) mas.addEventListener('click', () => histPintarComparacion(ra, rb, nombre2, lim + HIST_FILAS_MAS));
}
async function histAbrir(tag, nombre){
  histAsegurarModal();
  const fondo = document.getElementById('histFondo');
  histTag = tag; histNombre = nombre || tag; histRegsA = [];
  document.getElementById('histTitulo').innerHTML = enlaceJugador(nombre || tag, tag); // 23-oct-2026: el nombre lleva enlace a su perfil (nueva pestaña)
  document.getElementById('histSub').textContent = tag;
  document.getElementById('histPerfil').innerHTML = '';
  document.getElementById('histCuerpo').innerHTML = '<p class="hist-nota">Cargando historial…</p>';
  fondo.classList.add('abierto');
  const mia = ++histSolicitud;
  histCargarCabecera(tag, mia); // 23-oct-2026 (tanda 4): en paralelo, sin esperarla
  try{
    const data = await apiGet('webHistorialGuerraComparador', { tag1: tag, tag2: '' }, { conSesion: true });
    if (mia !== histSolicitud) return; // se cerró o se abrió otro jugador mientras cargaba
    if (!data || data.error) throw new Error((data && data.error) || 'sin respuesta');
    histPintar(Array.isArray(data.a) ? data.a : []);
  }catch(e){
    if (mia !== histSolicitud) return;
    document.getElementById('histCuerpo').innerHTML = '<p class="hist-nota">No se pudo cargar el historial. Intenta de nuevo en un momento.</p>';
  }
}
if (typeof document !== 'undefined'){
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('.btn-hist-jugador');
  if (b){ ev.preventDefault(); histAbrir(b.dataset.tag, b.dataset.nombre); return; }
  if (ev.target.id === 'histFondo' || ev.target.id === 'histCerrar') histCerrar();
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') histCerrar(); });
}
