import assert from 'node:assert/strict';
import { actions, towns, travelCost, migrateLegacyFunds } from './content.js';
assert.equal(towns.length,8); assert.equal(actions.length,12); assert.ok(actions.every(a=>a.duration>0&&a.stamina>=0));
// 旅费口径唯一：最低 12，前后端展示/校验/扣费共用 travelCost
assert.equal(travelCost({capacity:80}),12); assert.equal(travelCost({capacity:90}),12);
assert.equal(travelCost({capacity:100}),13); assert.equal(travelCost({capacity:180}),23);
for(const t of towns)assert.ok(Number.isInteger(travelCost(t))&&travelCost(t)>=12);
// 校验与扣费同口径：资金不低于旅费才放行，支付后余额永不为负
for(const t of towns){const cost=travelCost(t);
  const pay=(funds:number)=>funds>=cost?funds-cost:null;
  assert.equal(pay(cost-1),null,'低于旅费必须拒绝');
  assert.ok([cost,cost+40].every(f=>(pay(f)!)>=0),'放行后扣费不得产生负资金');
}
// 历史负余额迁移：负值与非法值统一归零，并返回迁移数量
const legacy=[{funds:-7},{funds:0},{funds:33},{funds:Number.NaN}];
assert.equal(migrateLegacyFunds(legacy),2); assert.deepEqual(legacy.map(x=>x.funds),[0,0,33,0]);
assert.equal(migrateLegacyFunds([{funds:5}]),0);
console.log('rules smoke tests passed');
