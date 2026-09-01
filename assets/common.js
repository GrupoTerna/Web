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
 * FORM_POSTULACION_URL: si quedara vacío, esa opción simplemente no se
 * muestra en vez de linkear a algo roto (ver el `if (FORM_POSTULACION_URL)`
 * en index.html/jugadores.html). Completado el 30-ago-2026 con el Google
 * Form real (contenedor: Google Sheet
 * 1-8es9UFC_kLC8U4DwBT5xKPLfo_nw7__6J9TyiDUW14).
 */
const WSP_GRUPO_URL = 'https://chat.whatsapp.com/HfaoDijjtkS4mwijpdczkU';
const DISCORD_URL = 'https://discord.gg/YKXtg93DVb';
const FORM_POSTULACION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScWHtEClZfhvV1-6zFv2QgrdUgv2pTc7A94JhuGHpB0UnL2LQ/viewform?usp=dialog';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

/**
 * fmtNum(n)
 * Formatea un número con coma para separar miles y punto para separar
 * decimales (ej. 14000 -> "14,000"), como pide el PDF de diseño
 * (28-ago-2026: "Todos los números deben llevar comas para separar miles
 * y puntos para separar decimales"). Se usa en TODO el sitio en vez de
 * toLocaleString('es-PE') (que hace lo contrario) o de mostrar el número
 * crudo. También sirve de definición real de fmtNum(), que guerra.html y
 * admin.html ya llamaban pero que no existía en ningún archivo — sin esta
 * función esas dos páginas rompían al renderizar (ReferenceError).
 */
function fmtNum(n){
  const num = Number(n);
  if (!isFinite(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * ordenClanIndex(nombre)
 * Devuelve la posición fija (0-3) de un clan dentro del orden oficial de
 * la Familia: Principal, Terna 2, Terna 3, Mini Ternas — el mismo orden
 * que ya usan CLAN_BADGES / CLAN_ROL_FAMILIA / CLAN_LABELS_CORTOS más
 * abajo. Se usa para reordenar cualquier lista de clanes que llegue del
 * backend en un orden distinto (ej. alfabético) antes de dibujarla: el
 * orden de los CLANES nunca debe ser alfabético (pedido repetido del PDF
 * de diseño — "el clan 2 sigue apareciendo primero, mientras que el clan
 * principal está apareciendo tercero").
 */
function ordenClanIndex(nombre){
  const n = String(nombre || '').toLowerCase();
  if (/mini/.test(n)) return 3;
  if (n.includes('3')) return 2;
  if (n.includes('2')) return 1;
  return 0; // clan principal (sin número / sin "mini")
}

/** Ordena in-place (y devuelve) un arreglo de clanes según ordenClanIndex. */
function ordenarClanes(clanes){
  return (clanes || []).slice().sort((a, b) => ordenClanIndex(a.nombre) - ordenClanIndex(b.nombre));
}

/**
 * urlValida(u)
 * Filtro defensivo: algunos links de RoyaleAPI/CWStats que manda el
 * backend todavía traen el placeholder sin reemplazar (ej.
 * "https://royaleapi.com/clan/LINK" — bug reportado en el PDF de diseño,
 * el dato real vive en la hoja de cálculo del backend y no se puede
 * corregir desde acá). Mientras no se corrija en el origen, es mejor no
 * mostrar el botón que mostrar un link roto.
 */
function urlValida(u){
  if (!u) return false;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return false;
  if (/\/LINK\/?$/i.test(s)) return false;
  return true;
}

/** true si hay un admin con sesión iniciada en este navegador (mismo
 * sessionStorage que usa apiGetAuth / admin.html). */
function esAdminLogueado(){
  return !!sessionStorage.getItem('terna_admin_token');
}

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
  let res;
  try{
    res = await fetch(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' });
  }catch(err){
    throw new Error(_esErrorDeRed(err) ? _mensajeErrorRed() : err.message);
  }
  const data = await res.json();
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
  let res;
  try{
    res = await fetch(url, {
      method:'POST',
      cache:'no-store',
      body: JSON.stringify(body||{})
    });
  }catch(err){
    throw new Error(_esErrorDeRed(err) ? _mensajeErrorRed() : err.message);
  }
  return await res.json();
}

/** GET autenticado (requiere sessionToken de admin en query string). */
async function apiGetAuth(accion, params){
  const token = sessionStorage.getItem('terna_admin_token');
  const qs = new URLSearchParams({ accion, sessionToken: token || '', ...(params||{}) });
  let res;
  try{
    res = await fetch(`${WEBAPP_URL}?${qs.toString()}`, { cache:'no-store' });
  }catch(err){
    throw new Error(_esErrorDeRed(err) ? _mensajeErrorRed() : err.message);
  }
  return await res.json();
}

/** Normaliza un tag de Clash Royale para mostrar/mandar: mayúsculas, con '#'. */
function normalizarTag(t){
  let v = String(t||'').trim().toUpperCase().replace(/^#/, '');
  return v ? '#' + v : '';
}

/**
 * NOMBRES_CARTAS_ES
 * FIX (31-ago-2026, pedido usuario — "los nombres se traen en inglés
 * porque así llegan a mi backend desde el api de Supercell, revisa si hay
 * alguna manera de obtener los nombres en español"): la API pública de
 * Supercell (developer.clashroyale.com) no tiene un parámetro de idioma —
 * siempre devuelve card.name en inglés, así que no hay forma de pedirle
 * el nombre en español al backend. La solución posible desde el front es
 * esta: un diccionario local EN→ES con los nombres oficiales en español
 * (LATAM) de Clash Royale. Cubre las cartas del juego a la fecha de este
 * cambio; una carta nueva que Supercell lance después seguirá mostrándose
 * en inglés hasta que se agregue acá (traducirNombreCarta ya cae de
 * vuelta al nombre original en ese caso, en vez de mostrar "undefined").
 */
const NOMBRES_CARTAS_ES = {
  'Knight':'Caballero','Archers':'Arqueras','Goblins':'Duendes','Giant':'Gigante',
  'P.E.K.K.A':'P.E.K.K.A','Minions':'Esbirros','Balloon':'Globo','Witch':'Bruja',
  'Barbarians':'Bárbaros','Golem':'Golem','Skeletons':'Esqueletos','Valkyrie':'Valquiria',
  'Skeleton Army':'Ejército Esquelético','Bomber':'Bombardero','Musketeer':'Mosquetera',
  'Baby Dragon':'Bebé Dragón','Prince':'Príncipe','Wizard':'Mago','Mini P.E.K.K.A':'Mini P.E.K.K.A',
  'Spear Goblins':'Duendes Lanceros','Giant Skeleton':'Gigante Esqueleto','Hog Rider':'Verdugo',
  'Minion Horde':'Horda de Esbirros','Ice Wizard':'Mago de Hielo','Royal Giant':'Gigante Real',
  'Guards':'Guardias','Princess':'Princesa','Dark Prince':'Príncipe Oscuro','Three Musketeers':'Tres Mosqueteras',
  'Lava Hound':'Perro de Lava','Ice Spirit':'Espíritu de Hielo','Fire Spirit':'Espíritu de Fuego',
  'Miner':'Minero','Sparky':'Chispi','Bowler':'Lanzador de Bolos','Lumberjack':'Leñador',
  'Battle Ram':'Ariete de Batalla','Inferno Dragon':'Dragón Infernal','Ice Golem':'Golem de Hielo',
  'Mega Minion':'Mega Esbirro','Dart Goblin':'Duende con Cerbatana','Goblin Gang':'Pandilla Goblin',
  'Electro Wizard':'Mago Eléctrico','Elite Barbarians':'Bárbaros de Élite','Hunter':'Cazador',
  'Executioner':'Verdugo (Hacha)','Bandit':'Bandida','Royal Recruits':'Reclutas Reales',
  'Night Witch':'Bruja Nocturna','Bats':'Murciélagos','Royal Ghost':'Fantasma Real',
  'Ram Rider':'Jinete del Ariete','Zappies':'Electrocutas','Rascals':'Pillos','Cannon Cart':'Carro Cañón',
  'Mega Knight':'Mega Caballero','Skeleton Barrel':'Barril de Esqueletos','Flying Machine':'Máquina Voladora',
  'Wall Breakers':'Rompemuros','Royal Hogs':'Verdugos Reales','Goblin Giant':'Gigante Duende',
  'Fisherman':'Pescador','Magic Archer':'Arquera Mágica','Electro Dragon':'Dragón Eléctrico',
  'Firecracker':'Petardera','Elixir Golem':'Golem de Elixir','Battle Healer':'Sanadora de Batalla',
  'Skeleton King':'Rey Esqueleto','Archer Queen':'Reina Arquera','Golden Knight':'Caballero Dorado',
  'Monk':'Monje','Skeleton Dragons':'Dragones Esqueleto','Mother Witch':'Madre Bruja',
  'Electro Spirit':'Espíritu Eléctrico','Electro Giant':'Gigante Eléctrico','Phoenix':'Fénix',
  'Little Prince':'Pequeño Príncipe','Goblin Demolisher':'Duende Demoledor','Suspicious Bush':'Arbusto Sospechoso',
  'Goblinstein':'Goblinstein','Rune Giant':'Gigante Rúnico',
  'Cannon':'Cañón','Tesla':'Tesla','Mortar':'Mortero','Inferno Tower':'Torre Infernal',
  'Bomb Tower':'Torre de Bombas','X-Bow':'Ballesta','Tombstone':'Lápida','Goblin Hut':'Choza Duende',
  'Barbarian Hut':'Choza Bárbara','Furnace':'Horno','Elixir Collector':'Colector de Elixir',
  'Goblin Cage':'Jaula Duende','Goblin Drill':'Perforadora Duende',
  'Fireball':'Bola de Fuego','Arrows':'Flechas','Rage':'Furia','Rocket':'Cohete','Goblin Barrel':'Barril de Duendes',
  'Freeze':'Congelar','Mirror':'Espejo','Lightning':'Rayo','Zap':'Impacto','Poison':'Veneno',
  'Graveyard':'Cementerio','The Log':'El Tronco','Tornado':'Tornado','Clone':'Clonar','Earthquake':'Terremoto',
  'Barbarian Barrel':'Barril de Bárbaro','Heal Spirit':'Espíritu Curativo','Giant Snowball':'Bola de Nieve Gigante',
  'Royal Delivery':'Entrega Real'
};
/** Traduce un nombre de carta EN->ES; si no está en el diccionario (carta
 * nueva todavía no agregada), devuelve el nombre original en vez de vacío. */
function traducirNombreCarta(nombreEn){
  const n = String(nombreEn || '').trim();
  return NOMBRES_CARTAS_ES[n] || n;
}

/* =========================================================================
 * Tarjetas y gráficos de clan — compartidos por index.html y jugadores.html
 * (28-ago-2026, pedido del usuario: mismas tarjetas en ambas páginas, sin
 * duplicar el HTML/CSS/JS en cada archivo).
 * ========================================================================= */

/** Insignia de rol, en el MISMO orden fijo de la Familia (ver
 * ordenClanIndex): Principal, Terna 2, Terna 3, Mini Ternas. Usada en
 * Inicio (opts.mostrarRol ausente/false). */
const CLAN_BADGES = [
  { cls: 'badge-gold',   label: '👑 Clan Principal' },
  { cls: 'badge-purple', label: '⚔️ Clan Terna 2' },
  { cls: 'badge-purple', label: '🛡️ Clan Terna 3' },
  { cls: 'badge-purple', label: '🌟 Mini Ternas' }
];
/** Insignia ÚNICA para la página Clanes (opts.mostrarRol = true): antes se
 * mostraban DOS insignias por tarjeta (la de CLAN_BADGES + una segunda con
 * "Cantera"/"Semillero"). El PDF de diseño pide un solo botón con el texto
 * exacto indicado — se reemplaza por completo, no se agrega encima. */
const CLAN_BADGES_ROL = [
  { cls: 'badge-gold',   label: '👑 Clan Principal' },
  { cls: 'badge-purple', label: 'Cantera (Clan 2)' },
  { cls: 'badge-purple', label: 'Cantera (Clan 3)' },
  { cls: 'badge-purple', label: 'Semillero (Clan Mini)' }
];
const CLAN_LABELS_CORTOS = ['Principal', 'Terna 2', 'Terna 3', 'Mini'];

/**
 * clanCardHtml(c, i, opts)
 * Arma el HTML de una tarjeta de clan a partir de un objeto de webClanInfo.
 *   opts.mostrarRol:    usa la insignia única CLAN_BADGES_ROL ("Cantera
 *     (Clan 2)"...) en vez de la insignia normal (solo en Clanes) — UNA
 *     sola insignia, nunca dos.
 *   opts.mostrarUnirse: agrega el botón "Unirse a este clan" (Inicio y Clanes).
 *   opts.mostrarVerClan: agrega el botón "Ver clan" (SOLO Inicio — a pedido
 *     del usuario, la página Clanes ya no lo lleva porque el visitante ya
 *     está ahí; en Inicio lleva directo a la pestaña de ese clan en el
 *     roster de jugadores.html).
 * Ya NO incluye la descripción del clan (retirada a pedido del usuario) —
 * solo RoyaleAPI/CWStats + (opcional) Ver clan + (opcional) Unirse.
 */
function clanCardHtml(c, i, opts){
  opts = opts || {};
  // En Clanes (mostrarRol) va UNA sola insignia con el texto exacto del
  // rol ("Cantera (Clan 2)"...); en Inicio va la insignia normal ("Clan
  // Terna 2"...). Nunca las dos juntas.
  const badge  = (opts.mostrarRol ? CLAN_BADGES_ROL[i] : CLAN_BADGES[i]) || { cls: 'badge-purple', label: 'Clan Terna' };
  const nombre = c.nombre || badge.label;
  const reqTxt = c.requerimiento > 0 ? fmtNum(c.requerimiento) + '+' : '—';
  const lider  = c.lider || '—';
  const liga   = c.liga  || '—';
  const verClanHref = `jugadores.html?clan=${encodeURIComponent(nombre)}#roster`;
  const royaleApiOk = urlValida(c.royaleApi);
  const cwStatsOk   = urlValida(c.cwStats);
  return `
    <div class="card card-hover clan-card" style="display:flex; flex-direction:column;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span class="badge ${badge.cls}">${esc(badge.label)}</span>
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
      ${(royaleApiOk || cwStatsOk) ? `<div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        ${royaleApiOk ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.royaleApi)}" target="_blank" rel="noopener">🌐 RoyaleAPI</a>` : ''}
        ${cwStatsOk  ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.cwStats)}" target="_blank" rel="noopener">📊 CWStats</a>` : ''}
      </div>` : ''}
      ${opts.mostrarVerClan ? `<a class="btn btn-primary btn-block" href="${esc(verClanHref)}" style="margin-top:12px;">Ver clan</a>` : ''}
      ${opts.mostrarUnirse ? `<button type="button" class="btn btn-ghost btn-block js-solicitar-unirme" data-clan="${esc(nombre)}" style="margin-top:12px;">Unirse a este clan</button>` : ''}
    </div>`;
}

/**
 * _renderCuentasInactivasOverlay(titulo, cuentas)
 * Overlay ligero ("Directorio" paralelo) con la lista de cuentas inactivas
 * de UN grupo (admins o general) — reutiliza las mismas clases CSS del
 * modal "Cómo unirte" (.join-modal-overlay/.join-modal) ya definidas en
 * index.html y jugadores.html, así que no hace falta CSS nuevo.
 * REGLA DURA (pedido del usuario): "en ningún caso se debe mostrar datos
 * sensibles (celulares)" — esta función solo pinta nombre, tag y clan;
 * nunca debe agregarse aquí el campo Celular aunque el backend llegara a
 * incluirlo en el objeto `cuentas`.
 */
function _renderCuentasInactivasOverlay(titulo, cuentas){
  let overlay = document.getElementById('inactivosOverlay');
  if (!overlay){
    overlay = document.createElement('div');
    overlay.id = 'inactivosOverlay';
    overlay.className = 'join-modal-overlay';
    overlay.innerHTML = `
      <div class="join-modal" style="max-width:520px;">
        <button type="button" class="join-modal-close" aria-label="Cerrar">&times;</button>
        <div class="eyebrow" id="inactivosOverlayTitulo">Cuentas inactivas</div>
        <div id="inactivosOverlayLista" style="margin-top:18px; max-height:50vh; overflow-y:auto;"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.join-modal-close').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  }
  overlay.querySelector('#inactivosOverlayTitulo').textContent = titulo;
  overlay.querySelector('#inactivosOverlayLista').innerHTML = cuentas.map(c => `
    <div class="miembro-row" style="cursor:default;">
      <div>
        <div class="mr-name">${esc(c.nombre || 'Sin nombre')}</div>
        <div class="mr-tag">${esc(c.tag || '—')}</div>
      </div>
      <span class="mr-rango">${esc(c.clan || '—')}</span>
    </div>`).join('') || '<div class="empty">No hay cuentas en este grupo.</div>';
  overlay.classList.add('open');
}

/**
 * agregarTarjetaCuentasInactivasSiAdmin(grid)
 * Si hay un admin con sesión iniciada (esAdminLogueado()), agrega DOS
 * tarjetas junto a las 4 de clanes con las cuentas inactivas de la
 * Familia — visibles SOLO para admins, aunque la página se visite desde
 * el mismo link que usa cualquier visitante (pedido del PDF de diseño,
 * 28-ago-2026; dividido en 2 tarjetas el 31-ago-2026: "eso se debe partir
 * en 2, una tarjeta para cuentas inactivas de admins y otra tarjeta para
 * cuentas inactivas en general"). Conecta con el endpoint real del
 * backend (34_Web_API.gs, FASE 7, 29-ago-2026): 'webAdminCuentasInactivas'
 * (GET autenticado, vía apiGetAuth) — devuelve { ok, cuentas:[{tag,nombre,
 * clan}] }.
 * OJO backend: el contrato actual de 'webAdminCuentasInactivas' no manda
 * ningún campo que distinga si una cuenta es de un Administrador — se lee
 * defensivamente `c.esAdmin` (booleano) por si el backend llega a
 * agregarlo; hasta entonces, TODAS las cuentas caen en la tarjeta
 * "general" y la de "administradores" queda en 0, en vez de adivinar mal
 * quién es admin. Cada tarjeta es clicable y abre su propio "Directorio"
 * paralelo de solo lectura (_renderCuentasInactivasOverlay) — nunca
 * muestra Celular ni ningún otro dato sensible, solo nombre/tag/clan.
 */
async function agregarTarjetaCuentasInactivasSiAdmin(grid){
  if (!grid || !esAdminLogueado()) return;
  try{
    const data = await apiGetAuth('webAdminCuentasInactivas');
    if (!data || data.error || !Array.isArray(data.cuentas) || !data.cuentas.length) return;
    const todas = data.cuentas;
    const cuentasAdmin   = todas.filter(c => !!c.esAdmin);
    const cuentasGeneral = todas.filter(c => !c.esAdmin);

    const tarjeta = (label, icono, cuentas, tituloOverlay) => {
      const div = document.createElement('div');
      div.className = 'card card-hover clan-card';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
          <span class="badge badge-purple">${icono} ${esc(label)}</span>
        </div>
        <h3 style="font-size:20px;">${esc(label)}</h3>
        <div class="text-faint" style="font-family:var(--f-mono); font-size:12px; margin-top:4px;">Solo visible para administradores</div>
        <div style="flex:1; min-height:8px;"></div>
        <div style="font-family:var(--f-mono); font-size:13px; border-top:1px solid var(--line); padding-top:12px; color:var(--text-dim);">
          ${fmtNum(cuentas.length)} cuenta(s) inactiva(s) · ver directorio →
        </div>`;
      div.addEventListener('click', () => _renderCuentasInactivasOverlay(tituloOverlay, cuentas));
      return div;
    };

    grid.appendChild(tarjeta('Inactivos (Admins)', '🛡️', cuentasAdmin, 'Cuentas inactivas — Administradores'));
    grid.appendChild(tarjeta('Inactivos (General)', '🚫', cuentasGeneral, 'Cuentas inactivas — General'));
  }catch(err){
    // Defensivo: si falla la sesión o la llamada (token vencido, etc.),
    // no debe romper la carga de las 4 tarjetas de clanes para nadie.
  }
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
    const txt = formatFn ? formatFn(v) : fmtNum(v);
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

/**
 * actualizarNavCta()
 * FIX (31-ago-2026, pedido usuario — "si ya se inició sesión no debería
 * seguir mostrando 'Acceder'"): el botón del nav (presente en TODAS las
 * páginas públicas: index/jugadores/guerra/torneos/comunidad) siempre
 * decía "Acceder" y apuntaba a admin.html, sin importar si el admin ya
 * había iniciado sesión ahí mismo. admin.html YA salta el formulario de
 * login y muestra el panel directo cuando hay un token guardado (ver, al
 * final de su script, `if(sessionStorage.getItem(SESSION_KEY))
 * mostrarPanel();`) — solo faltaba que el botón del nav lo reflejara en
 * vez de seguir mostrando "Acceder" como si nadie hubiera iniciado sesión.
 * Usa la MISMA clave que admin.html ('terna_admin_token', ahí declarada
 * como SESSION_KEY) vía sessionStorage — que persiste al navegar entre
 * páginas dentro de la MISMA pestaña (click en un link, atrás/adelante,
 * recargar), pero no se comparte con una pestaña nueva: eso es una
 * limitación conocida de sessionStorage (por diseño, para no dejar una
 * sesión de admin abierta "para siempre" en cualquier pestaña que se
 * abra), no un bug de esta función.
 */
const SESSION_KEY_ADMIN = 'terna_admin_token';
function actualizarNavCta(){
  const haySesion = !!sessionStorage.getItem(SESSION_KEY_ADMIN);
  document.querySelectorAll('.nav .links a.cta[data-page="admin"]').forEach(a => {
    a.textContent = haySesion ? 'Mi panel' : 'Acceder';
  });
}

/* =========================================================================
 * fitOneLine — textos que el diseño exige "una sola línea" (PDF de diseño,
 * 28-ago-2026, pedido repetido en varias secciones: hero, subtítulos de
 * "Nuestros Clanes", "Ingresos recientes", "Clanes", etc). En vez de dejar
 * que el texto se parta en 2 líneas en pantallas angostas o columnas flex
 * estrechas, se reduce el font-size del elemento (sin recortar texto, sin
 * "...", sin partir palabras) hasta que entra en una sola línea dentro de
 * su ancho disponible. Se aplica a cualquier <p> dentro de .sec-head y a
 * cualquier elemento marcado con el atributo data-fit-line.
 * ========================================================================= */
function fitOneLine(el){
  if (!el) return;
  el.style.whiteSpace = 'nowrap';
  if (!el.dataset.baseFontSize){
    el.dataset.baseFontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
  }
  let size = parseFloat(el.dataset.baseFontSize);
  el.style.fontSize = size + 'px';
  let guard = 0;
  while (el.scrollWidth > el.clientWidth + 1 && size > 9 && guard < 60){
    size -= 0.5;
    el.style.fontSize = size + 'px';
    guard++;
  }
}
function fitOneLineAll(){
  document.querySelectorAll('.sec-head p, [data-fit-line]').forEach(fitOneLine);
}
document.addEventListener('DOMContentLoaded', () => {
  marcarNavActiva();
  actualizarNavCta();
  fitOneLineAll();
});
window.addEventListener('resize', () => {
  clearTimeout(window.__fitOneLineTimer);
  window.__fitOneLineTimer = setTimeout(fitOneLineAll, 120);
});
