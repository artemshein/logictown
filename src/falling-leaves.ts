import {Color3,Matrix,Mesh,Quaternion,StandardMaterial,Vector3,VertexData,type Scene} from '@babylonjs/core';
type Leaf={active:boolean;p:Vector3;v:Vector3;size:number;spin:Vector3;angle:Vector3;phase:number;landed:number};
const palette=[[.93,.47,.12],[.86,.36,.08],[.97,.6,.18],[.78,.28,.07],[.95,.52,.2],[.82,.44,.1]];
/** Occasional orange leaves carried through the air around the player. */
export function createFallingLeaves(scene:Scene,blocked:(x:number,z:number)=>boolean,max=48,forceBurst=false){
 // A flat leaf outline with a pointed tip, drawn from both sides.
 const outline=[[0,-.5],[.22,-.32],[.34,-.04],[.27,.22],[0,.5],[-.27,.22],[-.34,-.04],[-.22,-.32]];
 const positions=[0,0,0],indices:number[]=[],normals:number[]=[0,0,1];
 outline.forEach(([x,y],i)=>{positions.push(x,y,0);normals.push(0,0,1);indices.push(0,i+1,(i+1)%outline.length+1)});
 const mesh=new Mesh('falling leaves',scene),data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(mesh);
 const mat=new StandardMaterial('falling leaf',scene);mat.backFaceCulling=false;mat.twoSidedLighting=true;mat.diffuseColor=Color3.White();mat.specularColor=new Color3(.03,.03,.03);mat.emissiveColor=new Color3(.22,.1,.02);
 mesh.material=mat;mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;
 const matrices=new Float32Array(max*16),colors=new Float32Array(max*4);
 const leaves:Leaf[]=Array.from({length:max},(_,i)=>{const c=palette[i%palette.length],k=.85+Math.random()*.25;colors.set([c[0]*k,c[1]*k,c[2]*k,1],i*4);return {active:false,p:new Vector3(),v:new Vector3(),size:0,spin:new Vector3(),angle:new Vector3(),phase:0,landed:0}});
 mesh.thinInstanceSetBuffer('matrix',matrices,16,false);mesh.thinInstanceSetBuffer('color',colors,4,true);
 const random=(a:number,b:number)=>a+Math.random()*(b-a),m=new Matrix(),q=new Quaternion(),s=new Vector3();
 let wait=forceBurst?.5:random(4,9),windAngle=random(0,Math.PI*2),bursts=0;
 function burst(center:Vector3,heading:number){
  // Blow roughly across the view so the leaves pass in front of the player.
  const fx=Math.sin(heading),fz=Math.cos(heading),side=Math.random()<.5?-1:1;
  windAngle=Math.atan2(fx*side,-fz*side)+random(-.5,.5);
  const wx=Math.cos(windAngle),wz=Math.sin(windAngle),count=Math.round(random(4,9));bursts++;
  for(let n=0;n<count;n++){
   const leaf=leaves.find(l=>!l.active);if(!leaf)return;
   // Cross the view at an open spot, also between the camera and the player.
   let ahead=random(-2.5,8);for(let t=0;t<6&&blocked(center.x+fx*ahead,center.z+fz*ahead);t++)ahead=random(-2.5,ahead);
   const back=random(3,7);
   leaf.active=true;leaf.landed=0;leaf.size=random(.1,.3);leaf.phase=random(0,Math.PI*2);
   leaf.p.set(center.x+fx*ahead-wx*back,random(1.6,4.5),center.z+fz*ahead-wz*back);
   const speed=random(.8,1.8);leaf.v.set(wx*speed,-random(.3,.6),wz*speed);
   leaf.angle.set(random(0,6.3),random(0,6.3),random(0,6.3));leaf.spin.set(random(-3,3),random(-2,2),random(-3,3));
  }
 }
 function update(dt:number,center:Vector3,heading:number){
  wait-=dt;if(wait<=0){burst(center,heading);wait=forceBurst?random(2,4):random(6,16)}
  leaves.forEach((l,i)=>{
   if(l.active){
    if(l.landed>0){l.landed+=dt;if(l.landed>5||Math.hypot(l.p.x-center.x,l.p.z-center.z)>30)l.active=false}
    else{
     l.phase+=dt*(2+l.size*4);
     // Sideways flutter and a lift on each swing make the descent uneven.
     const sway=Math.sin(l.phase);
     l.p.x+=(l.v.x+Math.cos(windAngle+1.57)*sway*.7)*dt;l.p.z+=(l.v.z+Math.sin(windAngle+1.57)*sway*.7)*dt;
     l.p.y+=(l.v.y*(1-.45*Math.abs(Math.cos(l.phase))))*dt;
     l.angle.addInPlace(l.spin.scale(dt));
     if(l.p.y<=.03){l.p.y=.03;l.landed=dt;l.angle.x=Math.PI/2;l.angle.z=0}
    }
   }
   const fade=l.landed>4?Math.max(0,5-l.landed):1;s.setAll(l.active?l.size*fade:0);
   Quaternion.FromEulerAnglesToRef(l.angle.x,l.angle.y,l.angle.z,q);Matrix.ComposeToRef(s,q,l.p,m);m.copyToArray(matrices,i*16);
  });
  mesh.thinInstanceBufferUpdated('matrix');
 }
 return {update,get flying(){return leaves.filter(l=>l.active&&!l.landed).length},get bursts(){return bursts},dispose(){mesh.dispose();mat.dispose()}};
}
