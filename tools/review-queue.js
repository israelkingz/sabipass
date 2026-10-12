/* Build the trainer's review queue.   npm run review [-- --lang=yo]
 *
 * Every locale is machine translation and has to be read by a trainer who speaks the language
 * before a learner is served. That is hundreds of strings. This ranks them, so the review starts
 * where it matters instead of at the top.
 *
 * It costs nothing to run — it compares the locale files against the English source offline.
 *
 * What it looks for, worst first:
 *   - a technical symbol or formula that did not survive  (Ib ≤ In ≤ Iz came back as
 *     "Ib Capitol In Capitol Iz" in Yoruba — a mangled formula inside a safety lesson)
 *   - a number that changed: 2.5mm², 30mA, 300ms, 1.0 MΩ carry the whole meaning
 *   - a safety correction, which is the text a learner acts on
 *   - a length that moved a long way from the original, which usually means dropped content
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = path.join(ROOT, "content-packs/electrical-domestic");
const argv = process.argv.slice(2);
const onlyLang = (argv.find(a => a.startsWith("--lang=")) || "").split("=")[1] || "";
const limit = Number((argv.find(a => a.startsWith("--limit=")) || "").split("=")[1] || 15);

const LANGS = JSON.parse(await fs.readFile(path.join(ROOT, "config/languages.json"), "utf8"));
const PACK = JSON.parse(await fs.readFile(path.join(PACK_DIR, "pack.json"), "utf8"));
const UIEN = JSON.parse(await fs.readFile(path.join(ROOT, "config/ui-en.json"), "utf8"));

const SYMBOL = /[≤≥²³Ω×·–—]/g;
const NUMBER = /\d+(?:\.\d+)?/g;
// Words a translator emits when it tries to pronounce a symbol it did not understand.
const GIBBERISH = /\b(capitol|capital letter|less than or equal|greater than or equal|squared symbol)\b/i;

const uniq = a => [...new Set(a)];

function score(en, tr, kind) {
  const reasons = [];
  let s = 0;

  const enSym = uniq((en.match(SYMBOL) || []));
  const trSym = uniq((tr.match(SYMBOL) || []));
  const lostSym = enSym.filter(x => !trSym.includes(x));
  if (lostSym.length) { s += 50; reasons.push("lost " + lostSym.join(" ")) }

  if (GIBBERISH.test(tr) && !GIBBERISH.test(en)) { s += 60; reasons.push("symbol read aloud as a word") }

  const enNum = uniq(en.match(NUMBER) || []);
  const trNum = uniq(tr.match(NUMBER) || []);
  const lostNum = enNum.filter(n => !trNum.includes(n));
  if (lostNum.length) { s += 40; reasons.push("number changed or dropped: " + lostNum.join(", ")) }

  if (kind === "safety") { s += 25; reasons.push("safety correction") }

  if (en.length > 40) {
    const ratio = tr.length / en.length;
    if (ratio < 0.55) { s += 30; reasons.push("much shorter than the English — content may be missing") }
    else if (ratio > 1.9) { s += 15; reasons.push("much longer than the English") }
  }

  if (en === tr && en.length >= 25) { s += 20; reasons.push("identical to English") }

  return { s, reasons };
}

const targets = LANGS.languages.filter(l => l.translate && (!onlyLang || l.code === onlyLang));

for (const L of targets) {
  let loc;
  try { loc = JSON.parse(await fs.readFile(path.join(PACK_DIR, "locales", L.code + ".json"), "utf8")) }
  catch { console.log("\n  " + L.name + ": no locale file yet\n"); continue }

  const items = [];
  const add = (kind, where, en, tr) => {
    if (!en || !tr) return;
    const { s, reasons } = score(String(en), String(tr), kind);
    if (s > 0) items.push({ s, kind, where, en: String(en), tr: String(tr), reasons });
  };

  PACK.passages.forEach(p => {
    const x = loc.passages[p.id]; if (!x) return;
    add("passage", p.id + " answer", p.answer, x.answer);
    add("passage", p.id + " spoken", p.spoken, x.spoken);
  });
  PACK.lessons.forEach(l => {
    const x = loc.lessons[String(l.n)]; if (!x) return;
    add("lesson", "lesson " + l.n + " title", l.title, x.title);
    (l.keyPoints || []).forEach((k, i) => add("lesson", "lesson " + l.n + " key point " + (i + 1), k, (x.keyPoints || [])[i]));
    add("lesson", "lesson " + l.n + " practice", l.practice.prompt, x.practicePrompt);
    (l.practice.checklist || []).forEach((c, i) => add("lesson", "lesson " + l.n + " checklist " + (i + 1), c, (x.checklist || [])[i]));
  });
  PACK.recall.forEach(r => {
    const x = loc.recall[String(r.lesson)]; if (!x) return;
    add("recall", "recall " + r.lesson, r.question, x.question);
    (r.options || []).forEach((o, i) => add("recall", "recall " + r.lesson + " option " + (i + 1), o, (x.options || [])[i]));
  });
  PACK.safetyRules.forEach(r => {
    const x = loc.safety[r.id]; if (!x) return;
    add("safety", r.id, r.correction, x.correction);
  });
  Object.keys(UIEN).filter(k => k[0] !== "_").forEach(k => add("ui", k, UIEN[k], (loc.ui || {})[k]));

  items.sort((a, b) => b.s - a.s);
  const crit = items.filter(i => i.s >= 50).length;

  console.log("\n  " + "─".repeat(66));
  console.log("  " + (L.endonym || L.name) + "  —  " + items.length + " strings to check, " + crit + " urgent");
  console.log("  " + "─".repeat(66));
  for (const it of items.slice(0, limit)) {
    console.log("\n  [" + String(it.s).padStart(3) + "] " + it.where + "   (" + it.reasons.join("; ") + ")");
    console.log("    en: " + it.en.replace(/\s+/g, " ").slice(0, 92));
    console.log("    " + L.code + ": " + it.tr.replace(/\s+/g, " ").slice(0, 92));
  }
  if (items.length > limit) console.log("\n  …and " + (items.length - limit) + " more. Raise with --limit=N.");
}

console.log("\n  Hand this to the trainer who speaks the language. Fix the English source where the");
console.log("  translator had no chance (bare symbols like ≤ are a known failure), then re-run");
console.log("  `npm run localize` — the cache means only changed strings are paid for again.\n");
