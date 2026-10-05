import {Color3,Material,Matrix,Mesh,MeshBuilder,Quaternion,StandardMaterial,Vector3,VertexData,type Scene} from '@babylonjs/core';
export const paintTrailDuration=30;
const printLife=22,stride=.3,maxPrints=420;
type Spot={x:number;z:number;r:number};
/** Flat shapes on the ground, drawn as triangle fans with an upward normal. */
function flatShape(name:string,scene:Scene,rings:{cx:number;cz:number;radius:(a:number)=>number;rx?:number}[],segments=28){
 const p:number[]=[],n:number[]=[],i:number[]=[];
 for(const ring of rings){
  const c=p.length/3;p.push(ring.cx,0,ring.cz);n.push(0,1,0);
  for(let k=0;k<=segments;k++){const a=k/segments*Math.PI*2,r=ring.radius(a);p.push(ring.cx+Math.cos(a)*r*(ring.rx??1),0,ring.cz+Math.sin(a)*r);n.push(0,1,0);if(k)i.push(c,c+k,c+k+1)}
 }
 const m=new Mesh(name,scene),d=new VertexData();d.positions=p;d.normals=n;d.indices=i;d.applyToMesh(m);return m;
}
/** A spilt tin of red paint. Stepping in it leaves fading red shoe prints for 30 seconds. */
export function createPaintPuddle(scene:Scene,spot:Spot){
 const wet=new StandardMaterial('wet red paint',scene);wet.diffuseColor=new Color3(.62,.02,.03);wet.specularColor=new Color3(.9,.75,.75);wet.specularPower=96;wet.backFaceCulling=false;wet.zOffset=-2;
 // An uneven puddle with a few splashes around it.
 const lobes=[[3,.12,.4],[5,.07,1.3],[7,.04,2.1]];
 const puddle=flatShape('red paint puddle',scene,[{cx:0,cz:0,radius:a=>spot.r*(1+lobes.reduce((s,[k,amp,ph])=>s+amp*Math.sin(k*a+ph),0))},
  ...[[.95,.25,.09],[.2,-.85,.07],[-.8,.45,.06],[-.55,-.7,.05],[.7,-.6,.045]].map(([x,z,r])=>({cx:x*spot.r*1.25,cz:z*spot.r*1.25,radius:(a:number)=>r*(1+.15*Math.sin(3*a))}))],40);
 puddle.position.set(spot.x,.032,spot.z);puddle.material=wet;puddle.isPickable=false;puddle.receiveShadows=true;
 // The tipped-over tin it came from.
 const tinMat=new StandardMaterial('paint tin',scene);tinMat.diffuseColor=new Color3(.72,.73,.75);tinMat.specularColor=new Color3(.6,.6,.6);
 const tin=MeshBuilder.CreateCylinder('paint tin',{height:.2,diameter:.17,tessellation:20},scene);tin.material=tinMat;tin.rotation.set(Math.PI/2,0,.5);tin.position.set(spot.x+spot.r*.95,.115,spot.z+spot.r*.55);tin.isPickable=false;
 const rim=MeshBuilder.CreateTorus('paint tin rim',{diameter:.165,thickness:.012,tessellation:20},scene);rim.parent=tin;rim.position.y=-.1;rim.material=wet;rim.isPickable=false;
 const label=MeshBuilder.CreateCylinder('paint tin label',{height:.1,diameter:.173,tessellation:20},scene);label.parent=tin;label.material=wet;label.isPickable=false;

 // Shoe prints: one shared sole shape, drawn as thin instances with their own opacity.
 const print=flatShape('red footprints',scene,[{cx:0,cz:.035,radius:()=>.05,rx:.82},{cx:0,cz:-.065,radius:()=>.034,rx:1.05}],16);
 const printMat=new StandardMaterial('red footprint paint',scene);printMat.diffuseColor=new Color3(.6,.03,.04);printMat.specularColor=new Color3(.25,.1,.1);printMat.backFaceCulling=false;printMat.zOffset=-3;
 printMat.transparencyMode=Material.MATERIAL_ALPHABLEND;printMat.alpha=.999;
 print.material=printMat;print.isPickable=false;print.hasVertexAlpha=true;print.alwaysSelectAsActiveMesh=true;
 const matrices=new Float32Array(maxPrints*16),colors=new Float32Array(maxPrints*4),born=new Float32Array(maxPrints).fill(-1e9),strength=new Float32Array(maxPrints);
 const m=new Matrix(),q=new Quaternion(),zero=Vector3.Zero(),one=Vector3.One();
 Matrix.ComposeToRef(zero,q,zero,m);for(let k=0;k<maxPrints;k++){m.copyToArray(matrices,k*16);colors.set([1,1,1,0],k*4)}
 print.thinInstanceSetBuffer('matrix',matrices,16,false);print.thinInstanceSetBuffer('color',colors,4,false);
 let clock=0,paint=0,next=0,walked=0,side=1,steps=0;const last=new Vector3(NaN,0,NaN);
 function stamp(at:Vector3,heading:number){
  const k=next;next=(next+1)%maxPrints;steps++;
  const off=side*.075;side=-side;
  const pos=new Vector3(at.x+Math.cos(heading)*off,.034+(k%7)*.0004,at.z-Math.sin(heading)*off);
  Quaternion.FromEulerAnglesToRef(0,heading+(Math.random()-.5)*.12,0,q);Matrix.ComposeToRef(one,q,pos,m);m.copyToArray(matrices,k*16);
  born[k]=clock;strength[k]=.35+.6*paint/paintTrailDuration;
 }
 return {
  get paint(){return paint},get steps(){return steps},
  /** `moving`: Lea walked this frame; prints are spaced by stride along her path. */
  update(dt:number,lea:Vector3,heading:number,moving:boolean){
   clock+=dt;
   if(Math.hypot(lea.x-spot.x,lea.z-spot.z)<spot.r*1.05)paint=paintTrailDuration;else paint=Math.max(0,paint-dt);
   if(Number.isNaN(last.x))last.copyFrom(lea);
   const d=Math.hypot(lea.x-last.x,lea.z-last.z);last.copyFrom(lea);
   if(paint>0&&moving){walked+=d;if(walked>=stride){walked=0;stamp(lea,heading)}}else walked=stride*.5;
   for(let k=0;k<maxPrints;k++){const age=clock-born[k];colors[k*4+3]=age<printLife?strength[k]*Math.min(1,(printLife-age)/(printLife*.6)):0}
   print.thinInstanceBufferUpdated('color');print.thinInstanceBufferUpdated('matrix');
  },
  dispose(){[puddle,tin,print].forEach(x=>x.dispose());[wet,tinMat,printMat].forEach(x=>x.dispose())},
 };
}
