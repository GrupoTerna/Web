'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (18-oct-2026, §PF115): respaldo local comprimido de los JSON estáticos (api.js:
// apiBackupEstaticoGuardar / apiBackupEstaticoLeer). jsdom no trae CompressionStream ni Blob.stream():
// se les pasa el de Node, que es el mismo estándar que usan los navegadores.
// LÍMITE: prueba la lógica con localStorage de jsdom y la compresión de Node. No prueba un navegador real
// (Chrome, Safari, Firefox) ni la cuota real de localStorage.

const URL_G = 'https://raw.githubusercontent.com/GrupoTerna/Web/data/guerra.json';
const HORA = 60 * 60 * 1000;
const hace = (ms) => new Date(Date.now() - ms).toISOString();

function montar({ conCompresion = true } = {}){
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], '');
  if (conCompresion){
    window.CompressionStream = CompressionStream;
    window.DecompressionStream = DecompressionStream;
  }
  window.Blob = Blob;
  window.Response = Response;
  return window;
}

const guerra = (extra = {}) => ({ _publicadoEn: hace(1 * HORA), ctx: { periodIndex: 17 }, filas: Array.from({ length: 3000 }, (_, i) => ({ tag: '#T' + i, nombre: 'Jugador ' + i, ataques: i % 17 })), ...extra });

test('guardar y leer devuelven el mismo archivo y la misma fecha; lo guardado va comprimido', async () => {
  const w = montar();
  const j = guerra();
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G + '?t=123', j), true);
  const crudo = w.localStorage.getItem('terna_backup_est_guerra.json');
  assert.ok(crudo, 'debe existir la entrada');
  assert.equal(JSON.parse(crudo).z, 'gzip-b64');
  assert.ok(crudo.length < JSON.stringify(j).length / 3, 'comprimido debe ocupar menos de la tercera parte');
  const l = await w.apiBackupEstaticoLeer(URL_G);
  assert.deepEqual(JSON.parse(JSON.stringify(l.est)), j);
  assert.equal(l.pub.getTime(), new Date(j._publicadoEn).getTime());
});

test('la clave ignora la ruta y el ?t=: la misma entrada para cualquier forma de la URL', async () => {
  const w = montar();
  await w.apiBackupEstaticoGuardar(URL_G + '?t=1', guerra());
  assert.ok(await w.apiBackupEstaticoLeer('guerra.json'));
  assert.ok(await w.apiBackupEstaticoLeer(URL_G + '?t=999'));
});

test('no reescribe si lo guardado es igual o más nuevo; sí si el archivo es más nuevo', async () => {
  const w = montar();
  const nuevo = guerra();
  let escrituras = 0;
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(k, v){ escrituras++; return original.call(this, k, v); };
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, nuevo), true);
  assert.equal(escrituras, 2); // el respaldo y su marca
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, nuevo), false); // mismo archivo
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, guerra({ _publicadoEn: hace(5 * HORA) })), false); // más viejo
  assert.equal(escrituras, 2, 'no debe volver a escribir');
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, guerra({ _publicadoEn: new Date().toISOString() })), true);
  assert.equal(escrituras, 4);
});

test('sin _publicadoEn válido no se guarda nada (no se sabe su edad)', async () => {
  const w = montar();
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, { ctx: {} }), false);
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, { _publicadoEn: 'no es fecha', ctx: {} }), false);
  assert.equal(w.localStorage.length, 0);
});

test('sin CompressionStream NO se guarda sin comprimir', async () => {
  const w = montar({ conCompresion: false });
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, guerra()), false);
  assert.equal(w.localStorage.length, 0);
});

test('sobre el tope por archivo no se guarda', async () => {
  const w = montar();
  const grande = guerra({ ruido: crypto.randomBytes(400000).toString('hex') });
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, grande), false);
  assert.equal(w.localStorage.length, 0);
});

test('cuota llena: devuelve false, no deja entradas a medias y NO borra los respaldos de apiGet()', async () => {
  const w = montar();
  w.localStorage.setItem('terna_backup_terna_cache_webRoster', JSON.stringify({ t: 1, d: { x: 1 } }));
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(k, v){
    if (String(k).startsWith('terna_backup_est_')) { const e = new Error('cuota'); e.name = 'QuotaExceededError'; throw e; }
    return original.call(this, k, v);
  };
  assert.equal(await w.apiBackupEstaticoGuardar(URL_G, guerra()), false);
  assert.equal(w.localStorage.getItem('terna_backup_est_guerra.json'), null);
  assert.equal(w.localStorage.getItem('terna_backup_est_guerra.json_t'), null);
  assert.ok(w.localStorage.getItem('terna_backup_terna_cache_webRoster'), 'el respaldo de apiGet() debe seguir');
});

test('leer con la entrada dañada o sin descompresión devuelve null y no lanza', async () => {
  const w = montar();
  assert.equal(await w.apiBackupEstaticoLeer(URL_G), null); // nada guardado
  w.localStorage.setItem('terna_backup_est_guerra.json', 'no es json');
  assert.equal(await w.apiBackupEstaticoLeer(URL_G), null);
  w.localStorage.setItem('terna_backup_est_guerra.json', JSON.stringify({ t: Date.now(), z: 'gzip-b64', d: 'AAAA' }));
  assert.equal(await w.apiBackupEstaticoLeer(URL_G), null); // bytes que no son gzip
  w.localStorage.setItem('terna_backup_est_guerra.json', JSON.stringify({ t: Date.now(), z: 'otro', d: 'x' }));
  assert.equal(await w.apiBackupEstaticoLeer(URL_G), null);
});

// §PF116: el guardado y la lectura ocurren dentro de apiGetEstaticoConEdad(), así que valen para todas las páginas.
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

test('§PF116: apiGetEstaticoConEdad() guarda la copia tras bajar bien el archivo y la devuelve (local:true) si luego falla la red', async () => {
  const w = montar();
  const j = guerra();
  w.apiGetEstatico = async () => j;
  const r1 = await w.apiGetEstaticoConEdad(URL_G + '?t=1', {});
  assert.equal(r1.local, false);
  assert.equal(r1.vigente, true);
  await esperar(1700); // el guardado se difiere ~1,5 s
  assert.ok(w.localStorage.getItem('terna_backup_est_guerra.json'), 'la copia debe haberse guardado');
  w.apiGetEstatico = async () => { throw new Error('sin red (simulado)'); };
  const r2 = await w.apiGetEstaticoConEdad(URL_G + '?t=2', {});
  assert.equal(r2.local, true);
  assert.equal(r2.vigente, true);
  assert.deepEqual(JSON.parse(JSON.stringify(r2.est)), j);
});

test('§PF116: sin red y sin copia, apiGetEstaticoConEdad() lanza el mismo error de siempre', async () => {
  const w = montar();
  w.apiGetEstatico = async () => { throw new Error('sin red (simulado)'); };
  await assert.rejects(() => w.apiGetEstaticoConEdad(URL_G, {}), /sin red/);
});

test('§PF116: un archivo con `error` o sin _publicadoEn no se guarda', async () => {
  const w = montar();
  w.apiGetEstatico = async () => guerra({ error: 'algo falló' });
  await w.apiGetEstaticoConEdad(URL_G, {});
  w.apiGetEstatico = async () => ({ ctx: {} });
  assert.equal(await w.apiGetEstaticoConEdad(URL_G, {}), null);
  await esperar(1700);
  assert.equal(w.localStorage.length, 0);
});

// Muestras mínimas con la forma que acepta cada página (tomadas de los archivos reales de la rama `data`, 18-oct-2026).
const FORMAS_VALIDAS = {
  'home.json': { clanInfo: { clanes: [{ tag: '#A' }] }, ascensos: { ascensos: [] } },
  'roster.json': { clanes: [{ tag: '#A', miembros: [] }] },
  'torneos.json': { historial: { historial: [] }, torneos: { torneos: [], ganadores: [] } },
  'guerra_top.json': { valoresDiariosSelectores: { anios: [2026] } },
  'guerra_ctx.json': { ctx: { periodIndex: 17 } },
  'guerra.json': { ctx: { periodIndex: 17 }, valoresDiariosSelectores: {} }
};
const urlDe = (n) => 'https://raw.githubusercontent.com/GrupoTerna/Web/data/' + n + '?t=1';
const con = (n, extra) => ({ _publicadoEn: hace(1 * HORA), ...FORMAS_VALIDAS[n], ...(extra || {}) });

test('§PF116: cada archivo tiene su propia clave (home, roster, torneos, guerra_top y guerra_ctx no se pisan)', async () => {
  const w = montar();
  for (const n of Object.keys(FORMAS_VALIDAS)){
    assert.equal(await w.apiBackupEstaticoGuardar(urlDe(n), con(n, { nombre: n })), true, n);
  }
  for (const n of Object.keys(FORMAS_VALIDAS)){
    const l = await w.apiBackupEstaticoLeer(n);
    assert.equal(l.est.nombre, n);
  }
});

test('§PF117: cada archivo con la forma rota NO se guarda', async () => {
  const w = montar();
  const rotos = {
    'home.json': { clanInfo: { clanes: [] } },
    'roster.json': { clanes: [] },
    'torneos.json': { torneos: { torneos: [] } }, // falta historial
    'guerra_top.json': { otra: 1 },
    'guerra_ctx.json': { ctx: null },
    'guerra.json': { filas: [1, 2, 3] }
  };
  for (const [n, forma] of Object.entries(rotos)){
    assert.equal(await w.apiBackupEstaticoGuardar(urlDe(n), { _publicadoEn: hace(1 * HORA), ...forma }), false, n);
  }
  assert.equal(w.localStorage.length, 0);
});

test('§PF117: con `error` dentro de la sección tampoco se guarda (home: clanInfo; torneos: historial)', async () => {
  const w = montar();
  assert.equal(await w.apiBackupEstaticoGuardar(urlDe('home.json'), con('home.json', { clanInfo: { error: 'x', clanes: [{ tag: '#A' }] } })), false);
  assert.equal(await w.apiBackupEstaticoGuardar(urlDe('torneos.json'), con('torneos.json', { historial: { error: 'x' } })), false);
});

test('§PF117: un archivo MÁS NUEVO pero roto no reemplaza a la copia buena', async () => {
  const w = montar();
  assert.equal(await w.apiBackupEstaticoGuardar(urlDe('roster.json'), con('roster.json', { _publicadoEn: hace(2 * HORA) })), true);
  assert.equal(await w.apiBackupEstaticoGuardar(urlDe('roster.json'), { _publicadoEn: new Date().toISOString(), clanes: [] }), false);
  const l = await w.apiBackupEstaticoLeer('roster.json');
  assert.ok(l && l.est.clanes.length === 1, 'la copia buena debe seguir');
  assert.ok(Date.now() - l.pub.getTime() > 1.5 * HORA, 'y conservar su fecha');
});

test('§PF117: una copia ya guardada con mala forma no se devuelve', async () => {
  const w = montar();
  const roto = { _publicadoEn: hace(1 * HORA), clanes: [] };
  const z = await w._gzipABase64(JSON.stringify(roto));
  w.localStorage.setItem('terna_backup_est_roster.json', JSON.stringify({ t: Date.now(), z: 'gzip-b64', d: z }));
  assert.equal(await w.apiBackupEstaticoLeer('roster.json'), null);
});

test('§PF117: un archivo que no está en la tabla solo necesita _publicadoEn y no traer error', async () => {
  const w = montar();
  assert.equal(await w.apiBackupEstaticoGuardar(urlDe('nuevo.json'), { _publicadoEn: hace(1 * HORA), x: 1 }), true);
  assert.equal(await w.apiBackupEstaticoGuardar(urlDe('nuevo2.json'), { _publicadoEn: hace(1 * HORA), error: 'x' }), false);
});
