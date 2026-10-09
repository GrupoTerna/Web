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
 *
 * FIX (B-11, 19-sep-2026): se agrega opts.ttlMs para poder pedir un TTL
 * distinto al de 60s por defecto, llamada por llamada, sin tocar el
 * comportamiento de las páginas que no lo pasen. Pensado para endpoints
 * semiestáticos (roster, clanes, torneos, perfil) que podrían tolerar un
 * caché más largo. Ya aplicado (5 min) en webClanInfo/webRoster
 * (directorio.html, index.html), webPerfil/webTorneosJugador (perfil.html)
 * y webTorneos/webHistorialTorneos (torneos.html).
 *
 * FIX (B4/B-10, 19-sep-2026): además del caché de sessionStorage (que se
 * pierde al cerrar la pestaña), cada respuesta exitosa que sí se cachea
 * (o sea, sin opts.sinCache — así webGuerraEnVivo de guerra.html queda
 * fuera, como pedía B-10) se respalda también en localStorage (ver
 * _backupLocalGuardar/_backupLocalLeer más abajo), sin TTL — es un
 * respaldo "por si la red falla", no un caché de frescura. Pasar
 * opts.staleIfError=true para que, si la petición a la red falla (sin
 * conexión, backend caído, etc.), en vez de lanzar el error se devuelva
 * ese respaldo (por viejo que sea) cuando exista; si no hay respaldo
 * guardado, el error se lanza igual que antes. Por defecto (sin pasar
 * staleIfError) el comportamiento no cambia (al 30-sep-2026 ya casi todas
 * las llamadas lo pasan: ver el último párrafo). apiGetUltimaActualizacion(accion, params)
 * expone la fecha de ese respaldo para que cada página pinte su propio
 * indicador ("Actualizado hace...", "Sin conexión, mostrando datos de
 * hace...") — (al 30-sep-2026 ya lo pintan varias páginas: ver el último
 * párrafo).
 *
 * CAMBIO (28-sep-2026, Fase 5b tanda A): opts.conSesion=true — si hay un admin
 * con sesión (localStorage 'terna_admin_token'), la petición lleva además su
 * sessionToken y sale sin caché ni respaldo (ver el comentario dentro de la
 * función). Hoy lo usan perfil.html (webPerfil) y directorio.html
 * (webCompararJugadores) para que el admin siga viendo el estado "Inactivo".
 *  Sin sesión, es igual que no pasarlo.
 *
 * CAMBIO (03-oct-2026, octava sesión, tanda 3, decisión del usuario: opción 2 de
 * "Sesión de admin vencida A4/A6"): si la petición salió con sessionToken (opts.conSesion
 * con admin logueado) y el backend responde sesionVencida:true (el token ya no es válido:
 * pasaron las 6 h, o se cerró la sesión en otro dispositivo), apiGet() borra
 * 'terna_admin_token' y 'terna_admin_info' del navegador, refresca el botón del nav
 * ("Mi panel" vuelve a "Acceder") y muestra un aviso breve (_mostrarAvisoSesionVencida)
 * pidiendo iniciar sesión en Admin. Se hace aquí, en un solo lugar, para las 4 páginas que
 * usan conSesion (perfil, directorio, torneos, guerra). Solo se borra la sesión si el token
 * guardado sigue siendo el que se mandó: si otra pestaña ya inició sesión de nuevo, no se
 * toca (ni se avisa). Los datos de esa misma respuesta son los de un visitante y se
 * devuelven tal cual. Un backend viejo que no manda el campo deja todo como estaba.
 *
 * ACTUALIZADO (30-sep-2026, solo comentario; el código no cambió). Estado real
 * de las llamadas, verificado contra el código de cada página:
 * - ttlMs 5 min + staleIfError: webClanInfo (index, directorio, guerra, clan),
 *   webRoster (directorio, clan), webAniversarios, webRankings y
 *   webEstadisticasCartas (index), webIngresosRecientes (directorio),
 *   webAscensosRecientes (comunidad), webPerfil, webTorneosJugador,
 *   webCofresJugador y webBattlelogJugador (perfil), webTorneos y
 *   webHistorialTorneos (torneos).
 * - ttlMs 2 min: webGuerraEnVivo en clan.html (con staleIfError; sin conSesion,
 *   así que cachea solo la versión pública), y en guerra.html webPronosticoGuerra
 *   (sin staleIfError) y webGuerraPuestosDia (con staleIfError); estas dos pasan a
 *   sinCache cuando el usuario pulsa Actualizar.
 * - Sin caché: webGuerraEnVivo en guerra.html (sinCache + conSesion).
 * - TTL por defecto (60 s), sin staleIfError: webGuerraLog (guerra).
 * - conSesion: perfil (webPerfil, webTorneosJugador, webCofresJugador,
 *   webBattlelogJugador), directorio (webCompararJugadores,
 *   webHistorialGuerraComparador, webIngresosRecientes), guerra (webGuerraEnVivo)
 *   y torneos (webTorneos, webHistorialTorneos). Con sesión de admin esas llamadas
 *   salen sin caché ni respaldo, así que el admin no tiene modo sin conexión en
 *   esas secciones.
 * - apiGetUltimaActualizacion(): la leen index, directorio, torneos, clan y
 *   perfil (en perfil, con sesión de admin el texto sale como "ahora mismo").
 */
const API_GET_CACHE_TTL_MS = 60000;

const LOCAL_BACKUP_PREFIX = 'terna_backup_';


/**
 * _backupLocalGuardar(cacheKey, data) / _backupLocalLeer(cacheKey)
 * Respaldo en localStorage para apiGet (ver FIX B4/B-10 arriba). Clave
 * distinta a la de sessionStorage (prefijo terna_backup_ vs terna_cache_)
 * para no mezclar ambos cachés. Sin TTL: la "frescura" para decidir si
 * usar este respaldo la define quien lee opts.staleIfError, no esta
 * función. try/catch en ambas — localStorage puede fallar por cuota
 * (5MB, cuidado con webRoster si llega a ser grande — ver nota original
 * de B-10) o estar inaccesible (modo privado de algunos navegadores); en
 * ningún caso debe romper la carga de la página.
 */
function _backupLocalGuardar(cacheKey, data){
  try{
    localStorage.setItem(LOCAL_BACKUP_PREFIX + cacheKey, JSON.stringify({ t: Date.now(), d: data }));
  }catch(e){ /* cuota llena o localStorage inaccesible: no debe romper la carga */ }
}

function _backupLocalLeer(cacheKey){
  try{
    return JSON.parse(localStorage.getItem(LOCAL_BACKUP_PREFIX + cacheKey) || 'null');
  }catch(e){ return null; }
}


/**
 * apiGetUltimaActualizacion(accion, params)
 * Fecha del último respaldo en localStorage guardado por apiGet() para
 * esa acción+params, o null si nunca se guardó ninguno. Pensado para que
 * una página pinte "Actualizado hace X" sin tener que duplicar la lógica
 * de armar la cacheKey. No dispara ninguna petición de red.
 * @returns {Date|null}
 */
function apiGetUltimaActualizacion(accion, params){
  const qs = new URLSearchParams({ accion, token: WEB_MEMBER_TOKEN, ...(params||{}) });
  const backup = _backupLocalLeer('terna_cache_' + qs.toString());
  return backup ? new Date(backup.t) : null;
}


/**
 * apiGetRespaldoUsado(accion, params)
 * NUEVO (09-oct-2026, Fase 5, pedido del usuario): si la ÚLTIMA llamada a apiGet(accion, params) devolvió el respaldo local porque el
 * servidor no respondió (opts.staleIfError), da la fecha en que se guardó ese respaldo; si devolvió una respuesta del servidor (o de su caché
 * de sesión), o nunca se llamó, da null. Sirve para que la página avise «⚠ Datos guardados» en vez de mostrar el dato viejo como si fuera nuevo.
 * Mismos `accion` y `params` que la llamada (sin sesión de admin: con sesión no hay respaldo). No dispara ninguna petición.
 * @returns {Date|null}
 */
function apiGetRespaldoUsado(accion, params){
  const qs = new URLSearchParams({ accion, token: WEB_MEMBER_TOKEN, ...(params || {}) });
  return _respaldoUsadoApiGet['terna_cache_' + qs.toString()] || null;
}


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
 *
 * REVISIÓN (pendiente #4 de B5.5, 19-sep-2026): con el dedup de
 * `_peticionesEnVuelo` ya en pie (ver más abajo), mostrarPanel() y casos
 * como torneos.html disparan menos peticiones DISTINTAS en paralelo que
 * antes — pero eso no cambia el diagnóstico de 13-sep de que Apps Script
 * pierde la entrega cuando compiten 2+ peticiones REALES a la vez contra
 * la misma Web App. Subir este número necesitaría volver a probar en
 * caliente contra el backend real (no disponible en este entorno), así
 * que se deja en 1 tal como estaba: es una decisión que requiere medir,
 * no un cambio de código que se pueda inferir del código fuente solo.
 */
const _MAX_PETICIONES_SIMULTANEAS = _leerLimiteSimultaneas();

/* D-13 (20-sep-2026): el valor por defecto SIGUE SIENDO 1 (ver diagnóstico de arriba); no cambia nada para
 * ningún visitante. Solo se agrega un interruptor de PRUEBA para poder medir contra el backend real sin
 * tocar código: en la consola del navegador, `localStorage.setItem('terna_max_simultaneas', '2')` y
 * recargar (`localStorage.removeItem('terna_max_simultaneas')` para volver a 1). Solo afecta a ese
 * navegador. Se acepta un entero de 1 a 4; cualquier otro valor, o si localStorage falla, usa 1. */
function _leerLimiteSimultaneas(){
  try{
    const n = parseInt(localStorage.getItem('terna_max_simultaneas'), 10);
    if (n >= 1 && n <= 4) return n;
  }catch(e){ /* localStorage inaccesible: valor por defecto */ }
  return 1;
}

let _peticionesActivas = 0;

const _colaPeticiones = [];


/* FIX (19-sep-2026, pedido usuario — los botones Jue–Dom de guerra.html se
 * quedaban en "Cargando…"): con _MAX_PETICIONES_SIMULTANEAS = 1, una
 * petición que el visitante acaba de pedir con un clic esperaba detrás de
 * TODO lo que ya estuviera en la cola (webGuerraEnVivo, que hoy es lenta,
 * más sus recargas automáticas y el resto de cargas de la página). Se agrega
 * el parámetro opcional `prioridad`: si es true, la tarea se coloca al
 * FRENTE de la cola (sigue sin saltarse la regla de 1 a la vez: no
 * interrumpe la que ya está en vuelo, solo pasa delante de las que esperan).
 * Sin `prioridad` el comportamiento es idéntico al anterior. */
function _encolarPeticion(tarea, prioridad){
  return new Promise(function(resolve, reject){
    function ejecutar(){
      _peticionesActivas++;
      tarea().then(resolve, reject).finally(function(){
        _peticionesActivas--;
        if (_colaPeticiones.length) _colaPeticiones.shift()();
      });
    }
    if (_peticionesActivas < _MAX_PETICIONES_SIMULTANEAS) ejecutar();
    else if (prioridad) _colaPeticiones.unshift(ejecutar);
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
async function _fetchYParsear(url, fetchOpts, prioridad, maxIntentos){
  return _encolarPeticion(function(){
    return _fetchYParsearInterno(url, fetchOpts, maxIntentos);
  }, !!prioridad);
}


/* CAMBIO (08-oct-2026): `maxIntentos` opcional (por defecto _MAX_INTENTOS_FETCH = 5). Las respuestas lentas y pesadas (webGuerraEnVivo, 15-35 s por intento) pasan 2: cada reintento lanza otra ejecución en Apps Script y 5 seguidos mantenían la cola ocupada ~3 min. */
async function _fetchYParsearInterno(url, fetchOpts, maxIntentos){
  const tope = maxIntentos >= 1 ? maxIntentos : _MAX_INTENTOS_FETCH;
  for (let intento = 1; intento <= tope; intento++){
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
      if (intento >= tope) throw new Error(_mensajeErrorRed(), { cause: parseErr });
      await new Promise(function(r){ setTimeout(r, _REINTENTO_ESPERA_MS * intento); });
    }
  }
}


/**
 * _peticionesEnVuelo
 * FIX (pendiente #4 de B5.5, 19-sep-2026): apiGet() no compartía las
 * peticiones EN VUELO entre llamadas concurrentes con la misma
 * acción+params+token. Esto ya se había parcheado puntualmente en
 * torneos.html (apiGetTorneosCompartido/_torneosEnVuelo, ver Lighthouse
 * 19-sep) porque cargarTorneos() y cargarSalonDeLaFama() arrancan a la vez
 * y piden los mismos 2 endpoints, duplicando las llamadas. Se generaliza
 * acá para toda la capa, así cualquier página con dos cargas concurrentes
 * al mismo endpoint queda cubierta sin tener que repetir el patrón
 * puntual en cada `.html` (torneos.html ya se simplificó para usar este
 * mecanismo en vez del suyo propio).
 *
 * Se comparte tanto si la respuesta es cacheable como si es
 * opts.sinCache (ej. dos clics casi simultáneos del botón "Actualizar" de
 * guerra.html): ahí no se cachea el RESULTADO en sessionStorage/
 * localStorage, pero sí tiene sentido no disparar dos peticiones
 * idénticas mientras la primera todavía no responde. La entrada se
 * limpia (éxito o error) apenas la promesa resuelve, así una llamada
 * posterior — ya sin nada en vuelo — sí dispara una petición nueva (ej.
 * un reintento tras un error).
 *
 * Límite conocido y aceptado: si dos llamadas concurrentes a la MISMA
 * acción+params difieren en opts.sinCache u opts.staleIfError, gana el
 * opts de la primera en llegar (es la que arma la promesa compartida).
 * Hoy ningún punto de llamada del sitio mezcla ambos modos para el mismo
 * endpoint al mismo tiempo, así que no es un caso real todavía.
 */
const _peticionesEnVuelo = {};
/* NUEVO (09-oct-2026, Fase 5, pedido del usuario): cacheKey -> Date del respaldo local que apiGet() devolvió EN SILENCIO la última vez que
 * el servidor no respondió (opts.staleIfError). Se borra al intentar la red de nuevo y se vuelve a llenar solo si otra vez falla y se usa el
 * respaldo. Así apiGet() sigue devolviendo solo el dato (ningún llamador cambia) y quien quiera avisar «Datos guardados» lo consulta con
 * apiGetRespaldoUsado(). Vive solo en memoria de la pestaña. */
const _respaldoUsadoApiGet = {};


/**
 * _manejarSesionVencida(tokenEnviado)
 * Llamada por apiGet() cuando el backend marca sesionVencida:true (ver CAMBIO del
 * 03-oct-2026 arriba). Borra la sesión de admin guardada SOLO si sigue siendo la que se
 * mandó en esa petición; si ya no lo es (otra pestaña inició sesión de nuevo, o una
 * respuesta anterior ya la borró), no hace nada y no vuelve a avisar. Nunca lanza.
 */
function _manejarSesionVencida(tokenEnviado){
  try{
    if (!tokenEnviado || localStorage.getItem('terna_admin_token') !== tokenEnviado) return;
    localStorage.removeItem('terna_admin_token');
    localStorage.removeItem('terna_admin_info');
  }catch(e){ return; /* localStorage inaccesible: no hay sesión que limpiar ni aviso útil */ }
  try{
    if (typeof actualizarNavCta === 'function') actualizarNavCta(); // auth.js: "Mi panel" -> "Acceder"
  }catch(e){ /* el nav no debe romper la carga */ }
  _mostrarAvisoSesionVencida();
}


/**
 * _mostrarAvisoSesionVencida()
 * Aviso corto fijo al pie de la página, con enlace a admin.html y botón para cerrarlo.
 * role="alert": un lector de pantalla lo anuncia al aparecer. No se oculta solo (un
 * aviso que desaparece con temporizador no da tiempo a leerlo). Solo un aviso a la vez.
 * Sin DOM (pruebas en Node sin document) no hace nada.
 */
function _mostrarAvisoSesionVencida(){
  if (typeof document === 'undefined' || !document.body) return;
  if (document.getElementById('avisoSesionVencida')) return;
  const aviso = document.createElement('div');
  aviso.id = 'avisoSesionVencida';
  aviso.setAttribute('role', 'alert');
  aviso.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:520px;margin:0 auto;padding:12px 14px;border-radius:10px;background:var(--bg-2,#090b12);color:var(--text,#fff);border:1px solid var(--line-gold,rgba(243,169,34,.45));box-shadow:0 8px 32px rgba(0,0,0,.5);font-size:14px;line-height:1.4;display:flex;gap:12px;align-items:center;';

  const texto = document.createElement('span');
  texto.style.cssText = 'flex:1;';
  texto.textContent = 'Tu sesión de administrador venció. Inicia sesión en Admin para volver a ver los datos de admin. ';
  const enlace = document.createElement('a');
  enlace.href = 'admin.html';
  enlace.textContent = 'Ir a Admin';
  enlace.style.cssText = 'color:var(--gold,#f3a922);text-decoration:underline;white-space:nowrap;';
  texto.appendChild(enlace);

  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', 'Cerrar aviso');
  cerrar.textContent = '\u00d7';
  cerrar.style.cssText = 'min-width:32px;min-height:32px;background:transparent;border:1px solid var(--line-strong,rgba(162,57,255,.45));border-radius:8px;color:inherit;font-size:18px;line-height:1;cursor:pointer;';
  cerrar.addEventListener('click', function(){ aviso.remove(); });

  aviso.appendChild(texto);
  aviso.appendChild(cerrar);
  document.body.appendChild(aviso);
}


async function apiGet(accion, params, opts){
  opts = opts || {};
  params = params || {};
  // CAMBIO (28-sep-2026, Fase 5b tanda A del Consolidado de mejoras): opts.conSesion
  // agrega el sessionToken del admin logueado (si hay uno) para que el backend
  // habilite los datos solo-admin de esa acción (hoy: el estado "Inactivo" de
  // webPerfil/webCompararJugadores). Con sesión la petición sale SIEMPRE fresca y
  // sin guardarse en sessionStorage ni en el respaldo de localStorage, para que
  // un dato solo-admin no quede en el navegador después de cerrar sesión. Sin
  // sesión (visitante) no cambia nada: mismo caché y mismos parámetros de antes.
  let tokenEnviado = null; // CAMBIO (03-oct-2026): para detectar sesionVencida en la respuesta (ver _manejarSesionVencida)
  if (opts.conSesion){
    const sessionToken = localStorage.getItem('terna_admin_token');
    if (sessionToken){
      tokenEnviado = sessionToken;
      params = { ...params, sessionToken };
      opts = { ...opts, sinCache: true, staleIfError: false };
    }
  }
  const qs = new URLSearchParams({ accion, token: WEB_MEMBER_TOKEN, ...params });
  const cacheKey = 'terna_cache_' + qs.toString();
  const ttlMs = (typeof opts.ttlMs === 'number' && opts.ttlMs >= 0) ? opts.ttlMs : API_GET_CACHE_TTL_MS;
  if(!opts.sinCache){
    try{
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if(cached && (Date.now() - cached.t) < ttlMs) return cached.d;
    }catch(e){ /* sessionStorage corrupto/inaccesible: seguir a la red sin romper */ }
  }

  if (_peticionesEnVuelo[cacheKey]) return _peticionesEnVuelo[cacheKey];

  const promesa = (async function(){
    let data;
    delete _respaldoUsadoApiGet[cacheKey]; // nuevo intento de red: lo anterior ya no vale
    try{
      data = await _fetchYParsear(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' }, !!opts.prioridad, opts.maxIntentos); // opts.prioridad: ver _encolarPeticion(); opts.maxIntentos: ver _fetchYParsearInterno()
    }catch(err){
      // FIX (B4/B-10): stale-if-error, solo si se pidió explícitamente.
      if(opts.staleIfError){
        const backup = _backupLocalLeer(cacheKey);
        if(backup){
          const t = new Date(backup.t);
          if(!isNaN(t.getTime())) _respaldoUsadoApiGet[cacheKey] = t; // NUEVO (09-oct-2026, Fase 5): ver apiGetRespaldoUsado()
          return backup.d;
        }
      }
      throw err;
    }
    if(data.error) throw new Error(data.error);
    if(tokenEnviado && data.sesionVencida === true) _manejarSesionVencida(tokenEnviado); // 03-oct-2026: el backend dice que ese token ya no vale
    if(!opts.sinCache){
      try{ sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: data })); }
      catch(e){ /* storage lleno: no debe romper la carga por no poder cachear */ }
      _backupLocalGuardar(cacheKey, data);
    }
    return data;
  })();

  _peticionesEnVuelo[cacheKey] = promesa;
  const limpiar = function(){ delete _peticionesEnVuelo[cacheKey]; };
  promesa.then(limpiar, limpiar);
  return promesa;
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


/**
 * apiGetEstatico(url, opts)
 * NUEVO (08-oct-2026): GET de un archivo JSON estático (hoy: guerra.json en la rama `data` de
 * GitHub, ver 39_Publicar_Guerra.gs). NO pasa por _encolarPeticion(): no es Apps Script, así que no
 * debe esperar detrás de sus peticiones ni ocupar su único lugar. Sin reintentos ni caché propia
 * (quien llama decide); aborta a los opts.timeoutMs (15 s por defecto) y lanza si no es 200 o no es JSON.
 */
async function apiGetEstatico(url, opts){
  opts = opts || {};
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, opts.timeoutMs || 15000) : null;
  try{
    const res = await fetch(url, { cache:'no-store', signal: ctrl ? ctrl.signal : undefined });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }finally{
    if(timer) clearTimeout(timer);
  }
}


/**
 * ESTATICO_EDAD_MAX_MS_DEFECTO / apiGetEstaticoConEdad(url, opts)
 * NUEVO (09-oct-2026, Fase 1 del plan "JSON estático como último recurso"): apiGetEstatico() solo
 * baja el archivo; cada página decidía sola si era "vigente" (menos de 3 h desde `_publicadoEn`)
 * y, si no lo era, lo TIRABA y pedía a Apps Script. Si Apps Script también fallaba (Sheets o la
 * cuota caídos, que es justo cuando el bot deja de republicar y el archivo envejece), la página
 * quedaba sin datos aunque el archivo viejo sí existía.
 *
 * Esta función hace la misma lectura pero devuelve también la edad, para que quien llama pueda
 * usar el archivo vigente de inmediato y guardar el viejo como ÚLTIMO RECURSO:
 *   { est, pub, vigente }  -> est: el JSON; pub: Date de `_publicadoEn`; vigente: pub más nuevo que edadMaxMs.
 *   null                   -> el JSON no trae `_publicadoEn` válido (no se sabe qué edad tiene: no se usa ni como último recurso).
 * Lanza lo mismo que apiGetEstatico() (sin archivo, sin red a GitHub, HTTP distinto de 200, JSON inválido).
 * NO valida el contenido (claves como `ctx`, `clanes`, etc.): eso sigue siendo de cada página, que
 * conoce su forma. El umbral de 3 h NO cambia: sigue sirviendo para preferir a Apps Script cuando
 * Sheets sí responde.
 * El nombre de la constante lleva el sufijo _DEFECTO a propósito: index/clan/comunidad/torneos ya
 * declaran su propio `const ESTATICO_EDAD_MAX_MS` en un <script> inline y una segunda declaración
 * con el mismo nombre en el ámbito global daría error de redeclaración.
 * @param {string} url
 * @param {{edadMaxMs?: number, timeoutMs?: number}} [opts]
 * @returns {Promise<{est: Object, pub: Date, vigente: boolean}|null>}
 */
const ESTATICO_EDAD_MAX_MS_DEFECTO = 3 * 60 * 60 * 1000;

async function apiGetEstaticoConEdad(url, opts){
  opts = opts || {};
  const edadMax = (typeof opts.edadMaxMs === 'number' && opts.edadMaxMs >= 0) ? opts.edadMaxMs : ESTATICO_EDAD_MAX_MS_DEFECTO;
  const est = await apiGetEstatico(url, opts);
  const pub = est && est._publicadoEn ? new Date(est._publicadoEn) : null;
  if(!pub || isNaN(pub.getTime())) return null;
  return { est, pub, vigente: (Date.now() - pub.getTime()) < edadMax };
}


/** Clave de caché de apiGet() para una llamada sin sesión; solo la usa apiGetConRespaldoEstatico(). */
function _claveCacheApiGet(accion, params){
  // Misma clave que arma apiGet() para una llamada SIN sesión (ver también apiGetUltimaActualizacion()).
  const qs = new URLSearchParams({ accion, token: WEB_MEMBER_TOKEN, ...(params || {}) });
  return 'terna_cache_' + qs.toString();
}

/**
 * apiGetConRespaldoEstatico(accion, params, opts, viejo)
 * NUEVO (09-oct-2026, Fase 2 del plan "JSON estático como último recurso"): pide `accion` a Apps
 * Script con apiGet() y, SOLO si falla, elige entre dos respaldos el MÁS NUEVO:
 *   - `viejo`: el JSON estático que la página ya bajó pero estaba vencido (más de 3 h), con su fecha de publicación;
 *   - el respaldo de localStorage de apiGet() (solo si opts.staleIfError, como siempre).
 * Por qué hace falta: index y clan piden con staleIfError, y apiGet() devuelve ese respaldo sin avisar
 * de cuándo es. Si el JSON vencido solo se probara cuando NO hay respaldo local, un respaldo de hace días
 * ganaría siempre a un JSON de hace unas horas; y si el JSON vencido tuviera prioridad fija, ganaría
 * a un respaldo local de hace 5 minutos. Aquí se compara y gana el más reciente. Si ninguno de los dos existe, el error de
 * Apps Script sube igual que antes.
 *
 * `viejo` = { data, desde } (data: la parte del JSON que usa esa acción, YA validada por la página; desde: Date de
 * `_publicadoEn`), o null/undefined si la página no tiene JSON vencido que ofrecer. Con `viejo` nulo esta
 * función es exactamente apiGet(accion, params, opts), con sus mismas opciones y su mismo respaldo.
 * NO es para llamadas con opts.conSesion (esas salen sin caché ni respaldo y no se usan con el JSON público).
 *
 * Devuelve { data, desde, origen }:
 *   origen 'apps-script'    -> respondió Apps Script (o su caché de sesión); desde: null.
 *   origen 'respaldo-local' -> Apps Script falló y el respaldo de localStorage es más nuevo (o igual) que `viejo`, o (sin `viejo`)
 *                              apiGet() lo devolvió en silencio (ver apiGetRespaldoUsado()); desde: Date en que se guardó.
 *                              Es lo mismo que daría apiGetUltimaActualizacion().
 *   origen 'estatico-viejo' -> Apps Script falló y gana `viejo`; desde: su fecha de publicación.
 * Cualquier error de apiGet() (de red, o un `error` de aplicación del backend) cuenta como "Apps Script falló"
 * cuando hay `viejo`: peor que mostrar datos guardados con su fecha es dejar la página sin datos.
 * @param {string} accion
 * @param {Object|null} params
 * @param {Object} [opts] las mismas de apiGet()
 * @param {{data: *, desde: Date}|null} [viejo]
 * @returns {Promise<{data: *, desde: Date|null, origen: string}>}
 */
async function apiGetConRespaldoEstatico(accion, params, opts, viejo){
  opts = opts || {};
  const desdeViejo = viejo && viejo.desde && typeof viejo.desde.getTime === 'function' ? viejo.desde.getTime() : NaN;
  if(!viejo || viejo.data == null || isNaN(desdeViejo)){
    const data = await apiGet(accion, params, opts);
    // CAMBIO (09-oct-2026, Fase 5): sin `viejo`, apiGet() puede haber devuelto su respaldo local sin avisar; ahora se informa como 'respaldo-local'.
    const guardado = apiGetRespaldoUsado(accion, params);
    if(guardado) return { data, desde: guardado, origen: 'respaldo-local' };
    return { data, desde: null, origen: 'apps-script' };
  }
  try{
    // staleIfError se apaga aquí para poder comparar el respaldo local con `viejo` en vez de que apiGet() lo devuelva a ciegas.
    const data = await apiGet(accion, params, { ...opts, staleIfError: false });
    return { data, desde: null, origen: 'apps-script' };
  }catch(err){
    const backup = opts.staleIfError ? _backupLocalLeer(_claveCacheApiGet(accion, params)) : null;
    if(backup && backup.d != null && typeof backup.t === 'number' && backup.t >= desdeViejo){
      return { data: backup.d, desde: new Date(backup.t), origen: 'respaldo-local' };
    }
    return { data: viejo.data, desde: viejo.desde, origen: 'estatico-viejo' };
  }
}
