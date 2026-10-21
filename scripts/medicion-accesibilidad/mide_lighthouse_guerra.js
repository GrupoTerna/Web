// Lighthouse REAL (movil, throttling simulado, el mismo modo que la CI semanal) de guerra.html con datos inventados GRANDES: 4 clanes x 50 jugadores y 5 semanas de temporada.
// Pendiente «TBT de guerra» (§PF018). Uso: node mide_lighthouse_guerra.js [corridas=5] [jugadoresPorClan=50] [pagina=guerra.html]
// Claves que costaron descubrirse (ver §PF018): (1) Chromium SIN --single-process ni --no-zygote: con ellas el trazado no atribuye ninguna tarea y Lighthouse devuelve TBT 0 y «Unattributable»;
// (2) sin interceptar con Puppeteer: un servidor local reescribe las URLs de raw.githubusercontent.com y de Apps Script hacia /__data/ y /__api; (3) la primera corrida sale mucho peor (arranque en frio): se reporta aparte.
// Los datos son inventados y guerra.json se simula con la misma forma; no prueban el backend real.
const http=require('http'),fs=require('fs'),path=require('path');
const N=+process.argv[2]||5, J=+process.argv[3]||50, PAG=process.argv[4]||'guerra.html', CLANES=['Terna Uno','Terna Dos','Terna Tres','Terna Cuatro'], SEM=5;
const rangos=['Líder','Colíder','Veterano','Miembro'];
const jug=(c,k)=>({tag:'#'+c+'J'+String(k).padStart(3,'0'),nombre:'Jugador '+c+'-'+k+' Prueba',rango:rangos[k%4],activo:k%11!==0});
const a=(k,t)=>({j:Math.min(4,t),v:(k+1)%5,s:k%4,d:null,total:Math.min(4,t)+(k+1)%5+k%4});
const filasDia=c=>Array.from({length:J},(_,k)=>{const m=jug(c,k),x=a(k,4);return {...m,j:x.j,v:x.v,s:x.s,d:null,total:x.total,puntaje:{j:1400-k*20,v:1300-k*15,s:900,d:null,total:3600-k*40},barcos:{j:k%3,v:(k+1)%3,s:0,d:null,total:k%3+(k+1)%3},...(k%2?{opc:['s']}:{})};});
const sw=(k,base)=>Array.from({length:SEM},(_,i)=>Math.max(0,base-(i+k)%5));
const filasTemp=c=>Array.from({length:J},(_,k)=>({...jug(c,k),ataques:{semanas:sw(k,16),total:60-k%30,pct:Math.round((60-k%30)/64*100)},barcos:{semanas:sw(k,3),total:9-k%5,pct:Math.round((9-k%5)/12*100)},puntaje:{semanas:sw(k,3000),prom:2500-k*20,pct:null}}));
const por=fn=>Object.fromEntries(CLANES.map((n,c)=>[n,fn(c)]));
const guerra=()=>({ok:true,ctx:{temporada:130,sectionIndex:2},_publicadoEn:new Date().toISOString(),
 valoresDiariosSelectores:{anios:[2026],temporadasPorAnio:{2026:[130]},semanasPorTemporada:{130:[0,1,2,3]},porDefecto:{anio:2026,temporada:130,sectionIndex:2}},
 valoresDiariosPorSemana:{130:{2:por(filasDia)}},
 controlTemporadaSelectores:{anios:[2026],temporadasPorAnio:{2026:[{temporada:130,etiqueta:'Temporada 130'}]},porDefecto:{anio:2026,temporada:130}},
 controlTemporadaSemanas:Array.from({length:SEM},(_,i)=>'Sem '+(i+1)),controlTemporadaPorClan:por(filasTemp),
 guerraPorClan:Object.fromEntries(CLANES.map((n,c)=>[n,{ataques:180-c*10,fame:52000-c*3000,barcos:3,atacaron:38,totalHoy:J}])),
 pendientes:CLANES.flatMap((n,c)=>Array.from({length:J},(_,k)=>({clan:n,...jug(c,k),faltantes:(k%4)+1,royaleApi:'https://royaleapi.com/player/x',cwStats:'https://cwstats.com/player/x'})))});

const ROOT=path.join(__dirname,'..','..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
(async()=>{
 const G=JSON.stringify(guerra());let base='';
 const srv=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);const cors={'access-control-allow-origin':'*'};
  if(p.startsWith('/__data/')){const ok=p.includes('guerra.json');res.writeHead(ok?200:404,{...cors,'content-type':'application/json'});return res.end(ok?G:'{}');}
  if(p.startsWith('/__api')){res.writeHead(200,{...cors,'content-type':'application/json'});return res.end('{"ok":true}');}
  if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}
  let body=fs.readFileSync(f);const ext=path.extname(f);
  if(ext==='.html'||ext==='.js'){body=body.toString('utf8').split('https://raw.githubusercontent.com/GrupoTerna/Web/data/').join(base+'__data/').replace(/https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec/g,base+'__api');}
  res.writeHead(200,{'content-type':MIME[ext]||'application/octet-stream'});res.end(body);});
 await new Promise(r=>srv.listen(0,r));base='http://localhost:'+srv.address().port+'/';
 const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium'),puppeteer=require('puppeteer-core');
 const args=chromium.args.filter(a=>!/single-process|no-zygote/.test(a));
 const b=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...args,'--remote-debugging-port=9334'],headless:'shell',timeout:30000});
 const {default:lighthouse}=await import('lighthouse');
 console.log(PAG,'| guerra.json simulado:',Math.round(G.length/1024),'KB;',CLANES.length,'clanes x',J,'jugadores x',SEM,'semanas | Lighthouse',require('lighthouse/package.json').version,'movil, simulado');
 const res=[];
 for(let i=0;i<N;i++){
  const r=await lighthouse(base+PAG,{port:9334,logLevel:'error',output:'json',onlyCategories:['performance'],formFactor:'mobile',throttlingMethod:'simulate'});
  const A=r.lhr.audits,largas=(A['long-tasks']?.details?.items||[]).map(x=>Math.round(x.duration));
  const o={rend:Math.round(r.lhr.categories.performance.score*100),TBT:Math.round(A['total-blocking-time'].numericValue),FCP:Math.round(A['first-contentful-paint'].numericValue),LCP:Math.round(A['largest-contentful-paint'].numericValue),CLS:+A['cumulative-layout-shift'].numericValue.toFixed(3),
   mayor:Math.max(0,...largas),largas:largas.length,bootup:Object.values(A['bootup-time']?.details?.items||{}).slice(0,3).map(x=>x.url.split('/').pop().slice(0,18)+' '+Math.round(x.total)).join(' / ')};
  o.hilo=(A['mainthread-work-breakdown']?.details?.items||[]).slice(0,5).map(x=>x.groupLabel+' '+Math.round(x.duration)).join(' / ');
  res.push(o);console.log('corrida',i+1+(i?'':' (arranque en frio)'),JSON.stringify(o));}
 const calientes=res.slice(1),med=(a,k)=>{const v=a.map(x=>x[k]).sort((p,q)=>p-q);return v[Math.floor(v.length/2)];};
 console.log('MEDIANA sin la primera (n='+calientes.length+'): TBT',med(calientes,'TBT'),'ms | tarea mayor',med(calientes,'mayor'),'ms | LCP',med(calientes,'LCP'),'ms | rendimiento',med(calientes,'rend'),'| TBT min-max',Math.min(...calientes.map(x=>x.TBT)),'-',Math.max(...calientes.map(x=>x.TBT)));
 await b.close();srv.close();process.exit(0);})();
