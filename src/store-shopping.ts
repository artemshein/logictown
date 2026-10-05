export const shopProducts=[
 {id:'honey',name:'Мёд',take:'Взять мёд',price:89},
 {id:'jam',name:'Варенье',take:'Взять варенье',price:120},
 {id:'tea',name:'Чай',take:'Взять чай',price:65},
 {id:'coffee',name:'Кофе',take:'Взять кофе',price:149},
 {id:'milk',name:'Молоко',take:'Взять молоко',price:99},
 {id:'flour',name:'Мука',take:'Взять муку',price:79},
 {id:'grain',name:'Крупа',take:'Взять крупу',price:110},
 {id:'juice',name:'Сок',take:'Взять сок',price:59},
 {id:'bar',name:'Батончик',take:'Взять батончик',price:89},
] as const;
export type ProductId=typeof shopProducts[number]['id'];
export type Basket=Partial<Record<ProductId,number>>;
export function basketLines(basket:Basket){return shopProducts.filter(p=>(basket[p.id]??0)>0).map(p=>({...p,quantity:basket[p.id]!,amount:p.price*basket[p.id]!}));}
export function basketTotal(basket:Basket){return basketLines(basket).reduce((sum,p)=>sum+p.amount,0);}
export function correctPayment(basket:Basket,answer:string){const text=answer.trim();return basketLines(basket).length>0&&/^\d+(?:[.,]0{1,2})?$/.test(text)&&Number(text.replace(',','.'))===basketTotal(basket);}

type Point={x:number;z:number};
type Fixture=Point&{w:number;d:number};
export function shoppingZone(point:Point,fixtures:Fixture[],cashier:Point){
 const counter=fixtures[4],front=counter.z-counter.d/2;
 if(Math.abs(point.x-cashier.x)<1.5&&point.z<front-.1&&point.z>front-1.5)return 'checkout';
 const fridge=fixtures[5];
 if(point.x<fridge.x-fridge.w/2-.1&&point.x>fridge.x-fridge.w/2-1.5&&Math.abs(point.z-fridge.z)<fridge.d/2+.5)return 'fridge';
 for(let i=0;i<4;i++){
  const f=fixtures[i];
  const near=i===3?point.x>f.x+f.w/2+.1&&point.x<f.x+f.w/2+1.5&&Math.abs(point.z-f.z)<f.d/2+.2:point.z<f.z-f.d/2-.1&&point.z>f.z-f.d/2-1.5&&Math.abs(point.x-f.x)<f.w/2+.2;
  if(near)return i===0||i===2?'shelf-bars':'shelf';
 }
 return null;
}

export function installShopping(host:HTMLElement,onModal:(open:boolean)=>void){
 const basket:Basket={};let zone:ReturnType<typeof shoppingZone>=null,modal=false,paid=false;
 const hud=document.createElement('section');hud.className='shopping-hud';
 hud.innerHTML='<details class="shopping-basket"><summary>Корзина: <span>0</span></summary><ul></ul></details><section class="shopping-actions" hidden aria-label="Выбор продуктов"><strong></strong><div></div></section><button class="shopping-buy" hidden>Купить продукты</button><p class="shopping-message" role="status" hidden></p><div class="shopping-overlay" hidden><section class="shopping-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title"><button class="shopping-close" aria-label="Закрыть чек">×</button><h2 id="receipt-title">Чек</h2><div class="receipt-lines"></div><form><label for="receipt-total">Общая стоимость, ₽</label><input id="receipt-total" name="total" inputmode="decimal" autocomplete="off" required placeholder="Впиши сумму"><button class="shopping-pay" type="submit">Заплатить</button></form><p class="receipt-feedback" role="status"></p></section></div>';
 host.append(hud);
 const actions=hud.querySelector<HTMLElement>('.shopping-actions')!,choices=actions.querySelector('div')!,buy=hud.querySelector<HTMLButtonElement>('.shopping-buy')!,overlay=hud.querySelector<HTMLElement>('.shopping-overlay')!,form=hud.querySelector<HTMLFormElement>('form')!,input=hud.querySelector<HTMLInputElement>('input')!,feedback=hud.querySelector<HTMLElement>('.receipt-feedback')!,message=hud.querySelector<HTMLElement>('.shopping-message')!;
 form.noValidate=true;
 let messageTimer:ReturnType<typeof setTimeout>|undefined,previousFocus:HTMLElement|null=null;
 function notice(text:string){message.textContent=text;message.hidden=false;clearTimeout(messageTimer);messageTimer=setTimeout(()=>message.hidden=true,5000);}
 function refreshBasket(){
  const lines=basketLines(basket);hud.querySelector('.shopping-basket span')!.textContent=String(lines.reduce((sum,p)=>sum+p.quantity,0));
  const list=hud.querySelector('ul')!;list.replaceChildren();
  for(const p of lines){const li=document.createElement('li');li.textContent=p.name+' × '+p.quantity;list.append(li);}
  if(!lines.length){const li=document.createElement('li');li.textContent='Пока пусто';list.append(li);}
  for(const button of Array.from(choices.querySelectorAll<HTMLButtonElement>('button'))){const id=button.dataset.product as ProductId;button.querySelector('small')!.textContent='В корзине: '+(basket[id]??0);}
 }
 function close(){modal=false;overlay.hidden=true;onModal(false);previousFocus?.focus();}
 function open(){
  if(zone!=='checkout'||modal)return;
  const lines=basketLines(basket);if(!lines.length){notice('Выбирайте на полках то, что вы хотите купить');return;}
  previousFocus=document.activeElement as HTMLElement;paid=false;modal=true;onModal(true);overlay.hidden=false;message.hidden=true;feedback.textContent='';feedback.dataset.result='';input.value='';form.hidden=false;
  const table=document.createElement('table');table.innerHTML='<thead><tr><th>Продукт</th><th>Кол-во</th><th>Цена</th><th>Стоимость</th></tr></thead>';const body=document.createElement('tbody');
  for(const p of lines){const tr=document.createElement('tr');for(const text of [p.name,String(p.quantity),p.price+' ₽',p.amount+' ₽']){const td=document.createElement('td');td.textContent=text;tr.append(td);}body.append(tr);}
  table.append(body);hud.querySelector('.receipt-lines')!.replaceChildren(table);input.focus();
 }
 buy.onclick=open;hud.querySelector<HTMLButtonElement>('.shopping-close')!.onclick=close;
 form.onsubmit=event=>{
  event.preventDefault();if(paid)return;
  if(!correctPayment(basket,input.value)){feedback.textContent='Ошибка, попробуй ещё раз';feedback.dataset.result='wrong';input.select();return;}
  paid=true;feedback.textContent='Молодец!';feedback.dataset.result='success';form.hidden=true;
  for(const id of Object.keys(basket))delete basket[id as ProductId];refreshBasket();
 };
 const keydown=(event:KeyboardEvent)=>{if(!modal)return;if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const focusable=Array.from(overlay.querySelectorAll<HTMLElement>('button,input')).filter(e=>e.offsetParent!==null);const index=focusable.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&index<=0){event.preventDefault();focusable.at(-1)?.focus();}else if(!event.shiftKey&&index===focusable.length-1){event.preventDefault();focusable[0]?.focus();}}};document.addEventListener('keydown',keydown);
 refreshBasket();
 return {get isOpen(){return modal;},update(next:ReturnType<typeof shoppingZone>){
  if(next===zone)return;zone=next;actions.hidden=!next||next==='checkout';buy.hidden=next!=='checkout';choices.replaceChildren();
  if(!next||next==='checkout')return;
  actions.querySelector('strong')!.textContent=next==='fridge'?'Холодильник':'Выбрать продукты';
  const available=shopProducts.filter(p=>next==='fridge'?p.id==='juice':p.id!=='bar'||next==='shelf-bars');
  for(const p of available){const button=document.createElement('button');button.type='button';button.dataset.product=p.id;button.innerHTML='<span></span><b></b><small></small>';button.querySelector('span')!.textContent=p.take;button.querySelector('b')!.textContent=p.price+' ₽';button.onclick=()=>{if(modal||zone!==next)return;basket[p.id]=(basket[p.id]??0)+1;refreshBasket();};choices.append(button);}
  refreshBasket();
 },dispose(){clearTimeout(messageTimer);document.removeEventListener('keydown',keydown);hud.remove();}};
}
