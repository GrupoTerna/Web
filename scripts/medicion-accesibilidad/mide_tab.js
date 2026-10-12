const {serve,launch,pagina}=require('./lib');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const semanas=[0,1,2,3,4].map(i=>{const l=new Date(2026,9,5-7*i);const d=new Date(l.getTime()+6*864e5);const f=x=>x.toISOString().slice(0,10);return{lunesIso:f(l),domingoIso:f(d),temporada:200,semana:4-i}});
(async()=>{const s=await serve();const base='http://localhost:'+s.address().port+'/';const b=await launch();
for(const [kind,acc,b1,tipo,b2,sel] of [['torneo','torneoAccion','btnTorneoPaso1','torneoTipo','btnTorneoPaso2','tSelectHoy'],['sorteo','sorteoAccion','btnSorteoPaso1','sorteoTipo','btnSorteoPaso2','sSelectHoy']]){
 const w=390;const log=[];const p=await pagina(b,base,'admin.html',{admin:true,w,log,fix:{webAdminSemanasRecientes:{ok:true,semanas}}});await sleep(1200);
 if(kind==='sorteo'){await p.evaluate(()=>document.querySelector('[data-panel=sorteos]').click());await sleep(300);}
 await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{if(d.querySelector('#torneoPaso1'))d.open=true;}));
 // todo con teclado: foco en el select de accion, flecha hasta "modificar", Enter en Continuar
 await p.focus('#'+acc);await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');
 console.log(`\n=== ${kind}: acción =`,await p.$eval('#'+acc,e=>e.value));
 await p.keyboard.press('Tab');console.log('Tab -> foco en',await p.evaluate(()=>document.activeElement.id));await p.keyboard.press('Enter');await sleep(200);
 await p.focus('#'+tipo);await p.keyboard.press('ArrowDown');await p.keyboard.press('Tab');await p.keyboard.press('Enter');await sleep(300);
 console.log('foco tras Continuar (paso 2→3):',await p.evaluate(()=>{const a=document.activeElement;return a.tagName+'#'+a.id}));
 await p.focus('#'+sel);await p.keyboard.press('ArrowDown');await sleep(400);
 const pre=await p.evaluate((k)=>({autor:(document.getElementById(k==='torneo'?'tAutorSelectMod':'sAutorSelectMod')||{}).value,premios:[...document.querySelectorAll('[id^=premiosEditor] input')].filter(i=>i.offsetParent).slice(0,3).map(i=>i.value),marcadas:[...document.querySelectorAll('.semana-check:checked')].filter(c=>c.offsetParent).length}),kind);
 console.log('precarga tras ArrowDown (teclado):',JSON.stringify(pre));
 const rec=[];let atrapado=false;
 for(let i=0;i<70;i++){await p.keyboard.press('Tab');
  const r=await p.evaluate(()=>{const a=document.activeElement;const cs=getComputedStyle(a);const vis=(cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0)||cs.boxShadow!=='none';return{id:a.id||a.tagName.toLowerCase(),vis,dentroPaso3:!!a.closest('#torneoPaso3,#sorteoPaso3')};});
  rec.push(r);if(r.id==='BODY'){atrapado=true;break;}}
 const sinAnillo=rec.filter(r=>!r.vis).map(r=>r.id);
 console.log('Tab recorridos:',rec.length,'| se escapó al <body>:',atrapado,'| sin anillo de foco visible:',JSON.stringify([...new Set(sinAnillo)]));
 const btnGuardar=await p.evaluate(()=>[...document.querySelectorAll('#torneoPaso3 button,#sorteoPaso3 button')].filter(b=>b.offsetParent).map(b=>b.id||b.textContent.trim().slice(0,25)));
 console.log('botones visibles del paso 3:',JSON.stringify(btnGuardar));
 console.log('errores JS:',log.filter(x=>x.startsWith('PAGEERROR')));
 await p.close();}
await b.close();s.close();})();
