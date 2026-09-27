import {entries} from './layout';
import {Scene,TransformNode,MeshBuilder,StandardMaterial,Color3,Vector3,ShadowGenerator,DynamicTexture,Mesh} from '@babylonjs/core';
import {roundedBox} from './art';
import {roomInfo,roomNames,type RoomId} from './house-data';
export type Hotspot={label:string;icon:string;position:Vector3;approach:Vector3;message:string;activate?:()=>void};
export type HouseRoom={root:TransformNode;floor:Mesh;hotspots:Hotspot[]};

export function buildHouseRoom(scene:Scene,shadow:ShadowGenerator,id:RoomId):HouseRoom{
 const cfg=roomInfo[id],root=new TransformNode('room-'+id,scene),hotspots:Hotspot[]=[];
 const existing=(n:string)=>scene.getMaterialByName(n) as StandardMaterial;
 const mat=(n:string,color:string,gloss=false)=>{const m=new StandardMaterial(id+' '+n,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=gloss?new Color3(.4,.4,.36):new Color3(.07,.06,.05);m.specularPower=gloss?90:24;return m};
 const cream=existing('warm ivory'),wood=existing('honey oak'),oak=existing('light oak'),cloth=existing('cotton'),brass=existing('brass');
 const sage=mat('sage cabinetry','#839785'),white=mat('porcelain','#f2eee1',true),dark=mat('dark enamel','#414946',true),rose=mat('rose upholstery','#bf9685'),blue=mat('blue tile','#adc6c8'),water=mat('water','#78b9ba',true);water.alpha=.66;
 function finish(o:Mesh,m:StandardMaterial){o.material=m;o.parent=root;o.receiveShadows=true;shadow.addShadowCaster(o);return o}
 function box(n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial){const o=Math.min(w,h,d)>.055?roundedBox(scene,id+' '+n,w,h,d):MeshBuilder.CreateBox(id+' '+n,{width:w,height:h,depth:d},scene);o.position.set(x,y,z);return finish(o,m)}
 function ball(n:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial){const o=MeshBuilder.CreateSphere(id+' '+n,{diameter:1,segments:20},scene);o.position.set(x,y,z);o.scaling.set(w,h,d);return finish(o,m)}
 function cyl(n:string,x:number,y:number,z:number,diam:number,h:number,m:StandardMaterial,top=diam){const o=MeshBuilder.CreateCylinder(id+' '+n,{diameterBottom:diam,diameterTop:top,height:h,tessellation:32},scene);o.position.set(x,y,z);return finish(o,m)}
 function tube(n:string,points:number[][],r:number,m:StandardMaterial){return finish(MeshBuilder.CreateTube(id+' '+n,{path:points.map(p=>new Vector3(...p as [number,number,number])),radius:r,tessellation:8},scene),m)}
 function plant(x:number,y:number,z:number,scale=1){cyl('ceramic pot',x,y+.18*scale,z,.34*scale,.36*scale,rose,.45*scale);for(let i=0;i<8;i++){const a=i*2.4,h=(.5+i%3*.13)*scale;const xx=x+Math.cos(a)*.2*scale,zz=z+Math.sin(a)*.2*scale;tube('stem',[[x,y+.3*scale,z],[xx,y+h,zz]],.009*scale,sage);const leaf=ball('leaf',xx,y+h,zz,.16*scale,.32*scale,.04*scale,sage);leaf.rotation.set(.4,a,.5)}}
 function hotspot(label:string,icon:string,p:number[],a:number[],message:string,activate?:()=>void){hotspots.push({label,icon,position:new Vector3(...p as [number,number,number]),approach:new Vector3(a[0],.11,a[1]),message,activate})}
 function rug(x:number,z:number,w:number,d:number,m=existing('rug sage')){const o=cyl('woven carpet',x,.079,z,1,.025,m);o.scaling.set(w,1,d)}
 function frame(x:number,y:number,z:number,w:number,h:number){box('picture frame',x,y,z,w,h,.07,wood);box('picture paper',x,y,z-.045,w-.12,h-.12,.015,cloth);for(let i=0;i<4;i++)ball('botanical print',x+Math.sin(i*2)*w*.15,y-h*.23+i*h*.14,z-.06,w*.17,h*.18,.01,sage)}
 function faucet(x:number,y:number,z:number){tube('curved tap',[[x,y,z],[x,y+.3,z],[x,y+.43,z-.1],[x,y+.34,z-.24]],.027,brass);ball('tap handle',x+.11,y+.12,z,.1,.07,.07,brass)}
 function sink(x:number,y:number,z:number){box('sink cabinet',x,y/2,z,1.3,y,.8,sage);box('stone counter',x,y,z,1.43,.1,.91,cream);ball('porcelain basin',x,y+.10,z-.02,.92,.22,.63,white);ball('basin inset',x,y+.18,z-.03,.72,.06,.44,blue);faucet(x,y+.1,z+.29);box('cabinet pull',x,y*.62,z-.425,.28,.035,.035,brass)}
 function mirror(x:number,y:number,z:number,w=.9,h=1.1){box('mirror surround',x,y,z,w+.1,h+.1,.06,brass);const glass=mat('mirror glass','#b8cfcd',true);box('mirror',x,y,z-.04,w,h,.018,glass);box('mirror highlight',x-w*.2,y,z-.054,.025,h*.8,.006,white)}
 function window(x:number,y:number,z:number){box('window frame',x,y,z,1.75,1.7,.1,cream);box('daylight',x,y,z-.07,1.55,1.5,.025,blue);box('window mullion',x,y,z-.1,.06,1.52,.08,cream);box('window mullion',x,y,z-.1,1.54,.06,.08,cream);box('window sill',x,y-.87,z-.12,1.95,.12,.35,oak);plant(x+.47,y-.81,z-.13,.45)}
 const w=cfg.width,d=cfg.depth;
 box('foundation',0,-.23,0,w+.3,.44,d+.3,cream);
 const floor=box('walkable floor',0,0,0,w,.08,d,oak);
 const wallMat=mat('plaster',id==='living'?'#c5bba6':id==='kitchen'?'#ded6b6':id==='bathroom'?'#becfd0':id==='toilet'?'#b7c4ae':'#d4c7b0');
 if(id!=='bedroom'){
 if(id!=='bathroom'&&id!=='toilet'&&id!=='hall')box('back wall',0,1.8,d/2,w+.1,3.6,.12,wallMat);box('left wall',-w/2,1.8,0,.12,3.6,d,wallMat);
 if(id!=='bathroom'&&id!=='toilet'&&id!=='hall')box('back wall cap',0,3.64,d/2,w+.22,.09,.23,cream);box('side wall cap',-w/2,3.64,0,.22,.09,d,cream);
 if(id!=='bathroom'&&id!=='toilet'&&id!=='hall')box('back skirting',0,.15,d/2-.1,w,.22,.1,cream);box('side skirting',-w/2+.1,.15,0,.1,.22,d,cream);
 if(id==='bathroom'||id==='toilet'||id==='kitchen'){
   const tile1=mat('floor tile ivory','#dddaca'),tile2=mat('floor tile colored',id==='kitchen'?'#b2b49c':'#98b4ae');
   for(let x=-w/2+.25;x<w/2;x+=.5)for(let z=-d/2+.25;z<d/2;z+=.5)box('tile',x,.048,z,.485,.014,.485,(Math.round((x+w/2)/.5)+Math.round((z+d/2)/.5))%2?tile1:tile2);
   for(let x=-w/2+.25;x<w/2;x+=.5)for(let y=.4;y<1.75;y+=.35)if(id==='kitchen'||Math.abs(x-entries[id]!)>1.2)box('glazed wall tile',x,y,d/2-.077,.487,.337,.025,white);
   for(let z=-d/2+.25;z<d/2;z+=.5)for(let y=.4;y<1.75;y+=.35)box('side glazed wall tile',-w/2+.077,y,z,.025,.337,.487,id==='toilet'?sage:white);
 }else for(let z=-d/2+.2;z<d/2;z+=.4)box('floor board seam',0,.045,z,w,.005,.008,wood);
 }
 if(id!=='hall'&&id!=='bedroom'){
 const south=id==='bathroom'||id==='toilet',gap=entries[id]!,edge=south?d/2:-d/2,h=south?3.6:.65;
 for(const [lo,hi] of [[-w/2,gap-1],[gap+1,w/2]])if(hi>lo){box('open passage wall',(lo+hi)/2,h/2,edge,hi-lo,h,.12,wallMat);box('passage cap',(lo+hi)/2,h+.04,edge,hi-lo,.08,.2,cream)}
 box('cutaway right wall',w/2,.325,0,.12,.65,d,wallMat);
 }
 if(id==='living'){
  rug(-.8,-.1,4.2,3.2);box('sofa base',-1.25,.43,2.15,3.65,.55,1.35,rose);box('sofa back',-1.25,1.1,2.66,3.65,1.05,.3,rose);
  for(const x of [-2.98,.48])box('sofa arm',x,.83,2.1,.3,.8,1.5,rose);
  for(const x of [-2.38,-1.25,-.12]){box('seat cushion',x,.76,2.05,1.05,.23,1.02,cloth);const pillow=ball('soft pillow',x,1.2,2.37,.75,.62,.22,x===-1.25?sage:rose);pillow.rotation.z=.12}
  box('coffee tabletop',-1,.65,-.15,1.95,.12,1.15,oak);for(const x of [-1.8,-.2])for(const z of [-.57,.27])box('coffee table leg',x,.34,z,.085,.6,.085,wood);
  box('board game',-.9,.75,-.1,.65,.065,.5,sage);for(let i=0;i<4;i++)cyl('game piece',-1.1+i*.12,.81,-.14,.05,.08,i%2?rose:brass);
  box('bookcase back',-3.62,1.03,-1.4,.12,1.9,2,wood);for(const z of [-2.4,-.4])box('bookcase side',-3.4,1.03,z,.68,1.9,.08,oak);
  for(const y of [.17,.72,1.27,1.82]){box('bookshelf',-3.4,y,-1.4,.7,.08,2.1,oak);for(let i=0;i<7;i++)box('book',-3.35,y+.2,-2.18+i*.24,.41,.34,.13,[sage,rose,blue,cream][i%4])}
  box('armchair seat',2.55,.52,-.9,1.2,.52,1.1,sage);box('armchair back',2.55,1.08,-.4,1.23,.95,.27,sage);for(const x of [1.98,3.12])box('armchair arms',x,.8,-.9,.18,.6,1.2,sage);
  frame(-1.25,2.65,3.27,1.65,1.05);plant(1.2,.08,2.65,1.15);
  hotspot('Настольная игра','♧',[-1,1.28,-.15],[.55,-.4],'На коробке написано «Лесные тропинки». Вечером Лея сыграет с бабушкой.');
 }
 if(id==='kitchen'){
  for(let i=0;i<4;i++){const x=-2.8+i*1.12;box('lower cabinet',x,.57,2.75,1.08,1.05,.95,sage);box('cabinet front',x,.58,2.25,.94,.87,.04,sage);box('brass pull',x,.88,2.21,.3,.035,.04,brass);box('countertop',x,1.15,2.7,1.12,.12,1.04,cream)}
  box('oven',-1.68,.62,2.22,.91,.72,.07,dark);box('oven glass',-1.68,.6,2.17,.68,.47,.02,blue);box('oven handle',-1.68,.92,2.13,.68,.035,.06,brass);
  for(const x of [-1.94,-1.42])for(const z of [2.47,2.9]){cyl('burner',x,1.225,z,.32,.024,dark);cyl('burner ring',x,1.243,z,.23,.014,brass)}
  ball('sink bowl',.56,1.22,2.7,.85,.16,.65,white);ball('sink hollow',.56,1.3,2.68,.66,.055,.44,blue);faucet(.56,1.23,3.03);
  box('refrigerator',-3.22,1.27,1.48,1.14,2.45,1.18,white);box('fridge door',-3.22,1.5,.865,1.04,1.7,.075,cream);box('freezer door',-3.22,.45,.865,1.04,.55,.075,cream);box('fridge handle',-2.84,1.56,.79,.045,.53,.045,brass);
  window(-.85,2.6,3.28);
  cyl('kettle body',-2.68,1.45,2.66,.36,.4,blue,.28);cyl('kettle lid',-2.68,1.68,2.66,.29,.04,brass);tube('kettle handle',[[-2.85,1.55,2.66],[-2.9,1.9,2.66],[-2.53,1.9,2.66],[-2.5,1.55,2.66]],.025,wood);
  box('dining table',-.15,.93,-.5,2,.14,1.4,oak);for(const x of [-.96,.66])for(const z of [-1.01,.01])box('table legs',x,.45,z,.1,.88,.1,wood);
  for(const x of [-1.4,1.1]){box('chair seat',x,.5,-.5,.54,.09,.56,sage);box('chair back',x,.95,-.18,.56,.7,.075,sage);for(const dx of [-.2,.2])for(const dz of [-.2,.2])box('chair leg',x+dx,.25,-.5+dz,.05,.46,.05,wood)}
  ball('fruit bowl',-.15,1.05,-.5,.66,.17,.5,cream);for(let i=0;i<5;i++)ball('fruit',-.36+i*.1,1.19+Math.sin(i)*.03,-.5+Math.cos(i)*.1,.18,.19,.18,i%2?brass:rose);
  hotspot('Чайник','☕',[-2.68,2,2.66],[-2.2,1.66],'В чайнике ещё тепло. На завтрак сегодня тосты и яблоки.');
 }
 if(id==='bathroom'){
  // A bathtub with four solid sides and an inset water surface.
  box('bath bottom',-2,.35,1.05,1.47,.45,3.18,white);for(const x of [-2.7,-1.3])box('bath side',x,.68,1.05,.16,.65,3.22,white);for(const z of [-.51,2.61])box('bath end',-2,.68,z,1.44,.65,.17,white);
  box('bath water',-2,.79,1.05,1.22,.025,2.87,water);faucet(-2,1,2.53);const stream=cyl('running water',-2,.97,2.29,.035,.34,water);stream.setEnabled(false);
  const hull=ball('toy boat',-2.1,.85,.55,.35,.12,.19,oak);tube('boat mast',[[-2.1,.88,.55],[-2.1,1.14,.55]],.012,wood);const sail=MeshBuilder.CreateDisc('toy sail',{radius:.12,tessellation:3},scene);finish(sail,cream);sail.position.set(-2.02,1.04,.55);
  sink(-.05,1.06,2.85);mirror(-.05,2.08,3.28);box('towel stand',2.3,.7,.1,.85,1.25,.6,oak);for(let i=0;i<3;i++)box('folded towels',2.3,1.39+i*.11,.1,.7,.1,.45,i%2?rose:cloth);
  rug(.1,-1.55,1.9,1.15,existing('rug sage'));frame(1.7,2.65,3.27,.52,.55);
  let running=false;hotspot('Кран в ванной','♧',[-2,1.55,2.2],[-.7,1.9],'Вода журчит, и кораблик готов к путешествию.',()=>{running=!running;stream.setEnabled(running);hull.rotation.y+=.4});
 }
 if(id==='toilet'){
  box('toilet cistern',-1.35,.94,2.04,.64,.81,.32,white);box('cistern lid',-1.35,1.38,2.04,.7,.075,.37,white);ball('flush button',-1.35,1.425,2.04,.1,.025,.075,brass);
  ball('toilet pedestal',-1.35,.3,1.4,.48,.53,.66,white);ball('toilet bowl',-1.35,.61,1.32,.8,.37,1.07,white);ball('toilet inset',-1.35,.79,1.28,.53,.035,.7,blue);
  const seat=MeshBuilder.CreateTorus('toilet seat',{diameter:.66,thickness:.08,tessellation:48},scene);finish(seat,white);seat.position.set(-1.35,.805,1.31);seat.scaling.z=1.34;
  box('hand basin cabinet',-1.91,.59,-.65,.59,1.02,.89,sage);ball('hand basin',-1.82,1.16,-.65,.73,.16,.74,white);ball('hand basin inset',-1.76,1.22,-.65,.42,.035,.45,blue);faucet(-1.95,1.23,-.36);
  const reflect=box('side mirror',-2.3,2,-.65,.05,1.1,.82,brass);box('side mirror glass',-2.265,2,-.65,.01,.95,.67,blue);
  box('toilet shelf',-1.3,2.3,2.63,1.45,.09,.29,oak);plant(-1.68,2.35,2.59,.47);for(let i=0;i<2;i++){const roll=cyl('spare paper',-.98+i*.22,2.47,2.6,.19,.23,white)}
  tube('paper holder',[[-2.22,.82,1.1],[-2.02,.82,1.1],[-2.02,.82,.8]],.025,brass);const roll=cyl('paper roll',-2.02,.82,.96,.19,.23,white);roll.rotation.x=Math.PI/2;
  rug(.5,-.65,1.15,1.4);hotspot('Полка с растением','❀',[-1.3,2.75,2.4],[-.4,1.35],'Даже в самой маленькой комнате у бабушки растёт цветок.');
 }
 if(id==='hall'){
  rug(.05,0,20,2.4);box('hall bench',3,.56,-.4,1.1,.14,2,oak);for(const x of [2.6,3.4])for(const z of [-1.2,.4])box('bench legs',x,.28,z,.07,.5,.07,wood);
  box('bench cushion',3,.7,-.4,1.03,.16,1.9,rose);for(let i=0;i<3;i++)ball('shoe',2.8+i*.2,.17,-.8,.15,.16,.34,i%2?sage:wood);
  mirror(1.3,2.3,3.28,.55,.7);plant(3.2,.08,1.45,1);
  hotspot('Скамейка в прихожей','⌂',[3,1.18,-.5],[1.8,-.6],'Тут удобно переобуваться. Все комнаты дома уже открыты для исследования.');
 }
 if(id==='hall'){for(const o of root.getChildMeshes())if(/wall|skirting|mirror/.test(o.name))o.setEnabled(false)}
 // Bedroom already has its own shell. Only its new door belongs to this root.
 if(id==='bedroom'){for(const o of root.getChildMeshes())if(o.name.includes('foundation')||o.name.includes('walkable floor'))o.setEnabled(false)}
 return {root,floor,hotspots};
}



