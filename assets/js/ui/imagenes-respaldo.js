/* imagenes-respaldo.js — respaldo de las imágenes de la API de Supercell (19-oct-2026).
 * [→ Contexto_Base_Web.md §PF130]
 *
 * Orden: enlace de la API → copia en assets/<tipo>/api/ → copia en assets/cards/Fankit/.
 * Un solo oyente de «error» en fase de captura cubre todas las <img> de la página, también las que
 * se crean con innerHTML después. Mientras quede una etapa por probar, frena el evento para que no
 * corra el onerror de la propia etiqueta (que suele ocultar la imagen); si ya no hay más etapas,
 * vuelve a disparar el error para que ese onerror trabaje como antes.
 *
 * Las copias `api` las sube la función imagenesApiAGithub() del Generador y se llaman igual que el
 * último tramo de la dirección. El índice de Fankit (assets/cards/Fankit/indice.json) relaciona ese
 * nombre con el archivo de Fankit; solo existe para cartas (no hay insignias en Fankit). */

(function () {
  const RE_API = /^https:\/\/api-assets\.clashroyale\.com\/(cards|cardevolutions|cardheroes|playerbadges)\/\d+\/([A-Za-z0-9_-]+\.(?:png|webp|jpg))$/;
  const CARPETA_API = {
    cards: 'assets/cards/api/',
    cardevolutions: 'assets/cards/api/',
    cardheroes: 'assets/cards/api/',
    playerbadges: 'assets/playerbadges/api/'
  };
  const INDICE_FANKIT = 'assets/cards/Fankit/indice.json';
  const CARPETA_FANKIT = 'assets/cards/Fankit/';

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
    const etapa = img.dataset.respEtapa || 'remoto';
    if (etapa === 'fin') return;

    if (etapa === 'remoto') {
      const m = RE_API.exec(img.getAttribute('src') || '');
      if (!m) return; // no es una imagen de la API: no se toca
      img.dataset.respArchivo = m[2];
      img.dataset.respTipo = m[1];
      img.dataset.respEtapa = 'api';
      ev.stopImmediatePropagation();
      img.src = CARPETA_API[m[1]] + m[2];
      return;
    }

    if (etapa === 'api') {
      ev.stopImmediatePropagation();
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

  document.addEventListener('error', alFallar, true);
})();
