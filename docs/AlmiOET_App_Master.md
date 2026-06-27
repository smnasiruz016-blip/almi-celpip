# AlmiCELPIP — App Master / Copy Doc

*The single source of truth for the AlmiCELPIP practice app: verified DET format, scoring model, v1 scope, honesty + IP doctrine, and the user-facing copy. Engine forked from AlmiTOEFL; item-bank model ported from AlmiPTE. Prepared 2026-06-24.*

> Standing rule: every fact in §2 is re-verified from the test-maker's own materials at build time. Formats change (Interactive Speaking landed 2025; Read Aloud was removed). Re-check before each major content push.

---

## 0. Phase-0 verification record (verified 2026-06-24)

Sources: englishtest.duolingo.com + OET blog/handbook + corroborating third-party prep sites (goarno, abroadcube, leverageedu, scholastictestmasters). Corrections vs. the original roadmap assumptions:

- **Interactive Speaking** was added **July 1, 2025** (NOT 2026); it replaced "Listen, Then Speak." Deferred from v1 regardless.
- **Read Aloud has been removed** from the current test (dropped to preserve length when Interactive Speaking was added). It is **not** in the current question-type inventory. → v1 substitutes **Speak About the Photo**.
- **Fee is $70 USD** for a single test (2-test bundle $118 ≈ $59/test); same price in every country.
- **Overall score**: DET's published illustrations compute overall as the average of the four skill scores; the four *integrated* subscores are each the average of two skills. DET's real overall is an adaptive/IRT estimate, not a public arithmetic formula. **AlmiCELPIP does not compute or display an overall** — see §3.

Confirmed unchanged: 10–160 scale in increments of 5; ~60 min, 3 sections; adaptive; AI-scored; results in ~48h; valid 2 years.

---

## 1. Product identity

- **Name:** AlmiCELPIP — Canadian English Language Proficiency Index Program practice
- **Subdomain:** `almicelpip.almiworld.com`
- **Repo / Vercel project:** `almi-celpip` (owner `smnasiruz016-blip`, Vercel org `almiworld`), own Neon DB
- **Session cookie:** `almi_celpip_session` (do NOT inherit `almi_prep_session`)
- **Stripe metadata:** `product: "almi-celpip"`
- **Theme:** warm family palette — cream/coral/teal, **no gold**. DET accent: **coral-forward with an amber-honey secondary** (`--color-almi-accent: #F4A340`) to read distinct from AlmiTOEFL's teal-secondary without leaving the warm family. Ink/text/bg tokens unchanged from the family.

---

## 2. The DET format AlmiCELPIP must match (authoritative)

**Structure (~60 min, 3 sections):**
1. **Introduction & setup (~5 min, unscored)** — rules, mic/camera check.
2. **Adaptive test (~45 min)** — interleaved reading/writing/listening/speaking micro-tasks; difficulty adjusts to performance.
3. **Video interview + writing & speaking sample (~10 min)** — open-ended prompts; samples sent to institutions alongside the score.

**Scoring scale:** 10–160, **in increments of 5**. Reported as four skill scores (Reading, Writing, Listening, Speaking) plus four integrated subscores.

**Four integrated subscores (each on 10–160):**
| Subscore | Combines | Real-world meaning |
|---|---|---|
| **Literacy** | Reading + Writing | Reading and writing in print |
| **Comprehension** | Reading + Listening | Understanding what you read and hear |
| **Conversation** | Speaking + Listening | Real-time interactive exchange |
| **Production** | Speaking + Writing | Producing language in speech and writing |

**Logistics:** $70 single test; results in ~48 h (faster paid tiers); scores valid 2 years; taken at home with webcam proctoring; accepted widely for university admission (see SEO-layer doctrine — admission ≠ visa).

---

## 3. AlmiCELPIP scoring model (honesty-first)

**Non-negotiable: AlmiCELPIP never fabricates a single 10–160 overall.** DET's overall is a proprietary adaptive estimate we cannot and will not reproduce. Instead:

- Each practice task yields honest **practice points** (`pointsEarned / pointsMax`) — deterministic for objective tasks, trait-based for productive tasks.
- Points roll up into a **per-subscore practice estimate expressed as a RANGE** on the 10–160 scale (e.g. *"Comprehension: practice estimate 95–110"*), never a single precise number.
- The four subscores are shown as four ranges. No combined "overall DET score" is displayed — instead a coarse **readiness band** label (see §6).
- Every estimate carries the disclaimer: **"Practice estimate — not an official DET result."**

**Hybrid scoring split (ported from AlmiPTE / AlmiTOEFL):**
- **Objective tasks** (Read and Select, Listen and Type): deterministic auto-marking with leniency (case/punctuation-insensitive, typo tolerance) → exact practice points. No AI.
- **Productive tasks** (Write About the Photo, Speak About the Photo): Sonnet (`claude-sonnet-4-6`) returns qualitative traits → mapped to a conservative point band. Structured output is **plain-typed JSON Schema + Zod-after-parse** (the family's min/max-400 workaround). Speaking uses Whisper transcript + honest "estimated from transcript, not acoustic analysis" disclaimer.

The point→subscore mapping is a **documented practice heuristic**, conservative by design, clearly labelled as ours and not DET's algorithm.

---

## 4. v1 task list (locked after Phase-0 correction)

Four tasks — two objective (deterministic path), two productive (AI path) — covering all four skills and all four subscores:

| Task | Skill | Feeds subscores | Scoring path |
|---|---|---|---|
| **Read and Select** | Reading | Literacy, Comprehension | Deterministic |
| **Listen and Type** | Listening | Comprehension, Conversation | Deterministic |
| **Write About the Photo** | Writing | Literacy, Production | AI (text) |
| **Speak About the Photo** | Speaking | Conversation, Production | AI (Whisper transcript) |

All four tasks are built end to end (objective auto-marked; productive AI-graded with Whisper for speaking).

**Adaptivity (BUILT — difficulty-pool):** objective tasks run as 5-question adaptive sets whose difficulty pool (FOUNDATION/CORE/STRETCH) moves with performance as you go; AI tasks pick their difficulty from the user's recent history. Copy: *"questions adjust to your level."* This is honest difficulty-pool adaptivity and never claims to reproduce DET's proprietary adaptive/IRT scoring engine.

**Full-length mock (BUILT):** one item per task type across all four skills, aggregated into the four honest subscore ranges + a readiness band. Still no fabricated overall.

**Deferred (NOT in this build), honestly labelled:**
- Video-interview / webcam section
- Interactive Speaking (conversational AI), Interactive Reading/Listening
- Any reproduction of DET's exact adaptive/IRT scoring engine (we never claim this).

---

## 5. Honesty + IP doctrine

- **100% original practice material — "never copied from OET."** All stimuli (words, audio scripts, photos/prompts) are written from scratch. Codified in (a) every AI evaluation system prompt, and (b) user-facing copy. (Mirrors AlmiPTE "never copied from Pearson" / AlmiTOEFL "never copied from ETS".)
- **No score guarantees, no inflation.** Honest trait feedback; if a response is weak, say so constructively (banned: "weak/poor/wrong/failed"; preferred: "improvement opportunity").
- **Practice estimate, not an official result** — present on every result surface.
- **No fabricated overall** (§3).

---

## 6. Readiness-range presentation (results UX spec)

Results page shows, per attempt and cumulatively:
- **Four subscore range cards** — Literacy / Comprehension / Conversation / Production, each a 10–160 range + a CEFR-ish hint, marked "practice estimate."
- **A readiness band label**, not a number — coarse buckets derived from the subscore ranges:
  - *Foundational* · *Developing* · *Approaching readiness* · *Strong practice range*
- **Per-task feedback** — points + 2–3 honest improvement notes.
- **The standing disclaimer line** (below).

---

## 7. User-facing copy blocks (review these before wiring)

**Hero (landing / app home):**
> **Practise the Canadian English Language Proficiency Index Program with honest AI feedback.**
> Original practice tasks on the real 10–160 scale, with a clear estimate of where your Literacy, Comprehension, Conversation, and Production sit — so you know what to work on next.

**Practice-estimate disclaimer (every result surface):**
> This is a practice estimate to guide your prep — not an official Canadian English Language Proficiency Index Program result. Your real score comes only from an official test.

**"Never copied" line (practice hub + each picker):**
> Every task here is written from scratch by AlmiCELPIP. We never copy or reproduce OET's test material.

**"Full-length practice" label (mock surface):**
> A full-length practice run across all four skills. The real test is adaptive; this practice uses fixed task sets so you can rehearse the format end to end.

**Per-task intros (reconciled with the shipped registry blurbs):**
- *Read and Select:* "Mark the words that are real English words and leave the invented ones unmarked — quick reading recognition."
- *Listen and Type:* "Listen to a short sentence and type exactly what you hear. Replays are limited, so listen closely."
- *Write About the Photo:* "Write at least 50 words describing the scene. You'll get honest feedback on relevance, range, and clarity."
- *Speak About the Photo:* "Speak about the scene for up to 90 seconds. We estimate from a transcript of what you said — not from your accent or audio."

**Adaptive practice line (hub / session):**
> Adaptive practice — questions adjust to your level.

(Honesty: this is difficulty-pool adaptivity and must NOT claim to match DET's exact scoring engine.)

**Results framing (subscore card subtitle):**
> Practice estimate on the 10–160 scale. We show a range, not a single number, because honest prep means showing the uncertainty.

---

## 8. Banned-verb compliance

Copy above avoids the AlmiWorld hard-ban list (discover/unlock/dream/transform/empower/journey/aspire/limitless) and minimises soft-flag verbs (start/now/today/build). A banned-verb sweep runs before every commit.

---

## 9. Build sequence (reference)

- **Phase 0:** verify (done) → this doc → scaffold (`almi-celpip` repo + Neon + Vercel + env; fork TOEFL chassis; strip `toefl-*` SEO + `lib/toefl` data; rename cookie; fix stale `plans.ts`/Stripe-metadata comments).
- **Phase 1:** `lib/det/scale.ts` (10–160/5, subscore map, readiness range, **no average-overall**); port item-bank (`DetItem ↔ DetAttempt`, `payload Json` + `pointsEarned/pointsMax`); data-driven `taskType → {composer, evaluator, scorer}` registry.
- **Complete build:** all four tasks end-to-end (Read and Select, Listen and Type, Write About the Photo, Speak About the Photo); difficulty-pool adaptive sets; full-length mock aggregating the four subscore ranges + readiness; billing ($12/mo + 7-day trial, objective free / AI paid, email verify, owner bypass). Remaining = founder provisioning (Neon + Vercel + env), seed (`npm run seed:all`), then launch.
