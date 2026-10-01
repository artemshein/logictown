import {Engine,Scene,Vector3,ArcRotateCamera,HemisphericLight,DirectionalLight,ShadowGenerator,TransformNode,MeshBuilder,StandardMaterial,Color3} from '@babylonjs/core';
import {loadDog} from '../src/dog';
const engine=new Engine(document.querySelector('#view') as HTMLCanvasElement,true),scene=new Scene(engine);
const camera=new ArcRotateCamera('camera',Math.PI/2,1.3,2.2,new Vector3(-.7,.3,-.1),scene);camera.attachControl();
new HemisphericLight('sky',Vector3.Up(),scene);const sun=new DirectionalLight('sun',new Vector3(-1,-2,-1),scene);sun.position.set(4,8,4);const shadow=new ShadowGenerator(512,sun);
const floor=MeshBuilder.CreateGround('floor',{width:10,height:10},scene);floor.receiveShadows=true;const mat=new StandardMaterial('floor',scene);mat.diffuseColor=new Color3(.7,.7,.7);floor.material=mat;
const lea=new TransformNode('lea',scene);lea.position.set(0,.11,0);const dog=await loadDog(scene,lea,shadow,()=>false);
engine.runRenderLoop(()=>{dog.update(Math.min(.04,engine.getDeltaTime()/1000),false,[],false);scene.render()});window.addEventListener('resize',()=>engine.resize());
const output=document.createElement('output');output.style.cssText='position:fixed;top:0;left:0';document.body.append(output);scene.onAfterRenderObservable.add(()=>output.textContent=JSON.stringify({sit:dog.sitting,body:scene.getTransformNodeByName('Body')?.position.asArray(),back:scene.getTransformNodeByName('Back')?.rotationQuaternion?.asArray()}));
