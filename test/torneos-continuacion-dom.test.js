'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBrowserScriptsWithDom } = require('./load-browser-script');

// PF154 (21-oct-2026): un torneo con continuación es UN solo torneo en la web.
// El backend (_webTorneos) envía solo la raíz con `partes` (raíz + continuaciones)
// e `idsPartes`; torneos.html pinta una sola fila y, si partes > 1, «Realizado en N partes».
// LÍMITE: prueba el frontend con DOM simulado; no prueba el backend real ni un navegador real.

const html = fs.readFileSync(path.join(__dirname, '..', 'torneos.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'se esperaba exactamente un <script> inline en torneos.html');
const SCRIPT_INLINE = scripts[0][1];

const BODY = `
  <div id="torneosActualizadoTxt"></div>
  <div id="ganadoresWrap"></div>
  <div id="ganadoresResultadosWrap"></div>
  <div id="torneosWrap"></div>
  <div id="salonWrap"></div>
  <div id="rankingVictoriasWrap"></div>`;

const GANADOR = { puesto: 1, nombre: 'Ganador Final', clan: 'Terna 1', victorias: 7, tag: '#GGG111' };

async function cargar(respuestas){
  const window = loadBrowserScriptsWithDom(['assets/js/core/config.js', 'assets/js/util.js', 'assets/js/core/api.js'], BODY);
  window.apiGet = async (accion) => respuestas[accion];
  window.apiGetEstatico = async () => { throw new Error('sin torneos.json (simulado)'); };
  window.apiGetUltimaActualizacion = () => null;
  window.eval(SCRIPT_INLINE);
  await new Promise(r => setTimeout(r, 30));
  return window.document;
}

test('torneos.html — raíz con una continuación: una sola fila, «Realizado en 2 partes» y el podio de la otra parte', async () => {
  const doc = await cargar({
    webTorneos: {
      // `ganadores` es el torneo MÁS RECIENTE (la continuación, id 21); la raíz (id 20) no tiene podio propio.
      ganadores: { idTorneo: '21', fecha: '2026-10-19T21:00:00.000Z', clan: 'Terna 1', top3: [GANADOR], participantes: [GANADOR] },
      torneos: [
        { id: 20, fecha: '2026-10-18T21:00:00.000Z', clan: 'Terna 1', organizador: 'Ana', linkApp: '', partes: 2, idsPartes: ['20', '21'] },
        { id: 9, fecha: '2026-10-04T21:00:00.000Z', clan: 'Terna 2', organizador: 'Luis', linkApp: '', partes: 1, idsPartes: ['9'] }
      ]
    },
    webHistorialTorneos: { historial: [] }
  });
  const filas = [...doc.querySelectorAll('#torneosWrap .torneo-row')];
  assert.equal(filas.length, 2, 'una fila por torneo, sin fila aparte para la continuación');
  assert.match(filas[0].textContent, /Realizado en 2 partes/);
  assert.ok(filas[0].textContent.includes('Ganador Final'), 'el podio sale por idsPartes');
  assert.doesNotMatch(filas[1].textContent, /partes/, 'un torneo de una sola parte no lleva la indicación');
});

test('torneos.html — respuesta sin `partes` ni `idsPartes` (JSON estático viejo): no falla y no indica partes', async () => {
  const doc = await cargar({
    webTorneos: { ganadores: null, torneos: [{ id: 5, fecha: '2026-10-01T21:00:00.000Z', clan: 'Terna 1', organizador: '', linkApp: '' }] },
    webHistorialTorneos: { historial: [] }
  });
  const filas = [...doc.querySelectorAll('#torneosWrap .torneo-row')];
  assert.equal(filas.length, 1);
  assert.doesNotMatch(filas[0].textContent, /partes/);
});
