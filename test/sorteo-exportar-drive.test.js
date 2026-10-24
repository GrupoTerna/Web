'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (24-oct-2026, PF228, pedido de la usuaria): el documento que baja «Descargar acta» debe ser el de Drive (.docx que devuelve el backend), con los
// ganadores de la ruleta completos (nombre, hora, premio, tickets y clan). Solo si no hay sesión o el backend falla se baja el acta simple armada en la página.
// Se extrae de sorteo.html el exportDoc() real y se ejecuta con stubs.

const html = fs.readFileSync(path.join(__dirname, '..', 'sorteo.html'), 'utf8');
const ini = html.indexOf('  function exportDoc(){');
const fin = html.indexOf('  function escapeHtml(str){');
assert.ok(ini > 0 && fin > ini, 'no se encontró exportDoc() en sorteo.html');
const codigo = html.slice(ini, fin);

function correr({ token = 'tk', respuesta }) {
  const llamadas = { local: 0, descargas: [], pedidos: [] };
  const estado = { textContent: '', style: {} };
  const document = { getElementById: (id) => (id === 'titleInput' ? { value: 'Mi sorteo' } : estado) };
  const winners = [
    { editedName: 'Ana', time: '04:18 p. m.', premio: 'Pass Royale', tickets: 3, clan: 'GXT' },
    { editedName: 'Beto', time: '04:19 p. m.', premio: '', tickets: null, clan: null }
  ];
  const fetch = (url, opt) => { llamadas.pedidos.push({ url, body: JSON.parse(opt.body) }); return respuesta(); };
  const f = new Function('document', 'localStorage', 'SESSION_KEY_SORTEO', 'WEBAPP_URL', 'prizeLimit', 'participants', 'winners', 'fetch',
    'exportDocLocal', 'descargarBlobComo', 'base64ABlob', 'slugify',
    codigo + '; return exportDoc;');
  const exportDoc = f(document, { getItem: () => token }, 'k', 'https://backend.test/exec', () => 3, [1, 2, 3, 4], winners, fetch,
    () => { llamadas.local++; }, (blob, nombre) => { llamadas.descargas.push(nombre); }, (b64) => b64, (t) => t.toLowerCase().replace(/\s+/g, '-'));
  return { exportDoc, llamadas, estado };
}
const esperar = () => new Promise((r) => setTimeout(r, 20));
const json = (obj) => Promise.resolve({ json: () => Promise.resolve(obj) });

test('PF228: con respuesta del backend baja el .docx de Drive y NO el acta simple', async () => {
  const { exportDoc, llamadas, estado } = correr({ respuesta: () => json({ ok: true, docxBase64: 'AAAA' }) });
  exportDoc();
  await esperar();
  assert.deepEqual(llamadas.descargas, ['mi-sorteo.docx']);
  assert.equal(llamadas.local, 0);
  assert.match(estado.textContent, /Documento de Drive/);
});

test('PF228: manda al backend nombre, hora, premio, tickets y clan de cada ganador', async () => {
  const { exportDoc, llamadas } = correr({ respuesta: () => json({ ok: true, docxBase64: 'AAAA' }) });
  exportDoc();
  await esperar();
  const p = llamadas.pedidos[0];
  assert.match(p.url, /accion=webAdminSorteoActualizarDocGanadores/);
  assert.equal(p.body.descargar, true);
  assert.equal(p.body.extra.premios, 3);
  assert.equal(p.body.extra.participantes, 4);
  assert.deepEqual(p.body.extra.ganadores[0], { nombre: 'Ana', hora: '04:18 p. m.', premio: 'Pass Royale', tickets: 3, clan: 'GXT' });
  assert.deepEqual(p.body.extra.ganadores[1], { nombre: 'Beto', hora: '04:19 p. m.', premio: '', tickets: null, clan: '' });
});

test('PF228: si el backend falla, baja el acta simple y dice el motivo', async () => {
  const { exportDoc, llamadas, estado } = correr({ respuesta: () => json({ ok: false, error: 'No se pudo actualizar el documento de ganadores (X).' }) });
  exportDoc();
  await esperar();
  assert.equal(llamadas.local, 1);
  assert.equal(llamadas.descargas.length, 0);
  assert.match(estado.textContent, /No se pudo actualizar el documento de ganadores \(X\)/);
});

test('PF228: si el backend responde sin .docx (backend viejo), baja el acta simple y avisa', async () => {
  const { exportDoc, llamadas, estado } = correr({ respuesta: () => json({ ok: true }) });
  exportDoc();
  await esperar();
  assert.equal(llamadas.local, 1);
  assert.match(estado.textContent, /todavía no entrega el documento de Drive/);
});
