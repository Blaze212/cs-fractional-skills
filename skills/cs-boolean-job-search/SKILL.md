---
name: cs-boolean-job-search
description: Actively research live job openings by running boolean WebSearch queries across the same 73 ATS/job-board sources the CareerSystems portal /job-search page uses (LinkedIn, Greenhouse, Lever, Ashby, Workday, Remote OK, Wellfound, and more), then dedupe, filter, and return a RANKED shortlist of real postings with apply links. This skill executes the searches and reads the results — it does NOT just hand over links (use cs-boolean-job-search-links for links only). WebSearch-based; does not use the JSearch MCP. Use this skill whenever the user wants you to actually find / surface / shortlist openings — "find me jobs", "what <role> jobs are open", "search the job boards and show me what's out there", "any remote <role> roles hiring", "research openings for X and rank them". If the user only wants the search links or boolean strings, use cs-boolean-job-search-links instead.
---

# CS Boolean Job Search (WebSearch research)

Runs the portal's boolean job-search query set through Claude's **WebSearch**
tool, then dedupes, filters, and ranks the results into a shortlist of real
openings. Reuses the `site:` source map via the bundled `build_queries.mjs`, so
coverage matches the portal /job-search page and the `cs-boolean-job-search-links`
skill. **Engine is WebSearch only — do not use the JSearch MCP.**

## WebSearch realities (set expectations honestly)

- **No exact recency.** WebSearch has no `tbs`/`f_TPR` date filter. Treat the
  time window as a *post-filter*: read each result's visible posted date and drop
  stale ones; tell the user recency is best-effort.
- **Wildcard sources degrade.** `site:jobs.*`, `site:careers.*`, `site:talent.*`
  are Google-only tricks WebSearch largely ignores — off by default. The concrete
  domains (Greenhouse, Lever, LinkedIn, Remote OK, Workday, …) work fine.
- **Cost/volume.** A run is several WebSearches (≈11 with all categories). Narrow
  categories to keep it tight when the user only cares about, say, startups+remote.

## Step 1 — Gather inputs (interactive)

Parse what the triggering message already gives you, then ask only for gaps in
one short batch. Required: **job title/keywords**. Also collect: **remote vs.
location**, **time window** (post-filter), and the criteria that make ranking
meaningful — **seniority**, **comp floor**, **must-have keywords** (`--include`),
**exclude keywords** (`--exclude`), **target categories**, and **how many results**
to return (default ~10–15). Defaults mirror the portal: remote-first, any time.

## Step 2 — Build the batched queries

```bash
node build_queries.mjs --job "<title>" [--remote true|false] [--location "<city>"] \
  [--include "<must-have>"] [--exclude "term1,term2"] \
  [--categories popular,remote,startups,enterprise,staffing] [--batch-size 8]
```

Output is a small set of OR-combined boolean query strings grouped by category.
Use `--categories` to scope to what the user asked for. Add `--json` for
structured query data. (`--include-wildcards` exists but those rarely return
anything in WebSearch — leave off unless the user insists.)

## Step 3 — Run the searches and assemble candidates

1. Run **each** emitted query string with the **WebSearch** tool.
2. Collect candidate postings from the results (title, company, source/domain,
   URL, any visible location/comp/date in the snippet).
3. **Dedupe** — the same role appears on LinkedIn + its ATS + aggregators. Match
   on company+title (and apply URL when available); keep the most direct/apply
   link.
4. **Filter** by the user's criteria: drop wrong seniority, below comp floor,
   missing must-haves, matching exclusions, and (best-effort) outside the time
   window based on visible dates.
5. **Rank** by fit (title/seniority match, must-haves present, recency, directness
   of apply link).

## Step 4 — Depth: decide per run

Default to **snippets only** (rank on WebSearch titles/snippets — fast). When the
user wants more accuracy, or comp/date is missing for top candidates, offer a
**dig-deeper** step: `WebFetch` the top ~5–10 posting URLs to confirm details and
extract comp, posted date, and the canonical apply link. Ask before fetching if
it'll be more than a handful of pages.

## Step 5 — Present the shortlist

Return a ranked list (honor the requested count). Per opening:

> **<Title>** — <Company> · <Location/Remote> · <Comp if known> · posted <date if known>
> [Apply](<url>) — *one line on why it fits / caveats*

Close with a short note on coverage (which categories were searched, recency
caveat) and an **appendix of the raw boolean search links** for manual follow-up
— generate those by calling the sibling skill's generator:
`node ../cs-boolean-job-search-links/generate.mjs --job "<title>" [...same flags]`.

## Scope guardrails

- If the user only wants links / boolean strings (not researched results), defer
  to **`cs-boolean-job-search-links`**.
- Do not use the JSearch MCP here, even if available — this skill is WebSearch-only
  by design.
- Don't fabricate postings, comp, or dates. If a field isn't in the snippet and
  you didn't fetch the page, mark it unknown rather than guessing.
