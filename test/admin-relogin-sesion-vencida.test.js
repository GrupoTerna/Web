'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// NUEVO (5-nov-2026, pedido de la usuaria: «cuando la sesión vence o la cierro e ingreso mis datos en la misma pestaña sin recargar, siempre da error; tengo que recargar para volver a intentar»).
// Causa: tras vencer la sesión, el panel tiene peticiones en cola y otras que se encadenan solas (cargarNomMultisAdmins().then(cargarAscensosEditables), etc.), armadas SIN token o con el viejo. Salen detrás
// del login y su «Sesión inválida» llegaba justo después de ingresar: mostrarLogin() borraba el token NUEVO y volvía a pintar el error. Recargar vaciaba la cola y por eso entonces sí funcionaba.
// Arreglo: api.js marca cada respuesta con el token que se envió (data._tokenEnviado, no enumerable) y manejarRespuestaAuth() de admin.html ignora las respuestas de la sesión anterior y las que llegan
// con un login en curso. Se extrae la función REAL de admin.html entre marcadores y se corre api.js real en un sandbox.
// LÍMITE: fetch y localStorage simulados; no reproduce la cola real contra Apps Script ni un navegador real.

const HTML = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const API = fs.readFileSync(path.join(__dirname, '..', 'assets/js/core/api.js'), 'utf8');
const ini = HTML.indexOf('let iniciandoSesion = false;');
const fin = HTML.indexOf('function campoMinTSegunRango', ini);
assert.ok(ini >= 0 && fin > ini, 'marcadores de manejarRespuestaAuth() no encontrados (¿se reorganizó admin.html?)');
const CODIGO_AUTH = HTML.slice(ini, fin);

function armar({ tokenInicial } = {}){
  const datos = tokenInicial ? { terna_admin_token: tokenInicial } : {};
  const local = { getItem: k => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); }, removeItem: k => { delete datos[k]; } };
  const sandbox = {
    localStorage: local, sessionStorage: { getItem: () => null, setItem(){}, removeItem(){} }, URLSearchParams, setTimeout, console,
    fetch: async () => ({ json: async () => ({ ok: false, error: 'Sesión inválida o vencida. Vuelve a iniciar sesión.' }) }),
    mostrados: [], cerrandoSesion: false
  };
  vm.createContext(sandbox);
  vm.runInContext("const WEBAPP_URL = 'https://ejemplo.test/exec'; const WEB_MEMBER_TOKEN = 'PUB';", sandbox);
  vm.runInContext(API, sandbox, { filename: 'api.js' });
  vm.runInContext(`var SESSION_KEY = 'terna_admin_token'; function mostrarLogin(msg){ localStorage.removeItem(SESSION_KEY); mostrados.push(msg); } ${CODIGO_AUTH}`, sandbox);
  return { sandbox, datos };
}

test('api.js: apiGetAuth() marca la respuesta con el token enviado, sin que se vea al serializar ni comparar', async () => {
  const { sandbox } = armar({ tokenInicial: 'VIEJO' });
  const data = await sandbox.apiGetAuth('webAdminX', {});
  assert.equal(data._tokenEnviado, 'VIEJO');
  assert.ok(!Object.keys(data).includes('_tokenEnviado'), 'no enumerable');
  assert.ok(!JSON.stringify(data).includes('_tokenEnviado'), 'no sale al serializar');
});

test('api.js: sin sesión guardada la marca es cadena vacía; apiPost() marca solo si el cuerpo trae sessionToken', async () => {
  const { sandbox } = armar();
  assert.equal((await sandbox.apiGetAuth('webAdminX', {}))._tokenEnviado, '');
  assert.equal((await sandbox.apiPost('webAdminY', { sessionToken: 'T1' }))._tokenEnviado, 'T1');
  assert.equal((await sandbox.apiPost('webLogin', { celular: '1', clave: '2' }))._tokenEnviado, undefined, 'webLogin no se marca');
});

test('reproducción: una petición armada SIN token que responde «sesión inválida» después de un login NO borra la sesión nueva', async () => {
  const { sandbox, datos } = armar();                              // sesión vencida: no hay token guardado
  const tardia = await sandbox.apiGetAuth('webAdminAscensosEditables', {}); // petición encadenada, armada sin token
  datos.terna_admin_token = 'NUEVO';                                // el login terminó bien mientras tanto
  assert.equal(sandbox.manejarRespuestaAuth(tardia), true, 'se da por atendida');
  assert.equal(datos.terna_admin_token, 'NUEVO', 'la sesión nueva sigue guardada');
  assert.equal(sandbox.mostrados.length, 0, 'no se vuelve a pintar el login con el error');
});

test('una petición enviada con el token viejo que responde «sesión inválida» tampoco toca la sesión nueva', async () => {
  const { sandbox, datos } = armar({ tokenInicial: 'VIEJO' });
  const tardia = await sandbox.apiGetAuth('webAdminX', {});         // sale con VIEJO
  datos.terna_admin_token = 'NUEVO';
  sandbox.manejarRespuestaAuth(tardia);
  assert.equal(datos.terna_admin_token, 'NUEVO');
  assert.equal(sandbox.mostrados.length, 0);
});

test('con un login en curso (iniciandoSesion) las respuestas de la sesión anterior no pintan el error sobre «Conectando…»', async () => {
  const { sandbox } = armar();
  const resp = await sandbox.apiGetAuth('webAdminX', {});
  vm.runInContext('iniciandoSesion = true;', sandbox);
  assert.equal(sandbox.manejarRespuestaAuth(resp), true);
  assert.equal(sandbox.mostrados.length, 0);
});

test('sin cambios para el caso normal: sesión vencida de verdad (mismo token) sí lleva al login con el aviso', async () => {
  const { sandbox, datos } = armar({ tokenInicial: 'ACTUAL' });
  const resp = await sandbox.apiGetAuth('webAdminX', {});           // token enviado = guardado = ACTUAL
  assert.equal(sandbox.manejarRespuestaAuth(resp), true);
  assert.equal(sandbox.mostrados.length, 1);
  assert.match(sandbox.mostrados[0], /Sesión inválida/);
  assert.equal(datos.terna_admin_token, undefined);
});

test('y sin marca (respuesta de otro origen) se comporta como antes: lleva al login', () => {
  const { sandbox } = armar({ tokenInicial: 'ACTUAL' });
  assert.equal(sandbox.manejarRespuestaAuth({ ok: false, error: 'Sesión vencida' }), true);
  assert.equal(sandbox.mostrados.length, 1);
});

test('el cierre de sesión (cerrandoSesion) sigue silenciando el aviso', () => {
  const { sandbox } = armar({ tokenInicial: 'ACTUAL' });
  vm.runInContext('cerrandoSesion = true;', sandbox);
  assert.equal(sandbox.manejarRespuestaAuth({ ok: false, error: 'Sesión inválida' }), true);
  assert.equal(sandbox.mostrados.length, 0);
});
