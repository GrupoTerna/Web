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
 * mejoras, 28-sep-2026 — solo documentación, no cambia comportamiento).
 *
 * Este repo es público, así que CUALQUIERA puede leer el token de arriba y
 * llamar directo al Web App (WEBAPP_URL) sin pasar por la web. Es una
 * decisión aceptada, no un descuido: un token que viaja en el JS de una página
 * pública nunca es un secreto real. Lo que sí hace es filtrar tráfico casual y
 * permitir rotarlo (rotarTokensDesdeCodigo(), última vez 20-sep-2026); el
 * sitio pide el token en cada apiGet() (assets/js/core/api.js).
 *
 * Qué se puede alcanzar con ESTE token (según lo que el frontend llama con
 * apiGet()): solo acciones web* de lectura de datos públicos del clan:
 *   webClanInfo, webRoster, webGuerraEnVivo, webGuerraLog, webGuerraPuestosDia,
 *   webHistorialGuerraComparador, webPronosticoGuerra, webRankings,
 *   webTorneosJugador, webPerfil, webCofresJugador, webBattlelogJugador,
 *   webCompararJugadores, webEstadisticasCartas, webIngresosRecientes,
 *   webAscensosRecientes, webAniversarios.
 * Riesgo real: quien tenga el token puede leer todo eso (ya es lo que muestra
 * el portal) y gastar cuota del Web App / del proxy de Render, sobre todo con
 * webPerfil, webCofresJugador y webBattlelogJugador, que consultan a
 * Supercell en vivo.
 *
 * Qué NO protege este token: las acciones de admin (crear/modificar torneos y
 * sorteos, vetar, permisos, login) van por apiPost()/apiGetAuth() con la
 * sesión personal de cada admin (terna_admin_token / sessionToken), no con
 * este token.
 *
 * VERIFICACIÓN ABIERTA (pendiente de contestar): el punto anterior sale de
 * revisar el FRONTEND. Falta confirmar en el backend (34_Web_API.gs / doGet en
 * 08_Web_Endpoints.gs, Base.md) que ninguna acción que acepte WEB_MEMBER_TOKEN
 * escriba datos ni devuelva datos personales sensibles, y que las acciones de
 * admin rechacen este token. Si el backend contradice esta nota, corregirla
 * acá y avisar como corrección.
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
