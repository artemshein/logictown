export function createMovementControls(host:HTMLElement){
 const pad=document.createElement('div');pad.className='movement-pad';pad.setAttribute('role','group');pad.setAttribute('aria-label','Управление Леей');
 pad.innerHTML='<svg viewBox="0 0 220 112" aria-hidden="true"><path d="M6 110 A104 104 0 0 1 214 110 Z"/><text x="29" y="98">↶</text><text x="110" y="32">↑</text><text x="191" y="98">↷</text><circle class="movement-thumb" cx="110" cy="110" r="13"/></svg>';host.append(pad);
 type Action='forward'|'back'|'left'|'right';type Input={forward:number,turn:number};const pointers=new Map<number,Input>(),keys=new Set<Action>();
 const thumb=pad.querySelector<SVGCircleElement>('.movement-thumb')!;
 const mapping:Record<string,Action>={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 let enabled=true;
 const clear=()=>{pointers.clear();keys.clear();thumb.style.visibility='hidden'};
 const updatePointer=(e:PointerEvent)=>{const bounds=pad.getBoundingClientRect(),x=(e.clientX-bounds.left)/bounds.width*220-110,y=110-(e.clientY-bounds.top)/bounds.height*112;pointers.set(e.pointerId,semicircleInput(x,y))};
 pad.onpointerdown=e=>{if(!enabled)return;e.preventDefault();pad.setPointerCapture(e.pointerId);updatePointer(e)};
 pad.onpointermove=e=>{if(pointers.has(e.pointerId))updatePointer(e)};
 pad.onpointerup=pad.onpointercancel=pad.onlostpointercapture=e=>{pointers.delete(e.pointerId)};
 pad.oncontextmenu=e=>e.preventDefault();
 const down=(e:KeyboardEvent)=>{if(!enabled||!mapping[e.code])return;e.preventDefault();keys.add(mapping[e.code])};
 const up=(e:KeyboardEvent)=>{if(mapping[e.code])keys.delete(mapping[e.code])};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 return {read:(active:boolean)=>{enabled=active;pad.hidden=!active;if(!active)clear();const inputs=[...pointers.values()];const held=(a:Action)=>keys.has(a);const forward=Math.max(Number(held('forward')),...inputs.map(v=>v.forward))-Number(held('back')),turn=Math.max(Number(held('right')),...inputs.map(v=>Math.max(0,v.turn)))-Math.max(Number(held('left')),...inputs.map(v=>Math.max(0,-v.turn)));const pointer=inputs.at(-1);thumb.style.visibility=pointer?'visible':'hidden';if(pointer){thumb.setAttribute('cx',String(110+pointer.turn*78));thumb.setAttribute('cy',String(110-pointer.forward*78))}return {forward,turn}},clear,dispose:()=>{clear();pad.remove();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)}};
}

// The angle continuously blends forward motion and turning across the semicircle.
export function semicircleInput(x:number,y:number){
 if(Math.hypot(x,Math.max(0,y))<8)return {forward:0,turn:0};
 const angle=Math.atan2(Math.max(0,y),x);
 return {forward:Math.sin(angle),turn:Math.cos(angle)};
}
