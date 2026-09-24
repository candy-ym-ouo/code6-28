import { towns, type Town } from './content.js';

// 旅费下限：容量很小的小镇也要保证基础路费。
export const MIN_TRAVEL_FEE = 12;

// 旅费的唯一计算口径，前后端、校验与展示都必须使用它。
export function travelCost(target: Pick<Town, 'capacity'>): number {
  return Math.max(MIN_TRAVEL_FEE, Math.round(target.capacity / 8));
}

export type TourLike = {
  status: string;
  townIds: string[];
  stopIndex: number;
  funds: number;
};

export type TravelDecision =
  | { ok: true; cost: number; target: Town }
  | { ok: false; code: 'INVALID_TOUR_STATE' | 'INVALID_ROUTE' | 'INSUFFICIENT_RESOURCE'; message: string; status: number };

// 纯函数结算一次移动：只做校验与决策，不修改剧团状态，便于测试与失败回滚。
export function planTravel(t: TourLike, townId: string, catalog: Town[] = towns): TravelDecision {
  if (t.status !== 'ROUTE_SELECTION') {
    return { ok: false, code: 'INVALID_TOUR_STATE', message: '当前阶段不能移动', status: 409 };
  }
  const nextId = t.townIds[t.stopIndex + 1];
  if (nextId !== townId) {
    return { ok: false, code: 'INVALID_ROUTE', message: '请选择相邻路线', status: 400 };
  }
  const target = catalog.find(x => x.id === nextId);
  if (!target) {
    return { ok: false, code: 'INVALID_ROUTE', message: '请选择相邻路线', status: 400 };
  }
  const cost = travelCost(target);
  if (t.funds < cost) {
    return { ok: false, code: 'INSUFFICIENT_RESOURCE', message: `资金不足以支付旅费 ${cost}`, status: 422 };
  }
  return { ok: true, cost, target };
}

// 迁移历史脏数据：旧版本可能在余额低于旅费时仍放行移动，从而产生负资金。
// 负资金没有业务含义，统一归零；同时修正非法的非有限数值。
export function migrateFunds(funds: unknown): { funds: number; changed: boolean } {
  const next = typeof funds === 'number' && Number.isFinite(funds) ? funds : 0;
  if (next < 0) return { funds: 0, changed: true };
  if (next !== funds) return { funds: next, changed: true };
  return { funds: next, changed: false };
}
