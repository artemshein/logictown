import {Color3,DynamicTexture,Mesh,MeshBuilder,StandardMaterial,Texture,TransformNode,Vector3,VertexData,type Scene} from '@babylonjs/core';
/** Interior dimensions in the bus frame: +x forward, +y up, +z to the left. */
export const busInterior={length:11,width:2.5,floor:.4,ceiling:2.65,seat:{x:0,z:.86}};
const windowBottom=1.12,windowTop=2.28,door={from:3.6,to:4.8},axles=[2.9,-2.7];

// ---- Geometry: rounded prisms and window frames with explicit normals and metre UVs.
let windingSign=0;
function winding(){
 if(windingSign)return windingSign;
 const out:number[]=[];VertexData.ComputeNormals([0,0,0,1,0,0,0,1,0],[0,1,2],out);
 windingSign=Math.sign(out[2]||1);return windingSign;
}
class Geometry{
 p:number[]=[];n:number[]=[];uv:number[]=[];i:number[]=[];
 v(pos:Vector3,normal:Vector3,u:number,w:number){this.p.push(pos.x,pos.y,pos.z);this.n.push(normal.x,normal.y,normal.z);this.uv.push(u,w);return this.p.length/3-1}
 tri(a:number,b:number,c:number){
  const P=(k:number)=>new Vector3(this.p[k*3],this.p[k*3+1],this.p[k*3+2]),N=(k:number)=>new Vector3(this.n[k*3],this.n[k*3+1],this.n[k*3+2]);
  const face=Vector3.Cross(P(b).subtract(P(a)),P(c).subtract(P(a))).scale(winding());
  if(Vector3.Dot(face,N(a).add(N(b)).add(N(c)))<0)this.i.push(a,c,b);else this.i.push(a,b,c);
 }
 quad(a:number,b:number,c:number,d:number){this.tri(a,b,c);this.tri(a,c,d)}
 build(name:string,scene:Scene){const m=new Mesh(name,scene),d=new VertexData();d.positions=this.p;d.normals=this.n;d.uvs=this.uv;d.indices=this.i;d.applyToMesh(m);return m}
}
/** Rounded rectangle outline in the XY plane, with outward normals. */
function outline(w:number,h:number,r:number,seg=5){
 r=Math.max(.001,Math.min(r,w/2-.001,h/2-.001));const pts:{p:Vector3;n:Vector3}[]=[];
 for(const [cx,cy,a0] of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]])
  for(let k=0;k<=seg;k++){const a=a0+k/seg*Math.PI/2,n=new Vector3(Math.cos(a),Math.sin(a),0);pts.push({p:new Vector3(cx+n.x*r,cy+n.y*r,0),n})}
 return pts;
}
/** A box with rounded edges around its z axis: w along x, h along y, d along z. */
function roundedPrism(name:string,scene:Scene,w:number,h:number,d:number,r:number,seg=5){
 const g=new Geometry(),ring=outline(w,h,r,seg);let u=0;
 for(let k=0;k<ring.length;k++){
  const a=ring[k],b=ring[(k+1)%ring.length],len=Vector3.Distance(a.p,b.p);
  const a0=g.v(a.p.add(new Vector3(0,0,-d/2)),a.n,u,-d/2),a1=g.v(a.p.add(new Vector3(0,0,d/2)),a.n,u,d/2);u+=len;
  const b0=g.v(b.p.add(new Vector3(0,0,-d/2)),b.n,u,-d/2),b1=g.v(b.p.add(new Vector3(0,0,d/2)),b.n,u,d/2);g.quad(a0,b0,b1,a1);
 }
 for(const side of [-1,1]){const normal=new Vector3(0,0,side),c=g.v(new Vector3(0,0,side*d/2),normal,0,0),ids=ring.map(q=>g.v(q.p.add(new Vector3(0,0,side*d/2)),normal,q.p.x,q.p.y));ids.forEach((id,k)=>g.tri(c,id,ids[(k+1)%ids.length]))}
 return g.build(name,scene);
}
/** A flat panel (w × h, depth along z) with a rounded opening inset by m. */
function windowFrame(name:string,scene:Scene,w:number,h:number,m:number,r:number,depth:number,seg=6){
 const g=new Geometry(),inner=outline(w-2*m,h-2*m,r,seg),outer=outline(w,h,.002,seg);
 for(const side of [-1,1]){const normal=new Vector3(0,0,side),z=new Vector3(0,0,side*depth/2);
  const ids=inner.map((q,k)=>[g.v(q.p.add(z),normal,q.p.x,q.p.y),g.v(outer[k].p.add(z),normal,outer[k].p.x,outer[k].p.y)]);
  ids.forEach(([a,b],k)=>{const [c,d]=ids[(k+1)%ids.length];g.quad(a,b,d,c)})}
 let u=0;for(let k=0;k<inner.length;k++){const a=inner[k],b=inner[(k+1)%inner.length],na=a.n.negate(),nb=b.n.negate(),len=Vector3.Distance(a.p,b.p);
  const a0=g.v(a.p.add(new Vector3(0,0,-depth/2)),na,u,0),a1=g.v(a.p.add(new Vector3(0,0,depth/2)),na,u,depth);u+=len;const b0=g.v(b.p.add(new Vector3(0,0,-depth/2)),nb,u,0),b1=g.v(b.p.add(new Vector3(0,0,depth/2)),nb,u,depth);g.quad(a0,b0,b1,a1)}
 return g.build(name,scene);
}
const sealPath=(w:number,h:number,r:number)=>{const pts=outline(w,h,r,6).map(q=>q.p);pts.push(pts[0].clone());return pts};

// ---- Procedural textures.
type Paint=(c:CanvasRenderingContext2D,w:number,h:number)=>void;
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const moquette:Paint=(c,s)=>{c.fillStyle='#1f3a63';c.fillRect(0,0,s,s);for(let k=0;k<2400;k++){c.fillStyle=rnd()<.5?'#17304f':'#2a4a78';c.fillRect(rnd()*s,rnd()*s,2,2)}
 const cell=s/4;for(let y=0;y<4;y++)for(let x=0;x<4;x++){const cx=(x+.5+(y%2)*.5)*cell%s,cy=(y+.5)*cell;c.fillStyle='#f0a24a';c.beginPath();c.arc(cx,cy,cell*.13,0,Math.PI*2);c.fill();c.fillStyle='#3fb3a3';c.fillRect(cx+cell*.25,cy-cell*.3,cell*.16,cell*.16);c.strokeStyle='#dfe7f1';c.lineWidth=s/90;c.beginPath();c.moveTo(cx-cell*.4,cy+cell*.32);c.lineTo(cx-cell*.12,cy+cell*.32);c.stroke()}};
const vinyl:Paint=(c,s)=>{c.fillStyle='#5f6469';c.fillRect(0,0,s,s);for(let k=0;k<5000;k++){const v=rnd();c.fillStyle=v<.33?'#7d8287':v<.66?'#4c5055':'#8f7f62';c.fillRect(rnd()*s,rnd()*s,1.6,1.6)}
 c.strokeStyle='#ffffff10';c.lineWidth=2;for(let k=0;k<s;k+=s/16){c.beginPath();c.moveTo(k,0);c.lineTo(k,s);c.stroke()}};
const panelTex:Paint=(c,s)=>{c.fillStyle='#dcd9d1';c.fillRect(0,0,s,s);for(let k=0;k<1800;k++){c.fillStyle=rnd()<.5?'#d3d0c8':'#e4e1da';c.fillRect(rnd()*s,rnd()*s,2,6)}};
const ceilingTex:Paint=(c,s)=>{c.fillStyle='#efefea';c.fillRect(0,0,s,s);c.fillStyle='#c8c8c2';const n=12;for(let y=0;y<n;y++)for(let x=0;x<n;x++){c.beginPath();c.arc((x+.5)*s/n,(y+.5)*s/n,s/n*.13,0,Math.PI*2);c.fill()}};
const grille:Paint=(c,s)=>{c.fillStyle='#4a4e53';c.fillRect(0,0,s,s);c.fillStyle='#24272a';for(let k=0;k<8;k++)c.fillRect(s*.08,(k+.25)*s/8,s*.84,s/8*.45)};
const gauges:Paint=(c,w,h)=>{c.fillStyle='#14171a';c.fillRect(0,0,w,h);for(const [x,label] of [[.25,'км/ч'],[.75,'об/мин']] as const){c.strokeStyle='#cfd6dc';c.lineWidth=3;c.beginPath();c.arc(w*x,h*.48,h*.34,Math.PI*.8,Math.PI*2.2);c.stroke();c.strokeStyle='#ff6b3d';c.beginPath();c.moveTo(w*x,h*.48);c.lineTo(w*x+h*.26*Math.cos(-.6),h*.48+h*.26*Math.sin(-.6));c.stroke();c.fillStyle='#cfd6dc';c.font=`${h*.1}px system-ui`;c.textAlign='center';c.fillText(label,w*x,h*.85)}
 c.fillStyle='#2e7d4f';c.fillRect(w*.46,h*.18,w*.08,h*.1)};
const poster=(bg:string,title:string,sub:string,accent:string):Paint=>(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=accent;c.beginPath();c.arc(h*.5,h*.5,h*.3,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.textAlign='left';c.textBaseline='middle';c.font=`700 ${h*.24}px system-ui,sans-serif`;c.fillText(title,h*.95,h*.36,w-h);c.font=`500 ${h*.15}px system-ui,sans-serif`;c.fillText(sub,h*.95,h*.68,w-h)};

/** A city bus cabin with rounded fittings, window bays and a visible exterior shell. */
export function buildBusInterior(scene:Scene){
 const root=new TransformNode('school bus',scene),interior:Mesh[]=[],exterior:Mesh[]=[];
 const texture=(name:string,w:number,h:number,paint:Paint,repeat:number)=>{const t=new DynamicTexture('bus '+name,{width:w,height:h},scene,true),c=t.getContext() as unknown as CanvasRenderingContext2D;paint(c,w,h);t.update();if(repeat!==1){t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;t.uScale=t.vScale=repeat}return t};
 const mat=(name:string,color:Color3,o:{tex?:Texture;spec?:number;alpha?:number;glow?:Color3}={})=>{const m=new StandardMaterial('bus '+name,scene);m.diffuseColor=color;m.specularColor=new Color3(o.spec??.06,o.spec??.06,o.spec??.06);m.specularPower=48;if(o.tex)m.diffuseTexture=o.tex;if(o.alpha!==undefined)m.alpha=o.alpha;if(o.glow)m.emissiveColor=o.glow;m.backFaceCulling=false;m.twoSidedLighting=true;return m};
 const white=Color3.White();
 const M={
  fabric:mat('seat moquette',white,{tex:texture('moquette',256,256,moquette,4)}),driverFabric:mat('driver seat',new Color3(.55,.57,.6),{tex:texture('driver moquette',128,128,moquette,6)}),
  floor:mat('vinyl floor',white,{tex:texture('vinyl',512,512,vinyl,1.5)}),panel:mat('wall panel',white,{tex:texture('panel',256,256,panelTex,1.2),spec:.12}),ceiling:mat('ceiling',white,{tex:texture('ceiling',256,256,ceilingTex,3)}),
  plastic:mat('grey plastic',new Color3(.62,.64,.67),{spec:.25}),darkPlastic:mat('dark plastic',new Color3(.2,.21,.23),{spec:.2}),rubber:mat('rubber seal',new Color3(.05,.05,.06),{spec:.15}),
  grille:mat('heater grille',white,{tex:texture('grille',64,64,grille,8)}),yellow:mat('handrail',new Color3(.98,.76,.12),{spec:.6}),chrome:mat('chrome',new Color3(.78,.8,.82),{spec:.9}),
  glass:mat('glass',new Color3(.75,.86,.9),{alpha:.12,spec:.6}),light:mat('light diffuser',new Color3(1,1,.97),{glow:new Color3(.92,.92,.86)}),red:mat('stop button',new Color3(.85,.12,.1),{glow:new Color3(.3,.03,.02)}),
  stripe:mat('yellow floor edge',new Color3(.95,.78,.1)),paint:mat('body paint',new Color3(.96,.6,.12),{spec:.35}),band:mat('body band',new Color3(.96,.95,.92),{spec:.35}),tyre:mat('tyre',new Color3(.07,.07,.08)),
  green:mat('validator light',new Color3(.2,.9,.4),{glow:new Color3(.15,.6,.25)}),validator:mat('validator',new Color3(.95,.7,.15),{spec:.4}),
 };
 const place=(m:Mesh,x:number,y:number,z:number,material:StandardMaterial,list=interior)=>{m.parent=root;m.position.set(x,y,z);m.material=material;m.isPickable=false;list.push(m);return m};
 const slab=(name:string,w:number,h:number,d:number,r:number,x:number,y:number,z:number,material:StandardMaterial,list=interior)=>place(roundedPrism('bus '+name,scene,w,h,d,r),x,y,z,material,list);
 /** A rounded slab whose long axis runs along the bus (profile: w across, h up). */
 const rail=(name:string,w:number,h:number,length:number,r:number,x:number,y:number,z:number,material:StandardMaterial,list=interior)=>{const m=slab(name,w,h,length,r,x,y,z,material,list);m.rotation.y=Math.PI/2;return m};
 const tube=(name:string,path:Vector3[],radius:number,material:StandardMaterial,list=interior)=>place(MeshBuilder.CreateTube('bus '+name,{path,radius,tessellation:12,cap:Mesh.CAP_ALL},scene),0,0,0,material,list);
 const plane=(name:string,w:number,h:number,x:number,y:number,z:number,rotY:number,material:StandardMaterial)=>{const m=place(MeshBuilder.CreatePlane('bus '+name,{width:w,height:h},scene),x,y,z,material);m.rotation.y=rotY;return m};
 const {length:L,width:W,floor:F,ceiling:C}=busInterior,half=W/2;

 // Floor, door edge and wheel arches.
 slab('floor',L,.06,W,.01,0,F-.03,0,M.floor);
 slab('door step edge',door.to-door.from,.012,.1,.004,(door.from+door.to)/2,F+.006,-half+.1,M.stripe);
 for(const x of axles)for(const side of [-1,1]){const arch=place(MeshBuilder.CreateCylinder('bus wheel arch',{diameter:1.04,height:.42,arc:.5,tessellation:24,enclose:true},scene),x,F-.04,side*(half-.21),M.plastic);arch.rotation.set(-Math.PI/2,0,0)}

 // Side walls: lower panels, heater ducts, framed window bays with seals and glass.
 const bays=(from:number,to:number)=>{const n=Math.max(1,Math.round((to-from)/1.55)),w=(to-from)/n;return Array.from({length:n},(_,k)=>({x:from+w*(k+.5),w}))};
 const ads=[poster('#3f8f5a','Береги природу','Не оставляй мусор в лесу','#a7d36b'),poster('#2f5c9a','Библиотека открыта','Каждый день с 9 до 18','#f2c14e'),poster('#b4513a','Тихий город','Проезд для школьников бесплатно','#ffd08a')].map((p,k)=>mat('advert '+k,white,{tex:texture('advert '+k,512,170,p,1)}));
 for(const side of [-1,1]){
  const z=side*half,segments=side<0?[[-L/2,door.from],[door.to,L/2]]:[[-L/2,L/2]];
  for(const [from,to] of segments){
   const len=to-from,cx=(from+to)/2;
   slab('lower wall',len,windowBottom-F,.06,.004,cx,(F+windowBottom)/2,z,M.panel);
   rail('heater duct',.12,.2,len-.1,.05,cx,F+.12,side*(half-.09),M.grille);
   rail('window sill',.1,.035,len,.015,cx,windowBottom-.005,side*(half-.06),M.plastic);
   slab('upper wall',len,.14,.06,.004,cx,windowTop+.07,z,M.panel);
   for(const [k,bay] of bays(from,to).entries()){
    const bh=windowTop-windowBottom,cy=(windowBottom+windowTop)/2;
    place(windowFrame('bus window frame',scene,bay.w,bh,.05,.1,.07),bay.x,cy,side*(half-.01),M.plastic);
    const seal=tube('window seal',sealPath(bay.w-.1,bh-.1,.1),.012,M.rubber);seal.position.set(bay.x,cy,side*(half-.045));
    slab('window glass',bay.w-.08,bh-.08,.008,.09,bay.x,cy,side*(half+.015),M.glass);
    if(k%2===0){rail('hopper rail',.025,.03,bay.w-.12,.01,bay.x,windowTop-.34,side*(half-.04),M.rubber);slab('hopper latch',.08,.03,.04,.012,bay.x,windowTop-.31,side*(half-.06),M.darkPlastic)}
    if(k%3===1)slab('emergency hammer',.05,.14,.04,.02,bay.x-bay.w/2,windowTop-.3,side*(half-.08),M.red);
   }
  }
  // Sloped cove to the ceiling, carrying advertising cards.
  const cove=slab('ceiling cove',L,.46,.03,.01,0,windowTop+.27,side*(half-.19),M.panel);cove.rotation.x=-side*.99;
  for(let k=0;k<3;k++){const card=plane('advert',1.05,.35,0,0,0,side>0?0:Math.PI,ads[(k+(side>0?0:1))%3]);card.parent=cove;card.position.set(-3+k*2.8,0,side>0?-.02:.02)}
  rail('ceiling light',.16,.045,L-1.2,.022,-.2,C-.035,side*(half-.42),M.light);
  // Ceiling rails with mounts and hanging hand straps.
  const rz=side*.4,ry=C-.32;tube('ceiling rail',[new Vector3(-L/2+.6,ry,rz),new Vector3(L/2-1.9,ry,rz)],.017,M.yellow);
  for(let x=-L/2+.9;x<L/2-2;x+=1.8)tube('rail mount',[new Vector3(x,ry,rz),new Vector3(x,C,rz)],.012,M.chrome);
  for(let x=-L/2+1.1;x<L/2-2.2;x+=.6){slab('strap',.02,.16,.03,.008,x,ry-.1,rz,M.darkPlastic);const handle=place(MeshBuilder.CreateTorus('bus strap handle',{diameter:.1,thickness:.018,tessellation:16},scene),x,ry-.22,rz,M.darkPlastic);handle.rotation.x=Math.PI/2}
 }
 slab('ceiling',L,.03,W-.74,.01,0,C+.015,0,M.ceiling);

 // Doors: two glazed leaves with rubber seals, grab poles and a button.
 for(const k of [0,1]){const w=(door.to-door.from)/2,x=door.from+w*(k+.5),h=C-F-.14,y=F+h/2+.02;
  place(windowFrame('bus door frame',scene,w,h,.06,.08,.05),x,y,-half+.02,M.darkPlastic);
  slab('door glass',w-.1,h-.1,.008,.07,x,y,-half+.02,M.glass);slab('door handle',.03,.3,.03,.012,x+(k?-.18:.18),F+1.1,-half+.07,M.chrome)}
 slab('door seal',.04,C-F-.14,.06,.02,(door.from+door.to)/2,(F+C)/2-.05,-half+.02,M.rubber);
 for(const x of [door.from-.12,door.to+.12])tube('door grab pole',[new Vector3(x,F+.25,-half+.14),new Vector3(x,F+.3,-half+.1),new Vector3(x,F+1.85,-half+.1),new Vector3(x,F+1.9,-half+.14)],.017,M.yellow);
 slab('door button panel',.1,.16,.03,.02,door.from-.3,F+1.05,-half+.05,M.darkPlastic);place(MeshBuilder.CreateCylinder('bus door button',{diameter:.05,height:.02,tessellation:16},scene),door.from-.3,F+1.07,-half+.07,M.green).rotation.x=Math.PI/2;

 // Front: dashboard, framed windscreen, visor, mirror, displays and the driver's place.
 slab('dashboard',.75,.55,W-.06,.16,L/2-.42,F+.68,0,M.darkPlastic);
 plane('gauges',.55,.27,L/2-.82,F+1.0,.62,Math.PI/2,mat('gauges',white,{tex:texture('gauges',256,128,gauges,1),glow:new Color3(.35,.35,.35)}));
 place(windowFrame('bus windscreen frame',scene,W,C-F-.95,.07,.16,.06),L/2-.02,(F+.95+C)/2,0,M.darkPlastic).rotation.y=Math.PI/2;
 slab('windscreen',.008,C-F-1.05,W-.12,.004,L/2+.01,(F+.95+C)/2,0,M.glass);
 slab('sun visor',.04,.22,.75,.04,L/2-.14,C-.28,.62,M.darkPlastic).rotation.z=-.35;
 slab('interior mirror',.03,.11,.32,.05,L/2-.2,C-.3,0,M.chrome);
 tube('mirror stem',[new Vector3(L/2-.2,C-.24,0),new Vector3(L/2-.12,C,0)],.01,M.darkPlastic);
 const display=new DynamicTexture('bus next stop display',{width:512,height:72},scene,true),dctx=display.getContext() as unknown as CanvasRenderingContext2D;
 const displayMat=mat('next stop',white,{tex:display,glow:white});
 slab('display housing',.06,.2,1.1,.05,L/2-.35,C-.17,-.2,M.darkPlastic);plane('next stop screen',1.04,.15,L/2-.385,C-.17,-.2,Math.PI/2,displayMat);
 slab('mid display housing',.05,.2,1.1,.05,-.6,C-.2,0,M.darkPlastic);
 for(const [x,ry] of [[-.63,Math.PI/2],[-.57,-Math.PI/2]] as const)plane('next stop screen',1.04,.15,x,C-.2,0,ry,displayMat);
 let shown='';
 function setNextStop(text:string){if(text===shown)return;shown=text;dctx.fillStyle='#0b0b0b';dctx.fillRect(0,0,512,72);dctx.fillStyle='#ffb43a';dctx.font='700 40px system-ui,sans-serif';dctx.textAlign='center';dctx.textBaseline='middle';dctx.fillText(text,256,38,496);display.update()}
 setNextStop('1 · Школа');
 const dx=L/2-1.25;slab('driver cushion',.5,.12,.5,.05,dx,F+.48,.65,M.driverFabric);slab('driver back',.1,.7,.5,.05,dx-.27,F+.9,.65,M.driverFabric).rotation.z=.12;slab('driver headrest',.09,.18,.3,.05,dx-.33,F+1.36,.65,M.driverFabric);
 tube('steering column',[new Vector3(L/2-.5,F+.55,.65),new Vector3(L/2-.68,F+.92,.65)],.03,M.darkPlastic);
 for(const [shape,size] of [['wheel',.46],['hub',.12]] as const){const m=place(shape==='wheel'?MeshBuilder.CreateTorus('bus steering wheel',{diameter:size,thickness:.035,tessellation:32},scene):MeshBuilder.CreateCylinder('bus wheel hub',{diameter:size,height:.05,tessellation:16},scene),L/2-.68,F+.94,.65,M.darkPlastic);m.rotation.z=Math.PI/2-.45}
 slab('cabin partition',.04,.75,1.0,.02,L/2-1.75,F+.4,.72,M.panel);
 place(windowFrame('bus partition frame',scene,1.0,.7,.04,.06,.04),L/2-1.75,F+1.15,.72,M.plastic).rotation.y=Math.PI/2;
 slab('partition glass',.008,.64,.94,.05,L/2-1.75,F+1.15,.72,M.glass);
 slab('validator',.12,.22,.1,.03,door.from-.45,F+1.25,-.36,M.validator);plane('validator screen',.07,.06,door.from-.511,F+1.3,-.36,Math.PI/2,mat('validator screen',new Color3(.1,.15,.2),{glow:new Color3(.1,.2,.3)}));
 slab('validator light',.012,.02,.05,.008,door.from-.512,F+1.2,-.36,M.green);
 tube('validator pole',[new Vector3(door.from-.45,F,-.42),new Vector3(door.from-.45,C-.32,-.42)],.017,M.yellow);

 // Rear wall with a framed window and an exit sign.
 slab('rear lower wall',.06,windowBottom-F,W,.004,-L/2,(F+windowBottom)/2,0,M.panel);slab('rear upper wall',.06,C-windowTop,W,.004,-L/2,(windowTop+C)/2,0,M.panel);
 place(windowFrame('bus rear window frame',scene,W,windowTop-windowBottom,.12,.14,.07),-L/2+.01,(windowBottom+windowTop)/2,0,M.plastic).rotation.y=Math.PI/2;
 slab('rear glass',.008,windowTop-windowBottom-.2,W-.2,.004,-L/2-.02,(windowBottom+windowTop)/2,0,M.glass);
 plane('exit sign',.36,.12,-L/2+.04,windowTop+.12,0,-Math.PI/2,mat('exit sign',white,{tex:texture('exit sign',192,64,(c,w,h)=>{c.fillStyle='#1f8a4c';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font=`700 ${h*.55}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText('ВЫХОД',w/2,h*.54)},1),glow:new Color3(.5,.5,.5)}));

 // Forward-facing double seats with moulded shells, pedestals and grab handles.
 for(let x=2.7;x>-L/2+.4;x-=.9)for(const side of [-1,1]){
  if(side<0&&x>door.from-1)continue;
  const z=side*.78,overArch=axles.some(a=>Math.abs(a-x)<.5);
  slab('seat pan',.46,.05,.88,.02,x,F+.39,z,M.plastic);slab('seat cushion',.46,.1,.84,.045,x+.01,F+.46,z,M.fabric);
  slab('seat back',.08,.52,.84,.035,x-.23,F+.76,z,M.fabric).rotation.z=.08;
  slab('seat shell',.07,.6,.88,.035,x-.285,F+.76,z,M.plastic).rotation.z=.08;
  const zAisle=z-side*.38;tube('seat grab',[new Vector3(x-.31,F+1.02,zAisle-side*.04),new Vector3(x-.31,F+1.1,zAisle-side*.02),new Vector3(x-.31,F+1.1,zAisle+side*.08),new Vector3(x-.31,F+1.02,zAisle+side*.1)],.013,M.chrome);
  if(!overArch){slab('seat pedestal',.06,.34,.06,.025,x,F+.19,z-side*.3,M.darkPlastic);slab('seat foot',.2,.02,.08,.01,x,F+.01,z-side*.3,M.darkPlastic);slab('wall bracket',.24,.06,.1,.02,x,F+.36,side*(half-.06),M.darkPlastic)}
  if(Math.round(x*10)%18===0){
   const px=x-.33,pz=side*.4;tube('vertical pole',[new Vector3(px,F,pz),new Vector3(px,C-.32,pz)],.017,M.yellow);
   place(MeshBuilder.CreateSphere('bus pole joint',{diameter:.05,segments:8},scene),px,C-.32,pz,M.yellow);
   slab('stop button housing',.06,.11,.05,.02,px,F+1.25,pz-side*.035,M.darkPlastic);place(MeshBuilder.CreateCylinder('bus stop button',{diameter:.036,height:.015,tessellation:16},scene),px,F+1.26,pz-side*.06,M.red).rotation.x=Math.PI/2;
  }
 }

 // Exterior shell seen when looking out: painted body, white band, roof, wheels and mirrors.
 for(const side of [-1,1]){
  const z=side*(half+.045),segments=side<0?[[-L/2-.1,door.from],[door.to,L/2+.1]]:[[-L/2-.1,L/2+.1]];
  for(const [from,to] of segments){const len=to-from,cx=(from+to)/2;
   slab('body side',len,windowBottom-.42,.03,.01,cx,(.28+windowBottom-.14)/2,z,M.paint,exterior);slab('body band',len,.12,.035,.01,cx,windowBottom-.08,z,M.band,exterior);slab('body upper',len,C+.12-windowTop,.03,.01,cx,(windowTop+C+.12)/2,z,M.paint,exterior)}
  for(const x of axles){for(const [d,m,h] of [[.86,M.tyre,.28],[.46,M.chrome,.29]] as const){const t=place(MeshBuilder.CreateCylinder('bus wheel',{diameter:d,height:h,tessellation:28},scene),x,.43,side*(half-.04),m,exterior);t.rotation.x=Math.PI/2}}
  tube('mirror arm',[new Vector3(L/2+.02,2.25,side*(half+.02)),new Vector3(L/2+.25,2.3,side*(half+.2)),new Vector3(L/2+.3,2.15,side*(half+.3))],.025,M.darkPlastic,exterior);
  slab('side mirror',.06,.36,.2,.06,L/2+.3,1.95,side*(half+.3),M.darkPlastic,exterior);
 }
 slab('roof',L+.2,.12,W+.1,.05,0,C+.12,0,M.band,exterior);
 slab('front body',.06,F+.95-.25,W+.1,.03,L/2+.06,(.25+F+.95)/2,0,M.paint,exterior);slab('rear body',.06,windowBottom-.25,W+.1,.03,-L/2-.06,(.25+windowBottom)/2,0,M.paint,exterior);

 // Eye height of a seated child in the window seat.
 const head=new TransformNode('bus passenger head',scene);head.parent=root;head.position.set(busInterior.seat.x+.05,F+1.2,busInterior.seat.z);head.rotation.y=Math.PI/2;
 return {root,head,interior,exterior,setNextStop,forward:()=>Vector3.TransformNormal(Vector3.Right(),root.getWorldMatrix()).normalize()};
}
