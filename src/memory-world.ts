import {puzzleFragments} from './puzzle-fragments';
import {MeshBuilder,StandardMaterial,Color3,TransformNode,Vector3,type Scene,type ShadowGenerator} from '@babylonjs/core';
import type {HouseRoom} from './house';
import type {RoomId} from './house-data';
import type {createMemoryQuest} from './memory';
export function installMemoryObjects(scene:Scene,shadow:ShadowGenerator,rooms:Map<RoomId,HouseRoom>,quest:ReturnType<typeof createMemoryQuest>){
 const material=(name:string,hex:string)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);return m};
 const oak=material('memory oak','#a87951'),gold=material('memory brass','#c6a264'),paper=material('memory paper','#efe5c9'),sage=material('memory green','#547668');
 function box(id:RoomId,name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat=oak){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.parent=rooms.get(id)!.root;m.material=mat;m.receiveShadows=true;shadow.addShadowCaster(m);return m}
 function pin(id:RoomId,label:string,icon:string,p:number[],a:number[],action:()=>void){rooms.get(id)!.hotspots.push({label,icon,position:new Vector3(p[0],p[1],p[2]),approach:new Vector3(a[0],.11,a[1]),message:'',activate:action})}
 for(const room of rooms.values())room.hotspots=[];
 scene.getTransformNodeByName('music box')?.setEnabled(false);
 scene.meshes.filter(m=>m.name==='kitchen fruit bowl'||m.name==='kitchen fruit').forEach(m=>m.setEnabled(false));
 // Tangible puzzle props in the existing furnishings.
 box('kitchen','balance foot',-.15,1.05,-.5,.6,.08,.3,gold);box('kitchen','balance upright',-.15,1.35,-.5,.045,.6,.045,gold);box('kitchen','balance beam',-.15,1.62,-.5,1.2,.045,.045,gold);
 for(const x of [-.65,.35]){box('kitchen','balance string',x,1.4,-.5,.015,.4,.015,gold);box('kitchen','balance pan',x,1.2,-.5,.4,.04,.35,gold)}
 box('living','family album',-1,.78,-.15,.8,.055,.65,sage);box('living','album pages',-1,.815,-.15,.69,.015,.55,paper);
 box('bedroom','shadow stage frame',2.73,1.7,2.54,1,.8,.15,oak);box('bedroom','shadow stage screen',2.73,1.7,2.44,.86,.65,.02,paper);
 for(let i=0;i<3;i++)box('bedroom','shadow figure',2.45+i*.27,1.35,2.18,.12,.18,.1,sage);
 box('hall','memory cabinet',-2,.58,-1.4,1.3,1.08,.5,oak);box('hall','memory cabinet front',-2,.7,-1.12,1.18,.8,.035,sage);
 for(let i=0;i<5;i++)box('hall','medallion socket',-2.44+i*.22,.88,-1.08,.15,.15,.035,gold);
 const drawer=box('hall','key drawer',-2,.37,-1.07,1.12,.22,.06,oak);
 const keyRing=MeshBuilder.CreateTorus('brass key ring',{diameter:.16,thickness:.035,tessellation:20},scene);keyRing.parent=rooms.get('hall')!.root;keyRing.position.set(-2.2,.5,-.94);keyRing.material=gold;
 const keyShaft=box('hall','brass key shaft',-2.03,.5,-.94,.25,.03,.035,gold);
 const keyTooth=box('hall','brass key tooth',-1.94,.5,-.91,.035,.03,.09,gold);
 box('toilet','mirror puzzle box',-.7,2.4,2.6,.5,.2,.25,sage);

 for(const [id,i,x,y,z,ax,az] of puzzleFragments){box(id,'photo fragment '+i,x,y,z,.32,.018,.24,paper);pin(id,'Фрагмент фотографии '+(i+1),'▧',[x,y+.35,z],[ax,az],()=>quest.fragment(i))}
 pin('bedroom','Записка бабушки','✎',[-.05,1.9,2.05],[-.65,.8],quest.intro);
 pin('bedroom','Театр теней','☾',[2.73,2.3,2.54],[2.63,1.56],quest.bedroom);
 pin('kitchen','Весы с фруктами','⚖',[-.15,2,-.5],[1.85,-.7],quest.kitchen);
 pin('bathroom','Кораблик и кувшины','⛵',[-2,1.6,1.1],[-.7,1.9],quest.bathroom);
 pin('toilet','Зеркальная коробочка','◇',[-1.3,2.95,2.4],[-.4,1.35],quest.toilet);
 pin('living','Семейный альбом','▤',[-1,1.3,-.15],[.55,-.4],quest.living);
 pin('hall','Шкафчик «Дом помнит»','⚿',[-2,1.65,-1.4],[-2,-.45],quest.cabinet);
 // The exterior door is interactive; interior doors remain propped open.
 for(const z of [-.88,.88])box('hall','exit jamb',11.95,1.4,z,.18,2.8,.14,paper);
 box('hall','exit lintel',11.95,2.8,0,.18,.14,1.9,paper);
 box('hall','exit threshold',11.95,.045,0,.4,.08,1.92,paper);
 const hinge=new TransformNode('exit hinge',scene);hinge.parent=rooms.get('hall')!.root;hinge.position.set(11.95,0,.84);
 const door=box('hall','front door',0,1.365,-.84,.12,2.73,1.68,sage);door.parent=hinge;
 const doorWood=material('entrance sage paint','#769183');
 doorWood.specularColor=new Color3(.09,.12,.1);door.material=doorWood;
 const doorPanel=material('entrance inset panel','#8fa99a');
 // Both faces and their mouldings move with the hinge; the slab remains the camera collider.
 for(const side of [-1,1])for(const [y,h] of [[.62,.78],[1.78,1.04]]){
  const panel=box('hall','door recessed panel',side*.067,y,-.84,.025,h,1.3,doorPanel);panel.parent=hinge;
  for(const z of [-1.51,-.17]){const trim=box('hall','door panel stile',side*.09,y,z,.035,h+.1,.055,doorWood);trim.parent=hinge}
  for(const yy of [y-h/2-.025,y+h/2+.025]){const trim=box('hall','door panel rail',side*.09,yy,-.84,.035,.055,1.38,doorWood);trim.parent=hinge}
 }
 for(const y of [.3,1.3,2.3]){const knuckle=box('hall','door brass hinge',-.085,y,-.035,.08,.18,.06,gold);knuckle.parent=hinge}
 const handle=box('hall','front door handle',-.11,1.25,-1.4,.08,.08,.18,gold);handle.parent=hinge;
 const outsideHandle=box('hall','front door outside handle',.11,1.25,-1.4,.08,.08,.18,gold);outsideHandle.parent=hinge;
 pin('hall','Входная дверь','⌂',[11.8,2.9,0],[10.8,0],quest.door);
 const lawn=MeshBuilder.CreateBox('garden lawn',{width:7,height:.15,depth:7},scene);lawn.position.set(23.5,-.12,-5.1);lawn.material=material('garden lawn green','#a9b38b');
 const path=MeshBuilder.CreateBox('garden stone path',{width:6,height:.06,depth:1.7},scene);path.position.set(22.8,.01,-5.1);path.material=paper;
 for(const z of [-7.6,-2.6]){const tree=MeshBuilder.CreateSphere('garden shrub',{diameter:1.8,segments:12},scene);tree.position.set(24,.75,z);tree.material=sage;shadow.addShadowCaster(tree)}
 return {sync:()=>{for(const m of [keyRing,keyShaft,keyTooth])m.setEnabled(quest.state.key);for(const i of [0,1,2])scene.getMeshByName('photo fragment '+i)?.setEnabled(!quest.state.fragments.includes(i));drawer.position.z=quest.state.key?-.78:-1.07;hinge.rotation.y=quest.state.exited?-Math.PI/2:0;},door:hinge};
}
