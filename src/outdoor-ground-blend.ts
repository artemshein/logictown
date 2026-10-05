import {MaterialPluginBase,Texture,type StandardMaterial,type UniformBuffer} from '@babylonjs/core';
import {skyRotation} from './outdoor-sky';

// Blend the outskirts into the same photographic ray shown by the sky dome.
// Matching its UVs removes the terrain silhouette without colouring nearby objects.
export class OutdoorGroundBlend extends MaterialPluginBase {
 private panorama:Texture;
 constructor(material:StandardMaterial){
  super(material,'outdoor panorama transition',200,{},true,true);
  this.panorama=new Texture('/assets/outdoor/mountain-landscape.jpg',material.getScene(),false,false);
  this.panorama.wrapV=Texture.CLAMP_ADDRESSMODE;
 }
 override isReadyForSubMesh(){return this.panorama.isReady()}
 override getSamplers(samplers:string[]){samplers.push('groundPanoramaSampler')}
 override bindForSubMesh(buffer:UniformBuffer){buffer.setTexture('groundPanoramaSampler',this.panorama)}
 override getCustomCode(shaderType:string){
  if(shaderType!=='fragment')return null;
  return {
   CUSTOM_FRAGMENT_DEFINITIONS:'uniform sampler2D groundPanoramaSampler;',
   CUSTOM_FRAGMENT_BEFORE_FOG:`
    vec3 panoramaRay=normalize(vPositionW-vEyePosition.xyz);
    vec2 panoramaUV=vec2(fract((atan(-panoramaRay.z,panoramaRay.x)-(${skyRotation.toFixed(9)}))/6.28318530718),acos(clamp(panoramaRay.y,-1.0,1.0))/3.14159265359);
    float panoramaBlend=smoothstep(60.0,115.0,length(vPositionW.xz-vec2(0.0,-16.0)));
    color.rgb=mix(color.rgb,texture2D(groundPanoramaSampler,panoramaUV).rgb,panoramaBlend);
   `,
  };
 }
}
