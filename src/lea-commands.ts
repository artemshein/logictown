type LeaWithHat={hat:{on:boolean;removable:boolean;set(on:boolean):void};setInteraction(handler:()=>void):void};
/** Tapping Lea opens her own small panel, styled like the puppy's: take the beanie off or put it on. */
export function installLeaCommands(host:HTMLElement,lea:LeaWithHat){
 const panel=document.createElement('section');panel.className='dog-commands lea-commands';panel.hidden=true;panel.setAttribute('aria-label','Действия Леи');
 panel.innerHTML='<div><strong>Лея</strong><button type="button" class="dog-command-close" aria-label="Закрыть действия Леи">×</button></div><button type="button" class="dog-command-action"></button>';
 const action=panel.querySelector<HTMLButtonElement>('.dog-command-action')!,close=panel.querySelector<HTMLButtonElement>('.dog-command-close')!;
 const sync=()=>{action.textContent=lea.hat.on?'Снять шапку':'Надеть шапку'};
 const hide=()=>{panel.hidden=true};
 const key=(e:KeyboardEvent)=>{if(e.code==='Escape')hide()};
 lea.setInteraction(()=>{if(!lea.hat.removable)return;panel.hidden=false;sync()});
 action.onclick=()=>{lea.hat.set(!lea.hat.on);sync()};close.onclick=hide;
 host.append(panel);window.addEventListener('keydown',key);
 return {update(active=true){if(!active)hide()},dispose(){lea.setInteraction(()=>{});window.removeEventListener('keydown',key);panel.remove()}};
}
