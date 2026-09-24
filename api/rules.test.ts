import assert from 'node:assert/strict';
import { actions, towns } from './content.js';
import { migrateFunds, planTravel, travelCost, MIN_TRAVEL_FEE } from './rules.js';

assert.equal(towns.length, 8);
assert.equal(actions.length, 12);
assert.ok(actions.every(a => a.duration > 0 && a.stamina >= 0));

// 旅费口径：容量越小越便宜，但不低于下限。
const cheapTown = towns.find(t => t.id === 'moss')!; // capacity 80 -> 10 raw -> 12 floor
assert.equal(travelCost(cheapTown), MIN_TRAVEL_FEE);
assert.equal(travelCost(towns.find(t => t.id === 'lantern')!), 15); // 120/8
for (const t of towns) assert.ok(travelCost(t) >= MIN_TRAVEL_FEE);

// 失败的移动决策必须返回 ok:false，且绝不提示可以扣款。
const route = towns.slice(0, 3).map(t => t.id);
const base = { status: 'ROUTE_SELECTION', townIds: route, stopIndex: 0, funds: 11 };
// 11 < 12 的下限旅费：旧版本会放行并产生 -1，现在必须拒绝。
const denied = planTravel(base, route[1], towns);
assert.equal(denied.ok, false);
if (denied.ok) throw new Error('unreachable');
assert.equal(denied.code, 'INSUFFICIENT_RESOURCE');
assert.equal(denied.status, 422);
// 决策是纯函数：输入对象不应被改动。
assert.equal(base.funds, 11);
assert.equal(base.stopIndex, 0);
assert.equal(base.status, 'ROUTE_SELECTION');

// 恰好够钱才放行，扣款后余额为 0 而不是负数。
const paid = planTravel({ ...base, funds: 12 }, route[1], towns);
assert.equal(paid.ok, true);
if (!paid.ok) throw new Error('unreachable');
assert.equal(paid.cost, 12);

// 非路线阶段、非相邻路线都不能移动。
assert.equal(planTravel({ ...base, status: 'INVESTIGATING' }, route[1], towns).ok, false);
assert.equal(planTravel(base, route[2], towns).ok, false);

// 历史负余额迁移：负数归零，合法资金保持不变。
assert.deepEqual(migrateFunds(-5), { funds: 0, changed: true });
assert.deepEqual(migrateFunds(0), { funds: 0, changed: false });
assert.deepEqual(migrateFunds(420), { funds: 420, changed: false });
assert.deepEqual(migrateFunds(NaN), { funds: 0, changed: true });

console.log('rules smoke tests passed');
