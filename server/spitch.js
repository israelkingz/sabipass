/* Spitch adapter.
 *
 * Two endpoints, confirmed against Spitch's own docs and TypeScript SDK:
 *   POST {base}/v1/speech          JSON  {text, voice, language, speed, format} -> audio bytes
 *   POST {base}/v1/transcriptions  multipart {content, language, special_words, timestamp} -> {text}
 *
 * The API key never reaches the browser. Everything speech-related goes through here.
 */

const BASE = (process.env.SPITCH_BASE_URL || "https://api.spitch.app").replace(/\/+$/, "");
const KEY = () => process.env.SPITCH_API_KEY || "";

export const configured = () => KEY().length > 0;

function auth() {
  if (!configured()) throw new Error("SPITCH_API_KEY is not set. Copy .env.example to .env and add your key.");
  return { Authorization: "Bearer " + KEY() };
}

/** Text to speech. Returns { audio: Buffer, type: string }. */
export async function tts({ text, language, voice, format = "wav", speed = 1.0 }) {
  const res = await fetch(BASE + "/v1/speech", {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json", Accept: "audio/wav" },
    body: JSON.stringify({ text, voice, language, format, speed })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error("Spitch TTS " + res.status + ": " + detail.slice(0, 300)), { status: res.status });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { audio: buf, type: res.headers.get("content-type") || "audio/wav" };
}

/** Translate text. Returns the translated string.
 *  Note the code asymmetry for Pidgin, confirmed by probing this API:
 *  translate takes `pcm`, speech takes `pi`. The registry holds both. */
export async function translate({ text, source, target, tone, formality }) {
  const res = await fetch(BASE + "/v1/translate", {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, source, target, tone, formality })
  });
  const body = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error("Spitch translate " + res.status + ": " + body.slice(0, 300)), { status: res.status });
  }
  const j = JSON.parse(body);
  return j.text || "";
}

/** Speech to text. `audio` is a Buffer of wav/mp3/m4a/ogg. Returns { text, request_id, segments }. */
export async function asr({ audio, language, filename = "audio.wav", mime = "audio/wav", specialWords = [] }) {
  const form = new FormData();
  form.append("content", new Blob([audio], { type: mime }), filename);
  if (language) form.append("language", language);
  // The pack's trade lexicon is the ASR bias list. "change over", "2.5mm2", "RCD" and the rest
  // are exactly the words a general model mishears, and they are the words that carry the meaning.
  for (const w of specialWords.slice(0, 100)) form.append("special_words", w);

  const res = await fetch(BASE + "/v1/transcriptions", { method: "POST", headers: auth(), body: form });
  const body = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error("Spitch ASR " + res.status + ": " + body.slice(0, 300)), { status: res.status });
  }
  try { return JSON.parse(body); }
  catch { throw new Error("Spitch ASR returned non-JSON: " + body.slice(0, 200)); }
}
