// /api/proxy.js — Vercel 서버리스 통합 프록시 (Gemini + Google TTS)
// POST { type:"gemini", prompt }  → 파싱된 JSON | { text }
// POST { type:"tts", text, gender, rate, lang } → { audio:base64, voice }
// env: GEMINI_API_KEY, GOOGLE_TTS_KEY
//
// 접근 제어: 같은 Vercel 도메인(정적 화면)에서만 호출되도록 CORS 제한 + IP 레이트리밋.
// ※ 하드 보장(분산 인스턴스 무관)이 필요하면 Vercel KV/Upstash로 교체. 현재는 best-effort(인메모리).

// ── 허용 출처 ───────────────────────────────────────────────
// 내 앱(같은 도메인)에서만 호출 허용. 같은 출처면 도메인이 뭐든(pitto-voca / 미리보기 해시 URL / 커스텀 도메인) 통과.
const ALLOWED_EXACT = ["https://pitto-voca.vercel.app"];
function isAllowedOrigin(origin, host) {
  if (!origin) return true; // 동일출처 요청은 Origin이 없을 수 있음
  if (ALLOWED_EXACT.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (host && u.host === host) return true; // same-origin(프론트=함수 같은 배포) → 도메인 무관 허용
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

// ── 피드백(오류 제보·기능 요청) → Google Apps Script로 서버사이드 포워딩 ──
// 브라우저에서 GAS로 직접 POST하면 GAS가 googleusercontent.com으로 302 리다이렉트하며
// CORS에 막혀 실패한다. 함수(서버)에서 대신 보내면 CORS 제약이 없어 확실히 전송된다.
const FEEDBACK_URL = "https://script.google.com/macros/s/AKfycbyCuoe-Oa7hpb4tKlkeyiG3LFVWaLMTZG9M5wUxChsFzI12kGQEaGLhdLyuuAoLhktc/exec";
async function callFeedback(body) {
  const name = (body && body.name ? String(body.name) : "").slice(0, 100);
  const message = (body && body.message ? String(body.message) : "").slice(0, 2000);
  if (!message.trim()) return { error: "no message" };
  const payload = JSON.stringify({
    name: name.trim(),
    message: message.trim(),
    ver: (body && body.ver ? String(body.ver) : "").slice(0, 40),
    ua: (body && body.ua ? String(body.ua) : "").slice(0, 400),
  });
  try {
    const r = await fetch(FEEDBACK_URL, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" }, // GAS 단순요청
      body: payload,
      redirect: "follow",
    });
    const text = await r.text();
    if (!r.ok) return { error: "feedback failed", detail: text.slice(0, 200) };
    try { const d = JSON.parse(text); if (d && d.error) return { error: "feedback rejected", detail: String(d.error).slice(0, 200) }; } catch (_) {}
    return { ok: true };
  } catch (e) {
    return { error: "feedback error", detail: String(e && e.message ? e.message : e) };
  }
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
  const host = req.headers.host || "";
  if (isAllowedOrigin(origin, host)) res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (origin && !isAllowedOrigin(origin, host)) { res.status(403).json({ error: "forbidden origin" }); return; }

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
    if (body.type === "feedback") {
      if (bump(ipDay, "fb:" + ip, DAY_WINDOW) > 50) { res.status(429).json({ error: "rate limit (feedback)" }); return; }
      res.status(200).json(await callFeedback(body)); return;
    }
    res.status(400).json({ error: "bad type" });
  } catch (e) {
    res.status(500).json({ error: "proxy error", detail: String(e && e.message ? e.message : e) });
  }
};
