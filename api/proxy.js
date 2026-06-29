// /api/proxy.js — Vercel 서버리스 통합 프록시 (Gemini + Google TTS)
// POST { type:"gemini", prompt }  → 파싱된 JSON | { text }
// POST { type:"tts", text, gender, rate, lang } → { audio:base64, voice }
// env: GEMINI_API_KEY, GOOGLE_TTS_KEY
//
// 접근 제어: 같은 Vercel 도메인(정적 화면)에서만 호출되도록 CORS 제한 + IP 레이트리밋.
// ※ 하드 보장(분산 인스턴스 무관)이 필요하면 Vercel KV/Upstash로 교체. 현재는 best-effort(인메모리).

// ── 허용 출처 ───────────────────────────────────────────────
// 내 도메인에서만 호출 허용(+localhost 테스트, +동일출처). 다른 vercel 앱은 차단.
const ALLOWED_EXACT = ["https://pitto-voca.vercel.app"];
function isAllowedOrigin(origin) {
  if (!origin) return true; // 동일출처(정적+함수 같은 프로젝트)면 Origin 없을 수 있음
  if (ALLOWED_EXACT.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
  } catch (_) {}
  return false;
}

// ── 레이트리밋(IP별, best-effort 인메모리) ─────────────────────
// 가정: 1인 하루 최대 2시간 학습. 백그라운드 굽기는 짧은 시간에 다발 호출(CONC=6)이라 분당 한도는 넉넉히.
const MIN_WINDOW = 60 * 1000, DAY_WINDOW = 24 * 60 * 60 * 1000;
const TTS_PER_MIN = 400;     // 분당 TTS(굽기 버스트 허용)
const TTS_PER_DAY = 4000;    // 하루 TTS(2시간 학습 + 캐시 고려, 남용만 차단)
const GEMINI_PER_DAY = 100;  // 하루 단어검색/예문(수동이라 적음)
const ipMin = new Map(), ipDay = new Map();
function bump(map, ip, windowMs) {
  const now = Date.now();
  const arr = (map.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now); map.set(ip, arr);
  if (map.size > 5000) for (const [k, v] of map) if (v.every((t) => now - t >= windowMs)) map.delete(k);
  return arr.length;
}
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  return (xff ? String(xff).split(",")[0].trim() : req.headers["x-real-ip"]) || "unknown";
}

// ── Gemini ───────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!prompt || typeof prompt !== "string" || prompt.length > 2000) return { error: "bad prompt" };
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "no GEMINI_API_KEY" };
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key);
  const r = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  const text = await r.text();
  if (!r.ok) return { error: "gemini error", detail: text.slice(0, 300) };
  const data = JSON.parse(text);
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  let out = ""; for (const p of parts) if (typeof p.text === "string") out += p.text;
  const clean = out.replace(/```json/g, "").replace(/```/g, "").trim();
  if (!clean) return { error: "gemini empty" };
  try { return JSON.parse(clean); } catch (_) { return { text: clean }; }
}

// ── Google TTS (Chirp 3: HD) ─────────────────────────────────
const LANG = { ja: { code: "ja-JP", f: "Aoede", m: "Alnilam" }, ko: { code: "ko-KR", f: "Aoede", m: "Alnilam" } };
const VPOOL = ["Aoede","Kore","Leda","Zephyr","Puck","Charon","Fenrir","Orus","Alnilam"];
function pickVoice(lang, gender, name) {
  const L = LANG[lang] || LANG.ja, prefix = L.code + "-Chirp3-HD-";
  if (name && /^[A-Za-z]+$/.test(name)) return prefix + name;
  if (gender === "female") return prefix + L.f;
  if (gender === "male") return prefix + L.m;
  return prefix + VPOOL[Math.floor(Math.random() * VPOOL.length)];
}
async function callTts(body) {
  const key = process.env.GOOGLE_TTS_KEY;
  if (!key) return { error: "no GOOGLE_TTS_KEY" };
  const text = (body && body.text ? String(body.text) : "").slice(0, 400);
  if (!text.trim()) return { error: "no text" };
  let lang = (body.lang ? String(body.lang) : "ja").toLowerCase(); lang = lang.startsWith("ko") ? "ko" : "ja";
  const gender = body.gender || "random";
  const rate = Math.min(2.0, Math.max(0.25, Number(body.rate) || 1.0));
  const voice = pickVoice(lang, gender, body.voice || "");
  const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(key), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: { text }, voice: { languageCode: (LANG[lang] || LANG.ja).code, name: voice }, audioConfig: { audioEncoding: "MP3", speakingRate: rate } }),
  });
  const data = await r.json();
  if (!r.ok) return { error: "tts failed", detail: (data && data.error && data.error.message) || "unknown" };
  return { audio: data.audioContent, voice };
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  if (isAllowedOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (origin && !isAllowedOrigin(origin)) { res.status(403).json({ error: "forbidden origin" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  if (!body || typeof body !== "object") body = {};
  const ip = clientIp(req);

  try {
    if (body.type === "tts") {
      if (bump(ipMin, ip, MIN_WINDOW) > TTS_PER_MIN || bump(ipDay, ip, DAY_WINDOW) > TTS_PER_DAY) {
        res.status(429).json({ error: "rate limit (tts)" }); return;
      }
      res.status(200).json(await callTts(body)); return;
    }
    if (body.type === "gemini") {
      if (bump(ipDay, "g:" + ip, DAY_WINDOW) > GEMINI_PER_DAY) { res.status(429).json({ error: "rate limit (gemini)" }); return; }
      res.status(200).json(await callGemini(body.prompt)); return;
    }
    res.status(400).json({ error: "bad type" });
  } catch (e) {
    res.status(500).json({ error: "proxy error", detail: String(e && e.message ? e.message : e) });
  }
};
