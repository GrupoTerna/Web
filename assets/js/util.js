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
 * fmtHaceCorto(fecha) / fmtFechaHoraLima(fecha)
 * NUEVO (09-oct-2026, pedido del usuario: mostrar TRES momentos distintos). Misma forma corta que usa guerra.html
 * (_haceCorto): «hace 5 s», «hace 12 min», «hace 3 h 20 min». fmtFechaHoraLima() da fecha y hora absolutas en zona
 * Lima para los tooltips. Ambas devuelven '—' si no reciben una fecha válida.
 */
// Por forma y no con `instanceof Date`: una Date creada en otro contexto (iframe, pruebas con vm) no pasa ese chequeo.
function _esFechaValida(f){ return !!f && typeof f.getTime === 'function' && !isNaN(f.getTime()); }
function fmtHaceCorto(fecha){
  if (!_esFechaValida(fecha)) return '—';
  const s = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1000));
  if (s < 60) return 'hace ' + s + ' s';
  const m = Math.floor(s / 60);
  if (m < 60) return 'hace ' + m + ' min';
  const h = Math.floor(m / 60), rm = m % 60;
  if (h < 24) return 'hace ' + h + ' h' + (rm ? ' ' + rm + ' min' : '');
  return 'hace ' + Math.floor(h / 24) + ' d';
}
function fmtFechaHoraLima(fecha){
  if (!_esFechaValida(fecha)) return '—';
  try{
    return fecha.toLocaleString('es-PE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:'America/Lima' });
  }catch(e){ return fecha.toLocaleString(); }
}

/**
 * tsApiDeDatos(datos)
 * NUEVO (09-oct-2026): momento en que el bot consultó la API de Supercell, si el dato lo trae. Hoy el único campo
 * que se sabe que existe es `tiempos.api.ultimaConsultaTs` (milisegundos), el que ya lee guerra.html. Se acepta
 * tanto en el objeto de una sección como en la raíz de un JSON. Si no está (o no es válido) devuelve null: NO se
 * inventa ni se reemplaza por otra fecha. Los demás JSON (home, roster, torneos...) no se sabe si lo traen: eso
 * depende del bot (backend), que aún no se revisó.
 * @param {*} datos
 * @returns {Date|null}
 */
function tsApiDeDatos(datos){
  const ts = datos && datos.tiempos && datos.tiempos.api ? Number(datos.tiempos.api.ultimaConsultaTs) : NaN;
  return (ts > 0) ? new Date(ts) : null;
}

/**
 * fmtTresTiempos({ consulta, publicado, api, respaldo, esViejo })
 * NUEVO (09-oct-2026, pedido del usuario): una línea con los momentos que el visitante necesita distinguir, y un
 * tooltip con las horas exactas (Lima). Cada parte se omite si no existe:
 *   consulta  -> cuándo ESTA página obtuvo la respuesta (siempre hay).
 *   publicado -> cuándo se publicó el JSON estático (`_publicadoEn`); solo si el dato salió de un JSON.
 *   api       -> cuándo el bot consultó a Supercell (ver tsApiDeDatos()); solo si el dato lo trae.
 *   respaldo  -> cuándo se guardó el respaldo local, si se mostró ese (el servidor no respondió).
 *   esViejo   -> true si se muestra un dato guardado porque el servidor no respondió: suma el aviso.
 * @returns {{texto: string, titulo: string}}
 */
function fmtTresTiempos(t){
  t = t || {};
  const partes = [], det = [];
  if (t.consulta){ partes.push('Consulta: ' + fmtHaceCorto(t.consulta)); det.push('Esta página consultó: ' + fmtFechaHoraLima(t.consulta)); }
  if (t.publicado){ partes.push('JSON publicado: ' + fmtHaceCorto(t.publicado)); det.push('Archivo JSON publicado: ' + fmtFechaHoraLima(t.publicado)); }
  if (t.respaldo){ partes.push('Respaldo guardado: ' + fmtHaceCorto(t.respaldo)); det.push('Respaldo local guardado: ' + fmtFechaHoraLima(t.respaldo)); }
  if (t.api){ partes.push('API Supercell: ' + fmtHaceCorto(t.api)); det.push('Última consulta del bot a la API de Supercell: ' + fmtFechaHoraLima(t.api)); }
  if (t.esViejo){ partes.push('⚠ Datos guardados: el servidor no responde'); det.push('Se muestra el último dato guardado porque el servidor no respondió; puede estar atrasado.'); }
  return { texto: partes.join(' · '), titulo: det.join(' | ') };
}


/**
 * horaConsultaApiGet(accion)
 * NUEVO (09-oct-2026, Fase 4, pedido del usuario): hora REAL en que se obtuvo un dato que salió de apiGet() (Apps Script). apiGet() guarda un
 * respaldo local con la hora de cada respuesta buena; si devolvió ese respaldo sin avisar porque el servidor no respondió, la hora real es la
 * vieja y no «ahora». Con una respuesta fresca (o del caché de 5 min) esa hora es ahora o de hace unos minutos. Sin respaldo, sin api.js o con
 * una fecha inválida devuelve la hora actual. Solo vale para llamadas SIN sesión de admin (con sesión no hay respaldo con esa clave: ahí la
 * página pasa `consulta` ya resuelta). No dispara ninguna petición.
 * @param {string} accion Ej. 'webRoster'.
 * @returns {Date}
 */
function horaConsultaApiGet(accion){
  try{
    const d = (typeof apiGetUltimaActualizacion === 'function') ? apiGetUltimaActualizacion(accion, null) : null;
    if (_esFechaValida(d)) return d;
  }catch(e){ /* sin respaldo legible: se usa la hora actual */ }
  return new Date();
}

/**
 * fmtTresTiemposDeResultado(r)
 * NUEVO (09-oct-2026, Fase 3): atajo de fmtTresTiempos() para las funciones que devuelven { origen, desde, api } (directorio.html,
 * comunidad.html, torneos.html). `origen`: 'estatico' (JSON vigente), 'apps-script', 'respaldo-local' o 'estatico-viejo'; `desde`: fecha de
 * publicación del JSON (estatico / estatico-viejo) o de guardado del respaldo (respaldo-local); `api`: ver tsApiDeDatos().
 * CAMBIO (09-oct-2026, Fase 4): la hora de «Consulta» ya no es siempre «ahora». Si el resultado trae `consulta` (Date) se usa esa; si el origen
 * es 'apps-script' y trae `accion`, es la hora real del último guardado de esa acción (ver horaConsultaApiGet()); en los demás casos (archivo
 * descargado ahora, respaldo local que ya se muestra aparte) es ahora. Con 'respaldo-local' y 'estatico-viejo' suma el aviso.
 */
function fmtTresTiemposDeResultado(r){
  r = r || {};
  const archivo = r.origen === 'estatico' || r.origen === 'estatico-viejo';
  let consulta = _esFechaValida(r.consulta) ? r.consulta : null;
  if (!consulta) consulta = (r.origen === 'apps-script' && r.accion) ? horaConsultaApiGet(r.accion) : new Date();
  return fmtTresTiempos({
    consulta,
    publicado: archivo ? r.desde : null,
    respaldo: r.origen === 'respaldo-local' ? r.desde : null,
    api: r.api,
    esViejo: r.origen === 'estatico-viejo' || r.origen === 'respaldo-local'
  });
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
