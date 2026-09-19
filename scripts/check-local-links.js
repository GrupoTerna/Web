#!/usr/bin/env node
/**
 * scripts/check-local-links.js — B-15 (CI gratuito), primer paso.
 *
 * Verifica que todo href/src/action de las páginas .html que apunte a un
 * archivo LOCAL del propio sitio (no una URL externa, ni un ancla #, ni un
 * esquema especial) exista de verdad en el repo. A propósito NO revisa:
 *   - enlaces externos (http/https) — evita que el CI dependa de la red o
 *     de que un sitio de terceros esté caído justo ese día;
 *   - anclas dentro de la misma página (#seccion) — se puede sumar aparte
 *     si hace falta, es un chequeo distinto (requiere parsear ids, no rutas).
 * Y a propósito SÍ ignora todo lo que esté dentro de <script>…</script>:
 * varias páginas arman HTML dinámico con template literals de JS
 * (ej. `<a href="${esc(o.href)}">`) que no son rutas reales a validar acá
 * — intentar resolverlas como archivo daría puros falsos positivos.
 *
 * Uso: node scripts/check-local-links.js
 * Sale con código 1 y el detalle en consola si encuentra alguna ruta rota.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

const ATTR_RE = /\b(?:href|src|action)\s*=\s*"([^"]*)"/g;
const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

function esRutaLocalRevisable(v) {
  if (!v) return false;
  if (/^([a-z]+:)?\/\//i.test(v)) return false;          // externo (http/https) o protocolo-relativo
  if (/^(mailto|tel|javascript|data):/i.test(v)) return false;
  if (v.startsWith('#')) return false;                     // ancla en la misma página
  if (v.startsWith('${') || v.includes('${')) return false; // placeholder de template literal que se coló
  return true;
}

let revisadas = 0;
let errores = 0;

for (const file of HTML_FILES) {
  const full = path.join(ROOT, file);
  const html = fs.readFileSync(full, 'utf8').replace(SCRIPT_RE, '');
  let m;
  while ((m = ATTR_RE.exec(html))) {
    const raw = m[1];
    if (!esRutaLocalRevisable(raw)) continue;
    const limpio = raw.split(/[?#]/)[0]; // corta query string / ancla
    if (!limpio) continue;
    revisadas++;
    const destino = path.resolve(ROOT, limpio);
    if (!fs.existsSync(destino)) {
      console.error(`✗ ${file}: ruta local rota "${raw}"`);
      errores++;
    }
  }
}

if (errores > 0) {
  console.error(`\n${errores} ruta(s) local(es) rota(s) de ${revisadas} revisada(s).`);
  process.exit(1);
}
console.log(`OK: ${revisadas} ruta(s) local(es) verificada(s) en ${HTML_FILES.length} archivo(s) HTML, sin roturas.`);
