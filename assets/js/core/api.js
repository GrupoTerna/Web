/* api.js — capa de acceso al Web App de Apps Script: caché, cola, reintentos, apiGet/apiPost/apiGetAuth. Extraído de common.js. */



/**
 * apiGet(accion, params, opts)
 * GET a una acción pública del portal (usa WEB_MEMBER_TOKEN).
 * FIX (30-ago-2026, pedido usuario — reducir llamadas redundantes al Web
 * App, que tiene cuota de ejecuciones): cachea la respuesta en
 * sessionStorage por API_GET_CACHE_TTL_MS (60s) por defecto, con clave
 * accion+params. Así, navegar entre páginas (o volver a la misma) dentro
 * de esa ventana no vuelve a pegarle al backend por datos que en la
 * práctica no cambian segundo a segundo (roster, info de clanes, torneos,
 * rankings, etc). Pasar opts.sinCache=true para lo que sí necesita forzar
 * datos frescos siempre — ej. el botón "Actualizar" de guerra.html, la
 * única página realmente "en vivo" del portal.
 */
const API_GET_CACHE_TTL_MS = 60000;


/**
 * _esErrorDeRed(err)
 * FIX (30-ago-2026, pedido de revisión): true si `err` es un fallo de RED
 * (no pudo llegar al servidor) y no un error de la aplicación (ej. sesión
 * vencida, dato inválido). El navegador reporta esto de formas distintas
 * según el motor: Chrome/Edge lanzan "TypeError: Failed to fetch", Firefox
 * "TypeError: NetworkError when attempting to fetch resource", y Safari
 * "TypeError: Load failed" — los tres casos son en el fondo lo mismo (no
 * hubo respuesta del servidor: caído, sin internet, CORS, etc.), así que
 * se detectan todos con el mismo criterio: TypeError + alguna de esas
 * frases conocidas en el mensaje.
 */
function _esErrorDeRed(err){
  if(!err || err.name !== 'TypeError') return false;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
}


/**
 * _mensajeErrorRed()
 * Texto amigable para el visitante final en vez del mensaje técnico del
 * navegador ("Failed to fetch"). Mismo patrón de mensaje que ya usan los
 * distintos catch(err) del sitio (guerra.html, sorteo.html, admin.html,
 * etc.): "Error de conexión: ${err.message}" — acá solo se reemplaza QUÉ
 * va dentro de err.message cuando el fallo es de red, sin tocar esos
 * catch ya existentes.
 */
function _mensajeErrorRed(){
  return 'No pudimos conectar con el servidor. Intenta de nuevo en un momento.';
}


/**
 * _MAX_PETICIONES_SIMULTANEAS / _encolarPeticion(tarea)
 * FIX (09-sep-2026, pedido usuario — Network tab: mostrarPanel() dispara
 * 6-7 peticiones en paralelo al abrir el panel (cargarMisCuentas,
 * cargarTorneosHoy, cargarGanadoresTorneo, cargarParticipacionHoyGuerra,
 * cargarNomMultisAdmins, etc.), y una búsqueda de miembro justo después se
 * suma a ese mismo tropel — todas contra la MISMA Web App de Apps Script.
 * Con tantas peticiones simultáneas, Apps Script las encola internamente;
 * la que queda esperando de más termina con su respuesta lista recién
 * cuando el mecanismo de entrega anónima de Google
 * (script.googleusercontent.com/macros/echo) ya se dio por vencido — de
 * ahí el 404 aunque la ejecución de fondo haya terminado "Completada" sin
 * error (ver registro de Ejecuciones). El reintento de _fetchYParsear()
 * (FIX anterior, mismo día) ayudaba al síntoma pero EMPEORABA la causa: al
 * reintentar sumaba otra petición más a esa misma cola ya saturada.
 *
 * Fix real: limitar a _MAX_PETICIONES_SIMULTANEAS cuántas peticiones a la
 * Web App viajan EN PARALELO desde el navegador — el resto espera en una
 * cola FIFO simple y sale apenas se libera un lugar. Así Apps Script nunca
 * recibe más de esa cantidad a la vez, y ninguna espera lo suficiente como
 * para que el mecanismo de entrega la dé por perdida. Se aplica en
 * _fetchYParsear() (ver más abajo), así que cubre apiGet()/apiPost()/
 * apiGetAuth() sin tocar cada llamada de cada página una por una.
 *
 * FIX (13-sep-2026, pedido usuario — seguía fallando de forma intermitente
 * con 2 simultáneas: primero Historial de guerra, después Mis cuentas, en
 * llamadas distintas de la misma tanda de mostrarPanel()): se baja a 1
 * (100% en serie) para sacar del todo la competencia entre peticiones —
 * mostrarPanel() sigue disparando las mismas 6-7 llamadas de una, pero
 * ahora le llegan a Apps Script una por una en vez de de a 2, que es lo
 * que el propio diagnóstico de más arriba identifica como la causa real
 * del 404 en la entrega. El panel tarda un poco más en terminar de cargar
 * todas sus secciones, pero deja de competir consigo mismo.
 */
const _MAX_PETICIONES_SIMULTANEAS = 1;

let _peticionesActivas = 0;

const _colaPeticiones = [];


function _encolarPeticion(tarea){
  return new Promise(function(resolve, reject){
    function ejecutar(){
      _peticionesActivas++;
      tarea().then(resolve, reject).finally(function(){
        _peticionesActivas--;
        if (_colaPeticiones.length) _colaPeticiones.shift()();
      });
    }
    if (_peticionesActivas < _MAX_PETICIONES_SIMULTANEAS) ejecutar();
    else _colaPeticiones.push(ejecutar);
  });
}


/**
 * _REINTENTO_ESPERA_MS / _MAX_INTENTOS_FETCH
 * FIX (13-sep-2026, pedido usuario — "echo?user_content_key=...&lib=...
 * 404" al pedir Historial de guerra): con MAX_INTENTOS=2 y espera fija de
 * 1200ms alcanzaba para respuestas chicas (webPerfil, etc.) pero no para
 * respuestas grandes como webHistorialGuerraJugador (muchas semanas de
 * registros) — la entrega de Apps Script (redirect a
 * script.googleusercontent.com/macros/echo) falla ahí con más frecuencia,
 * y con un solo reintento no siempre alcanzaba a acertar. Se sube a 5
 * intentos en total (antes 4) y la espera crece en cada uno (1.2s, 2.4s,
 * 3.6s, 4.8s) en vez de ser siempre la misma, para no encimar reintentos
 * innecesarios en el caso común (donde el primer reintento ya alcanza) ni
 * rendirse demasiado rápido en el caso grande. Combinado con bajar
 * _MAX_PETICIONES_SIMULTANEAS a 1 (ver arriba), que ataca la causa de
 * fondo en vez de solo compensarla con más reintentos.
 */
const _REINTENTO_ESPERA_MS = 1200;

const _MAX_INTENTOS_FETCH = 5;


/**
 * _fetchYParsear(url, fetchOpts)
 * FIX (09-sep-2026, pedido usuario — "Error de conexión: Unexpected token
 * '<', "<!DOCTYPE "... is not valid JSON" buscando un Tag sin registro en
 * el Directorio, ej. #R09228V): se revisó el registro de Ejecuciones de
 * Apps Script para esa búsqueda puntual — la ejecución termina
 * "Completada" en un par de segundos, sin ningún error. O sea, el backend
 * (_webPerfilJugadorSinRegistro()/_webAdminBuscarMiembro(), 34_Web_API.gs)
 * SÍ hace bien su trabajo; el corte pasa DESPUÉS, entregando la respuesta
 * — ver docblock de _encolarPeticion() arriba para la causa completa
 * (cola de peticiones simultáneas contra la misma Web App).
 *
 * Con _encolarPeticion() ya limitando la concurrencia real, este
 * reintento queda como red de seguridad extra ante algún caso residual:
 * si la respuesta no es JSON válido, se espera un momento y se repite la
 * MISMA petición una vez más (también encolada, nunca se salta la cola).
 * Solo reintenta ante error de PARSEO (HTML en vez de JSON); un error de
 * red real (fetch() que ni siquiera resuelve) sigue sin reintentarse acá,
 * igual que antes.
 * @param {string} url
 * @param {RequestInit} [fetchOpts]
 * @returns {Promise<Object>} JSON ya parseado.
 */
async function _fetchYParsear(url, fetchOpts){
  return _encolarPeticion(function(){
    return _fetchYParsearInterno(url, fetchOpts);
  });
}


async function _fetchYParsearInterno(url, fetchOpts){
  for (let intento = 1; intento <= _MAX_INTENTOS_FETCH; intento++){
    let res;
    try{
      res = await fetch(url, fetchOpts);
    }catch(err){
      // FIX (B-15, 18-sep-2026): se adjunta `cause` al relanzar — antes se
      // perdía el error original (stack/mensaje real de fetch), quedaba
      // solo el mensaje genérico de _mensajeErrorRed(). Mismo mensaje al
      // usuario, mejor información para depurar.
      throw new Error(_esErrorDeRed(err) ? _mensajeErrorRed() : err.message, { cause: err });
    }
    try{
      return await res.json();
    }catch(parseErr){
      if (intento >= _MAX_INTENTOS_FETCH) throw new Error(_mensajeErrorRed(), { cause: parseErr });
      await new Promise(function(r){ setTimeout(r, _REINTENTO_ESPERA_MS * intento); });
    }
  }
}


async function apiGet(accion, params, opts){
  opts = opts || {};
  const qs = new URLSearchParams({ accion, token: WEB_MEMBER_TOKEN, ...(params||{}) });
  const cacheKey = 'terna_cache_' + qs.toString();
  if(!opts.sinCache){
    try{
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if(cached && (Date.now() - cached.t) < API_GET_CACHE_TTL_MS) return cached.d;
    }catch(e){ /* sessionStorage corrupto/inaccesible: seguir a la red sin romper */ }
  }
  const data = await _fetchYParsear(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' });
  if(data.error) throw new Error(data.error);
  if(!opts.sinCache){
    try{ sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: data })); }
    catch(e){ /* storage lleno: no debe romper la carga por no poder cachear */ }
  }
  return data;
}


/** POST a una acción del portal (login / acciones de admin). */
async function apiPost(accion, body){
  const url = `${WEBAPP_URL}?accion=${encodeURIComponent(accion)}`;
  return await _fetchYParsear(url, {
    method:'POST',
    cache:'no-store',
    body: JSON.stringify(body||{})
  });
}


/** GET autenticado (requiere sessionToken de admin en query string). */
async function apiGetAuth(accion, params){
  const token = localStorage.getItem('terna_admin_token');
  const qs = new URLSearchParams({ accion, sessionToken: token || '', ...(params||{}) });
  return await _fetchYParsear(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' });
}
