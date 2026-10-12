import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..") + "/";
let fail = 0;

// 1. inline script parses
const html = fs.readFileSync(root + "index.html", "utf8");
const i = html.lastIndexOf("<script>"), j = html.lastIndexOf("</script>");
const src = html.slice(i + 8, j);
try { new Function(src); console.log("OK   inline script parses (" + src.length + " bytes)"); }
catch (e) { fail++; console.log("FAIL script: " + e.message); }

// 2. json parses
let PACK, LANGS;
try {
  LANGS = JSON.parse(fs.readFileSync(root + "config/languages.json", "utf8"));
  PACK = JSON.parse(fs.readFileSync(root + "content-packs/electrical-domestic/pack.json", "utf8"));
  console.log("OK   both registries parse");
} catch (e) { fail++; console.log("FAIL json: " + e.message); process.exit(1); }

// 3. every passage has a ref; every lesson passage resolves
const ids = new Set(PACK.passages.map(p => p.id));
PACK.passages.forEach(p => { if (!p.ref || !p.spoken || !p.answer) { fail++; console.log("FAIL passage incomplete: " + p.id); } });
PACK.lessons.forEach(l => l.passages.forEach(id => { if (!ids.has(id)) { fail++; console.log("FAIL lesson " + l.n + " orphan ref: " + id); } }));
PACK.recall.forEach(r => { if (!ids.has(r.because)) { fail++; console.log("FAIL recall lesson " + r.lesson + " orphan because: " + r.because); } });
console.log("OK   " + PACK.passages.length + " passages, " + PACK.lessons.length + " lessons, all refs resolve");

// 4. safety regexes compile, and each fires on its own canned example
PACK.safetyRules.forEach(r => r.patterns.forEach(p => {
  try { new RegExp(p, "i"); } catch (e) { fail++; console.log("FAIL regex in " + r.id + ": " + p); }
}));
console.log("OK   " + PACK.safetyRules.length + " safety rules compile");

// 5. the demo-script utterances must actually trigger what the spec promises
const norm = s => String(s).toLowerCase().replace(/[^\w\s.²]/g, " ").replace(/\s+/g, " ").trim();
const GQ = new RegExp(PACK.assertionGuard.question, "i");
const GA = new RegExp(PACK.assertionGuard.assertion, "i");
const asserts = t => GA.test(t) ? true : (GQ.test(t) ? false : true);
const scan = t => {
  const n = norm(t);
  if (!asserts(n)) return [];
  return PACK.safetyRules.filter(r => r.patterns.some(p => new RegExp(p, "i").test(n)));
};
const cases = [
  ["For the AC socket I just run 1.5, and I join the earth to the neutral so the tester go show correct.", ["s-undersized-socket", "s-earth-neutral-bridge"]],
  ["I connect the gen direct, I no put change over. Na only line I switch.", ["s-generator-direct"]],
  ["My customer board get only breaker, no earth leakage.", ["s-no-rcd"]],
  ["I wan run wire for socket, 1.5 abi 2.5?", []],                      // a question must never flag
  ["I join earth to neutral, abi that one correct?", ["s-earth-neutral-bridge"]] // did it, then asked
];
cases.forEach(([t, want]) => {
  const got = scan(t).map(r => r.id);
  const miss = want.filter(w => got.indexOf(w) < 0);
  const extra = got.filter(g => want.indexOf(g) < 0);
  if (miss.length) { fail++; console.log("FAIL \"" + t.slice(0, 40) + "…\" missed: " + miss.join(", ")); }
  else console.log("OK   fires " + (got.length ? got.join(", ") : "(none, as intended)") + (extra.length ? "   [also: " + extra.join(", ") + "]" : ""));
});

// 6. retrieval must answer the spec's questions and refuse the out-of-pack one
const STOP = new Set("the a an and or for of to in on is it i you my me we go dey na abi wan want how what which why do does can should am be with that this no not".split(" "));
const LEX = Object.keys(PACK.lexicon).filter(k => k.charAt(0) !== "_").map(k => ({
  rx: new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"),
  vals: PACK.lexicon[k]
}));
function expand(q) {
  const t = norm(q), out = new Set(t.split(" ").filter(w => w.length > 1));
  LEX.forEach(e => { if (e.rx.test(t)) e.vals.forEach(v => norm(v).split(" ").forEach(w => out.add(w))); });
  return [...out];
}
function retrieve(q) {
  const toks = expand(q).filter(w => !STOP.has(w));
  const df = {};
  PACK.passages.forEach(p => {
    const bag = norm(p.cues.join(" ") + " " + p.topic + " " + p.answer);
    toks.forEach(w => { if (bag.indexOf(w) > -1) df[w] = (df[w] || 0) + 1; });
  });
  const N = PACK.passages.length;
  return PACK.passages.map(p => {
    const cues = norm(p.cues.join(" ")), topic = norm(p.topic), body = norm(p.answer);
    let s = 0, ch = 0;
    toks.forEach(w => {
      const idf = Math.log(1 + N / (1 + (df[w] || 0)));
      if (cues.indexOf(w) > -1) { s += 3.0 * idf; ch++; }
      else if (topic.indexOf(w) > -1) { s += 2.0 * idf; ch++; }
      else if (body.indexOf(w) > -1) s += 0.7 * idf;
    });
    return { p, s, ch };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
}
const T = 8.0, MIN_CUES = 2;
const confident = h => h && h.s >= T && h.ch >= MIN_CUES;
[["I wan run wire for socket, 1.5 abi 2.5?", "p-cable"],
 ["What insulation resistance should I get before energising?", "p-test"],
 ["Which device protect person from shock?", "p-protect"],
 ["change over switch which conductor", "p-change"],
 ["How I go fix generator carburettor?", "REFUSE"],
 ["Which paint I go use for the wall?", "REFUSE"],
 ["My tailoring machine no dey work", "REFUSE"]].forEach(([q, want]) => {
  const r = retrieve(q), h = r[0], top = h ? h.s : 0, ch = h ? h.ch : 0;
  const lbl = top.toFixed(1) + "/" + ch + "cue";
  if (want === "REFUSE") {
    if (confident(h)) { fail++; console.log("FAIL should refuse but answered " + h.p.id + " @" + lbl); }
    else console.log("OK   refuses \"" + q.slice(0, 32) + "…\" (" + lbl + ")");
  } else if (!confident(h) || h.p.id.indexOf(want) !== 0) {
    fail++; console.log("FAIL \"" + q.slice(0, 34) + "…\" -> " + (h ? h.p.id + " @" + lbl : "nothing") + ", wanted " + want + "*");
  } else console.log("OK   \"" + q.slice(0, 34) + "…\" -> " + h.p.id + " @" + lbl);
});

// 7. validate-for-1: at most one non-English language may claim validated:true
const val = LANGS.languages.filter(l => l.validated && l.code !== "en");
if (val.length > 1) {
  fail++;
  console.log("FAIL " + val.length + " non-English languages claim validated:true (" + val.map(l => l.code).join(", ") +
              "). Build for N, validate for 1 — you cannot field-test more than one in this sprint.");
} else if (val.length === 0) {
  console.log("OK   0 validated, " + (LANGS.languages.length - 1) + " previews — run `npm run diag`, then field-test, then set the flag");
} else {
  console.log("OK   validated: " + val[0].name + " (" + (val[0].validatedBy || "no evidence recorded") + "); " +
              (LANGS.languages.length - 2) + " previews");
}

// 8. every language names a provider language code and a voice
LANGS.languages.forEach(l => {
  if (!l.asr || !l.asr.language) { fail++; console.log("FAIL " + l.code + " has no asr.language"); }
  if (!l.tts || !l.tts.language || !l.tts.voice) { fail++; console.log("FAIL " + l.code + " has no tts.language/voice"); }
});
console.log("OK   all " + LANGS.languages.length + " languages carry provider codes and a voice");

// 9. locale files: present, complete, and actually translated.
// A translate call that silently falls back leaves a file that is structurally perfect and
// entirely English. That shipped once; it does not ship again.
const UIEN = JSON.parse(fs.readFileSync(root + "config/ui-en.json", "utf8"));
const uiKeys = Object.keys(UIEN).filter(k => k[0] !== "_");
const locDir = root + "content-packs/electrical-domestic/locales/";
const want = LANGS.languages.filter(l => l.translate).map(l => l.code);
const have = fs.existsSync(locDir) ? fs.readdirSync(locDir).filter(f => f.endsWith(".json") && f[0] !== ".").map(f => f.replace(".json", "")) : [];
const missing = want.filter(c => !have.includes(c));
if (missing.length) console.log("WARN missing locales: " + missing.join(", ") + " — run `npm run localize`");

for (const code of have) {
  const L = JSON.parse(fs.readFileSync(locDir + code + ".json", "utf8"));
  const problems = [];
  const missKeys = uiKeys.filter(k => !L.ui || L.ui[k] == null);
  if (missKeys.length) problems.push(missKeys.length + " ui keys missing");
  const missP = PACK.passages.filter(p => !L.passages || !L.passages[p.id]);
  if (missP.length) problems.push(missP.length + " passages missing");

  // How much actually changed? Identical-to-English across the board means the run fell back.
  // Measured on full sentences only: short UI labels ("Ask", "Online") legitimately survive
  // translation unchanged, and Nigerian Pidgin is English-lexified, so counting those would
  // flag a perfectly good Pidgin build.
  const pairs = [];
  uiKeys.forEach(k => { if (L.ui && L.ui[k] != null) pairs.push([UIEN[k], L.ui[k]]) });
  PACK.passages.forEach(p => { const x = L.passages && L.passages[p.id]; if (x) { pairs.push([p.answer, x.answer]); pairs.push([p.spoken, x.spoken]) } });
  const long = pairs.filter(([a]) => a.length >= 25);
  const sameCount = long.filter(([a, b]) => a === b).length;
  const pct = long.length ? Math.round(100 * sameCount / long.length) : 100;
  if (pct > 40) { fail++; problems.push(pct + "% of full sentences identical to English — the translate calls fell back"); }

  if (problems.length) console.log((pct > 40 ? "FAIL " : "WARN ") + code + ".json: " + problems.join("; "));
  else console.log("OK   " + code + ".json complete, " + (100 - pct) + "% translated, reviewed: " + !!L.reviewed);
}

console.log(fail ? "\n" + fail + " FAILURE(S)" : "\nall checks pass");
process.exit(fail ? 1 : 0);
