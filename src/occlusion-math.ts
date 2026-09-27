export type V3={x:number;y:number;z:number};
// Segment/AABB test independent of render visibility and face winding.
export function blocksView(origin:V3,direction:V3,min:V3,max:V3,length=35){
 let near=.05,far=length;
 for(const axis of ['x','y','z'] as const){const d=direction[axis],o=origin[axis];if(Math.abs(d)<1e-8){if(o<min[axis]||o>max[axis])return false;continue}let a=(min[axis]-o)/d,b=(max[axis]-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}
 return true;
}
