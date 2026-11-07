'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, tanda 6d de Clanes por Tag, §PF415): enlaceClan() acepta el Tag del clan (opts.tag) y lo agrega al enlace como &tag=;
// permisos.html agrupa las cuentas de un admin por Tag. Se extraen las funciones REALES de util.js y de permisos.html (si se renombran, la prueba
// falla a propósito). LÍMITE: no prueba el pintado completo de las páginas ni un navegador real.

const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
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

// ================= util.js: enlaceClan =================
const UTIL = leer('assets/js/util.js');
const { enlaceClan } = new Function(`${extraerFuncion(UTIL, 'esc')}
${extraerFuncion(UTIL, 'enlaceClan')}
return { enlaceClan };`)();

test('§PF415 enlaceClan: sin Tag el enlace es el de siempre (solo ?clan=)', () => {
  const h = enlaceClan('Terna Uno');
  assert.match(h, /href="clan\.html\?clan=Terna%20Uno"/);
  assert.doesNotMatch(h, /tag=/);
});

test('§PF415 enlaceClan: con Tag agrega &tag= (el # se codifica) y deja el nombre de respaldo', () => {
  const h = enlaceClan('Terna Uno', { tag: '#ABC123' });
  assert.match(h, /href="clan\.html\?clan=Terna%20Uno&tag=%23ABC123"/);
});

test('§PF415 enlaceClan: Tag vacío, undefined o null no agrega &tag=', () => {
  for (const tag of ['', '   ', undefined, null]){
    assert.doesNotMatch(enlaceClan('Terna Uno', { tag }), /tag=/, `tag=${JSON.stringify(tag)}`);
  }
});

test('§PF415 enlaceClan: dos clanes del mismo nombre y distinto Tag dan enlaces distintos', () => {
  const a = enlaceClan('Argentina', { tag: '#ARG111' }), b = enlaceClan('Argentina', { tag: '#ARG222' });
  assert.notEqual(a, b);
  assert.match(a, /tag=%23ARG111/);
  assert.match(b, /tag=%23ARG222/);
});

test('§PF415 enlaceClan: sin nombre no hay enlace (aunque haya Tag) y se conservan mismaVentana y clase', () => {
  assert.doesNotMatch(enlaceClan('', { tag: '#X' }), /<a /);
  const h = enlaceClan('Terna Uno', { tag: '#X', mismaVentana: true, clase: 'extra' });
  assert.match(h, /class="clan-link extra"/);
  assert.doesNotMatch(h, /target=/);
});

// ================= permisos.html: agruparCuentasPorClan =================
const PERMISOS = leer('permisos.html');
const { agruparCuentasPorClan } = new Function(`function esc(s){ return String(s); }
${extraerFuncion(PERMISOS, 'agruparCuentasPorClan')}
return { agruparCuentasPorClan };`)();
const grupos = html => [...html.matchAll(/<span class="nombre-clan">(.*?)<\/span> — (.*?)<\/div>/g)].map(m => [m[1], m[2]]);

test('§PF415 permisos: dos clanes con el mismo nombre y distinto Tag no se juntan', () => {
  const g = grupos(agruparCuentasPorClan([
    { clan: 'Terna', clanTag: '#AAA', nombre: 'a' }, { clan: 'Terna', clanTag: '#BBB', nombre: 'b' }, { clan: 'Terna', clanTag: '#AAA', nombre: 'c' }
  ]));
  assert.deepEqual(g, [['Terna', 'a, c'], ['Terna', 'b']]);
});

test('§PF415 permisos: una cuenta sin Tag cae en el clan de su nombre si ese nombre tiene un solo Tag', () => {
  const g = grupos(agruparCuentasPorClan([{ clan: 'Uno', clanTag: '#AAA', nombre: 'a' }, { clan: 'Uno', nombre: 'b' }]));
  assert.deepEqual(g, [['Uno', 'a, b']]);
});

test('§PF415 permisos: con un nombre de dos Tags, la cuenta sin Tag queda aparte (no se adivina)', () => {
  const g = grupos(agruparCuentasPorClan([
    { clan: 'Uno', clanTag: '#A', nombre: 'a' }, { clan: 'Uno', clanTag: '#B', nombre: 'b' }, { clan: 'Uno', nombre: 'c' }
  ]));
  assert.deepEqual(g, [['Uno', 'a'], ['Uno', 'b'], ['Uno', 'c']]);
});

test('§PF415 permisos: datos sin Tag (backend antiguo) agrupan por nombre como antes y «Sin clan» sigue existiendo', () => {
  const g = grupos(agruparCuentasPorClan([
    { clan: 'Uno', nombre: 'a' }, { clan: 'Dos', nombre: 'b' }, { clan: 'Uno', nombre: 'c' }, { clan: '', nombre: '', tag: '#T' }
  ]));
  assert.deepEqual(g, [['Uno', 'a, c'], ['Dos', 'b'], ['Sin clan', '#T']]);
  assert.equal(agruparCuentasPorClan([]), '');
});

// ================= cableado: quién pasa el Tag y quién no =================
test('§PF415 cableado: index, perfil y clan-card pasan el clanTag que ya trae su payload', () => {
  const index = leer('index.html');
  assert.match(index, /enlaceClan\(a\.clan, \{ tag: a\.clanTag \}\)/);
  assert.match(index, /renderRankingRow\(i \+ 1, m\.nombre, m\.valor, sufijo, m\.tag, m\.clan, m\.clanTag\)/);
  assert.match(index, /enlaceClan\(clan, \{ tag: clanTag \}\)/);
  const perfil = leer('perfil.html');
  assert.match(perfil, /enlaceClan\(j\.clan, \{ tag: j\.clanTag \}\)/);
  assert.match(perfil, /enlaceClan\(t\.clan, \{ tag: t\.clanTag \}\)/);
  const card = leer('assets/js/features/clan-card.js');
  assert.equal((card.match(/\{ tag: c\.clanTag \}/g) || []).length, 2);
});

test('§PF415 cableado: directorio.html pasa el clanTag en el título del roster y en la leyenda de las gráficas', () => {
  const dir = leer('directorio.html');
  assert.match(dir, /enlaceClan\(clan\.nombre, \{ tag: clan\.clanTag \}\)/);
  assert.match(dir, /enlaceClan\(clanLabel, \{ tag: m\.clanTag \}\)/);
});

test('§PF415 directorio: la leyenda de las gráficas enlaza cada clan con su Tag (dos clanes del mismo nombre, enlaces distintos)', () => {
  const DIR = leer('directorio.html');
  const f = new Function('enlaceClan', 'enlaceJugador', 'PALETA_SERIES', 'CLAN_LABELS_CORTOS', 'ordenClanIndex',
    `${extraerFuncion(DIR, 'tagClanNormalizado')}
${extraerFuncion(DIR, 'claveClanMiembro')}
${extraerFuncion(DIR, 'lineChartLegendHtml')}
return lineChartLegendHtml;`)(enlaceClan, (n, t) => n, ['#000'], [], () => 0);
  const html = f([
    { clan: 'Argentina', clanTag: '#AAA111', nombre: 'a', tag: '#1' },
    { clan: 'Argentina', clanTag: '#BBB222', nombre: 'b', tag: '#2' }
  ]);
  assert.match(html, /tag=%23AAA111/);
  assert.match(html, /tag=%23BBB222/);
  assert.equal((html.match(/ing-linechart-legend-clan/g) || []).length, 2);
});

test('§PF416 cableado: noticias.html ya usa clanTag (la 6e hizo que 40_Web_Noticias.gs lo mande; antes de ella esta prueba exigía lo contrario)', () => {
  assert.match(leer('noticias.html'), /clanTag/);
});
