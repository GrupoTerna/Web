/* config.js — constantes de configuración (URLs, tokens). Extraído de common.js. */


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

const WEB_MEMBER_TOKEN = '8adb26e9c98bd188ac4572997bdd38f1fc252f57'; // debe ser igual al de 34_Web_API.gs -- actualizado 20-sep-2026 tras rotarTokensDesdeCodigo()

/* NIVEL DE EXPOSICIÓN ACEPTADO DE WEB_MEMBER_TOKEN (Fase 5 del Consolidado de
 * mejoras, 28-sep-2026 — solo documentación, no cambia comportamiento;
 * revisado contra doGet/doPost de 08_Web_Endpoints.gs y las funciones web* de
 * 34_Web_API.gs).
 *
 * Este repo es público, así que CUALQUIERA puede leer el token de arriba y
 * llamar directo al Web App (WEBAPP_URL) sin pasar por la web. Es una
 * decisión aceptada, no un descuido: un token que viaja en el JS de una página
 * pública nunca es un secreto real. Sirve para filtrar tráfico casual y se
 * puede rotar (rotarTokensDesdeCodigo(), última vez 20-sep-2026). El backend lo
 * guarda en la Script Property WEB_MEMBER_TOKEN.
 *
 * QUÉ ALCANZA (19 acciones, todas GET, en doGet): webRoster, webClanInfo,
 * webGuerraEnVivo, webPronosticoGuerra, webGuerraLog, webGuerraPuestosDia,
 * webPerfil, webCompararJugadores, webHistorialGuerraComparador, webTorneos,
 * webHistorialTorneos, webTorneosJugador, webRankings, webAniversarios,
 * webIngresosRecientes, webAscensosRecientes, webEstadisticasCartas,
 * webCofresJugador, webBattlelogJugador.
 *
 * QUÉ NO ALCANZA: las acciones de admin (webAdmin*, webPermisos*, webCRLista*,
 * webMisCuentas, webAportesInactivos, webSorteoCalificados, etc.) validan el
 * sessionToken de cada admin y ignoran este token; doPost no lo acepta en
 * ninguna acción (ni siquiera webLogin).
 *
 * DATOS QUE SÍ SALEN CON ESTE TOKEN (conviene tenerlos presentes):
 *  - webGuerraEnVivo: cada "pendiente" trae nomMulti y prestamo (quién prestó
 *    la cuenta). guerra.html solo los pinta a admins, pero viajan a cualquiera
 *    que tenga el token.
 *  - webIngresosRecientes: cada ingreso trae esRivalTemporada y
 *    clanRivalDetectado {nombre, fuente, motivo} (cruce contra clanes rivales
 *    y la lista manual "Conflictos"). directorio.html lo muestra como aviso.
 *  - webPerfil / webCompararJugadores: si el Tag está en Inactivos, responden
 *    con estado "Inactivo" y el perfil de esa cuenta.
 *  Nunca salen (en el código revisado): celular, prefijo, claves, contraseña de
 *  torneo, Vetado/Razón, ni Autor/Comentario de ascensos.
 *
 * COSTO DE ABUSO: webPerfil (Tag sin registro), webCofresJugador y
 * webBattlelogJugador llaman en vivo a Supercell vía el proxy de Render. El
 * límite de pedidos es global (180/min para todas las acciones web*), no por
 * IP, porque Apps Script no expone la IP del cliente.
 *
 * VERIFICACIONES ABIERTAS (ver Consolidado, Fase 5):
 *  - webBattlelogJugador llama a _resolverModoDesdeCatalogo(); según el
 *    docblock de _obtenerModoCompletoDesdeCatalogo() (34_Web_API.gs) esa
 *    función encola filas nuevas en Backup_Modo.csv. Si es así, este token
 *    permitiría una escritura. Falta leer 07_API_ClashRoyale.gs para confirmarlo.
 *  - Sin revisar por falta de archivo: webPronosticoGuerra (38_Pronostico_Guerra.gs),
 *    webGuerraLog y webGuerraPuestosDia (17_GuerraSheet.gs).
 */


/* FASE 0 (24-ago-2026): canales reales de postulación/contacto, en un solo
 * lugar para que nunca vuelva a desincronizarse un link (bug original: el
 * botón Discord del hero de index.html tenía un placeholder distinto al
 * del resto del sitio). Usados por el modal "Cómo unirte" de index.html.
 * FORM_POSTULACION_URL: si quedara vacío, esa opción simplemente no se
 * muestra en vez de linkear a algo roto (ver el `if (FORM_POSTULACION_URL)`
 * en index.html/directorio.html). Completado el 30-ago-2026 con el Google
 * Form real (contenedor: Google Sheet
 * 1-8es9UFC_kLC8U4DwBT5xKPLfo_nw7__6J9TyiDUW14).
 */
const WSP_GRUPO_URL = 'https://chat.whatsapp.com/DthBdzalBK59KjTr13CwsR'; // FIX (07-sep-2026, pedido usuario — "el link de invitación en wsp es viejo"): reemplazado por el link vigente. Al ser una constante única, actualiza sola todos los botones de "unirse por WhatsApp" (modal "Cómo unirte" de index.html y directorio.html) — el link de "Redes Oficiales" (index.html, sección #redes) es un <a> estático aparte, se actualiza también a mano ahí.

const DISCORD_URL = 'https://discord.gg/YKXtg93DVb';

const FORM_POSTULACION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScWHtEClZfhvV1-6zFv2QgrdUgv2pTc7A94JhuGHpB0UnL2LQ/viewform?usp=dialog';
