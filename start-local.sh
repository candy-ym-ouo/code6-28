#!/usr/bin/env bash
# Local-only launcher for the Code6-28 A/B recording (no Docker, no desktop window).
# The workspace source is never modified: the API is compiled into an isolated run
# directory, the web build is copied, and the JSON store lives inside the run dir.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${STATE_DIR:-$HOME/.cache/code6-28-b}"
RUN_DIR="$STATE_DIR/run"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
export TZ="${TZ:-Asia/Shanghai}"

log() { printf '%s\n' "$*"; }

# pick a free loopback port
free_port() {
  "$NODE_BIN" -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{process.stdout.write(String(s.address().port));s.close();});'
}

log "[start-local] workspace : $ROOT"
log "[start-local] state dir : $STATE_DIR"
log "[start-local] node      : $("$NODE_BIN" -v)"

mkdir -p "$STATE_DIR"
# never let the recorder pick up URLs from an earlier run
rm -f "$STATE_DIR/api-url" "$STATE_DIR/web-url"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR"

# 1) dependencies -----------------------------------------------------------
if [ "${SKIP_INSTALL:-0}" = "1" ] && [ -d "$ROOT/node_modules" ]; then
  log "[start-local] SKIP_INSTALL=1 -> reusing existing node_modules"
else
  log "[start-local] installing dependencies"
  (cd "$ROOT" && npm install --no-audit --no-fund) >"$STATE_DIR/install.log" 2>&1 || { tail -40 "$STATE_DIR/install.log"; exit 1; }
fi

# 2) compile API into the isolated run dir ----------------------------------
log "[start-local] compiling API -> $RUN_DIR/api-dist"
(cd "$ROOT" && "$NODE_BIN" ./node_modules/typescript/bin/tsc -p api/tsconfig.json --outDir "$RUN_DIR/api-dist")

# 3) web build output (copied, so the run dir owns its own assets) ----------
log "[start-local] copying web build output"
cp -R "$ROOT/dist-web" "$RUN_DIR/dist-web"

# 3b) dependencies stay in the workspace; the run dir only references them
ln -sfn "$ROOT/node_modules" "$RUN_DIR/node_modules"

cat > "$RUN_DIR/dist-web/seed.html" <<'HTML'
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>载入本地存档</title>
<style>html,body{margin:0;height:100%;background:#0b1020;color:#d8e2ff;
font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
body{display:flex;align-items:center;justify-content:center;font-size:18px}</style></head>
<body><div>正在载入本地存档…</div>
<script>
  var id = new URLSearchParams(location.search).get('tour') || 'broke-tour';
  localStorage.setItem('tour', id);
  setTimeout(function () { location.replace('/'); }, 700);
</script></body></html>
HTML

# 4) isolated JSON store, seeded before the first boot ----------------------
cat > "$RUN_DIR/data.json" <<'JSON'
[
  {
    "id": "legacy-tour",
    "name": "旧档剧团",
    "seed": 11,
    "status": "ROUTE_SELECTION",
    "townIds": ["lantern", "moss", "reed", "stone", "well", "red"],
    "stopIndex": 0,
    "funds": -7,
    "reputation": 50,
    "inspiration": 3,
    "version": 4,
    "actors": [
      {"id":"mei","name":"梅枝","role":"牵线师","precision":8,"acting":6,"improvisation":5,"stamina":78,"trait":"耐力好","bio":"能把最细小的情绪传给最后一排。","level":1,"xp":0,"fatigue":0},
      {"id":"luo","name":"罗盘","role":"即兴演员","precision":5,"acting":7,"improvisation":9,"stamina":72,"trait":"现场救场","bio":"总能在木偶摔倒时把它变成剧情。","level":1,"xp":0,"fatigue":0},
      {"id":"yan","name":"燕尾","role":"武生","precision":7,"acting":8,"improvisation":4,"stamina":64,"trait":"擅长英雄","bio":"动作利落，最怕没有掌声。","level":1,"xp":0,"fatigue":0}
    ],
    "visited": [],
    "clues": {},
    "history": [],
    "unlocked": []
  },
  {
    "id": "broke-tour",
    "name": "纸月剧团",
    "seed": 42,
    "status": "ROUTE_SELECTION",
    "townIds": ["lantern", "moss", "reed", "stone", "well", "red"],
    "stopIndex": 0,
    "funds": 11,
    "reputation": 50,
    "inspiration": 3,
    "version": 2,
    "actors": [
      {"id":"mei","name":"梅枝","role":"牵线师","precision":8,"acting":6,"improvisation":5,"stamina":78,"trait":"耐力好","bio":"能把最细小的情绪传给最后一排。","level":1,"xp":0,"fatigue":0},
      {"id":"luo","name":"罗盘","role":"即兴演员","precision":5,"acting":7,"improvisation":9,"stamina":72,"trait":"现场救场","bio":"总能在木偶摔倒时把它变成剧情。","level":1,"xp":0,"fatigue":0},
      {"id":"yan","name":"燕尾","role":"武生","precision":7,"acting":8,"improvisation":4,"stamina":64,"trait":"擅长英雄","bio":"动作利落，最怕没有掌声。","level":1,"xp":0,"fatigue":0}
    ],
    "visited": [],
    "clues": {},
    "history": [],
    "unlocked": []
  }
]
JSON

# 5) ports (the app hardcodes 3001, so the compiled copy is re-pointed) -----
API_PORT="$(free_port)"
SHIM_PORT="$(free_port)"
log "[start-local] selected ports -> app=$API_PORT health-shim=$SHIM_PORT"
"$NODE_BIN" -e '
const fs = require("fs");
const file = process.argv[1], port = process.argv[2];
fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/app\.listen\(3001/, "app.listen(" + port));
' "$RUN_DIR/api-dist/server.js" "$API_PORT"

# 6) start API (cwd = run dir => data.json + dist-web are isolated) ---------
( cd "$RUN_DIR" && exec "$NODE_BIN" api-dist/server.js ) >"$STATE_DIR/api.log" 2>&1 &
API_PID=$!

# 7) tiny health shim required by the recorder (app only exposes /health/live)
cat > "$STATE_DIR/health-shim.mjs" <<'JS'
import http from "node:http";
const port = Number(process.argv[2]);
const apiPort = Number(process.argv[3]);
http.createServer((req, res) => {
  if (req.url.split("?")[0] === "/health/ready") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true,"source":"health-shim"}');
    return;
  }
  const upstream = http.request(
    { host: "127.0.0.1", port: apiPort, path: req.url, method: req.method, headers: req.headers },
    (pres) => { res.writeHead(pres.statusCode ?? 502, pres.headers); pres.pipe(res); }
  );
  upstream.on("error", () => { try { res.writeHead(502); res.end("proxy error"); } catch {} });
  req.pipe(upstream);
}).listen(port, "127.0.0.1");
JS
"$NODE_BIN" "$STATE_DIR/health-shim.mjs" "$SHIM_PORT" "$API_PORT" >"$STATE_DIR/shim.log" 2>&1 &
SHIM_PID=$!

cleanup() {
  kill "$API_PID" "$SHIM_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap 'cleanup; exit 0' INT TERM
trap 'cleanup' EXIT

# 8) wait for readiness, then publish the URLs -----------------------------
for _ in $(seq 1 120); do
  if curl -fsS "http://127.0.0.1:$API_PORT/health/live" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fsS "http://127.0.0.1:$API_PORT/health/live" >/dev/null
printf 'http://127.0.0.1:%s\n' "$SHIM_PORT" > "$STATE_DIR/api-url"
printf 'http://127.0.0.1:%s\n' "$API_PORT" > "$STATE_DIR/web-url"

log "[start-local] api-url: $(cat "$STATE_DIR/api-url")"
log "[start-local] web-url: $(cat "$STATE_DIR/web-url")"
log "[start-local] API boot log:"
sed -n '1,20p' "$STATE_DIR/api.log" || true
log "[start-local] ready"

wait "$API_PID"
