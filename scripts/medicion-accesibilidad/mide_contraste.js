// Contraste (WCAG 1.4.3) del contenido dinamico, con datos simulados. Uso: node mide_contraste.js [pagina ...]
const {serve,launch,pagina}=require('./lib');const {correrAxe}=require('./axe');const {FIX}=require('./fixtures');
const PAGS={clan:'clan.html?clan=Terna%20Uno'};
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 const sel=process.argv.slice(2),lista=sel.length?sel:Object.keys(PAGS);
 for(const n of lista){for(const w of [390,1280]){const log=[];
  const p=await pagina(b,base,PAGS[n],{w,fix:FIX,log});await new Promise(r=>setTimeout(r,1500));
  const filas=await p.evaluate(()=>document.querySelectorAll('tbody tr, .stat').length+'+svg:'+document.querySelectorAll('#clanCopasWrap svg').length);
  const v=await correrAxe(p,null,['color-contrast']);
  console.log(n,w+'px','filas/stat:',filas,'fallos contraste:',v.length?JSON.stringify(v):0,'log:',log.join(',')); await p.close();}}
 await b.close();s.close();})();
