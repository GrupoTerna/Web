/* common.js — orquestador final: se carga DESPUÉS de todos los módulos en assets/js/
 * (config, util, api, auth, ui/*, data/*, features/*). Solo queda acá el arranque que
 * corre una vez cargada toda la página: nav activa, CTA de admin, ajuste de texto a una
 * línea, y el registro del Service Worker. (18-sep-2026: separado del monolito original
 * de 74 KB para que cada responsabilidad viva en su propio archivo — ver assets/js/.) */

document.addEventListener('DOMContentLoaded', () => {
  marcarNavActiva();
  actualizarNavCta();
  fitOneLineAll();
});
window.addEventListener('resize', () => {
  clearTimeout(window.__fitOneLineTimer);
  window.__fitOneLineTimer = setTimeout(fitOneLineAll, 120);
});

/* =========================================================================
 * Registro del Service Worker (18-sep-2026, mejora propuesta y pedida por
 * el usuario): common.js lo cargan TODAS las páginas del sitio, así que es
 * el único lugar que hace falta tocar para que sw.js quede activo en todo
 * el portal. Ruta relativa ('sw.js', sin '/' inicial) a propósito: el sitio
 * vive en un subpath de GitHub Pages (https://grupoterna.github.io/Web/),
 * no en la raíz del dominio, y una ruta absoluta apuntaría mal. Registrado
 * recién en window 'load' para no competir por ancho de banda con la carga
 * inicial de la página. Ver sw.js para el detalle de qué cachea.
 * ========================================================================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin service worker el sitio sigue funcionando igual, solo sin caché offline */ });
  });
}
