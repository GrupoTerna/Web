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
// v3 (20-sep-2026): se añade assets/js/features/join-modal.js (B-5, lo cargan
// index.html y directorio.html) que había quedado fuera de CORE_ASSETS; mismo
// motivo: cambia CORE_ASSETS, así que se sube la versión.
// Tanda 2 (20-sep-2026, sin subir versión: CORE_ASSETS no cambia): la revalidación en segundo plano
// de los assets estáticos usa cache:'no-cache' (ver el fetch handler de más abajo).
// v4 (20-sep-2026): config.js cambió (WEB_MEMBER_TOKEN rotado) y los navegadores
// seguían sirviendo el config.js viejo desde este caché. Se sube la versión para
// que 'activate' borre v3, y el precaché de 'install' ahora ignora el caché HTTP
// del navegador (cache:'reload') para no volver a guardar una copia vieja.
// v5 (28-sep-2026): join-modal.js cambió (evento de GoatCounter al abrir el modal, Fase 4 del
// Consolidado de mejoras) y config.js suma un comentario (Fase 5). Se sube la versión para que
// 'activate' borre v4 y todos los visitantes reciban de inmediato los archivos nuevos.
// v6 (28-sep-2026): api.js cambió (opts.conSesion en apiGet, Fase 5b tanda A del Consolidado de
// mejoras). Se sube la versión para que 'activate' borre v5 y perfil.html/directorio.html (que ya
// pasan conSesion) no corran con un api.js viejo que lo ignore.
// v7 (28-sep-2026): torneos.html cambió (CORE_ASSETS de abajo) -- ahora enlaza el nombre de cada
// participante a perfil.html?tag=... cuando el backend manda el Tag, y manda conSesion:true al
// pedir webTorneos/webHistorialTorneos (Fase 5b tanda D, AVISO A9 de 34_Web_API.gs). Se sube la
// versión para que 'activate' borre v6 y los visitantes no se queden con la versión vieja de
// torneos.html (sin los links) servida desde este caché de forma indefinida.
// v8 (sin fecha ni motivo registrados): la versión se subió sin dejar comentario aquí ni entrada en CHANGELOG.md; probablemente
// con el cambio de index.html del 29-sep-2026 (cartas de 72x84), sin confirmar.
// v9 (30-sep-2026): index.html cambió (CORE_ASSETS) -- los enlaces de Google Fonts pasan de display=swap a display=optional
// (CLS del hero). Se sube la versión para que 'activate' borre v8 y nadie se quede con el index.html viejo.
// v10 (02-oct-2026): guerra.html cambió (CORE_ASSETS) -- se invierte el orden de gestionarTabsClan() y
// activarBarraScrollTablas() para bajar el TBT. Se sube la versión para que 'activate' borre v9.
// v11 (03-oct-2026): api.js cambió (CORE_ASSETS) -- apiGet() ahora detecta sesionVencida:true del backend, borra la sesión de admin
// guardada y muestra un aviso (sesión de admin vencida, A4/A6). Se sube la versión para que 'activate' borre v10 y perfil/directorio/
// torneos/guerra no sigan sirviendo el api.js viejo desde este caché.
// v12 (03-oct-2026): assets/styles.css cambió (CORE_ASSETS) -- el panel del menú móvil cerrado pasa a visibility:hidden para que sus
// enlaces dejen de recibir foco con Tab estando fuera de pantalla. Se sube la versión para que 'activate' borre v11.
// v13 (04-oct-2026): guerra.html cambió (CORE_ASSETS) -- "Actualizar" (y la recarga automática de cada minuto) devuelve el foco al botón tras
// rehabilitarlo, en vez de dejarlo en <body>. Se sube la versión para que 'activate' borre v12 y nadie siga con el guerra.html viejo.
// v14 (05-oct-2026): guerra.html cambió (CORE_ASSETS) -- celdas vacías cuando el jugador no estuvo en el clan, resultados congelados de
// la última guerra fuera de día de guerra, orden fijo de las tarjetas de clan, aviso de congelado y leyenda. Se sube la versión para que
// 'activate' borre v13 y nadie siga con el guerra.html viejo.
// v15 (05-oct-2026): tables.js cambió (CORE_ASSETS) -- P-12: la barra superior de scroll de las tablas (aria-hidden) ya no recibe foco con
// Tab (tabindex=-1). Si v14 aún no se había publicado, v14 y v15 salen juntos; igual se sube para no depender de eso.
// v16 (06-oct-2026): guerra.html cambió (CORE_ASSETS) -- la tabla del Log de Guerra pasa a encabezados en español (Puesto, Barcos, Trofeos).
// Se sube la versión para que 'activate' borre v15 y nadie siga con el guerra.html viejo.
// v17 (09-oct-2026): api.js (nueva apiGetEstaticoConEdad) y guerra.html cambiaron (CORE_ASSETS) -- si Apps Script no responde, guerra.html
// usa el último guerra.json publicado aunque tenga más de 3 h y avisa que son datos guardados (Fase 1 del plan "JSON estático como último
// recurso"). Se sube la versión para que 'activate' borre v16 y nadie siga con el api.js/guerra.html viejos.
// v18 (09-oct-2026): api.js (nueva apiGetConRespaldoEstatico) e index.html cambiaron (CORE_ASSETS) -- si Apps Script no responde, la portada
// usa el último home.json / guerra_top.json publicado aunque tenga más de 3 h, salvo que el respaldo local sea más nuevo (Fase 2 del plan
// "JSON estático como último recurso"). clan.html también cambió, pero no está en CORE_ASSETS: se renueva por la revalidación en segundo plano.
// Se sube la versión para que 'activate' borre v17 y nadie siga con el api.js/index.html viejos.
// v19 (09-oct-2026): util.js (nuevos fmtTresTiempos / tsApiDeDatos) e index.html cambiaron (CORE_ASSETS) -- la portada y clan.html muestran
// tres momentos: consulta de la página, publicación del JSON y consulta del bot a Supercell (si el dato la trae). Se sube la versión para
// que 'activate' borre v18 y nadie siga con el util.js/index.html viejos.
// v20 (09-oct-2026): util.js (nueva fmtTresTiemposDeResultado), directorio.html y comunidad.html cambiaron (CORE_ASSETS) -- si Apps Script no
// responde, el directorio (info de clanes y roster) y los ascensos de comunidad usan el último JSON publicado aunque tenga más de 3 h, salvo que
// el respaldo local sea más nuevo, y muestran los tres momentos de actualización (Fase 3 del plan "JSON estático como último recurso").
// Se sube la versión para que 'activate' borre v19 y nadie siga con el util.js/directorio.html/comunidad.html viejos.
// v21 (09-oct-2026): torneos.html cambió (CORE_ASSETS); perfil.html también cambió pero NO está en CORE_ASSETS -- si Apps Script no responde,
// torneos usa el último torneos.json publicado aunque tenga más de 3 h (salvo que el respaldo local sea más nuevo) y muestra los tres momentos de
// actualización, y perfil usa el último guerra_ctx.json igual (Fase 4 del plan "JSON estático como último recurso"). Se sube la versión para que
// 'activate' borre v20 y nadie siga con el torneos.html viejo.
const CACHE_NAME = 'terna-static-v21';

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
      .then(cache => cache.addAll(CORE_ASSETS.map(ruta => new Request(ruta, { cache: 'reload' }))))
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
      // 20-sep-2026 (tanda 2): cache:'no-cache' obliga a validar contra el servidor (If-None-Match/ETag)
      // en vez de aceptar la copia del caché HTTP del navegador (GitHub Pages: max-age=600). Si el
      // archivo no cambió, el servidor responde 304 (casi sin costo); si cambió, llega completo.
      const enRed = fetch(req, { cache: 'no-cache' }).then(res => {
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
