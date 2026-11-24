'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (23-nov-2026, pedido de la usuaria): «en los cuadritos de las tarjetas de ingresos recientes de directorio, agrega un
// cuadrito para ataques promedio, medallas promedio y barcos promedio». Cada tarjeta de «Ingresos recientes» trae, debajo de
// Ataques / Medallas / Barcos de la semana, tres cuadritos con el PROMEDIO POR DÍA de esa semana: media de los días jugados que
// traen dato en guerraSemanaDias (un día no jugado, null, no cuenta; un 0 real sí), a 2 decimales; sin ningún dato, «—».
// Se extraen nuevoCardHtml() e ingresoStatHtml() del <script> inline REAL, con el resto de ayudantes simulados.
// LÍMITE: texto de la tarjeta; no mide el dibujo (ancho de la etiqueta en una o dos líneas) ni prueba el backend.

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
    let ingresosOcultarAdmins = false, ingresosOcultarConWsp = false, ingresosOcultarSinPendientes = false, ingresosFiltros = { barcos: false, sinBarcos: false, inactivo: false, alerta: false };
    const ingresosClanesOcultos = new Set(), claveClanMiembro = () => 'clan';
    const sinPendientesIngreso = () => false;
    const ocultoPorFiltrosIngreso = () => false;
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
    ${extraerFuncion(grande, 'ingresoStatHtml')}
    ${extraerFuncion(grande, 'fechaIngresoTexto')}
    ${extraerFuncion(grande, 'desgloseDiasHtml')}
    ${extraerFuncion(grande, 'nuevoCardHtml')}
    return nuevoCardHtml;`;
  return new Function(codigo)();
}

const DIAS = ['Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ingreso = (dias) => ({
  tag: '#A1', nombre: 'Ana', clan: 'Terna', fechaIngreso: '16/10/2026',
  guerraSemana: { ataques: 12, puntaje: 3400, barcos: 5 },
  guerraSemanaDias: dias === undefined ? { dias: DIAS, ataques: [4, 4, 4, 0], puntaje: [900, 800, 900, 800], barcos: [1, 2, 1, 1] } : dias
});
// Valor y etiqueta de un cuadrito (el espacio de no ruptura de la etiqueta se normaliza a espacio normal).
const cuadrito = (h, etiqueta) => {
  const m = h.replace(/\u00a0/g, ' ').match(new RegExp(`<div class="([^"]*)"><b>([^<]*)</b><span>${etiqueta}</span></div>`));
  return m ? { clase: m[1], valor: m[2] } : null;
};

test('la tarjeta trae los tres cuadritos de promedio por día, después de Ataques, Medallas y Barcos, en la misma cuadrícula', () => {
  const h = crear(false)(ingreso());
  assert.deepEqual(cuadrito(h, '⚔️ Ataques promedio'), { clase: 'nc-stat nc-stat-semana nc-stat-prom', valor: '3' }, '(4+4+4+0)/4');
  assert.deepEqual(cuadrito(h, '⭐ Medallas promedio'), { clase: 'nc-stat nc-stat-semana nc-stat-prom', valor: '850' }, '(900+800+900+800)/4');
  assert.deepEqual(cuadrito(h, '🚢 Barcos promedio'), { clase: 'nc-stat nc-stat-semana nc-stat-prom', valor: '1.25' }, '(1+2+1+1)/4');
  const i = h.indexOf('<div class="nc-stats-grid nc-stats-semana">');
  const fin = h.indexOf('nc-desglose');
  const cuadricula = h.slice(i, fin).replace(/\u00a0/g, ' ');
  const orden = ['⚔️ Ataques<', '⭐ Medallas<', '🚢 Barcos<', '⚔️ Ataques promedio<', '⭐ Medallas promedio<', '🚢 Barcos promedio<'].map(t => cuadricula.indexOf(t));
  assert.ok(orden.every(k => k >= 0), 'faltan cuadritos en la cuadrícula de la semana');
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b), 'primero los tres totales y después los tres promedios');
  assert.equal((cuadricula.match(/class="nc-stat /g) || []).length, 6);
});

test('el emoji va pegado a la primera palabra (espacio de no ruptura), para que no quede solo en una línea', () => {
  const h = crear(false)(ingreso());
  for (const et of ['⚔️\u00a0Ataques promedio', '⭐\u00a0Medallas promedio', '🚢\u00a0Barcos promedio']) assert.ok(h.includes(`<span>${et}</span>`), et);
});

test('un día no jugado (null) no cuenta; un 0 real sí', () => {
  const h = crear(false)(ingreso({ dias: DIAS, ataques: [4, 0, null, null], puntaje: [700, 0, null, null], barcos: [2, 1, null, null] }));
  assert.equal(cuadrito(h, '⚔️ Ataques promedio').valor, '2', '(4+0)/2, no /4');
  assert.equal(cuadrito(h, '⭐ Medallas promedio').valor, '350');
  assert.equal(cuadrito(h, '🚢 Barcos promedio').valor, '1.5');
});

test('promedio con decimales: redondeado a 2', () => {
  const h = crear(false)(ingreso({ dias: DIAS, ataques: [4, 4, 3, null], puntaje: [900, 900, 700, null], barcos: [1, 1, 1, null] }));
  assert.equal(cuadrito(h, '⚔️ Ataques promedio').valor, '3.67');
  assert.equal(cuadrito(h, '⭐ Medallas promedio').valor, '833.33');
});

test('sin ningún día con dato, o sin guerraSemanaDias: «—», nunca 0 ni NaN', () => {
  for (const dias of [null, { dias: DIAS, ataques: [null, null, null, null], puntaje: [null, null, null, null], barcos: [null, null, null, null] }, { dias: [], ataques: [], puntaje: [], barcos: [] }]) {
    const h = crear(false)(ingreso(dias));
    for (const et of ['⚔️ Ataques promedio', '⭐ Medallas promedio', '🚢 Barcos promedio']) assert.equal(cuadrito(h, et).valor, '—', et);
  }
  assert.ok(!crear(false)(ingreso(null)).includes('NaN'));
});

test('en guerra congelada (lunes a miércoles) los cuadritos de promedio siguen, con los días de la última guerra', () => {
  const h = crear(true)(ingreso());
  assert.ok(h.includes('Última guerra (hasta el domingo)'));
  assert.equal(cuadrito(h, '⚔️ Ataques promedio').valor, '3');
});

test('el CSS deja partir en dos líneas solo la etiqueta de los cuadritos de promedio; los de siempre siguen en una', () => {
  const prom = html.match(/\.nuevo-card \.nc-stat-semana\.nc-stat-prom span\{([^}]*)\}/);
  assert.ok(prom, 'falta la regla .nc-stat-semana.nc-stat-prom span');
  assert.match(prom[1], /white-space:\s*normal/);
  const base = html.match(/\.nuevo-card \.nc-stat-semana span\{([^}]*)\}/);
  assert.match(base[1], /white-space:\s*nowrap/, 'los tres cuadritos de siempre conservan la etiqueta en una línea');
});
