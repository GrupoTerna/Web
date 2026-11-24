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
/* opts.sinWsp (23-oct-2026, tanda 2): la tarjeta de «Ingresos recientes» ya pinta su propio ícono de WhatsApp (.ico-wsp), así que aquí no se antepone otro ni wspRepintar() lo añade después.
   opts.sinAlerta (5-nov-2026, §PF383): la misma tarjeta pinta además su propio ⚠️ (botonAlertaClanesHtml) para dejar el orden RoyaleAPI, CWStats, ⚠️, WhatsApp, 📈; aquí no se antepone otro.
   Orden unificado (5-nov-2026, §PF383, pedido de la usuaria): ⚠️ a la izquierda, WhatsApp en el medio y 📈 a la derecha, en todos los lugares donde aparezcan. */
function botonHistJugador(f, opts){
  if (!f || !f.tag) return '';
  const sinWsp = !!(opts && opts.sinWsp);
  const sinAlerta = !!(opts && opts.sinAlerta);
  const adminOk = typeof esAdminLogueado === 'function' && esAdminLogueado();
  const wsp = (!sinWsp && adminOk && (f.tieneWsp === true || wspTieneTag(f.tag))) ? iconoWspHistHtml(f) : '';
  const alerta = (!sinAlerta && adminOk && alertaClanesDe(f.tag)) ? botonAlertaClanesHtml(f) : '';
  return alerta + wsp + `<button type="button" class="btn-hist-jugador"${sinWsp ? ' data-sin-wsp="1"' : ''} data-tag="${esc(f.tag)}" data-nombre="${esc(f.nombre || f.tag)}" title="Ver historial de guerra" aria-label="Historial de guerra de ${esc(f.nombre || f.tag)}">📈</button>`;
}
function wspRepintar(){
  document.querySelectorAll('.btn-hist-jugador').forEach(b => {
    if (b.dataset.sinWsp) return;
    const prev = b.previousElementSibling;
    if (prev && prev.classList.contains('hist-wsp')) return;
    if (!wspTieneTag(b.dataset.tag)) return;
    b.insertAdjacentHTML('beforebegin', iconoWspHistHtml({ tag: b.dataset.tag, nombre: b.dataset.nombre })); // justo antes del 📈 y, por tanto, después del ⚠️ si ya está
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
/* 5-nov-2026 (pedido de la usuaria, §PF375): ⚠️ permanente (desde §PF383 a la IZQUIERDA del WhatsApp y del 📈; antes iba a la derecha del 📈) en los jugadores que estuvieron en un clan vetado o rival de la guerra. Solo admins. El resumen (un archivo pequeño del backend, con caché) lo pide alertaCargarTags() a webAdminTagsClanesSospechosos: { ok, actualizado, jugadores: { 'TAGSINNUMERAL': { n, tipos } } }. Igual que el WhatsApp, si la lista llega después de pintar una tabla, alertaRepintar() inserta el ⚠️ en los botones ya existentes; si el backend falla solo falta el ⚠️. perfil.html (data-sin-wsp-tags) sí lo pide desde §PF385 (5-nov-2026) y, al llegar, emite el evento 'alerta-tags-listas' para pintar su ⚠️ junto a RoyaleAPI. El clic lo atiende el modal del paso 2 de §PF375. */
let alertaTags = null; // Map de Tag en mayúsculas y sin # -> { n, tipos }; null = sin cargar o sin sesión de admin
function alertaClanesDe(tag){ return (alertaTags && alertaTags.get(wspClaveTag(tag))) || null; }
function alertaTextoClanes(a){
  const n = Number(a && a.n) || 0;
  const tipos = (a && Array.isArray(a.tipos)) ? a.tipos : [];
  const vet = tipos.includes('vetado'), riv = tipos.includes('rival');
  const uno = n === 1;
  const que = (vet && riv) ? (uno ? 'vetado o rival' : 'vetados o rivales') : (vet ? (uno ? 'vetado' : 'vetados') : (uno ? 'rival' : 'rivales'));
  return `Estuvo en ${n} ${uno ? 'clan' : 'clanes'} ${que}`;
}
function botonAlertaClanesHtml(f){
  const a = alertaClanesDe(f.tag);
  if (!a) return '';
  const nombre = f.nombre || f.tag;
  const txt = alertaTextoClanes(a);
  return `<button type="button" class="btn-alerta-clanes" data-tag="${esc(f.tag)}" data-nombre="${esc(nombre)}" title="${esc(txt)}. Clic para ver las semanas" aria-label="Alerta de ${esc(nombre)}: ${esc(txt)}">⚠️</button>`;
}
function alertaRepintar(){
  if (!alertaTags) return;
  // 19-nov-2026: si el resumen nuevo ya no incluye a alguien que salió del caché, se le quita el ⚠️.
  document.querySelectorAll('.btn-alerta-clanes').forEach(a => { if (!alertaClanesDe(a.dataset.tag)) a.remove(); });
  document.querySelectorAll('.btn-hist-jugador').forEach(b => {
    const prev = b.previousElementSibling;
    const wsp = (prev && (prev.classList.contains('hist-wsp') || prev.classList.contains('ico-wsp'))) ? prev : null;
    const ant = wsp ? wsp.previousElementSibling : prev; // lo que ya está a la izquierda del WhatsApp (o del 📈 si no hay WhatsApp)
    if (ant && ant.classList.contains('btn-alerta-clanes')) return;
    if (!alertaClanesDe(b.dataset.tag)) return;
    (wsp || b).insertAdjacentHTML('beforebegin', botonAlertaClanesHtml({ tag: b.dataset.tag, nombre: b.dataset.nombre }));
  });
}
/* 19-nov-2026 (pedido de la usuaria): el resumen se guarda en sessionStorage (solo esa pestaña, se borra al cerrarla) para que el ⚠️ salga junto con la tabla en las visitas siguientes; la petición al backend se hace igual y, al llegar, actualiza el caché y corrige lo pintado. El caché solo se lee con sesión de admin y vence a las 12 h. */
const ALERTA_CACHE_CLAVE = 'terna_alerta_tags_v1';
const ALERTA_CACHE_MS = 12 * 60 * 60 * 1000;
function alertaCacheLeer(){
  try{
    const c = JSON.parse(sessionStorage.getItem(ALERTA_CACHE_CLAVE) || 'null');
    if (c && typeof c.t === 'number' && Date.now() - c.t < ALERTA_CACHE_MS && c.jugadores && typeof c.jugadores === 'object') return c.jugadores;
  }catch(_){ /* sin caché se pide al backend como siempre */ }
  return null;
}
function alertaCacheGuardar(jugadores){
  try{ sessionStorage.setItem(ALERTA_CACHE_CLAVE, JSON.stringify({ t: Date.now(), jugadores: jugadores })); }catch(_){ /* sin almacenamiento solo falta el caché */ }
}
function alertaAplicar(jugadores){
  const mapa = new Map();
  Object.keys(jugadores).forEach(t => { const a = jugadores[t]; if (a && Number(a.n) > 0) mapa.set(wspClaveTag(t), { n: Number(a.n), tipos: Array.isArray(a.tipos) ? a.tipos : [] }); });
  alertaTags = mapa;
  alertaRepintar();
  // §PF385: avisa a las páginas que pintan su propio ⚠️ fuera de las tablas (perfil.html, junto al botón de RoyaleAPI).
  if (typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('alerta-tags-listas'));
}
async function alertaCargarTags(){
  if (typeof esAdminLogueado !== 'function' || !esAdminLogueado()) return;
  // 5-nov-2026 (§PF385): perfil.html (data-sin-wsp-tags) ya NO queda fuera: muestra el ⚠️ a la izquierda del botón de RoyaleAPI y necesita el resumen. Lo que sigue excluido en el perfil es solo la lista de WhatsApp.
  const enCache = alertaCacheLeer();
  if (enCache) alertaAplicar(enCache);
  try{
    const data = await apiGetAuth('webAdminTagsClanesSospechosos', {});
    if (!data || data.ok === false || !data.jugadores || typeof data.jugadores !== 'object') return;
    alertaCacheGuardar(data.jugadores);
    alertaAplicar(data.jugadores);
  }catch(_){ /* sin el resumen solo falta el ⚠️ (o queda el del caché); el 📈 y el WhatsApp siguen igual */ }
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alertaCargarTags); else alertaCargarTags(); }
/* 5-nov-2026 (§PF375, paso 2): modal propio del ⚠️ (#alertaFondo, aparte de #histFondo del 📈). Pide webAdminClanesSospechososJugador (tag) y por cada clan vetado o rival del jugador muestra su nombre, Tag, tipo, semanas jugadas, «primera → última» y la tabla de esas semanas (ataques, barcos y medallas por semana; son filas `externa` del JSON individual de RoyaleAPI, §PF340, no el historial diario del 📈). Si el JSON individual no se pudo leer (historialDisponible:false) se siguen mostrando los clanes y sus semanas del archivo de alertas. Cierra con ×, clic fuera o Esc. */
let alertaSolicitud = 0;
function alertaAsegurarModal(){
  if (document.getElementById('alertaFondo')) return;
  const d = document.createElement('div');
  d.className = 'hist-fondo'; d.id = 'alertaFondo'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'alertaTitulo');
  d.innerHTML = '<div class="hist-panel alerta-panel"><div class="hist-cab"><div><h3 id="alertaTitulo">⚠️ Clanes vetados o rivales</h3><div class="hist-nota" id="alertaSub" style="margin:2px 0 0;"></div></div>'
    + '<button type="button" class="hist-cerrar" id="alertaCerrar" aria-label="Cerrar">×</button></div><div id="alertaPerfil" class="hist-perfil"></div><div id="alertaCuerpo" aria-live="polite"></div></div>';
  document.body.appendChild(d);
}
function alertaCerrar(){ const f = document.getElementById('alertaFondo'); if (f) f.classList.remove('abierto'); alertaSolicitud++; }
function alertaPuntoTxt(p){
  if (!p) return '—';
  if (Number(p.temporada) <= 0 && p.supercell) return `${esc(p.supercell)} S${esc(p.semana)}`;
  return `T${esc(p.temporada)} S${esc(p.semana)}`;
}
function alertaTiposHtml(tipos){
  const t = Array.isArray(tipos) ? tipos : [];
  return (t.includes('rival') ? '<span class="alerta-tipo alerta-tipo-rival">Rival</span>' : '') + (t.includes('vetado') ? '<span class="alerta-tipo alerta-tipo-vetado">Vetado</span>' : '');
}
/* 19-nov-2026 (pedido de la usuaria): el modal del ⚠️ toma el aspecto del de 📈: franja con los datos del perfil, tarjetas de resumen por clan (.hist-resumen), fila en rojo con 0 ataques, verde con la semana completa (16) y amarilla con 1 a 15, sombreado alterno al cambiar de temporada y «Ver más» (28 filas al abrir y 28 más por clic). Usa hist-tabla-dia para heredar esos colores. */
const ALERTA_FILAS_INICIALES = 28;
const ALERTA_FILAS_MAS = 28;
let alertaClanesDatos = [];
let alertaLimites = [];
let alertaHistorialOk = true;
const alertaNum = v => (v === null || v === undefined || v === '' || !isFinite(Number(v))) ? null : Number(v);
function alertaClaseFila(r){
  const a = alertaNum(r.ataques);
  if (a === null) return '';
  if (a <= 0) return 'hist-cero';
  return a >= HIST_ATAQUES_MAX * 4 ? 'hist-a4' : 'hist-a13'; // semana completa = 4 días x 4 ataques
}
function alertaFilaHtml(r, idx, clase){
  const temp = Number(r.temporada) > 0 ? String(Number(r.temporada)) : (r.supercell ? esc(r.supercell) : '–');
  const num = v => (v === null || v === undefined) ? '—' : fmtNum(v);
  return `<tr class="${clase}"><td>${idx + 1}</td><td>${temp}</td><td>${histSemanaTxt(r)}${r.cerrada === false ? ' · en curso' : ''}</td><td>${num(r.ataques)}</td><td>${num(r.barcos)}</td><td>${num(r.fame)}</td></tr>`;
}
function alertaResumenHtml(filas, n){
  const conDato = filas.filter(r => alertaNum(r.ataques) !== null);
  const suma = k => filas.reduce((t, r) => t + (alertaNum(r[k]) || 0), 0);
  const atq = suma('ataques');
  const ceros = conDato.filter(r => alertaNum(r.ataques) <= 0).length;
  return `<div class="hist-resumen">
      <div><b>${esc(n)}</b>${n === 1 ? 'semana' : 'semanas'}</div>
      <div><b>${fmtNum(atq)}</b>ataques</div>
      <div class="${ceros ? 'hist-malo' : ''}"><b>${ceros}</b>semanas con 0 ataques</div>
      <div><b>${conDato.length ? histFmtDec(atq / conDato.length) : '—'}</b>ataques por semana</div>
      <div><b>${fmtNum(suma('fame'))}</b>medallas</div>
      <div><b>${fmtNum(suma('barcos'))}</b>barcos</div>
    </div>`;
}
/* La tabla y su «Ver más» de un clan (se vuelve a escribir entera al pedir más filas). */
function alertaDetalleHtml(c, idx){
  const filas = Array.isArray(c.filas) ? c.filas : [];
  if (!filas.length) return `<p class="hist-nota">${alertaHistorialOk ? 'Sin detalle semanal guardado para este clan.' : 'No se pudo leer el historial del jugador: solo se muestran las semanas del archivo de alertas.'}</p>`;
  const visibles = filas.slice(0, alertaLimites[idx] || ALERTA_FILAS_INICIALES);
  let prev = null, alt = false;
  const cuerpo = visibles.map((r, k) => {
    const clave = Number(r.temporada) > 0 ? 'T' + Number(r.temporada) : String(r.supercell || '');
    if (prev !== null && clave !== prev) alt = !alt;
    prev = clave;
    return alertaFilaHtml(r, k, [alertaClaseFila(r), alt ? 'hist-sem-b' : ''].filter(Boolean).join(' '));
  }).join('');
  return `<div class="hist-tabla-scroll"><table class="hist-tabla hist-tabla-dia alerta-tabla"><thead><tr><th>N°</th><th>Temporada</th><th>Semana</th><th>Ataques</th><th>Barcos</th><th>Medallas</th></tr></thead><tbody>${cuerpo}</tbody></table></div>`
    + (filas.length > visibles.length ? `<button type="button" class="btn-solo-cero hist-mas" data-alerta-mas="${idx}">Ver más</button>` : '');
}
function alertaClanHtml(c, idx){
  const filas = Array.isArray(c.filas) ? c.filas : [];
  const n = Number(c.semanas) || filas.length;
  const periodo = (c.primera || c.ultima) ? `${alertaPuntoTxt(c.primera)} → ${alertaPuntoTxt(c.ultima)}` : '—';
  return `<section class="alerta-clan"><h4 class="alerta-clan-nombre">${esc(c.nombre || c.tag || 'Clan sin nombre')} <span class="alerta-clan-tag">${esc(c.tag || '')}</span> ${alertaTiposHtml(c.tipos)}</h4>`
    + `<p class="hist-nota alerta-clan-resumen"><b>${esc(n)}</b> ${n === 1 ? 'semana' : 'semanas'} · ${periodo}</p>`
    + (filas.length ? alertaResumenHtml(filas, n) : '')
    + `<div class="alerta-detalle" data-alerta-idx="${idx}">${alertaDetalleHtml(c, idx)}</div></section>`;
}
function alertaPintar(data){
  const clanes = Array.isArray(data && data.clanes) ? data.clanes : [];
  const cuerpo = document.getElementById('alertaCuerpo');
  if (!clanes.length){ cuerpo.innerHTML = '<p class="hist-nota">Sin clanes vetados ni rivales registrados para este jugador.</p>'; return; }
  alertaClanesDatos = clanes;
  alertaLimites = clanes.map(() => ALERTA_FILAS_INICIALES);
  alertaHistorialOk = data.historialDisponible !== false;
  cuerpo.innerHTML = clanes.map((c, i) => alertaClanHtml(c, i)).join('')
    + '<p class="hist-nota">«Rival»: clan que fue rival de nuestra guerra en la temporada en que se detectó. «Vetado»: clan de la lista de conflictos o vetado. La alerta es permanente: se conserva aunque el clan deje de ser rival. Las semanas son las jugadas en ese clan, según el historial individual.</p>'
    + '<p class="hist-nota alerta-leyenda">Color de cada semana: verde con 16 ataques (el tope semanal), amarillo con menos de 16 y rojo con 0. Menos de 16 puede ser normal si el clan ya había cruzado la meta: el historial de clanes externos no indica si la cruzó.</p>';
}
async function alertaCargarCabecera(tag, mia){
  try{
    const data = await apiGet('webPerfil', { tag }, { ttlMs: 300000, staleIfError: true, conSesion: true });
    const j = histJugadorDeRespuesta(data);
    if (mia !== alertaSolicitud || !j) return;
    const el = document.getElementById('alertaPerfil');
    if (el) el.innerHTML = histCabeceraPerfilHtml(j);
  }catch(_){ /* sin la cabecera solo falta ese resumen; las tablas ya se pintan */ }
}
async function alertaAbrir(tag, nombre){
  alertaAsegurarModal();
  document.getElementById('alertaTitulo').innerHTML = `⚠️ ${enlaceJugador(nombre || tag, tag)}`; // 19-nov-2026: como el 📈, el título es el jugador con enlace a su perfil
  document.getElementById('alertaSub').textContent = `${tag} · Clanes vetados o rivales`;
  document.getElementById('alertaPerfil').innerHTML = '';
  document.getElementById('alertaCuerpo').innerHTML = '<p class="hist-nota">Cargando clanes…</p>';
  document.getElementById('alertaFondo').classList.add('abierto');
  const mia = ++alertaSolicitud;
  alertaCargarCabecera(tag, mia); // en paralelo, sin esperarla
  try{
    const data = await apiGetAuth('webAdminClanesSospechososJugador', { tag });
    if (mia !== alertaSolicitud) return; // se cerró o se abrió otro jugador mientras cargaba
    if (!data || data.ok === false) throw new Error((data && data.error) || 'sin respuesta');
    alertaPintar(data);
  }catch(e){
    if (mia !== alertaSolicitud) return;
    document.getElementById('alertaCuerpo').innerHTML = '<p class="hist-nota">No se pudo cargar el detalle. Intenta de nuevo en un momento.</p>';
  }
}
if (typeof document !== 'undefined'){
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('.btn-alerta-clanes');
  if (b){ ev.preventDefault(); alertaAbrir(b.dataset.tag, b.dataset.nombre); return; }
  const mas = ev.target.closest && ev.target.closest('[data-alerta-mas]');
  if (mas){
    const idx = Number(mas.dataset.alertaMas);
    alertaLimites[idx] = (alertaLimites[idx] || ALERTA_FILAS_INICIALES) + ALERTA_FILAS_MAS;
    const cont = mas.closest('.alerta-detalle');
    if (cont && alertaClanesDatos[idx]) cont.innerHTML = alertaDetalleHtml(alertaClanesDatos[idx], idx);
    return;
  }
  if (ev.target.id === 'alertaFondo' || ev.target.id === 'alertaCerrar') alertaCerrar();
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') alertaCerrar(); });
}
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
    ['Clan', j.clan ? enlaceClan(j.clan, { tag: j.clanTag }) : null], // §PF416 (6e): webPerfil ya manda clanTag
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
function histCerrar(){ const f = document.getElementById('histFondo'); if (f) f.classList.remove('abierto'); histSolicitud++; histCerrarPop(); } // 5-nov-2026 (§PF375): sin error si Esc llega antes de que exista la ventana del 📈
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
/* 23-nov-2026 (pedido de la usuaria): pastilla Todos / Completos / Incompletos y su análisis por día de la semana y por barcos. Incompleto = día de guerra ya cerrado y obligatorio con menos de 4 ataques, incluidos los 0. Completo = 4 ataques o día opcional (meta ya cruzada). El día en curso con menos de 4 no es ni una cosa ni otra (todavía puede atacar). El estado vive a nivel de módulo para que sobreviva a «Ver más» y a cada repintado; histAbrir() lo vuelve a «Todos» al abrir otro jugador. [→ Contexto_Base_Web.md §PF560] */
let histFiltroAtaques = 'todos'; // 'todos' | 'completos' | 'incompletos'
/* Día con `opcional: true` = el clan ya había cruzado la meta antes de ese día de guerra: sus ataques ya no son obligatorios y el día cuenta como COMPLETO tenga 0, 1, 2, 3 o 4 ataques (pedido de la usuaria, 23-nov-2026). Si el clan cruzó al cerrar el sábado, el domingo es opcional, pero jueves a sábado siguen siendo obligatorios: un sábado con 3 ataques sigue incompleto aunque el domingo se haga 1 y la suma dé 12; cada día se juzga por separado, nunca se suman ataques de un día al otro. */
const histEsCompleto = r => !!r && (r.opcional === true || (r.ataques || 0) >= HIST_ATAQUES_MAX);
const histEsIncompleto = (r, hoyIso) => !!r && r.opcional !== true && (r.ataques || 0) < HIST_ATAQUES_MAX && !histPendiente(r, hoyIso);
const HIST_DIAS_GUERRA = ['J', 'V', 'S', 'D'];
/* Por cada día de la semana de guerra: días cerrados que contaban (sin opcionales ni el día en curso), cuántos quedaron incompletos, cuántos ataques faltaron y los barcos de esos días. Aparte, barcos en días incompletos frente a completos. `regs` ya pasó por histSoloGuerra(). */
function histAnalisisIncompletos(regs, hoyIso){
  const por = {};
  HIST_DIAS_GUERRA.forEach(l => { por[l] = { dias: 0, inc: 0, faltan: 0, barcosInc: 0 }; });
  const g = { inc: { dias: 0, barcos: 0, conBarcos: 0 }, comp: { dias: 0, barcos: 0, conBarcos: 0 } };
  regs.forEach(r => {
    if (histPendiente(r, hoyIso)) return;
    const l = histDiaLetra(r.fecha), d = por[l];
    if (!d) return;
    const inc = histEsIncompleto(r, hoyIso), b = r.barcos || 0, k = inc ? g.inc : g.comp;
    d.dias++;
    k.dias++; k.barcos += b; if (b > 0) k.conBarcos++;
    if (inc){ d.inc++; d.faltan += HIST_ATAQUES_MAX - (r.ataques || 0); d.barcosInc += b; }
  });
  return { por, g };
}
/* 23-nov-2026 (pedido de la usuaria: «no se entiende qué significa cada columna»): las dos tablas de análisis se rehicieron con título en forma de pregunta, una línea que explica qué cuenta cada fila, encabezados con la palabra completa, bordes visibles y una conclusión en una frase. Mismos cálculos de histAnalisisIncompletos(). [→ Contexto_Base_Web.md §PF562] */
const HIST_NOMBRE_DIA = { J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };
/* 23-nov-2026 (pedido de la usuaria): pastillas «Con barcos / Sin barcos» y, en el encabezado de cada tabla del historial (días, por día de la semana y por tipo de día), el MISMO widget de filtro y orden que las tablas de guerra.html y del Directorio (clases .rt-th-inner, .rt-filtro-btn con el embudo, .rt-orden-indicador y el desplegable .rt-filtro-pop: ordenar de menor a mayor o al revés, condición de comparación para números y fechas, buscador, «Seleccionar todo», «Desmarcar todo», lista de valores, Cancelar y Aceptar; ver abrirGridFiltroColumna() en grid-guerra.js, del que este código es una copia adaptada porque grid-guerra.js no se carga en directorio.html). El orden se aplica al tocar; el filtro, al tocar «Aceptar»; con todos los valores marcados y sin condición la columna queda sin filtro. Orden y filtro se calculan sobre los datos, no sobre las filas pintadas, así que «Ver más» los respeta; las celdas sin dato (Temporada o Semana con «–») van siempre al final al ordenar. N° es la posición del día en la lista de las pastillas y no cambia al ordenar. Todo el estado vive a nivel de módulo y se reinicia en histAbrir(). */
let histFiltroBarcos = 'todos'; // 'todos' | 'con' | 'sin'
let histTablas = {};            // clave de tabla ('dia', 'sem', 'tipo') -> { ord: { c, d } | null, fil: { [columna]: Set de claves | { operador, valor } } }
let histFilasBase = {};         // clave de tabla -> filas sin filtrar (de ahí salen los valores únicos del desplegable)
let histPopEl = null, histPopBtn = null, histPopAncho = 0;
const HIST_NOMBRES_DIA = HIST_DIAS_GUERRA.map(l => HIST_NOMBRE_DIA[l]);
const HIST_ICONO_FILTRO = '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1 2.5A.5.5 0 0 1 1.5 2h13a.5.5 0 0 1 .4.8L10 9.4V13a.5.5 0 0 1-.2.4l-2 1.5A.5.5 0 0 1 7 14.5v-5.1L1.1 2.8A.5.5 0 0 1 1 2.5z"/></svg>';
const HIST_COLS = {
  dia: [
    { t: 'N°', tipo: 'num' }, { t: 'Fecha', tipo: 'fecha', texto: v => histFechaDMA(v) }, { t: 'Temporada', tipo: 'num' }, { t: 'Semana', tipo: 'num', texto: v => 'S' + v },
    { t: 'Día', tipo: 'lista', orden: v => HIST_DIAS_GUERRA.indexOf(v), texto: v => HIST_NOMBRE_DIA[v] || v },
    { t: 'Ataques', tipo: 'num' }, { t: 'Barcos', tipo: 'num' }, { t: 'Medallas', tipo: 'num' }
  ],
  sem: [
    { t: 'Día de la semana', tipo: 'lista', orden: v => HIST_NOMBRES_DIA.indexOf(v) }, { t: 'Días jugados', tipo: 'num' },
    { t: 'Días incompletos', tipo: 'num' }, { t: '% de incompletos', tipo: 'num' }, { t: 'Ataques sin hacer', tipo: 'num' }, { t: 'Barcos en esos días', tipo: 'num' }
  ],
  tipo: [
    { t: 'Tipo de día', tipo: 'lista' }, { t: 'Cantidad de días', tipo: 'num' }, { t: 'Barcos en total', tipo: 'num' },
    { t: 'Barcos por día', tipo: 'num' }, { t: 'Días con al menos 1 barco', tipo: 'num' }
  ]
};
function histEst(t){ return histTablas[t] || (histTablas[t] = { ord: null, fil: {} }); }
const histClaveValor = v => v == null ? '' : String(v);
function histEtiquetaValor(col, v){
  if (v == null) return '–';
  if (col.texto) return col.texto(v);
  return typeof v === 'number' && !Number.isInteger(v) ? histFmtDec(v) : String(v);
}
function histPasaFiltro(col, f, v){
  if (!f) return true;
  if (f instanceof Set) return f.has(histClaveValor(v));
  if (v == null) return false;
  const x = col.tipo === 'fecha' ? v : Number(v), y = f.valor;
  switch (f.operador){
    case 'gt': return x > y;
    case 'gte': return x >= y;
    case 'lt': return x < y;
    case 'lte': return x <= y;
    case 'eq': return x === y;
    default: return true;
  }
}
/* `filas` = [{ v: [valor de cada columna], ... }]. Devuelve las que pasan los filtros de la tabla `t`, en el orden elegido. */
function histFilasTabla(t, filas){
  const e = histEst(t), cols = HIST_COLS[t];
  let r = filas.filter(f => cols.every((col, c) => histPasaFiltro(col, e.fil[c], f.v[c])));
  if (e.ord){
    const c = e.ord.c, col = cols[c], s = e.ord.d === 'desc' ? -1 : 1;
    const clave = v => (col.orden && v != null) ? col.orden(v) : v;
    r = r.slice().sort((a, b) => {
      const x = clave(a.v[c]), y = clave(b.v[c]);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * s;
    });
  }
  return r;
}
/* Valores únicos de una columna (los del desplegable), ordenados de menor a mayor, o por la semana de guerra en las columnas de día. */
function histValoresUnicos(col, c, filas){
  const vistos = new Map();
  filas.forEach(f => { const v = f.v[c]; if (!vistos.has(histClaveValor(v))) vistos.set(histClaveValor(v), v); });
  return [...vistos.values()].sort((a, b) => {
    if (a == null) return 1;
    if (b == null) return -1;
    if (col.orden) return col.orden(a) - col.orden(b);
    return typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'es');
  });
}
/* Encabezado con el widget estándar de las tablas de la web: etiqueta, indicador de orden y embudo. */
function histThHtml(t, c){
  const col = HIST_COLS[t][c], e = histEst(t), k = `${t}:${c}`;
  const d = e.ord && e.ord.c === c ? e.ord.d : '';
  const activo = !!e.fil[c];
  const nombre = esc(col.t);
  return `<th scope="col" class="hist-th" aria-sort="${d ? (d === 'asc' ? 'ascending' : 'descending') : 'none'}"><div class="rt-th-inner"><span>${nombre}</span><span class="rt-orden-indicador" data-col="${k}">${d ? (d === 'desc' ? '↓' : '↑') : ''}</span><button type="button" class="rt-filtro-btn${activo ? ' activo' : ''}" data-col="${k}" title="Ordenar o filtrar por ${nombre}" aria-label="Ordenar o filtrar por ${nombre}${activo ? ' (con filtro)' : ''}" aria-haspopup="dialog" aria-expanded="false">${HIST_ICONO_FILTRO}</button></div></th>`;
}
function histTheadHtml(t){ return `<thead><tr>${HIST_COLS[t].map((_, c) => histThHtml(t, c)).join('')}</tr></thead>`; }
function histCerrarPop(devolverFoco){
  // También es oyente de scroll y resize (ahí llega un evento): el foco solo vuelve con `true` exacto.
  if (histPopEl){ histPopEl.remove(); histPopEl = null; }
  if (histPopBtn){
    histPopBtn.setAttribute('aria-expanded', 'false');
    if (devolverFoco === true && histPopBtn.isConnected) histPopBtn.focus();
    histPopBtn = null;
  }
  document.removeEventListener('keydown', histPopEscape, true);
  document.removeEventListener('mousedown', histPopFuera, true);
  window.removeEventListener('scroll', histPopScroll, true);
  window.removeEventListener('resize', histPopResize, true);
}
function histPopEscape(e){ if (e.key === 'Escape'){ e.stopPropagation(); histCerrarPop(true); } } // sin stopPropagation, el mismo Esc cerraría también la ventana del historial
function histPopFuera(e){ if (histPopEl && !histPopEl.contains(e.target)) histCerrarPop(); }
function histPopScroll(e){ if (histPopEl && e && e.target instanceof Node && histPopEl.contains(e.target)) return; histCerrarPop(); }
function histPopResize(){ if (window.innerWidth !== histPopAncho) histCerrarPop(); }
/* Desplegable de una columna; `alCambiar` repinta el historial tras ordenar o aceptar. Copia adaptada de abrirGridFiltroColumna() (grid-guerra.js). */
function histAbrirFiltro(t, c, btnEl, alCambiar){
  const col = HIST_COLS[t][c], est = histEst(t), clave = `${t}:${c}`;
  const yaAbierto = histPopEl && histPopEl.dataset.col === clave;
  histCerrarPop();
  if (yaAbierto) return; // clic de nuevo en el mismo embudo: solo cierra
  const valores = histValoresUnicos(col, c, histFilasBase[t] || []);
  const claves = valores.map(histClaveValor);
  const previa = est.fil[c];
  const esComparacionPrevia = previa && !(previa instanceof Set);
  const temp = new Set(previa instanceof Set ? [...previa] : claves);
  const ordenActivo = est.ord && est.ord.c === c ? est.ord.d : null;
  const tieneComparacion = col.tipo === 'num' || col.tipo === 'fecha';
  const et = col.tipo === 'num' ? ['Menor a mayor', 'Mayor a menor'] : col.tipo === 'fecha' ? ['Más antiguo primero', 'Más reciente primero'] : col.orden ? ['Jueves a domingo', 'Domingo a jueves'] : ['A → Z', 'Z → A'];
  const titulo = 'Ordenar o filtrar por ' + col.t;

  const pop = document.createElement('div');
  pop.className = 'rt-filtro-pop hist-filtro-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', titulo);
  pop.dataset.col = clave;
  pop.innerHTML = `
    <div class="rt-filtro-orden">
      <button type="button" class="rt-orden-btn${ordenActivo === 'asc' ? ' activo' : ''}" data-dir="asc" aria-pressed="${ordenActivo === 'asc'}">↑ ${esc(et[0])}</button>
      <button type="button" class="rt-orden-btn${ordenActivo === 'desc' ? ' activo' : ''}" data-dir="desc" aria-pressed="${ordenActivo === 'desc'}">↓ ${esc(et[1])}</button>
      ${ordenActivo ? '<button type="button" class="rt-orden-quitar">✕ Quitar orden</button>' : ''}
    </div>
    <div class="rt-filtro-divisor"></div>
    ${tieneComparacion ? `
    <div class="rt-filtro-comparar">
      <select class="rt-comparar-operador" aria-label="Condición de comparación para ${esc(col.t)}">
        <option value="">Sin condición de comparación</option>
        <option value="gt">Mayor que…</option>
        <option value="gte">Mayor o igual que…</option>
        <option value="lt">Menor que…</option>
        <option value="lte">Menor o igual que…</option>
        <option value="eq">Igual a…</option>
      </select>
      <input type="${col.tipo === 'fecha' ? 'date' : 'number'}"${col.tipo === 'fecha' ? '' : ' step="any"'} class="rt-comparar-valor" placeholder="Valor…" aria-label="Valor a comparar para ${esc(col.t)}">
    </div>
    <div class="rt-filtro-divisor"></div>` : ''}
    <input type="text" class="rt-filtro-buscar" placeholder="Buscar valor…" aria-label="Buscar valor de ${esc(col.t)}">
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
  histPopEl = pop;
  histPopBtn = btnEl;
  btnEl.setAttribute('aria-expanded', 'true');

  // Orden: se aplica al toque, sin esperar a «Aceptar».
  pop.querySelectorAll('.rt-orden-btn').forEach(b => b.addEventListener('click', () => { est.ord = { c, d: b.dataset.dir }; histCerrarPop(true); alCambiar(); }));
  const quitar = pop.querySelector('.rt-orden-quitar');
  if (quitar) quitar.addEventListener('click', () => { est.ord = null; histCerrarPop(true); alCambiar(); });

  if (tieneComparacion && esComparacionPrevia){
    pop.querySelector('.rt-comparar-operador').value = previa.operador;
    pop.querySelector('.rt-comparar-valor').value = previa.valor;
  }

  const listaEl = pop.querySelector('.rt-filtro-lista');
  const pintarLista = filtroTexto => {
    const q = (filtroTexto || '').trim().toLowerCase();
    const visibles = valores.filter(v => !q || histEtiquetaValor(col, v).toLowerCase().includes(q));
    listaEl.innerHTML = visibles.length ? visibles.map(v => `
      <label class="rt-filtro-item">
        <input type="checkbox" value="${esc(histClaveValor(v))}"${temp.has(histClaveValor(v)) ? ' checked' : ''}>
        <span>${esc(histEtiquetaValor(col, v))}</span>
      </label>`).join('') : '<div class="empty" style="padding:8px 5px; font-size:13px; font-style:normal; text-align:left;">Sin coincidencias.</div>';
    listaEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => { cb.checked ? temp.add(cb.value) : temp.delete(cb.value); });
    });
  };
  pintarLista('');
  pop.querySelector('.rt-filtro-buscar').addEventListener('input', e => pintarLista(e.target.value));
  pop.querySelector('[data-modo="todo"]').addEventListener('click', () => { claves.forEach(k => temp.add(k)); pintarLista(pop.querySelector('.rt-filtro-buscar').value); });
  pop.querySelector('[data-modo="ninguno"]').addEventListener('click', () => { temp.clear(); pintarLista(pop.querySelector('.rt-filtro-buscar').value); });

  pop.querySelector('.rt-filtro-cancelar').addEventListener('click', () => histCerrarPop(true));
  pop.querySelector('.rt-filtro-aceptar').addEventListener('click', () => {
    const operador = tieneComparacion ? pop.querySelector('.rt-comparar-operador').value : '';
    const valorCrudo = tieneComparacion ? pop.querySelector('.rt-comparar-valor').value : '';
    if (operador && valorCrudo !== ''){
      // Con condición de comparación, esta reemplaza a la lista de valores (no se combinan).
      const valor = col.tipo === 'fecha' ? valorCrudo : Number(valorCrudo);
      if (col.tipo === 'fecha' || !isNaN(valor)) est.fil[c] = { operador, valor };
      else delete est.fil[c];
    } else if (temp.size >= claves.length){
      delete est.fil[c]; // todos marcados y sin condición = sin filtro
    } else {
      est.fil[c] = temp;
    }
    histCerrarPop(true);
    alCambiar();
  });

  // El desplegable cuelga del embudo (position:fixed) y se ajusta para no salirse de la ventana.
  const r = btnEl.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 250 - 12)) + 'px';
  const margenV = 8;
  const libreAbajo = window.innerHeight - r.bottom - 6 - margenV;
  const libreArriba = r.top - 6 - margenV;
  const altoCuadro = pop.scrollHeight;
  const abajo = altoCuadro <= libreAbajo || libreAbajo >= libreArriba;
  const altoMax = Math.max(abajo ? libreAbajo : libreArriba, 100);
  pop.style.maxHeight = altoMax + 'px';
  pop.style.top = (abajo ? r.bottom + 6 : Math.max(margenV, r.top - 6 - Math.min(altoCuadro, altoMax))) + 'px';
  histPopAncho = window.innerWidth;
  pop.tabIndex = -1;
  pop.style.outline = 'none';
  pop.focus({ preventScroll: true });
  setTimeout(() => {
    if (histPopEl !== pop) return;
    document.addEventListener('keydown', histPopEscape, true);
    document.addEventListener('mousedown', histPopFuera, true);
    window.addEventListener('scroll', histPopScroll, true);
    window.addEventListener('resize', histPopResize, true);
  }, 0);
}
function histAnalisisHtml(regs, hoyIso){
  const { por, g } = histAnalisisIncompletos(regs, hoyIso);
  const maxInc = Math.max(...HIST_DIAS_GUERRA.map(l => por[l].inc));
  const vacio = n => `<tr><td colspan="${n}" class="hist-vacio">Ninguna fila coincide con el filtro.</td></tr>`;
  const num = (n, cls) => `<td class="${n > 0 ? cls : 'hist-c-cero'}">${fmtNum(n)}</td>`;
  const datosSem = HIST_DIAS_GUERRA.map(l => {
    const d = por[l];
    return { l, d, top: maxInc > 0 && d.inc === maxInc, v: [HIST_NOMBRE_DIA[l], d.dias, d.inc, d.dias ? Math.round(d.inc * 100 / d.dias) : null, d.faltan, d.barcosInc] };
  });
  histFilasBase.sem = datosSem;
  const filas = histFilasTabla('sem', datosSem).map(x => {
    const d = x.d, pct = d.dias ? x.v[3] + ' %' : '–';
    return `<tr${x.top ? ' class="hist-top"' : ''}><th scope="row" class="hist-c-et">${HIST_NOMBRE_DIA[x.l]}</th>${num(d.dias, 'hist-c-azul')}${num(d.inc, 'hist-c-mal')}<td class="${x.v[3] > 0 ? 'hist-c-amb' : 'hist-c-cero'}">${pct}</td>${num(d.faltan, 'hist-c-mal')}${num(d.barcosInc, 'hist-c-bar')}</tr>`;
  }).join('') || vacio(6);
  const peores = HIST_DIAS_GUERRA.filter(l => maxInc > 0 && por[l].inc === maxInc);
  const frasePeor = !maxInc
    ? 'No dejó ataques sin hacer en ningún día de la semana.'
    : (peores.length === 1
      ? `El día en que más deja ataques sin hacer es el ${HIST_NOMBRE_DIA[peores[0]].toLowerCase()}: ${fmtNum(maxInc)} de ${fmtNum(por[peores[0]].dias)} (${Math.round(maxInc * 100 / por[peores[0]].dias)} %), con ${fmtNum(por[peores[0]].faltan)} ataques sin hacer.`
      : `Los días en que más deja ataques sin hacer son ${peores.map(l => HIST_NOMBRE_DIA[l].toLowerCase()).join(' y ')}: ${fmtNum(maxInc)} días incompletos en cada uno.`);
  const datosTipo = [['Días incompletos', g.inc, 'hist-c-mal-et'], ['Días completos', g.comp, 'hist-c-ok-et']]
    .map(([tit, k, cls]) => ({ tit, k, cls, v: [tit, k.dias, k.barcos, k.dias ? Math.round(k.barcos * 10 / k.dias) / 10 : null, k.conBarcos] }));
  histFilasBase.tipo = datosTipo;
  const filasTipo = histFilasTabla('tipo', datosTipo).map(({ tit, k, cls }) =>
    `<tr><th scope="row" class="${cls}">${tit}</th>${num(k.dias, 'hist-c-azul')}${num(k.barcos, 'hist-c-bar')}<td class="${k.barcos > 0 ? 'hist-c-bar' : 'hist-c-cero'}">${k.dias ? histFmtDec(k.barcos / k.dias) : '–'}</td>${num(k.conBarcos, 'hist-c-bar')}</tr>`
  ).join('') || vacio(5);
  const fraseBarcos = (!g.inc.barcos && !g.comp.barcos)
    ? 'No hizo ataques a barcos en ningún día cerrado.'
    : (!g.inc.dias
      ? 'No tiene días incompletos, así que no hay con qué comparar.'
      : (g.inc.barcos > 0
        ? `En los días incompletos hizo ${fmtNum(g.inc.barcos)} barco${g.inc.barcos === 1 ? '' : 's'} en ${fmtNum(g.inc.conBarcos)} de ${fmtNum(g.inc.dias)} días.`
        : 'En ningún día incompleto hizo barcos.'));
  return `
    <section class="hist-an">
      <h4 class="hist-an-tit">¿Qué día de la semana deja ataques sin hacer?</h4>
      <p class="hist-an-desc">Cada fila es un día de la semana de guerra. Un día es <b>incompleto</b> si ya cerró y el jugador hizo menos de 4 ataques (incluye 0).</p>
      <div class="hist-tabla-scroll"><table class="hist-tabla hist-tabla-incompletos">${histTheadHtml('sem')}<tbody>${filas}</tbody></table></div>
      <p class="hist-an-conclusion">${frasePeor}</p>
    </section>
    <section class="hist-an">
      <h4 class="hist-an-tit">¿Hace barcos en los días incompletos?</h4>
      <p class="hist-an-desc">Compara los días incompletos con los completos (4 ataques, o un día opcional porque el clan ya había cruzado la meta).</p>
      <div class="hist-tabla-scroll"><table class="hist-tabla hist-tabla-incompletos">${histTheadHtml('tipo')}<tbody>${filasTipo}</tbody></table></div>
      <p class="hist-an-conclusion">${fraseBarcos}</p>
    </section>`;
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
/* 23-nov-2026 (pedido de la usuaria): las notas del pie van una por línea (lista) y no en un solo párrafo; incluyen las del día en curso. */
function histNotasPieHtml(filtrado, hayHoy, hayPend){
  const notas = [
    'Un 0 es un día de guerra en el que estuvo registrado y no atacó.',
    'Los días anteriores a su ingreso al clan no aparecen.',
    'Un día marcado como opcional (meta ya cruzada) no cuenta como falta.',
    'Solo se muestran días de guerra, no de entrenamiento.'
  ];
  if (filtrado) notas.push(
    'Incompleto: día obligatorio ya cerrado con menos de 4 ataques (incluye los 0).',
    'Completo: 4 ataques, o un día opcional (el clan ya había cruzado la meta) con los que haya hecho.',
    'Cada día se juzga por separado: no se suman ataques de otro día, y el día en curso con ataques pendientes no cuenta.',
    'En rojo, el día de la semana con más días incompletos.',
    '«Barcos» son los ataques a barcos del día, como los manda el backend.'
  );
  notas.push('Con los botones de cada encabezado puedes ordenar y filtrar la tabla.');
  if (hayHoy) notas.push('La fila sombreada es el día en curso: todavía no se cierra.');
  if (hayPend) notas.push('<sup class="hist-ast" aria-hidden="true">*</sup> Día en curso: todavía tiene ataques pendientes.');
  return `<ul class="hist-nota hist-nota-lista">${notas.map(n => `<li>${n}</li>`).join('')}</ul>`;
}
function histCuerpoDiaHtml(registros, limite){
  const desc = registros.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const st = histStats(desc), n = st.n;
  const hoyIso = histHoyIso();
  const nInc = desc.filter(r => histEsIncompleto(r, hoyIso)).length;
  const nComp = desc.filter(histEsCompleto).length;
  const filtro = histFiltroAtaques;
  const filtrado = filtro !== 'todos';
  const porAtaques = filtro === 'incompletos' ? desc.filter(r => histEsIncompleto(r, hoyIso)) : filtro === 'completos' ? desc.filter(histEsCompleto) : desc;
  /* Pastillas de barcos: se cuentan sobre los días que dejó la pastilla de ataques. Con barcos = al menos 1 ataque a barcos ese día. */
  const conBarcos = r => (r.barcos || 0) > 0;
  const nCon = porAtaques.filter(conBarcos).length, nSin = porAtaques.length - nCon;
  const fb = histFiltroBarcos;
  const base = fb === 'con' ? porAtaques.filter(conBarcos) : fb === 'sin' ? porAtaques.filter(r => !conBarcos(r)) : porAtaques;
  const datos = base.map((r, i) => ({ r, n: i + 1, v: [i + 1, r.fecha, Number(r.temporada) > 0 ? Number(r.temporada) : null, Number(r.semana) > 0 ? Number(r.semana) : null, histDiaLetra(r.fecha), r.ataques || 0, r.barcos || 0, r.fame || 0] }));
  histFilasBase.dia = datos;
  const lista = histFilasTabla('dia', datos);
  const visibles = lista.slice(0, limite);
  const hayHoy = visibles.some(x => x.r.fecha === hoyIso), hayPend = visibles.some(x => histPendiente(x.r, hoyIso));
  const ord = histEst('dia').ord;
  const sombrear = !(ord && ord.c > 1); // el sombreado alterno por semana solo tiene sentido si las filas siguen el orden de las fechas
  let semPrev = null, semAlt = false;
  const filas = visibles.map(({ r, n: num }) => {
    const sem = histClaveSemana(r);
    if (semPrev !== null && sem !== semPrev) semAlt = !semAlt;
    semPrev = sem;
    const clases = [histClaseColorAtaques(r), sombrear && semAlt ? 'hist-sem-b' : '', r.fecha === hoyIso ? 'hist-hoy' : ''].filter(Boolean).join(' ');
    const barcos = r.barcos || 0, fame = r.fame || 0;
    return `<tr class="${clases}"><td>${num}</td><td>${histFechaDMA(r.fecha)}${r.fecha === hoyIso ? ' · en curso' : ''}${r.opcional === true ? ' · opcional (meta cruzada)' : ''}</td><td class="hist-c-tem">${histTemporadaTxt(r)}</td><td class="hist-c-sem">${histSemanaTxt(r)}</td><td class="hist-c-dia">${histDiaLetra(r.fecha)}</td><td class="hist-c-atq">${fmtNum(r.ataques || 0)}${histPendiente(r, hoyIso) ? HIST_ASTERISCO : ''}</td><td class="${barcos ? 'hist-c-bar' : 'hist-c-cero'}">${fmtNum(barcos)}</td><td class="${fame ? 'hist-c-med' : 'hist-c-cero'}">${fmtNum(fame)}</td></tr>`;
  }).join('');
  const pastillas = (attr, aria, etiqueta, items, actual) => `<div class="hist-filtro" role="group" aria-label="${aria}"><span class="hist-filtro-et">${etiqueta}</span>${items.map(([k, t, c]) => `<button type="button" class="btn-solo-cero hist-pastilla" ${attr}="${k}" aria-pressed="${actual === k}">${t} (${c})</button>`).join('')}</div>`;
  let cuerpoTabla;
  if (filtrado && !porAtaques.length) cuerpoTabla = `<p class="hist-nota">Ningún día de guerra ${filtro === 'completos' ? 'completo' : 'incompleto'} en este período.</p>`;
  else if (!base.length) cuerpoTabla = '<p class="hist-nota">Ningún día coincide con los filtros elegidos.</p>';
  else cuerpoTabla = `<div class="hist-tabla-scroll"><table class="hist-tabla hist-tabla-dia">${histTheadHtml('dia')}<tbody>${filas || '<tr><td colspan="8" class="hist-vacio">Ningún día coincide con los filtros elegidos.</td></tr>'}</tbody></table></div>`;
  return `
    <div class="hist-resumen hist-res-col">
      <div><b>${n}</b>días de guerra</div>
      <div><b>${fmtNum(st.atq)}</b>ataques</div>
      <div class="${st.ceros ? 'hist-malo' : ''}"><b>${st.ceros}</b>días con 0 ataques</div>
      <div><b>${histFmtDec(st.atq / n)}</b>ataques por día</div>
      <div><b>${fmtNum(st.fame)}</b>medallas</div>
      <div><b>${fmtNum(st.barcos)}</b>barcos</div>
    </div>
    ${pastillas('data-hist-filtro', 'Filtrar días por ataques', 'Ataques', [['todos', 'Todos', n], ['completos', 'Completos', nComp], ['incompletos', 'Incompletos', nInc]], filtro)}
    ${pastillas('data-hist-barcos', 'Filtrar días por barcos', 'Barcos', [['todos', 'Todos', porAtaques.length], ['con', 'Con barcos', nCon], ['sin', 'Sin barcos', nSin]], fb)}
    ${filtrado ? histAnalisisHtml(desc, hoyIso) : ''}
    ${cuerpoTabla}
    ${lista.length > visibles.length ? `<button type="button" class="btn-solo-cero hist-mas" data-hist-mas="1">Ver más</button>` : ''}
    ${histNotasPieHtml(filtrado, hayHoy, hayPend)}`;
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
  /* Cada cambio vuelve a pintar desde las primeras filas; `foco` devuelve el foco al botón que se tocó (teclado y lectores de pantalla). */
  const rep = foco => { histPintarEn(el, registros, HIST_FILAS_INICIALES, o); if (foco){ const b = el.querySelector(foco); if (b) b.focus(); } };
  el.querySelectorAll('[data-hist-filtro]').forEach(b => b.addEventListener('click', () => { histFiltroAtaques = b.dataset.histFiltro; histCerrarPop(); rep(`[data-hist-filtro="${b.dataset.histFiltro}"]`); }));
  el.querySelectorAll('[data-hist-barcos]').forEach(b => b.addEventListener('click', () => { histFiltroBarcos = b.dataset.histBarcos; histCerrarPop(); rep(`[data-hist-barcos="${b.dataset.histBarcos}"]`); }));
  el.querySelectorAll('.rt-filtro-btn').forEach(b => b.addEventListener('click', () => {
    const [t, c] = b.dataset.col.split(':');
    histAbrirFiltro(t, Number(c), b, () => rep(`.rt-filtro-btn[data-col="${b.dataset.col}"]`));
  }));
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
  histFiltroAtaques = 'todos'; histFiltroBarcos = 'todos'; histTablas = {}; histFilasBase = {}; histCerrarPop(); // 23-nov-2026: cada jugador se abre con todos sus días, sin orden ni filtros
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
