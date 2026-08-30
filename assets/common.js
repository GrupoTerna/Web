/* =========================================================================
 * common.js — configuración y helpers compartidos por todas las páginas.
 * COMPLETA estos 3 valores después de desplegar el Web App de Apps Script
 * (mismo backend que ya usa guerra.html — ver README-GITHUB.md):
 *   - WEBAPP_URL: la misma URL /exec del Web App.
 *   - WEB_MEMBER_TOKEN: debe coincidir EXACTO con la variable del mismo
 *     nombre en 34_Web_API.gs (backend).
 * El login de admin (admin.html) no necesita token acá: cada admin entra
 * con su propio Celular + Clave (autogenerada por Celular en la hoja
 * Administradores — ver sincronizarAdministradores()/_webAuthLogin() en
 * 11_DirectorioSheet.gs / 34_Web_API.gs del backend), no una contraseña
 * única compartida.
 * ========================================================================= */
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwxTdbddzujbus0e5JT8cDcSHrOB6i-txjdjTu6_cbUGIYmNsF0P8MF71eFmH8_3MKfiw/exec'; // termina en /exec
const WEB_MEMBER_TOKEN = 'terna-web-pub-24ago'; // debe ser igual al de 34_Web_API.gs

/* FASE 0 (24-ago-2026): canales reales de postulación/contacto, en un solo
 * lugar para que nunca vuelva a desincronizarse un link (bug original: el
 * botón Discord del hero de index.html tenía un placeholder distinto al
 * del resto del sitio). Usados por el modal "Cómo unirte" de index.html.
 * FORM_POSTULACION_URL: si quedara vacío, esa opción simplemente no se
 * muestra en vez de linkear a algo roto (ver el `if (FORM_POSTULACION_URL)`
 * en index.html/jugadores.html). Completado el 30-ago-2026 con el Google
 * Form real (contenedor: Google Sheet
 * 1-8es9UFC_kLC8U4DwBT5xKPLfo_nw7__6J9TyiDUW14).
 */
const WSP_GRUPO_URL = 'https://chat.whatsapp.com/HfaoDijjtkS4mwijpdczkU';
const DISCORD_URL = 'https://discord.gg/YKXtg93DVb';
const FORM_POSTULACION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScWHtEClZfhvV1-6zFv2QgrdUgv2pTc7A94JhuGHpB0UnL2LQ/viewform?usp=dialog';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

/**
 * fmtNum(n)
 * Formatea un número con coma para separar miles y punto para separar
 * decimales (ej. 14000 -> "14,000"), como pide el PDF de diseño
 * (28-ago-2026: "Todos los números deben llevar comas para separar miles
 * y puntos para separar decimales"). Se usa en TODO el sitio en vez de
 * toLocaleString('es-PE') (que hace lo contrario) o de mostrar el número
 * crudo. También sirve de definición real de fmtNum(), que guerra.html y
 * admin.html ya llamaban pero que no existía en ningún archivo — sin esta
 * función esas dos páginas rompían al renderizar (ReferenceError).
 */
function fmtNum(n){
  const num = Number(n);
  if (!isFinite(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * ordenClanIndex(nombre)
 * Devuelve la posición fija (0-3) de un clan dentro del orden oficial de
 * la Familia: Principal, Terna 2, Terna 3, Mini Ternas — el mismo orden
 * que ya usan CLAN_BADGES / CLAN_ROL_FAMILIA / CLAN_LABELS_CORTOS más
 * abajo. Se usa para reordenar cualquier lista de clanes que llegue del
 * backend en un orden distinto (ej. alfabético) antes de dibujarla: el
 * orden de los CLANES nunca debe ser alfabético (pedido repetido del PDF
 * de diseño — "el clan 2 sigue apareciendo primero, mientras que el clan
 * principal está apareciendo tercero").
 */
function ordenClanIndex(nombre){
  const n = String(nombre || '').toLowerCase();
  if (/mini/.test(n)) return 3;
  if (n.includes('3')) return 2;
  if (n.includes('2')) return 1;
  return 0; // clan principal (sin número / sin "mini")
}

/** Ordena in-place (y devuelve) un arreglo de clanes según ordenClanIndex. */
function ordenarClanes(clanes){
  return (clanes || []).slice().sort((a, b) => ordenClanIndex(a.nombre) - ordenClanIndex(b.nombre));
}

/**
 * urlValida(u)
 * Filtro defensivo: algunos links de RoyaleAPI/CWStats que manda el
 * backend todavía traen el placeholder sin reemplazar (ej.
 * "https://royaleapi.com/clan/LINK" — bug reportado en el PDF de diseño,
 * el dato real vive en la hoja de cálculo del backend y no se puede
 * corregir desde acá). Mientras no se corrija en el origen, es mejor no
 * mostrar el botón que mostrar un link roto.
 */
function urlValida(u){
  if (!u) return false;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return false;
  if (/\/LINK\/?$/i.test(s)) return false;
  return true;
}

/** true si hay un admin con sesión iniciada en este navegador (mismo
 * sessionStorage que usa apiGetAuth / admin.html). */
function esAdminLogueado(){
  return !!sessionStorage.getItem('terna_admin_token');
}

/** GET a una acción pública del portal (usa WEB_MEMBER_TOKEN). */
async function apiGet(accion, params){
  const qs = new URLSearchParams({ accion, token: WEB_MEMBER_TOKEN, ...(params||{}) });
  const res = await fetch(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' });
  const data = await res.json();
  if(data.error) throw new Error(data.error);
  return data;
}

/** POST a una acción del portal (login / acciones de admin). */
async function apiPost(accion, body){
  const url = `${WEBAPP_URL}?accion=${encodeURIComponent(accion)}`;
  const res = await fetch(url, {
    method:'POST',
    cache:'no-store',
    body: JSON.stringify(body||{})
  });
  return await res.json();
}

/** GET autenticado (requiere sessionToken de admin en query string). */
async function apiGetAuth(accion, params){
  const token = sessionStorage.getItem('terna_admin_token');
  const qs = new URLSearchParams({ accion, sessionToken: token || '', ...(params||{}) });
  const res = await fetch(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' });
  return await res.json();
}

/** Normaliza un tag de Clash Royale para mostrar/mandar: mayúsculas, con '#'. */
function normalizarTag(t){
  let v = String(t||'').trim().toUpperCase().replace(/^#/, '');
  return v ? '#' + v : '';
}

/* =========================================================================
 * Tarjetas y gráficos de clan — compartidos por index.html y jugadores.html
 * (28-ago-2026, pedido del usuario: mismas tarjetas en ambas páginas, sin
 * duplicar el HTML/CSS/JS en cada archivo).
 * ========================================================================= */

/** Insignia de rol, en el MISMO orden fijo de la Familia (ver
 * ordenClanIndex): Principal, Terna 2, Terna 3, Mini Ternas. Usada en
 * Inicio (opts.mostrarRol ausente/false). */
const CLAN_BADGES = [
  { cls: 'badge-gold',   label: '👑 Clan Principal' },
  { cls: 'badge-purple', label: '⚔️ Clan Terna 2' },
  { cls: 'badge-purple', label: '🛡️ Clan Terna 3' },
  { cls: 'badge-purple', label: '🌟 Mini Ternas' }
];
/** Insignia ÚNICA para la página Clanes (opts.mostrarRol = true): antes se
 * mostraban DOS insignias por tarjeta (la de CLAN_BADGES + una segunda con
 * "Cantera"/"Semillero"). El PDF de diseño pide un solo botón con el texto
 * exacto indicado — se reemplaza por completo, no se agrega encima. */
const CLAN_BADGES_ROL = [
  { cls: 'badge-gold',   label: '👑 Clan Principal' },
  { cls: 'badge-purple', label: 'Cantera (Clan 2)' },
  { cls: 'badge-purple', label: 'Cantera (Clan 3)' },
  { cls: 'badge-purple', label: 'Semillero (Clan Mini)' }
];
const CLAN_LABELS_CORTOS = ['Principal', 'Terna 2', 'Terna 3', 'Mini'];

/**
 * clanCardHtml(c, i, opts)
 * Arma el HTML de una tarjeta de clan a partir de un objeto de webClanInfo.
 *   opts.mostrarRol:    usa la insignia única CLAN_BADGES_ROL ("Cantera
 *     (Clan 2)"...) en vez de la insignia normal (solo en Clanes) — UNA
 *     sola insignia, nunca dos.
 *   opts.mostrarUnirse: agrega el botón "Unirse a este clan" (Inicio y Clanes).
 *   opts.mostrarVerClan: agrega el botón "Ver clan" (SOLO Inicio — a pedido
 *     del usuario, la página Clanes ya no lo lleva porque el visitante ya
 *     está ahí; en Inicio lleva directo a la pestaña de ese clan en el
 *     roster de jugadores.html).
 * Ya NO incluye la descripción del clan (retirada a pedido del usuario) —
 * solo RoyaleAPI/CWStats + (opcional) Ver clan + (opcional) Unirse.
 */
function clanCardHtml(c, i, opts){
  opts = opts || {};
  // En Clanes (mostrarRol) va UNA sola insignia con el texto exacto del
  // rol ("Cantera (Clan 2)"...); en Inicio va la insignia normal ("Clan
  // Terna 2"...). Nunca las dos juntas.
  const badge  = (opts.mostrarRol ? CLAN_BADGES_ROL[i] : CLAN_BADGES[i]) || { cls: 'badge-purple', label: 'Clan Terna' };
  const nombre = c.nombre || badge.label;
  const reqTxt = c.requerimiento > 0 ? fmtNum(c.requerimiento) + '+' : '—';
  const lider  = c.lider || '—';
  const liga   = c.liga  || '—';
  const verClanHref = `jugadores.html?clan=${encodeURIComponent(nombre)}#roster`;
  const royaleApiOk = urlValida(c.royaleApi);
  const cwStatsOk   = urlValida(c.cwStats);
  return `
    <div class="card card-hover clan-card" style="display:flex; flex-direction:column;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span class="badge ${badge.cls}">${esc(badge.label)}</span>
      </div>
      <h3 style="font-size:20px;">${esc(nombre)}</h3>
      <div class="text-faint" style="font-family:var(--f-mono); font-size:12px; margin-top:4px;">${esc(c.clanTag||'')}</div>
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:12px; font-size:13px;">
        <span class="text-dim">👑 Líder: <b style="color:var(--text);">${esc(lider)}</b></span>
        <span class="text-dim">🛡️ Liga: <b style="color:var(--text);">${esc(liga)}</b></span>
      </div>
      <div style="flex:1; min-height:8px;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; font-family:var(--f-mono); font-size:13px; border-top:1px solid var(--line); padding-top:12px;">
        <span class="text-faint">Mín. trofeos</span><b style="color:var(--gold);">${reqTxt} 🏆</b>
      </div>
      ${(royaleApiOk || cwStatsOk) ? `<div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        ${royaleApiOk ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.royaleApi)}" target="_blank" rel="noopener">🌐 RoyaleAPI</a>` : ''}
        ${cwStatsOk  ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.cwStats)}" target="_blank" rel="noopener">📊 CWStats</a>` : ''}
      </div>` : ''}
      ${opts.mostrarVerClan ? `<a class="btn btn-primary btn-block" href="${esc(verClanHref)}" style="margin-top:12px;">Ver clan</a>` : ''}
      ${opts.mostrarUnirse ? `<button type="button" class="btn btn-ghost btn-block js-solicitar-unirme" data-clan="${esc(nombre)}" style="margin-top:12px;">Unirse a este clan</button>` : ''}
    </div>`;
}

/**
 * agregarTarjetaCuentasInactivasSiAdmin(grid)
 * Si hay un admin con sesión iniciada (esAdminLogueado()), agrega una 5ª
 * tarjeta junto a las 4 de clanes con las cuentas inactivas de la
 * Familia — visible SOLO para admins, aunque la página se visite desde el
 * mismo link que usa cualquier visitante (pedido del PDF de diseño,
 * 28-ago-2026). Conecta con el endpoint real del backend (34_Web_API.gs,
 * FASE 7, 29-ago-2026): 'webAdminCuentasInactivas' (GET autenticado, vía
 * apiGetAuth) — devuelve { ok, cuentas:[{tag,nombre,clan}] }.
 */
async function agregarTarjetaCuentasInactivasSiAdmin(grid){
  if (!grid || !esAdminLogueado()) return;
  try{
    const data = await apiGetAuth('webAdminCuentasInactivas');
    if (!data || data.error || !Array.isArray(data.cuentas) || !data.cuentas.length) return;
    const div = document.createElement('div');
    div.className = 'card card-hover clan-card';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span class="badge badge-purple">🚫 Cuentas inactivas</span>
      </div>
      <h3 style="font-size:20px;">Cuentas inactivas</h3>
      <div class="text-faint" style="font-family:var(--f-mono); font-size:12px; margin-top:4px;">Solo visible para administradores</div>
      <div style="flex:1; min-height:8px;"></div>
      <div style="font-family:var(--f-mono); font-size:13px; border-top:1px solid var(--line); padding-top:12px; color:var(--text-dim);">
        ${fmtNum(data.cuentas.length)} cuenta(s) inactiva(s)
      </div>`;
    grid.appendChild(div);
  }catch(err){
    // Defensivo: si falla la sesión o la llamada (token vencido, etc.),
    // no debe romper la carga de las 4 tarjetas de clanes para nadie.
  }
}

/**
 * chartCardHtml(titulo, icono, clanes, campo, formatFn)
 * Tarjeta con un mini gráfico de barras horizontales comparando los 4
 * clanes en un campo numérico de webClanInfo (miembros/donaciones/
 * trofeos/copas). Sin librerías externas — barras hechas con CSS puro,
 * consistentes con el resto del sitio (ver .chart-* en jugadores.html).
 */
function chartCardHtml(titulo, icono, clanes, campo, formatFn){
  const valores = clanes.map(c => Number(c[campo]) || 0);
  const max = Math.max(1, ...valores);
  const filas = clanes.map((c, i) => {
    const v   = valores[i];
    const pct = Math.max(2, Math.round((v / max) * 100));
    const txt = formatFn ? formatFn(v) : fmtNum(v);
    return `
      <div class="chart-row">
        <span class="chart-label">${esc(CLAN_LABELS_CORTOS[i] || c.nombre || '—')}</span>
        <span class="chart-track"><span class="chart-fill" style="width:${pct}%"></span></span>
        <span class="chart-val">${esc(txt)}</span>
      </div>`;
  }).join('');
  return `
    <div class="card chart-card">
      <div class="chart-title">${icono} ${esc(titulo)}</div>
      ${filas}
    </div>`;
}

/** Marca activo el link de navegación de la página actual (por data-page). */
function marcarNavActiva(){
  const actual = document.body.dataset.page;
  document.querySelectorAll('.nav .links a[data-page]').forEach(a => {
    if(a.dataset.page === actual) a.classList.add('active');
  });
  const toggle = document.getElementById('navToggle');
  const links  = document.querySelector('.nav .links');
  if(toggle && links){
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

/* =========================================================================
 * fitOneLine — textos que el diseño exige "una sola línea" (PDF de diseño,
 * 28-ago-2026, pedido repetido en varias secciones: hero, subtítulos de
 * "Nuestros Clanes", "Ingresos recientes", "Clanes", etc). En vez de dejar
 * que el texto se parta en 2 líneas en pantallas angostas o columnas flex
 * estrechas, se reduce el font-size del elemento (sin recortar texto, sin
 * "...", sin partir palabras) hasta que entra en una sola línea dentro de
 * su ancho disponible. Se aplica a cualquier <p> dentro de .sec-head y a
 * cualquier elemento marcado con el atributo data-fit-line.
 * ========================================================================= */
function fitOneLine(el){
  if (!el) return;
  el.style.whiteSpace = 'nowrap';
  if (!el.dataset.baseFontSize){
    el.dataset.baseFontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
  }
  let size = parseFloat(el.dataset.baseFontSize);
  el.style.fontSize = size + 'px';
  let guard = 0;
  while (el.scrollWidth > el.clientWidth + 1 && size > 9 && guard < 60){
    size -= 0.5;
    el.style.fontSize = size + 'px';
    guard++;
  }
}
function fitOneLineAll(){
  document.querySelectorAll('.sec-head p, [data-fit-line]').forEach(fitOneLine);
}
document.addEventListener('DOMContentLoaded', () => {
  marcarNavActiva();
  fitOneLineAll();
});
window.addEventListener('resize', () => {
  clearTimeout(window.__fitOneLineTimer);
  window.__fitOneLineTimer = setTimeout(fitOneLineAll, 120);
});
