'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// NUEVO (6-nov-2026, tanda 6f de Clanes por Tag, §PF417): los enlaces de clan que seguían por nombre pasan el Tag ahora que el backend
// lo manda (ascensos editables, propuestas de cambio de rango, Mis cuentas y ficha de infiltrado). Cableado por texto sobre los archivos
// reales. LÍMITE: no ejecuta las pantallas. `b.miClan pasó a usar el Tag en la 6g (§PF418).
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ADMIN = leer('admin.html');
const PERFIL = leer('perfil.html');

test('§PF417 admin: ascensos editables y propuestas de cambio de rango pasan el Tag', () => {
  assert.match(ADMIN, /a\.clan \? enlaceClan\(a\.clan, \{ tag: a\.clanTag \}\)/);
  assert.match(ADMIN, /p\.clan \? enlaceClan\(p\.clan, \{ tag: p\.clanTag \}\)/);
});
test('§PF417 admin: Mis cuentas copia el Tag del grupo al renglón y lo pasa al enlace', () => {
  assert.match(ADMIN, /_clan: c\.nombre, _clanTag: c\.clanTag,/);
  assert.match(ADMIN, /enlaceClan\(m\._clan, \{ tag: m\._clanTag \}\)/);
});
test('§PF417 ficha de infiltrado: las dos tablas de admin y la de perfil pasan f.clanTag', () => {
  const enAdmin = ADMIN.match(/f\.clan \? enlaceClan\(f\.clan, \{ tag: f\.clanTag \}\) : '—'/g) || [];
  assert.equal(enAdmin.length, 2);
  assert.match(PERFIL, /f\.clan \? enlaceClan\(f\.clan, \{ tag: f\.clanTag \}\) : '—'/);
});
// 6g (6-nov-2026, §PF418): el backend manda miClanTag solo si el clan es Terna; uno externo llega con '' y enlaza por nombre.
test('§PF418 perfil: el clan propio de cada batalla enlaza con b.miClanTag', () => {
  assert.match(PERFIL, /enlaceClan\(miClanNom, \{ tag: b\.miClanTag \}\)/);
});
