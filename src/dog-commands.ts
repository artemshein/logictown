import type {loadDog} from './dog';
export function installDogCommands(host:HTMLElement,dog:Awaited<ReturnType<typeof loadDog>>){
 const panel=document.createElement('section');panel.className='dog-commands';panel.hidden=true;panel.setAttribute('aria-label','Команды собаке');
 panel.innerHTML='<div><strong>Щенок</strong><button type="button" class="dog-command-close" aria-label="Закрыть команды собаке">×</button></div><button type="button" class="dog-command-action"></button>';
 const action=panel.querySelector<HTMLButtonElement>('.dog-command-action')!,close=panel.querySelector<HTMLButtonElement>('.dog-command-close')!;
 const sync=()=>{const text=dog.sitting?'За мной':'Сидеть';if(action.textContent!==text)action.textContent=text};
 const hide=()=>{panel.hidden=true};
 const key=(e:KeyboardEvent)=>{if(e.code==='Escape')hide()};
 dog.setInteraction(()=>{panel.hidden=false;sync()});
 action.onclick=()=>{dog.command(dog.sitting?'follow':'sit');sync()};close.onclick=hide;
 host.append(panel);window.addEventListener('keydown',key);
 return {update(active=true){if(!active)hide();else if(!panel.hidden)sync()},dispose(){dog.setInteraction(()=>{});window.removeEventListener('keydown',key);panel.remove()}};
}
