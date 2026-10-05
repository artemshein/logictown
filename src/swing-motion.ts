/** Pendulum energy grows only when the rider leans with the motion. */
export function createSwingMotion(){
 const gravity=5,maxAngle=.78,maxEnergy=gravity*(1-Math.cos(maxAngle));
 let active=false,angle=0,velocity=0,lastLean=0,won=false,goalTime=0;
 const energy=()=>velocity*velocity/2+gravity*(1-Math.cos(angle));
 const amplitude=()=>Math.acos(1-Math.min(maxEnergy,energy())/gravity);
 const direction=()=>Math.abs(velocity)>.015?Math.sign(velocity):angle?-Math.sign(angle):1;
 return {
  get active(){return active},get angle(){return angle},get amplitude(){return amplitude()},get direction(){return direction()},get won(){return won},
  get feedback(){return !lastLean?'coast':lastLean===direction()?'correct':'wrong'},
  start(){active=true;angle=0;velocity=.16;lastLean=0;won=false;goalTime=0},
  stop(){active=false;angle=velocity=lastLean=goalTime=0;won=false},
  update(dt:number,lean=0){
   if(!active)return 0;lean=Math.sign(lean);
   // A new lean can start another attempt after the swing has come to rest.
   if(lean&&!lastLean&&energy()<.004)velocity=lean*.16;
   lastLean=lean;
   let remaining=Math.max(0,Math.min(.1,dt));
   while(remaining>0){
    const step=Math.min(remaining,1/120),correct=lean&&lean===direction();
    const damping=.2+(lean?(correct?-.95*Math.max(0,1-energy()/maxEnergy):2.6):0);
    velocity+=(-gravity*Math.sin(angle)-damping*velocity)*step;angle+=velocity*step;
    if(Math.abs(angle)>maxAngle){angle=Math.sign(angle)*maxAngle;velocity=0}
    const kineticLimit=Math.max(0,2*(maxEnergy-gravity*(1-Math.cos(angle))));
    if(velocity*velocity>kineticLimit)velocity=Math.sign(velocity)*Math.sqrt(kineticLimit);
    if(energy()<.000001)angle=velocity=0;
    goalTime=amplitude()>=.6?goalTime+step:0;if(goalTime>=1)won=true;
    remaining-=step;
   }
   return angle;
  }
 };
}
