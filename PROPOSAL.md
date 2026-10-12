# SabiPass — capstone proposal

*Learning That Stays With You · Track 3 (Guidance, Pathways & Opportunity) primary, with Track 2
(Engagement) and Track 1 (Access & Discovery)*

---

An apprentice spends the day watching an experienced electrician work. Later a question comes
up — but the trainer has gone home, the explanations online are hard to follow and written for
somebody else's wiring regulations, and the apprentice would rather ask in Yoruba or Pidgin than
type in English. That is the moment I am building for.

SabiPass is a voice-first learning companion for Nigerian artisans and apprentices. They ask a
question by speaking, in their own language. They get a short spoken explanation that comes from a
national standard and shows the clause it came from. They practise by talking and by photographing
their own work, not by picking A, B, C or D. And what they prove gets recorded in a form their own
trainer signs.

**The problem is not training supply. It is recognition supply.** Nigeria's National Skills
Qualifications Framework already recognises skills learned informally, through Recognition of Prior
Learning, launched by NBTE in 2025. Roughly 500 artisans have been assessed nationwide since then,
because assessment is human, in-person and scarce. The framework exists; the throughput does not.

---

## What is built

A working prototype, running as a local Node app and as a published mobile page.

**Ask by voice, in five languages.** Nigerian Pidgin, Hausa, Yoruba, Igbo and English, through
Spitch for speech-to-text and text-to-speech. Switching language changes everything with it: the
question you speak, the answer you read, the voice that reads it back, the lessons, the practice
prompts, the recall questions and the safety corrections. All 128 interface strings and the whole
content pack are translated.

**Answers are traceable, and refusals are deliberate.** The retrieval corpus is twenty passages
drawn from NESIS 2015, NIS IEC 60364 and NBTE unit standards — the documents an assessor actually
marks against, not scraped web pages. Every answer carries a clause-level reference. When
confidence is below threshold the app refuses and says why: asked how to fix a generator
carburettor, it declines rather than guessing, because a confident wrong answer about this trade
can kill somebody. The refusal is a demo step, not an edge case.

**Finding the answer costs no data.** Retrieval is lexical and runs on the device against the
shipped pack — zero bytes of network per question, working with the radio off. Translation happens
once at build time and ships with the pack, so a learner on a weak connection asks, reads and
listens without a round trip. The app displays its own real byte count.

**Retrieval works in the learner's language, offline.** The build step translates each passage's
search cues as well as its text, and the matcher searches English and localized cues together —
because Nigerian artisans code-switch constantly, keeping the technical nouns in English inside a
Yoruba or Hausa sentence. Matching both is what works on site.

**Competence is assessed by speaking and by photograph.** A voice viva — *"tell me why 2.5mm² here
and not 1.5mm²"* — is scored against the specific unit standard's rubric points, and the app names
the one you missed. Changeover work is evidenced by photograph against a checklist. No reading or
typing is required at any point, which is the whole accessibility argument: an apprentice literate
in Hausa but not English is assessed on their trade, not on their English.

**Multiple choice is used for recall, never for competence.** Three days after a lesson, then ten,
then thirty, a question arrives as audio and is answered with a single keypress — which works on a
feature phone and costs almost nothing. Miss one and the lesson returns to the list. That is a
measured retention outcome rather than a streak counter.

**The feature that is not a tutor.** When an apprentice describes what they actually did — *"for
the AC socket I just run 1.5, and I join the earth to the neutral so the tester go show correct"* —
SabiPass recognises a safety-critical error, corrects it citing the clause, and **privately
notifies that apprentice's own trainer that they need supervision on that specific unit.** The
learner never asked for this; it is a side effect of talking about real work.

It also solves retention from the other side. It keeps the *trainer* engaged, and the trainer is
what keeps the learner engaged. A quiz cannot do that.

Privacy is part of the feature: the flag goes to that learner's own trainer and nobody else, the
learner is always told, and the learner can see exactly what was sent and delete it. A question
never raises a flag — only a description of practice does, because reporting somebody for asking
would destroy trust faster than a missed flag ever could.

**A progress record, explicitly not a certificate.** Five competencies, each showing its evidence
and its status, countersigned by the trainer, verifiable offline by a short code or a USSD string
and online by QR. It exports as an NSQF-aligned evidence portfolio, which collapses an assessor's
job from running a day-long centre to reviewing and endorsing. An accredited assessor still signs
the qualification. SabiPass is throughput for a framework that already exists, not a rival to it.

---

## How I built it

I used two agents and gave them one shared foundation. **Codex** did the planning: refining the
concept, choosing the architecture, deciding scope, and writing the specification I then built
against. **Claude Code** did the implementation, the testing and the debugging.

That split only worked because both read the same instruction files. The files, not the tool,
carried the project's rules from planning into code — the constraint that competence is never
assessed by multiple choice was written during planning and was still being enforced by a test
weeks later. I would make the same choice again: write the rules down somewhere an agent reads
before it writes, and you can change agents without losing the argument.

The files:

- **`AGENTS.md`** — setup, testing, privacy, safety and coding standards, including eight hard
  rules that count as bugs even when the tests pass. No ungrounded generation about safety.
  Distractors only from retrieved standard text. Competence never assessed by multiple choice.
  Never the word *certificate*.
- **`CAPSTONE_SPEC.md`** — product vision, architecture, the seven-step demo script, roadmap.
- **`SKILLS.md`** — the reusable workflows: add a language, add a trade, write a safety rule, fix a
  bad translation, debug retrieval, verify before a demo. Each one ends in a script that runs, so
  the guidance cannot drift away from the code.
- **`BUILD_PLAN.md`** — scope, the fourteen-day schedule, and an explicit cut-first list.
- **`DEMO.md`** — the three-minute script, on the rule that every claim is demonstrated rather than
  asserted.
- **`tools/`** — what `SKILLS.md` points at: `check-pack` for citations, safety rules, retrieval
  behaviour and locale completeness; `localize` for building a language; `check-audio` for proving
  each language speaks its own content; `review-queue` for ranking translations by likelihood of
  error; `diag` for probing what the speech provider actually supports.

The governing principle throughout is **build for N, validate for 1.** Languages and trades are
registry entries, never code branches: adding a language is a row in `config/languages.json`,
adding a trade is a folder under `content-packs/`. Five languages are wired. None is marked
validated, because `npm run diag` proves a provider accepts a language code, which is not the same
as proving the model handles a real apprentice's accent on a noisy site. That needs three learners
and a trainer, and the interface labels every unvalidated language as a preview until it has them.

The automated checks exist because of mistakes I made. The first Yoruba build came back **one
hundred percent English** — structurally perfect, every key present, entirely untranslated, because
the batching separator did not survive the translation API and every list fell back silently. It
looked finished. `npm run check` now fails any locale whose full sentences are more than forty
percent identical to English. Two earlier bugs became tests the same way: a learner asking *"socket
— 1.5 or 2.5?"* was being reported to their trainer for a safety violation, and *"my tailoring
machine no dey work"* was being answered with air-conditioner circuit guidance because the lexicon
matched `ac` inside `machine`.

---

## What I will judge it by

The demo is one complete journey, run with the network off: a spoken question in Pidgin, a sourced
spoken explanation with the clause visible, the same question again in Yoruba with the whole screen
following, a practice task done by voice, a recall check three days later, a private safety flag
reaching the trainer, and a progress record the trainer signs.

Two signatures are the work that remains, and neither is code. A practising trainer has to
countersign the clause references in the content pack, and a trainer who speaks the language has to
read each translation before a learner is served. Both files say `reviewed: false` today and the
app says so on screen, because an unlabelled unverified claim is the one failure this product
cannot afford.

What excites me is the possibility of dependable support at the moment somebody needs it, in a
language they are comfortable using, for people whose learning is currently invisible to every
system that could pay them for it. One clear explanation and a real chance to practise could
resolve a misunderstanding an apprentice would otherwise carry for years — and, for the first time,
leave a record that they understood it.
