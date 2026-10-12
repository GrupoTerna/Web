const fs=require('fs');const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
async function correrAxe(page,selector,reglas){
  await page.evaluate(AXE);
  return page.evaluate(async(sel,reglas)=>{
    const ctx=sel?{include:[[sel]]}:document;
    const r=await axe.run(ctx,reglas?{runOnly:{type:'rule',values:reglas}}:{});
    return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,ej:v.nodes.slice(0,3).map(n=>n.target.join(' ')+' :: '+(n.failureSummary||'').split('\n').slice(0,3).join(' | ').slice(0,260))}));
  },selector,reglas);
}
async function pequenos(page,rootSel){
  return page.evaluate((rootSel)=>{
    const root=document.querySelector(rootSel)||document;
    const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&e.offsetParent!==null;};
    const els=[...root.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[tabindex]')].filter(vis);
    const rects=els.map(e=>{let r=e.getBoundingClientRect();
      // un checkbox dentro de label: el objetivo es el control; la etiqueta asociada se evalua aparte
      return {e,r};});
    const out=[];
    for(const a of rects){
      if(a.r.width>=24&&a.r.height>=24)continue;
      const cx=a.r.x+a.r.width/2,cy=a.r.y+a.r.height/2;
      let toca=false;
      for(const b of rects){ if(b===a)continue;
        const bx=b.r.x+b.r.width/2,by=b.r.y+b.r.height/2;
        const small=b.r.width<24||b.r.height<24;
        const d=Math.hypot(cx-bx,cy-by);
        if(small? d<24 : (Math.abs(cx-bx)<(12+b.r.width/2)&&Math.abs(cy-by)<(12+b.r.height/2))){toca=true;break;}
      }
      out.push({el:a.e.tagName.toLowerCase()+(a.e.id?'#'+a.e.id:'')+(a.e.className&&typeof a.e.className==='string'?'.'+a.e.className.split(' ')[0]:''),w:Math.round(a.r.width),h:Math.round(a.r.height),cumple:!toca,texto:(a.e.textContent||a.e.getAttribute('aria-label')||'').trim().slice(0,30)});
    }
    return out;
  },rootSel);
}
module.exports={correrAxe,pequenos};
