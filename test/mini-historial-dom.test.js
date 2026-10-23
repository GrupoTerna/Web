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
  // 23-oct-2026 (tanda 1b): el nombre del título es un enlace a su perfil (nueva pestaña); el firstChild es el nombre solo.
  const enlaceTitulo = w.document.querySelector('#histTitulo a.jugador-link');
  assert.ok(enlaceTitulo, 'el nombre del título lleva enlace');
  assert.equal(enlaceTitulo.firstChild.textContent, 'Chistris');
  assert.equal(enlaceTitulo.getAttribute('href'), 'perfil.html?tag=%23ABC');
  assert.equal(enlaceTitulo.getAttribute('target'), '_blank');
  assert.equal(w.document.getElementById('histSub').textContent, '#ABC');
  assert.deepEqual(JSON.parse(w.eval('JSON.stringify(_llamadas)')).map(l => l.nombre), ['webPerfil', 'webHistorialGuerraComparador'], '23-oct-2026 (tanda 4): además del historial se pide el perfil para la cabecera');
  assert.deepEqual(JSON.parse(w.eval('JSON.stringify(_llamadas)'))[1], { nombre: 'webHistorialGuerraComparador', params: { tag1: '#ABC', tag2: '' } });
  const filas = [...w.document.querySelectorAll('#histCuerpo .hist-tabla tbody tr')].map(tr => [...tr.children].map(td => td.textContent));
  assert.equal(filas.length, 3);
  assert.deepEqual(filas.map(f => f[7]), ['800', '0', '600'], 'del día más reciente al más antiguo; medallas del día, no acumuladas (sáb 1400-600=800, vie 600-600=0, jue 600)');
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
  assert.deepEqual(cab, ['N°', 'Fecha', 'Temporada', 'Semana', 'Día', 'Ataques', 'Barcos', 'Medallas']);
  const trs = [...w.document.querySelectorAll('#histCuerpo .hist-tabla tbody tr')];
  const cel = trs.map(tr => [...tr.children].map(td => td.textContent));
  assert.deepEqual(cel.map(f => f[0]), ['1', '2', '3', '4', '5', '6'], 'N° automático');
  assert.deepEqual(cel.map(f => f[1].replace(/ ·.*$/, '')), ['15/10/2026', '10/10/2026', '09/10/2026', '08/10/2026', '04/10/2026', '01/10/2026']);
  assert.deepEqual(cel.map(f => f[4]), ['J', 'S', 'V', 'J', 'D', 'J']);
  assert.deepEqual(cel.map(f => [f[2], f[3]]), Array(6).fill(['–', '–']), 'sin temporada ni semana en la respuesta (backend viejo) las celdas muestran –');
  const col = tr => ['hist-a4', 'hist-a13', 'hist-cero'].find(c => tr.classList.contains(c)) || '';
  assert.deepEqual(trs.map(col), ['hist-a4', 'hist-a13', 'hist-a13', 'hist-a13', 'hist-cero', 'hist-a4']);
  assert.deepEqual(trs.map(tr => tr.classList.contains('hist-sem-b')), [false, true, true, true, false, false], 'solo la semana del medio va sombreada');
});

// NUEVO (23-oct-2026, tanda 1b de Consolidado_Mini_Historial_y_Perfil.md): la tabla «Comparar con» lleva N°, Fecha (dd/mm/aaaa) y Día (J/V/S/D),
// color por jugador según SUS ataques (verde 4, amarillo 1 a 3, rojo 0, sin color si no hay registro), semanas alternadas y nombres con enlace.
test('la comparación lleva N°, Fecha, Día, color por jugador, semanas alternadas y nombres con enlace', async () => {
  const w = cargar({ a: [] });
  w.document.getElementById('celda').innerHTML = w.botonHistJugador({ tag: '#ABC', nombre: 'Chistris' }) + w.botonHistJugador({ tag: '#XYZ', nombre: 'Otro' });
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  w._respuesta = {
    a: [
      { fecha: '2026-10-01', ataques: 4, fame: 100, barcos: 0 }, // jue, semana lun 28-sep
      { fecha: '2026-10-04', ataques: 0, fame: 100, barcos: 0 }, // dom, misma semana
      { fecha: '2026-10-08', ataques: 3, fame: 200, barcos: 0 }, // jue, semana lun 05-oct
    ],
    b: [
      { fecha: '2026-10-01', ataques: 2, fame: 50, barcos: 0 },
      { fecha: '2026-10-08', ataques: 1, fame: 80, barcos: 0 }, // el otro jugador no tiene registro el 04-oct
    ],
  };
  w.histComparar('#XYZ', 'Otro');
  await esperar();
  const tablas = [...w.document.querySelectorAll('#histCuerpo .hist-tabla')];
  const dia = tablas[1];
  assert.ok(dia.classList.contains('hist-tabla-dia'));
  const cab = [...dia.querySelectorAll('thead th')].map(th => (th.querySelector('a') || th).firstChild.textContent); // con enlace: el firstChild del <a> es el nombre (el aviso sr-only va después)
  assert.deepEqual(cab, ['N°', 'Fecha', 'Temporada', 'Semana', 'Día', 'Ataques', 'Medallas', 'Chistris', 'Otro', 'Chistris', 'Otro']);
  const enlaces = [...w.document.querySelectorAll('#histCuerpo th a.jugador-link')].map(a => a.getAttribute('href'));
  assert.ok(enlaces.length >= 2 && enlaces.every(h => h === 'perfil.html?tag=%23ABC' || h === 'perfil.html?tag=%23XYZ'), 'los nombres de ambos jugadores llevan enlace a su perfil');
  const trs = [...dia.querySelectorAll('tbody tr')];
  const cel = trs.map(tr => [...tr.children].map(td => td.firstChild ? td.firstChild.textContent : ''));
  assert.deepEqual(cel.map(f => f[0]), ['1', '2', '3'], 'N° automático');
  assert.deepEqual(cel.map(f => f[1]), ['08/10/2026', '04/10/2026', '01/10/2026']);
  assert.deepEqual(cel.map(f => f[4]), ['J', 'D', 'J']);
  const col = td => ['hist-a4', 'hist-a13', 'hist-cero'].find(c => td.classList.contains(c)) || '';
  assert.deepEqual(trs.map(tr => col(tr.children[5])), ['hist-a13', 'hist-cero', 'hist-a4'], 'color del primer jugador según sus ataques');
  assert.deepEqual(trs.map(tr => col(tr.children[6])), ['hist-a13', '', 'hist-a13'], 'el segundo jugador: 1 ataque amarillo y sin registro sin color');
  assert.deepEqual(trs.map(tr => col(tr.children[7])), ['hist-a13', 'hist-cero', 'hist-a4'], 'las medallas comparten el color de su jugador');
  assert.deepEqual(trs.map(tr => tr.classList.contains('hist-sem-b')), [false, true, true], 'la semana del medio y la anterior van sombreadas; la primera no');
});

// NUEVO (23-oct-2026, tanda 3 de Consolidado_Mini_Historial_y_Perfil.md, §PF178): columnas Temporada (número interno) y Semana (S1, S2…) que manda el backend.
// El sombreado alterna por la semana real (temporada + semana) cuando el backend la manda; sin ese dato, por el lunes (probado arriba).
test('la tabla del jugador muestra Temporada y Semana (S1, S2…) y alterna el sombreado por la semana real', async () => {
  const w = cargar({ a: [
    { fecha: '2026-10-01', ataques: 4, fame: 100, barcos: 0, temporada: 12, semana: 1, clan: 'Terna' },
    { fecha: '2026-10-02', ataques: 4, fame: 200, barcos: 0, temporada: 12, semana: 1, clan: 'Terna' },
    { fecha: '2026-10-03', ataques: 4, fame: 300, barcos: 0, temporada: 12, semana: 2, clan: 'Terna' }, // semana distinta aunque caiga en el mismo lunes-domingo: manda el dato del backend
    { fecha: '2026-10-08', ataques: 4, fame: 100, barcos: 0, temporada: 13, semana: 1, clan: 'Terna' }, // misma S1 pero otra temporada: es otra semana
  ] });
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  const trs = [...w.document.querySelectorAll('#histCuerpo .hist-tabla tbody tr')];
  const cel = trs.map(tr => [...tr.children].map(td => td.textContent));
  assert.deepEqual(cel.map(f => [f[2], f[3]]), [['13', 'S1'], ['12', 'S2'], ['12', 'S1'], ['12', 'S1']]);
  assert.deepEqual(trs.map(tr => tr.classList.contains('hist-sem-b')), [false, true, false, false], 'cada cambio de temporada o semana invierte el sombreado');
});

test('la comparación muestra Temporada y Semana de la fecha (la del jugador que tenga registro ese día)', async () => {
  const w = cargar({ a: [] });
  w.document.getElementById('celda').innerHTML = w.botonHistJugador({ tag: '#ABC', nombre: 'Chistris' }) + w.botonHistJugador({ tag: '#XYZ', nombre: 'Otro' });
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  w._respuesta = {
    a: [{ fecha: '2026-10-08', ataques: 3, fame: 200, barcos: 0, temporada: 13, semana: 1 }],
    b: [{ fecha: '2026-10-01', ataques: 2, fame: 50, barcos: 0, temporada: 12, semana: 4 }, { fecha: '2026-10-08', ataques: 1, fame: 80, barcos: 0, temporada: 13, semana: 1 }],
  };
  w.histComparar('#XYZ', 'Otro');
  await esperar();
  const dia = w.document.querySelectorAll('#histCuerpo .hist-tabla')[1];
  const trs = [...dia.querySelectorAll('tbody tr')];
  assert.deepEqual(trs.map(tr => [tr.children[2].textContent, tr.children[3].textContent]), [['13', 'S1'], ['12', 'S4']], 'la fecha que solo tiene el segundo jugador también muestra su temporada y semana');
  assert.deepEqual(trs.map(tr => tr.classList.contains('hist-sem-b')), [false, true]);
});

// NUEVO (23-oct-2026, tanda 4 de Consolidado_Mini_Historial_y_Perfil.md, §PF179): cabecera pública con los datos del perfil (webPerfil).
function cargarConPerfil(perfil, historial){
  const w = loadBrowserScriptsWithDom(['assets/js/util.js', 'assets/js/features/mini-historial.js'], '<div id="x"></div>');
  w.eval('var _llamadas = []; window.apiGet = function(nombre, params){ _llamadas.push(nombre); return window._resp[nombre] instanceof Error ? Promise.reject(window._resp[nombre]) : Promise.resolve(window._resp[nombre]); };');
  w._resp = { webPerfil: perfil, webHistorialGuerraComparador: historial };
  return w;
}
const HIST_OK = { a: [{ fecha: '2026-10-01', ataques: 4, fame: 600, barcos: 0 }] };

test('la cabecera muestra clan (con enlace), torre, XP, colección, victorias, copas y vigencia', async () => {
  const w = cargarConPerfil({ clan: 'Terna 1', vGuerra: 12, copas: 8123, vigencia: '2026-10-20T15:30:00Z',
    rawClash: { kingTowerLevel: 15, expLevel: 62 }, extendido: { nivelCartas: 88, nivelXp: 1 } }, HIST_OK);
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  const el = w.document.getElementById('histPerfil');
  const datos = [...el.querySelectorAll('.hist-perfil-dato')].map(d => d.textContent.replace(/\s+/g, ' ').trim());
  assert.equal(datos.length, 7);
  assert.match(datos[0], /^Clan: Terna 1/);
  assert.ok(el.querySelector('a.clan-link'), 'el clan lleva su enlace');
  assert.match(datos[1], /^Torre del rey: 15$/);
  assert.match(datos[2], /^Nivel de XP: 62$/, 'expLevel manda sobre extendido.nivelXp');
  assert.match(datos[3], /^Colección: 88$/);
  assert.match(datos[4], /^Victorias de guerra: 12$/);
  assert.match(datos[5], /^Copas: 8/);
  assert.match(datos[6], /^Vigencia: 20\/10\/2026/);
  assert.ok(w.document.querySelector('#histCuerpo .hist-tabla'), 'la tabla sigue pintada');
});

test('sin dato se omite esa pieza (XP desde extendido) y sin ningún dato la cabecera queda vacía', async () => {
  const w = cargarConPerfil({ copas: 100, extendido: { nivelXp: 55 } }, HIST_OK);
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  const datos = [...w.document.querySelectorAll('#histPerfil .hist-perfil-dato')].map(d => d.textContent.replace(/\s+/g, ' ').trim());
  assert.deepEqual(datos, ['Nivel de XP: 55', 'Copas: 100']);
  const w2 = cargarConPerfil({}, HIST_OK);
  w2.histAbrir('#ABC', 'Chistris');
  await esperar();
  assert.equal(w2.document.getElementById('histPerfil').innerHTML, '');
});

test('si webPerfil falla o devuelve error, la tabla se pinta igual y no hay cabecera', async () => {
  for (const perfil of [new Error('red'), { error: 'x' }]) {
    const w = cargarConPerfil(perfil, HIST_OK);
    w.histAbrir('#ABC', 'Chistris');
    await esperar();
    assert.equal(w.document.getElementById('histPerfil').innerHTML, '');
    assert.ok(w.document.querySelector('#histCuerpo .hist-tabla'));
  }
});

test('la cabecera de un jugador no queda al abrir otro (se vacía al abrir)', async () => {
  const w = cargarConPerfil({ copas: 100 }, HIST_OK);
  w.histAbrir('#ABC', 'Chistris');
  await esperar();
  assert.equal(w.document.querySelectorAll('#histPerfil .hist-perfil-dato').length, 1);
  w._resp.webPerfil = new Promise(() => {}); // el perfil del segundo jugador nunca llega
  w.histAbrir('#XYZ', 'Otro');
  assert.equal(w.document.getElementById('histPerfil').innerHTML, '');
});
