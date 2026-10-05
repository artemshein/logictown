export function createSwingControls(host:HTMLElement){
 const panel=document.createElement('section');panel.className='swing-game';panel.hidden=true;
 panel.setAttribute('aria-label','Мини-игра на качелях');
 panel.innerHTML='<strong>Раскачай качели</strong><p>Наклоняйся по ходу движения. Меняй наклон в верхней точке.</p><div class="swing-progress"><progress max="0.6" value="0" aria-label="Размах качелей"></progress><span>Цель: 34°</span></div><div class="swing-hint" role="status" aria-live="polite"></div><div class="swing-lean"><button type="button" data-lean="1">Вперёд <small>W / ↑</small></button><button type="button" data-lean="-1">Назад <small>S / ↓</small></button></div><small>Удерживай кнопку для наклона · Esc — закончить</small>';
 host.append(panel);
 const buttons=Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-lean]')),hint=panel.querySelector<HTMLElement>('.swing-hint')!,progress=panel.querySelector<HTMLProgressElement>('progress')!;
 const pointers=new Map<number,number>(),keys=new Set<string>();let enabled=false;
 const mapping:Record<string,number>={KeyW:1,ArrowUp:1,KeyS:-1,ArrowDown:-1};
 const clear=()=>{pointers.clear();keys.clear()};
 for(const button of buttons){
  button.onpointerdown=e=>{if(!enabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,Number(button.dataset.lean))};
  button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>{pointers.delete(e.pointerId)};
  button.oncontextmenu=e=>e.preventDefault();
 }
 const down=(e:KeyboardEvent)=>{if(enabled&&mapping[e.code]){e.preventDefault();keys.add(e.code)}};
 const up=(e:KeyboardEvent)=>keys.delete(e.code);
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 return {
  read(){return Math.sign([...pointers.values(),...[...keys].map(k=>mapping[k])].reduce((sum,v)=>sum+v,0))},
  show(active:boolean){enabled=active;panel.hidden=!active;if(!active)clear()},
  update(amplitude:number,direction:number,feedback:string,won:boolean){
   progress.value=amplitude;
   const text=(won?'Получилось! ':'')+(direction>0?'Наклоняйся вперёд':'Наклоняйся назад')+(feedback==='wrong'?' · Теряем скорость':feedback==='correct'?' · Набираем размах':'');
   if(hint.textContent!==text)hint.textContent=text;panel.dataset.feedback=feedback;
   const lean=this.read();for(const button of buttons){button.classList.toggle('suggested',Number(button.dataset.lean)===direction);button.classList.toggle('held',Number(button.dataset.lean)===lean)}
  },
  dispose(){clear();panel.remove();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)}
 };
}
