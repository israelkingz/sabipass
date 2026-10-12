/* SabiPass local dev server. No dependencies — Node 20+ only.
 *
 *   npm start      ->  http://localhost:8787
 *
 * Serves the app, and proxies speech to Spitch so the API key never reaches the browser.
 * With no key configured the app still runs: it falls back to the browser's own Web Speech
 * engine and says so in the UI, which is also how the published Artifact behaves.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as spitch from "./spitch.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8787);

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".webm": "audio/webm", ".md": "text/markdown; charset=utf-8"
};

/* ---- registries, read once at boot (and re-read on change in dev) ---- */
let LANGS, PACK, LEXICON = [];
async function loadRegistries() {
  LANGS = JSON.parse(await fs.readFile(path.join(ROOT, "config/languages.json"), "utf8"));
  PACK = JSON.parse(await fs.readFile(path.join(ROOT, "content-packs/electrical-domestic/pack.json"), "utf8"));
  LEXICON = Object.keys(PACK.lexicon).filter(k => k[0] !== "_");
  // Clause refs and unit codes are also words a general ASR model will mangle.
  for (const c of PACK.conductorColours) LEXICON.push(c.term);
}
const langByCode = c => (LANGS.languages || []).find(l => l.code === c);

/* ---- helpers ---- */
const json = (res, code, obj) => {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": b.length });
  res.end(b);
};
async function readBody(req, limit = 26 * 1024 * 1024) {
  const chunks = []; let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) throw Object.assign(new Error("Audio too large (25MB max)"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

/* ---- API ---- */
async function api(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, "");

  if (route === "health") {
    return json(res, 200, {
      ok: true,
      spitch: spitch.configured(),
      pack: { id: PACK.id, trade: PACK.trade, reviewed: PACK.manifest.reviewed, passages: PACK.passages.length },
      languages: Object.fromEntries((LANGS.languages || []).map(l => [l.code, {
        name: l.name, validated: l.validated,
        asr: l.asr?.provider === "spitch" && spitch.configured() ? "spitch" : "webspeech",
        tts: l.tts?.provider === "spitch" && spitch.configured() ? "spitch" : "webspeech",
        asrLanguage: l.asr?.language || null, voice: l.tts?.voice || null,
        webSpeechFallback: l.webSpeechFallback || null
      }]))
    });
  }

  if (route === "asr" && req.method === "POST") {
    const code = url.searchParams.get("lang") || "en";
    const l = langByCode(code);
    if (!l) return json(res, 400, { error: "Unknown language: " + code });
    if (!spitch.configured()) return json(res, 503, { error: "No SPITCH_API_KEY configured — the app will use browser speech instead." });

    const audio = await readBody(req);
    if (!audio.length) return json(res, 400, { error: "Empty audio" });
    const t0 = Date.now();
    const out = await spitch.asr({
      audio, language: l.asr?.language || "en",
      mime: req.headers["content-type"] || "audio/wav",
      specialWords: LEXICON
    });
    return json(res, 200, {
      text: out.text || "", requestId: out.request_id || null,
      language: l.asr?.language, provider: "spitch",
      ms: Date.now() - t0, kb: Math.round(audio.length / 1024)
    });
  }

  if (route === "translate" && req.method === "POST") {
    if (!spitch.configured()) return json(res, 503, { error: "No SPITCH_API_KEY configured." });
    const body = JSON.parse((await readBody(req, 64 * 1024)).toString("utf8") || "{}");
    const text = String(body.text || "").slice(0, 2000);
    if (!text) return json(res, 400, { error: "Empty text" });
    const out = await spitch.translate({
      text, source: body.source || undefined, target: body.target || "en",
      tone: body.tone, formality: body.formality
    });
    return json(res, 200, { text: out });
  }

  if (route === "tts" && req.method === "POST") {
    if (!spitch.configured()) return json(res, 503, { error: "No SPITCH_API_KEY configured." });
    const body = JSON.parse((await readBody(req, 256 * 1024)).toString("utf8") || "{}");
    const l = langByCode(body.lang || "en");
    if (!l) return json(res, 400, { error: "Unknown language: " + body.lang });
    const text = String(body.text || "").slice(0, 4000);
    if (!text) return json(res, 400, { error: "Empty text" });

    const { audio, type } = await spitch.tts({
      text, language: l.tts?.language || "en",
      voice: body.voice || l.tts?.voice || "lucy",
      format: "wav", speed: Number(body.speed) || 1.0
    });
    res.writeHead(200, { "Content-Type": type, "Content-Length": audio.length, "Cache-Control": "no-store" });
    return res.end(audio);
  }

  return json(res, 404, { error: "No such route: " + route });
}

/* ---- static ---- */
async function stat(p) { try { return await fs.stat(p) } catch { return null } }
async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "") rel = "/index.html";
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== path.join(ROOT, "index.html")) {
    return json(res, 403, { error: "Forbidden" });
  }
  if (/(^|[\\/])\.env/.test(rel)) return json(res, 403, { error: "Forbidden" });

  const st = await stat(abs);
  if (!st || st.isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found: " + rel);
  }
  const body = await fs.readFile(abs);
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(abs).toLowerCase()] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-store"   // dev server: always serve what is on disk
  });
  res.end(body);
}

/* ---- server ---- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  try {
    await loadRegistries();                       // cheap, and picks up pack edits without a restart
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await serveStatic(req, res, url);
  } catch (err) {
    console.error("[sabipass]", err.message);
    const credits = err.status === 402 || /insufficient_credits|no credits/i.test(err.message);
    json(res, err.status || 500, {
      error: credits ? "The Spitch account has no credits left. Top up at spitch.app." : err.message,
      code: credits ? "insufficient_credits" : undefined
    });
  }
});

await loadRegistries();
server.listen(PORT, () => {
  const key = spitch.configured();
  console.log("");
  console.log("  SabiPass            http://localhost:" + PORT);
  console.log("  Content pack        " + PACK.trade + " — " + PACK.passages.length + " passages, reviewed: " + PACK.manifest.reviewed);
  console.log("  Speech              " + (key ? "Spitch (key loaded)" : "browser Web Speech — no SPITCH_API_KEY set"));
  if (key) {
    const v = (LANGS.languages || []).filter(l => l.validated).map(l => l.name).join(", ");
    console.log("  Validated           " + (v || "none"));
    console.log("  Check live coverage npm run diag");
  } else {
    console.log("  To enable Spitch    cp .env.example .env  and add SPITCH_API_KEY");
  }
  console.log("");
});
