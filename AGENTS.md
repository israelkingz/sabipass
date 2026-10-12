# SabiPass — working agreement

Voice-first skill recognition for Nigeria's informal trades. Apprentices learn orally; this makes
what they know visible, traceable to a national standard, and countersigned by their own trainer.

Read `CAPSTONE_SPEC.md` for product vision and architecture. Read `BUILD_PLAN.md` for scope and
schedule. Read `CONCEPT.md` for the market thesis. This file is how we work.

## Governing principle

**Build for N, validate for 1.** Languages and trades are registry entries, never code branches.
Adding a language means adding a row to `config/languages.json`. Adding a trade means adding a
folder under `content-packs/`. If either requires touching application logic, the abstraction is
wrong — fix the abstraction.

## Hard rules

These are not preferences. Breaking one is a bug even if tests pass.

1. **No ungrounded generation about safety or standards.** Every technical claim the learner sees
   must come from a passage in a reviewed content pack and carry its `ref`. If retrieval confidence
   is below threshold, refuse and say so. A confident wrong answer about earthing can kill someone.

2. **MCQ distractors come only from retrieved standard text.** Never free-form. Four plausible
   wrong answers about earthing, authoritatively presented, is the worst thing this project could
   ship.

3. **Competency assessment never requires reading or writing.** Voice viva and photo evidence only.
   MCQ is permitted for *recall checks*, never for competency. The accessibility unlock is that an
   apprentice literate in Hausa but not English is assessed on their trade, not on English.

4. **Text alternative always rendered.** Every spoken response also appears as text. Every image
   carries a description. This is not optional and not behind a setting.

5. **Unvalidated languages are labelled as previews in the UI.** Never hide the `validated: false`
   flag. The honesty is a credibility asset, and an unlabelled unvalidated language is how a live
   demo fails in a language nobody on the team speaks. The same goes for locale files: every one is
   `reviewed: false` until a trainer who speaks that language has read it, and the app says so.

5a. **English is the authority for all content.** Other languages are machine translations of it,
   built by `npm run localize` and shipped with the pack. Never translate at ask time — a learner
   on a weak connection must be able to ask, read and listen without a round trip. Any answer shown
   in another language keeps the English original reachable in one tap.

5b. **A translation that silently falls back is a failure, not a default.** `npm run check` fails a
   locale that is more than 40% identical to English. The first Yoruba build was 100% English
   because the batch separator did not survive the API and every list fell back without erroring.
   It looked perfect.

6. **Never call the output a certificate.** It is a progress record and an NSQF-aligned evidence
   portfolio. A human assessor still signs. We are throughput for an existing framework, not a
   rival to it. Getting this wrong is a legal and reputational problem, not a wording nitpick.

7. **Safety escalation goes to that learner's own trainer and nobody else.** The learner is always
   told it happened, can always see exactly what was sent, and can always delete the record. No
   third-party reporting. No institutional dashboards in v1.

8. **Never charge the learner for their own credential.** That is the exclusion failure mode.

## Privacy

- Evidence recordings and photos are learner-owned: viewable and deletable by them at any time.
- The passport is selective-disclosure. A customer sees "assessed: domestic wiring", never the
  failed attempts.
- No learner data leaves the device except the retrieval query and the trainer escalation.
- Never log raw utterance audio to any analytics path.

## Low-bandwidth budget

Treat these as build failures, not aspirations:

- Lesson audio: **under 250 KB per lesson.** Five lessons under 1 MB total.
- A question-and-answer round trip against the embedded corpus: **0 KB of network.** Retrieval is
  local and lexical by design, not as a prototype shortcut.
- Recall checks must be answerable with a single keypress on a feature phone.
- The passport must verify offline. QR is an online enhancement; the short code and USSD string are
  the primary path.

## Coding standards

- Vanilla HTML/CSS/JS for the prototype. No framework, no build step — it has to run from a file on
  a cheap Android and from a single published page.
- Content packs and registries are **data**, loaded not compiled. Keep the embedded copy and the
  published JSON in sync.
- Wrap every `localStorage` access in try/catch; the app must render correctly with storage blocked.
- Colour, severity and conductor identity use the trade's own vocabulary (line/neutral/CPC, brown/
  blue/green-and-yellow). Do not invent parallel terminology.
- Keep the safety rule engine deterministic and auditable. Regex and thresholds in the pack, not in
  the code. A trainer must be able to read the rules.

## Testing

- `node tools/check-citations.js` — every passage has a `ref`, every lesson's rubric points map to a
  passage, no orphan references.
- `node tools/check-pack.js` — pack schema, lexicon coverage, safety rule compile, MCQ distractors
  traceable to passages.
- Manual: run the demo script in `CAPSTONE_SPEC.md` end to end with the network off.

## Before any demo

Record the backup video. ASR on accented speech with trade jargon is the top technical risk and the
demo must never hinge on one unrehearsed utterance.
