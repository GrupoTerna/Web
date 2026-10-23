// Datos inventados (sin personas reales) para perfil.html. Formas: Base/src/37_Web_API.gs (_webPerfilJugador, _webPerfilExtendido,
// _webMazoActualDesdeCards2, _webDatosDriveJugador) y la estructura de claves de /players de Clash Royale.
const rar=['common','rare','epic','legendary','champion'];
const nombres=['Caballero','Arqueras','Bola de fuego','Mago','Gigante','Esqueletos','Mosquetera','Valquiria','Cohete','Barril','Golem','Duendes','Furia','Flechas','Cañon','Torre Infernal'];
const max=r=>({common:16,rare:14,epic:11,legendary:8,champion:6}[r]||14);
const carta=(n,i)=>{const r=rar[i%5];return {name:n,id:26000000+i,level:Math.max(1,max(r)-(i%4)),starLevel:i%3,evolutionLevel:i%4===0?1:undefined,maxLevel:max(r),maxEvolutionLevel:i%4===0?1:undefined,rarity:r,count:i*37%500,elixirCost:(i%7)+2,iconUrls:{medium:'https://api-assets.invalid/c'+i+'.png',evolutionMedium:'https://api-assets.invalid/e'+i+'.png'}};};
const cards=nombres.map(carta);
const badges=['ClanWarWins','Classic12Wins','Grand12Wins','Crown3Wins','CardsFound','PlayedGames'].map((name,i)=>({name,level:i%3+1,maxLevel:8,progress:100*(i+1),target:i%2?0:1000,iconUrls:{large:'https://api-assets.invalid/b'+i+'.png'}}));
const achievements=['Ganador de guerra','Maestro de desafíos','Coleccionista','Donador','Torneos'].map((name,i)=>({name,stars:i%4,value:50*(i+1),target:100*(i+1),info:'Descripción de prueba del logro '+(i+1),completionInfo:i===0?'Completado':null}));
const rawClash={tag:'#1ABCD',name:'Ana Prueba',expLevel:60,kingTowerLevel:14,starPoints:12000,expPoints:2000,totalExpPoints:90000,collectionLevel:55,
 clan:{tag:'#CL0',name:'Terna Uno',badgeId:16000000},arena:{id:54000050,name:'Arena 12',rawName:'Arena12'},
 badges,achievements,cards,supportCards:cards.slice(0,4).map((c,i)=>({...c,id:159000000+i,level:11-i,maxLevel:11})),
 currentDeck:cards.slice(0,8),currentDeckSupportCards:[{...cards[0],id:159000000}],currentFavouriteCard:cards[3],
 currentPathOfLegendSeasonResult:{leagueNumber:7,trophies:2100,rank:null},lastPathOfLegendSeasonResult:{leagueNumber:6,trophies:1800,rank:null},bestPathOfLegendSeasonResult:{leagueNumber:8,trophies:2400,rank:350},
 progress:{'':{arena:{id:1,name:'Arena 12',rawName:'Arena12'},trophies:7000,bestTrophies:7200},'seasonal-trophy-road-202610':{arena:{id:2,name:'Arena 3',rawName:'A3'},trophies:900,bestTrophies:1000}},
 _fecha:'2026-10-12',_clan:'Terna Uno'};
const hist=[0,1,2,3,4,5,6,7,8,9,10,11].map(k=>{const f=new Date(2026,9,16-k);return {semana:String(f.getDate()).padStart(2,'0')+'/'+String(f.getMonth()+1).padStart(2,'0')+'/2026',ranking:1+k%6,ataques:k%5===0?0:4-k%3,puntaje:k%5===0?0:1500-k*40,barcos:k%3,copas:7000-k*15};});
const req=(a,r,ac)=>({requerido:r,activo:ac,actual:a});
const bloque=(act)=>({minTMiembro:req(act,1500,true),minTVeterano:req(act,2500,true),minTColider:req(act,3500,false),ataquesMiembro:{requerido:8,activo:true,actual:9,exentos:0},ataquesVeterano:{requerido:12,activo:true,actual:9,exentos:4},ataquesColider:{requerido:12,activo:false,actual:9,exentos:0},miembroActivo:{activo:true}});
const jugador={tag:'#1ABCD',nombre:'Ana Prueba',clan:'Terna Uno',rango:'Veterano',estado:'Activo',vGuerra:40,torneos:12,copas:7000,vigencia:'2026-12-05T10:30:00',
 guerraSemana:{ataques:9,fame:2500,puntaje:2500,barcos:2,ataquesMax:12},
 guerraSemanaDias:{dias:['Jueves','Viernes','Sábado','Domingo'],ataques:[4,3,2,null],puntaje:[1200,900,400,null],puntajeAcumulado:[1200,2100,2500,null],barcos:[1,1,0,null]},
 progreso:{ascensos:bloque(2000),descensos:bloque(2000)},
 extendido:{nivelXp:'60',nivelCartas:'14',copasMax:7200,arena:'Arena 12',victorias:2000,derrotas:1500,batallas:3600,racha:3,
  caminoLeyendas:{liga:7,trofeos:2100,rango:300},victorias3Coronas:900,maxVictoriasDesafios:12,emotes:20,banners:15,cartasDesafios:300,cartasTorneos:200,
  donacionesRecibidas:4000,donacionesRealizadas:5000,rankingClan:3,royaleApi:'https://royaleapi.com/player/1ABCD',cwStats:'https://cwstats.com/player/1ABCD',
  deck:'https://link.clashroyale.com/deck/es?deck=26000000;26000001',deck2:'https://link.clashroyale.com/deck/es?deck=26000002',deck3:'https://link.clashroyale.com/deck/es?deck=26000003',deck3Nivel:13,
  mazoCartas:nombres.map((n,i)=>[n.toLowerCase().replace(/[^a-z]/g,'-'),Math.max(1,14-i%5),i%4===0?1:0,i%4===0?1:0]),
  historialRanking:hist,rawClash},
 mazoActual:{elixirPromedio:3.6,cartas:cards.slice(0,8).map(c=>({id:String(c.id),name:c.name,rarity:c.rarity,tipo:'Tropa',elixirCost:c.elixirCost,icon:'',nivel:c.level,alTope:c.level>=c.maxLevel,evoLevel:c.evolutionLevel||0,hasEvolution:!!c.evolutionLevel,evolutionIcon:null,hasHero:false,heroIcon:null}))}};
const items=['Plateado','Dorado','Dorado','Dorado','Mágico','Gigante','Épico','Legendario'].map((nombre,i)=>({index:i+1,nombre,link:''}));
const batallas=[0,1,2,3,4,5].map(i=>({fecha:'2026-10-1'+(i%9)+'T20:0'+i+':00',tipo:['riverRacePvP','riverRaceDuel','boatBattle','pathOfLegend','boatBattle','PvP'][i],modo:'Duelo',modoTxt:'Duelo',arena:'Arena 12',arenaTxt:'Arena 12',resultado:['victoria','derrota','empate'][i%3],miNombre:'Ana Prueba',miClan:'Terna Uno',miCorona:3-i%3,rivalNombre:'Rival '+(i+1)+' Prueba',rivalClan:'Clan Rival',rivalCorona:i%3,trophyChange:i%2?-27:30,barcoLado:i===2?'defender':(i===4?'attacker':''),barcoTorresNuevas:i%2,barcoTorresRestantes:3-i%3,deckSelection:'collection'}));
const regsHG=[0,1,2,3,4,5].map(i=>({fecha:'0'+(1+i)+'/10/2026',temporadaInterna:130-(i>3?1:0),semana:(i%4)+1,clan:'Terna Uno',ataques:i%3?12:0,fame:i%3?3000-i*100:0,barcos:i%3,comentario:i===2?'Comentario de prueba':''}));
const FIXPERFIL={
 webPerfil:{ok:true,jugador},
 webTorneosJugador:{ok:true,torneos:[1,2,3].map(i=>({idTorneo:'T'+i,clan:'Terna Uno',fecha:'0'+i+'/10/2026',puesto:i,victorias:10-i}))},
 webCofresJugador:{ok:true,items},
 webBattlelogJugador:{ok:true,batallas},
 webAdminOtrasCuentas:{ok:true,cuentas:[{nombre:'Ana Alt Prueba',tag:'#5ABCD',clan:'Terna Dos'},{nombre:'Ana Tres Prueba',tag:'#6ABCD',clan:''}]},
 webHistorialGuerraJugador:{ok:true,registros:regsHG}, // ya no lo pide el perfil (tanda 5, §PF181); se conserva por si otra página lo vuelve a usar
 webHistorialGuerraComparador:{a:[0,1,2,3,4,5,6,7].map(i=>({fecha:'2026-10-'+String(1+i).padStart(2,'0'),ataques:i%5,fame:600*(i+1),barcos:i%3,temporada:6,semana:Math.floor(i/4)+1}))}, // tarjeta «Historial de guerra» (§PF181)
 webAdminMisPermisos:{ok:true,panelPermisos:true,funciones:['Vetar','Registrar miembro nuevo'],categorias:[]},
};
module.exports={FIXPERFIL};
