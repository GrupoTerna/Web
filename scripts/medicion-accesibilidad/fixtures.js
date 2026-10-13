// Datos inventados (sin personas reales) para pintar el contenido dinamico de las paginas publicas.
const miembros=['Ana','Beto','Carla','Diego','Elena','Fabio','Gina','Hugo','Irma','Julio'].map((n,i)=>({nombre:n+' Prueba',tag:'#'+(i+1)+'ABCD',rango:['Lider','Colider','Veterano','Miembro'][i%4],copas:7000-i*130,vGuerra:40-i,royaleApi:'https://royaleapi.com/player/'+(i+1)+'ABCD',cwStats:'https://cwstats.com/player/'+(i+1)+'ABCD'}));
const clanes=['Terna Uno','Terna Dos'].map((nombre,i)=>({nombre,clanTag:'#CL'+i,lider:'Lider '+i,liga:'Liga 5',requerimiento:5000,badgeId:16000000+i,royaleApi:'https://royaleapi.com/clan/CL'+i,cwStats:'https://cwstats.com/clan/CL'+i}));
// webClanCopas: 4 semanas de jueves a domingo (dd/MM/yyyy), copas crecientes
const puntos=[];for(let d=0;d<28;d++){const f=new Date(2026,8,10+d);if(![0,4,5,6].includes(f.getDay()))continue;puntos.push({fecha:String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0')+'/2026',copas:30000+d*120});}
const rk=(n)=>Array.from({length:5},(_,i)=>({nombre:['Ana','Beto','Carla','Diego','Elena'][i]+' Prueba',tag:'#'+(i+1)+'ABCD',clan:clanes[i%2].nombre,valor:n-i*7}));
const cartas=['Caballero','Arqueras','Bola de fuego','Mago','Gigante','Esqueletos','Mosquetera','Valquiria','Cohete','Barril'].map((name,i)=>({name,rarity:['common','rare','epic','legendary','champion'][i%5],usos:900-i*40,hasHero:i%3===0,hasEvolution:i%4===0,heroIcon:'',icon:'',tipo:'Tropa',elixirCost:(i%6)+2}));
const FIX={
 webAniversarios:{ok:true,aniversarios:[{nombre:'Ana Prueba',tag:'#1ABCD',clan:clanes[0].nombre,fechaIngTxt:'12/10/2025',hitoMeses:12,diasFaltantes:0},{nombre:'Beto Prueba',tag:'#2ABCD',clan:clanes[1].nombre,fechaIngTxt:'20/10/2025',hitoMeses:12,diasFaltantes:8},{nombre:'Carla Prueba',tag:'#3ABCD',clan:clanes[0].nombre,fechaIngTxt:'13/04/2026',hitoMeses:6,diasFaltantes:1}]},
 webRankings:{ok:true,donadores:rk(4000),racha:rk(60),torneos:rk(300),victorias3c:rk(120)},
 webEstadisticasCartas:{ok:true,top10:cartas},
 webClanCopas:{ok:true,puntos},
 webClanInfo:{ok:true,clanes},
 webRoster:{ok:true,clanes:clanes.map(c=>({nombre:c.nombre,miembros}))},
 webGuerraEnVivo:{ok:true,ctx:{temporada:130,sectionIndex:2},guerraPorClan:{'Terna Uno':{ataques:180,fame:52000,barcos:3,atacaron:38,totalHoy:50},'Terna Dos':{ataques:150,fame:41000,barcos:2,atacaron:30,totalHoy:50}},pendientes:[{clan:'Terna Uno',nombre:'Ana Prueba',tag:'#1ABCD',ataques:2}]},
};
module.exports={FIX};
