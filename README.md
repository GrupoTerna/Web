# Web — Familia Terna

Frontend público de Grupo Terna (comunidad de Clash Royale), publicado en GitHub Pages: <https://grupoterna.github.io/Web/>.

Son páginas HTML con JavaScript plano. **No hay paso de compilación ni empaquetador:** lo que está en `main` es lo que se publica. El backend (Apps Script sobre Google Sheets y Drive) vive en otro repositorio, `GrupoTerna/Backend`.

**Si tienes una duda sobre cómo funciona el sistema, empieza por [`Contexto_Base_Web.md`](https://github.com/GrupoTerna/Backend/blob/main/Contexto_Base_Web.md)** (repo `Backend`). Ahí está el funcionamiento del backend, del frontend y de Tampermonkey, y las decisiones tomadas, incluidas las que se probaron y se descartaron. Este repo solo guarda el código y el historial corto de cambios.

## Qué hay aquí

| Archivo o carpeta | Qué contiene |
|---|---|
| `index.html` | Portada: «Familia Terna — Comunidad Clash Royale». |
| `clan.html`, `comunidad.html`, `directorio.html`, `perfil.html` | Clan, comunidad, directorio de miembros y perfil de jugador. |
| `guerra.html` | Guerra en vivo. |
| `torneos.html` | Torneos. |
| `sorteo.html`, `mensajes.html`, `permisos.html`, `admin.html` | Páginas de administración: ruleta de sorteo, mensajes, permisos y panel de admin. `robots.txt` pide que no se indexen. |
| `404.html` | Página de error. |
| `assets/common.js`, `assets/styles.css` | Configuración y utilidades compartidas por todas las páginas, y la hoja de estilos común. |
| `assets/js/` | El resto del JavaScript compartido: `core/` (`config.js`, `api.js`, `auth.js`), `data/` (cartas y escudos), `features/`, `ui/` y `util.js`. |
| `assets/Imágenes/` | Imágenes, en carpetas por tipo (`arenas`, `badges`, `Banners`, `cards`, `chests`, `Emotes`, `Íconos`, `Logo Terna`). Cada tipo lleva `API/` (lo que se descarga solo del sistema) y `Fankit/` (lo externo, puesto a mano o clonado). |
| `sw.js`, `manifest.json` | Service Worker (solo intercepta peticiones GET del mismo origen; nunca las del backend) y manifiesto de la app instalable. |
| `test/` | Pruebas unitarias con el ejecutor nativo de Node (`node --test`). |
| `scripts/` | `check-local-links.js` (enlaces locales rotos), `conteo-css.py` (conteo de CSS por página; solo lee) y `medicion-accesibilidad/` (banco aparte, ver abajo). |
| `.github/workflows/` | CI (`ci.yml`) y Lighthouse semanal (`lighthouse.yml`). `dependabot.yml` actualiza las dependencias de CI. |
| `CHANGELOG.md` | Historial corto de cambios, de más reciente a más antiguo, y la sección «Abiertos» con lo pendiente de verificar. |

## De dónde salen los datos

Las páginas leen de dos fuentes:

1. **El Web App de Apps Script** (URL y token público en `assets/js/core/config.js`, acceso con `apiGet()` en `assets/js/core/api.js`). Tiene cuota de ejecuciones, por eso hay caché, cola y reintentos. El token está en un repo público a propósito; el nivel de exposición aceptado está explicado en el comentario de `config.js`.
2. **JSON estáticos** (`guerra.json`, `home.json`, `roster.json`, `torneos.json`, entre otros) que el bot de Apps Script publica en la rama **`data`** de este mismo repo. Se leen con `apiGetEstatico()`. Se publican automáticamente: **no se editan a mano** y no están en `main`.

Los administradores inician sesión con su celular y su clave desde `admin.html`.

## Trabajar en el repo

Hace falta Node 22.16 o superior. Las herramientas son solo de validación; no forman parte del sitio.

```
git clone https://github.com/GrupoTerna/Web.git
cd Web
npm ci
npm run check-links    # rutas locales rotas
npm run lint           # ESLint sobre assets/
npm run validate-html  # html-validate sobre las páginas
npm test               # pruebas unitarias
```

`ci.yml` corre esos cuatro pasos en cada push o PR a `main`. `lighthouse.yml` audita el sitio ya publicado cada lunes y se puede lanzar a mano desde la pestaña Actions.

Para ver una página en local basta servir la carpeta con cualquier servidor estático; las llamadas al backend usan la URL real del Web App.

**Banco de medición de accesibilidad** (`scripts/medicion-accesibilidad/`): mide en un Chromium real con respuestas simuladas del backend y datos inventados. No es parte de la web ni de la CI y no reemplaza una prueba con un jugador real. Las instrucciones están en su [`LEEME.md`](scripts/medicion-accesibilidad/LEEME.md).

## Cómo se registran los cambios

- El código se sube directo a `main`, en commits pequeños.
- El historial corto va en [`CHANGELOG.md`](CHANGELOG.md): una viñeta por cambio, con archivo y función tocados, versión de `sw.js` si aplica y el enlace a la sección correspondiente de `Contexto_Base_Web.md`.
- Cómo funciona algo, por qué se decidió así y qué se probó y se descartó va en `Contexto_Base_Web.md`, no en el changelog.
- Si cambia un archivo de `CORE_ASSETS` en `sw.js` (los que el Service Worker guarda en caché), se sube `CACHE_NAME` y se anota la versión en el comentario de `sw.js`.

## Otros repositorios

- [`GrupoTerna/Backend`](https://github.com/GrupoTerna/Backend) (público): backend en Apps Script, Tampermonkey, contexto del sistema y consolidados.
- `GrupoTerna/Script` (privado): archivos de Render; no se toca salvo que haga falta.
