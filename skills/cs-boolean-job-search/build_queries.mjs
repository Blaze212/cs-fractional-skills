#!/usr/bin/env node
// cs-boolean-job-search — builds BATCHED boolean WebSearch queries from the same
// site: source map the portal /job-search page uses. Unlike the links skill
// (one URL per source), this emits a handful of OR-combined query STRINGS meant
// to be fed into Claude's WebSearch tool, so a full run is a few searches, not 73.
//
// WebSearch is not literally Google: there is no tbs/f_TPR recency knob, and
// wildcard site: tricks (site:jobs.*, site:*/careers/*) are mostly ignored — so
// those are excluded by default (enable with --include-wildcards). Concrete
// domains (Greenhouse, Lever, LinkedIn, Remote OK, …) work fine.
//
// Usage:
//   node build_queries.mjs --job "<title>" [--remote true|false] [--location "<city>"] \
//     [--include "<must-have terms>"] [--exclude "<term1,term2>"] [--batch-size 8] \
//     [--categories popular,remote,startups,enterprise,staffing] [--include-wildcards] [--json]
//
// Recency: --time is intentionally NOT a query param (WebSearch can't filter by
// date). The skill should post-filter results by visible posted-date instead.

const CATEGORY_LABELS = {
  popular: 'Most popular',
  remote: 'Remote-first job boards',
  startups: 'Startups & scaleups',
  enterprise: 'Big companies & enterprise',
  staffing: 'Staffing Agencies & Niche Boards',
}
const CATEGORY_ORDER = ['popular', 'remote', 'startups', 'enterprise', 'staffing']

// Concrete domains per category (work in WebSearch). Ported from jobSearchUrl.ts.
const CONCRETE = {
  popular: [
    'linkedin.com/jobs',
    'glassdoor.com/job-listing',
    'wellfound.com',
    'builtin.com/job',
    'careerbuilder.com',
    'workatastartup.com',
    'welcometothejungle.com',
    'remoterocketship.com',
  ],
  remote: [
    'remotive.com', 'weworkremotely.com', 'remoteok.com', 'workingnomads.com',
    'remotefront.com', 'himalayas.app', 'arc.dev', 'jobgether.com', 'ai-jobs.net',
    'hiring.cafe', 'techjobsforgood.com', 'climatelist.com', 'tklm.io',
  ],
  startups: [
    'greenhouse.io', 'lever.co', 'ashbyhq.com', 'jobs.workable.com',
    'jobs.smartrecruiters.com', 'bamboohr.com', 'jobvite.com', 'teamtailor.com',
    'pinpointhq.com', 'recruitee.com', 'homerun.co', 'gem.com', 'clearcompany.com',
    'breezy.hr', 'applytojob.com', 'gohire.io', 'careerpuck.com', 'notion.site',
    'trakstar.com', 'dover.io',
  ],
  enterprise: [
    'myworkdayjobs.com', 'successfactors.com', 'sapsf.com', 'oraclecloud.com',
    'workforcenow.adp.com', 'myjobs.adp.com', 'ultipro.com', 'ukg.com',
    'paycomonline.net', 'recruiting.paylocity.com', 'paycor.com',
    'cornerstoneondemand.com', 'avature.net', 'rippling.com', 'rippling-ats.com',
    'jobs.gusto.com', 'trinethire.com', 'factorialhr.com', 'keka.com',
    'freshteam.com', 'icims.com',
  ],
  staffing: [
    'bullhorn.com', 'bullhornreach.com', 'jobdiva.com', 'ceipal.com', 'jobadder.com',
    'loxo.co', 'hireology.com', 'fountain.com', 'zohorecruit.com', 'catsone.com',
    'jobappnetwork.com',
  ],
}

// Wildcard expressions — Google-only tricks, mostly ignored by WebSearch.
const WILDCARDS = {
  staffing: ['jobs.*', 'careers.*', 'people.*', 'talent.*'],
}

const WRAPPED_QUOTE_PATTERNS = [/^"(.*)"$/s, /^'(.*)'$/s, /^“(.*)”$/s, /^‘(.*)’$/s]
function normalizeJobTitle(raw) {
  let s = (raw ?? '').trim()
  for (const p of WRAPPED_QUOTE_PATTERNS) {
    const m = p.exec(s)
    if (m) { s = m[1].trim(); break }
  }
  return s
}

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function parseArgs(argv) {
  const a = { remote: true, location: '', include: '', exclude: '', batchSize: 8, json: false, wildcards: false, categories: CATEGORY_ORDER.slice() }
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i]
    const next = () => argv[++i]
    switch (f) {
      case '--job': a.job = next(); break
      case '--remote': a.remote = String(next()).toLowerCase() !== 'false'; break
      case '--location': a.location = next() ?? ''; break
      case '--include': a.include = next() ?? ''; break
      case '--exclude': a.exclude = next() ?? ''; break
      case '--batch-size': a.batchSize = Math.max(1, parseInt(next(), 10) || 8); break
      case '--categories': a.categories = (next() ?? '').split(',').map((s) => s.trim()).filter(Boolean); break
      case '--include-wildcards': a.wildcards = true; break
      case '--json': a.json = true; break
      default:
        if (f?.startsWith('--')) { console.error(`Unknown flag: ${f}`); process.exit(2) }
    }
  }
  return a
}

function buildQuery(title, sites, { remote, location, include, exclude }) {
  const siteGroup = sites.length === 1 ? `site:${sites[0]}` : `(${sites.map((s) => `site:${s}`).join(' OR ')})`
  const parts = [`"${title}"`, siteGroup]
  if (remote) parts.push('remote')
  else if (location) parts.push(location)
  if (include.trim()) parts.push(include.trim())
  for (const term of exclude.split(',').map((s) => s.trim()).filter(Boolean)) parts.push(`-${term}`)
  return parts.join(' ')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const title = normalizeJobTitle(args.job ?? '')
  if (!title) { console.error('Error: --job "<title or keywords>" is required.'); process.exit(2) }
  const bad = args.categories.filter((c) => !CATEGORY_ORDER.includes(c))
  if (bad.length) { console.error(`Unknown categories: ${bad.join(', ')}. Valid: ${CATEGORY_ORDER.join(', ')}`); process.exit(2) }

  const out = []
  for (const cat of CATEGORY_ORDER) {
    if (!args.categories.includes(cat)) continue
    const domains = CONCRETE[cat].slice()
    if (args.wildcards && WILDCARDS[cat]) domains.push(...WILDCARDS[cat])
    for (const batch of chunk(domains, args.batchSize)) {
      out.push({ category: cat, categoryLabel: CATEGORY_LABELS[cat], sites: batch, query: buildQuery(title, batch, args) })
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ title, remote: args.remote, location: args.location, queryCount: out.length, queries: out }, null, 2))
    return
  }

  const lines = [`# WebSearch queries — "${title}" (${out.length} batched searches)`, '']
  lines.push('Run each line below with the WebSearch tool, collect results, then dedupe/filter/rank.')
  lines.push('Recency cannot be a query filter — post-filter by visible posted date.')
  lines.push('')
  let lastCat = null
  for (const q of out) {
    if (q.category !== lastCat) { lines.push(`### ${q.categoryLabel}`); lastCat = q.category }
    lines.push(`- ${q.query}`)
  }
  console.log(lines.join('\n'))
}

main()
