import {Color3,DynamicTexture,Mesh,MeshBuilder,StandardMaterial,TransformNode,Vector3,type Scene} from '@babylonjs/core';
/** Interior dimensions in the bus frame: +x forward, +y up, +z to the left. */
export const busInterior={length:11,width:2.5,floor:.4,ceiling:2.65,seat:{x:0,z:.86}};
const windowBottom=1.12,windowTop=2.28;
/** A city bus cabin with open window bays, so the village stays visible. */
export function buildBusInterior(scene:Scene){
 const root=new TransformNode('school bus',scene);
 const mat=(name:string,c:Color3,alpha=1,glow?:Color3)=>{const m=new StandardMaterial('bus '+name,scene);m.diffuseColor=c;m.specularColor=new Color3(.08,.08,.08);if(alpha<1){m.alpha=alpha;m.backFaceCulling=false}if(glow)m.emissiveColor=glow;return m};
 const panel=mat('wall panel',new Color3(.86,.85,.8)),trim=mat('trim',new Color3(.24,.26,.28)),floor=mat('floor',new Color3(.3,.33,.35)),ceiling=mat('ceiling',new Color3(.93,.93,.9));
 const glass=mat('glass',new Color3(.8,.9,.95),.1),seat=mat('seat fabric',new Color3(.17,.33,.6)),shell=mat('seat shell',new Color3(.5,.53,.58)),pole=mat('handrail',new Color3(.96,.78,.18)),lamp=mat('ceiling light',new Color3(1,1,.96),1,new Color3(.85,.85,.8)),button=mat('stop button',new Color3(.85,.15,.12),1,new Color3(.35,.04,.03));
 const meshes:Mesh[]=[];
 const box=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:StandardMaterial)=>{const b=MeshBuilder.CreateBox('bus '+name,{width:w,height:h,depth:d},scene);b.parent=root;b.position.set(x,y,z);b.material=m;b.isPickable=false;meshes.push(b);return b};
 const {length:L,width:W,floor:F,ceiling:C}=busInterior,half=W/2;
 box('floor',L,.06,W,0,F-.03,0,floor);box('roof',L,.06,W,0,C+.03,0,ceiling);
 box('roof light',L-1,.02,.18,0,C-.01,.55,lamp);box('roof light',L-1,.02,.18,0,C-.01,-.55,lamp);
 // Side walls: solid below and above, pillars between wide window bays.
 const door={from:3.6,to:4.8};
 for(const side of [-1,1]){
  const z=side*half;
  for(const [from,to] of side<0?[[-L/2,door.from],[door.to,L/2]]:[[-L/2,L/2]]){
   const w=to-from,x=(from+to)/2;
   box('lower wall',w,windowBottom-F,.06,x,(F+windowBottom)/2,z,panel);box('upper wall',w,C-windowTop,.06,x,(windowTop+C)/2,z,panel);
   box('window sill',w,.05,.12,x,windowBottom,z-side*.04,trim);box('window glass',w,windowTop-windowBottom,.01,x,(windowBottom+windowTop)/2,z,glass);
  }
  for(let x=-L/2+.05;x<=L/2;x+=1.55)if(side>0||x<door.from-.1||x>door.to+.1)box('window pillar',.1,windowTop-windowBottom,.08,x,(windowBottom+windowTop)/2,z,trim);
 }
 // Glass doors on the kerb side.
 box('door glass',door.to-door.from,C-F-.15,.02,(door.from+door.to)/2,(F+C-.15)/2,-half,glass);
 box('door frame',.06,C-F,.08,door.from,(F+C)/2,-half,trim);box('door frame',.06,C-F,.08,door.to,(F+C)/2,-half,trim);box('door seam',.04,C-F-.15,.05,(door.from+door.to)/2,(F+C)/2,-half,trim);
 // Front: dashboard, windscreen and destination display; rear wall with a small window.
 box('dashboard',.5,.8,W,L/2-.25,F+.4,0,trim);box('windscreen',.02,1.35,W-.1,L/2,F+1.5,0,glass);box('windscreen pillar',.06,1.35,.08,L/2,F+1.5,0,trim);
 box('front header',.06,.4,W,L/2,C-.2,0,panel);
 box('display housing',.04,.22,1.34,L/2-.04,C-.22,0,trim);
 const display=MeshBuilder.CreatePlane('bus destination display',{width:1.3,height:.18},scene);display.parent=root;display.position.set(L/2-.07,C-.22,0);display.rotation.y=Math.PI/2;display.material=mat('display',new Color3(0,0,0));display.isPickable=false;meshes.push(display);
 const dt=new DynamicTexture('bus destination display',{width:512,height:72},scene,true),c=dt.getContext() as unknown as CanvasRenderingContext2D;
 c.fillStyle='#111';c.fillRect(0,0,512,72);c.fillStyle='#ffb43a';c.font='700 44px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('1  ШКОЛА',256,38);dt.update();
 const dm=display.material as StandardMaterial;dm.emissiveTexture=dt;dm.diffuseTexture=dt;dm.emissiveColor=Color3.White();
 box('rear wall low',.06,windowBottom-F,W,-L/2,(F+windowBottom)/2,0,panel);box('rear wall high',.06,C-windowTop,W,-L/2,(windowTop+C)/2,0,panel);box('rear glass',.01,windowTop-windowBottom,W,-L/2,(windowBottom+windowTop)/2,0,glass);
 // Driver's seat and steering wheel on the left, behind the dashboard.
 box('driver seat',.5,.1,.5,L/2-1.2,F+.45,.65,seat);box('driver back',.08,.7,.5,L/2-1.48,F+.85,.65,seat);
 const wheel=MeshBuilder.CreateTorus('bus steering wheel',{diameter:.45,thickness:.04,tessellation:24},scene);wheel.parent=root;wheel.position.set(L/2-.65,F+.95,.65);wheel.rotation.z=Math.PI/2-.45;wheel.material=trim;wheel.isPickable=false;meshes.push(wheel);
 box('driver cabin wall',.04,1.2,.9,L/2-1.75,F+.6,.15,panel);
 // Double seats on both sides, facing forward; the window seat is ours.
 for(let x=2.7;x>-L/2+.4;x-=.9)for(const side of [-1,1]){
  if(side<0&&x>door.from-1)continue;
  const z=side*.78;
  box('seat cushion',.46,.1,.86,x,F+.45,z,seat);box('seat back',.08,.5,.86,x-.24,F+.76,z,seat);box('seat shell',.1,.54,.88,x-.29,F+.74,z,shell);box('seat leg',.06,.4,.06,x,F+.2,z-side*.3,trim);
  if(Math.round(x*10)%18===0){const p=MeshBuilder.CreateCylinder('bus handrail',{height:C-F,diameter:.035,tessellation:10},scene);p.parent=root;p.position.set(x-.3,(F+C)/2,side*.32);p.material=pole;p.isPickable=false;meshes.push(p);box('stop button',.05,.08,.05,x-.3,F+1.25,side*.3,button)}
 }
 for(const side of [-1,1]){const r=MeshBuilder.CreateCylinder('bus ceiling rail',{height:L-1.5,diameter:.03,tessellation:10},scene);r.parent=root;r.rotation.z=Math.PI/2;r.position.set(-.4,C-.35,side*.32);r.material=pole;r.isPickable=false;meshes.push(r)}
 // Eye height of a seated child in the window seat.
 const head=new TransformNode('bus passenger head',scene);head.parent=root;head.position.set(busInterior.seat.x+.05,F+1.2,busInterior.seat.z);head.rotation.y=Math.PI/2;
 return {root,head,meshes,forward:()=>Vector3.TransformNormal(Vector3.Right(),root.getWorldMatrix()).normalize()};
}
