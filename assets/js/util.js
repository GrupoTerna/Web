/* util.js — helpers genéricos de formato/texto/orden compartidos por todas las páginas. Extraído de common.js. */



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
 * debounce(fn, espera)
 * FIX (16-sep-2026 v8, pedido usuario — rendimiento): antes vivía solo
 * dentro de directorio.html, usada por el buscador del popover de filtro
 * de columna (.rt-filtro-buscar) para no reconstruir el checklist en cada
 * tecla. Se sube acá (18-sep-2026) para poder reusarla desde cualquier
 * página sin duplicarla — cualquier otro input que la necesite puede
 * llamarla igual.
 */
function debounce(fn, espera){
  let temporizador;
  return function(...args){
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn.apply(this, args), espera);
  };
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


/** Normaliza un tag de Clash Royale para mostrar/mandar: mayúsculas, con '#'. */
function normalizarTag(t){
  let v = String(t||'').trim().toUpperCase().replace(/^#/, '');
  return v ? '#' + v : '';
}


/**
 * enlaceJugador(nombre, tag, opts)
 * Nombre de jugador clickeable hacia su perfil (perfil.html?tag=...) —
 * mismo patrón que ya usaba renderRankingRow() de index.html, ahora
 * centralizado para reutilizarlo en CUALQUIER tabla/gráfica/tarjeta del
 * sitio que muestre un nombre de jugador (pedido usuario 07-sep-2026:
 * "donde se presente el nombre de algún jugador, debe ser clickeable y
 * llevar a su perfil"). Si no hay tag válido, se devuelve el nombre
 * escapado tal cual (sin <a>) — no se puede armar un link a un perfil sin
 * tag, y es preferible texto plano a un link roto.
 * opts.clase: clase(s) CSS adicionales para el <a> (además de
 *   "jugador-link", que ya trae subrayado on-hover — ver styles.css).
 * opts.mismaVentana: si true, navega en la misma pestaña en vez de abrir
 *   una nueva (por defecto abre nueva pestaña, igual que el resto del sitio).
 */
function enlaceJugador(nombre, tag, opts){
  opts = opts || {};
  const nombreEsc = esc(nombre || '—');
  if (!tag) return nombreEsc;
  const clase = 'jugador-link' + (opts.clase ? ' ' + opts.clase : '');
  const target = opts.mismaVentana ? '' : ' target="_blank" rel="noopener"';
  return `<a class="${clase}" href="perfil.html?tag=${encodeURIComponent(tag)}"${target}>${nombreEsc}</a>`;
}


/**
 * enlaceClan(nombre, opts)
 * Nombre de clan clickeable hacia su dashboard (clan.html?clan=...) —
 * mismo patrón que enlaceJugador() de arriba, ahora para clanes (pedido
 * usuario 21-sep-2026: "haz que toda mención al nombre de uno de nuestros
 * clanes lleve a otro link así como al seleccionar un jugador y se abra
 * un dashboard de ese clan"). Si no hay nombre, se devuelve '—' escapado
 * (sin <a>) — mismo criterio defensivo que enlaceJugador() sin tag.
 * opts.clase: clase(s) CSS adicionales para el <a> (además de
 *   "clan-link", que ya trae subrayado on-hover — ver styles.css).
 * opts.mismaVentana: si true, navega en la misma pestaña en vez de abrir
 *   una nueva (por defecto abre nueva pestaña, igual que enlaceJugador()).
 */
function enlaceClan(nombre, opts){
  opts = opts || {};
  const nombreEsc = esc(nombre || '—');
  if (!nombre) return nombreEsc;
  const clase = 'clan-link' + (opts.clase ? ' ' + opts.clase : '');
  const target = opts.mismaVentana ? '' : ' target="_blank" rel="noopener"';
  return `<a class="${clase}" href="clan.html?clan=${encodeURIComponent(nombre)}"${target}>${nombreEsc}</a>`;
}


/**
 * fmtTiempoRelativo(fecha)
 * Texto tipo "actualizado hace X" a partir de una Date (o null). Mismo
 * estilo de texto que ya usaba guerra.html (actualizarAgoText(), inline
 * en esa página) para su indicador de refresco automático, pero
 * generalizado con horas/días — guerra.html nunca necesitaba pasar de
 * minutos porque se auto-refresca cada 60s; un respaldo de localStorage
 * (ver apiGetUltimaActualizacion() en api.js, FIX B4/B-10) puede ser
 * bastante más viejo si el visitante estuvo sin conexión un buen rato.
 * @param {Date|null} fecha
 * @returns {string} p.ej. "actualizado hace 3 min", "sin datos guardados"
 */
function fmtTiempoRelativo(fecha){
  if (!fecha) return 'sin datos guardados';
  const segs = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segs < 5) return 'actualizado ahora mismo';
  if (segs < 60) return `actualizado hace ${segs}s`;
  const mins = Math.floor(segs / 60);
  if (mins < 60) return `actualizado hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `actualizado hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `actualizado hace ${dias} d`;
}


/**
 * fmtFechaVigenciaCorta(v)
 * Fecha corta CON hora en zona Lima (ej. "05 set 2026, 4:46 a. m."). Antes
 * había dos copias idénticas: fmtFechaVigenciaCorta() en index.html y
 * fmtFechaCortaVigencia() en directorio.html. Si el valor no es una fecha
 * parseable se muestra tal cual, en vez de perder información.
 */
function fmtFechaVigenciaCorta(v){
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const fecha = d.toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric', timeZone:'America/Lima' });
  const hora  = d.toLocaleTimeString('es-PE', { hour:'numeric', minute:'2-digit', hour12:true, timeZone:'America/Lima' });
  return `${fecha}, ${hora}`;
}
