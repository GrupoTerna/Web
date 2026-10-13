// Contraste (WCAG 1.4.3) del contenido dinamico, con datos simulados. Uso: node mide_contraste.js [pagina ...]
// clic = botones a pulsar antes de medir (p. ej. Mostrar graficas).
// admin = simula sesion de admin; abrir = abre todos los <details>.
// sel = selectores que deben encontrarse (prueba de que el contenido dinamico si se pinto); si uno da 0, el barrido no vale para esa parte.
const {serve,launch,pagina}=require('./lib');const {correrAxe}=require('./axe');const {FIX}=require('./fixtures');
const PAGS={
 clan:{url:'clan.html?clan=Terna%20Uno',sel:['.js-clan-roster-fila','.cd-guerra-stats .stat','#clanCopasWrap svg']},
 index:{url:'index.html',sel:['.aniversario-row','.ranking-row','.carta-chip','#clanGrid > *']},

 comunidad:{url:'comunidad.html',sel:['.an-name','.an-detail','.an-fecha']},
 torneos:{url:'torneos.html',sel:['.medalla','.g-nombre','.todos-resultados-fila','.t-clan','.tg-fila','.rk-victorias-nombre']},
 directorio:{url:'directorio.html',clic:['#ingGraficasToggle'],sel:['#clanGrid > *','#rosterTableWrap tbody tr','#nuevoGrid > *','#chartsGrid .chart-card','#ingresosChartsWrap > *','#ingresosChartsWrap svg']},
 mensajes:{url:'mensajes.html',admin:true,abrir:true,sel:['details.categoria-contenido-simple','.btn-toggle-cat','.contenido-item','.contenido-tabs .tab-clan','.btn-copiar']},
 permisos:{url:'permisos.html',admin:true,abrir:true,sel:['.admin-permiso-card','.nombre-adm','.permiso-item','.permiso-item.sensible','.tag-tu']},
};
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 const sel=process.argv.slice(2),lista=sel.length?sel:Object.keys(PAGS);
 for(const n of lista){for(const w of [390,1280]){const log=[];
  const p=await pagina(b,base,PAGS[n].url,{w,fix:FIX,log,admin:!!PAGS[n].admin});await new Promise(r=>setTimeout(r,1800));
  if(PAGS[n].abrir){await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));await new Promise(r=>setTimeout(r,800));} // abre todos los <details> (axe no mide lo plegado)
  for(const c of (PAGS[n].clic||[])){await p.evaluate(q=>{const e=document.querySelector(q);if(e)e.click();},c);await new Promise(r=>setTimeout(r,600));} // clics previos (botones que muestran contenido)
  await p.evaluate(()=>document.querySelectorAll('.js-toggle-resultados').forEach(b=>b.click())); // despliega lo plegado: axe no mide lo oculto
  const cuenta=await p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' '),PAGS[n].sel);
  const v=await correrAxe(p,null,['color-contrast']);
  console.log(n,w+'px',cuenta,'| fallos contraste:',v.length?JSON.stringify(v):0,'| acciones:',[...new Set(log)].join(','));await p.close();}}
 await b.close();s.close();})();
