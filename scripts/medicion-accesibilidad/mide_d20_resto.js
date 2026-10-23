// D-20 (contraste WCAG 1.4.3), partes que faltaban: mini historial por jugador de guerra.html, comparador de directorio.html
// y «Ver original» de mensajes.html. Uso: node mide_d20_resto.js [historial|comparador|original ...]
// Datos inventados; no prueban el backend real. Si un selector de SEL da 0, esa parte NO quedo medida.
const {serve,launch,pagina}=require('./lib');const {correrAxe}=require('./axe');const {FIX}=require('./fixtures');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// «Hoy» fijo: sabado 17-oct-2026 (el panel solo muestra jueves a domingo y marca el dia en curso)
const HOY_ISO='2026-10-17';
const fijarHoy=p=>p.evaluate(()=>{const R=Date,fijo=new R(2026,9,17,12,0,0).getTime();
  class D extends R{constructor(...a){a.length?super(...a):super(fijo);} static now(){return fijo;}}window.Date=D;});
const fechasGuerra=n=>{const out=[];for(let d=0;out.length<n;d++){const f=new Date(2026,9,17-d);if(f.getDay()===0||f.getDay()>=4)out.push(f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0'));}return out;};
const regs=(n,k)=>fechasGuerra(n).map((fecha,i)=>({fecha,ataques:fecha===HOY_ISO?2:(i%7===3?0:4-(i+k)%3),fame:fecha===HOY_ISO?800:(i%7===3?0:1500-i*20),barcos:i%4,opcional:i===5}));
const hist={ok:true,a:regs(40,0),b:regs(36,1)};
const jug=(i,n)=>({tag:'#'+i+'ABCD',nombre:n+' Prueba',clan:'Terna Uno',rango:'Veterano',copas:7000-i*100,vGuerra:40-i,torneos:12+i,vigencia:'2026-12-05T10:30:00',guerraSemana:{ataques:9+i,ataquesMax:12},extendido:{racha:3+i,donacionesRealizadas:5000-i*200,donacionesRecibidas:4000,victorias3Coronas:900,rankingClan:i}});
const comp={ok:true,a:jug(1,'Ana'),b:jug(2,'Beto')};
// Estructura REAL del export de un Doc de Google (leida de 2 Docs de Drive el 14-oct-2026; solo estilos, texto inventado): todo en linea, sin clases; p y span con color:#000000; el enlace va en un span con color:#1155cc y subrayado, y la <a> con color:inherit. Sin fondo propio: el fondo es el de .doc-original.
const P='padding-top:12pt;margin:0;color:#000000;padding-left:0;font-size:11pt;padding-bottom:12pt;font-family:&quot;Arial&quot;;line-height:1.15;text-align:left;padding-right:0';
const SP='color:#000000;font-weight:400;text-decoration:none;vertical-align:baseline;font-size:11pt;font-family:&quot;Arial&quot;;font-style:normal';
const docReal='<p style="'+P+'"><span style="'+SP+'">Texto de ejemplo con estructura de Doc real</span></p><p style="'+P+'"><span style="font-size:10pt">Enlace: </span><span style="text-decoration-skip-ink:none;font-size:10pt;color:#1155cc;text-decoration:underline"><a href="https://ejemplo.invalid/enlace" style="color:inherit;text-decoration:inherit">https://ejemplo.invalid/enlace</a></span></p><p style="'+P+'"><span style="'+SP.replace('font-size:11pt','font-size:10pt')+'">Texto en 10 pt</span></p>';
const doc=docReal+'<h1>Reglas del clan</h1><p><span>Texto normal del documento con un </span><a href="https://ejemplo.invalid/enlace">enlace de ejemplo</a><span> y más texto.</span></p><ul><li><span>Punto uno</span></li><li><span>Punto dos</span></li></ul><table><tr><td>Celda A</td><td>Celda B</td></tr></table><p><b>Negrita</b> <i>cursiva</i></p>';
const fix={...FIX,webHistorialGuerraComparador:hist,webCompararJugadores:comp,webAdminContenidoDocHtml:{ok:true,html:doc}};
const PARTES={
 async historial(b,base,w){const log=[];const p=await pagina(b,base,'guerra.html',{w,fix,log,admin:true});await sleep(2200);await fijarHoy(p);
  const S=['.btn-hist-jugador','#histFondo.abierto','.hist-tabla tbody tr','.hist-tabla tr.hist-cero','.hist-tabla td.hist-cero','.hist-tabla tr.hist-hoy','.hist-ast','.hist-resumen .hist-malo','.hist-nota','#histMas'];
  const cuenta=async()=>p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' | '),S);
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));
  await p.evaluate(()=>document.querySelector('.btn-hist-jugador').click());await sleep(900);
  let r=[['panel (28 filas)',await cuenta(),await correrAxe(p,null,['color-contrast'])]];
  await p.evaluate(()=>{const m=document.getElementById('histMas');if(m)m.click();});await sleep(400);
  r.push(['panel «Ver todos»',await cuenta(),await correrAxe(p,null,['color-contrast'])]);
  await p.evaluate(()=>{const s=document.getElementById('histSelComp');s.selectedIndex=1;s.dispatchEvent(new Event('change'));});await sleep(900);
  r.push(['comparación',await cuenta(),await correrAxe(p,null,['color-contrast'])]);
  await p.evaluate(()=>{const m=document.getElementById('histMas');if(m)m.click();});await sleep(400);
  r.push(['comparación «Ver todos»',await cuenta(),await correrAxe(p,null,['color-contrast'])]);
  await p.close();return r;},
 async comparador(b,base,w){const log=[];const p=await pagina(b,base,'directorio.html',{w,fix,log});await sleep(2200);
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));
  const poner=(t1,t2)=>p.evaluate((a,c)=>{document.getElementById('compTag1').value=a;document.getElementById('compTag2').value=c;document.getElementById('btnComparar').click();},t1,t2);
  // 1) tags ambiguos (el fixture repite a los miembros en los dos clanes): lista de coincidencias
  await poner('#1ABCD','#2ABCD');await sleep(1200);
  const S1=['#compMsg .js-coincidencia','#compMsg .mr-rango','#compMsg .msg'];
  const r=[['selector de coincidencias',await p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' | '),S1),await correrAxe(p,null,['color-contrast'])]];
  // 2) tags que no estan en el directorio: pasan tal cual al backend y se pinta la comparacion
  await poner('#9XYZ1','#9XYZ2');await sleep(1800);
  const S=['.comp-card','.comp-card .ext-item','#compBarrasWrap > *','.comparativa-grid .chart-card','.comparativa-grid svg','.guerra-chart-legend'];
  r.push(['comparación',await p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' | '),S),await correrAxe(p,null,['color-contrast'])]);
  await p.close();return r;},
 async original(b,base,w){const log=[];const p=await pagina(b,base,'mensajes.html',{w,fix,log,admin:true});await sleep(1800);
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));await sleep(600);
  await p.evaluate(()=>{const e=[...document.querySelectorAll('.btn-ver-pdf')].find(x=>x.offsetParent);if(e)e.click();});await sleep(1200);
  const S=['.btn-ver-pdf','.contenido-item.viendo-original','.doc-original','.doc-original a','.doc-original li','.doc-original td'];
  const cuenta=await p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' | '),S);
  const r=[['Ver original',cuenta,await correrAxe(p,null,['color-contrast'])]];await p.close();return r;}
};
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 const sel=process.argv.slice(2),lista=sel.length?sel:Object.keys(PARTES);
 for(const n of lista)for(const w of [390,1280])for(const [t,cuenta,v] of await PARTES[n](b,base,w))
  console.log(n,w+'px',t,'\n  ',cuenta,'\n   fallos de contraste:',v.length?JSON.stringify(v):0);
 await b.close();s.close();})();
