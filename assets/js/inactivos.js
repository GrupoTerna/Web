/* inactivos.js — sección y flujo de veto de cuentas inactivas (admin). Extraído de common.js. */



/**
 * _filaInactivoHtml(c)
 * Fila de UNA cuenta inactiva dentro de la vista.
 * REGLA DURA (pedido del usuario): "en ningún caso se debe mostrar datos
 * sensibles (celulares)" — esta fila nunca debe agregar el campo Celular
 * aunque el backend llegara a incluirlo en el objeto `cuentas`.
 * OJO backend (1-sep-2026, pedido usuario — "agregarle botones de
 * RoyaleAPI/CWStats/Vetar, también depende de que el backend devuelva
 * esos datos por cuenta inactiva, cosa que hoy no hace"): `c.royaleApi`/
 * `c.cwstats` se pintan solo si urlValida() los acepta, igual que en
 * directorio.html/index.html con el resto de links externos.
 * FIX (07-sep-2026, pedido usuario — "la letra está muy pequeña, los tags
 * no se ven, agrega Nom_Multi/Nivel/Copas antes del botón de Vetar, cada
 * columna alineada y encabezados centrados respecto a sus valores"): esta
 * fila deja de ser un <div> suelto (inactivo-row de layout flex) y pasa a
 * ser un <tr> real de la tabla .inactivos-table armada en
 * _renderVistaInactivos() — así cada dato cae en su propia columna,
 * alineada verticalmente con su encabezado, en vez de depender de que el
 * flexbox "cuadre por casualidad". Nombre/Tag/Clan se mantienen dentro de
 * una sola celda (identidad de la cuenta) pero ya no se parten de línea
 * (white-space:nowrap, ver .ia-nombre/.ia-tag/.ia-clan en styles.css) y
 * con letra más grande. CONTRATO ESPERADO ampliado de
 * 'webAdminCuentasInactivas' (backend, fuera de este repo): además de
 * {tag, nombre, clan, esAdmin}, cada cuenta debería traer nomMulti,
 * nivelXp (mismo nombre que ya usa perfil.html/directorio.html para
 * "Nivel (XP)") y copas. Si el backend todavía no manda alguno de los
 * tres, la celda pinta "—" en vez de romper — igual que hace ya
 * ROSTER_COLUMNAS en directorio.html para sus propias columnas nuevas.
 */
function _filaInactivoHtml(c){
  const royaleOk = urlValida(c.royaleApi);
  const cwOk = urlValida(c.cwstats);
  const puedeVetar = adminPuedeVetar();
  const nomMultiTxt = c.nomMulti ? esc(c.nomMulti) : '—';
  const nivelTxt = c.nivelXp != null ? fmtNum(c.nivelXp) : '—';
  const copasTxt = c.copas != null ? fmtNum(c.copas) : '—';
  return `
    <tr class="inactivo-row" data-inactivo-tag="${esc(c.tag)}">
      <td class="ia-td-nombre">
        <div class="ia-nombre">${esc(c.nombre || 'Sin nombre')}</div>
        <div class="ia-tag">${esc(c.tag || '—')}</div>
        <div class="ia-clan">${esc(c.clan || '—')}</div>
      </td>
      <td class="ia-td-nommulti">${nomMultiTxt}</td>
      <td class="ia-td-nivel">${nivelTxt}</td>
      <td class="ia-td-copas">${copasTxt}</td>
      <td class="ia-td-acciones">
        ${(royaleOk || cwOk || puedeVetar) ? `<div class="inactivo-links">
          ${royaleOk ? `<a href="${esc(c.royaleApi)}" target="_blank" rel="noopener">${ICONO_ROYALEAPI}RoyaleAPI</a>` : ''}
          ${cwOk ? `<a href="${esc(c.cwstats)}" target="_blank" rel="noopener">${ICONO_CWSTATS}CWStats</a>` : ''}
          ${puedeVetar ? `<button type="button" class="js-inactivo-vetar-btn inactivo-btn-vetar">🚫 Vetar</button>` : ''}
        </div>` : '—'}
      </td>
    </tr>
    ${puedeVetar ? `<tr class="inactivo-vetar-fila" style="display:none;"><td colspan="5"><div class="js-inactivo-vetar-wrap"></div></td></tr>` : ''}`;
}


/** Abre/cierra el mini-formulario de Vetar bajo una fila de la vista de
 * inactivos — mismo patrón que mostrarFormVetar()/enviarVeto() de
 * perfil.html, generalizado a un `wrap` cualquiera en vez de un id fijo,
 * porque acá puede haber varias filas con su propio formulario.
 * FIX (07-sep-2026, la fila de inactivos pasó a ser un <tr> de tabla, ver
 * _filaInactivoHtml): `wrap` sigue siendo el <div> donde se pinta el
 * formulario, pero ahora vive dentro de un <tr class="inactivo-vetar-fila">
 * aparte (con <td colspan> para poder ocupar todas las columnas de la
 * tabla) — ese <tr> es quien debe mostrarse/ocultarse (un <div
 * display:none> dentro de un <tr> visible igual deja la fila pintada con
 * su padding vacío). `filaContenedora` es opcional para no romper otros
 * usos futuros de esta función que no vivan dentro de una tabla. */
function _toggleFormVetarInactivo(wrap, tag, btnDisparador, filaContenedora){
  const contenedor = filaContenedora || wrap;
  const yaAbierto = contenedor.style.display !== 'none' && wrap.innerHTML;
  if (yaAbierto){
    contenedor.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = `
    <div class="vetar-form">
      <div class="vetar-form-titulo">Vetar a ${esc(tag)}</div>
      <div class="field">
        <label>Razón</label>
        <select class="js-iv-razon">
          <option value="">Elige una razón…</option>
          <option value="NARANJA x">NARANJA x</option>
          <option value="Vetado por clan">Vetado por clan</option>
          <option value="Incumplimiento de ataques">Incumplimiento de ataques</option>
          <option value="Conducta inapropiada">Conducta inapropiada</option>
          <option value="Inactividad prolongada">Inactividad prolongada</option>
          <option value="Solicitud propia">Solicitud propia</option>
        </select>
      </div>
      <div class="field" style="margin-bottom:8px;">
        <label>Comentario (opcional)</label>
        <textarea class="js-iv-comentario" rows="3" placeholder="Detalle adicional para el registro de Comentarios"></textarea>
      </div>
      <button type="button" class="btn btn-primary btn-block js-iv-confirmar" style="border-color:var(--danger);">Confirmar veto</button>
      <div class="js-iv-msg"></div>
    </div>`;
  wrap.style.display = 'block';
  contenedor.style.display = filaContenedora ? 'table-row' : 'block';
  wrap.querySelector('.js-iv-confirmar').addEventListener('click', () => _enviarVetoInactivo(wrap, tag, btnDisparador));
}


async function _enviarVetoInactivo(wrap, tag, btnDisparador){
  const msgEl = wrap.querySelector('.js-iv-msg');
  msgEl.innerHTML = '';
  const razon = wrap.querySelector('.js-iv-razon').value;
  const comentario = wrap.querySelector('.js-iv-comentario').value.trim();
  if (!razon){ msgEl.innerHTML = '<div class="msg msg-error">Elige una Razón.</div>'; return; }
  if (!window.confirm(`¿Vetar a ${tag}? Esta acción no se puede deshacer desde la web.`)) return;
  const btnConfirmar = wrap.querySelector('.js-iv-confirmar');
  btnConfirmar.disabled = true;
  try{
    const data = await apiPost('webAdminVetar', {
      sessionToken: localStorage.getItem('terna_admin_token'),
      datos: { tag: tag, razon: razon, comentario: comentario }
    });
    if (data && data.ok === false && /sesión|sesion/i.test(String(data.error||''))){
      msgEl.innerHTML = `<div class="msg msg-error">${esc(data.error)} Vuelve a iniciar sesión desde el panel de admin.</div>`;
      return;
    }
    if (!data.ok){ msgEl.innerHTML = `<div class="msg msg-error">${esc(data.error)}</div>`; btnConfirmar.disabled = false; return; }
    msgEl.innerHTML = '<div class="msg msg-ok">Miembro vetado.</div>';
    if (btnDisparador){
      btnDisparador.disabled = true;
      btnDisparador.style.opacity = '.6';
      btnDisparador.textContent = '🚫 Vetado';
    }
  }catch(err){
    msgEl.innerHTML = `<div class="msg msg-error">Error de conexión: ${esc(err.message)}</div>`;
    btnConfirmar.disabled = false;
  }
}


/**
 * _obtenerVistaInactivos(afterEl)
 * FIX (1-sep-2026, pedido usuario — "la vista de inactivos es muy pobre...
 * y no deberían mostrarse como un simple pop-up"): reemplaza el overlay
 * flotante anterior (_renderCuentasInactivasOverlay, ver historial) por
 * una sección normal insertada en el flujo de la página, justo después
 * de la grilla de clanes — se comporta como cualquier otra sección del
 * sitio (Directorio, Ingresos recientes, etc.) en vez de un modal chico.
 * Se crea una sola vez de forma perezosa y se reutiliza entre clics.
 */
function _obtenerVistaInactivos(afterEl){
  let section = document.getElementById('inactivosVista');
  if (!section){
    section = document.createElement('section');
    section.id = 'inactivosVista';
    section.className = 'card';
    section.style.marginTop = '20px';
    section.style.display = 'none';
    /* FIX (01-sep-2026, pedido usuario — "la sección negra tiene el
     * texto muy pegado al contenedor, debe estar centrado... justificado
     * dentro de su contenedor y el contenedor al centro"): antes el
     * título/descripción y el botón Cerrar quedaban en las dos puntas de
     * una fila que ocupa el ANCHO COMPLETO de la tarjeta (justify-content:
     * space-between sobre un contenedor tan ancho como el resto del
     * sitio) — con una descripción corta, eso se veía como texto pegado
     * al borde izquierdo con un vacío enorme a la derecha. Ahora el
     * título y la descripción viven en un bloque propio, centrado y con
     * ancho máximo (max-width + margin:auto), y el botón Cerrar se
     * posiciona aparte en la esquina superior derecha de la tarjeta en
     * vez de compartir fila — así el contenedor de texto queda centrado
     * en la tarjeta y el texto dentro de él, justificado a su propio
     * ancho, no al ancho total de la tarjeta. */
    /* FIX (08-sep-2026, pedido usuario — "la frase de 'Miembros que
     * salieron...' está partida sin necesidad, en escritorio cabe
     * completa en una línea; asegúrate de no inducir errores en
     * móvil"): el max-width fijo de 560px cortaba la frase aunque
     * sobrara espacio horizontal en pantallas anchas. Se sube a 760px
     * (suficiente para que entre completa en una sola línea en la
     * mayoría de anchos de escritorio) y se marca el párrafo con
     * data-fit-line, el mismo mecanismo que ya usa fitOneLine() más
     * abajo en este archivo (ver docblock de fitOneLine): si el ancho
     * real disponible no alcanza ni reduciendo la letra hasta 9px
     * (pantallas angostas / móvil), se abandona el modo "una sola
     * línea" y vuelve al párrafo normal (puede ocupar 2+ líneas, tamaño
     * original) — así nunca se desborda ni se ve cortado en móvil.
     * fitOneLine() se invoca explícitamente cada vez que esta vista se
     * abre (ver click de las tarjetas, más abajo) porque al crearse la
     * sección está en display:none y clientWidth mediría 0. */
    section.innerHTML = `
      <div style="text-align:right; margin-bottom:8px;">
        <button type="button" class="btn btn-ghost" id="inactivosVistaCerrar">Cerrar ✕</button>
      </div>
      <div style="max-width:760px; margin:0 auto 18px; text-align:center;">
        <div class="eyebrow" id="inactivosVistaTitulo">Cuentas inactivas</div>
        <p class="text-dim" data-fit-line style="font-size:13px; margin-top:6px;">
          Miembros que salieron de los 4 clanes de la Familia (renuncia, expulsión, vencimiento, etc.).
          Solo visible para administradores.
        </p>
      </div>
      <div id="inactivosVistaLista"></div>`;
    afterEl.parentNode.insertBefore(section, afterEl.nextSibling);
    section.querySelector('#inactivosVistaCerrar').addEventListener('click', () => { section.style.display = 'none'; });
  }
  return section;
}


/**
 * FIX (07-sep-2026, pedido usuario — ver docblock de _filaInactivoHtml):
 * la lista de cuentas inactivas deja de pintar <div class="inactivo-row">
 * sueltos y ahora arma una tabla real (.inactivos-table) con su propio
 * encabezado (Nombre / Nom_Multi / Nivel / Copas), igual en espíritu al
 * ROSTER_COLUMNAS de directorio.html — así cada valor cae exactamente
 * debajo de su encabezado en vez de depender de que el ancho de un flex
 * "cuadre" a ojo.
 */
function _renderVistaInactivos(section, titulo, cuentas){
  section.querySelector('#inactivosVistaTitulo').textContent = titulo;
  const listaEl = section.querySelector('#inactivosVistaLista');
  if (!cuentas.length){
    listaEl.innerHTML = '<div class="empty">No hay cuentas en este grupo.</div>';
    return;
  }
  listaEl.innerHTML = `
    <div class="inactivos-table-wrap">
      <table class="inactivos-table">
        <thead>
          <tr>
            <th class="ia-th-nombre">Nombre</th>
            <!-- FIX (07-sep-2026, pedido usuario — "en cualquier lugar que
                 la web requiera mostrar algo de Nom_Multi y tenga que
                 mostrar el encabezado, no se debe mostrar como Nom_Multi,
                 sino como 'Jugador', esto es exclusivo para fines visuales
                 en la web. 'Jugador' en el backend hace referencia a otra
                 cosa, no se debe confundir"): el encabezado visible dice
                 "Jugador", pero el dato sigue siendo c.nomMulti (Nom_Multi)
                 y así se mantienen las clases/variables internas
                 (ia-th-nommulti, ia-td-nommulti, nomMultiTxt) — NUNCA
                 renombrar esas referencias internas a "jugador", porque en
                 el backend (hoja Directorio/columna DC.JUGADOR) "Jugador"
                 ya identifica otra cosa distinta de Nom_Multi. -->
            <th class="ia-th-nommulti">Jugador</th>
            <th class="ia-th-nivel">Nivel</th>
            <th class="ia-th-copas">Copas</th>
            <th class="ia-th-acciones"></th>
          </tr>
        </thead>
        <tbody>
          ${cuentas.map(_filaInactivoHtml).join('')}
        </tbody>
      </table>
    </div>`;
  // FIX (18-sep-2026, pedido usuario -- "ninguna de las tablas debe tener
  // la barra nativa"): .inactivos-table-wrap usaba scroll nativo sin
  // ninguna barra restyleada -- ver activarBarraScrollTabla() más arriba
  // en este mismo archivo.
  const inactivosWrap = listaEl.querySelector('.inactivos-table-wrap');
  if (inactivosWrap) activarBarraScrollTabla(inactivosWrap);
  listaEl.querySelectorAll('.js-inactivo-vetar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.inactivo-row');
      const fila = row.nextElementSibling;
      const wrapDiv = fila.querySelector('.js-inactivo-vetar-wrap');
      _toggleFormVetarInactivo(wrapDiv, row.dataset.inactivoTag, btn, fila);
    });
  });
}


/**
 * agregarTarjetaCuentasInactivasSiAdmin(grid)
 * Si hay un admin con sesión iniciada (esAdminLogueado()), agrega DOS
 * tarjetas junto a las 4 de clanes con las cuentas inactivas de la
 * Familia — visibles SOLO para admins, aunque la página se visite desde
 * el mismo link que usa cualquier visitante (pedido del PDF de diseño,
 * 28-ago-2026; dividido en 2 tarjetas el 31-ago-2026: "eso se debe partir
 * en 2, una tarjeta para cuentas inactivas de admins y otra tarjeta para
 * cuentas inactivas en general"). Conecta con el endpoint real del
 * backend (34_Web_API.gs, FASE 7, 29-ago-2026): 'webAdminCuentasInactivas'
 * (GET autenticado, vía apiGetAuth) — devuelve { ok, cuentas:[{tag,nombre,
 * clan,esAdmin}] }.
 * FIX (05-sep-2026, pedido usuario — "Inactivos (Admin) sigue vacío"):
 * comentario actualizado — el backend YA manda `esAdmin` desde el
 * 02-sep-2026 (ver docblock de _webAdminCuentasInactivas(), 34_Web_API.gs);
 * la tarjeta seguía en 0 por un bug de índices de columna en el backend
 * (leía la hoja física Directorio con el ancho/esquema equivocado), ya
 * corregido ahí — este archivo no necesitaba ningún cambio, la lectura
 * defensiva de `c.esAdmin` de acá abajo ya estaba correcta y se deja tal
 * cual. Cada tarjeta es clicable y abre/cierra la misma vista
 * inline (_renderVistaInactivos) — nunca muestra Celular ni ningún otro
 * dato sensible, solo nombre/tag/clan (+ RoyaleAPI/CWStats/Vetar cuando
 * corresponda, ver _filaInactivoHtml).
 *
 * FIX (16-sep-2026, pedido usuario — "centra los datos señalados" +
 * "quita la parte de 'ver directorio'" en las tarjetas Inactivos (Admins)/
 * Inactivos (General), ver captura): insignia y título quedan centrados
 * (mismo criterio que clanCardHtml() de arriba); "Solo visible para
 * administradores" no estaba marcado, se deja igual. El pie de la
 * tarjeta ya no dice "· ver directorio →" (esa acción de click siempre
 * existió — la tarjeta entera es clicable y abre la vista inline, ver el
 * listener más abajo — el texto era solo una pista visual redundante,
 * pedido quitarla).
 */
async function agregarTarjetaCuentasInactivasSiAdmin(grid){
  if (!grid || !esAdminLogueado()) return;
  try{
    const data = await apiGetAuth('webAdminCuentasInactivas');
    if (!data || data.error || !Array.isArray(data.cuentas) || !data.cuentas.length) return;
    const todas = data.cuentas;
    const cuentasAdmin   = todas.filter(c => !!c.esAdmin);
    const cuentasGeneral = todas.filter(c => !c.esAdmin);
    const vista = _obtenerVistaInactivos(grid);

    const tarjeta = (label, icono, cuentas, tituloVista) => {
      const div = document.createElement('div');
      div.className = 'card card-hover clan-card';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.cursor = 'pointer';
      div.innerHTML = `
        <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
          <span class="badge badge-purple">${icono} ${esc(label)}</span>
        </div>
        <h3 style="font-size:20px; text-align:center;">${esc(label)}</h3>
        <!-- FIX (16-sep-2026 v3, pedido usuario — "centra la parte de
             inactivos (admin y no admin) que dice 'Solo visible para
             administradores'"): faltaba text-align:center (el resto del
             bloque — insignia y título — ya estaba centrado desde el FIX
             del 16-sep-2026 anterior, esta línea quedó afuera por error). -->
        <div class="text-faint" style="font-family:var(--f-mono); font-size:12px; margin-top:4px; text-align:center;">Solo visible para administradores</div>
        <div style="flex:1; min-height:8px;"></div>
        <div style="font-family:var(--f-mono); font-size:13px; border-top:1px solid var(--line); padding-top:12px; color:var(--text-dim); text-align:center;">
          ${fmtNum(cuentas.length)} cuenta(s) inactiva(s)
        </div>`;
      div.addEventListener('click', () => {
        const yaAbiertaEnEsteGrupo = vista.style.display !== 'none' && vista.dataset.grupo === tituloVista;
        if (yaAbiertaEnEsteGrupo){ vista.style.display = 'none'; return; }
        vista.dataset.grupo = tituloVista;
        _renderVistaInactivos(vista, tituloVista, cuentas);
        vista.style.display = 'block';
        // FIX (08-sep-2026): recién acá clientWidth es real (la sección
        // ya no está en display:none), así que fitOneLine() puede medir
        // correctamente si la frase entra en una línea o debe volver a
        // párrafo normal — ver comentario en _obtenerVistaInactivos().
        fitOneLine(vista.querySelector('[data-fit-line]'));
        vista.scrollIntoView({ behavior:'smooth', block:'nearest' });
      });
      return div;
    };

    grid.appendChild(tarjeta('Inactivos (Admins)', '🛡️', cuentasAdmin, 'Cuentas inactivas — Administradores'));
    grid.appendChild(tarjeta('Inactivos (General)', '🚫', cuentasGeneral, 'Cuentas inactivas — General'));
  }catch(err){
    // Defensivo: si falla la sesión o la llamada (token vencido, etc.),
    // no debe romper la carga de las 4 tarjetas de clanes para nadie.
  }
}
