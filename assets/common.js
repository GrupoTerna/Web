/* =========================================================================
 * common.js — configuración y helpers compartidos por todas las páginas.
 * COMPLETA estos 3 valores después de desplegar el Web App de Apps Script
 * (mismo backend que ya usa guerra.html — ver README-GITHUB.md):
 *   - WEBAPP_URL: la misma URL /exec del Web App.
 *   - WEB_MEMBER_TOKEN: debe coincidir EXACTO con la variable del mismo
 *     nombre en 34_Web_API.gs (backend).
 * El login de admin (admin.html) no necesita token acá: la contraseña se
 * escribe una sola vez en ADMIN_PANEL_PASSWORD dentro de 34_Web_API.gs.
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

/** Revela con fade-up los elementos .reveal cuando entran en viewport.
 * No afecta contenido inyectado por fetch (esos ya tienen su propia
 * animación de entrada vía .card en styles.css). Respeta
 * prefers-reduced-motion (la clase .reveal.in-view no hace nada si el
 * usuario pidió menos movimiento, porque la transición no existe en ese
 * media query). */
function initScrollReveal(){
  const els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  if(!('IntersectionObserver' in window)){
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold:0.15, rootMargin:'0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}
document.addEventListener('DOMContentLoaded', initScrollReveal);
