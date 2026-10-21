// Textos de menos de 11 px (tamano RENDERIZADO) en la ventana «Niveles y evoluciones» de perfil.html, en movil, con datos inventados.
// En SVG el tamano renderizado = font-size en unidades de usuario x escala del viewBox (getScreenCTM().a). En HTML = font-size calculado.
// Uso: node mide_textos_chicos.js [limite=11] [anchos=320,360,390,412]   (si el boton no existe o el overlay no abre, lo dice: esa parte NO quedo medida)
const {serve,launch,pagina}=require('./lib');const {FIX}=require('./fixtures');const {FIXPERFIL}=require('./fixtures_perfil');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),LIM=+process.argv[2]||11,ANCHOS=(process.argv[3]||'320,360,390,412').split(',').map(Number),fix={...FIX,...FIXPERFIL};
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 for(const w of ANCHOS){const log=[];
  const p=await pagina(b,base,'perfil.html?tag=%231ABCD',{w,fix,log,admin:false});await sleep(2500);
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));await sleep(300);
  const hay=await p.evaluate(()=>{const e=document.getElementById('mColeccionNivelBtn');if(e)e.click();return !!e;});await sleep(900);
  if(!hay){console.log(w+'px: NO existe #mColeccionNivelBtn con estos datos (no medido)');await p.close();continue;}
  const r=await p.evaluate(LIM=>{
   const ov=document.getElementById('coleccionModalOverlay');const vis=ov&&ov.getClientRects().length&&getComputedStyle(ov).visibility!=='hidden'&&getComputedStyle(ov).display!=='none';
   if(!vis)return {abierta:false};
   const out=[],total={n:0};const sel=el=>(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):el.tagName.toLowerCase());
   ov.querySelectorAll('*').forEach(el=>{
    if(!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))return;
    if(el.closest('.sr-only')||!el.getClientRects().length)return;
    const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;
    let px=parseFloat(cs.fontSize);const svg=el instanceof SVGElement;
    if(svg){const m=el.getScreenCTM();if(m)px=px*Math.hypot(m.a,m.b);}
    total.n++;
    if(px<LIM)out.push({px:+px.toFixed(1),svg,txt:el.textContent.trim().replace(/\s+/g,' ').slice(0,34),sel:sel(el)+(svg?' (svg)':'')});});
   return {abierta:true,total:total.n,chicos:out,ancho:ov.getBoundingClientRect().width};},LIM);
  if(!r.abierta){console.log(w+'px: el overlay no se abrio (no medido)');await p.close();continue;}
  const g={};r.chicos.forEach(x=>{const k=x.px+' px | '+x.sel;(g[k]=g[k]||{n:0,ej:[]}).n++;if(g[k].ej.length<3)g[k].ej.push(x.txt);});
  console.log('\n'+w+'px: '+r.total+' textos visibles; '+r.chicos.length+' menores de '+LIM+' px (ventana de '+Math.round(r.ancho)+' px)');
  Object.entries(g).sort((a,c)=>parseFloat(a[0])-parseFloat(c[0])).forEach(([k,v])=>console.log('  '+k+'  x'+v.n+'  ej: '+v.ej.map(e=>'«'+e+'»').join(' ')));
  const er=log.filter(x=>x.startsWith('PAGEERROR'));if(er.length)console.log('  errores JS:',er.join(' || ').slice(0,200));
  await p.close();}
 await b.close();s.close();})();
