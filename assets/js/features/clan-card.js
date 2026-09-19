/* clan-card.js — tarjetas y gráficos de clan compartidos por index.html y directorio.html. Extraído de common.js. */



/**
 * clanCardCabeceraHtml(c, i, opts)
 * Cabecera de una tarjeta de clan: insignia de rol (o la normal), escudo real
 * (badgeId), nombre y tag debajo, todo centrado. Es EXACTAMENTE el bloque que
 * clanCardHtml() pinta arriba de cada tarjeta (Directorio/Inicio), separado
 * para reutilizarlo tal cual en otras páginas (guerra.html, "Guerra de Hoy")
 * sin duplicar el HTML. `opts.mostrarRol` igual que en clanCardHtml().
 */
function clanCardCabeceraHtml(c, i, opts){
  opts = opts || {};
  const badge  = (opts.mostrarRol ? CLAN_BADGES_ROL[i] : CLAN_BADGES[i]) || { cls: 'badge-purple', label: 'Clan Terna' };
  const nombre = c.nombre || badge.label;
  const iconoBadgeHtml = c.badgeId ? iconoBadgeClanHtml(c.badgeId, { size: 26 }) : '';
  return `
      <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span class="badge ${badge.cls}">${esc(badge.label)}</span>
      </div>
      <h3 style="font-size:20px; text-align:center;">${iconoBadgeHtml}${esc(nombre)}</h3>
      <div class="text-faint" style="font-family:var(--f-mono); font-size:12px; margin-top:4px; text-align:center;">${esc(c.clanTag||'')}</div>`;
}


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
 *     roster de directorio.html).
 * Ya NO incluye la descripción del clan (retirada a pedido del usuario) —
 * solo RoyaleAPI/CWStats + (opcional) Ver clan + (opcional) Unirse.
 *
 * FIX (16-sep-2026, pedido usuario — "centra los datos señalados" en las
 * tarjetas de clan de directorio.html, ver captura): la insignia
 * (badge), el nombre (h3) y el tag quedan centrados horizontalmente —
 * antes colgaban del borde izquierdo de la tarjeta. Líder/Liga (más
 * abajo) NO se tocan, no estaban marcados en la captura. Esta función es
 * compartida por index.html y directorio.html, así que el cambio se ve
 * en ambas páginas.
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
  const verClanHref = `directorio.html?clan=${encodeURIComponent(nombre)}#roster`;
  const royaleApiOk = urlValida(c.royaleApi);
  const cwStatsOk   = urlValida(c.cwStats);
  // La cabecera (insignia + escudo + nombre + tag) vive en clanCardCabeceraHtml(),
  // compartida con guerra.html. Historial en CHANGELOG.md (16-sep: badgeId).
  return `
    <div class="card card-hover clan-card" data-reveal style="display:flex; flex-direction:column;">${clanCardCabeceraHtml(c, i, opts)}
      <div style="display:flex; justify-content:center; margin-top:12px;">
        <div style="display:flex; flex-direction:column; align-items:flex-start; gap:4px; font-size:13px;">
          <span class="text-dim">👑 Líder: <b style="color:var(--text);">${esc(lider)}</b></span>
          <span class="text-dim">🛡️ Liga: <b style="color:var(--text);">${esc(liga)}</b></span>
        </div>
      </div>
      <div style="flex:1; min-height:8px;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; font-family:var(--f-mono); font-size:13px; border-top:1px solid var(--line); padding-top:12px;">
        <span class="text-faint">Mín. trofeos</span><b style="color:var(--gold);">${reqTxt} 🏆</b>
      </div>
      ${(royaleApiOk || cwStatsOk) ? `<div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        ${royaleApiOk ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.royaleApi)}" target="_blank" rel="noopener">${ICONO_ROYALEAPI}RoyaleAPI</a>` : ''}
        ${cwStatsOk  ? `<a class="btn btn-ghost" style="flex:1; text-align:center; font-size:12px; padding:9px 10px;" href="${esc(c.cwStats)}" target="_blank" rel="noopener">${ICONO_CWSTATS}CWStats</a>` : ''}
      </div>` : ''}
      ${opts.mostrarVerClan ? `<a class="btn btn-primary btn-block" href="${esc(verClanHref)}" style="margin-top:12px;">Ver clan</a>` : ''}
      ${opts.mostrarUnirse ? `<button type="button" class="btn btn-ghost btn-block js-solicitar-unirme" data-clan="${esc(nombre)}" style="margin-top:12px;">Unirse a este clan</button>` : ''}
    </div>`;
}


/**
 * chartCardHtml(titulo, icono, clanes, campo, formatFn)
 * Tarjeta con un mini gráfico de barras horizontales comparando los 4
 * clanes en un campo numérico de webClanInfo (miembros/donaciones/
 * trofeos/copas). Sin librerías externas — barras hechas con CSS puro,
 * consistentes con el resto del sitio (ver .chart-* en directorio.html).
 * FIX (08-sep-2026, pedido usuario — "en las gráficas no debe decir
 * 'Terna 2', 'Terna 3' etc, debe llevar el nombre real del clan y estar
 * un poco más resaltado, casi no se distingue, alinéalo a la
 * izquierda"): antes la etiqueta priorizaba CLAN_LABELS_CORTOS (el alias
 * corto fijo de la Familia — Principal/Terna 2/Terna 3/Mini) por encima
 * de c.nombre (el nombre real que manda el backend en webClanInfo).
 * Ahora es al revés: se usa c.nombre siempre que exista, y solo se cae a
 * CLAN_LABELS_CORTOS como respaldo si el backend no mandara nombre para
 * ese clan. El estilo de resaltado (más contraste, más peso) y la
 * alineación a la izquierda se agregan directamente acá vía la clase
 * chart-label-fuerte, sin tocar .chart-label base (ese sigue vigente
 * para otras gráficas de la página — comparador Cara a cara, etc. — que
 * no pidieron este cambio).
 */
function chartCardHtml(titulo, icono, clanes, campo, formatFn){
  const valores = clanes.map(c => Number(c[campo]) || 0);
  const max = Math.max(1, ...valores);
  const filas = clanes.map((c, i) => {
    const v   = valores[i];
    const pct = Math.max(2, Math.round((v / max) * 100));
    const txt = formatFn ? formatFn(v) : fmtNum(v);
    const nombreClan = c.nombre || CLAN_LABELS_CORTOS[i] || '—';
    // FIX (08-sep-2026, pedido usuario — "los nombres de los clanes salen
    // incompletos"): "chart-row-clan" (además de "chart-row" base) es un
    // hook para que directorio.html pueda subir align-items a flex-start
    // SOLO en estas filas — ver CSS de .chart-row-clan/.chart-label-fuerte
    // en directorio.html — sin afectar el resto de usos de .chart-row
    // (ej. el comparador "Cara a cara" jugador vs jugador).
    return `
      <div class="chart-row chart-row-clan">
        <span class="chart-label chart-label-fuerte" title="${esc(nombreClan)}">${esc(nombreClan)}</span>
        <span class="chart-track"><span class="chart-fill" style="width:${pct}%"></span></span>
        <span class="chart-val">${esc(txt)}</span>
      </div>`;
  }).join('');
  return `
    <div class="card chart-card" data-reveal>
      <div class="chart-title">${icono} ${esc(titulo)}</div>
      ${filas}
    </div>`;
}
