#!/usr/bin/env node
// qa-smoke.mjs — checks the running app responds on key routes.
// Run the app first (e.g. `cd app && npx next start -p 3100`) then `npm run qa:smoke`.

const BASE = process.env.QA_SMOKE_BASE ?? "http://127.0.0.1:3100";
const routes = [
  { path: "/", expect: 200 },
  { path: "/circles", expect: 200 },
  { path: "/profile", expect: 200 },
  { path: "/demo", expect: 200 },
  { path: "/api/circles", expect: 200 },
  // Relayer status route may 500 if RELAYER_SECRET missing — treat 200 OR 500 as informational.
  { path: "/api/relayer/status", expect: [200, 500] },
];

let fail = 0;
for (const r of routes) {
  try {
    const res = await fetch(`${BASE}${r.path}`);
    const expected = Array.isArray(r.expect) ? r.expect : [r.expect];
    const ok = expected.includes(res.status);
    console.log(`${ok ? "OK " : "FAIL"} ${res.status} ${r.path}`);
    if (!ok) fail++;
  } catch (e) {
    console.log(`FAIL ERR  ${r.path}  ${e.message}`);
    fail++;
  }
}
process.exit(fail === 0 ? 0 : 1);
