import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const load=async source=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const shop=await load(fs.readFileSync('src/store-shopping.ts','utf8'));
const world=await load(fs.readFileSync('src/store-world.ts','utf8').split('export async function buildStore')[0].replace(/^import .*;\r?\n/gm,''));
const basket={flour:2,bar:1,juice:2};
assert.equal(shop.basketTotal(basket),365);
assert.deepEqual(shop.basketLines(basket).map(p=>[p.id,p.quantity,p.amount]),[['flour',2,158],['juice',2,118],['bar',1,89]]);
for(const answer of ['365',' 365 ','365.00','365,00'])assert.ok(shop.correctPayment(basket,answer));
for(const answer of ['', '1','365.01','365abc','3.65e2','NaN'])assert.equal(shop.correctPayment(basket,answer),false);
assert.equal(shop.correctPayment({},'0'),false);
const start={x:0,z:-2.5};
for(const [point,zone] of [[{x:2.5,z:-.55},'shelf-bars'],[{x:4,z:-2.6},'fridge'],[{x:-2.85,z:-3.3},'checkout'],[{x:3,z:3.3},'shelf'],[{x:-2.8,z:3.3},'shelf-bars'],[{x:-4.2,z:1},'shelf']]){
 assert.equal(shop.shoppingZone(point,world.storeFixtures,world.cashierPosition),zone);
 assert.equal(world.storeBlocked(point.x,point.z),false);
 const path=world.storePath(start,point);assert.ok(path.length);for(const p of path)assert.equal(world.storeBlocked(p.x,p.z),false);
}
assert.equal(shop.shoppingZone(start,world.storeFixtures,world.cashierPosition),null);
assert.equal(shop.shoppingZone({x:5.6,z:-2.6},world.storeFixtures,world.cashierPosition),null);
console.log('Shopping quantities, receipt totals, payment validation and reachable interaction zones verified.');
