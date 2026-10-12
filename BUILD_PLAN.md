# SabiPass — 14-day build plan

Revised after mentor scoping advice and analysis of the Kenya winner (Ubuntu Voice).

**Governing principle: build for N, validate for 1.**
Languages and trades are registry entries, not code branches. The demo proves one complete
journey in one validated language/trade pair. The registry proves the scaling path.

---

## What changed from CONCEPT.md

| Dropped | Why |
|---|---|
| Marketplace (job posting, matching, commission) | Was doing double duty as business model and engagement loop; eats the sprint. Becomes a pitch slide: *training-centre subscription, stated as a hypothesis to validate.* |
| Payments / billing | Not needed to prove the idea. |
| Certificates | Replaced by a progress record, explicitly not a certificate. |
| Tutor matching, public uploads | Out of scope. |

| Added | Why |
|---|---|
| **Safety-flag escalation** | The one agentic surprise. See below. |
| MCQ recall over WhatsApp (reply `1`/`2`) | Feature-phone-compatible spaced recall; near-zero data. |
| Language + content-pack registries | Breadth as configuration, so breadth costs no demo risk. |

---

## The one agentic surprise

The Kenya winner's differentiator was not its Q&A. It was passive detection from ordinary
conversation leading to a private alert to a responsible party. Every other entry had a chatbot.

SabiPass's equivalent:

**When an apprentice describes their actual practice in a voice note — *"I join the earth to the
neutral"*, *"for the AC socket I run 1.5mm"* — the system recognises a safety-critical error,
corrects it citing the named regulation clause, and privately notifies their own trainer that this
apprentice needs supervision on that specific unit.**

Why it earns its place:

- Bad artisan wiring kills people in Nigeria. Real stakes, not rhetorical ones.
- It keeps the **trainer** engaged, and the trainer is what keeps the learner engaged. A quiz
  cannot do that.
- It only works when a learner describes real work, so no exam-prep bot can copy it.

**Privacy, stated on stage before a judge asks it:** the flag goes to *that learner's own* trainer
and nobody else; the learner is told it happened; the learner can view and delete the record. No
third-party reporting, no aggregate dashboards for institutions in v1.

---

## Scope

### Registries (build for N)

`config/languages.json` — four entries:

```
{ "code": "pcm", "name": "Nigerian Pidgin", "asr": "9jalingo", "tts": "9jalingo", "validated": false }
{ "code": "yo",  "name": "Yoruba",          "asr": "spitch",   "tts": "spitch",   "validated": false }
{ "code": "ha",  "name": "Hausa",           "asr": "spitch",   "tts": "spitch",   "validated": false }
{ "code": "ig",  "name": "Igbo",            "asr": "spitch",   "tts": "spitch",   "validated": false }
```

English is always available as the text fallback. Exactly one language gets `validated: true` by
demo day. The UI surfaces unvalidated languages as "preview — not yet trainer-reviewed." Never
hide it; the honesty is a credibility asset.

`content-packs/<trade>/pack.json` — five trade folders, identical schema, each declaring its
source documents and its named human reviewer. Only one is populated and reviewed for the demo.
The other four ship with the schema, the source list, and `reviewed: false`.

### The validated pair (validate for 1)

**Recommended: domestic electrical installation × the language of the trainer you actually secure.**

Five lessons, one skill cluster:
1. Cable sizing for socket vs lighting circuits
2. Earthing and why earth-neutral bridging kills
3. MCB / RCD selection and discrimination
4. Change-over and inverter tie-in
5. Testing and verification before energising

Trusted-source collection: ~15 pages of NSQ unit standard plus the relevant NEMSA wiring clauses,
**reviewed and signed off by one practising trainer whose name goes in the pack manifest.** One
reviewed corpus beats five scraped ones; this is the whole credibility claim.

### The complete journey (what the demo must prove)

1. Learner sends a voice note question in their language.
2. Sourced spoken answer returns, with the clause visible on screen and a text alternative.
3. Learner completes a practice task — **voice viva or photo evidence, no reading required.**
4. Day 3: outbound WhatsApp voice note asks a recall question; learner replies `1` or `2`.
5. Trainer privately receives a safety flag raised from step 1 or 3.
6. Progress record updates — five lines, trainer-countersigned, QR-viewable.

One minute on stage. No screen that is not load-bearing.

### Assessment split

- **Competency:** voice viva + photo evidence, scored against the specific unit standard clause.
  No reading or typing. This is the accessibility unlock — do not compromise it.
- **Recall:** MCQ, delivered as audio, answered with one keypress. Fast, cheap, feature-phone
  compatible.

MCQ distractors must be generated **only** from retrieved standard text, never free-form. Four
plausible wrong answers about earthing, authoritatively presented, is the worst failure this
project could ship.

### Connectivity

Five lessons pre-downloaded in the PWA (~1MB total audio). Retrieval needs a connection. Recall
answers queue offline and sync. Progress record verifies offline via QR.

---

## Schedule

| Days | Work |
|---|---|
| 1–2 | Speak with three learners and one trainer. Confirm the trade, secure the reviewer, **validate the language against real recorded speech before committing.** Gather permissioned material. |
| 3–5 | Content pack + retrieval + clause-level citations + text question path. Registries in place. |
| 6–7 | Audio in/out, safety-flag detection and trainer notification, deploy a complete demo. |
| 8–10 | Test with learners. Fix translation and ASR failures. Downloaded lessons. Day-3 recall loop. |
| 11–14 | Harden failures, measure one small learning outcome, progress record, pitch + **backup recording.** |

Cut-first list if days 11–14 compress: progress record, then the second-language preview sample,
then the photo-evidence path (keep voice viva).

---

## Instruction-file scaffolding — build this on day 1

The Kenya winner named its instruction files in the pitch. The accelerator is explicitly about
*using AI software development tools*, so this is a scoring dimension, not plumbing.

- `CLAUDE.md` — setup, test commands, privacy rules, safety rules, coding standards.
- `CAPSTONE_SPEC.md` — product vision, architecture, roadmap, the operating-constraints mapping.
- `.claude/skills/` — reusable workflows: ingest-and-review-a-content-pack, add-a-language,
  validate-citations, generate-grounded-MCQ, run-the-demo-script.

Show these in the deck. Most teams will not.

---

## Risks

- **ASR on accented speech with trade jargon** is the top technical risk. Trade-term lexicon bias
  list, confidence thresholds, spoken "I heard X — correct?" confirmation. Never let the demo
  hinge on one unrehearsed utterance. Have the backup recording.
- **Unvalidated languages going live.** Mitigated by the `validated` flag and labelling previews
  as previews.
- **Credential overreach.** Say precisely: this produces a progress record and an NSQF-aligned
  evidence portfolio, not a certificate. A real assessor still signs. You are throughput for an
  existing framework, not a rival to it.
- **Safety-flag false positives.** A wrongly flagged apprentice loses trust fast. Threshold
  conservatively, always show the learner what was flagged and why, always allow deletion.

---

## Open decision

Which single language/trade pair gets validated. Depends entirely on which trainer and which
three learners you can get on a call inside two days — pick by access, not by interest. The
registry means this choice is cheap to make late and cheap to change.
