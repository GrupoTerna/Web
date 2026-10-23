'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (19-oct-2026, pedido de la usuaria; §PF125): de lunes a miércoles el backend manda guerraCongelada=true
// en webIngresosRecientes y la tarjeta de Ingresos recientes rotula «Última guerra (hasta el domingo)» en vez de
// «Semana actual». La cuadrícula (Ataques, Medallas y Barcos) se dibuja con lo que mande guerraSemanaDias.
// Se extrae nuevoCardHtml() del <script> inline REAL (si se renombra, falla a propósito) con ayudantes simulados.
// LÍMITE: no prueba el backend (Apps Script) ni un navegador.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grande = scripts.find(t => t.includes('function nuevoCardHtml'));
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

function crear(congelada){
  const codigo = `
    let ingresosOcultarAdmins = false, ingresosOcultarConWsp = false;
    const tieneWspIngreso = () => false, botonHistJugador = () => '';
    let ingresosGuerraCongelada = ${congelada ? 'true' : 'false'};
    const esc = v => String(v == null ? '' : v);
    const fmtNum = v => String(v);
    const urlValida = () => false;
    const enlaceJugador = n => esc(n);
    const ICONO_ROYALEAPI = '', ICONO_CWSTATS = '';
    const fmtFechaVigenciaCorta = v => esc(v);
    const claveIngreso = n => (n && n.tag) || '';
    const primeraLetraFiltro = () => 'A';
    const ingresoIncluido = () => true;
    const esCuentaAdminIngreso = () => false;
    const ingBadgeRivalHtml = () => '';
    const ingresoStatHtml = (v, label) => '<div class="nc-stat">' + esc(v) + ' ' + esc(label) + '</div>';
    ${extraerFuncion(grande, 'fechaIngresoTexto')}
    ${extraerFuncion(grande, 'desgloseDiasHtml')}
    ${extraerFuncion(grande, 'nuevoCardHtml')}
    return nuevoCardHtml;`;
  return new Function(codigo)();
}

const INGRESO = {
  tag: '#A1', nombre: 'Ana', clan: 'Terna', fechaIngreso: '16/10/2026',
  guerraSemana: { ataques: 12, puntaje: 3400, barcos: 5 },
  guerraSemanaDias: { dias: ['Jueves', 'Viernes', 'Sábado', 'Domingo'], ataques: [4, 4, 4, 0], puntaje: [900, 800, 900, 800], barcos: [1, 2, 1, 1] }
};

test('congelada: rotula «Última guerra (hasta el domingo)» y conserva la cuadrícula con los datos del domingo', () => {
  const h = crear(true)(INGRESO);
  assert.ok(h.includes('Última guerra (hasta el domingo)'));
  assert.ok(!h.includes('Semana actual'));
  assert.ok(h.includes('nc-desglose'), 'la cuadrícula diaria debe dibujarse');
  assert.ok(h.includes('⚔️ Ataques') && h.includes('⭐ Medallas') && h.includes('🚢 Barcos'));
});

test('sin congelar (día de guerra): sigue el rótulo «Semana actual»', () => {
  const h = crear(false)(INGRESO);
  assert.ok(h.includes('Semana actual'));
  assert.ok(!h.includes('Última guerra'));
});
