#!/usr/bin/env node
// The standing performance gate. Run against a server on :3000:
//
//   node scripts/perf-check.mjs           # informational (dev server)
//   node scripts/perf-check.mjs --prod    # enforce budgets (production build)
//
// It checks everything checkable without signing in: page speed, the
// signed-out redirect graph (every hop must be exactly one), and bundle
// weight. Signed-in first paint is checked from the browser tab (see the
// perf-audit skill) because the agent cannot enter passwords.
//
// Budgets are set from measured baselines on 2026-07-30 (auth pages 6-13ms,
// dashboard first paint ~30ms prod) with generous headroom, so a failure
// means a real regression, not noise. Dev runs report the same table without
// failing, because dev has no prefetch and compiles on demand.

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://localhost:3000'
const PROD = process.argv.includes('--prod')

const BUDGET = {
  pageMs: 150, // TTFB for a public page, prod
  redirectMs: 60, // a proxy redirect is local work only
  chunkKb: 350, // biggest single client chunk
  totalMb: 2.5, // all client chunks together
}

let failures = 0
const row = (label, value, ok) => {
  const mark = ok === undefined ? ' ' : ok ? 'ok' : 'FAIL'
  if (ok === false) failures++
  console.log(`${mark.padEnd(5)} ${label.padEnd(46)} ${value}`)
}

async function timeGet(path) {
  const t = performance.now()
  const res = await fetch(BASE + path, { redirect: 'manual' })
  await res.arrayBuffer()
  return { ms: Math.round(performance.now() - t), res }
}

// Median of 5, first (cold) run discarded.
async function median(path) {
  const runs = []
  for (let i = 0; i < 6; i++) runs.push(await timeGet(path))
  const times = runs
    .slice(1)
    .map((r) => r.ms)
    .sort((a, b) => a - b)
  return { ms: times[2], res: runs[runs.length - 1].res }
}

console.log(`perf-check against ${BASE} (${PROD ? 'PROD budgets enforced' : 'dev, informational'})\n`)

// 1. Public pages: fast, no redirect.
for (const path of ['/login', '/register', '/forgot-password']) {
  const { ms, res } = await median(path)
  row(
    `${path} TTFB`,
    `${ms}ms (status ${res.status})`,
    PROD ? ms <= BUDGET.pageMs && res.status === 200 : undefined
  )
}

// 2. The signed-out redirect graph: every gated route is EXACTLY one hop to
// /login, and the hop is local proxy work. More than one hop, a hop that
// waits on a network call, or a gated route serving 200 are all regressions
// (the last one is the app-shell flash the root-gate fix removed).
const gated = ['/', '/settings', '/knowledge', '/connectors', '/chat/x', '/reset-password']
for (const path of gated) {
  const { ms, res } = await median(path)
  const loc = res.headers.get('location') ?? ''
  const oneHopToLogin = res.status >= 300 && res.status < 400 && loc.includes('/login')
  row(
    `${path} signed-out`,
    `${res.status} -> ${loc.replace(BASE, '') || '(none)'} in ${ms}ms`,
    oneHopToLogin && (PROD ? ms <= BUDGET.redirectMs : true)
  )
}

// 3. The confirm route's failure path stays a single explained hop.
{
  const { res } = await timeGet('/auth/confirm?token_hash=x&type=recovery')
  const loc = res.headers.get('location') ?? ''
  row(
    '/auth/confirm bad token',
    `${res.status} -> ${decodeURIComponent(loc.replace(BASE, '')).slice(0, 40)}...`,
    res.status >= 300 && loc.includes('/login?error=')
  )
}

// 4. Bundle weight. Reads the build on disk, so this part is meaningful even
// when the running server is dev.
try {
  const dir = '.next/static/chunks'
  const sizes = readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => statSync(join(dir, f)).size)
  const totalMb = sizes.reduce((a, b) => a + b, 0) / 1024 / 1024
  const maxKb = Math.max(...sizes) / 1024
  row('biggest client chunk', `${Math.round(maxKb)}KB`, maxKb <= BUDGET.chunkKb)
  row('total client JS', `${totalMb.toFixed(1)}MB`, totalMb <= BUDGET.totalMb)
} catch {
  row('bundle', 'no .next build found (run next build first)', undefined)
}

console.log('')
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exit(1)
}
console.log('all checks passed')
