/* cards-es.js — diccionario de nombres de cartas EN->ES. Extraído de common.js. */



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
