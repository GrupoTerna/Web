/* join-modal.js — modal "Cómo unirte", compartido entre index.html y
 * directorio.html.
 *
 * FIX (B-5, 18-sep-2026): antes vivía duplicado carácter por carácter en
 * ambas páginas (el propio código lo admitía en un comentario). La mejora
 * de accesibilidad del 18-sep (role="dialog", aria-modal, trampa de foco,
 * devolución de foco al cerrar) solo se había aplicado en index.html,
 * dejando directorio.html sin esas mejoras (hallazgo 5 del Bloque B). Se
 * extrae acá la versión accesible y se aplica a ambas.
 *
 * Depende de:
 *   - WSP_GRUPO_URL, DISCORD_URL, FORM_POSTULACION_URL (assets/js/core/config.js)
 *   - esc() (assets/js/util.js)
 *   - el markup de #joinModalOverlay con role="dialog" aria-modal="true"
 *     aria-labelledby="joinModalTitle" aria-hidden="true", el contenedor
 *     interno #joinModal, el botón #joinModalClose, el <span id="joinModalClan">,
 *     el <h3 id="joinModalTitle"> y el contenedor #joinModalOptions
 *     (ver index.html/directorio.html).
 * Cargarlo después de config.js/util.js y después del markup del modal en
 * el HTML (mismo lugar donde vivía la lógica antes en cada página). */

// Guarda qué elemento tenía el foco antes de abrir el modal, para
// devolvérselo al cerrar (si no se pasa uno explícito, se usa
// document.activeElement — ej. al abrirse por teclado).
let joinModalTriggerEl = null;

function abrirModalUnirse(nombreClan, triggerEl){
  document.getElementById('joinModalClan').textContent = nombreClan || 'un clan';
  const opciones = [
    { href: WSP_GRUPO_URL, icon: '📱', label: 'WhatsApp', sub: 'Canal principal — Grupo informativo', primary: true },
    { href: DISCORD_URL,   icon: '🎧', label: 'Discord',  sub: 'Canal de comunidad y voz' }
  ];
  if (FORM_POSTULACION_URL) {
    opciones.push({ href: FORM_POSTULACION_URL, icon: '📝', label: 'Formulario', sub: 'Postulación formal' });
  }
  document.getElementById('joinModalOptions').innerHTML = opciones.map(o => `
    <a class="join-modal-option${o.primary ? ' primary' : ''}" href="${esc(o.href)}" target="_blank" rel="noopener">
      <span class="opt-icon">${o.icon}</span>
      <span><span class="opt-label">${esc(o.label)}</span><span class="opt-sub">${esc(o.sub)}</span></span>
    </a>`).join('');
  joinModalTriggerEl = triggerEl || document.activeElement;
  const overlay = document.getElementById('joinModalOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.getElementById('joinModalClose').focus();
}

function cerrarModalUnirse(){
  const overlay = document.getElementById('joinModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  if (joinModalTriggerEl && typeof joinModalTriggerEl.focus === 'function') joinModalTriggerEl.focus();
  joinModalTriggerEl = null;
}

function initJoinModal(){
  document.getElementById('joinModalClose').addEventListener('click', cerrarModalUnirse);
  document.getElementById('joinModalOverlay').addEventListener('click', e => {
    if (e.target.id === 'joinModalOverlay') cerrarModalUnirse();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModalUnirse(); });
  // Trampa de foco: mientras el modal está abierto, Tab/Shift+Tab circula
  // solo entre sus elementos enfocables (botón cerrar + links de opciones)
  // en vez de escaparse hacia el contenido de fondo.
  document.getElementById('joinModalOverlay').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focosables = document.getElementById('joinModal').querySelectorAll('button, a[href]');
    if (!focosables.length) return;
    const primero = focosables[0];
    const ultimo = focosables[focosables.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });
}
initJoinModal();
