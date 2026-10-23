'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// NUEVO (22-oct-2026, pedido de la usuaria: ícono del mini historial en la tabla del Directorio; §PF169).
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
  assert.deepEqual(filas.map(f => f[5]), ['800', '0', '600'], 'del día más reciente al más antiguo; medallas del día, no acumuladas (sáb 1400-600=800, vie 600-600=0, jue 600)');
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

// NUEVO (22-oct-2026, tanda 1 de Consolidado_Mini_Historial_y_Perfil.md): N°, Fecha como 22/10/2026, Día en una letra, color de la fila según los ataques y sombreado alternado por semana.
test('la tabla del jugador lleva N°, Fecha dd/mm/aaaa, Día J/V/S/D, colores por ataques (1 a 3 en amarillo) y semanas alternadas', async () => {
  const w = cargar({ a: [
    { fecha: '2026-10-01', ataques: 4, fame: 100, barcos: 0 }, // jue, semana lun 28-sep
    { fecha: '2026-10-04', ataques: 0, fame: 100, barcos: 0 }, // dom, misma semana
    { fecha: '2026-10-08', ataques: 3, fame: 200, barcos: 0 }, // jue, semana lun 05-oct
    { fecha: '2026-10-09', ataques: 2, fame: 200, barcos: 0 }, // vie
    { fecha: '2026-10-10', ataques: 1, fame: 200, barcos: 0 }, // sáb: con 1 ataque también es amarillo (P1 respondida el 22-oct-2026)
    { fecha: '2026-10-15', ataques: 4, fame: 300, barcos: 0 }, // jue, semana lun 12-oct
  ] });
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  const cab = [...w.document.querySelectorAll('#histCuerpo .hist-tabla thead th')].map(th => th.textContent);
  assert.deepEqual(cab, ['N°', 'Fecha', 'Día', 'Ataques', 'Barcos', 'Medallas']);
  const trs = [...w.document.querySelectorAll('#histCuerpo .hist-tabla tbody tr')];
  const cel = trs.map(tr => [...tr.children].map(td => td.textContent));
  assert.deepEqual(cel.map(f => f[0]), ['1', '2', '3', '4', '5', '6'], 'N° automático');
  assert.deepEqual(cel.map(f => f[1].replace(/ ·.*$/, '')), ['15/10/2026', '10/10/2026', '09/10/2026', '08/10/2026', '04/10/2026', '01/10/2026']);
  assert.deepEqual(cel.map(f => f[2]), ['J', 'S', 'V', 'J', 'D', 'J']);
  const col = tr => ['hist-a4', 'hist-a13', 'hist-cero'].find(c => tr.classList.contains(c)) || '';
  assert.deepEqual(trs.map(col), ['hist-a4', 'hist-a13', 'hist-a13', 'hist-a13', 'hist-cero', 'hist-a4']);
  assert.deepEqual(trs.map(tr => tr.classList.contains('hist-sem-b')), [false, true, true, true, false, false], 'solo la semana del medio va sombreada');
});
