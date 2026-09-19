/*
 * FIX (B-15, 18-sep-2026): config de html-validate, arrancando en modo
 * permisivo a propósito (ver nota de B-15 en Plan_Fases.md: "html-validate
 * fallará al inicio por HTML inline heredado — conviene arrancar en modo
 * 'solo avisar' y endurecer después"). Antes de escribir esto se corrió
 * html-validate:recommended contra las 9 páginas: dio 455 problemas, de
 * los cuales se investigaron y arreglaron los 7 que no eran ruido masivo
 * (una <style> vacía e inválida en pleno <body> de directorio.html, un
 * "}"+"</style>" sueltos que sobraban en index.html, un "&" crudo sin
 * codificar, dos <input> sin type explícito en sorteo.html y un espacio
 * final en comunidad.html). Quedan 3 reglas que SÍ hay que silenciar o
 * bajar de nivel a propósito:
 */
module.exports = {
  extends: ['html-validate:recommended'],
  rules: {
    // 412 casos. Es deuda conocida y ya medida (647 style="" en todo el
    // sitio, ver la corrección de la Fase 0 al inicio de Plan_Fases.md):
    // la dueña de resolverlo es la Fase 3 (extraer CSS inline a
    // styles.css), no B-15. Prender esta regla hoy solo haría fallar el
    // CI por algo que ya está diagnosticado y tiene su propio plan.
    'no-inline-style': 'off',
    // 1 caso (admin.html #mNombre). Falso positivo: son <h3> a propósito
    // vacíos en el HTML porque JS les pone el texto en tiempo de carga
    // (mismo patrón que decenas de <div>/<span> del sitio; esta regla
    // solo mira encabezados h1-h6, por eso apareció uno solo).
    'empty-heading': 'off',
    // 2 casos (el overlay del modal "Cómo unirte" en index.html y
    // directorio.html). Falso positivo: html-validate no evalúa CSS, así
    // que no sabe que .join-modal-overlay tiene display:none por defecto
    // (assets/styles.css) — con eso, sus hijos NO son alcanzables por
    // teclado pese al aria-hidden="true" mientras está cerrado. El propio
    // aria-hidden es intencional y necesario (B-5): esconde el modal de
    // lectores de pantalla cuando está cerrado.
    'hidden-focusable': 'off',
    // 34 casos. A diferencia de no-inline-style, esto sí es mecánico y
    // barato de arreglar (agregar type="button"), pero son 34 lugares en
    // varios archivos — más que un solo "cambio pequeño". Queda en "warn"
    // (se ve en el log de CI, no rompe el build) hasta que se limpie en
    // una rebanada aparte.
    'no-implicit-button-type': 'warn'
  }
};
