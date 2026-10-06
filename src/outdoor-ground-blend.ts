import {MaterialPluginBase,Texture,type StandardMaterial,type UniformBuffer} from '@babylonjs/core';
import {skyRotation} from './outdoor-sky';

/** Where the ground stays solid: fully opaque within `near` metres of the centre, panorama beyond `far`. */
export type GroundBlendArea={x:number;z:number;near:number;far:number};
export const villageGroundArea:GroundBlendArea={x:0,z:-16,near:60,far:115};
// Blend the outskirts into the same photographic ray shown by the sky dome.
// Matching its UVs removes the terrain silhouette without colouring nearby objects.
// The area is a uniform: the base constructor asks for the shader code before fields are set.
export class OutdoorGroundBlend extends MaterialPluginBase {
 private panorama:Texture;
 constructor(material:StandardMaterial,private area:GroundBlendArea=villageGroundArea){
  super(material,'outdoor panorama transition',200,{},true,true);
  this.panorama=new Texture('/assets/outdoor/mountain-landscape.jpg',material.getScene(),false,false);
  this.panorama.wrapV=Texture.CLAMP_ADDRESSMODE;
 }
 override isReadyForSubMesh(){return this.panorama.isReady()}
 override getSamplers(samplers:string[]){samplers.push('groundPanoramaSampler')}
 override getUniforms(){return {ubo:[{name:'groundBlendArea',size:4,type:'vec4'}],fragment:'uniform vec4 groundBlendArea;'}}
 override bindForSubMesh(buffer:UniformBuffer){buffer.setTexture('groundPanoramaSampler',this.panorama);const a=this.area;buffer.updateFloat4('groundBlendArea',a.x,a.z,a.near,a.far)}
 override getCustomCode(shaderType:string){
  if(shaderType!=='fragment')return null;
  return {
   CUSTOM_FRAGMENT_DEFINITIONS:'uniform sampler2D groundPanoramaSampler;',
   CUSTOM_FRAGMENT_BEFORE_FOG:`
    vec3 panoramaRay=normalize(vPositionW-vEyePosition.xyz);
    vec2 panoramaUV=vec2(fract((atan(-panoramaRay.z,panoramaRay.x)-(${skyRotation.toFixed(9)}))/6.28318530718),acos(clamp(panoramaRay.y,-1.0,1.0))/3.14159265359);
    float panoramaBlend=smoothstep(groundBlendArea.z,groundBlendArea.w,length(vPositionW.xz-groundBlendArea.xy));
    color.rgb=mix(color.rgb,texture2D(groundPanoramaSampler,panoramaUV).rgb,panoramaBlend);
   `,
  };
 }
}
