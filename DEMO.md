# Demo script

Three minutes. One learner, one journey, nothing on screen that is not load-bearing.

The structural rule: **every claim is demonstrated, never asserted.** Low-bandwidth is proved by
airplane mode, not by a bullet point. Multilingual is proved by switching mid-sentence. Credibility
is proved by watching it refuse.

---

## Before you start

- [ ] `npm run check` passes
- [ ] `npm run check:audio` passes
- [ ] `npm run diag` passes — the provider still accepts every code
- [ ] Spitch account has credits (it ran out mid-build once; it will again)
- [ ] Phone charged, screen timeout off, notifications off
- [ ] Settings → **Reset demo**, so the passport starts at 0/5
- [ ] Learn tab → **Download all five**, so offline is real and not luck
- [ ] Airplane mode tested once and turned back on
- [ ] **Backup video recorded** — see the last section. Non-negotiable.

---

## 0:00 — Open on the number, not the app

> "Nigeria has a legal route for recognising skills learned on the job. Not a proposal — a
> framework, with assessors, launched in 2025.
>
> Since then it has certified about **five hundred artisans.** Not five hundred this month. Five
> hundred in total, nationally."

Pause. Let it land before any screen appears.

> "Millions of Nigerians learn their trade through apprenticeship — orally, in Pidgin, from a
> master craftsman. The framework to recognise them exists. The capacity to assess them does not,
> because assessment means a human being in a room.
>
> SabiPass is that assessment, remote and nearly free."

---

## 0:30 — Airplane mode, then speak

**Turn on airplane mode where they can see you do it.** Say it out loud.

Speak into the phone, in Pidgin:

> *"I wan run wire for socket, 1.5 abi 2.5?"*

Point at three things on the answer, in this order:

1. The answer, spoken back in Pidgin.
2. **The clause reference** — `NIS IEC 60364-5-52 · cl. 523`. "That is the standard a national
   assessor marks against. Not a blog."
3. **`0 KB network`.** "Finding that answer cost nothing. It runs on the phone. This matters when
   data is bought in hundred-naira bundles."

---

## 1:00 — Switch language, still offline

Tap **Èdè Yorùbá**. Tap the same question.

Say nothing for a second and let them watch the whole screen change — question, answer, buttons,
the lot — then the Yoruba voice reads it back.

> "Same standard. Same clause. Different language. Still in airplane mode — the language is on the
> phone, not in the cloud.
>
> Four Nigerian languages. Adding a fifth is one row of config and a build step."

*This is the moment judges remember. Do not rush it and do not talk over the audio.*

---

## 1:20 — Make it refuse

Switch back to Pidgin. Ask:

> *"How I go fix generator carburettor?"*

It declines.

> "No reviewed source covers that, so it says so. Most demos hide this. In this trade a confident
> wrong answer is how somebody gets electrocuted, so refusing is a feature I built on purpose."

---

## 1:40 — The part nobody else has

> "Everything so far is a good tutor. Here is what makes it something else."

Speak, as if reporting your day's work:

> *"For the AC socket I just run 1.5, and I join the earth to the neutral so the tester go show
> correct."*

Two flags appear. Read the correction aloud — the consequence, not the rule.

> "He didn't ask a question. He described what he did. And his trainer has just been told."

Switch to the **Trainer** tab. The flags are there, with the clause and the unit.

> "Privately. Only his own trainer — no institution, no third party. He's told it happened and he
> can delete it.
>
> This is also the answer to retention. Engagement tools try to keep the learner coming back. This
> keeps the *trainer* engaged, and the trainer is what keeps the learner engaged."

---

## 2:10 — Close the loop

In the Trainer tab, **countersign** one competency.

Switch to **Passport**. It has updated live.

> "That's a progress record, not a certificate — an accredited assessor still signs the
> qualification. What this does is collapse their job from running a day-long assessment centre to
> reviewing a portfolio."

Show the verification code and the USSD string. **Still in airplane mode.**

> "A customer with any phone can check he's real. No smartphone needed on their side."

---

## 2:30 — Who pays

Fast. One line each.

> "Customers pay a commission. Employers hiring artisans at scale pay for a verified pool. And
> state skills agencies and donors fund training today and **cannot verify outcomes** — we sell
> them proof.
>
> The one I'd validate first is a training-centre subscription. Centres already run cohorts and
> already employ the trainers who countersign. That's a hypothesis, not a feature — I haven't
> built billing and I'm not pretending I have."

---

## 2:45 — Close

> "The framework exists. The throughput doesn't. That's the whole company."

---

## If you get 30 more seconds: the build

Judges in this programme are scoring the engineering process, so have this ready and keep it tight:

> "I used two agents. Codex did the planning — concept, architecture, scope, the specification.
> Claude Code did the implementation and the testing. That worked because both read the same
> instruction files, so the rules survived the handoff: *competence is never assessed by multiple
> choice* was decided during planning and was still being enforced by a test weeks later. The
> files are the interface; the agent is swappable.
>
> `AGENTS.md` holds the rules that count as bugs even when the tests pass. `CAPSTONE_SPEC.md`
> holds the architecture. `SKILLS.md` holds the workflows, and each one is executable rather than
> described.
>
> Three of those checks exist because I shipped the bug first. A Yoruba build came back a hundred
> percent English while looking structurally perfect, because the batch separator didn't survive
> the translation API and every list fell back silently. A learner asking *'socket — 1.5 or 2.5?'*
> got reported to his trainer for a safety violation. And *'my tailoring machine no dey work'* got
> answered with air-conditioner guidance, because the lexicon matched `ac` inside `machine`.
>
> Each one is now a test that fails the build."

**Tell the bug stories.** Nobody else will. A team that shows you its failure modes is a team you
believe about everything else.

---

## Questions you will get

**"How is this different from ChatGPT?"**
> "Ask ChatGPT about Nigerian wiring and it answers from UK or US regulations, confidently, with no
> citation, in English, online, and nobody is accountable. This answers from NESIS and the NBTE
> unit standards, shows the clause, works offline, speaks Pidgin, refuses when it doesn't know, and
> puts a named trainer's signature on the outcome."

**"Is the certificate real?"**
> "It is not a certificate and I never call it one. It's an evidence portfolio aligned to the NSQF
> Recognition of Prior Learning route. An accredited assessor still signs."

**"Who verifies the content?"**
> "It's drafted from NESIS 2015, NIS IEC 60364 and NBTE unit standards, cited clause by clause. The
> system refuses rather than inventing. A practising trainer countersigns the pack before it serves
> learners at scale."

**"What if the AI gets safety advice wrong?"**
> "That's the failure I designed against hardest. Nothing is generated — answers are retrieved
> passages with their clause attached. Below a confidence threshold it refuses. And the safety
> engine is deterministic rules a trainer can read, not a model's opinion."

**"Why Pidgin and not English?"**
> "Because that's the language the work is actually taught in. English is available and the text
> alternative always renders. But an apprentice who reads English slowly shouldn't be assessed on
> his English when the question is whether he can wire a house safely."

---

## Backup video — do this first, not last

ASR on heavily accented Pidgin with trade jargon is the single biggest technical risk on stage.

Record the full run, screen plus audio, in one take, ideally twice. If the live attempt fumbles:
say *"the microphone is fighting me, here's the same thing from this morning"*, play the recording,
and keep talking over it. Judges forgive a flaky mic. They do not forgive two minutes of silence.

If you can get it: **thirty seconds of a real apprentice or trainer** saying what a verifiable
record would change for them. One honest face beats any slide you could build.
