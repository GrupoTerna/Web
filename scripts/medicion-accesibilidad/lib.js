const http=require('http'),fs=require('fs'),path=require('path');
const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');
const puppeteer=require('puppeteer-core');
const ROOT=path.join(__dirname,'..','..'); // raiz de Web/
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
function serve(){return new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});s.listen(0,()=>r(s));});}
async function launch(){return puppeteer.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:'shell'});}
const hoy=new Date();hoy.setHours(20,0,0,0);
const FIX={
 webAdminTorneosHoy:{ok:true,torneos:[
  {id:'T1',fecha:hoy.toISOString(),autor:'Diana',organizadorFuente:'Manual',premios:'1°: 500|2°: 300',semanas:['2026-S40'],comentario:'Prueba',tagTor:'#TOR1',link:'https://link.clashroyale.com/x1'},
  {id:'T2',fecha:new Date(hoy.getTime()+36e5).toISOString(),autor:'Ana López',organizadorFuente:'API',premios:'',semanas:[],comentario:'',tagTor:'#TOR2',link:'https://link.clashroyale.com/x2'}]},
 webAdminSorteosHoy:{ok:true,sorteos:[
  {id:'S1',fecha:hoy.toISOString(),autor:'Diana',premios:'Skin|Gemas',semanas:['2026-S40'],comentario:''}]},
};
async function pagina(browser,base,url,{admin=false,w=390,h=900,fix={},log=[]}={}){
  const page=await browser.newPage();await page.setViewport({width:w,height:h});
  await page.setRequestInterception(true);
  page.on('request',req=>{const u=req.url();
    if(u.startsWith(base))return req.continue();
    if(u.includes('script.google.com')){const a=new URL(u).searchParams.get('accion');log.push(a);
      const body=(fix[a]||FIX[a]||{ok:true});return req.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});}
    req.abort();});
  page.on('pageerror',e=>log.push('PAGEERROR '+e.message));
  if(admin){await page.evaluateOnNewDocument(()=>{localStorage.setItem('terna_admin_token','tok-simulado');localStorage.setItem('terna_admin_info',JSON.stringify({nombre:'Diana',nomMulti:'Diana',funciones:'Registrar miembro nuevo,Vetar,Modificar torneo'}));});}
  await page.goto(base+url,{waitUntil:'load'});
  return page;}
module.exports={serve,launch,pagina,FIX};
