import {Color3,Mesh,MeshBuilder,StandardMaterial,Texture,Vector3,type Scene} from '@babylonjs/core';
// Sun centre in the source equirectangular photograph; latitude aligns the shadows.
export const skySunUV={u:.599,v:.397};
export const skyRotation=1.993-skySunUV.u*Math.PI*2;
const latitude=skySunUV.v*Math.PI,longitude=skySunUV.u*Math.PI*2+skyRotation;
export const outdoorSunDirection=new Vector3(Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),-Math.sin(latitude)*Math.sin(longitude));
export function createOutdoorSky(scene:Scene){
 const dome=MeshBuilder.CreateSphere('photographic clear sky',{diameter:300,segments:32,sideOrientation:Mesh.BACKSIDE},scene);
 dome.infiniteDistance=true;dome.isPickable=false;dome.applyFog=false;dome.rotation.y=skyRotation;
 const material=new StandardMaterial('clear sky panorama',scene);material.disableLighting=true;material.fogEnabled=false;material.disableDepthWrite=true;
 material.diffuseColor=Color3.Black();material.specularColor=Color3.Black();material.emissiveTexture=new Texture('/assets/outdoor/clear-sky.jpg',scene,false,false);material.emissiveTexture.wrapV=Texture.CLAMP_ADDRESSMODE;
 dome.material=material;
 const disc=MeshBuilder.CreateSphere('visible solar disc',{diameter:1.5,segments:16},scene);disc.position.copyFrom(outdoorSunDirection.scale(100));disc.infiniteDistance=true;disc.isPickable=false;disc.applyFog=false;
 const sunlight=new StandardMaterial('solar disc light',scene);sunlight.disableLighting=true;sunlight.fogEnabled=false;sunlight.emissiveColor=new Color3(1,1,.94);disc.material=sunlight;
 return dome;
}
