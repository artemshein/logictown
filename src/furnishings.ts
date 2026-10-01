import {Color3,Mesh,MeshBuilder,Scene,ShadowGenerator,StandardMaterial,Vector3} from '@babylonjs/core';
import {roundedBox} from './art';
import type {HouseRoom} from './house';
import type {RoomId} from './house-data';

/** Small handmade furnishings share the house palette and follow each room's root. */
export function installFurnishings(scene:Scene,shadow:ShadowGenerator,rooms:Map<RoomId,HouseRoom>){
 const material=(name:string,color:string)=>{const m=new StandardMaterial('accessories '+name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(.12,.1,.07);return m};
 const wood=material('oak','#b58c78'),cream=material('ceramic','#eee3cd'),sage=material('paint','#8fa492'),rose=material('linen','#c29988'),brass=material('brass','#b89b60'),dark=material('ink','#52635f');
 const glow=material('warm glass','#fff0c9');glow.emissiveColor=new Color3(.65,.43,.18);
 for(const [id,room] of rooms){
  const finish=(m:Mesh,x:number,y:number,z:number,mat:StandardMaterial)=>{m.parent=room.root;m.position.set(x,y,z);m.material=mat;m.receiveShadows=true;m.isPickable=false;if(m.getBoundingInfo().boundingBox.extendSize.length()>.22)shadow.addShadowCaster(m);return m};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat=wood)=>finish(roundedBox(scene,id+' accessory '+name,w,h,d),x,y,z,mat);
  const cylinder=(name:string,x:number,y:number,z:number,d:number,h:number,mat=cream,top=d)=>finish(MeshBuilder.CreateCylinder(id+' accessory '+name,{diameterBottom:d,diameterTop:top,height:h,tessellation:24},scene),x,y,z,mat);
  const sphere=(name:string,x:number,y:number,z:number,d:number,mat=cream)=>finish(MeshBuilder.CreateSphere(id+' accessory '+name,{diameter:d,segments:16},scene),x,y,z,mat);
  const tube=(name:string,path:number[][],mat=brass,r=.025)=>{const m=MeshBuilder.CreateTube(id+' accessory '+name,{path:path.map(p=>new Vector3(p[0],p[1],p[2])),radius:r,tessellation:8},scene);return finish(m,0,0,0,mat)};
  function cabinet(x:number,z:number,w:number,h:number,d:number,front= -1){box('cabinet body',x,h/2+.06,z,w,h,d,sage);box('cabinet top',x,h+.09,z,w+.08,.08,d+.06);for(let i=0;i<3;i++){const y=.06+h*(i+.5)/3;box('drawer',x,y,z+front*(d/2+.018),w-.09,h/3-.035,.04,sage);box('drawer handle',x,y,z+front*(d/2+.06),.2,.035,.05,brass)}}
  function books(x:number,y:number,z:number){for(let i=0;i<3;i++)box('stacked book',x+i*.025,y+.0275+i*.06,z,.36,.055,.25,[sage,rose,cream][i])}
  function vase(x:number,y:number,z:number){cylinder('vase',x,y+.14,z,.17,.28,rose,.11);for(let i=0;i<3;i++){const dx=(i-1)*.085;tube('flower stem',[[x,y+.25,z],[x+dx,y+.52,z+i*.025]],sage,.008);sphere('flower',x+dx,y+.52,z+i*.025,.095,cream)}}
  function cup(x:number,y:number,z:number){cylinder('cup',x,y+.08,z,.13,.16,cream);cylinder('tea',x,y+.164,z,.105,.006,dark);const handle=finish(MeshBuilder.CreateTorus(id+' accessory cup handle',{diameter:.105,thickness:.023,tessellation:16},scene),x+.085,y+.08,z,cream);handle.rotation.x=Math.PI/2}
  function lamp(x:number,y:number,z:number){cylinder('lamp foot',x,y+.025,z,.24,.05,brass);cylinder('lamp stem',x,y+.22,z,.035,.4,brass);cylinder('lamp shade',x,y+.47,z,.38,.28,cream,.23);sphere('lamp bulb',x,y+.38,z,.1,glow)}
  function chandelier(x:number,z:number,arms=5,ceiling=3.6){
   cylinder('ceiling rose',x,ceiling-.035,z,.27,.07,brass);cylinder('pendant stem',x,ceiling-.35,z,.035,.6,brass);sphere('chandelier hub',x,ceiling-.68,z,.16,brass);
   for(let i=0;i<arms;i++){const a=i*Math.PI*2/arms,dx=Math.cos(a),dz=Math.sin(a);tube('chandelier arm',[[x,ceiling-.68,z],[x+dx*.24,ceiling-.8,z+dz*.24],[x+dx*.5,ceiling-.72,z+dz*.5],[x+dx*.5,ceiling-.6,z+dz*.5]]);cylinder('chandelier shade',x+dx*.5,ceiling-.55,z+dz*.5,.25,.23,cream,.16);sphere('chandelier bulb',x+dx*.5,ceiling-.66,z+dz*.5,.13,glow)}
  }
  if(id==='bedroom'){
   chandelier(-.5,.15,5,3.9);cabinet(-2.75,-.65,.72,.65,.65);lamp(-2.94,.78,-.75);books(-2.61,.78,-.5);
   cabinet(2.9,-2.55,1.4,1.12,.65,1);vase(3.25,1.25,-2.55);books(2.55,1.25,-2.55);
  }else if(id==='living'){
   chandelier(-.9,.25,6);cabinet(3.25,1.05,.8,.68,.7);lamp(3.25,.81,1.05);
   cylinder('ottoman feet',-.1,.16,-2.2,.52,.2,wood);cylinder('round ottoman',-.1,.4,-2.2,.72,.4,rose);cylinder('ottoman cushion',-.1,.63,-2.2,.76,.12,rose);
   books(-1.55,.71,.12);cup(-.45,.71,-.35);
  }else if(id==='kitchen'){
   chandelier(-.15,-.5,3);for(const y of [2.05,2.65]){box('wall shelf',-2.85,y,3.08,1.55,.08,.38);for(let i=0;i<3;i++)cylinder('storage jar',-3.35+i*.38,y+.17,3.08,.22,.26,i%2?sage:cream);for(let i=0;i<3;i++)cylinder('jar lid',-3.35+i*.38,y+.315,3.08,.24,.03,wood)}
   for(const x of [-.72,.45]){cylinder('breakfast plate',x,1.015,-.6,.38,.025);cup(x,1.03,-.18)}
   box('bread board',-.15,1.02,-.94,.48,.035,.24);const bread=sphere('loaf',-.15,1.11,-.94,.26,wood);bread.scaling.set(1.5,.65,.8);
  }else if(id==='bathroom'){
   chandelier(.2,-.3,3);box('bath tray',-2,1.095,.3,1.7,.07,.32);cup(-2.4,1.13,.3);
   cylinder('soap pump bottle',.43,1.34,2.85,.12,.32,sage);box('soap dispenser pump',.43,1.52,2.85,.15,.04,.05,brass);
   box('wall towel rail',3.13,1.85,-1.35,.04,.04,.8,brass);box('hanging towel',3.1,1.53,-1.35,.045,.64,.55,rose);
  }else if(id==='toilet'){
   cylinder('ceiling light mount',0,3.55,0,.4,.1,brass);sphere('ceiling globe',0,3.32,0,.4,glow);
   cylinder('soap bottle',-1.82,1.38,-.92,.1,.25,sage);box('soap pump',-1.82,1.52,-.92,.12,.035,.035,brass);
  }else if(id==='hall'){
   for(const x of [-7,0,7])chandelier(x,0,3);
   cabinet(7.5,-1.28,1.5,.85,.42,1);books(7.1,.98,-1.28);vase(7.85,.98,-1.28);
   box('coat hook board',5,2.25,-1.6,1.25,.14,.06);for(let i=0;i<4;i++)tube('coat hook',[[4.55+i*.3,2.25,-1.55],[4.55+i*.3,2.15,-1.44],[4.55+i*.3,2.22,-1.4]]);
   box('hanging scarf',4.85,1.7,-1.44,.16,.88,.04,rose);
  }
 }
}
