// Datos inventados (sin personas reales) para pintar el contenido dinamico de las paginas publicas.
const clanes0n=i=>['Terna Uno','Terna Dos'][i%2];
const miembros=['Ana','Beto','Carla','Diego','Elena','Fabio','Gina','Hugo','Irma','Julio'].map((n,i)=>({nombre:n+' Prueba',tag:'#'+(i+1)+'ABCD',rango:['Lider','Colider','Veterano','Miembro'][i%4],copas:7000-i*130,vGuerra:40-i,royaleApi:'https://royaleapi.com/player/'+(i+1)+'ABCD',cwStats:'https://cwstats.com/player/'+(i+1)+'ABCD',ranking:i+1,arena:'Arena '+(10+i%4),nivelXp:60-i,nivelCartas:14-(i%3),antiguedad:1+i%3,vigencia:'2026-12-0'+(1+i%9),fechaIngreso:'2025-0'+(1+i%9)+'-15',clan:clanes0n(i),historialSemanal:[0,1,2,3,4,5].map(k=>({semana:String(7+(k*7)%21).padStart(2,'0')+'/0'+(9-(k>3?1:0))+'/2026',fame:3200-k*180-i*40,barcos:k%3,ataques:16-k%4,ataquesTotal:16}))}));
const clanes=['Terna Uno','Terna Dos'].map((nombre,i)=>({nombre,clanTag:'#CL'+i,lider:'Lider '+i,liga:'Liga 5',requerimiento:5000,badgeId:16000000+i,royaleApi:'https://royaleapi.com/clan/CL'+i,cwStats:'https://cwstats.com/clan/CL'+i}));
// webClanCopas: 4 semanas de jueves a domingo (dd/MM/yyyy), copas crecientes
const puntos=[];for(let d=0;d<28;d++){const f=new Date(2026,8,10+d);if(![0,4,5,6].includes(f.getDay()))continue;puntos.push({fecha:String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0')+'/2026',copas:30000+d*120});}
const rk=(n)=>Array.from({length:5},(_,i)=>({nombre:['Ana','Beto','Carla','Diego','Elena'][i]+' Prueba',tag:'#'+(i+1)+'ABCD',clan:clanes[i%2].nombre,valor:n-i*7}));
const cartas=['Caballero','Arqueras','Bola de fuego','Mago','Gigante','Esqueletos','Mosquetera','Valquiria','Cohete','Barril'].map((name,i)=>({name,rarity:['common','rare','epic','legendary','champion'][i%5],usos:900-i*40,hasHero:i%3===0,hasEvolution:i%4===0,heroIcon:'',icon:'',tipo:'Tropa',elixirCost:(i%6)+2}));
const nm=['Ana','Beto','Carla','Diego','Elena','Fabio'];
const part=(k)=>nm.map((n,i)=>({puesto:i+1,nombre:n+' Prueba',tag:'#'+(i+1)+'ABCD',clan:clanes[(i+k)%2].nombre,victorias:12-i*2,premioRepartido:i===1,descalificado:i===5}));
const dia=(d)=>new Date(Date.UTC(2026,9,12-d,20,0,0)).toISOString();
const torneosLista=[0,2,5,9].map((d,i)=>({idTorneo:'T'+(i+1),fecha:dia(d),clan:clanes[i%2].nombre,organizador:'Organizador '+(i+1)}));
const ingresos=miembros.slice(0,4).map((m,i)=>({nombre:m.nombre,tag:m.tag,clan:m.clan,copas:m.copas,nivelXp:m.nivelXp,vGuerra:m.vGuerra,diasInactivo:i*3,vigencia:m.vigencia,guerraSemana:{ataques:8+i,ataquesMax:16},historialSemanal:m.historialSemanal}));
// mensajes.html: las categorias salen del propio HTML (data-categoria), para que el fixture no se desactualice
const fs=require('fs'),path=require('path');
const categorias=[...new Set([...fs.readFileSync(path.join(__dirname,'..','..','mensajes.html'),'utf8').matchAll(/data-categoria="([^"$]+)"/g)].map(m=>m[1]))];
const opcionesMsg=['Opcion A','Opcion B'].map((e,i)=>({etiqueta:e,subcategoria:'Sub '+(i+1),clan:clanes[i].nombre,contenido:'Texto de prueba de la categoria.\nSegunda linea con *negrita* y enlace https://ejemplo.invalid/x',docId:i?'':'doc-simulado'}));
const funcionesPerm=['Registrar miembro nuevo','Vetar','Modificar torneo','Corregir autor','Actualizar roster'].map(id=>({id,etiqueta:id,descripcion:'Descripcion de prueba de la funcion '+id+'.'}));
const adminsPerm=['Diana','Ana','Beto'].map((n,i)=>({id:'ADM'+(i+1),nombre:n+' Prueba',esTu:i===0,funciones:funcionesPerm.slice(0,i+2).map(f=>f.id),categorias:categorias.slice(0,i+1),clanesAdmin:clanes[i%2].nombre,cuentas:[{nombre:n+' Principal',tag:'#'+(i+1)+'ABCD',clan:clanes[0].nombre},{nombre:n+' Alt',tag:'#'+(i+5)+'ABCD',clan:clanes[1].nombre}]}));
// guerra.html: control diario (J/V/S/D) y control de temporada (Sem 1..N), por clan
const dd=(k,t)=>({j:Math.min(4,t),v:(k+1)%5,s:k%4,d:null,total:Math.min(4,t)+(k+1)%5+k%4});
// Forma REAL de una fila de Valores diarios (Base/src/38_Web_Endpoints.gs, _getControlActivosGridPorTemporada): ataques j,v,s,d,total en la propia fila; puntaje y barcos como objetos {j,v,s,d,total}; opc solo si hay dias opcionales. Un dia sin registro = null.
const filasDia=(c)=>miembros.map((m,k)=>{const a=dd(k,4),nada=k===9;const o=(x)=>nada?null:x;
 return {tag:m.tag,nombre:m.nombre,rango:m.rango==='Lider'?'Líder':(m.rango==='Colider'?'Colíder':m.rango),activo:k!==9,
  j:o(a.j),v:o(a.v),s:o(a.s),d:null,total:o(a.total),
  puntaje:{j:o(1400-k*60),v:o(1300-k*50),s:o(900),d:null,total:o(3600-k*110)},
  barcos:{j:o(k%3),v:o((k+1)%3),s:o(0),d:null,total:o(k%3+(k+1)%3)},
  ...(k%2?{opc:['s']}:{})};});
const sw=(k,base)=>[0,1,2,3].map(i=>k===9&&i<2?null:Math.max(0,base-(i+k)%5));
const filasTemp=(c)=>miembros.map((m,k)=>({tag:m.tag,nombre:m.nombre,rango:m.rango==='Lider'?'Líder':(m.rango==='Colider'?'Colíder':m.rango),activo:k!==9,ataques:{semanas:sw(k,16),total:60-k,pct:Math.round((60-k)/64*100)},barcos:{semanas:sw(k,3),total:9-k%5,pct:Math.round((9-k%5)/12*100)},puntaje:{semanas:sw(k,3000),prom:2500-k*40,pct:null}}));
const porClanF=(fn)=>Object.fromEntries(clanes.map(c=>[c.nombre,fn(c)]));
const FIXGUERRA={
 valoresDiariosSelectores:{anios:[2026],temporadasPorAnio:{2026:[130]},semanasPorTemporada:{130:[0,1,2,3]},porDefecto:{anio:2026,temporada:130,sectionIndex:2}},
 valoresDiariosPorSemana:{130:{2:porClanF(filasDia)}},
 controlTemporadaSelectores:{anios:[2026],temporadasPorAnio:{2026:[{temporada:130,etiqueta:'Temporada 130'}]},porDefecto:{anio:2026,temporada:130}},
 controlTemporadaSemanas:['Sem 1','Sem 2','Sem 3','Sem 4'],
 controlTemporadaPorClan:porClanF(filasTemp),
};
const FIX={
 webAdminMisPermisos:{ok:true,panelPermisos:true,funciones:funcionesPerm.map(f=>f.id),categorias},
 webPermisosListar:{ok:true,admins:adminsPerm,funciones:funcionesPerm,categorias,clanes:clanes.map(c=>c.nombre)},
 webAdminCategorias:{ok:true,categorias},
 webAdminContenido:{ok:true,opciones:opcionesMsg},
 webIngresosRecientes:{ok:true,ingresos},
 webAscensosRecientes:{ok:true,ascensos:[{nombre:'Ana Prueba',tag:'#1ABCD',rangoAnterior:'Miembro',rangoNuevo:'Veterano',clan:clanes[0].nombre,fechaTxt:'12/10/2026'},{nombre:'Beto Prueba',tag:'#2ABCD',rangoAnterior:'Veterano',rangoNuevo:'Colider',clan:clanes[1].nombre,fechaTxt:'05/10/2026'}]},
 webTorneos:{ok:true,ganadores:{top3:part(0).slice(0,3),participantes:part(0)},torneos:torneosLista},
 webHistorialTorneos:{ok:true,historial:torneosLista.map((t,i)=>({...t,top3:part(i).slice(0,3),participantes:part(i)}))},
 webAniversarios:{ok:true,aniversarios:[{nombre:'Ana Prueba',tag:'#1ABCD',clan:clanes[0].nombre,fechaIngTxt:'12/10/2025',hitoMeses:12,diasFaltantes:0},{nombre:'Beto Prueba',tag:'#2ABCD',clan:clanes[1].nombre,fechaIngTxt:'20/10/2025',hitoMeses:12,diasFaltantes:8},{nombre:'Carla Prueba',tag:'#3ABCD',clan:clanes[0].nombre,fechaIngTxt:'13/04/2026',hitoMeses:6,diasFaltantes:1}]},
 webRankings:{ok:true,donadores:rk(4000),racha:rk(60),torneos:rk(300),victorias3c:rk(120)},
 webEstadisticasCartas:{ok:true,top10:cartas},
 webClanCopas:{ok:true,puntos},
 webClanInfo:{ok:true,clanes},
 webRoster:{ok:true,clanes:clanes.map(c=>({nombre:c.nombre,miembros}))},
 webGuerraEnVivo:{ok:true,...FIXGUERRA,ctx:{temporada:130,sectionIndex:2},guerraPorClan:{'Terna Uno':{ataques:180,fame:52000,barcos:3,atacaron:38,totalHoy:50},'Terna Dos':{ataques:150,fame:41000,barcos:2,atacaron:30,totalHoy:50}},pendientes:miembros.map((m,i)=>({clan:clanes[i%2].nombre,nombre:m.nombre,tag:m.tag,rango:m.rango==='Lider'?'Líder':(m.rango==='Colider'?'Colíder':m.rango),faltantes:(i%4)+1,royaleApi:m.royaleApi,cwStats:m.cwStats}))},
};
module.exports={FIX};
