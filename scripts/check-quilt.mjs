import assert from 'node:assert/strict';
import {quiltPoint} from '../src/quilt.ts';
// Check interpolated ribbon faces as well as vertices: no triangle may cut the mattress.
const clear=p=>{
 const x=Math.abs(p.x+2.72);
 assert(x>=.84||p.y>=.835,'quilt intersects mattress');
 assert(x>=.86||p.y>=.55,'quilt intersects bed frame');
 assert(p.z>=.04,'quilt intersects footboard');
};
for(let j=0;j<32;j++)for(let i=0;i<64;i++){
 const a=quiltPoint(i/64,j/32),b=quiltPoint((i+1)/64,j/32),c=quiltPoint(i/64,(j+1)/32),d=quiltPoint((i+1)/64,(j+1)/32);
 for(const [p,q,r] of [[a,b,c],[b,c,d]])for(let s=0;s<=10;s++)for(let t=0;t<=10-s;t++){
  const point={};for(const key of ['x','y','z'])point[key]=p[key]*(1-s/10-t/10)+q[key]*s/10+r[key]*t/10;clear(point);
 }
}
assert(quiltPoint(0,.5).y<.4&&quiltPoint(1,.5).y<.4,'both sides drape below the mattress');
console.log('Quilt: ribbon faces clear mattress, frame and footboard; both edges drape');
