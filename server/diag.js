/* Speech diagnostics.  npm run diag
 *
 * Probes every language in the registry against both Spitch endpoints and reports what actually
 * works with your key. It does a round trip — generate speech, then transcribe it back — because
 * a language code the TTS accepts is not proof the ASR accepts it.
 *
 * This is how you decide which language gets `validated: true`. Set that flag from evidence,
 * never from a vendor's language list, and never from hope.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as spitch from "./spitch.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!spitch.configured()) {
  console.error("\n  SPITCH_API_KEY is not set.\n  cp .env.example .env   then add your key, then re-run: npm run diag\n");
  process.exit(1);
}

const LANGS = JSON.parse(await fs.readFile(path.join(ROOT, "config/languages.json"), "utf8"));
const PACK = JSON.parse(await fs.readFile(path.join(ROOT, "content-packs/electrical-domestic/pack.json"), "utf8"));
const LEX = Object.keys(PACK.lexicon).filter(k => k[0] !== "_");

// Short, trade-relevant probe phrases. Deliberately contain the jargon the lexicon biases for.
const PROBE = {
  pcm: "For socket use two point five. Earth and neutral must never join.",
  en: "For socket circuits use two point five millimetre. Never bridge earth to neutral.",
  yo: "Lo okun meji aami marun fun soket. Ma so ile pelu neutral papo.",
  ha: "Yi amfani da kebul biyu da rabi domin soket. Kada ka hada kasa da neutral.",
  ig: "Jiri eriri abuo na ise maka soket. Ejikọla ala na neutral ọnụ."
};

const pad = (s, n) => String(s).padEnd(n);
const rows = [];

console.log("\n  Probing Spitch with the languages in config/languages.json\n");

for (const l of LANGS.languages) {
  const ttsLang = l.tts?.language || l.code;
  const asrLang = l.asr?.language || l.code;
  const voice = l.tts?.voice || "lucy";
  const text = PROBE[l.code] || PROBE.en;
  const row = { code: l.code, name: l.name, tts: "—", asr: "—", heard: "", note: "" };

  let audio = null;
  try {
    const out = await spitch.tts({ text, language: ttsLang, voice, format: "wav" });
    audio = out.audio;
    row.tts = "ok " + Math.round(audio.length / 1024) + "KB";
  } catch (e) {
    row.tts = "FAIL";
    row.note = e.message.replace(/\s+/g, " ").slice(0, 90);
  }

  if (audio) {
    try {
      const out = await spitch.asr({ audio, language: asrLang, specialWords: LEX });
      const heard = (out.text || "").trim();
      row.asr = heard ? "ok" : "empty";
      row.heard = heard.slice(0, 54);
      if (!heard) row.note = row.note || "transcription came back empty";
    } catch (e) {
      row.asr = "FAIL";
      row.note = row.note || e.message.replace(/\s+/g, " ").slice(0, 90);
    }
  }
  rows.push(row);
  console.log("  " + pad(row.code, 5) + pad(row.name, 18) + "tts " + pad(row.tts, 11) + "asr " + pad(row.asr, 7) +
    (row.heard ? '"' + row.heard + '"' : "") + (row.note ? "  " + row.note : ""));
}

const good = rows.filter(r => r.tts.startsWith("ok") && r.asr === "ok");
console.log("\n  Working both ways: " + (good.length ? good.map(r => r.name).join(", ") : "none"));

const claimed = LANGS.languages.filter(l => l.validated).map(l => l.code);
const unsupported = claimed.filter(c => !good.some(g => g.code === c));
if (unsupported.length) {
  console.log("\n  WARNING  these are marked validated:true but did not round-trip here: " + unsupported.join(", "));
  console.log("           Either fix the language/voice codes or drop the flag. Shipping an");
  console.log("           unvalidated language to a learner is the failure mode this flag exists to stop.");
}
console.log("\n  A round trip proves the codes are accepted. It does NOT prove the model handles");
console.log("  a real apprentice's accent on a noisy site. That still needs three learners and a");
console.log("  trainer — days 1 and 2 of the build plan.\n");
