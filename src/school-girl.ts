import {ImportMeshAsync,Mesh,TransformNode,Vector3,VertexBuffer,VertexData,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
// Ears included; a little taller than Lea (about 1.5 m with her hat).
const height=1.75;
// Measured on the source T-pose (metres, before scaling): shoulder and elbow pivots.
const shoulder={x:.2,y:1.21},elbow={x:.42},sourceHeight=1.7115;
const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const ease=(t:number)=>t<=0?0:t>=1?1:(1-Math.cos(Math.PI*t))/2;
/** Arm lift in radians: 0 is the T-pose, negative hangs the arm down, positive raises it. */
type ArmPose={shoulder:number;elbow:number};
const rest:ArmPose={shoulder:-1.28,elbow:-.12};
/**
 * The cat girl model is one unskinned mesh in a T-pose. Arms are blended out of the body
 * with soft weights at the shoulder and elbow and posed on the CPU (only while they move).
 */
export async function loadCatGirl(scene:Scene,shadow:ShadowGenerator,place:{x:number;z:number;angle:number}){
 const result=await ImportMeshAsync('/models/cat-girl/cat-girl.glb',scene);
 const source=result.meshes.find(m=>m.getTotalVertices()>0) as Mesh;source.computeWorldMatrix(true);
 const world=source.getWorldMatrix(),k=height/sourceHeight;
 const srcPos=source.getVerticesData(VertexBuffer.PositionKind)!,srcNor=source.getVerticesData(VertexBuffer.NormalKind)!,count=srcPos.length/3;
 const restPos=new Float32Array(srcPos.length),restNor=new Float32Array(srcNor.length),p=new Vector3(),n=new Vector3();
 for(let i=0;i<count;i++){
  Vector3.TransformCoordinatesFromFloatsToRef(srcPos[i*3],srcPos[i*3+1],srcPos[i*3+2],world,p);restPos.set([p.x,p.y,p.z],i*3);
  Vector3.TransformNormalFromFloatsToRef(srcNor[i*3],srcNor[i*3+1],srcNor[i*3+2],world,n);n.normalize();restNor.set([n.x,n.y,n.z],i*3);
 }
 // Per-vertex side and weights: only the sleeve band below the hood belongs to an arm.
 const side=new Int8Array(count),wShoulder=new Float32Array(count),wElbow=new Float32Array(count);
 for(let i=0;i<count;i++){const x=restPos[i*3],y=restPos[i*3+1],ax=Math.abs(x);if(y<1.06||y>1.31||ax<.17)continue;side[i]=x>0?1:-1;wShoulder[i]=smooth(.18,.27,ax);wElbow[i]=smooth(.39,.46,ax)}
 const root=new TransformNode('cat girl',scene);root.position.set(place.x,.04,place.z);root.rotation.y=place.angle;
 const body=new TransformNode('cat girl scale',scene);body.parent=root;body.scaling.setAll(k);
 const mesh=new Mesh('cat girl body',scene);const data=new VertexData();
 // The loader's handedness flip mirrors the baked vertices: keep triangles facing outward.
 const indices=Array.from(source.getIndices()!);if(world.determinant()<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 data.positions=new Float32Array(restPos);data.normals=new Float32Array(restNor);data.uvs=source.getVerticesData(VertexBuffer.UVKind)!;data.indices=indices;
 data.applyToMesh(mesh,true);mesh.material=source.material;mesh.parent=body;mesh.receiveShadows=true;mesh.isPickable=false;shadow.addShadowCaster(mesh);
 result.meshes.forEach(m=>m.dispose(false,false));result.transformNodes.forEach(t=>t.dispose());
 const pos=new Float32Array(restPos),nor=new Float32Array(restNor);
 const rotate=(arr:Float32Array,i:number,cx:number,cy:number,a:number)=>{const c=Math.cos(a),s=Math.sin(a),x=arr[i]-cx,y=arr[i+1]-cy;arr[i]=cx+x*c-y*s;arr[i+1]=cy+x*s+y*c};
 function pose(left:ArmPose,right:ArmPose){
  for(let i=0;i<count;i++){
   const j=i*3;pos[j]=restPos[j];pos[j+1]=restPos[j+1];pos[j+2]=restPos[j+2];nor[j]=restNor[j];nor[j+1]=restNor[j+1];nor[j+2]=restNor[j+2];
   const s=side[i];if(!s)continue;const arm=s>0?right:left;
   // Elbow first, in the arm's own frame, then the whole arm about the shoulder.
   if(wElbow[i]>0){const a=s*arm.elbow*wElbow[i];rotate(pos,j,s*elbow.x,shoulder.y,a);rotate(nor,j,0,0,a)}
   const a=s*arm.shoulder*wShoulder[i];rotate(pos,j,s*shoulder.x,shoulder.y,a);rotate(nor,j,0,0,a);
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind,pos);mesh.updateVerticesData(VertexBuffer.NormalKind,nor);mesh.refreshBoundingInfo();
 }
 pose(rest,rest);
 let waveTime=-1,time=0,facing=place.angle;const waveLength=2.6;
 return {
  root,
  get waving(){return waveTime>=0},
  wave(){waveTime=0},
  update(dt:number,lea:Vector3){
   time+=dt;
   // Turn towards Lea when she is close; otherwise face the pitch again.
   const near=Math.hypot(lea.x-root.position.x,lea.z-root.position.z)<4;
   const goal=near?Math.atan2(lea.x-root.position.x,lea.z-root.position.z):place.angle;
   facing+=Math.atan2(Math.sin(goal-facing),Math.cos(goal-facing))*Math.min(1,dt*4);root.rotation.y=facing;
   body.position.y=Math.sin(time*2.1)*.006;
   if(waveTime<0)return;
   waveTime+=dt;const t=waveTime/waveLength,raise=ease(Math.min(1,t*4))*ease(Math.min(1,(1-t)*4));
   const right={shoulder:rest.shoulder+(.5-rest.shoulder)*raise,elbow:rest.elbow+(.95+.38*Math.sin(waveTime*11)-rest.elbow)*raise};
   pose(rest,right);
   if(waveTime>=waveLength){waveTime=-1;pose(rest,rest)}
  },
 };
}
