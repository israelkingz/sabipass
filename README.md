# SabiPass

**Voice-first skill recognition for Nigeria's informal trades.**

An apprentice asks about the work by speaking, in their own language. They get an answer traceable
to a national standard, with the clause shown. They prove competence by talking and by
photographing their own work — never by multiple choice. And what they prove goes into a progress
record their own trainer countersigns.

Built for the *Learning That Stays With You* capstone. Track 3 (Guidance, Pathways & Opportunity)
primary, with Track 2 (Engagement) and Track 1 (Access & Discovery).

---

## Why

Nigeria's largest learning system is not school. It is the informal apprenticeship economy —
*igba-boi*, auto-electrics, welding, phone repair, solar and inverter installation. Millions learn
for years, orally, in Pidgin, Hausa, Yoruba and Igbo. They acquire real skills that stay invisible:
no credential means no formal contract, no asset finance, no pricing power, no portability.

The instrument to fix this already exists. Nigeria's **National Skills Qualifications Framework**
recognises skills learned informally, through **Recognition of Prior Learning**, launched by NBTE
in 2025. Roughly **500 artisans** have been assessed nationwide since then, because assessment is
human, in-person and scarce.

The framework exists. The throughput does not. SabiPass makes that assessment remote, voice-native
and near-free.

---

## Quickstart

**Requirements:** Node 20 or newer. Nothing to install — there are no dependencies.

```bash
git clone https://github.com/israelkingz/sabipass.git
cd sabipass
npm start
```

Open **http://localhost:8787**. It runs immediately, using the browser's own speech engine.

### Add real Nigerian-language speech

```bash
cp .env.example .env     # then put a Spitch key in SPITCH_API_KEY
npm start
```

Get a key from [spitch.app](https://spitch.app). The console prints which engine is live. **The key
stays on the server** — the browser never sees it; all speech goes through `/api/asr`, `/api/tts`
and `/api/translate`.

Use **Chrome or Edge on `localhost`**: the microphone needs a secure context, and `localhost` is
one. Opening `index.html` as a `file://` URL will not work — the page fetches its registries over
HTTP.

---

## Commands

| Command | What it does |
|---|---|
| `npm start` | Run the app at http://localhost:8787 |
| `npm run check` | Citations, safety rules, retrieval behaviour, locale completeness. No API calls, no key needed. |
| `npm run localize` | Build the language files. `-- --only=yo` for one. Cached by content hash. |
| `npm run diag` | Round-trip every language through the provider and report what works |
| `npm run check:audio` | Prove each language speaks its own localized content |
| `npm run review` | Rank translated strings by how likely they are to need correction |

---

## What it does

**Asks and answers by voice, in five languages.** Nigerian Pidgin, Hausa, Yoruba, Igbo and English
through [Spitch](https://spitch.app). Switching language changes everything with it: the question
you speak, the answer you read, the voice reading it back, the lessons, the practice prompts, the
recall questions and the safety corrections.

**Answers are traceable, and refusals are deliberate.** Twenty passages from NESIS 2015, NIS IEC
60364 and NBTE unit standards — the documents an assessor marks against, not scraped web pages.
Every answer carries a clause reference. Below a confidence threshold it refuses and says why:
asked how to fix a generator carburettor, it declines rather than guessing.

**Finding the answer costs no data.** Retrieval is lexical and runs on the device against the
shipped pack: zero bytes of network per question, working with the radio off. Translation happens
once at build time and ships with the pack. The app shows its own real byte count.

**Retrieval works in the learner's language, offline.** The build step translates each passage's
search cues as well as its text, and the matcher searches English and localized cues *together* —
Nigerian artisans code-switch constantly, keeping technical nouns in English inside a Yoruba or
Hausa sentence.

**Competence is assessed by speaking and by photograph.** A voice viva is scored against the unit
standard's rubric points and names the one you missed. No reading or typing is required anywhere,
which is the accessibility argument: an apprentice literate in Hausa but not English is assessed on
their trade, not their English.

**Multiple choice is for recall only.** Day 3, 10 and 30, a question arrives as audio and is
answered with one keypress — works on a feature phone, costs almost nothing. Miss one and the
lesson returns to the list.

**Describing unsafe practice notifies the trainer.** When an apprentice says what they actually did
— *"for the AC socket I just run 1.5, and I join the earth to the neutral"* — SabiPass corrects it
with the clause and **privately tells that apprentice's own trainer they need supervision on that
unit.** The learner never asked for it; it is a side effect of talking about real work, which is
why no exam-prep bot can copy it. It also keeps the *trainer* engaged, and the trainer is what
keeps the learner engaged.

A question never raises a flag — only a description of practice does. The learner is always told,
can see exactly what was sent, and can delete it. Nothing goes to any third party.

**The output is a progress record, not a certificate.** Five competencies with their evidence,
countersigned by the trainer, verifiable offline by short code or USSD and online by QR. It exports
as an NSQF-aligned evidence portfolio, which collapses an assessor's job from running a day-long
centre to reviewing and endorsing. An accredited assessor still signs.

---

## How the speech is wired

```
browser                          server (node)                    Spitch
───────                          ─────────────                    ──────
MediaRecorder
  └─ decode → 16 kHz mono WAV
       └─ POST /api/asr ────────► + lexicon as special_words ────► POST /v1/transcriptions
  speak(text)
       └─ POST /api/tts ────────► + voice from the registry ─────► POST /v1/speech
       └─ cached per phrase, so replaying a lesson is free
build step
       └─ POST /api/translate ──► pack + UI strings ─────────────► POST /v1/translate
                                   └─► locales/<code>.json
```

**The pack's trade lexicon is the ASR bias list.** `change over`, `earth leakage`, `2.5`, `soka`,
`megger` — the words a general model mishears are the words that carry the meaning. The server
sends them as `special_words` on every transcription.

**Audio is re-encoded in the browser.** Spitch takes wav/mp3/m4a/ogg and MediaRecorder produces
webm, so the page decodes and resamples to 16 kHz mono first. About 32 KB per second.

**Pidgin's provider codes are asymmetric.** Translate takes `pcm`, speech takes `pi`. `pcm`, `npe`,
`en-NG` and `pidgin` are all rejected by the speech endpoint. Both codes are in the registry.

---

## Layout

```
index.html                              the whole app — no framework, no build step
server/serve.js                         static files + /api/health, /api/asr, /api/tts, /api/translate
server/spitch.js                        the only file that knows about Spitch
server/diag.js                          language round-trip probe
config/languages.json                   language registry — add a language by adding a row
config/ui-en.json                       source-of-truth UI strings
content-packs/electrical-domestic/
  pack.json                             passages, lessons, rubrics, recall, safety rules, lexicon
  locales/<code>.json                   built by npm run localize
tools/check-pack.js                     citation, safety, retrieval and locale checks
tools/localize.js                       builds a language
tools/check-audio.js                    proves each language speaks its own content
tools/review-queue.js                   ranks translations by likelihood of error
```

Adding a language is a row in `config/languages.json`. Adding a trade is a folder under
`content-packs/`. If either needs a code change, the abstraction is wrong — fix the abstraction.

Project documents: [CAPSTONE_SPEC.md](CAPSTONE_SPEC.md) (architecture), [DEMO.md](DEMO.md) (the three-minute script), [SKILLS.md](SKILLS.md) (reusable workflows),
[PROPOSAL.md](PROPOSAL.md), [BUILD_PLAN.md](BUILD_PLAN.md) (scope and schedule),
[CONCEPT.md](CONCEPT.md) (market thesis), [AGENTS.md](AGENTS.md) (the rules that count as bugs even
when the tests pass).

---

## Status

| | Content | Audio | Round trip |
|---|---|---|---|
| Nigerian Pidgin | 97% translated | voice `boma` | ✅ |
| Hausa | 100% translated | voice `amina` | ✅ |
| Yoruba | 100% translated | voice `sade` | ✅ |
| Igbo | 100% translated | voice `ngozi` | ✅ |
| English | source | voice `lucy` | ✅ |

Round trip means the app's own localized text was spoken through Spitch and transcribed back
successfully, verified by `npm run check:audio`.

Language selection is driven entirely by `config/languages.json`. Adding Fulfulde, Kanuri or Tiv is
a row in that file plus one `npm run localize` run — no application code changes.

---

## Tests exist because of mistakes

Each of these shipped once and is now a check:

- A Yoruba build came back **100% English** — structurally perfect, every key present, entirely
  untranslated, because the batch separator did not survive the translation API and every list fell
  back silently. `npm run check` now fails a locale whose full sentences are more than 40%
  identical to English.
- A learner asking *"socket — 1.5 or 2.5?"* was **reported to their trainer** for a safety
  violation. Questions and descriptions of practice are now distinguished by a guard that lives in
  the pack where a trainer can read it.
- *"my tailoring machine no dey work"* was answered with **air-conditioner circuit guidance**,
  because the lexicon matched `ac` inside `machine`. Lexicon keys now match on word boundaries.
- `Ib ≤ In ≤ Iz` came back in Yoruba as **`Ib Capitol In Capitol Iz`** — the translator read `≤` as
  the word "Capitol" — and `230/400V` lost its 230 entirely. `npm run review` now ranks every
  translated string by how likely it is to be wrong: lost symbols, changed numbers, suspicious
  length changes.

---

## Licence and credits

Content is drafted from NESIS 2015, NIS IEC 60364 and NBTE NSQ unit standards, which remain the
property of their publishers. Speech and translation by [Spitch](https://spitch.app).

Built with Claude Code as an engineering partner, organised around the instruction files in this
repository.
