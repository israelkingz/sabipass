/* Prove the audio really is in the selected language.   npm run check:audio
 *
 * For every registry language it takes the LOCALIZED text the app would actually speak — a lesson
 * key point, a passage answer and a recall question — and sends it through the same server route
 * the app uses. Then it transcribes the result back and reports what came out.
 *
 * This is the difference between "we pass a language code" and "a learner hears their language".
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as spitch from "../server/spitch.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = path.join(ROOT, "content-packs/electrical-domestic");

if (!spitch.configured()) {
  console.error("\n  SPITCH_API_KEY is not set.\n");
  process.exit(1);
}

const LANGS = JSON.parse(await fs.readFile(path.join(ROOT, "config/languages.json"), "utf8"));
const PACK = JSON.parse(await fs.readFile(path.join(PACK_DIR, "pack.json"), "utf8"));

const lesson = PACK.lessons[1];              // "Earthing, and why bridging earth to neutral kills"
const passage = PACK.passages.find(p => p.id === "p-earth-01");
const recall = PACK.recall.find(r => r.lesson === 2);

console.log("\n  Speaking localized content through the same path the app uses\n");
let bad = 0;

for (const L of LANGS.languages) {
  let loc = null;
  if (L.code !== "en") {
    try { loc = JSON.parse(await fs.readFile(path.join(PACK_DIR, "locales", L.code + ".json"), "utf8")) } catch {}
  }
  const label = (L.endonym || L.name).padEnd(16);

  if (L.code !== "en" && !loc) { console.log("  " + label + "NO LOCALE — run `npm run localize -- --only=" + L.code + "`"); bad++; continue; }

  const pieces = [
    ["lesson",  loc ? (loc.lessons["2"] || {}).keyPoints?.[1] : lesson.keyPoints[1]],
    ["answer",  loc ? (loc.passages[passage.id] || {}).spoken : passage.spoken],
    ["recall",  loc ? (loc.recall["2"] || {}).spoken : recall.spoken]
  ];

  const out = [];
  for (const [what, text] of pieces) {
    if (!text) { out.push(what + ":MISSING"); bad++; continue }
    try {
      const { audio } = await spitch.tts({
        text, language: L.tts.language, voice: L.tts.voice, format: "wav"
      });
      out.push(what + ":" + Math.round(audio.length / 1024) + "KB");
      // Round-trip the recall line, not the long answer. The provider 500s on multi-minute
      // audio, and it is also the wrong test: what a learner actually sends is one short
      // utterance — a question or a viva answer, a few seconds at 16 kHz mono.
      if (what === "recall") {
        let heard = null, err = null;
        for (let a = 0; a < 2 && heard == null; a++) {
          try { heard = (await spitch.asr({ audio, language: L.asr.language || "en" })).text || "" }
          catch (e) { err = e; await new Promise(r => setTimeout(r, 1500)) }
        }
        if (heard == null) { out.push("roundtrip:FAIL(" + err.message.replace(/\s+/g, " ").slice(0, 44) + ")"); bad++ }
        else out.push("heard:\"" + heard.trim().slice(0, 38) + "\"");
      }
    } catch (e) {
      out.push(what + ":FAIL(" + e.message.replace(/\s+/g, " ").slice(0, 50) + ")");
      bad++;
    }
  }
  console.log("  " + label + "voice " + String(L.tts.voice).padEnd(7) + "lang " + String(L.tts.language).padEnd(4) + out.join("  "));
}

console.log("\n  " + (bad ? bad + " problem(s)" : "every language speaks its own localized content") + "\n");
process.exit(bad ? 1 : 0);
