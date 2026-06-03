---
name: cs-boolean-job-search-links
description: Generate boolean job-search links across 73 ATS and job-board sources (LinkedIn, Greenhouse, Lever, Ashby, Workday, Remote OK, Wellfound, and 60+ more), grouped into five categories, exactly like the CareerSystems portal /job-search page. Each link is a Google `site:` boolean search (or native LinkedIn / Remote Rocketship URL) scoped to one source. This skill ONLY builds and prints the clickable links — it does not fetch, scrape, rank, or read postings. Use this skill whenever the user wants job-search links, boolean search strings, a list of job boards/ATS to search, "site: search" queries for a role, or asks to "search for jobs", "find openings", "where can I apply for X", or to reproduce the portal's job-search link list. Trigger on phrases like "job search links", "boolean job search", "search every job board for", "give me search links for <role>", even if the user does not say the word "boolean".
---

# CS Boolean Job Search Links

Builds the same set of **73 boolean job-search links** the CareerSystems portal
`/job-search` page produces, grouped into five categories. Links only — no
fetching, scraping, or ranking. The user clicks the links to run the searches.

The link-building logic is ported verbatim from
`apps/portal/src/pages/jobSearchUrl.ts`, so output stays in lockstep with the
public page. **Always generate links by running `generate.mjs`** — never
hand-write the 73 URLs (encoding mistakes are easy and the source list drifts).

## Step 1 — Gather inputs (interactive)

Collect these from the user. If the triggering message already supplies some
(e.g. "remote staff engineer jobs posted this week"), parse those and only ask
about what's missing. Don't interrogate — one short batch of questions is plenty.

| Input | Required | Default | Notes |
|-------|----------|---------|-------|
| **Job title / keywords** | yes | — | e.g. `Senior Software Engineer`. Surrounding quotes are stripped automatically. |
| **Remote?** | no | `true` | If yes, every query is scoped to remote and location is ignored. |
| **Location** | no | — | Only used when remote is `false` (e.g. `Austin, TX`). |
| **Time window** | no | `any` | One of `any`, `hour`, `day`, `week`, `month` (recency filter on Google + LinkedIn). |
| **Extra boolean terms** | no | — | Optional. Raw terms appended to every query, e.g. `"Python" -contract`. Offer this only if the user wants to narrow results. |

Defaults mirror the portal page (remote-first, any time). If the user just says
"find me <role> jobs", confirm remote vs. location and time window, then proceed.

## Step 2 — Generate the links

Run the bundled generator from the skill directory:

```bash
node generate.mjs --job "<title>" [--remote true|false] [--location "<city>"] [--time any|hour|day|week|month] [--extra "<terms>"]
```

- `--job` is required; everything else is optional with the defaults above.
- Add `--json` if you need the structured data instead of markdown (rarely needed).

Example:

```bash
node generate.mjs --job "Senior Software Engineer" --remote true --time week
```

## Step 3 — Present the output

The script prints ready-to-use markdown: a header line (role, location, time
window, extra terms, source count) followed by the five category sections —
**Most popular**, **Remote-first job boards**, **Startups & scaleups**, **Big
companies & enterprise**, **Staffing Agencies & Niche Boards** — each a bullet
list of `[Source](url)` links.

Relay that markdown to the user as-is so the links render and are clickable. Do
not summarize away the links or drop categories. If the list feels long, you may
note that "Most popular" + "Remote-first" are the highest-yield categories, but
still include all five.

## Scope guardrails

- **Links only.** If the user wants you to actually open the searches, read
  postings, dedupe, or rank real openings, that is out of scope — say so and
  offer to hand them the links instead (or point them at the JSearch MCP /
  WebSearch as a separate step).
- Don't invent sources or alter the `site:` expressions — the authoritative list
  lives in `generate.mjs`. To add or change a source, edit that file (and keep it
  consistent with `jobSearchUrl.ts` in the portal).
