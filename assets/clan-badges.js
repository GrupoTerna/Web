/* clan-badges.js — íconos de RoyaleAPI/CWStats e insignias de clan. Extraído de common.js. */



/**
 * ICONO_ROYALEAPI / ICONO_CWSTATS
 * FIX (31-ago-2026, pedido usuario — "de preferencia muestra sus propios
 * iconos en vez de iconos genéricos"): reemplaza el emoji 🌐/📊 que se
 * usaba como placeholder en todos los botones de RoyaleAPI/CWStats
 * (tarjetas de clan, ingresos recientes de index.html y guerra.html, y
 * perfil del jugador) por el logo oficial de cada servicio. URLs dadas
 * directamente por el usuario en el PDF de diseño.
 */
/* FIX (16-sep-2026 v8, pedido usuario — rendimiento, sugerencia propia
   aceptada: "los íconos de RoyaleAPI/CWStats no tienen loading=lazy"):
   estos <img> se repiten en cada tarjeta con esos links (cada miembro de
   Ingresos Recientes, cada tarjeta de clan) — sin loading="lazy" el
   navegador dispara la petición de red de TODAS de una, aunque estén
   fuera de la pantalla visible. decoding="async" además evita que decodificar
   cada imagen bloquee el hilo principal durante el pintado inicial. */
const ICONO_ROYALEAPI = '<img src="https://cdn.royaleapi.com/static/img/branding/royaleapi-logo-128.png?t=feb800c3c" alt="" width="14" height="14" loading="lazy" decoding="async" style="vertical-align:-2px; margin-right:5px; border-radius:3px;">';

const ICONO_CWSTATS = '<img src="https://assets.cwstats.com/icons/logo.webp" alt="" width="14" height="14" loading="lazy" decoding="async" style="vertical-align:-2px; margin-right:5px; border-radius:3px;">';


/**
 * BADGE_NOMBRES_POR_ID / iconoBadgeClanHtml(badgeId)
 * FIX (16-sep-2026, pedido usuario — "hay imágenes de clan, busqué en
 * clans/currentriverrace pero solo dan 'badgeId', no un link [...] el
 * sistema lo debería enviar cuando consulta el endpoint clans o
 * currentriverrace, ya que se podría cambiar el ícono desde el juego"):
 *
 * La API oficial de Supercell SOLO devuelve `badgeId` (numérico, ej.
 * 16000028) — nunca una URL de imagen, no hay endpoint oficial de assets.
 * Para resolverlo a un ícono hace falta una tabla local badgeId -> nombre
 * de archivo. BADGE_NOMBRES_POR_ID es exactamente esa tabla: un array
 * indexado por `badgeId - BADGE_ID_BASE` (180 badges, IDs contiguos de
 * 16000000 a 16000179 a la fecha de este fix — confirmado descargando
 * https://raw.githubusercontent.com/RoyaleAPI/cr-api-data/master/docs/json/alliance_badges.json,
 * el dataset estático que usa RoyaleAPI.com para lo mismo). Ej.: 16000028
 * -> índice 28 -> 'Skull_05', que es justo el badge que compartiste de
 * GrupoXTerna™2/™3/Mini✕Ternas™.
 *
 * NUNCA se hotlinkea la imagen directo desde GitHub — el propio repo pide
 * "please clone this repo and not use these assets directly as if it's a
 * CDN" (RoyaleAPI/cr-api-assets). En su lugar, los PNG se auto-hospedan en
 * assets/badges/{nombre}.png dentro de este mismo sitio (ver el PNG de
 * Skull_05 adjunto en esta respuesta — cópialo a esa ruta en el repo).
 * Si Supercell agrega un badge nuevo que todavía no está en este array, o
 * si el PNG de un badge conocido aún no se subió a assets/badges/, el
 * <img> simplemente no se pinta (fallback silencioso a solo texto) — no
 * hay forma de que un ícono roto llegue a mostrarse.
 *
 * PENDIENTE DE BACKEND (no se puede resolver solo desde el frontend): el
 * backend (Base.md, 34_Web_API.gs) debe reenviar `badgeId` tal cual lo
 * entrega Supercell (sin transformarlo) en la respuesta de CUALQUIER
 * endpoint que arme datos de un clan a partir de /clans/{tag} o
 * /clans/{tag}/currentriverrace — hoy eso es como mínimo webClanInfo (las
 * 4 tarjetas de clan de directorio.html/index.html) y lo que arme cada
 * fila de roster/ingresos si también se quiere el badge por miembro. Ya
 * que el ícono se puede cambiar desde el juego en cualquier momento, NO
 * se debe cachear/guardar el nombre resuelto en la hoja de cálculo — el
 * backend solo pasa el `badgeId` crudo tal cual llega de Supercell en
 * cada consulta, y esta función (frontend) lo resuelve en el momento.
 */
const BADGE_ID_BASE = 16000000;

const BADGE_NOMBRES_POR_ID = [
  'Flame_01', 'Flame_02', 'Flame_03', 'Flame_04', 'Sword_01', 'Sword_02', 'Sword_03', 'Sword_04',
  'Bolt_01', 'Bolt_02', 'Bolt_03', 'Bolt_04', 'Crown_01', 'Crown_02', 'Crown_03', 'Crown_04',
  'Arrow_01', 'Arrow_02', 'Arrow_03', 'Arrow_04', 'Diamond_Star_01', 'Diamond_Star_02',
  'Diamond_Star_03', 'Diamond_Star_04', 'Skull_01', 'Skull_02', 'Skull_03', 'Skull_04', 'Skull_05',
  'Skull_06', 'Moon_01', 'Moon_02', 'Moon_03', 'Pine_01', 'Pine_02', 'Pine_03',
  'Traditional_Star_01', 'Traditional_Star_02', 'Traditional_Star_03', 'Traditional_Star_04',
  'Traditional_Star_05', 'Traditional_Star_06', 'Star_Shine_01', 'Star_Shine_02', 'Star_Shine_03',
  'Diamond_01', 'Diamond_02', 'Diamond_03', 'flag_a_01', 'flag_a_02', 'flag_a_03', 'flag_b_01',
  'flag_b_02', 'flag_b_03', 'flag_c_03', 'flag_c_04', 'flag_c_05', 'flag_c_06', 'flag_c_07',
  'flag_c_08', 'flag_d_01', 'flag_d_02', 'flag_d_03', 'flag_d_04', 'flag_d_05', 'flag_d_06',
  'flag_f_01', 'flag_f_02', 'flag_g_01', 'flag_g_02', 'flag_i_01', 'flag_i_02', 'flag_h_01',
  'flag_h_02', 'flag_h_03', 'flag_j_01', 'flag_j_02', 'flag_j_03', 'flag_k_01', 'flag_k_02',
  'flag_k_03', 'flag_k_04', 'flag_k_05', 'flag_k_06', 'flag_l_01', 'flag_l_02', 'flag_l_03',
  'flag_m_01', 'flag_m_02', 'flag_m_03', 'flag_n_01', 'flag_n_02', 'flag_n_03', 'flag_n_04',
  'flag_n_05', 'flag_n_06', 'Twin_Peaks_01', 'Twin_Peaks_02', 'Gem_01', 'Gem_02', 'Gem_03',
  'Gem_04', 'Coin_01', 'Coin_02', 'Coin_03', 'Coin_04', 'Elixir_01', 'Elixir_02', 'Heart_01',
  'Heart_02', 'Heart_04', 'Heart_03', 'Tower_01', 'Tower_02', 'Tower_03', 'Tower_04', 'Fan_01',
  'Fan_02', 'Fan_03', 'Fan_04', 'Fugi_01', 'Fugi_02', 'Fugi_03', 'Fugi_04', 'YingYang_01',
  'YingYang_02', 'flag_c_01', 'flag_c_02', 'Cherry_Blossom_01', 'Cherry_Blossom_02',
  'Cherry_Blossom_03', 'Cherry_Blossom_04', 'Cherry_Blossom_06', 'Cherry_Blossom_05',
  'Cherry_Blossom_07', 'Cherry_Blossom_08', 'Bamboo_01', 'Bamboo_02', 'Bamboo_03', 'Bamboo_04',
  'Orange_01', 'Orange_02', 'Lotus_01', 'Lotus_02', 'A_Char_King_01', 'A_Char_King_02',
  'A_Char_King_03', 'A_Char_King_04', 'A_Char_Barbarian_01', 'A_Char_Barbarian_02',
  'A_Char_Prince_01', 'A_Char_Prince_02', 'A_Char_Knight_01', 'A_Char_Knight_02',
  'A_Char_Goblin_01', 'A_Char_Goblin_02', 'A_Char_DarkPrince_01', 'A_Char_DarkPrince_02',
  'A_Char_DarkPrince_03', 'A_Char_DarkPrince_04', 'A_Char_MiniPekka_01', 'A_Char_MiniPekka_02',
  'A_Char_Pekka_01', 'A_Char_Pekka_02', 'A_Char_Hammer_01', 'A_Char_Hammer_02', 'A_Char_Rocket_01',
  'A_Char_Rocket_02', 'Freeze_01', 'Freeze_02', 'Clover_01', 'Clover_02', 'flag_h_04', 'flag_e_02',
  'flag_i_03', 'flag_e_01', 'A_Char_Barbarian_03', 'A_Char_Prince_03', 'A_Char_Bomb_01',
  'A_Char_Bomb_02'
];


/** badgeId (número que ya manda Supercell) -> <img> del ícono del clan
 * auto-hospedado en assets/badges/, o '' si no se puede resolver (badge
 * desconocido, o el PNG todavía no se subió a esa carpeta) — nunca rompe
 * el layout con un ícono caído. opts.size en px (default 22). */
function iconoBadgeClanHtml(badgeId, opts){
  opts = opts || {};
  const size = opts.size || 22;
  const idx = Number(badgeId) - BADGE_ID_BASE;
  const nombre = BADGE_NOMBRES_POR_ID[idx];
  if (!nombre) return '';
  return `<img src="assets/badges/${nombre}.png" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" style="vertical-align:-6px; margin-right:6px;" onerror="this.remove();">`;
}



/* =========================================================================
 * Tarjetas y gráficos de clan — compartidos por index.html y directorio.html
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
