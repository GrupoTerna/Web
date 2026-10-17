// Comprueba el orden del CHANGELOG.md: fecha (más reciente arriba) > archivo (A-Z).
// Uso: node scripts/verificar-changelog.js   (o: npm run check-changelog)
// Regla completa: Backend/Consolidados de cambios/Reglas_Consolidados.md, sección 6.
const fs = require('fs');
const path = require('path');

const MES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
const ARCHIVO = /^[\w./*-]+\.(?:html|js|css|gs|md|json|csv|txt|yml|yaml|png|webp|svg)$/;
const lineas = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8').split('\n');

const archivoDe = (viñeta) => {
  const m = viñeta.match(/^- \*\*`([^`]+)`/);
  return m && ARCHIVO.test(m[1]) ? m[1] : null;
};

const secciones = [];
for (const l of lineas) {
  if (l.startsWith('## ')) secciones.push({ h: l, vs: [] });
  else if (l.startsWith('- ') && secciones.length) secciones[secciones.length - 1].vs.push(l);
}

const errores = [];
let previa = null;
let ultimaFechada = -1;
secciones.forEach((s, i) => {
  const m = s.h.match(/^## (\d\d)-(\w+)-(\d{4})/);
  if (m) {
    const clave = Number(m[3]) * 10000 + MES[m[2]] * 100 + Number(m[1]);
    if (previa !== null && clave > previa) errores.push(`Fecha fuera de orden: ${s.h}`);
    previa = clave;
    ultimaFechada = i;
  } else if (!/^## (Abiertos|Sin fecha en el comentario original)/.test(s.h)) {
    errores.push(`Sección que no es una fecha: ${s.h} (las entradas van bajo su fecha)`);
  } else if (s.h.startsWith('## Sin fecha') && i < ultimaFechada) {
    errores.push('«Sin fecha en el comentario original» debe ir después de todas las fechas');
  }
  if (s.h.startsWith('## Abiertos')) return;
  const vistos = [];
  for (const v of s.vs) {
    const a = archivoDe(v);
    if (!vistos.length || vistos[vistos.length - 1] !== a) {
      if (vistos.includes(a)) errores.push(`${s.h}: las entradas de «${a ?? 'sin archivo'}» no están juntas`);
      vistos.push(a);
    }
  }
  const nombres = vistos.filter(Boolean);
  const ordenados = [...nombres].sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()));
  if (nombres.join('|') !== ordenados.join('|')) errores.push(`${s.h}: archivos fuera de orden A-Z (${nombres.join(', ')})`);
  if (vistos.includes(null) && vistos[vistos.length - 1] !== null) errores.push(`${s.h}: las entradas sin archivo van al final de la fecha`);
});

if (errores.length) {
  console.error(errores.join('\n'));
  process.exit(1);
}
console.log(`CHANGELOG.md en orden fecha > archivo (${secciones.length - 1} secciones).`);
