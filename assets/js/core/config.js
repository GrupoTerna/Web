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
