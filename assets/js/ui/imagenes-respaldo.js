/* imagenes-respaldo.js — respaldo de las imágenes de la API de Supercell (19-oct-2026).
 * [→ Contexto_Base_Web.md §PF130]
 *
 * Orden: enlace de la API → copia en assets/Imágenes/<tipo>/API/ → copia en assets/Imágenes/cards/Fankit/.
 * Las insignias tienen dos carpetas dentro de badges/API (Maestrías e Insignias): se prueba una y luego la otra.
 * Un solo oyente de «error» en fase de captura cubre todas las <img> de la página, también las que
 * se crean con innerHTML después. Mientras quede una etapa por probar, frena el evento para que no
 * corra el onerror de la propia etiqueta (que suele ocultar la imagen); si ya no hay más etapas,
 * vuelve a disparar el error para que ese onerror trabaje como antes.
 *
 * Modo «local primero» (22-oct-2026, solo insignias de jugador; [→ Contexto_Base_Web.md §PF162]): las copias locales de
 * badges/API/ ya no traen el margen transparente del PNG original (PF161), pero el enlace de Supercell sí. Para que todas
 * las insignias se vean igual de grandes, perfil.html pide primero la copia local y deja el enlace remoto como último
 * recurso: ImagenesRespaldo.primero(enlace, esMaestria) (para armar HTML) o ImagenesRespaldo.aplicar(img, enlace, esMaestria)
 * (para una <img> que ya existe). Orden: carpeta propia (Maestrías o Insignias según el tipo) → la otra carpeta → enlace de
 * Supercell → onerror propio de la etiqueta. Una insignia sin copia local cuesta una petición fallida y se ve con su margen.
 *
 * Las copias `api` las sube la función imagenesApiAGithub() del Generador y se llaman igual que el
 * último tramo de la dirección. El índice de Fankit (assets/Im%C3%A1genes/cards/Fankit/indice.json) relaciona ese
 * nombre con el archivo de Fankit; solo existe para cartas (no hay insignias en Fankit). */

(function () {
  const RE_API = /^https:\/\/api-assets\.clashroyale\.com\/(cards|cardevolutions|cardheroes|playerbadges)\/\d+\/([A-Za-z0-9_-]+\.(?:png|webp|jpg))$/;
  const BASE = 'assets/Im%C3%A1genes/';
  const CARPETAS_API = {
    cards: [BASE + 'cards/API/'],
    cardevolutions: [BASE + 'cards/API/'],
    cardheroes: [BASE + 'cards/API/'],
    playerbadges: [BASE + 'badges/API/Maestr%C3%ADas/', BASE + 'badges/API/Insignias/']
  };
  const CARPETA_MAESTRIAS = BASE + 'badges/API/Maestr%C3%ADas/';
  const CARPETA_INSIGNIAS = BASE + 'badges/API/Insignias/';
  const INDICE_FANKIT = BASE + 'cards/Fankit/indice.json';
  const CARPETA_FANKIT = BASE + 'cards/Fankit/';

  let indicePromesa = null;
  function cargarIndiceFankit() {
    if (!indicePromesa) {
      indicePromesa = fetch(INDICE_FANKIT).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    }
    return indicePromesa;
  }

  function terminar(img) {
    img.dataset.respEtapa = 'fin';
    img.dispatchEvent(new Event('error')); // sin etapas: que corra el onerror propio de la etiqueta
  }

  function alFallar(ev) {
    const img = ev.target;
    if (!img || img.tagName !== 'IMG') return;
    const etapa = img.dataset.respEtapa || (img.dataset.respModo === 'local' ? 'local' : 'remoto');
    if (etapa === 'fin') return;

    if (etapa === 'local') { // modo «local primero»: la <img> arrancó con una copia local; falló
      ev.stopImmediatePropagation();
      const orden = (img.dataset.respOrden || '').split('|').filter(Boolean);
      const sigL = Number(img.dataset.respLocalIdx || 0) + 1;
      if (sigL < orden.length) { // queda otra carpeta local por probar
        img.dataset.respLocalIdx = String(sigL);
        img.src = orden[sigL];
        return;
      }
      img.dataset.respEtapa = 'remotoFinal';
      img.src = img.dataset.respRemoto;
      return;
    }
    if (etapa === 'remotoFinal') { // el enlace de Supercell tampoco cargó
      ev.stopImmediatePropagation();
      delete img.dataset.respModo; // fin del modo local: si el onerror propio pone otra imagen (la carta), esta sigue el orden normal
      terminar(img);
      return;
    }

    if (etapa === 'remoto') {
      const m = RE_API.exec(img.getAttribute('src') || '');
      if (!m) return; // no es una imagen de la API: no se toca
      img.dataset.respArchivo = m[2];
      img.dataset.respTipo = m[1];
      img.dataset.respEtapa = 'api';
      img.dataset.respApiIdx = '0';
      ev.stopImmediatePropagation();
      img.src = CARPETAS_API[m[1]][0] + m[2];
      return;
    }

    if (etapa === 'api') {
      ev.stopImmediatePropagation();
      const carpetas = CARPETAS_API[img.dataset.respTipo];
      const sig = Number(img.dataset.respApiIdx || 0) + 1;
      if (sig < carpetas.length) { // queda otra carpeta de la API por probar
        img.dataset.respApiIdx = String(sig);
        img.src = carpetas[sig] + img.dataset.respArchivo;
        return;
      }
      if (img.dataset.respTipo === 'playerbadges') { terminar(img); return; }
      img.dataset.respEtapa = 'fankit';
      const archivo = img.dataset.respArchivo;
      cargarIndiceFankit().then(function (indice) {
        const local = indice && indice[archivo];
        if (local) img.src = CARPETA_FANKIT + local;
        else terminar(img);
      });
      return;
    }

    // etapa 'fankit': la copia local tampoco cargó
    ev.stopImmediatePropagation();
    terminar(img);
  }

  /** Para una insignia de jugador (enlace playerbadges): devuelve la copia local con que debe arrancar la <img> y los atributos
   * data-* que activan el modo «local primero». Si el enlace no es de playerbadges, lo devuelve igual y sin atributos. */
  function planLocalPrimero(enlace, esMaestria) {
    const url = String(enlace || '');
    const m = RE_API.exec(url);
    if (!m || m[1] !== 'playerbadges') return { src: url, datos: null };
    const carpetas = esMaestria ? [CARPETA_MAESTRIAS, CARPETA_INSIGNIAS] : [CARPETA_INSIGNIAS, CARPETA_MAESTRIAS];
    const orden = carpetas.map(function (c) { return c + m[2]; });
    return { src: orden[0], datos: { respModo: 'local', respOrden: orden.join('|'), respLocalIdx: '0', respRemoto: url } };
  }

  function primero(enlace, esMaestria) {
    const plan = planLocalPrimero(enlace, esMaestria);
    if (!plan.datos) return { src: plan.src, attrs: '' };
    const esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    const attrs = ' data-resp-modo="local" data-resp-orden="' + esc(plan.datos.respOrden) + '" data-resp-local-idx="0" data-resp-remoto="' + esc(plan.datos.respRemoto) + '"';
    return { src: plan.src, attrs: attrs };
  }

  function aplicar(img, enlace, esMaestria) {
    ['respModo', 'respOrden', 'respLocalIdx', 'respRemoto', 'respEtapa', 'respArchivo', 'respTipo', 'respApiIdx'].forEach(function (k) { delete img.dataset[k]; });
    const plan = planLocalPrimero(enlace, esMaestria);
    if (plan.datos) Object.keys(plan.datos).forEach(function (k) { img.dataset[k] = plan.datos[k]; });
    img.src = plan.src;
  }

  window.ImagenesRespaldo = { primero: primero, aplicar: aplicar };
  document.addEventListener('error', alFallar, true);
})();
