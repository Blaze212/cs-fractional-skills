---
name: cs-job-fit-scorer
description: Score a job seeker's resume against a specific job description (JD) and surface a clear gap analysis. On first run, captures the user's resume (paste or upload) and stores it as a persistent reference file so future scoring runs don't have to re-ask. Optionally collects target preferences (titles, comp floor, location, deal-breakers) the same way. When a JD is pasted, produces 0–10 scores across title/level, industry, overlapping experience and responsibilities, IC vs leader fit, skills/tools match, years of experience, and an overall weighted score — plus a concrete gap analysis of what's missing or weak. Use this skill whenever the user pastes a job description and wants to know if it's a fit, asks "should I apply to this", "how well does my resume match this job", "score this JD", "rate this opportunity", "what gaps do I have for this role", or similar. Also trigger when the user uploads or pastes a resume and asks Claude to remember it for future job-fit checks. Trigger even if they don't explicitly say "score" — phrases like "is this role a stretch", "am I qualified for this", or "what would I need to learn" all call for this skill.
---

# CS Job Fit Scorer

Score a resume against a JD on 0–10, name the gaps, and tell the user where they actually stand. The goal is honest, useful signal — not flattery, not gatekeeping.

## When this skill runs

Two distinct phases:

1. **First-time setup** — if no resume is on file, capture it before scoring anything.
2. **Scoring a JD** — once the resume exists, score any pasted/uploaded JD against it.

These are handled in the same skill because they're tightly coupled — the resume is the anchor every score is computed against.

## Where state lives

All persistent state for this skill lives in a known folder so future runs can find it:

```
<workspace>/.cs-job-fit-scorer/
├── resume.md           # the user's resume in markdown
└── preferences.md      # optional: target titles, comp floor, location, deal-breakers
```

`<workspace>` is the user's connected workspace folder (the one they selected in Cowork, or their working directory in Claude Code). If no workspace is connected, fall back to the outputs folder and tell the user the resume will only persist within this session.

**Always check for these files first.** Before asking the user anything, read `resume.md` if it exists. Treat its presence as "we already know this person, jump straight to scoring."

## Phase 1: Capture the resume (first run only)

If `resume.md` doesn't exist:

1. Ask the user to paste their resume or upload it (PDF, DOCX, or plain text all fine).
2. If they upload a file, read it and convert to clean markdown. Preserve structure: contact info, summary, experience (with company, title, dates, bullets), education, skills/certifications.
3. Write the result to `<workspace>/.cs-job-fit-scorer/resume.md`.
4. Confirm: "Saved your resume. I'll reference it for every JD you score from now on. You can update it any time by saying 'update my resume'."

Then offer the preferences step:

> "Optional: do you want to tell me your target titles, comp floor, preferred location (remote/hybrid/onsite + geo), and any deal-breakers? It makes scoring more personalized, but you can skip it."

If they say yes, collect those answers conversationally and save to `preferences.md` in the same folder. If they say skip, move on — don't push.

If `resume.md` exists but they paste a new resume or say "update my resume", overwrite it and confirm.

## Phase 2: Score a JD

When the user pastes a JD (or a URL to one — fetch it first), and `resume.md` exists:

1. Read `resume.md` and `preferences.md` (if present).
2. Score each of the seven categories below on a 0–10 scale.
3. Compute the overall weighted score.
4. Surface the gap analysis.
5. Deliver the chat summary.

### Scoring categories (all 0–10)

Each category gets a score and a one-line justification. Scores follow this anchor scale:

- **9–10** Excellent fit — strongly meets or exceeds.
- **7–8** Good fit — meets with minor gaps.
- **5–6** Moderate fit — meets some, missing some.
- **3–4** Weak fit — significant gaps.
- **0–2** Poor fit — fundamentally mismatched.

**1. Title / level**
Does the resume show the user has held titles at or near this JD's level? A senior IC applying to a senior IC role scores high; a senior IC applying to VP scores lower (stretch), and a director applying to senior IC scores lower (over-leveled). Account for both directions of mismatch.

**2. Industry**
How well does the user's industry experience map to the JD's industry/domain? Direct industry match scores high. Adjacent industries (e.g., B2B SaaS → B2B fintech) score moderate. Completely unrelated industries score low unless the JD explicitly welcomes cross-industry candidates.

**3. Overlapping experience and responsibilities**
Read the JD's "responsibilities" and "what you'll do" sections. For each, find evidence in the resume that the user has done this kind of work before. Score reflects how much of the JD's actual job content the user has demonstrably done. This is usually the highest-signal category — weight your overall score accordingly.

**4. IC vs leader fit**
Determine whether the JD is IC, player-coach, or pure leadership (team size, scope, language like "build" vs "manage" vs "set strategy"). Determine the same about the user from their resume. Score the match. An IC applying to a heads-down IC role scores high; an IC applying to a pure people-management role scores low unless the resume shows mentoring/lead-IC patterns.

**5. Skills / tools match**
Extract the explicit skills, tools, frameworks, certifications, and methodologies the JD names. Check the resume for each. Score reflects coverage — but distinguish "must-have" skills from "nice-to-have" skills if the JD signals that distinction.

**6. Years of experience**
What does the JD ask for (e.g., "8+ years")? How many relevant years does the resume show? Within ±2 years scores high; significant under or over scores lower. Over-experience is real — penalize moderately, not severely.

**7. Overall score**
Not just an average. Weight the categories — overlapping experience/responsibilities and skills/tools usually matter more than industry or exact title. Use this weighting as a starting point, but adapt if the JD makes it clear something else matters more (e.g., a regulated-industry role where industry is critical):

- Overlapping experience/responsibilities: 30%
- Skills/tools match: 20%
- Title/level: 15%
- Years of experience: 10%
- Industry: 10%
- IC vs leader fit: 15%

If preferences exist and the JD violates a deal-breaker (e.g., onsite when user is remote-only, or comp below floor), flag it prominently — don't bury it in the overall score.

### Gap analysis

After the scores, list the most important gaps. Be specific and actionable. For each gap, name:

- **What's missing** (concrete: "no evidence of Kubernetes experience" not "weak on infrastructure")
- **How big a deal** (must-have vs nice-to-have based on JD signals)
- **What the user could do about it** (address in cover letter, learn it, reframe an existing bullet, or accept as a hard no)

Don't pad — if there are only two real gaps, list two. Three to five is typical.

## Output format

Deliver in chat. Use this structure exactly:

```
**Overall fit: X.X / 10**

| Category | Score | Note |
|---|---|---|
| Title/level | X | one-line justification |
| Industry | X | one-line justification |
| Experience/responsibilities | X | one-line justification |
| IC vs leader | X | one-line justification |
| Skills/tools | X | one-line justification |
| Years of experience | X | one-line justification |

**Gaps**
1. [Gap]. [How big a deal]. [What to do.]
2. ...

**Bottom line:** [One or two sentences — apply, apply with caveats, or pass, with the reason.]
```

If a deal-breaker from preferences was hit, lead with that above the score line:

```
**⚠ Deal-breaker hit:** [What — e.g., role is onsite NYC; you set remote-only.]
```

## How to read the resume and JD

A few patterns worth knowing:

- **Don't over-credit keyword matches.** "Mentioned Python" is not "wrote production Python." Look for evidence in bullets, not just skills lists.
- **Read between the lines on level.** A staff engineer who's been at one company for 8 years and a staff engineer who's hopped through 4 companies in 8 years aren't the same candidate; the resume usually tells you which kind via bullets.
- **JD inflation is real.** Many JDs list 15 "requirements" they don't actually need. If a requirement appears once at the bottom of a long list and isn't reflected in the responsibilities section, treat it as nice-to-have.
- **IC/leader is often murky.** Look for team size, direct reports, and whether bullets describe what the user *did* vs what the user *enabled others to do*. That distinction matters more than titles.

## Why honest scoring matters

The user is making a real decision with this score — apply or pass, spend hours tailoring a resume or move on. A skill that grades generously to feel encouraging wastes their time; a skill that grades harshly to seem rigorous makes them skip good opportunities. Calibrate to reality. If the fit is great, say so plainly. If it's a stretch, say that too, and explain what would close the gap.
