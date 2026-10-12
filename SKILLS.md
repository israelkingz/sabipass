# SKILLS.md — reusable workflows

Task-specific guidance for working on SabiPass. Read `AGENTS.md` first for the rules that hold
across every task.

Every workflow here is **executable**, not described. A skill that only exists as prose drifts away
from the code; these run, and they fail the build when the rule is broken.

---

## Skill: add a language

Breadth is configuration. Adding a language must never touch application logic — if it does, the
abstraction is wrong, fix the abstraction.

1. Add a row to `config/languages.json`:
   ```json
   {
     "code": "ff", "name": "Fulfulde", "endonym": "Fulfulde",
     "asr": { "provider": "spitch", "language": "ff" },
     "tts": { "provider": "spitch", "language": "ff", "voice": "<voice>" },
     "translate": { "provider": "spitch", "target": "ff", "formality": "casual" },
     "webSpeechFallback": null,
     "validated": false, "validatedBy": null, "notes": "<who it serves, what is unproven>"
   }
   ```
2. `npm run diag` — confirm the provider accepts those codes both ways. **Codes are not symmetric.**
   Nigerian Pidgin takes `pcm` for translate and `pi` for speech; `pcm`, `npe`, `en-NG` and
   `pidgin` are all rejected by the speech endpoint. Probe, never assume.
3. `npm run localize -- --only=ff`
4. `npm run check` — locale complete, and not silently English.
5. `npm run check:audio` — the app's own localized text speaks and transcribes back.
6. `npm run review -- --lang=ff` — fix what ranks urgent.
7. Leave `validated: false`. It is set from field evidence, never from a vendor's language list.

**Failure mode this prevents:** a language that looks wired, renders fine, and serves English.

---

## Skill: add a trade

1. `content-packs/<trade>/pack.json`, same schema as `electrical-domestic`.
2. Passages first. Each needs `id`, `lesson`, `ref` (clause-level), `source`, `topic`, `cues`,
   `answer`, `spoken`. The `ref` is not optional and not approximate.
3. Lexicon next — the trade's vernacular mapped to standard terms. This is doing three jobs at
   once: query expansion, the ASR bias list, and the highlight in the learner's own words. Weak
   lexicon, weak everything.
4. Safety rules with `patterns`, `severity`, `escalate`, `correction`, `ref`, `unit`.
5. Lessons, rubrics, recall MCQs.
6. `npm run check` then `npm run localize`.

**Sources must be standards, regulations or OEM manuals.** Never scraped articles. The whole
credibility claim is that a learner can see the clause an assessor would mark against.

---

## Skill: write a safety rule

```json
{
  "id": "s-<short-slug>", "severity": "critical|high|medium", "escalate": true,
  "label": "<what is wrong, in five words>",
  "patterns": ["<regex>", "..."],
  "correction": "<what to do instead, and the physical consequence of not doing it>",
  "ref": "<clause>", "unit": "<NSQ unit>"
}
```

Rules:

- Patterns match **described practice**, never questions. The `assertionGuard` in the pack enforces
  this globally, but write patterns that would not fire on a question anyway.
- `correction` says what happens to a person if this is left alone. "Disconnect that bridge" is
  weaker than "a break in the neutral upstream puts line potential on every appliance casing."
- `escalate: true` only for critical and high. A false positive costs more trust than a missed
  flag, because a learner reported for asking a question stops talking.
- Add the utterance to the case list in `tools/check-pack.js`, including one near-miss that must
  **not** fire.

**Test both directions.** Every rule needs an utterance that triggers it and one that looks similar
and must not.

---

## Skill: fix a bad translation

`npm run review` ranks every string by how likely it is to be wrong — lost symbols, changed
numbers, safety corrections, suspicious length changes. Work from the top.

Two different fixes:

- **The translator had no chance.** Bare `≤`, `²`, `Ω` do not survive — `Ib ≤ In ≤ Iz` came back in
  Yoruba as `Ib Capitol In Capitol Iz`. Fix the **English source** in `pack.json` to use words, and
  all languages improve at once.
- **The translation is just wrong.** Correct it in `content-packs/<trade>/locales/<code>.json`
  directly, and add the English source string to the cache-busting list so the next
  `npm run localize` does not overwrite it.

Then `npm run localize` — cached by content hash, so only changed strings are paid for again.

---

## Skill: verify before a demo

In this order. Do not skip step 5.

1. `npm run check` — offline, no key needed.
2. `npm run check:audio` — every language speaks its own content.
3. `npm run diag` — provider still accepts every code.
4. Walk the seven-step script in `CAPSTONE_SPEC.md` end to end **with the network off**.
5. **Record the whole run as a backup video.** ASR on accented speech with trade jargon is the top
   technical risk and the demo must never depend on one unrehearsed utterance.

---

## Skill: debug retrieval

Symptoms and causes, in the order they actually occur:

| Symptom | Look at |
|---|---|
| Wrong passage answered confidently | Lexicon substring match. Keys match on word boundaries — `ac` must not fire inside `machine`. |
| Should have refused, answered instead | `THRESHOLD` and `MIN_CUES` in `index.html`. Two gates, not one: score alone let "generator carburettor" reach the changeover passage on one word. |
| Right answer, wrong language | `pCues` is not merging localized cues, or the locale did not load. Check the Network tab for `locales/<code>.json`. |
| Nothing matches in Yoruba or Hausa | The locale's `cues` fell back to English during localize. `npm run review` will show it. |

Retrieval is deliberately lexical and local: 0 KB per question, works offline, inspectable. Do not
replace it with an embedding call without solving offline first.

---

## Skill: ship a change

1. `npm run check` must pass. It is not advisory.
2. If content changed: `npm run localize`, then `npm run check` again.
3. If the speech path changed: `npm run check:audio`.
4. Never commit `.env`. Confirm with `git check-ignore -v .env` before pushing.
5. Scan staged content for credentials before every push to a public remote.
