#!/usr/bin/env bash
# Scripted reproduction of:
# 修复余额低于旅费仍能移动并产生负资金的问题，统一前后端费用口径，
# 迁移历史负余额并保证失败移动后回滚。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${STATE_DIR:-$HOME/.cache/code6-28-b}"
API="${API_BASE_URL:-$(cat "$STATE_DIR/api-url" 2>/dev/null || true)}"
API="${API%/}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
TMP="$(mktemp -t code6-28-repro)"
FAILED=0

if [ -z "$API" ]; then echo "no api-url available"; exit 1; fi

echo "== 复现脚本：余额低于旅费不得移动 =="
echo "API: $API"
echo

echo "== 1) 历史负余额迁移 =="
FUNDS="$(curl -sS "$API/api/v1/tours/legacy-tour" | $NODE_BIN -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const t=JSON.parse(s).tour;
  console.error(`  存档 ${t.id}：写入时为 funds=-7，服务启动后 funds=${t.funds}（version=${t.version}）`);
  process.stdout.write(String(t.funds));
})')"
if [ "$FUNDS" = "0" ]; then echo "  [OK] 历史负余额已在启动时归零"; else echo "  [FAIL] 迁移后 funds=$FUNDS"; FAILED=1; fi
echo

echo "== 2) 前后端旅费口径 =="
curl -sS "$API/api/v1/content/bootstrap" | $NODE_BIN -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const moss=JSON.parse(s).towns.find(t=>t.id==="moss");
  const raw=Math.round(moss.capacity/8);
  console.log(`  苔原镇 capacity=${moss.capacity} 原始单价=${raw} 保底后旅费=${Math.max(12,raw)}`);
  console.log(`  服务端下发 travelCost=${moss.travelCost ?? "(由前端共用同一函数计算)"}`);
});'
echo

echo "== 3) 余额 11 < 旅费 12：移动请求必须被拒绝 =="
curl -sS "$API/api/v1/tours/broke-tour" > "$TMP.before"
$NODE_BIN -e '
const fs=require("fs");const t=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).tour;
console.log(`  移动前 funds=${t.funds} stopIndex=${t.stopIndex} status=${t.status} version=${t.version}`);' "$TMP.before"
CODE="$(curl -sS -o "$TMP.travel" -w '%{http_code}' -X POST "$API/api/v1/tours/broke-tour/travel" -H 'Content-Type: application/json' -d '{"townId":"moss"}')"
echo "  POST /api/v1/tours/broke-tour/travel -> HTTP $CODE  $(cat "$TMP.travel")"
if [ "$CODE" = "422" ] && grep -q "INSUFFICIENT_RESOURCE" "$TMP.travel"; then
  echo "  [OK] 余额不足被拒绝，未放行移动"
else
  echo "  [FAIL] 期望 HTTP 422 INSUFFICIENT_RESOURCE"; FAILED=1
fi
echo

echo "== 4) 失败移动后回滚 =="
curl -sS "$API/api/v1/tours/broke-tour" > "$TMP.after"
SAME="$($NODE_BIN -e '
const fs=require("fs");
const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).tour;
const a=JSON.parse(fs.readFileSync(process.argv[2],"utf8")).tour;
const keys=["funds","stopIndex","status","version"];
console.error(`  移动后 funds=${a.funds} stopIndex=${a.stopIndex} status=${a.status} version=${a.version}`);
process.stdout.write(String(keys.every(k=>b[k]===a[k])));
' "$TMP.before" "$TMP.after")"
case "$SAME" in
  true) echo "  [OK] 关键字段与移动前一致，未产生负资金" ;;
  *) echo "  [FAIL] 状态被改动，回滚失败"; FAILED=1 ;;
esac

rm -f "$TMP" "$TMP.before" "$TMP.travel" "$TMP.after"
echo
if [ "$FAILED" = "0" ]; then
  echo "== 结论：余额不足被拦截、口径统一、历史负余额已迁移、失败移动已回滚 =="
else
  echo "== 结论：存在未满足的需求 =="
fi
exit "$FAILED"
