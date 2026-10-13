// Datos inventados (sin personas reales) para pintar el contenido dinamico de las paginas publicas.
const miembros=['Ana','Beto','Carla','Diego','Elena','Fabio','Gina','Hugo','Irma','Julio'].map((n,i)=>({nombre:n+' Prueba',tag:'#'+(i+1)+'ABCD',rango:['Lider','Colider','Veterano','Miembro'][i%4],copas:7000-i*130,vGuerra:40-i,royaleApi:'https://royaleapi.com/player/'+(i+1)+'ABCD',cwStats:'https://cwstats.com/player/'+(i+1)+'ABCD'}));
const clanes=['Terna Uno','Terna Dos'].map((nombre,i)=>({nombre,clanTag:'#CL'+i,lider:'Lider '+i,liga:'Liga 5',requerimiento:5000,badgeId:16000000+i,royaleApi:'https://royaleapi.com/clan/CL'+i,cwStats:'https://cwstats.com/clan/CL'+i}));
// webClanCopas: 4 semanas de jueves a domingo (dd/MM/yyyy), copas crecientes
const puntos=[];for(let d=0;d<28;d++){const f=new Date(2026,8,10+d);if(![0,4,5,6].includes(f.getDay()))continue;puntos.push({fecha:String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0')+'/2026',copas:30000+d*120});}
const FIX={
 webClanCopas:{ok:true,puntos},
 webClanInfo:{ok:true,clanes},
 webRoster:{ok:true,clanes:clanes.map(c=>({nombre:c.nombre,miembros}))},
 webGuerraEnVivo:{ok:true,ctx:{temporada:130,sectionIndex:2},guerraPorClan:{'Terna Uno':{ataques:180,fame:52000,barcos:3,atacaron:38,totalHoy:50},'Terna Dos':{ataques:150,fame:41000,barcos:2,atacaron:30,totalHoy:50}},pendientes:[{clan:'Terna Uno',nombre:'Ana Prueba',tag:'#1ABCD',ataques:2}]},
};
module.exports={FIX};
