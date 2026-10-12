// Datos inventados (sin personas reales) para pintar el contenido dinamico de las paginas publicas.
const miembros=['Ana','Beto','Carla','Diego','Elena','Fabio','Gina','Hugo','Irma','Julio'].map((n,i)=>({nombre:n+' Prueba',tag:'#'+(i+1)+'ABCD',rango:['Lider','Colider','Veterano','Miembro'][i%4],copas:7000-i*130,vGuerra:40-i,royaleApi:'https://royaleapi.com/player/'+(i+1)+'ABCD',cwStats:'https://cwstats.com/player/'+(i+1)+'ABCD'}));
const clanes=['Terna Uno','Terna Dos'].map((nombre,i)=>({nombre,clanTag:'#CL'+i,lider:'Lider '+i,liga:'Liga 5',requerimiento:5000,badgeId:16000000+i,royaleApi:'https://royaleapi.com/clan/CL'+i,cwStats:'https://cwstats.com/clan/CL'+i}));
const FIX={
 webClanInfo:{ok:true,clanes},
 webRoster:{ok:true,clanes:clanes.map(c=>({nombre:c.nombre,miembros}))},
 webGuerraEnVivo:{ok:true,ctx:{temporada:130,sectionIndex:2},guerraPorClan:{'Terna Uno':{ataques:180,fame:52000,barcos:3,atacaron:38,totalHoy:50},'Terna Dos':{ataques:150,fame:41000,barcos:2,atacaron:30,totalHoy:50}},pendientes:[{clan:'Terna Uno',nombre:'Ana Prueba',tag:'#1ABCD',ataques:2}]},
};
module.exports={FIX};
