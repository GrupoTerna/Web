'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (23-oct-2026, pedido de la usuaria: ícono del mini historial en la tabla del Directorio; §PF169).
// mini-historial.js es compartido por guerra.html y directorio.html. Aquí se carga el archivo real con jsdom, se pinta el botón 📈
// como lo hace la columna Nombre del directorio, se hace clic y se comprueba que la ventana se crea sola y muestra el historial.
// apiGet() se simula (no hay backend). LÍMITE: no prueba el CSS ni el aspecto real, solo el DOM.

function cargar(respuesta){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/mini-historial.js'], '<table><tbody><tr id="fila"><td id="celda"></td></tr></tbody></table>');
  w.eval('var _llamadas = []; window.apiGet = function(nombre, params){ _llamadas.push({ nombre, params }); return Promise.resolve(window._respuesta); };');
  w._respuesta = respuesta;
  return w;
}
const esperar = () => new Promise(r => setTimeout(r, 20));
const DATA = { a: [
  { fecha: '2026-10-01', ataques: 4, fame: 600, barcos: 0 },
  { fecha: '2026-10-02', ataques: 0, fame: 600, barcos: 0 },
  { fecha: '2026-10-03', ataques: 4, fame: 1400, barcos: 1 },
] };

test('botonHistJugador() devuelve el botón con tag y nombre escapados, y nada sin tag', () => {
  const w = cargar(DATA);
  assert.equal(w.botonHistJugador({ nombre: 'Sin tag' }), '');
  const html = w.botonHistJugador({ tag: '#ABC', nombre: 'A"B<i>' });
  assert.match(html, /class="btn-hist-jugador"/);
  assert.match(html, /data-tag="#ABC"/);
  assert.ok(!html.includes('<i>') && html.includes('A&quot;B&lt;i&gt;'));
});

test('clic en el 📈 crea la ventana, pide el historial del tag y pinta días de guerra con medallas del día', async () => {
  const w = cargar(DATA);
  assert.equal(w.document.getElementById('histFondo'), null, 'la página no trae la ventana: la crea el módulo');
  w.document.getElementById('celda').innerHTML = w.botonHistJugador({ tag: '#ABC', nombre: 'Chistris' });
  w.document.querySelector('.btn-hist-jugador').click();
  await esperar();
  const fondo = w.document.getElementById('histFondo');
  assert.ok(fondo && fondo.classList.contains('abierto'));
  assert.equal(w.document.getElementById('histTitulo').textContent, 'Chistris');
  assert.equal(w.document.getElementById('histSub').textContent, '#ABC');
  assert.deepEqual(JSON.parse(w.eval('JSON.stringify(_llamadas)')), [{ nombre: 'webHistorialGuerraComparador', params: { tag1: '#ABC', tag2: '' } }]);
  const filas = [...w.document.querySelectorAll('#histCuerpo .hist-tabla tbody tr')].map(tr => [...tr.children].map(td => td.textContent));
  assert.equal(filas.length, 3);
  assert.deepEqual(filas.map(f => f[2]), ['800', '0', '600'], 'del día más reciente al más antiguo; medallas del día, no acumuladas (sáb 1400-600=800, vie 600-600=0, jue 600)');
  assert.ok(w.document.querySelector('#histCuerpo .hist-cero'), 'el día con 0 ataques se marca');
});

test('Esc y el botón × cierran la ventana; un error del backend muestra un aviso', async () => {
  const w = cargar({ error: 'x' });
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  assert.match(w.document.getElementById('histCuerpo').textContent, /No se pudo cargar el historial/);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.ok(!w.document.getElementById('histFondo').classList.contains('abierto'));
  w.histAbrir('#ABC', 'Chistris');
  w.document.getElementById('histCerrar').click();
  assert.ok(!w.document.getElementById('histFondo').classList.contains('abierto'));
});
