/* =========================================================================
 * sw.js — Service Worker del portal Familia Terna.
 * MEJORA (18-sep-2026, propuesta y pedida por el usuario — "haz todas" las
 * mejoras sugeridas): el sitio ya tenía manifest.json (con íconos y modo
 * standalone) pero ningún Service Worker, así que varios navegadores no
 * ofrecían "Instalar app" y no había nada de caché para visitas repetidas
 * ni para cortes de conexión.
 *
 * Alcance deliberadamente conservador:
 *  - Solo intercepta peticiones GET del MISMO origen (this.location.origin).
 *    Nunca toca las llamadas al backend (Apps Script, otro origen) ni
 *    fuentes externas (Google Fonts, favicons de Google, etc.) — esos
 *    siguen yendo a la red tal cual, tal como ya lo esperan common.js y
 *    cada página (loaders/errores propios si el backend no responde).
 *  - Navegación entre páginas (mode:'navigate'): red primero (solo se
 *    guardan en caché las respuestas OK), caché como
 *    respaldo si no hay conexión, y como último recurso index.html (para
 *    no dejar una pantalla en blanco si se pide una página nunca visitada
 *    estando offline).
 *  - Assets estáticos (CSS/JS/imágenes propias): caché primero para que
 *    carguen al instante, refrescando el caché en segundo plano contra la
 *    red en cada visita (stale-while-revalidate) para no quedarse con una
 *    versión vieja indefinidamente.
 * ========================================================================= */

// v2 (18-sep-2026): cambió CORE_ASSETS (se añadieron los módulos de assets/js/**),
// así que se sube la versión para que 'activate' borre el caché v1.
// v3 (19-sep-2026): se añade assets/js/features/join-modal.js (B-5, lo cargan
// index.html y directorio.html) que había quedado fuera de CORE_ASSETS; mismo
// motivo: cambia CORE_ASSETS, así que se sube la versión.
const CACHE_NAME = 'terna-static-v3';

// Shell mínimo precacheado en la instalación — páginas públicas más
// visitadas y los assets que usa prácticamente toda la web. admin.html y
// sorteo.html (noindex, uso interno) no se precachean a propósito, pero
// igual quedan cacheadas de forma oportunista la primera vez que se
// visitan (ver el fetch handler de navegación más abajo).
const CORE_ASSETS = [
  'index.html',
  'directorio.html',
  'guerra.html',
  'torneos.html',
  'comunidad.html',
  '404.html',
  'manifest.json',
  'assets/styles.css',
  'assets/common.js',
  // Módulos que cargan todas las páginas (mismo orden que sus <script src>).
  'assets/js/core/config.js',
  'assets/js/util.js',
  'assets/js/core/api.js',
  'assets/js/core/auth.js',
  'assets/js/ui/tables.js',
  'assets/js/ui/filters.js',
  'assets/js/ui/effects.js',
  'assets/js/data/cards-es.js',
  'assets/js/data/clan-badges.js',
  'assets/js/features/clan-card.js',
  'assets/js/features/inactivos.js',
  'assets/js/features/timeline-svg.js',
  'assets/js/features/join-modal.js',
  'assets/img/logo-cuadrado.jpg',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => { /* si algún asset falla (ej. red lenta en el install), no bloquea el resto */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres => Promise.all(
      nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // nunca cachear POST (todas las llamadas al backend son POST, ver apiPost() en common.js)

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // deja pasar Apps Script, Google Fonts, favicons, etc. sin tocar

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Solo se guardan respuestas correctas: un 404/5xx cacheado se serviría después estando offline.
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then(cacheado => cacheado || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cacheado => {
      const enRed = fetch(req).then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
        }
        return res;
      }).catch(() => cacheado);
      return cacheado || enRed;
    })
  );
});
