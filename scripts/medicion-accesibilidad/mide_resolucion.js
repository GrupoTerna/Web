const {serve,launch,pagina}=require('./lib');const {correrAxe,pequenos}=require('./axe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const P=(n,tag,extra={})=>Object.assign({puesto:n,tag,nombre:'Jugador '+n,clan:'Grupo乂Terna™',victorias:30-n,celular:null},extra);
const top3=[P(1,'#A1',{celular:'987654321',prefijo:'51'}),P(2,'#A2'),P(3,'#A3',{verificadoGrupo:true})];
const participantes=[...top3,
 P(4,'#A4',{descalificado:true,tipoResolucion:'Descalificado',motivoResolucion:'No está en el grupo',puestoOriginal:4}),
 P(5,'#A5',{premioRepartido:true,tipoResolucion:'Empate - Reparto de premio',motivoResolucion:'Reparto acordado'}),
 P(6,'#A6',{prestamo:'Luis',nomMulti:'Dueño Seis'}),
 P(7,'#A7',{tipoResolucion:'Cuenta prestada',prestamo:'Pedro',cuentaPrestada:true,motivoResolucion:'x'}),
 P(8,'#A8',{tipoResolucion:'Empate - Partida de desempate',motivoResolucion:'Desempate',puestoOriginal:8})];
const fix={webAdminGanadoresTorneoDetalle:{ok:true,idTorneo:'T9',fecha:new Date().toISOString(),top3,participantes}};
(async()=>{const s=await serve();const base='http://localhost:'+s.address().port+'/';const b=await launch();
for(const w of [390,1280]){
  const log=[];const p=await pagina(b,base,'admin.html',{admin:true,w,log,fix});await sleep(1200);
  await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>{if(d.querySelector('#ganadoresLista'))d.open=true;});});
  await sleep(500);
  console.log(`\n=== Resolución @${w}px; lista completa cerrada: filas visibles =`,await p.$$eval('#ganadoresLista .contenido-item',e=>e.filter(x=>x.checkVisibility({checkVisibilityCSS:true,contentVisibilityAuto:true})).length));
  console.log('axe (lista cerrada):',JSON.stringify(await correrAxe(p,'#ganadoresLista')));
  console.log('objetivos <24px (cerrada):',JSON.stringify(await pequenos(p,'#ganadoresLista')));
  // abrir la lista completa con TECLADO (Enter en el summary)
  await p.evaluate(()=>document.querySelector('#ganadoresLista details summary').focus());
  await p.keyboard.press('Enter');await sleep(200);
  console.log('lista completa abierta con Enter:',await p.$eval('#ganadoresLista details',d=>d.open),'| filas visibles:',await p.$$eval('#ganadoresLista .contenido-item',e=>e.filter(x=>x.checkVisibility({checkVisibilityCSS:true,contentVisibilityAuto:true})).length));
  console.log('axe (lista abierta):',JSON.stringify(await correrAxe(p,'#ganadoresLista')));
  console.log('objetivos <24px (abierta):',JSON.stringify((await pequenos(p,'#ganadoresLista')).filter(x=>!x.cumple)));
  async function tabsHasta(tagBtn){
    await p.evaluate((t)=>{document.querySelector('#ganadoresLista .btnGestionarResolucion[data-tag="'+t+'"]').focus();},tagBtn);
    await p.keyboard.press('Enter');await sleep(300);
    // desde el 12-oct-2026 (H-1) el foco ya pasa solo a #resTipo: se mide el foco inmediato y, si no esta ahi, los Tab que faltan
    const foco0=await p.evaluate(()=>document.activeElement.id||document.activeElement.className);
    let n=0;if(foco0!=='resTipo'){for(;n<80;n++){await p.keyboard.press('Tab');const id=await p.evaluate(()=>document.activeElement.id);if(id==='resTipo'){n++;break;}}}
    return {focoInmediato:foco0,tabsExtra:n};
  }
  console.log('Foco/Tabs tras Gestionar de #A1 (1.a fila):',JSON.stringify(await tabsHasta('#A1')));
  console.log('Foco/Tabs tras Gestionar de #A8 (última fila):',JSON.stringify(await tabsHasta('#A8')));
  // una cuenta que solo esta en la lista completa: #A8. Gestionar con teclado
  await p.evaluate(()=>document.querySelector('#ganadoresLista details .btnGestionarResolucion[data-tag="#A8"]').focus());
  await p.keyboard.press('Enter');await sleep(400);
  const foco=await p.evaluate(()=>{const a=document.activeElement;return a.tagName.toLowerCase()+(a.id?'#'+a.id:'')+'.'+(a.className||'')+' "'+(a.textContent||'').trim().slice(0,30)+'"';});
  console.log('formulario visible:',await p.$eval('#resolucionForm',e=>getComputedStyle(e).display),'| foco tras Gestionar:',foco);
  // cuantos Tab hasta resTipo
  let n=0,hallado=false;const seq=[];
  for(;n<60;n++){await p.keyboard.press('Tab');const id=await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName);seq.push(id);if(id==='resTipo'){hallado=true;break;}}
  console.log('Tab hasta #resTipo:',hallado?n+1:'no llegó en 60','| recorrido (últimos 8):',seq.slice(-8).join(' > '));
  console.log('axe (formulario):',JSON.stringify(await correrAxe(p,'#resolucionForm')));
  console.log('objetivos <24px (formulario):',JSON.stringify((await pequenos(p,'#resolucionForm')).filter(x=>!x.cumple)));
  await p.focus('#btnCancelarResolucion');await p.keyboard.press('Enter');await sleep(300);
  console.log('foco tras Cancelar (formulario se oculta):',await p.evaluate(()=>{const a=document.activeElement;return a.tagName+(a.id?'#'+a.id:'')}),'| formulario:',await p.$eval('#resolucionForm',e=>getComputedStyle(e).display));
  console.log('errores JS:',log.filter(x=>x.startsWith('PAGEERROR')));
  await p.close();
}
await b.close();s.close();})();
