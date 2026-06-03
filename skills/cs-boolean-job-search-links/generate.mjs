#!/usr/bin/env node
// cs-boolean-job-search-links — generates boolean job-search links across 73
// ATS / job-board sources, grouped by category. Ported verbatim from the
// portal's apps/portal/src/pages/jobSearchUrl.ts so the skill stays in lockstep
// with the public /job-search page. Pure stdlib, no dependencies.
//
// Usage:
//   node generate.mjs --job "<title or keywords>" [--location "<city>"] \
//        [--remote true|false] [--time any|hour|day|week|month] [--extra "<boolean terms>"] [--json]
//
// Defaults mirror the page: remote=true, time=any. --extra appends raw boolean
// terms (e.g. '"Python" -contract') to every Google query and to LinkedIn keywords.

const GOOGLE_TBS = { hour: 'qdr:h', day: 'qdr:d', week: 'qdr:w', month: 'qdr:m' }
const LINKEDIN_F_TPR = { hour: 'r3600', day: 'r86400', week: 'r604800', month: 'r2592000' }
const VALID_TIME = new Set(['any', 'hour', 'day', 'week', 'month'])

const WRAPPED_QUOTE_PATTERNS = [/^"(.*)"$/s, /^'(.*)'$/s, /^“(.*)”$/s, /^‘(.*)’$/s]

function normalizeJobTitle(raw) {
  let s = (raw ?? '').trim()
  for (const pattern of WRAPPED_QUOTE_PATTERNS) {
    const match = pattern.exec(s)
    if (match) {
      s = match[1].trim()
      break
    }
  }
  return s
}

function googleLocationSuffix(input) {
  if (input.remote) return 'remote'
  return (input.location ?? '').trim()
}

function linkedInLocation(input) {
  if (input.remote) return 'Remote'
  return (input.location ?? '').trim()
}

function googleSiteSearch(siteExpr) {
  return (input) => {
    const normalized = normalizeJobTitle(input.job)
    if (!normalized) throw new Error('job is required')
    const suffix = googleLocationSuffix(input)
    const extra = (input.extra ?? '').trim()
    let q = suffix ? `${siteExpr} ${normalized} ${suffix}` : `${siteExpr} ${normalized}`
    if (extra) q = `${q} ${extra}`
    const queryStr = `q=${encodeURIComponent(q)}`
    const tbsStr = input.time === 'any' ? '' : `&tbs=${GOOGLE_TBS[input.time]}`
    return `https://www.google.com/search?${queryStr}${tbsStr}`
  }
}

function buildRemoteRocketshipUrl({ job }) {
  const normalized = normalizeJobTitle(job)
  if (!normalized) throw new Error('job is required')
  return `https://remoterocketship.com/?jobTitle=${encodeURIComponent(normalized)}`
}

function buildLinkedInUrl(input) {
  const normalized = normalizeJobTitle(input.job)
  if (!normalized) throw new Error('job is required')
  const extra = (input.extra ?? '').trim()
  const keywords = extra ? `${normalized} ${extra}` : normalized
  const parts = [`keywords=${encodeURIComponent(keywords)}`]
  const loc = linkedInLocation(input)
  if (loc) parts.push(`location=${encodeURIComponent(loc)}`)
  if (input.time !== 'any') parts.push(`f_TPR=${LINKEDIN_F_TPR[input.time]}`)
  return `https://www.linkedin.com/jobs/search/?${parts.join('&')}`
}

const CATEGORY_LABELS = {
  popular: 'Most popular',
  remote: 'Remote-first job boards',
  startups: 'Startups & scaleups',
  enterprise: 'Big companies & enterprise',
  staffing: 'Staffing Agencies & Niche Boards',
}

const CATEGORY_ORDER = ['popular', 'remote', 'startups', 'enterprise', 'staffing']

const JOB_SOURCES = [
  // -- popular --
  { id: 'linkedin', label: 'LinkedIn', category: 'popular', buildUrl: buildLinkedInUrl },
  { id: 'glassdoor', label: 'Glassdoor', category: 'popular', buildUrl: googleSiteSearch('site:glassdoor.com/job-listing/') },
  { id: 'wellfound', label: 'Wellfound', category: 'popular', buildUrl: googleSiteSearch('site:wellfound.com') },
  { id: 'builtin', label: 'Builtin', category: 'popular', buildUrl: googleSiteSearch('site:builtin.com/job/') },
  { id: 'careerbuilder', label: 'CareerBuilder', category: 'popular', buildUrl: googleSiteSearch('site:careerbuilder.com') },
  { id: 'yc-work-at-startup', label: 'Y Combinator Work at a Startup', category: 'popular', buildUrl: googleSiteSearch('site:workatastartup.com') },
  { id: 'welcometothejungle', label: 'Welcome to the Jungle', category: 'popular', buildUrl: googleSiteSearch('site:welcometothejungle.com') },
  { id: 'remote-rocketship', label: 'Remote Rocketship', category: 'popular', buildUrl: buildRemoteRocketshipUrl },

  // -- remote --
  { id: 'remotive', label: 'Remotive', category: 'remote', buildUrl: googleSiteSearch('site:remotive.com') },
  { id: 'weworkremotely', label: 'We Work Remotely', category: 'remote', buildUrl: googleSiteSearch('site:weworkremotely.com') },
  { id: 'remoteok', label: 'RemoteOK', category: 'remote', buildUrl: googleSiteSearch('site:remoteok.com') },
  { id: 'working-nomads', label: 'Working Nomads', category: 'remote', buildUrl: googleSiteSearch('site:workingnomads.com') },
  { id: 'remotefront', label: 'RemoteFront', category: 'remote', buildUrl: googleSiteSearch('site:remotefront.com') },
  { id: 'himalayas', label: 'Himalayas', category: 'remote', buildUrl: googleSiteSearch('site:himalayas.app') },
  { id: 'arc', label: 'Arc', category: 'remote', buildUrl: googleSiteSearch('site:arc.dev') },
  { id: 'jobgether', label: 'Jobgether', category: 'remote', buildUrl: googleSiteSearch('site:jobgether.com') },
  { id: 'ai-jobs', label: 'AI Jobs', category: 'remote', buildUrl: googleSiteSearch('site:ai-jobs.net') },
  { id: 'hiring-cafe', label: 'Hiring Cafe', category: 'remote', buildUrl: googleSiteSearch('site:hiring.cafe') },
  { id: 'tech-jobs-for-good', label: 'Tech Jobs for Good', category: 'remote', buildUrl: googleSiteSearch('site:techjobsforgood.com') },
  { id: 'climatelist', label: 'Climatelist', category: 'remote', buildUrl: googleSiteSearch('site:climatelist.com') },
  { id: 'tklm', label: 'TKLM', category: 'remote', buildUrl: googleSiteSearch('site:tklm.io') },

  // -- startups --
  { id: 'greenhouse', label: 'Greenhouse', category: 'startups', buildUrl: googleSiteSearch('site:greenhouse.io') },
  { id: 'lever', label: 'Lever', category: 'startups', buildUrl: googleSiteSearch('site:lever.co') },
  { id: 'ashby', label: 'Ashby', category: 'startups', buildUrl: googleSiteSearch('site:ashbyhq.com') },
  { id: 'workable', label: 'Workable', category: 'startups', buildUrl: googleSiteSearch('site:jobs.workable.com') },
  { id: 'smartrecruiters', label: 'SmartRecruiters', category: 'startups', buildUrl: googleSiteSearch('site:jobs.smartrecruiters.com') },
  { id: 'bamboohr', label: 'BambooHR', category: 'startups', buildUrl: googleSiteSearch('site:bamboohr.com') },
  { id: 'jobvite', label: 'Jobvite', category: 'startups', buildUrl: googleSiteSearch('site:jobvite.com') },
  { id: 'teamtailor', label: 'Teamtailor', category: 'startups', buildUrl: googleSiteSearch('site:teamtailor.com') },
  { id: 'pinpoint', label: 'Pinpoint', category: 'startups', buildUrl: googleSiteSearch('site:pinpointhq.com') },
  { id: 'recruitee', label: 'Recruitee', category: 'startups', buildUrl: googleSiteSearch('site:recruitee.com') },
  { id: 'homerun', label: 'Homerun', category: 'startups', buildUrl: googleSiteSearch('site:homerun.co') },
  { id: 'gem', label: 'Gem', category: 'startups', buildUrl: googleSiteSearch('site:gem.com') },
  { id: 'clearcompany', label: 'ClearCompany', category: 'startups', buildUrl: googleSiteSearch('site:clearcompany.com') },
  { id: 'breezyhr', label: 'BreezyHR', category: 'startups', buildUrl: googleSiteSearch('site:breezy.hr') },
  { id: 'jazzhr', label: 'JazzHR', category: 'startups', buildUrl: googleSiteSearch('site:applytojob.com') },
  { id: 'gohire', label: 'GoHire', category: 'startups', buildUrl: googleSiteSearch('site:gohire.io') },
  { id: 'careerpuck', label: 'CareerPuck', category: 'startups', buildUrl: googleSiteSearch('site:careerpuck.com') },
  { id: 'notion', label: 'Notion', category: 'startups', buildUrl: googleSiteSearch('site:notion.site') },
  { id: 'trakstar', label: 'Trakstar', category: 'startups', buildUrl: googleSiteSearch('site:trakstar.com') },
  { id: 'dover', label: 'Dover', category: 'startups', buildUrl: googleSiteSearch('site:dover.io') },

  // -- enterprise --
  { id: 'workday', label: 'Workday Jobs', category: 'enterprise', buildUrl: googleSiteSearch('site:myworkdayjobs.com') },
  { id: 'sap-successfactors', label: 'SAP SuccessFactors', category: 'enterprise', buildUrl: googleSiteSearch('(site:successfactors.com OR site:sapsf.com)') },
  { id: 'oracle-cloud', label: 'Oracle Cloud', category: 'enterprise', buildUrl: googleSiteSearch('site:oraclecloud.com') },
  { id: 'adp', label: 'ADP', category: 'enterprise', buildUrl: googleSiteSearch('(site:workforcenow.adp.com OR site:myjobs.adp.com)') },
  { id: 'ukg', label: 'UKG (Pro/Ready)', category: 'enterprise', buildUrl: googleSiteSearch('(site:ultipro.com OR site:ukg.com)') },
  { id: 'paycom', label: 'Paycom', category: 'enterprise', buildUrl: googleSiteSearch('site:paycomonline.net') },
  { id: 'paylocity', label: 'Paylocity', category: 'enterprise', buildUrl: googleSiteSearch('site:recruiting.paylocity.com') },
  { id: 'paycor', label: 'Paycor', category: 'enterprise', buildUrl: googleSiteSearch('site:paycor.com') },
  { id: 'cornerstone', label: 'Cornerstone', category: 'enterprise', buildUrl: googleSiteSearch('site:cornerstoneondemand.com') },
  { id: 'avature', label: 'Avature', category: 'enterprise', buildUrl: googleSiteSearch('site:avature.net') },
  { id: 'rippling', label: 'Rippling', category: 'enterprise', buildUrl: googleSiteSearch('(site:rippling.com OR site:rippling-ats.com)') },
  { id: 'gusto', label: 'Gusto', category: 'enterprise', buildUrl: googleSiteSearch('site:jobs.gusto.com') },
  { id: 'trinet-hire', label: 'TriNet Hire', category: 'enterprise', buildUrl: googleSiteSearch('site:trinethire.com') },
  { id: 'factorial', label: 'Factorial', category: 'enterprise', buildUrl: googleSiteSearch('site:factorialhr.com') },
  { id: 'keka', label: 'Keka', category: 'enterprise', buildUrl: googleSiteSearch('site:keka.com') },
  { id: 'freshteam', label: 'Freshteam', category: 'enterprise', buildUrl: googleSiteSearch('site:freshteam.com') },
  { id: 'icims', label: 'iCIMS', category: 'enterprise', buildUrl: googleSiteSearch('site:icims.com') },

  // -- staffing --
  { id: 'bullhorn', label: 'Bullhorn', category: 'staffing', buildUrl: googleSiteSearch('(site:bullhorn.com OR site:bullhornreach.com)') },
  { id: 'jobdiva', label: 'JobDiva', category: 'staffing', buildUrl: googleSiteSearch('site:jobdiva.com') },
  { id: 'ceipal', label: 'Ceipal', category: 'staffing', buildUrl: googleSiteSearch('site:ceipal.com') },
  { id: 'jobadder', label: 'JobAdder', category: 'staffing', buildUrl: googleSiteSearch('site:jobadder.com') },
  { id: 'loxo', label: 'Loxo', category: 'staffing', buildUrl: googleSiteSearch('site:loxo.co') },
  { id: 'hireology', label: 'Hireology', category: 'staffing', buildUrl: googleSiteSearch('site:hireology.com') },
  { id: 'fountain', label: 'Fountain', category: 'staffing', buildUrl: googleSiteSearch('site:fountain.com') },
  { id: 'zoho-recruit', label: 'Zoho Recruit', category: 'staffing', buildUrl: googleSiteSearch('site:zohorecruit.com') },
  { id: 'cats', label: 'Cats', category: 'staffing', buildUrl: googleSiteSearch('site:catsone.com') },
  { id: 'talentreef', label: 'TalentReef', category: 'staffing', buildUrl: googleSiteSearch('site:jobappnetwork.com') },
  { id: 'jobs-subdomain', label: 'Jobs Subdomain', category: 'staffing', buildUrl: googleSiteSearch('site:jobs.*') },
  { id: 'careers-pages', label: 'Careers Pages', category: 'staffing', buildUrl: googleSiteSearch('(site:careers.* OR site:*/careers/* OR site:*/career/*)') },
  { id: 'people-subdomain', label: 'People Subdomain', category: 'staffing', buildUrl: googleSiteSearch('site:people.*') },
  { id: 'talent-subdomain', label: 'Talent Subdomain', category: 'staffing', buildUrl: googleSiteSearch('site:talent.*') },
  { id: 'other-pages', label: 'Other Pages', category: 'staffing', buildUrl: googleSiteSearch('(site:*/employment/* OR site:*/opportunities/* OR site:*/openings/* OR site:*/join-us/* OR site:*/work-with-us/*)') },
]

function parseArgs(argv) {
  const args = { time: 'any', remote: true, location: '', extra: '', json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--job': args.job = next(); break
      case '--location': args.location = next() ?? ''; break
      case '--remote': args.remote = String(next()).toLowerCase() !== 'false' && String(argv[i]) !== '0'; break
      case '--time': args.time = next(); break
      case '--extra': args.extra = next() ?? ''; break
      case '--json': args.json = true; break
      default:
        if (a?.startsWith('--')) { console.error(`Unknown flag: ${a}`); process.exit(2) }
    }
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const job = normalizeJobTitle(args.job ?? '')
  if (!job) {
    console.error('Error: --job "<title or keywords>" is required.')
    process.exit(2)
  }
  if (!VALID_TIME.has(args.time)) {
    console.error(`Error: --time must be one of: ${[...VALID_TIME].join(', ')}`)
    process.exit(2)
  }

  const input = { job, time: args.time, location: args.location, remote: args.remote, extra: args.extra }

  const grouped = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, []]))
  for (const source of JOB_SOURCES) {
    grouped[source.category].push({ id: source.id, label: source.label, url: source.buildUrl(input) })
  }

  if (args.json) {
    console.log(JSON.stringify({ input, grouped }, null, 2))
    return
  }

  const where = input.remote ? 'Remote' : (input.location || 'Anywhere')
  const timeLabel = { any: 'Any time', hour: 'Past hour', day: 'Past 24 hours', week: 'Past week', month: 'Past month' }[input.time]
  const lines = []
  lines.push(`# Job search links — "${job}"`)
  lines.push('')
  lines.push(`**Location:** ${where}  ·  **Posted:** ${timeLabel}${input.extra ? `  ·  **Extra terms:** \`${input.extra}\`` : ''}  ·  **${JOB_SOURCES.length} sources**`)
  lines.push('')
  for (const cat of CATEGORY_ORDER) {
    lines.push(`### ${CATEGORY_LABELS[cat]}`)
    for (const s of grouped[cat]) {
      lines.push(`- [${s.label}](${s.url})`)
    }
    lines.push('')
  }
  console.log(lines.join('\n'))
}

main()
