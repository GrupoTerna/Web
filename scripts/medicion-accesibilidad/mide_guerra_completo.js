// D-20 (contraste WCAG 1.4.3) de guerra.html con datos simulados COMPLETOS: dia de guerra, sesion de admin,
// pronostico dentro de las tarjetas (tras «Ver pronostico»), Participacion de Hoy, Log de Guerra y celdas con 0 y vacias.
// Uso: node mide_guerra_completo.js   (los datos son inventados; no prueban el backend real)
const {serve,launch,pagina}=require('./lib');const {correrAxe}=require('./axe');const {FIX}=require('./fixtures');
const clanes=['Terna Uno','Terna Dos'];
const cta=(c,i,h)=>({tag:'#'+c+'P'+i,nombre:'Cuenta '+c+i+' Prueba',ataquesHoy:h});
const part={ok:true,clanes:clanes.map((c,ci)=>({clan:c,
  reservadas:[0,1,2,3,4].map(i=>cta(ci,i,i)),            // ataquesHoy 0..4 => pendientes 4..0 (incluye part-pend-cero)
  disponibles:[5,6,7].map(i=>cta(ci,i,0))})),
  multiClan:[{tag:'#9MULTI',nombre:'Cuenta Doble Prueba',clanes:clanes,totalAtaquesHoy:6}]};
const pron={ok:true,clanes:[
  ...clanes.map((c,i)=>({nombre:c,clanTag:'#CL'+i,esRival:false,fameActual:30000-i*4000,fameTechoRoster:42000,fameTecho:52000,ataquesUsados:120+i*20})),
  ...clanes.map((c,i)=>({nombre:'Rival '+(i+1)+' Prueba',esRival:true,clanTernaTag:'#CL'+i,clanTernaNombre:c,fameActual:26000+i*3000,fameTechoRoster:40000,fameTecho:40000,ataquesUsados:100}))]};
// Log: una fila por temporada/semana; con puesto estimado, coliseo, trofeos con delta, ceros y huecos
const sem=(t,s,ci)=>({temporada:t,semana:s,rank:s===3&&ci===0?0:(s%5)+1,rankEstimado:s===2,coliseo:s===4&&ci===1,boat:s===1?0:s*2,trophy:s===3?null:100*s,trophyDelta:s===2?-30:(s===1?25:0)});
const log={ok:true,clanes:clanes.map((c,ci)=>({clan:c,semanas:[[130,1],[130,2],[130,3],[130,4],[129,4]].map(([t,s])=>sem(t,s,ci))}))};
const fix={...FIX,webGuerraEnVivo:{...FIX.webGuerraEnVivo,ctx:{temporada:130,sectionIndex:2,esDiaGuerra:true}},
  webAdminParticipacionHoyGuerra:part,webPronosticoGuerra:pron,webGuerraLog:log};
const SEL=['#clanGrid > *','.clan-pron .cp-row','#pendWrap tbody tr','#participacionHoyWrap .ai-clan-card','#participacionHoyWrap .part-lista li','.part-pend-cero','#controlActivosWrap tbody tr','#controlTemporadaWrap tbody tr','#guerraLogWrap .tbl-log-guerra tbody tr','#guerraLogWrap td[data-raw=""]','.ai-cell-zero','tr.ai-fila-cero','.hist-cero'];
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 for(const w of [390,1280]){const log2=[];
  const p=await pagina(b,base,'guerra.html',{w,fix,log:log2,admin:true});await new Promise(r=>setTimeout(r,2200));
  await p.evaluate(()=>{const e=document.querySelector('#btnVerPronostico');if(e)e.click();});await new Promise(r=>setTimeout(r,1500)); // pronostico dentro de las tarjetas
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));
  await p.evaluate(()=>document.querySelectorAll('.btn-solo-cero').forEach(b=>b.click())); // filtro «Solo con 0 ataques»: tambien se mide con el filtro puesto
  await new Promise(r=>setTimeout(r,500));
  const cuenta=await p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' | '),SEL);
  const v=await correrAxe(p,null,['color-contrast']);
  console.log(w+'px',cuenta,'\n  fallos de contraste:',v.length?JSON.stringify(v):0,'\n  acciones:',[...new Set(log2)].join(','));await p.close();}
 await b.close();s.close();})();
