# SabiPass — capstone specification

**Capstone theme:** Learning That Stays With You
**Tracks:** 3 (Guidance, Pathways & Opportunity) primary · 2 (Engagement) · 1 (Access & Discovery)

---

## 1. Vision

Nigeria's largest learning system is not school. It is the informal apprenticeship economy —
*igba-boi*/*nwa-boi*, auto-electrics, welding, tailoring, phone repair, solar and inverter
installation. Millions learn for three to seven years, entirely orally, in Pidgin, Hausa, Yoruba and
Igbo, from a master craftsman.

They acquire real skills. The skills stay invisible. No credential means no formal contract, no
asset finance, no pricing power, no portability between states or countries.

Nigeria already has the instrument to fix this: the **National Skills Qualifications Framework**,
with **Recognition of Prior Learning** explicitly designed to certify competence gained informally.
NBTE launched RPL in 2025 under a "Skills, Not Degrees" campaign.

Roughly **500 artisans** have been assessed nationwide since rollout. A single Lagos programme
certifying 201 tradespeople was national news.

The framework exists. The throughput does not, because assessment is human, in-person and scarce.

**SabiPass makes recognition-of-prior-learning assessment remote, voice-native and near-free.**

---

## 2. The learner

One group, for this build: **second- and third-year apprentice electricians** in the domestic
installation trade. They can describe their work fluently in Pidgin, read English slowly or not at
all, own a low-end Android or share one, and buy data in small bundles.

They are not short of training. They are short of *recognition*, and short of anyone correcting the
dangerous habits they picked up on site.

---

## 3. What makes this different from a tutor chatbot

Three things, in order of importance.

### 3.1 Safety-flag escalation — the agentic feature

When an apprentice describes their actual practice in a voice note — *"I join the earth to the
neutral"*, *"for the AC socket I run 1.5"* — the system recognises a safety-critical error,
corrects it citing the named clause, **and privately notifies their own trainer that this apprentice
needs supervision on that specific unit.**

The learner never asked for this. It is a side effect of talking about real work, which is why no
exam-prep bot can copy it.

It also solves retention from the other side: it keeps the **trainer** engaged, and the trainer is
what keeps the learner engaged. A quiz cannot do that.

Privacy is part of the feature, not a caveat: the flag goes to that learner's own trainer and
nobody else, the learner is told, and the learner can delete the record.

### 3.2 Assessment that needs no reading or writing

Competency is evidenced by **voice viva** ("tell me why 2.5mm² here and not 1.5mm²") and **photo
evidence** ("show me your termination and earth bond"), scored against the specific unit standard
clause, with spoken feedback.

MCQ is used only for spaced recall, delivered as audio and answered with one keypress so it works
on a feature phone.

### 3.3 Retrieval you can audit

The corpus is national unit standards, wiring regulations and OEM manuals — the documents an
assessor actually marks against. Not scraped blogs. Every answer carries a clause-level `ref`, and
below-threshold retrieval **refuses** instead of guessing.

Retrieval is local and lexical over an embedded pack. That is an architectural choice, not a
prototype shortcut: a question costs **0 KB of network**, works with the radio off, and is fully
inspectable by the trainer who reviewed the pack.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Channel          WhatsApp voice note  ·  PWA (offline) │
├─────────────────────────────────────────────────────────┤
│  Speech           ASR ──► lexicon bias list ──► text    │
│                   text ──► TTS ──► audio + text alt     │
│                   Spitch via local server; key stays    │
│                   server-side. Registry drives codes.   │
├─────────────────────────────────────────────────────────┤
│  Language         build time: npm run localize          │
│                   pack + 128 UI strings ──► locales/*   │
│                   ships with the pack, never fetched    │
│                   at ask time                           │
├─────────────────────────────────────────────────────────┤
│  Understanding    lexical retrieval over embedded pack  │
│                   searches English cues AND localized   │
│                   cues together (artisans code-switch)  │
│                   + trade-term lexicon expansion        │
│                   + confidence threshold ──► refuse     │
├─────────────────────────────────────────────────────────┤
│  Safety engine    deterministic rules from the pack     │
│                   severity ──► clause ──► correction    │
│                   CRITICAL/HIGH ──► trainer escalation  │
├─────────────────────────────────────────────────────────┤
│  Assessment       voice viva (rubric)  ·  photo evidence│
│                   ──► evidence ledger ──► trainer sign  │
├─────────────────────────────────────────────────────────┤
│  Retention        practice per lesson                   │
│                   spaced recall: day 3 ─ 10 ─ 30        │
│                   audio MCQ, one-keypress reply         │
├─────────────────────────────────────────────────────────┤
│  Record           progress record + evidence portfolio  │
│                   offline code · USSD · QR (online)     │
└─────────────────────────────────────────────────────────┘
```

Content packs: `content-packs/<trade>/pack.json` — passages with refs, lessons, rubrics, MCQs,
safety rules, lexicon, reviewer manifest. Five trade folders exist; one is populated and reviewed.

---

## 4a. Languages

Nigerian Pidgin, Hausa, Yoruba, Igbo and English. Switching language changes the question you
speak, the answer you read, the voice that reads it back, the lessons, the practice prompts, the
recall questions and the safety corrections.

Three rules hold it together:

1. **English is the authority.** Every other locale is a machine translation of it, each file is
   marked `reviewed: false`, the app says so on screen, and any translated answer keeps the English
   original one tap away.
2. **Translation is a build step.** `npm run localize` writes the locale once and ships it with the
   pack, so a learner on a weak connection asks, reads and listens with no round trip.
3. **Retrieval searches both languages at once.** The localizer translates each passage's search
   cues as well as its text, and the matcher searches English and localized cues together, because
   artisans keep the technical nouns in English inside a Yoruba or Hausa sentence.

Provider codes are recorded in `config/languages.json`. Pidgin is asymmetric: translate takes
`pcm`, speech takes `pi`, and `pcm`/`npe`/`en-NG`/`pidgin` are all rejected by the speech endpoint.

**Known limit.** Safety detection is regex over English and Pidgin. In Yoruba, Hausa and Igbo it
catches code-switched English terms offline, and re-scans through translation when a server is
reachable — the learner has their answer either way, so this only ever adds a flag, never delays
one. Full multilingual detection is the next thing to build.

---

## 5. Demo script

Run this end to end with the network off, except where marked.

1. **Ask** — tap the mic, say in Pidgin: *"I wan run wire for socket, 1.5 abi 2.5?"*
   Expect: spoken answer plus text, cable sizing passage, clause ref visible, `0 KB` data badge.

1a. **Switch to Yoruba** and tap the same example. Expect the whole screen in Yoruba — question,
   answer, clause still shown, the Yoruba voice reading it back, and the English original behind a
   tap. Do this with the network **off** to prove the locale is on the device. This is the moment
   that separates the project from a translation wrapper.
2. **Refusal** — ask something outside the pack: *"How I go fix generator carburettor?"*
   Expect: explicit refusal naming that no reviewed source covers it. This is the credibility
   moment — do not skip it.
3. **Safety escalation** — say: *"For the AC socket I just run 1.5 and I join earth to neutral."*
   Expect: two flags, severity stripes, clauses, corrections, and "your trainer has been notified"
   with view-and-delete controls.
4. **Learn** — open Lesson 2, play the audio, complete the voice viva. Expect rubric points scored
   with the missing one named.
5. **Recall** — fast-forward three days (labelled demo control). Expect the WhatsApp facsimile with
   an audio question answerable by pressing 1 or 2.
6. **Trainer** — switch to the trainer view. Expect the safety flags inbox and the countersign
   queue. Countersign one competency.
7. **Passport** — the countersigned line updates live. Show the offline verification code and USSD
   string with the network still off. Turn the network on for the QR.

Close on the roughly-500-assessed figure.

---

## 6. Roadmap

**Now (prototype):** one trade, one validated language, five lessons, the full journey above.

**Next (3 months):** trainer review tooling so a content pack can be assembled and signed off by a
practising trainer without engineering help. Promote a second language to validated. WhatsApp
Business API on the real channel. Field test with one training centre.

**Then (6–12 months):** evidence portfolios accepted into a live RPL assessment pathway with an
accredited assessor in the loop. Two more trades. Employer-side verification lookup.

**Commercial hypothesis, to validate — not built:** a training-centre subscription. Centres already
run cohorts and already employ the trainers who countersign; they need throughput and verifiable
outcomes. Secondary hypothesis: results-based financing from state skills agencies and donors who
fund training today and cannot verify outcomes.

Deliberately out of scope: payments, job matching, public course uploads, certificates.

---

## 7. Operating constraints

| Constraint | How it is met |
|---|---|
| Quality & credibility | Corpus is unit standards and regulations only; clause-level ref on every answer; refuses below threshold; named trainer reviewer in the pack manifest |
| Low bandwidth | 0 KB per question; lessons under 250 KB each; one-keypress recall; offline verification |
| Accessibility | No reading or writing required for competency; audio in and out; text alternative always rendered; one-keypress recall |
| Personalization without exclusion | The competency map is additive — it only says what you can add next; no profile gates access; anyone may attempt any unit |
| Privacy & security | Learner-owned evidence, deletable; selective disclosure; escalation only to their own trainer, always disclosed |
| Multilingual | Four Nigerian languages in the registry, one validated, previews labelled; English text fallback always |
| Local relevance | Nigerian standards and regulations, Nigerian trade vocabulary, built on the NSQF/RPL route that already exists |

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| ASR on accented Pidgin with trade jargon | Lexicon bias list, confidence threshold, spoken "I heard X — correct?" confirmation, example-utterance path, backup recording |
| Unvalidated language reaching a learner | `validated` flag enforced in UI, previews labelled |
| Safety-flag false positive damages trust | Conservative thresholds, learner always sees what was flagged and why, always deletable |
| Credential overreach | Never the word certificate; progress record and evidence portfolio; human assessor signs |
| Content pack quality | One reviewed pack beats five scraped ones; reviewer named in the manifest; unreviewed packs cannot be served |
