# Banco de medición de accesibilidad (no es parte de la web ni de la CI)

Mide `admin.html` en un Chromium real con **respuestas simuladas del backend** y una **sesión de admin simulada** (`terna_admin_token` y `terna_admin_info` en `localStorage`). Funcionamiento, resultados y límites: `Contexto_Base_Web.md` (repo `Backend`), §PF050.

Uso, desde esta carpeta (necesita red para `npm`; el binario de Chromium viene dentro de `@sparticuz/chromium`):

    npm i
    node mide_modificar.js     # Modificar torneo / sorteo: axe completo y objetivos de 24 px, a 390 y 1280 px
    node mide_tab.js           # los mismos pasos solo con teclado: foco, precarga y anillo de foco
    node mide_resolucion.js    # Resolución: lista completa cerrada y abierta, Gestionar, Cancelar, Tab hasta el formulario
    node mide_contraste.js [pagina ...]   # contraste (color-contrast) del contenido dinámico de cada página, con datos inventados
    node mide_d20_resto.js [historial|comparador|original]   # contraste del mini historial por jugador (guerra), el comparador (directorio) y «Ver original» (mensajes)
    node mide_perfil.js                   # contraste de perfil.html (admin simulado): carga base, torneos, cofres, batallas, otras cuentas, historial de guerra, vetar y ventana de sugerencias de mazo
    node mide_guerra_completo.js          # contraste de guerra.html en día de guerra con sesión de admin: pronóstico, Participación de Hoy, Log y ceros

`fixtures.js` y `fixtures_perfil.js` traen los datos inventados; la forma de cada fila sale de `Base/src/` (no se inventa a ojo: el 14-oct-2026 una fila de Valores diarios mal armada dejó sin medir «Más ataques» del top de `index`). `lib.js` sirve `Web/` con un servidor Node, abre toda petición local y aborta el resto (fuentes de Google incluidas); responde `script.google.com` con los datos de `FIX` o los que cada script pase en `fix`. `axe.js` corre axe-core y mide el tamaño de los objetivos (WCAG 2.5.8, con la excepción de espaciado).

Límites: no es Firefox ni Safari; no reemplaza al lector de pantalla; los datos son inventados, así que no prueban el backend real; con `line-height: normal` y sin las fuentes de Google los altos pueden variar uno o dos píxeles.
