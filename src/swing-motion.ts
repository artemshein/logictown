/** A smooth start, with a bounded angle and a repeatable return to rest. */
export function createSwingMotion(){
 let active=false,elapsed=0;
 return {get active(){return active},start(){active=true;elapsed=0},stop(){active=false;elapsed=0},update(dt:number){if(!active)return 0;elapsed+=Math.max(0,dt);return .42*Math.min(1,elapsed/1.4)*Math.sin(elapsed*Math.PI*2/2.8)}};
}
