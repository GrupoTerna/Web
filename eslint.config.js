const js = require('@eslint/js');
const globals = require('globals');

/*
 * FIX (B-15, 18-sep-2026): este proyecto no usa modulos ES ni un bundler.
 * Cada pagina carga varios <script src="assets/js/..."> en orden y todos
 * comparten el mismo scope global (una funcion definida en util.js se usa
 * tal cual en clan-card.js, en inactivos.js, etc.). Sin declarar esto,
 * ESLint marca esas ~70 funciones/constantes compartidas como "no
 * definidas" (no-undef) en todos lados menos donde se declaran. La lista
 * de abajo se genero automaticamente recorriendo todo el JS bajo assets/
 * (incluido assets/common.js) en busca de "function nombre(",
 * "async function nombre(" y "const/let/var nombre =" de nivel superior;
 * si agregas una funcion o constante nueva pensada para compartirse entre
 * archivos, hay que sumarla aca a mano (o volver a generar la lista con
 * el mismo metodo).
 */
const GLOBALES_COMPARTIDOS = [
  'API_GET_CACHE_TTL_MS', 'BADGE_ID_BASE', 'BADGE_NOMBRES_POR_ID', 'CLAN_BADGES', 'CLAN_BADGES_ROL', 'CLAN_LABELS_CORTOS',
  'DISCORD_URL', 'FORM_POSTULACION_URL', 'ICONO_CWSTATS', 'ICONO_ROYALEAPI', 'LETRAS_FILTRO', 'NOMBRES_CARTAS_ES',
  'SESSION_KEY_ADMIN', 'WEBAPP_URL', 'WEB_MEMBER_TOKEN', 'WSP_GRUPO_URL', '_MAX_INTENTOS_FETCH', '_MAX_PETICIONES_SIMULTANEAS',
  '_REINTENTO_ESPERA_MS', '_colaPeticiones', '_encolarPeticion', '_enviarVetoInactivo', '_esErrorDeRed', '_fetchYParsear',
  '_fetchYParsearInterno', '_filaInactivoHtml', '_mensajeErrorRed', '_mismaFecha', '_obtenerVistaInactivos', '_peticionesActivas',
  '_renderVistaInactivos', '_toggleFormVetarInactivo', 'abrirModalUnirse', 'activarBarraScrollTabla', 'activarTecladoPuntosGrafica', 'actualizarNavCta',
  'adminPuedeVetar', 'agregarTarjetaCuentasInactivasSiAdmin', 'apiGet', 'apiGetAuth', 'apiPost', 'cerrarModalUnirse',
  'chartCardHtml', 'clanCardHtml', 'debounce', 'enlaceClan', 'enlaceJugador', 'esAdminLogueado', 'esInicioAnio',
  'esInicioSemana', 'esInicioTemporada', 'esc', 'etiquetaPuntoSerie', 'fitOneLine', 'fitOneLineAll',
  'fmtFechaVigenciaCorta', 'fmtNum', 'gridHorizontalMediosSvg', 'htmlTooltipPuntoSerie', 'iconoBadgeClanHtml', 'initJoinModal',
  'joinModalTriggerEl', 'lineasTemporalesSvg', 'marcarNavActiva', 'normalizarTag', 'obtenerTooltipGrafica', 'ordenClanIndex',
  'ordenarClanes', 'pintarFiltroLetra', 'primerLunesDelMesJS', 'primeraLetraFiltro', 'sincronizarScrollHorizontal', 'traducirNombreCarta',
  'urlValida'
];

module.exports = [
  js.configs.recommended,
  {
    files: ['assets/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...Object.fromEntries(GLOBALES_COMPARTIDOS.map(n => [n, 'writable']))
      }
    },
    rules: {
      // Cada nombre de la lista de arriba SIEMPRE aparece "nunca usado" en
      // el archivo donde se declara (se usa en otro archivo/pagina), asi
      // que esta regla no aporta nada en este proyecto sin modulos.
      'no-unused-vars': 'off',
      // Sin esto, declarar un global de arriba choca con el propio
      // "function nombre(...)"/"const nombre = ..." que lo define en su
      // archivo de origen (ESLint lo ve como "redeclarar un builtin").
      'no-redeclare': ['error', { builtinGlobals: false }]
    }
  }
];
