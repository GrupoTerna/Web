// D-20 (contraste WCAG 1.4.3) de perfil.html con datos inventados: carga base, paneles que se abren con un clic
// (torneos, cofres, batallas, otras cuentas, historial de guerra, vetar), coleccion, mazo y la ventana de sugerencias.
// Uso: node mide_perfil.js   (si un selector de SEL da 0, esa parte NO quedo medida)
const {serve,launch,pagina}=require('./lib');const {correrAxe}=require('./axe');const {FIX}=require('./fixtures');const {FIXPERFIL}=require('./fixtures_perfil');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fix={...FIX,...FIXPERFIL};
const SEL={base:['#mNombre','#mSub','#mReqContenido .req-row','#mExtWrap .ext-item, .ext-grid .ext-item','#mMiniGraficosWrap > *','#mRankingChart svg','#mCopasChart svg','#mAtaquesChart svg','#mPuntajeChart svg','#mBarcosChart svg','#mMazoActualContenido > *','#mFavoritaContenido > *','#mLeyendasContenido > *','#mColeccionContenido > *','#mTorresContenido > *','#mInsigniasContenido > *','#mLogrosContenido > *','#mProgresoContenido > *','#mSnapshotInfo'],
 paneles:['#mTorneosWrap .ingreso-row','#mCicloCofresWrap .cc-cofre-item','#mBatallasRecientesWrap .bt-row','#mBatallasRecientesWrap .bt-defensa','#mOtrasCuentasWrap .js-otra-cuenta','#histGuerraTbody tr','#mVetarWrap *']};
const clic=(p,q)=>p.evaluate(s=>{const e=document.querySelector(s);if(e)e.click();return !!e;},q);
(async()=>{const s=await serve(),base='http://localhost:'+s.address().port+'/',b=await launch();
 for(const w of [390,1280]){const log=[];
  const p=await pagina(b,base,'perfil.html?tag=%231ABCD',{w,fix,log,admin:true});await sleep(2500);
  const cnt=async ss=>p.evaluate(ss=>ss.map(x=>x+'='+document.querySelectorAll(x).length).join(' | '),ss);
  const med=async t=>{const v=await correrAxe(p,null,['color-contrast']);console.log(w+'px',t,'\n  ',await cnt(SEL.base.concat(SEL.paneles)).then(x=>x.split(' | ').filter(y=>!y.endsWith('=0')).join(' | ')||'(nada)'),'\n   fallos de contraste:',v.length?JSON.stringify(v):0);};
  await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'));}));
  console.log(w+'px selectores en 0 tras la carga base:',(await cnt(SEL.base)).split(' | ').filter(y=>y.endsWith('=0')).join(' | ')||'ninguno');
  await med('carga base');
  for(const [n,q] of [['torneos','#btnVerTorneosJugador'],['cofres','#mVerCicloCofresBtn'],['batallas','#mVerBatallasRecientesBtn'],['otras cuentas','#btnVerOtrasCuentas'],['historial de guerra','#mVerHistorialGuerraBtn'],['vetar','#btnVetarJugador']]){
   const ok=await clic(p,q);await sleep(900);if(!ok)console.log('  (no existe',q,')');}
  await med('con todos los paneles abiertos');
  const okM=await clic(p,'#mMazoSugerenciasBtn');await sleep(700);await clic(p,'#mazoModalGenerar');await sleep(700);
  console.log(w+'px ventana de sugerencias de mazo: boton',okM,'| abierta:',await p.evaluate(()=>{const m=document.getElementById('mazoModal');return !!m&&getComputedStyle(m).display!=='none'&&m.offsetParent!==null||!!(m&&m.classList.contains('abierto'))}),'| elementos en el modal:',await p.evaluate(()=>document.querySelectorAll('#mazoModal *').length));
  {const v=await correrAxe(p,null,['color-contrast']);console.log('   fallos de contraste:',v.length?JSON.stringify(v):0);}
  console.log('  errores JS:',log.filter(x=>x.startsWith('PAGEERROR')).join(' || ')||'ninguno','| acciones:',[...new Set(log)].filter(x=>!x.startsWith('PAGEERROR')).join(','));
  await p.close();}
 await b.close();s.close();})();
