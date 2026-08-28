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
 * FORM_POSTULACION_URL queda vacío a propósito hasta tener un link real de
 * formulario — si está vacío, esa opción simplemente no se muestra en vez
 * de linkear a algo roto. Complétalo acá cuando exista.
 */
const WSP_GRUPO_URL = 'https://chat.whatsapp.com/HfaoDijjtkS4mwijpdczkU';
const DISCORD_URL = 'https://discord.gg/YKXtg93DVb';
const FORM_POSTULACION_URL = ''; // TODO: completar cuando exista el link del formulario

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
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

/** Insignia de rol + rol dentro de la familia, en el MISMO orden que ya
 * devuelve webClanInfo (CFG.TERNA_TAGS del backend: Principal, Terna 2,
 * Terna 3, Mini Ternas). "rolFamilia" solo se muestra en la página Clanes. */
const CLAN_BADGES = [
  { cls: 'badge-gold',   label: '👑 Clan Principal' },
  { cls: 'badge-purple', label: '⚔️ Clan Terna 2' },
  { cls: 'badge-purple', label: '🛡️ Clan Terna 3' },
  { cls: 'badge-purple', label: '🌟 Mini Ternas' }
];
const CLAN_ROL_FAMILIA  = ['', 'Cantera', 'Cantera', 'Semillero'];
const CLAN_LABELS_CORTOS = ['Principal', 'Terna 2', 'Terna 3', 'Mini'];

/**
 * clanCardHtml(c, i, opts)
 * Arma el HTML de una tarjeta de clan a partir de un objeto de webClanInfo.
 *   opts.mostrarRol:    agrega la etiqueta "Cantera"/"Semillero" (solo en Clanes).
 *   opts.mostrarUnirse: agrega el botón "Unirse a este clan" (Inicio y Clanes).
 * Ya NO incluye la descripción del clan (retirada a pedido del usuario) ni
 * ningún botón "Ver clan" — solo RoyaleAPI/CWStats + (opcional) Unirse.
 */
function clanCardHtml(c, i, opts){
  opts = opts || {};
  const badge  = CLAN_BADGES[i] || { cls: 'badge-purple', label: 'Clan Terna' };
  const nombre = c.nombre || badge.label;
  const reqTxt = c.requerimiento > 0 ? c.requerimiento.toLocaleString('es-PE') + '+' : '—';
  const lider  = c.lider || '—';
  const liga   = c.liga  || '—';
  const rol    = CLAN_ROL_FAMILIA[i] || '';
  return `
    <div class="card card-hover clan-card" style="display:flex; flex-direction:column;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span class="badge ${badge.cls}">${esc(badge.label)}</span>
        ${(opts.mostrarRol && rol) ? `<span class="badge badge-purple">${esc(rol)}</span>` : ''}
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
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        ${c.royaleApi ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.royaleApi)}" target="_blank" rel="noopener">🌐 RoyaleAPI</a>` : ''}
        ${c.cwStats  ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.cwStats)}" target="_blank" rel="noopener">📊 CWStats</a>` : ''}
      </div>
      ${opts.mostrarUnirse ? `<button type="button" class="btn btn-ghost btn-block js-solicitar-unirme" data-clan="${esc(nombre)}" style="margin-top:12px;">Unirse a este clan</button>` : ''}
    </div>`;
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
    const txt = formatFn ? formatFn(v) : v.toLocaleString('es-PE');
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
document.addEventListener('DOMContentLoaded', marcarNavActiva);
