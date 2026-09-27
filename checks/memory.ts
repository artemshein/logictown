// Development-only UI harness. Not a production build entry; separate save slot.
import '../src/style.css';
import {createMemoryQuest} from '../src/memory';
const overlay=document.querySelector<HTMLElement>('.overlay')!,modal=document.querySelector<HTMLElement>('.modal')!,controls=document.querySelector<HTMLElement>('#check-controls')!;
controls.style.cssText='padding:20px;display:flex;flex-wrap:wrap;gap:12px';
const quest=createMemoryQuest({modal:html=>{modal.innerHTML='<button class="close" aria-label="Закрыть">×</button>'+html;overlay.hidden=false;modal.querySelector<HTMLButtonElement>('.close')!.onclick=()=>overlay.hidden=true},close:()=>overlay.hidden=true,celebrate:()=>{},changed:()=>{},exit:()=>{controls.dataset.exited='true';controls.insertAdjacentHTML('beforeend','<p>Выход открыт</p>')}},'logictown-memory-check-v1');
for(const [name,action] of Object.entries({Записка:quest.intro,Весы:quest.kitchen,Вода:quest.bathroom,Зеркало:quest.toilet,Альбом:quest.living,Тени:quest.bedroom,Шкафчик:quest.cabinet,Дверь:quest.door,Фото1:()=>quest.fragment(0),Фото2:()=>quest.fragment(1),Фото3:()=>quest.fragment(2)})){const b=document.createElement('button');b.textContent=name;b.onclick=action;controls.append(b)}
