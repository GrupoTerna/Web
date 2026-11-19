'use strict';

// NUEVO (18-nov-2026): reporter de `node --test` para GitHub Actions. Por cada prueba que falla escribe una
// anotación (`::error file=…::…`) con el nombre de la prueba y el mensaje del error, de modo que el fallo se
// vea en la página del job y también por la API de anotaciones (el log completo no siempre es accesible).
// Se usa junto al reporter `spec`: ver el script "test" de package.json.

function limpiar(s) {
  return String(s == null ? '' : s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

module.exports = async function* (fuente) {
  let fallos = 0;
  for await (const ev of fuente) {
    if (ev.type !== 'test:fail') continue;
    const d = ev.data || {};
    const err = (d.details && d.details.error) || {};
    // Los contenedores (archivo o suite) repiten el fallo de sus pruebas internas: se anota solo la hoja.
    if (err.failureType === 'subtestsFailed') continue;
    fallos++;
    const archivo = d.file ? String(d.file).replace(process.cwd() + '/', '') : '';
    const causa = err.cause || err;
    const msg = `${d.name || '(sin nombre)'}: ${(causa && causa.message) || err.message || 'sin mensaje'}`;
    yield `::error${archivo ? ` file=${archivo}` : ''}::${limpiar(msg.slice(0, 900))}\n`;
  }
  if (fallos) yield `Pruebas con error: ${fallos}\n`;
};
