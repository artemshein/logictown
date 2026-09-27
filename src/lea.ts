import { AnimationGroup, HDRCubeTexture, ImportMeshAsync, Scene, ShadowGenerator, TransformNode } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export type LeaClip = 'Idle' | 'Walk' | 'Interact' | 'Celebrate';
export async function loadLea(scene:Scene,parent:TransformNode,shadow?:ShadowGenerator){
  const result=await ImportMeshAsync('/models/lea-b.glb',scene);
  const pivot=new TransformNode('Lea asset orientation',scene);pivot.parent=parent;
  // Blender -Y becomes glTF +Z. Babylon's LH conversion retains +Z forward
  // (its Y half-turn and Z mirror cancel on that axis).
  result.meshes.filter(m=>!m.parent).forEach(m=>m.parent=pivot);
  result.meshes.forEach(m=>{m.receiveShadows=true;m.isPickable=false;shadow?.addShadowCaster(m)});
  if(!scene.environmentTexture){scene.environmentTexture=new HDRCubeTexture('/models/studio.hdr',scene,64,false,true,false,true);scene.environmentIntensity=.55;}
  const clips=new Map<string,AnimationGroup>();result.animationGroups.forEach(g=>{g.stop();clips.set(g.name.split('|').pop()!,g)});
  let active:AnimationGroup|undefined;
  const play=(name:LeaClip,loop=true)=>{const next=clips.get(name);if(!next||next===active&&next.isPlaying)return;active?.stop();active=next;next.start(loop,1);};
  play('Idle');
  return {pivot,meshes:result.meshes,clips,play,stop:()=>{active?.stop();active=undefined}};
}
