import {Color3,DynamicTexture,Mesh,MeshBuilder,StandardMaterial,Vector3,type Scene} from '@babylonjs/core';

// A world-space, depth-tested sign: never an HTML overlay or an x-ray marker.
export function createInteractionMarker(scene:Scene,label:string,icon:string,position:Vector3,activate:()=>void){
 const texture=new DynamicTexture('interaction '+label,128,scene,true);
 texture.hasAlpha=true;
 const c=texture.getContext() as unknown as CanvasRenderingContext2D;
 c.clearRect(0,0,128,128);c.fillStyle='#fff6dc';c.beginPath();c.arc(64,64,57,0,Math.PI*2);c.fill();
 c.strokeStyle='#bba36d';c.lineWidth=4;c.stroke();c.fillStyle='#385b4d';c.font='56px "Segoe UI Symbol", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(icon,64,66);texture.update();
 const material=new StandardMaterial('interaction '+label,scene);material.diffuseTexture=texture;material.opacityTexture=texture;material.emissiveColor=Color3.White();material.disableLighting=true;material.backFaceCulling=false;
 const mesh=MeshBuilder.CreatePlane('interaction '+label,{size:.38},scene);mesh.position.copyFrom(position);mesh.material=material;mesh.billboardMode=Mesh.BILLBOARDMODE_ALL;mesh.setEnabled(false);
 mesh.metadata={interaction:activate};
 return {mesh,dispose(){mesh.dispose();material.dispose();texture.dispose()}};
}
