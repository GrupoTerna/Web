'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (22-oct-2026, pedido de la usuaria): la tarjeta de «Ingresos recientes» de directorio.html pinta un
// ícono de WhatsApp junto a los de RoyaleAPI y CWStats cuando el backend manda tieneWsp:true (solo con sesión
// de admin). Es solo informativo: sin enlace, sin número. Se extrae nuevoCardHtml del <script> inline REAL.
// LÍMITE: se prueba el HTML generado como texto, no un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function nuevoCardHtml'));
assert.ok(grande, 'no se encontró nuevoCardHtml en directorio.html');

function extraerFuncion(src, nombre){
  const ini = src.indexOf(`function ${nombre}(`);
  assert.ok(ini >= 0, `no se encontró function ${nombre}`);
  let i = src.indexOf('{', src.indexOf(')', ini));
  let nivel = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') nivel++;
    else if (src[i] === '}'){ nivel--; if (nivel === 0) return src.slice(ini, i + 1); }
  }
  throw new Error(`llaves sin cerrar en ${nombre}`);
}
// 22-oct-2026 (§PF171): ICONO_WSP_SOLO se movió a assets/js/data/clan-badges.js (lo comparte guerra.html).
const compartido = fs.readFileSync(path.join(__dirname, '..', 'assets/js/data/clan-badges.js'), 'utf8');
const iniConst = compartido.indexOf('const ICONO_WSP_SOLO');
assert.ok(iniConst >= 0, 'no se encontró ICONO_WSP_SOLO en clan-badges.js');
const lineaConst = compartido.slice(iniConst, compartido.indexOf('\n', iniConst));
assert.ok(!grande.includes('const ICONO_WSP_SOLO'), 'directorio.html no debe redefinir ICONO_WSP_SOLO');

const construir = new Function(`
  const ICONO_ROYALEAPI = '<i-royale></i-royale>', ICONO_CWSTATS = '<i-cw></i-cw>';
  const esc = s => String(s == null ? '' : s);
  const urlValida = u => /^https:\\/\\//.test(String(u || ''));
  const ingresoIncluido = () => true, claveIngreso = n => n.tag, primeraLetraFiltro = () => 'A';
  const fechaIngresoTexto = () => '', enlaceJugador = n => n, ingBadgeRivalHtml = () => '';
  const ingresoStatHtml = () => '', desgloseDiasHtml = () => '', fmtFechaVigenciaCorta = () => '';
  let ingresosOcultarAdmins = false, ingresosGuerraCongelada = false;
  const esCuentaAdminIngreso = () => false;
  ${lineaConst}
  ${extraerFuncion(grande, 'nuevoCardHtml')}
  return nuevoCardHtml;
`)();

const base = { tag: '#AAA', nombre: 'Ana', clan: 'X', royaleApi: 'https://royaleapi.com/p', cwstats: 'https://cwstats.com/p' };

test('con tieneWsp:true sale el ícono de WhatsApp, sin enlace', () => {
  const h = construir({ ...base, tieneWsp: true });
  assert.match(h, /class="ico-wsp"/);
  assert.match(h, /<svg/);
  assert.doesNotMatch(h, /wa\.me|api\.whatsapp|href="[^"]*(wa|whats)/i);
  assert.doesNotMatch(h, /<a[^>]*ico-wsp/);
});

test('sin tieneWsp (público o sin celular) no sale el ícono', () => {
  assert.doesNotMatch(construir(base), /ico-wsp/);
  assert.doesNotMatch(construir({ ...base, tieneWsp: false }), /ico-wsp/);
});

test('el ícono sale aunque no haya RoyaleAPI ni CWStats', () => {
  const h = construir({ tag: '#B', nombre: 'Beto', clan: 'X', tieneWsp: true });
  assert.match(h, /class="links"/);
  assert.match(h, /ico-wsp/);
});
