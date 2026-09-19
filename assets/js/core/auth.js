/* auth.js — sesión de administrador (login/logout, botón CTA del nav). Extraído de common.js. */



/** true si hay un admin con sesión iniciada en este navegador (mismo
 * sessionStorage que usa apiGetAuth / admin.html). */
function esAdminLogueado(){
  return !!localStorage.getItem('terna_admin_token');
}


/**
 * adminPuedeVetar()
 * true si el admin logueado en este navegador tiene la Función 'Vetar'
 * asignada (mismo criterio que usa admin.html para mostrar/ocultar el
 * card "Vetar miembro"). Antes vivía duplicada solo dentro de perfil.html;
 * se sube a common.js (1-sep-2026) para reutilizarla también en la vista
 * de cuentas inactivas de directorio.html/index.html.
 */
function adminPuedeVetar(){
  if (!esAdminLogueado()) return false;
  const adminGuardado = localStorage.getItem('terna_admin_info');
  if (!adminGuardado) return false;
  try{
    const funciones = String(JSON.parse(adminGuardado).funciones || '');
    return funciones.indexOf('Vetar') !== -1;
  }catch(err){
    return false;
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
 * final de su script, `if(localStorage.getItem(SESSION_KEY))
 * mostrarPanel();`) — solo faltaba que el botón del nav lo reflejara en
 * vez de seguir mostrando "Acceder" como si nadie hubiera iniciado sesión.
 * Usa la MISMA clave que admin.html ('terna_admin_token', ahí declarada
 * como SESSION_KEY).
 *
 * FIX (04-sep-2026, pedido usuario — "sí puedo ver Directorio [para
 * inactivos] pero en guerra no aparecen los botones de admin aunque
 * tengo sesión activa"): esto vivía en sessionStorage, que se aísla POR
 * PESTAÑA (no por sitio) — una sesión iniciada en admin.html no era
 * visible al abrir guerra.html en una pestaña/ventana nueva, aunque el
 * usuario sí tuviera sesión activa "en el navegador". Se migra TODO el
 * mecanismo de sesión de admin (acá y en admin.html/perfil.html/
 * sorteo.html) a localStorage, que sí se comparte entre pestañas del
 * mismo origen. Contrapartida asumida (pedido explícito del usuario):
 * la sesión ahora persiste más tiempo — sobrevive a cerrar la pestaña/
 * el navegador, hasta que se cierre sesión explícitamente o venza el
 * token en el backend — en vez de borrarse sola al cerrar la pestaña.
 *
 * FEATURE (19-sep-2026, pedido usuario — "migra la sección de mensajes a
 * su propio botón entre comunidad y 'acceder' o 'mi panel'"): la sección
 * "Mensajes" salió de admin.html a mensajes.html, con su propio link en el
 * nav (<a data-page="mensajes">, entre Comunidad y Acceder/Mi panel). Es
 * contenido solo-admin, así que el link nace oculto (style="display:none")
 * en cada página y esta misma función lo muestra únicamente cuando hay
 * sesión de admin. Es solo UX: mensajes.html vuelve a validar la sesión por
 * su cuenta (redirige a admin.html si no hay token) y el backend
 * (webAdminContenido) también exige el token en cada petición.
 */
const SESSION_KEY_ADMIN = 'terna_admin_token';

function actualizarNavCta(){
  const haySesion = !!localStorage.getItem(SESSION_KEY_ADMIN);
  document.querySelectorAll('.nav .links a.cta[data-page="admin"]').forEach(a => {
    a.textContent = haySesion ? 'Mi panel' : 'Acceder';
  });
  document.querySelectorAll('.nav .links a[data-page="mensajes"]').forEach(a => {
    a.style.display = haySesion ? '' : 'none';
  });
}


/**
 * cerrarSesionAdmin()
 * FIX (19-sep-2026, pedido usuario — "no me deja cerrar sesión"): antes el
 * botón "Cerrar sesión" (admin.html y mensajes.html) hacía
 * `await apiPost('webAuthLogout')` ANTES de borrar el token local. Pero
 * apiPost() pasa por _encolarPeticion() con _MAX_PETICIONES_SIMULTANEAS = 1
 * (todas las peticiones a Apps Script salen en serie, ver api.js) y
 * _fetchYParsear() no tiene tiempo límite, con hasta 5 reintentos: el aviso
 * de logout se formaba detrás de TODAS las peticiones ya pendientes del
 * panel (mostrarPanel() dispara 7-8 de golpe) y, mientras tanto, la pantalla
 * no cambiaba, así que el botón parecía muerto.
 *
 * Ahora la sesión se cierra en el acto del lado del cliente (se borra el
 * token, síncrono) y el aviso al servidor, para que invalide el token en su
 * CacheService (FIX B-27, 18-sep-2026), sale por su cuenta: fuera de la cola,
 * sin esperar la respuesta, y con `keepalive` para que el navegador lo envíe
 * aunque justo después la página navegue a otra (mensajes.html → admin.html).
 * Va fuera de la cola a propósito: la cola existe para no saturar a Apps
 * Script con peticiones que sí importan, y esta es la única que no necesita
 * respuesta. Si falla (sin conexión, etc.) no pasa nada: el token local ya
 * no existe y el del servidor vence solo a las 6 h. Misma forma de petición
 * que apiPost() (POST con el JSON como texto, sin cabeceras propias).
 */
function cerrarSesionAdmin(){
  const token = localStorage.getItem(SESSION_KEY_ADMIN);
  localStorage.removeItem(SESSION_KEY_ADMIN);
  localStorage.removeItem('terna_admin_info');
  if(!token) return;
  try{
    fetch(`${WEBAPP_URL}?accion=webAuthLogout`, {
      method: 'POST',
      cache: 'no-store',
      keepalive: true,
      body: JSON.stringify({ sessionToken: token })
    }).catch(() => { /* se ignora: el cierre local ya se hizo */ });
  }catch(err){ /* idem */ }
}
