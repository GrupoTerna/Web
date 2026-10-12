const {serve,launch,pagina,FIX}=require('./lib');const {correrAxe,pequenos}=require('./axe');
const semanas=[0,1,2,3,4].map(i=>{const l=new Date(2026,9,5-7*i);const d=new Date(l.getTime()+6*864e5);const f=x=>x.toISOString().slice(0,10);return{lunesIso:f(l),domingoIso:f(d),temporada:200-Math.floor(i/4),semana:4-i%4}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function flujo(b,base,w,kind){
  const log=[];const p=await pagina(b,base,'admin.html',{admin:true,w,log,fix:{webAdminSemanasRecientes:{ok:true,semanas}}});
  await sleep(1200);
  const A=kind==='torneo'?{acc:'torneoAccion',b1:'btnTorneoPaso1',tipo:'torneoTipo',b2:'btnTorneoPaso2',paso3:'torneoPaso3',sel:'tSelectHoy',elegir:'T1'}:{acc:'sorteoAccion',b1:'btnSorteoPaso1',tipo:'sorteoTipo',b2:'btnSorteoPaso2',paso3:'sorteoPaso3',sel:'sSelectHoy',elegir:'S1'};
  if(kind==='sorteo'){await p.evaluate(()=>{document.querySelector('[data-panel=sorteos]').click();});await sleep(300);}
  // abrir los <details> padres
  await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>{if(d.querySelector('#torneoPaso1'))d.open=true;});});
  const sel=async(id,v)=>{await p.select('#'+id,v);};
  await sel(A.acc,'modificar');await p.click('#'+A.b1);await sleep(200);
  const tipos=await p.$$eval('#'+A.tipo+' option',o=>o.map(x=>x.value));
  const tipo=tipos.includes('principal')?'principal':tipos.filter(Boolean)[0];
  await sel(A.tipo,tipo);await p.click('#'+A.b2);await sleep(300);
  return {p,A,log,tipos};
}
(async()=>{const s=await serve();const base='http://localhost:'+s.address().port+'/';const b=await launch();
for(const kind of ['torneo','sorteo']) for(const w of [390,1280]){
  const {p,A,log,tipos}=await flujo(b,base,w,kind);
  console.log(`\n=== ${kind} @${w}px; tipos=${tipos}; paso3 visible:`,await p.$eval('#'+A.paso3,e=>getComputedStyle(e).display));
  const ids=await p.evaluate(()=>[...document.querySelectorAll('select')].filter(s=>s.offsetParent).map(s=>s.id));console.log('selects visibles:',ids.join(','));
  // elegir con teclado: foco + ArrowDown
  await p.focus('#'+A.sel);await p.keyboard.press('ArrowDown');await sleep(400);
  console.log('valor tras ArrowDown:',await p.$eval('#'+A.sel,e=>e.value),'| semanas marcadas:',await p.$$eval('.semana-check:checked',e=>e.length));
  const sc=await p.$eval('#'+A.paso3,e=>e.id); 
  console.log('axe (todas las reglas) en #'+A.paso3+':',JSON.stringify(await correrAxe(p,'#'+A.paso3),null,1));
  console.log('objetivos <24px:',JSON.stringify(await pequenos(p,'#'+A.paso3)));
  console.log('log de errores:',log.filter(x=>x.startsWith('PAGEERROR')));
  await p.close();
}
await b.close();s.close();})();
