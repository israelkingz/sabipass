# SabiPass

Voice-first skill recognition for Nigeria's informal trades. An apprentice asks about the work in
their own language, gets an answer traceable to a national standard, proves competence by speaking
and by photograph, and builds a progress record their own trainer countersigns.

Read [CAPSTONE_SPEC.md](CAPSTONE_SPEC.md) for the architecture and the demo script,
[BUILD_PLAN.md](BUILD_PLAN.md) for scope, [CONCEPT.md](CONCEPT.md) for the market thesis, and
[CLAUDE.md](CLAUDE.md) for the rules that are bugs even when the tests pass.

---

## Run it

Node 20 or newer. No dependencies to install.

```bash
npm start
```

Open **http://localhost:8787**. Speech falls back to the browser's own engine until you add a key.

### Add real Nigerian-language speech

```bash
cp .env.example .env
```

Put a [Spitch](https://spitch.app) key in `SPITCH_API_KEY`, then `npm start` again. The console
tells you which engine is live. The key stays on the server — the browser never sees it, and all
speech goes through `/api/asr` and `/api/tts`.

Use **Chrome or Edge on `localhost`**: the microphone needs a secure context, and `localhost`
counts as one. Opening `index.html` as a `file://` URL will not work — the page fetches its
registries over HTTP.

### Build the languages

```bash
npm run localize              # all registry languages
npm run localize -- --only=yo # just one
```

This translates the content pack and every UI string into Nigerian Pidgin, Hausa, Yoruba and Igbo,
writing `content-packs/electrical-domestic/locales/<code>.json`. Takes roughly ten minutes per
language — Spitch serialises translate calls — and caches by content hash, so a re-run after an
edit only translates what changed.

**It runs at build time on purpose.** A learner on a weak connection must be able to ask, read and
listen in their own language without a translation round trip. The locale ships with the pack, so
retrieval stays local and the 0 KB promise stays honest.

### Check what your key actually supports

```bash
npm run diag
```

Round-trips every language: generates speech, transcribes it back, reports what worked. Use it to
decide which language gets `validated: true`. Set that flag from evidence, never from a vendor's
language list.

### Check everything

```bash
npm run check
```

Citations resolve, safety rules compile and fire on the right utterances, retrieval answers what it
should and refuses what it should, no more than one non-English language claims to be validated,
and **every locale is actually translated** — a translate call that silently falls back leaves a
file that is structurally perfect and entirely English, which happened once and is now a test.

---

## How speech is wired

```
browser                          server (node)                    Spitch
───────                          ─────────────                    ──────
MediaRecorder
  └─ decode → 16 kHz mono WAV
       └─ POST /api/asr ────────► + lexicon as special_words ────► POST /v1/transcriptions
                                                                    └─► { text }
  speak(text)
       └─ POST /api/tts ────────► + voice from the registry ──────► POST /v1/speech
                                                                    └─► audio/wav
       └─ cached per phrase, so replaying a lesson costs nothing
```

Three things worth knowing:

**The pack's trade lexicon is the ASR bias list.** `change over`, `earth leakage`, `2.5`, `soka`,
`megger` — the words a general model mishears are exactly the words that carry the meaning. The
server pulls them from `content-packs/*/pack.json` and sends them as `special_words` on every
transcription. The lexicon is not decorative.

**Audio is re-encoded to 16 kHz mono WAV in the browser.** Spitch accepts wav/mp3/m4a/ogg and
MediaRecorder produces webm, so the page decodes and resamples before upload. 16 kHz mono is about
32 KB per second — small enough for a weak connection, and the app shows you the real byte count.

**Retrieval never touches the network.** Finding the answer and its clause reference is local,
lexical, and runs against the embedded pack. That is an architectural choice for a low-bandwidth
context, not a prototype shortcut. Only speech crosses the wire.

---

## How the languages work

Pick a language and everything changes with it: the question you speak, the answer you read, the
voice that reads it back, the lessons, the practice prompts, the recall questions and the safety
corrections.

**Retrieval works in-language, offline.** The localizer translates each passage's *cues* as well as
its text, and the matcher searches the English cues **and** the localized ones together. Nigerian
artisans code-switch constantly — the technical nouns stay English inside a Yoruba or Hausa
sentence — so matching both is what actually works on site.

**English is the authority.** Every other locale is a machine translation of it, each file is
marked `reviewed: false`, and the app says so on screen. Any answer shown in another language keeps
the English original one tap away.

**Pidgin's codes are asymmetric**, which cost an hour to discover: translate takes `pcm`, speech
takes `pi`. `pcm`, `npe`, `en-NG` and `pidgin` are all rejected by the speech endpoint. Both codes
are recorded in `config/languages.json`.

### Known limit: safety detection is not fully multilingual

The safety rules are regexes over English and Pidgin. For Yoruba, Hausa and Igbo they catch only
code-switched English terms, so when a server is reachable the app re-scans the utterance through
translation and adds any flag it finds. The learner already has their answer by then, so this only
ever adds a flag, never delays one. Offline, in those three languages, detection is weaker than in
Pidgin — the app says so, and this is the next thing to fix.

---

## Repository

```
index.html                              the whole app — no framework, no build step
server/serve.js                         static files + /api/health, /api/asr, /api/tts
server/spitch.js                        the only file that knows about Spitch
server/diag.js                          language round-trip probe
config/languages.json                   language registry — add a language by adding a row
content-packs/electrical-domestic/      passages, lessons, rubrics, recall MCQs, safety rules, lexicon
tools/check-pack.js                     citation, safety, retrieval and registry checks
```

Adding a language is a row in `config/languages.json`. Adding a trade is a folder under
`content-packs/`. If either needs a code change, the abstraction is wrong — fix the abstraction.

---

## Current state

The content pack is marked `reviewed: false` and the app says so on screen. The technical content
is drafted from NESIS 2015, NIS IEC 60364 and NBTE unit standards, but the clause references need
a practising trainer to countersign them before any learner is served.

No non-English language is marked validated. That is accurate, not an oversight: `npm run diag`
proves the provider accepts a language code, which is not the same as proving the model handles a
real apprentice's accent on a noisy site. That needs three learners and a trainer.

Those two signatures are the highest-value work left, and neither of them is code.
