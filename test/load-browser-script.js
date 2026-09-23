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
 *
 * AMPLIACIÓN (Fase 1 del plan de mejoras, tanda "funciones puras de
 * features/ui"): varios archivos de assets/js/features y assets/js/ui usan
 * funciones/constantes de OTROS archivos (ej. clan-card.js usa esc(),
 * fmtNum() y enlaceClan() de util.js, y CLAN_BADGES/iconoBadgeClanHtml() de
 * data/clan-badges.js). loadBrowserScript() carga un solo archivo en un
 * sandbox nuevo y vacío, así que esas dependencias quedarían indefinidas.
 * loadBrowserScripts() (plural) resuelve esto ejecutando VARIOS archivos,
 * en el orden dado, dentro de UN MISMO sandbox — igual que pasa en el
 * navegador cuando varias etiquetas <script src> comparten el mismo
 * `window`. loadBrowserScript() (singular) se deja intacta para no romper
 * los tests existentes que solo necesitan un archivo sin dependencias.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

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
  _exponerDateDelSandbox(sandbox);
  return sandbox;
}

/*
 * _exponerDateDelSandbox(sandbox)
 * Cada `vm.createContext(sandbox)` arma un "realm" de JavaScript separado
 * del de Node: tiene su PROPIO constructor Date (y Array, Object, etc.),
 * distinto del Date global de Node. Si un test hace `new Date(...)` con el
 * Date de Node y se lo pasa a una función que vive en el sandbox y que
 * internamente valida con `instanceof Date` (ej. lineasTemporalesSvg() en
 * timeline-svg.js), esa comprobación falla en silencio — no es el mismo
 * Date, aunque el objeto "se vea" idéntico. Node SÍ arma el Date del
 * contexto por dentro, pero no lo deja como propiedad propia del objeto
 * `sandbox` hasta que algo lo pide explícitamente — por eso se expone acá
 * como `sandbox.Date`, para que los tests puedan escribir
 * `new sandbox.Date(...)` cuando necesiten pasar una fecha a una función
 * que haga ese tipo de validación.
 */
function _exponerDateDelSandbox(sandbox){
  sandbox.Date = vm.runInContext('Date', sandbox);
}

/**
 * loadBrowserScripts(relPaths)
 * Igual que loadBrowserScript(), pero para un archivo que depende de
 * funciones/constantes definidas en otro(s) archivo(s) de assets/js/**.
 * @param {string[]} relPaths Rutas relativas a la raíz del repo, EN EL MISMO
 *   ORDEN en que se cargarían con <script src> en el .html real (las
 *   dependencias primero, el archivo a testear al final).
 * @returns {object} Un único sandbox con las funciones/constantes de TODOS
 *   los archivos cargados, ya resueltas entre sí (como un solo `window`).
 */
function loadBrowserScripts(relPaths){
  const sandbox = {};
  vm.createContext(sandbox);
  for (const relPath of relPaths){
    const fullPath = path.join(__dirname, '..', relPath);
    const codigo = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(codigo, sandbox, { filename: fullPath });
  }
  _exponerDateDelSandbox(sandbox);
  return sandbox;
}

/**
 * loadBrowserScriptsWithDom(relPaths, htmlBody)
 * AMPLIACIÓN (Fase 1 del plan de mejoras, 2da tanda — funciones que sí
 * manipulan el DOM real, ej. activarTecladoPuntosGrafica() de
 * timeline-svg.js, o _filaInactivoHtml()/_toggleFormVetarInactivo() de
 * inactivos.js). loadBrowserScript()/loadBrowserScripts() ejecutan el
 * código en un sandbox de `vm` SIN `document` ni `window` reales — sirven
 * solo para funciones puras. Para las que sí llaman document.getElementById,
 * querySelector, addEventListener, etc., hace falta un DOM real: esta
 * función usa `jsdom` (agregado como devDependency el 23-sep-2026, a
 * pedido del usuario, específicamente para esto) para levantar un
 * documento HTML real y correr los archivos ahí dentro con `window.eval()`,
 * en vez del sandbox vacío de `vm`.
 * @param {string[]} relPaths Rutas relativas a la raíz del repo, en el
 *   mismo orden de carga que usaría el <script src> real.
 * @param {string} [htmlBody] HTML inicial del <body> (ej. un contenedor
 *   donde el test vaya a insertar filas/tarjetas antes de llamar a la
 *   función bajo prueba). Por defecto, body vacío.
 * @returns {object} El `window` de jsdom ya ejecutado: `window.document`
 *   para el DOM, y `window.nombreDeFuncion(...)` para cualquier función de
 *   nivel raíz de los archivos cargados (`document` sale directo de
 *   `window` al desestructurar, no hace falta nada especial de este lado).
 */
function loadBrowserScriptsWithDom(relPaths, htmlBody){
  const dom = new JSDOM(
    `<!doctype html><html><body>${htmlBody || ''}</body></html>`,
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://terna.example/' }
  );
  const { window } = dom;
  for (const relPath of relPaths){
    const fullPath = path.join(__dirname, '..', relPath);
    const codigo = fs.readFileSync(fullPath, 'utf8');
    window.eval(codigo);
  }
  return window;
}

module.exports = { loadBrowserScript, loadBrowserScripts, loadBrowserScriptsWithDom };
