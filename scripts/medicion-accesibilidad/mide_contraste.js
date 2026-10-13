// Contraste (WCAG 1.4.3) del contenido dinamico, con datos simulados. Uso: node mide_contraste.js [pagina ...]
// sel = selectores que deben encontrarse (prueba de que el contenido dinamico si se pinto); si uno da 0, el barrido no vale para esa parte.
const {serve,launch,pagina}=require('./lib');const {correrAxe}=require('./axe');const {FIX}=require('./fixtures');
const PAGS={
 clan:{url:'clan.html?clan=Terna%20Uno',sel:['.js-clan-roster-fila','.cd-guerra-stats .stat','#clanCopasWrap svg']},
 index:{url:'index.html',sel:['.aniversario-row','.ranking-row','.carta-chip','#clanGrid > *']},
};
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 const sel=process.argv.slice(2),lista=sel.length?sel:Object.keys(PAGS);
 for(const n of lista){for(const w of [390,1280]){const log=[];
  const p=await pagina(b,base,PAGS[n].url,{w,fix:FIX,log});await new Promise(r=>setTimeout(r,1800));
  const cuenta=await p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' '),PAGS[n].sel);
  const v=await correrAxe(p,null,['color-contrast']);
  console.log(n,w+'px',cuenta,'| fallos contraste:',v.length?JSON.stringify(v):0,'| acciones:',[...new Set(log)].join(','));await p.close();}}
 await b.close();s.close();})();
