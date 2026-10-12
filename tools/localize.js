/* Build locale files.   npm run localize  [-- --only=yo,ha] [--force] [--conc=1]
 *
 * Translates the content pack and the UI strings into every registry language and writes
 * content-packs/<pack>/locales/<code>.json.
 *
 * This runs at BUILD time, not at ask time, on purpose. A learner on a weak connection must be
 * able to ask a question, get an answer and hear it read back without a translation round trip.
 * Shipping the locale with the pack keeps retrieval local and keeps the 0 KB promise honest.
 *
 * Strings are batched (newline-delimited) and cached by content hash, so a re-run after an edit
 * only translates what changed. Delete locales/.cache.json or pass --force to redo everything.
 * Spitch serialises translate calls, so this runs at concurrency 1 by default and backs off on 429.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as spitch from "../server/spitch.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = path.join(ROOT, "content-packs/electrical-domestic");
const LOC_DIR = path.join(PACK_DIR, "locales");
const CACHE_FILE = path.join(LOC_DIR, ".cache.json");

const argv = process.argv.slice(2);
const arg = n => (argv.find(a => a.startsWith("--" + n + "=")) || "").split("=")[1] || "";
const only = arg("only").split(",").filter(Boolean);
const force = argv.includes("--force");
const CONC = Math.max(1, Number(arg("conc") || 1));
const BATCH = 10;

if (!spitch.configured()) {
  console.error("\n  SPITCH_API_KEY is not set. cp .env.example .env, add your key, then: npm run localize\n");
  process.exit(1);
}

const LANGS = JSON.parse(await fs.readFile(path.join(ROOT, "config/languages.json"), "utf8"));
const PACK = JSON.parse(await fs.readFile(path.join(PACK_DIR, "pack.json"), "utf8"));
const UI = JSON.parse(await fs.readFile(path.join(ROOT, "config/ui-en.json"), "utf8"));

await fs.mkdir(LOC_DIR, { recursive: true });
let cache = {};
if (!force) { try { cache = JSON.parse(await fs.readFile(CACHE_FILE, "utf8")) } catch {} }

const hash = (s, t) => crypto.createHash("sha1").update(t + "\u0000" + s).digest("hex").slice(0, 16);
const PH = /\{[a-zA-Z]+\}/g;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let calls = 0, cached = 0, failed = 0, sinceFlush = 0;
const warn = [];

class OutOfCredits extends Error {}
const flush = async () => { await fs.writeFile(CACHE_FILE, JSON.stringify(cache)); sinceFlush = 0 };

/* ---- one translate call, with 429 backoff and a cache ---- */
async function raw(text, L) {
  const t = L.translate;
  const key = hash(text, t.target + "|" + (t.formality || "") + "|" + (t.tone || ""));
  if (cache[key] != null) { cached++; return cache[key] }

  for (let a = 0; a < 6; a++) {
    try {
      const out = await spitch.translate({ text, source: "en", target: t.target, tone: t.tone, formality: t.formality });
      calls++;
      if (!out || !out.trim()) throw new Error("empty translation");
      cache[key] = out;
      // Flush often. A run that dies three quarters of the way through must not throw away
      // everything it already paid for.
      if (++sinceFlush >= 20) await flush();
      return out;
    } catch (e) {
      // No point retrying a billing problem six times.
      if (e.status === 402 || /insufficient_credits|no credits/i.test(e.message)) throw new OutOfCredits();
      const rateLimited = e.status === 429 || /concurrency|rate|429/i.test(e.message);
      if (a === 5) { failed++; warn.push(L.code + ": " + e.message.replace(/\s+/g, " ").slice(0, 80)); return null }
      await sleep(rateLimited ? 1200 * (a + 1) : 500 * (a + 1));
    }
  }
  return null;
}

/* ---- a single string, placeholders preserved ---- */
async function tr(text, L) {
  const src = String(text ?? "");
  if (!src.trim()) return src;
  const out = await raw(src, L);
  if (out == null) return src;
  const want = src.match(PH) || [], got = out.match(PH) || [];
  const lost = want.filter(p => !got.includes(p));
  if (lost.length) {
    // A translation that ate a {placeholder} would render it as literal text to the learner.
    warn.push(L.code + ": placeholder " + lost.join(",") + ' lost in "' + src.slice(0, 36) + '…" — English kept');
    return src;
  }
  return out;
}

/* ---- a list in one call. English is kept if the parts do not line up.
   Separator chosen by probing: newlines are collapsed and "|" gets rewritten to an arrow,
   but " ;; " comes back intact. ---- */
const SEP = " ;; ", SEP_RX = /\s*;;\s*/;
async function trList(items, L) {
  if (!items || !items.length) return items || [];
  const clean = items.map(s => String(s).replace(/\s*[\n;]+\s*/g, " ").trim());
  const out = await raw(clean.join(SEP), L);
  if (out == null) return items.slice();
  let lines = out.split(SEP_RX).map(s => s.trim()).filter(Boolean);
  if (lines.length !== clean.length) {
    // The separator did not survive. Don't fall back to English for the whole list — translate
    // each item on its own. Costs more calls, but only for the lists that actually failed, and
    // the cache means a re-run never pays for it twice.
    warn.push(L.code + ": batch split " + lines.length + "/" + clean.length + " — retried item by item");
    const one = [];
    for (const s of clean) { const r = await raw(s, L); one.push(r == null ? s : r) }
    lines = one;
  }
  // placeholders must survive per line
  return lines.map((ln, i) => {
    const want = clean[i].match(PH) || [], got = ln.match(PH) || [];
    if (want.some(p => !got.includes(p))) { warn.push(L.code + ": placeholder lost in list item — English kept"); return items[i] }
    return ln;
  });
}

async function pool(jobs, n = CONC) {
  const out = new Array(jobs.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, async () => {
    while (i < jobs.length) { const k = i++; out[k] = await jobs[k]() }
  }));
  return out;
}
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o };

const targets = LANGS.languages.filter(l => l.translate && (!only.length || only.includes(l.code)));
if (!targets.length) { console.error("\n  No matching languages. Registry has: " +
  LANGS.languages.filter(l => l.translate).map(l => l.code).join(", ") + "\n"); process.exit(1) }

console.log("\n  Localizing " + PACK.trade + " → " + targets.map(l => l.name).join(", "));
console.log("  Batched, cached, concurrency " + CONC + ". Re-runs only translate what changed.\n");

try {
for (const L of targets) {
  const t0 = Date.now();
  process.stdout.write("  " + L.name.padEnd(17));

  const out = {
    code: L.code, name: L.name, endonym: L.endonym,
    generated: new Date().toISOString(),
    source: "en", provider: "spitch", target: L.translate.target,
    reviewed: false, reviewer: null,
    reviewNote: "Machine translation from the English pack. A trainer who speaks this language must read it before a learner is served. The English wording is the authority.",
    safetyDetectionNote: "Corrections below are translated. Detection still matches the English and Pidgin patterns in pack.json, which holds up because the technical terms (earth, neutral, socket, 1.5) stay English in code-switched speech. Validate per language before relying on it.",
    ui: {}, passages: {}, lessons: {}, recall: {}, safety: {}, examples: [],
    trade: PACK.trade, conductors: []
  };

  // The trade name and the conductor colour code appear inside lessons, so they localize too.
  {
    const head = await trList([PACK.trade], L);
    out.trade = head[0];
    const roles = await trList(PACK.conductorColours.map(c => c.role), L);
    const cols = await trList(PACK.conductorColours.map(c => c.colour), L);
    out.conductors = PACK.conductorColours.map((c, i) => ({ role: roles[i], colour: cols[i] }));
  }

  // UI strings, batched
  const uiKeys = Object.keys(UI).filter(k => k[0] !== "_");
  for (const grp of chunk(uiKeys, BATCH)) {
    const vals = await trList(grp.map(k => UI[k]), L);
    grp.forEach((k, i) => { out.ui[k] = vals[i] });
  }
  process.stdout.write("ui ");

  // Passages. Translating the cues is what lets a learner search in their own language offline.
  await pool(PACK.passages.map(p => async () => {
    const [pair, cues] = [await trList([p.answer, p.spoken], L), await trList(p.cues, L)];
    out.passages[p.id] = { answer: pair[0], spoken: pair[1], cues };
  }));
  process.stdout.write("passages ");

  await pool(PACK.lessons.map(l => async () => {
    const head = await trList([l.title, l.subtitle, l.practice.prompt, l.practice.spokenPrompt], L);
    const entry = { title: head[0], subtitle: head[1], practicePrompt: head[2], practiceSpoken: head[3] };
    entry.keyPoints = await trList(l.keyPoints, L);
    if (l.practice.checklist) entry.checklist = await trList(l.practice.checklist, L);
    if (l.practice.rubric) entry.rubricPoints = await trList(l.practice.rubric.map(r => r.point), L);
    out.lessons[String(l.n)] = entry;
  }));
  process.stdout.write("lessons ");

  await pool(PACK.recall.map(r => async () => {
    const pair = await trList([r.question, r.spoken], L);
    out.recall[String(r.lesson)] = { question: pair[0], spoken: pair[1], options: await trList(r.options, L) };
  }));
  process.stdout.write("recall ");

  await pool(PACK.safetyRules.map(r => async () => {
    const pair = await trList([r.label, r.correction], L);
    out.safety[r.id] = { label: pair[0], correction: pair[1] };
  }));
  process.stdout.write("safety ");

  // The tappable example utterances, so a judge can hear the whole journey in this language
  // without anyone on the team having to pronounce it.
  {
    const texts = await trList(PACK.examples.map(e => e.text), L);
    const notes = await trList(PACK.examples.map(e => e.note), L);
    out.examples = PACK.examples.map((e, i) => ({ text: texts[i], note: notes[i], en: e.text }));
  }
  process.stdout.write("examples ");

  await fs.writeFile(path.join(LOC_DIR, L.code + ".json"), JSON.stringify(out, null, 1));
  await flush();
  console.log("→ locales/" + L.code + ".json  " + ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
} catch (e) {
  await flush();
  if (e instanceof OutOfCredits) {
    console.log("\n\n  Stopped: the Spitch account has no credits left.");
    console.log("  Top up at https://spitch.app, then run `npm run localize` again —");
    console.log("  the " + Object.keys(cache).length + " phrases already translated are cached and will not be paid for twice.\n");
    process.exit(2);
  }
  throw e;
}

await flush();
console.log("\n  " + calls + " translated, " + cached + " cached" + (failed ? ", " + failed + " failed" : ""));
if (warn.length) {
  const uniq = [...new Set(warn)];
  console.log("\n  English kept for these:");
  for (const w of uniq.slice(0, 12)) console.log("    " + w);
  if (uniq.length > 12) console.log("    …and " + (uniq.length - 12) + " more");
}
console.log("\n  Each locale is marked reviewed:false and the app says so on screen.");
console.log("  A trainer who speaks the language reads it before a learner is served.\n");
