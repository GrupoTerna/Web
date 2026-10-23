'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (23-oct-2026, §PF166): botón «Actualizar» de «Ingresos recientes» en directorio.html (solo admins con la Función «Actualizar roster»).
// Se prueba el texto del resumen (función real extraída del <script>) y, como texto, que el botón nazca oculto y que solo un camino lo muestre.
// LÍMITE: no se prueba un navegador real ni el backend.

const html = fs.readFileSync(path.join(__dirname, '..', 'directorio.html'), 'utf8');
const grande = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes('function resumenActualizacionIngresos'));
assert.ok(grande, 'no se encontró resumenActualizacionIngresos en directorio.html');

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

const resumen = new Function(`
  const claveIngreso = n => (n && n.tag) || '';
  ${extraerFuncion(grande, 'resumenActualizacionIngresos')}
  return resumenActualizacionIngresos;
`)();

const H = [{ semana: 1 }];
const lista = [
  { tag: '#A', nombre: 'Ana', historialSemanal: H },
  { tag: '#B', nombre: 'Beto', historialSemanal: [] },
  { tag: '#C', nombre: 'Carla' }
];

test('sin miembros nuevos: cuenta cuántos tienen datos para las gráficas', () => {
  const t = resumen(new Set(['#A', '#B', '#C']), lista);
  assert.match(t, /^Sin miembros nuevos/);
  assert.match(t, /1 de 3 ingresos tienen datos/);
});

test('con miembros nuevos: dice cuántos traen datos y nombra a los que no', () => {
  const t = resumen(new Set(['#A']), lista);
  assert.match(t, /^2 miembros nuevos: 0 con datos para las gráficas y 2 sin datos todavía \(Beto, Carla\)\.$/);
});

test('un nuevo con datos y uno sin datos', () => {
  const t = resumen(new Set(['#B', '#C']), lista);
  assert.equal(t, '1 miembro nuevo: 1 con datos para las gráficas.');
  assert.match(resumen(new Set(['#A', '#C']), lista), /1 miembro nuevo: 0 con datos para las gráficas y 1 sin datos todavía \(Beto\)\./);
});

test('sin lista previa no inventa quién es nuevo', () => {
  const t = resumen(new Set(), lista);
  assert.equal(t, '1 de 3 ingresos tienen datos para las gráficas.');
});

test('el botón nace oculto y un solo camino lo muestra, después de validar la Función', () => {
  assert.match(html, /<button[^>]*id="ingActualizarBtn"[^>]*\shidden[\s>]/);
  const apariciones = html.match(/btn\.hidden = false/g) || [];
  assert.equal(apariciones.length, 1);
  const f = extraerFuncion(grande, 'mostrarBotonActualizarIngresos');
  assert.ok(f.indexOf("indexOf('Actualizar roster')") < f.indexOf('btn.hidden = false'), 'debe validar el permiso antes de mostrarlo');
  assert.ok(f.indexOf('esAdminLogueado()') < f.indexOf('webAdminMisPermisos'), 'sin sesión no debe ni consultar permisos');
});

test('la recarga tras actualizar pide el roster fresco y no usa el estático', () => {
  const c = extraerFuncion(grande.length ? html : html, 'cargarIngresosRecientes');
  assert.match(c, /fresco \? apiGet\('webRoster', null, \{ sinCache: true \}\)/);
});
