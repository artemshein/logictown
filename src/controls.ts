export function createMovementControls(host:HTMLElement){
 const pad=document.createElement('div');pad.className='movement-pad';pad.setAttribute('role','group');pad.setAttribute('aria-label','Управление Леей');
 pad.innerHTML='<button data-move="forward" aria-label="Идти вперёд">↑</button><button data-move="left" aria-label="Повернуть налево">↶</button><button data-move="back" aria-label="Идти назад">↓</button><button data-move="right" aria-label="Повернуть направо">↷</button>';host.append(pad);
 type Action='forward'|'back'|'left'|'right';const pointers=new Map<number,Action>(),keys=new Set<Action>(),taps=new Map<Action,number>();
 const mapping:Record<string,Action>={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 let enabled=true;
 const clear=()=>{pointers.clear();keys.clear();taps.clear()};
 for(const b of Array.from(pad.querySelectorAll<HTMLButtonElement>('button'))){
  const action=b.dataset.move as Action;
  b.onpointerdown=e=>{if(!enabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,action)};
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>{pointers.delete(e.pointerId)};
  b.onclick=e=>{if(enabled&&e.detail===0)taps.set(action,performance.now()+200)};
  b.oncontextmenu=e=>e.preventDefault();
 }
 const down=(e:KeyboardEvent)=>{if(!enabled||!mapping[e.code])return;e.preventDefault();keys.add(mapping[e.code])};
 const up=(e:KeyboardEvent)=>{if(mapping[e.code])keys.delete(mapping[e.code])};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 return {read:(active:boolean)=>{enabled=active;pad.hidden=!active;if(!active)clear();const held=(a:Action)=>keys.has(a)||[...pointers.values()].includes(a)||(taps.get(a)||0)>performance.now();for(const b of Array.from(pad.querySelectorAll<HTMLButtonElement>('button')))b.classList.toggle('held',held(b.dataset.move as Action));return {forward:Number(held('forward'))-Number(held('back')),turn:Number(held('right'))-Number(held('left'))}},clear,dispose:()=>{clear();pad.remove();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)}};
}

