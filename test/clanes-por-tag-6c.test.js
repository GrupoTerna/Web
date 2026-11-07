'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, tanda 6c de Clanes por Tag, §PF414): sorteo.html y torneos.html identifican el clan por su Tag (clanTag) y dejan el nombre solo de
// respaldo; mensajes.html no cambia (ver el último caso). Se extraen las funciones del <script> inline REAL de cada página (si se renombran, la prueba
// falla a propósito). LÍMITE: no prueba el pintado completo de la lista de sorteo ni un navegador real.

const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const scriptDe = (f, marca) => {
  const s = [...leer(f).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(t => t.includes(marca));
  assert.ok(s, `no se encontró ${marca} en ${f}`);
  return s;
};
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

// ================= sorteo.html =================
const SORTEO = scriptDe('sorteo.html', 'function claveClanParticipante');
const sorteo = new Function(`var SIN_CLAN_CLAVE = 'sin-clan';
${extraerFuncion(SORTEO, 'tagClanNorm')}
${extraerFuncion(SORTEO, 'mapaTagPorNombreClan')}
${extraerFuncion(SORTEO, 'claveClanParticipante')}
return { tagClanNorm, mapaTagPorNombreClan, claveClanParticipante };`)();
const claveDe = (p, lista) => sorteo.claveClanParticipante(p, sorteo.mapaTagPorNombreClan(lista));

test('§PF414 sorteo: dos clanes con el mismo nombre y distinto Tag caen en grupos distintos', () => {
  const a = { clan: 'Argentina', clanTag: '#ARG111' }, b = { clan: 'Argentina', clanTag: '#ARG222' };
  const lista = [a, b];
  assert.notEqual(claveDe(a, lista), claveDe(b, lista));
  assert.equal(claveDe(a, lista), 'tag:ARG111');
});

test('§PF414 sorteo: el Tag se normaliza (sin #, mayúsculas) y junta a los del mismo clan', () => {
  const lista = [{ clan: 'GrupoXTerna™2', clanTag: '#gycu9yrg' }, { clan: 'GrupoXTerna™2', clanTag: 'GYCU9YRG' }];
  assert.equal(claveDe(lista[0], lista), claveDe(lista[1], lista));
});

test('§PF414 sorteo: un participante sin Tag cae en el grupo de su clan si ese nombre tiene un solo Tag; si hay dos, queda aparte', () => {
  const conTag = { clan: 'Mini乂Ternas™', clanTag: '#GG99LCJY' }, sinTag = { clan: 'Mini乂Ternas™' };
  assert.equal(claveDe(sinTag, [conTag, sinTag]), 'tag:GG99LCJY');
  const x = { clan: 'Argentina', clanTag: '#ARG111' }, y = { clan: 'Argentina', clanTag: '#ARG222' }, z = { clan: 'Argentina' };
  assert.equal(claveDe(z, [x, y, z]), 'nombre:Argentina', 'con dos Tags posibles no se adivina');
});

test('§PF414 sorteo: sin Tag en nadie (backend anterior) agrupa por nombre como antes; sin clan va a «sin-clan»', () => {
  const lista = [{ clan: 'A' }, { clan: 'A' }, { clan: 'B' }, { clan: null }, {}];
  assert.equal(claveDe(lista[0], lista), claveDe(lista[1], lista));
  assert.notEqual(claveDe(lista[0], lista), claveDe(lista[2], lista));
  assert.equal(claveDe(lista[3], lista), 'sin-clan');
  assert.equal(claveDe(lista[4], lista), 'sin-clan');
});

test('§PF414 sorteo: cableado — grupos por clave, ids con el Tag, clanTag en calificados y en el alta manual, «sin clan» por parámetro', () => {
  assert.match(SORTEO, /var key = claveClanParticipante\(p, tagPorNombre\);/);
  assert.match(SORTEO, /grupos\[key\] = \{ nombre: p\.clan \|\| SIN_CLAN_LABEL, miembros: \[\] \};/);
  assert.match(SORTEO, /buildClanGroupHeader\(grupo\.nombre, miembros, key === SIN_CLAN_CLAVE\)/);
  assert.match(SORTEO, /function buildClanGroupHeader\(clanNombre, miembros, esSinClan\)/);
  assert.match(SORTEO, /id: 'q_' \+ \(tagClanNorm\(c\.clanTag\) \|\| c\.nombre\)\.replace/, 'el id usa el Tag: dos clanes del mismo nombre no repiten id');
  assert.match(SORTEO, /clanTag: tagClanNorm\(c\.clanTag\),/);
  assert.match(SORTEO, /clanTag: tagClanNorm\(m\.clanTag\), tag: m\.tag, manual: true/);
  assert.equal(/clanNombre === SIN_CLAN_LABEL/.test(SORTEO), false, 'ya no se decide «sin clan» por el texto del nombre');
});

// ================= torneos.html =================
const TORNEOS = scriptDe('torneos.html', 'function calcularRankingVictoriasTorneos');
const tagClanTorneo = new Function(`${extraerFuncion(TORNEOS, 'tagClanTorneo')}\nreturn tagClanTorneo;`)();
const calcularRanking = new Function(`${extraerFuncion(TORNEOS, 'tagClanTorneo')}\n${extraerFuncion(TORNEOS, 'calcularRankingVictoriasTorneos')}\nreturn calcularRankingVictoriasTorneos;`)();

// El cruce por fecha + clan está dentro de render: se extrae su bloque real y se ejecuta con un Map propio.
function cruce(){
  const ini = TORNEOS.indexOf('const claveFechaClan = ');
  const fin = TORNEOS.indexOf('historialList.forEach(indexar);', ini);
  assert.ok(ini > 0 && fin > ini, 'no se encontró el bloque del cruce por fecha y clan en torneos.html');
  return new Function('tagClanTorneo', 'mapaTop3', `${TORNEOS.slice(ini, fin)}\nreturn { indexar, buscarPorFechaYClan };`)(tagClanTorneo, new Map());
}

test('§PF414 torneos: tagClanTorneo() normaliza el Tag y da vacío si falta', () => {
  assert.equal(tagClanTorneo({ clanTag: '#gcrg8l00' }), 'GCRG8L00');
  assert.equal(tagClanTorneo({}), '');
  assert.equal(tagClanTorneo(null), '');
});

test('§PF414 torneos: el cruce por fecha + clan va por Tag; dos clanes del mismo nombre en la misma fecha no se confunden', () => {
  const c = cruce();
  const a = { fecha: '2026-11-01', clan: 'Argentina', clanTag: '#ARG111', top3: ['a'] };
  const b = { fecha: '2026-11-01', clan: 'Argentina', clanTag: '#ARG222', top3: ['b'] };
  c.indexar(a); c.indexar(b);
  assert.equal(c.buscarPorFechaYClan({ fecha: '2026-11-01', clan: 'Argentina', clanTag: 'arg222' }), b);
  assert.equal(c.buscarPorFechaYClan({ fecha: '2026-11-01', clan: 'Argentina', clanTag: '#ARG111' }), a);
  assert.equal(c.buscarPorFechaYClan({ fecha: '2026-11-01', clan: 'Argentina', clanTag: '#OTRO99' }), null, 'un Tag que no está no cae al nombre de los que sí tienen Tag');
});

test('§PF414 torneos: sin Tag (datos anteriores) cruza por nombre como siempre, y un torneo con Tag encuentra uno antiguo sin Tag por nombre', () => {
  const c = cruce();
  const viejo = { fecha: '2026-10-01', clan: 'Grupo乂Terna™', top3: ['x'] };
  c.indexar(viejo);
  assert.equal(c.buscarPorFechaYClan({ fecha: '2026-10-01', clan: 'Grupo乂Terna™' }), viejo);
  assert.equal(c.buscarPorFechaYClan({ fecha: '2026-10-01', clan: 'Grupo乂Terna™', clanTag: '#GCRG8L00' }), viejo, 'respaldo por nombre, no confirmado');
  assert.equal(c.buscarPorFechaYClan({ fecha: '2026-10-02', clan: 'Grupo乂Terna™' }), null);
  assert.equal(c.buscarPorFechaYClan({ clan: 'Grupo乂Terna™' }), null, 'sin fecha no hay cruce');
});

const gan = (nombre, clan, clanTag, victorias, tag) => ({ nombre, clan, clanTag, victorias, tag: tag || null });

test('§PF414 torneos: el ranking separa a dos jugadores con el mismo nombre en clanes del mismo nombre y distinto Tag', () => {
  const r = calcularRanking([
    { participantes: [gan('Ana', 'Argentina', '#ARG111', 3), gan('Ana', 'Argentina', '#ARG222', 2)] },
    { participantes: [gan('Ana', 'Argentina', '#ARG111', 1)] },
  ]);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(x => [x.clan, x.victorias, x.apariciones]), [['Argentina', 4, 2], ['Argentina', 2, 1]]);
});

test('§PF414 torneos: una fila antigua sin clanTag suma con las de su clan y no parte al jugador en dos', () => {
  const r = calcularRanking([
    { participantes: [gan('Beto', 'Grupo乂Terna™', '#GCRG8L00', 2, '#B1')] },
    { participantes: [gan('Beto', 'Grupo乂Terna™', '', 3)] },
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].victorias, 5);
  assert.equal(r[0].tag, '#B1', 'se conserva el primer tag no nulo');
});

test('§PF414 torneos: un nombre de clan con dos Tags no adivina la fila sin Tag; sin ningún Tag agrupa por nombre como siempre', () => {
  const r1 = calcularRanking([
    { participantes: [gan('Caro', 'Argentina', '#ARG111', 1), gan('Caro', 'Argentina', '#ARG222', 1), gan('Caro', 'Argentina', '', 1)] },
  ]);
  assert.equal(r1.length, 3, 'tres filas: dos por Tag y una sin Tag que queda aparte');
  const r2 = calcularRanking([{ participantes: [gan('Dani', 'X', '', 1)] }, { top3: [gan('Dani', 'X', undefined, 2)] }, { participantes: [gan('Dani', 'Y', '', 1)] }]);
  assert.deepEqual(r2.map(x => [x.clan, x.victorias]), [['X', 3], ['Y', 1]]);
  assert.deepEqual(calcularRanking(null), []);
});

// ================= mensajes.html =================
test('§PF414 mensajes: no cambia — o.clan !== o.etiqueta solo evita repetir el mismo texto y las opciones se eligen por índice, no por nombre de clan', () => {
  const html = leer('mensajes.html');
  assert.match(html, /if\(o\.clan && o\.clan !== \(o\.etiqueta \|\| ''\)\)\{/, 'comparación de texto (etiqueta contra nombre mostrado)');
  assert.match(html, /data-idx="\$\{i\}"/, 'cada pestaña de opción se identifica por su índice');
  assert.equal(/clanTag/.test(html), false, 'mensajes.html no necesita clanTag');
});
