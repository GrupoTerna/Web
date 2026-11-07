'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, tanda 6e de Clanes por Tag, §PF416): los cuatro enlaces de clan cuyo payload YA trae clanTag (webPerfil, webAdminBuscarMiembro,
// detalle de ganadores de torneos) lo pasan a enlaceClan(). Cableado por texto sobre los archivos reales. LÍMITE: no ejecuta las pantallas.
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ADMIN = leer('admin.html');
const MINI = leer('assets/js/features/mini-historial.js');

test('§PF416 mini-historial: la cabecera del perfil enlaza el clan con j.clanTag', () => {
  assert.match(MINI, /enlaceClan\(j\.clan, \{ tag: j\.clanTag \}\)/);
});
test('§PF416 admin: ficha de miembro, participantes de resolución y «Encontrado en Clash Royale» pasan el Tag', () => {
  assert.match(ADMIN, /enlaceClan\(j\.clan, \{ tag: j\.clanTag \}\) : '—'\} · \$\{esc\(j\.rango\)\}/);
  assert.match(ADMIN, /enlaceClan\(p\.clan, \{ tag: p\.clanTag \}\)/);
  assert.match(ADMIN, /' · ' \+ enlaceClan\(j\.clan, \{ tag: j\.clanTag \}\)/);
});
// 6f (6-nov-2026): el backend ya manda clanTag en esos payloads (§PF417), así que la espera terminó; ver clanes-por-tag-6f.test.js.
test('§PF416 admin: los sitios que esperaban al backend pasaron a usar el Tag en la 6f', () => {
  assert.doesNotMatch(ADMIN, /enlaceClan\(m\._clan\)/);
  assert.doesNotMatch(ADMIN, /enlaceClan\(a\.clan\)/);
});
