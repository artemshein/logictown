import {Color3,DynamicTexture,LoadAssetContainerAsync,Mesh,MeshBuilder,StandardMaterial,Texture,TransformNode,type Scene,type ShadowGenerator} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
export const storeExit={x:0,z:-4.1};
export const storeFixtures=[{x:3,z:.8,w:4.4,d:.8,h:2.25},{x:3,z:4.45,w:5.3,d:.75,h:2.75},{x:-2.8,z:4.45,w:3.2,d:.75,h:2.45},{x:-5.45,z:1.05,w:.8,d:3.2,h:2.45},{x:-3.7,z:-2.25,w:3.7,d:1.25,h:1.15},{x:5.35,z:-2.6,w:1,d:1.15,h:2.6},{x:-4.6,z:-4.05,w:1.3,d:1.3,h:.9}];
export function storeBlocked(x:number,z:number){return Math.abs(x)>5.7||Math.abs(z)>4.65||storeFixtures.some(o=>Math.abs(x-o.x)<o.w/2+.28&&Math.abs(z-o.z)<o.d/2+.28)}
export function storePath(from:{x:number;z:number},to:{x:number;z:number}){
 const step=.25,nx=47,nz=39,point=(id:number)=>({x:-5.75+(id%nx)*step,z:-4.75+Math.floor(id/nx)*step});
 const free=Array.from({length:nx*nz},(_,id)=>{const p=point(id);return !storeBlocked(p.x,p.z)});
 const nearest=(p:{x:number;z:number})=>{let best=0,d=Infinity;for(let id=0;id<free.length;id++)if(free[id]){const q=point(id),dist=(q.x-p.x)**2+(q.z-p.z)**2;if(dist<d){d=dist;best=id}}return best};
 const start=nearest(from),end=nearest(to),queue=[start],prev=new Int32Array(free.length).fill(-2);prev[start]=-1;
 for(let k=0;k<queue.length&&prev[end]===-2;k++){const id=queue[k],x=id%nx,z=Math.floor(id/nx);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,i=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!free[i]||prev[i]!==-2)continue;prev[i]=id;queue.push(i)}}
 if(prev[end]===-2)return [];
 const path=[];for(let id=end;id!==start;id=prev[id])path.push(point(id));return path.reverse();
}
export async function buildStore(scene:Scene,shadow:ShadowGenerator){
 const solids:Mesh[]=[],goods:Mesh[]=[];
 function mat(name:string,hex:string,asset?:string){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(.04,.04,.04);if(asset){m.diffuseTexture=new Texture(`/assets/polyhaven/${asset}/color.jpg`,scene);m.bumpTexture=new Texture(`/assets/polyhaven/${asset}/normal.jpg`,scene);m.bumpTexture.level=.25}return m}
 const oak=mat('shop honey oak','#dfb078','wood_table'),floorMat=mat('shop oak planks','#e5c6a3','wooden_floor_01'),plaster=mat('shop ivory plaster','#fff4df','white_plaster_02'),white=mat('counter sage cream','#d5dccc'),black=mat('cash register charcoal','#303638'),metal=mat('shelf brackets','#716e60');
 oak.diffuseColor=Color3.White();oak.diffuseTexture!.level=1.9;
 floorMat.diffuseColor=Color3.White();plaster.diffuseTexture!.level=1.65;
 const ceilingPaint=mat('warm white ceiling','#fff4de');
 (floorMat.diffuseTexture as Texture).uScale=4;(floorMat.diffuseTexture as Texture).vScale=4;
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial,product=false){const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;mesh.receiveShadows=true;mesh.isPickable=false;(product?goods:solids).push(mesh);return mesh}
 function cylinder(name:string,x:number,y:number,z:number,r:number,h:number,m:StandardMaterial,product=false){const mesh=MeshBuilder.CreateCylinder(name,{diameter:r,height:h,tessellation:12},scene);mesh.position.set(x,y,z);mesh.material=m;mesh.isPickable=false;(product?goods:solids).push(mesh);return mesh}
 const floor=MeshBuilder.CreateGround('store walkable wooden floor',{width:12,height:10},scene);floor.material=floorMat;floor.receiveShadows=true;
 box('rear plaster wall',0,1.9,5,12,3.8,.16,plaster);box('left plaster wall',-6,1.9,0,.16,3.8,10,plaster);box('right plaster wall',6,1.9,0,.16,3.8,10,plaster);
 for(const x of [-3.6,3.6])box('front wall beside entrance',x,1.9,-5,4.8,3.8,.16,plaster);
 box('ceiling',0,3.87,0,12,.14,10,ceilingPaint);box('door lintel',0,3.3,-5,2.4,1,.18,oak);
 for(const x of [-1.25,1.25])box('entrance oak jamb',x,1.45,-4.9,.12,2.9,.24,oak);
 const glass=mat('entrance daylight','#b1c9bc');glass.emissiveColor=new Color3(.12,.16,.13);
 box('glass entrance door',0,1.4,-5,2.35,2.8,.05,glass);for(const x of [-1.1,0,1.1])box('door painted frame',x,1.4,-4.94,.07,2.8,.09,white);box('door handle',.17,1.35,-4.8,.035,.38,.035,metal);
 const view=mat('window mountain view','#ffffff');view.diffuseTexture=new Texture('/assets/outdoor/mountain-landscape.jpg',scene);view.emissiveColor=new Color3(.35,.35,.35);(view.diffuseTexture as Texture).uScale=.13;(view.diffuseTexture as Texture).uOffset=.15;(view.diffuseTexture as Texture).vScale=.18;(view.diffuseTexture as Texture).vOffset=.3;
 box('rear daylight window',-2.8,3.05,4.9,3.2,1,.03,view);for(const x of [-4.45,-3.35,-2.25,-1.15])box('window oak mullion',x,3.05,4.85,.08,1.12,.08,oak);for(const y of [2.52,3.58])box('window oak sill',-2.8,y,4.82,3.4,.1,.16,oak);
 for(const x of [-5.9,5.9])box('oak wall skirting',x,.12,0,.08,.24,10,oak);box('rear skirting',0,.12,4.9,12,.24,.08,oak);
 const glow=mat('warm ceiling lamp','#fff9db');glow.emissiveColor=new Color3(1,.94,.76);
 for(const x of [-3.6,0,3.6])for(const z of [-3,0,3]){cylinder('ceiling light bezel',x,3.75,z,.42,.09,metal);cylinder('ceiling light diffuser',x,3.69,z,.34,.035,glow)}
 for(const x of [-5.85,-.8,5.85])box('exposed timber support',x,1.9,4.82,.17,3.8,.2,oak);
 const labels=['МЁД','ВАРЕНЬЕ','ЧАЙ','КОФЕ','МОЛОКО','МУКА','КРУПА','СОК'],colours=['#d3a449','#9b4c52','#719264','#604a35','#789bab','#d2b78b','#be9853','#c17641'];
 const packets=labels.map((label,i)=>{const m=mat('product '+label,colours[i]),t=new DynamicTexture('packaging '+label,{width:128,height:128},scene,false),c=t.getContext() as unknown as CanvasRenderingContext2D;c.fillStyle=colours[i];c.fillRect(0,0,128,128);c.fillStyle='#fff2d6';c.fillRect(6,22,116,70);c.fillStyle=colours[i];c.font='bold 20px sans-serif';c.textAlign='center';c.fillText(label,64,51);c.font='13px sans-serif';c.fillText('Тихий город',64,76);c.fillStyle='#fff2d6';c.fillRect(12,103,104,3);t.update();m.diffuseTexture=t;m.diffuseColor=Color3.White();return m});
 const lid=mat('jar metal lids','#c6b695'),cream=mat('price paper','#fff6df');
 const priceTexture=new DynamicTexture('shelf price tickets',{width:256,height:64},scene,false);priceTexture.drawText('89 ₽  ·  120 ₽  ·  65 ₽',null,43,'bold 23px sans-serif','#423624','#fff6df',true);cream.diffuseTexture=priceTexture;
 function shelf(x:number,z:number,w:number,h:number,angle=0){
  const root=new TransformNode('stocked wooden shelving',scene),start=solids.length,startGoods=goods.length;
  box('shelf oak backing',0,h/2,.3,w,h,.07,oak);for(const side of [-1,1])box('shelf solid oak upright',side*(w/2-.06),h/2,0,.12,h,.75,oak);
  for(let row=0;row<5;row++){const y=.15+row*(h-.4)/4;box('solid wooden shelf',0,y,0,w,.08,.75,oak);box('price strip',0,y-.015,-.39,w-.2,.09,.015,cream);
   // Keep the top display shelf free so pots do not intersect the stock.
   if(row===4)continue;
   for(let col=0;col<Math.floor((w-.25)/.24);col++)for(let depth=0;depth<2;depth++){const i=(col+row*3+depth)%packets.length,xx=-w/2+.22+col*.24,zz=-.19+depth*.25,hh=.19+(i%3)*.055;if(i<4){cylinder('preserves and honey jar',xx,y+.04+hh/2,zz,.18,hh,packets[i],true);cylinder('jar screw lid',xx,y+.05+hh,zz,.19,.035,lid,true)}else box('grocery carton',xx,y+.04+hh/2,zz,.19,hh,.19,packets[i],true)}
  }
  [...solids.slice(start),...goods.slice(startGoods)].forEach(m=>m.parent=root);root.position.set(x,0,z);root.rotation.y=angle;root.computeWorldMatrix(true);
 }
 for(const [i,f] of storeFixtures.slice(0,4).entries())shelf(f.x,f.z,i===3?f.d:f.w,f.h,i===3?-Math.PI/2:0);
 box('checkout cabinet',-3.7,.53,-2.25,3.5,1.06,1.1,white);box('checkout oak worktop',-3.7,1.11,-2.25,3.7,.12,1.25,oak);box('checkout kickboard',-3.7,.1,-2.83,3.45,.18,.07,oak);box('register drawer',-3.9,1.24,-2.25,.55,.14,.4,black);
 box('cash register display',-3.9,1.53,-2.3,.48,.32,.045,black);const screen=mat('checkout screen','#b2d7be');screen.emissiveColor=new Color3(.2,.3,.2);box('checkout display face',-3.9,1.53,-2.27,.4,.25,.01,screen);cylinder('checkout monitor support',-3.9,1.36,-2.3,.08,.2,black);box('paper shopping bags',-2.6,1.33,-2.25,.45,.32,.25,packets[5]);
 const notice=mat('checkout blackboard','#243d34');box('chalkboard on counter',-3.6,.67,-2.82,1.35,.66,.02,notice);const chalk=new DynamicTexture('welcome chalk lettering',{width:512,height:256},scene,false);chalk.drawText('Добро пожаловать!',null,94,'32px sans-serif','#fff8d8','#243d34',true);chalk.drawText('Свежие продукты каждый день',null,153,'23px sans-serif','#fff8d8',null,true);notice.diffuseTexture=chalk;
 const fridge=storeFixtures[5];
 const fridgeRoot=new TransformNode('refrigerator facing open aisle',scene),fridgeSolidStart=solids.length,fridgeGoodsStart=goods.length;
 const width=fridge.d,depth=fridge.w;
 // Hollow cabinet: shelves and bottles sit inside its side walls and back.
 for(const side of [-1,1])box('refrigerator side',side*(width/2-.035),fridge.h/2,0,.07,fridge.h,depth,metal);
 box('refrigerator back',0,fridge.h/2,depth/2-.035,width-.14,fridge.h,.07,black);
 for(const y of [.045,fridge.h-.045])box('refrigerator cap',0,y,0,width,.09,depth,metal);
 for(let row=0;row<4;row++){const y=.35+row*.53;box('fridge metal shelf',0,y,0,width-.14,.04,.82,white);for(let i=0;i<4;i++)cylinder('cold juice bottles',-.35+i*.23,y+.17,-.23,.13,.3,packets[i%2?7:4],true)}
 [...solids.slice(fridgeSolidStart),...goods.slice(fridgeGoodsStart)].forEach(m=>m.parent=fridgeRoot);
 fridgeRoot.position.set(fridge.x,0,fridge.z);fridgeRoot.rotation.y=Math.PI/2;fridgeRoot.computeWorldMatrix(true);
 cylinder('round oak tasting table',-4.6,.82,-4.05,1.3,.09,oak);cylinder('table pedestal',-4.6,.4,-4.05,.16,.78,metal);
 const leaf=mat('fern leaves','#4f7940'),pot=mat('fern terracotta','#b77850');
 cylinder('large fern pot',1.65,2.165,.8,.38,.25,pot);
 for(let i=0;i<28;i++){const angle=i*2.399,r=.15+(i%5)*.09,m=MeshBuilder.CreateSphere('arching fern frond',{diameter:1,segments:8},scene);m.position.set(1.65+Math.cos(angle)*r,2.565-(i%5)*.07,.8+Math.sin(angle)*r);m.scaling.set(.55,.035,.14);m.rotation.set(.12,angle,Math.cos(angle)*.38);m.material=leaf;m.isPickable=false;solids.push(m)}
 const plant=await LoadAssetContainerAsync('/assets/polyhaven/potted_plant_01.glb',scene);
 for(const [x,y,z,size] of [[4.4,2.04,.8,.75],[-2.3,2.24,4.45,.85],[4.7,2.54,4.45,.65],[-5,1.18,-2.25,.55]]){const instance=plant.instantiateModelsToScene(n=>'shop plant '+n,false),root=new TransformNode('shop greenery',scene);instance.rootNodes.forEach(n=>n.parent=root);root.computeWorldMatrix(true);const {min,max}=root.getHierarchyBoundingVectors(true),scale=size/(max.y-min.y);root.scaling.setAll(scale);root.position.set(x-(min.x+max.x)*.5*scale,y-min.y*scale,z-(min.z+max.z)*.5*scale);root.getChildMeshes().forEach(m=>{m.isPickable=false;m.receiveShadows=true;shadow.addShadowCaster(m)})}
 // Bake small packages together while preserving their different labels.
 for(const m of [...solids,...goods])m.computeWorldMatrix(true);
 const mergedGoods=Mesh.MergeMeshes(goods,true,true,undefined,false,true);if(mergedGoods)mergedGoods.isPickable=false;
 const mergedSolids=Mesh.MergeMeshes(solids,true,true,undefined,false,true);if(mergedSolids){mergedSolids.receiveShadows=true;mergedSolids.isPickable=false;shadow.addShadowCaster(mergedSolids)}
 return {floor};
}
