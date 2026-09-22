'use strict';

/*
 * load-browser-script.js — helper de tests (B-15, tanda 1: tests unitarios).
 *
 * Los scripts de assets/js/** son código de navegador clásico (sin
 * import/export, pensados para cargarse con <script src> en orden fijo en
 * cada .html) — no son módulos de Node. Para poder testear sus funciones
 * puras (esc, fmtNum, etc.) sin modificar esos archivos ni arrastrar un DOM
 * completo, este helper lee el archivo tal cual vive en el repo y lo
 * ejecuta con el módulo nativo `vm` en un sandbox nuevo y vacío. Las
 * `function` declaradas en la raíz del archivo (no las `const`/`let`)
 * quedan disponibles como propiedades del objeto devuelto, igual que
 * quedarían como funciones globales al cargarlo en el navegador.
 *
 * No requiere dependencias nuevas: `vm`, `fs` y `path` son del propio Node.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/**
 * @param {string} relPath Ruta del script relativa a la raíz del repo (ej. 'assets/js/util.js').
 * @returns {object} El sandbox ya ejecutado: sandbox.nombreDeFuncion(...) para llamar cualquier función de ese archivo.
 */
function loadBrowserScript(relPath){
  const fullPath = path.join(__dirname, '..', relPath);
  const codigo = fs.readFileSync(fullPath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox, { filename: fullPath });
  return sandbox;
}

module.exports = { loadBrowserScript };
