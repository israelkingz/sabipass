# SabiPass — voice-first skill recognition + work marketplace for Nigeria's informal trades

**Capstone tracks:** 3 (Guidance, Pathways & Opportunity) primary · 2 (Engagement) · 1 (Access & Discovery)

---

## 1. The problem nobody at this accelerator will be working on

Everyone will build for students: JAMB/WAEC prep, university bursary finders, curriculum
chatbots, study-streak apps. That market is crowded (uLesson, Pass.ng, PrepClass, Mind Builders)
and the "falling off" problem there is motivational and soft.

Nigeria's largest learning system is not school. It is the informal apprenticeship economy —
*igba-boi*/*nwa-boi*, tailoring, auto-electrics, phone repair, welding, solar/inverter install,
POS agency, catering, aluminium fabrication. Millions learn for 3–7 years, entirely orally, in
Pidgin, Hausa, Yoruba and Igbo, from a master craftsman.

They learn real skills. The skills are invisible.

- No credential → can't bid on formal contracts, can't get a bank/asset loan, can't price above
  street rate, can't carry a skill to another state or country.
- The gap is not training supply. It is **assessment and recognition supply.**

### The verifiable wedge

Nigeria already has the policy instrument: the **National Skills Qualifications Framework (NSQF)**,
explicitly designed to recognise competence regardless of whether it was gained in a classroom,
on the job, or informally, with **Recognition of Prior Learning (RPL)** as a core route. NBTE
launched RPL in 2025 under a "Skills, Not Degrees" campaign.

Uptake is near zero. Press reporting puts total candidates assessed nationwide since the 2025
rollout at roughly **500**. A single Lagos programme certifying **201** tradespeople was treated as
notable news. Abia State's plan to certify **1,000** artisans would, on its own, double the
national figure.

Why? Because RPL assessment is human, in-person and scarce — trained assessors must physically
convene candidates. The framework exists; the throughput does not.

**SabiPass makes RPL assessment remote, voice-native and near-free — then puts the resulting
credential straight into a marketplace where it earns money.**

(Note: an ITF/NBTE mandate settlement reported mid-2026 may move NSQF/RPL/apprenticeship oversight
from NBTE to the Industrial Training Fund. Confirm with both agencies before naming a partner on
stage — it changes who you cite.)

---

## 2. The product

WhatsApp-first (zero install), with a small offline PWA for field use.

### a. Voice intake → competency map

Learner sends a voice note in their own language:

> *"I don sabi wire two-bedroom flat finish, but inverter and change-over I no too sabi."*

ASR → the utterance is matched by RAG against **actual NSQF/NSQ unit standards, NBTE trade
syllabi, ITF curricula, NEMSA wiring regulations, SON standards and OEM manuals**. Output: a
competency map — units already held, units missing, and the NSQ level they would currently reach.

That is the "Access & Discovery" track solved for someone who cannot type a search query.

### b. Audio micro-lessons, grounded and cited

Each gap becomes a 60–90 second audio lesson in the learner's language, generated from the
retrieved standard and **always carrying its provenance** (unit standard code, regulation clause,
manual page). Not RAG over scraped blogs — RAG over the documents a national assessor actually
marks against. ~150–250 KB per lesson, cached offline, also pushed as a WhatsApp voice note.

### c. Assessment without reading or writing — the accessibility unlock

No multiple choice. Two primitives:

- **Voice viva:** "Record yourself explaining why you would use 2.5mm² here and not 1.5mm²."
- **Photo/video evidence:** "Send a picture of your termination and the earth bond."

A rubric agent scores the recording and the image against the specific unit standard and returns
spoken feedback in the learner's language. A low-literacy welder is assessed on welding, not on
English comprehension. This is the most defensible feature in the build.

### d. Triple-attested Skill Passport

One AI rubric is not a credential. Each unit is signed by three parties:

1. the rubric agent (evidence + score + the standard clause it was marked against),
2. the learner's **oga / master craftsman** (voice co-sign — works *with* the nwa-boi social
   structure rather than against it),
3. **completed marketplace jobs** with customer confirmation.

Portable, QR-verifiable, and USSD/SMS-checkable offline so a customer on a feature phone can
confirm a plumber is real. Export bundle formatted as an NSQF RPL evidence portfolio, so a human
assessor's job collapses from "run a day-long assessment centre" to "review and endorse."

### e. The marketplace — the engagement mechanism, not a bolt-on

Customers post jobs by voice ("my pumping machine no dey work, Surulere"). Matching ranks on the
verified passport, locality and job history.

The retention loop is not streaks and badges. **Completing a competency visibly unlocks
higher-paying job categories.** Learning → credential → better jobs → money → funds the next
competency. That is "learning that stays with you" expressed as economics, which is why it keeps
working after the novelty wears off.

---

## 3. Who pays (three real payers — this is what makes it marketable)

| Payer | For what | Why they pay |
|---|---|---|
| **Customers / SMEs** | 5–10% commission on job value | Verified artisan, much lower risk of being scammed |
| **Employers at scale** — solar installers, telcos, FMCG distributors, construction, facility managers | Subscription to a pre-verified, geo-filtered talent pool | Hiring artisans at scale in Nigeria is currently guesswork |
| **State skills agencies, ITF/NBTE, donors (MasterCard Foundation, GIZ, World Bank IDEAS)** | Per verified competency — results-based financing | They fund training today and **cannot verify outcomes.** You sell them proof. |

Learner-side is free. Never charge the learner for their own credential — that is exactly the
exclusion failure mode the brief warns about.

---

## 4. Operating constraints, answered directly

| Constraint | How it is met |
|---|---|
| Quality & credibility | RAG corpus is national unit standards, regulations and OEM manuals only; clause-level provenance on every answer; refuses rather than guesses when retrieval is weak |
| Low bandwidth / basic devices | WhatsApp voice notes as primary channel; sub-250KB audio; offline-first PWA with background sync; USSD/SMS credential verification; no video needed to learn |
| Accessibility & inclusion | Zero reading or typing required end to end; assessment by speech and photo; blind-accessible by construction; works for someone literate in Hausa but not English |
| Personalization without exclusion | The competency map is additive — it only ever says what you can add next; no profile gates access; everyone can attempt any unit |
| Privacy & security | Evidence recordings encrypted, learner-owned, deletable; consent per share; selective disclosure — a customer sees "qualified: domestic wiring," never the failed attempts |
| Multilingual | Pidgin, Hausa, Yoruba, Igbo, Nigerian English, Fulfulde on the roadmap — via Spitch (yo/ha/ig/en) and 9jaLingo (adds Pidgin); language is the default, not a settings toggle |
| Local relevance | Built on Nigeria's own NSQF/NSQ unit standards and state artisan programmes; Nigerian wiring and safety regulations, not generic trade content |

---

## 5. Proof-of-concept scope (what to actually demo)

Depth in one trade beats breadth across ten. Pick **domestic electrical installation** (clear
written standards, real safety stakes, strong solar/inverter demand) or **phone repair**.

Build:

1. Ingest ~15 real NSQ/NBTE unit standards plus the relevant NEMSA/SON clauses into a vector store.
2. Voice-note intake (Pidgin + Hausa) → competency gap map.
3. Three generated audio micro-lessons with visible citations.
4. One complete voice-viva + photo assessment producing a scored, cited result.
5. Oga voice co-sign flow.
6. Skill Passport page with QR verify and offline check.
7. Two marketplace job posts, matched by passport, showing "this unlocked because you completed X."

The live demo: a judge records a Pidgin voice note and gets a cited competency map and an audio
lesson back in about twenty seconds. Then they scan the QR and watch the passport verify with
Airplane Mode on.

Have ready: one real artisan on video saying what the credential would change for them, and the
~500-assessed-nationally figure on a slide. That number is the whole pitch.

---

## 6. Honest risks

- **ASR on heavy-accented Pidgin with trade jargon** is the technical risk. Mitigate with a
  trade-term lexicon bias list, confidence thresholds, and a spoken "I heard X — correct?"
  confirmation step. Do not let the demo hinge on one unrehearsed utterance.
- **Credential legitimacy** is the business risk. Be precise on stage: SabiPass produces an
  NSQF-aligned *evidence portfolio and endorsement*, not a self-issued certificate. A real
  assessor still signs. You are throughput for an existing framework, not a rival to it.
- **Marketplace cold start.** Enter through existing artisan associations and trade guilds — they
  are already organised and already hold the masters who do the co-signing.

---

## 7. Alternates, if you want options

- **Yarn Pass** — audio-first exam prep where WAEC/NECO past-question explanations are RAG'd from
  the official syllabus and marking schemes, delivered as Yoruba/Hausa/Igbo voice notes, with a
  study-circle layer so a group shares one data bundle. Safer, far more crowded.
- **Kobo & Credit** — voice-native financial-literacy learning for market traders and POS agents,
  where completing competencies builds a lender-readable reputation file. Strong payer story,
  weaker learning story.

SabiPass is the recommendation: it is the only one where the credential, the engagement loop and
the revenue are the same object.

---

## Sources to verify before pitching

- NBTE NSQF overview — https://web.nbte.gov.ng/nsqf
- Stakeholders push for rapid adoption of skills recognition framework — https://von.gov.ng/stakeholders-push-for-rapid-adoption-of-skills-recognition-framework-in-nigeria/
- 201 tradespeople certified in Lagos via RPL — https://businessday.ng/brands-advertising/article/nerdzfactory-company-and-research-links-certify-201-skilled-tradespeople-across-ten-trades-in-lagos-nigeria/
- NBTE/SASASNET RPL stakeholder training — https://thepoint.gm/africa/gambia/headlines/sasasnet-nbte-train-stakeholders-on-rpl-in-nigeria
- FG moves to certify creative media workers without degrees — https://www.nigeriastartupact.ng/?p=11292
- Spitch speech models for African languages — https://www.connectingafrica.com/ai/cencori-spitch-build-speech-ai-models-for-african-languages
- Spitch Python SDK — https://pypi.org/project/spitch
- 9jaLingo SDK (adds Pidgin) — https://pypi.org/project/naijalingo/2.0.3/
