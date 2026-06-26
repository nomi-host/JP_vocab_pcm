// Vercel Serverless Function — Google Gemini 프록시 (CommonJS)
// POST { prompt } -> { ...parsedJson } | { text } | { error }
// env: GEMINI_API_KEY
//
// 앱(브라우저)에서 { prompt }를 보내면 서버가 Gemini를 호출해 결과(보통 JSON)를 돌려준다.
// 키는 Vercel 환경변수 GEMINI_API_KEY 에만 존재하며 브라우저에 노출되지 않는다.
// 단어 자동검색·예문 생성에 사용된다.

const MODEL = 'gemini-2.5-flash';

// 허용 도메인(우리 앱)에서 온 요청만 받도록 제한.
// 배포처가 확정되면 EXACT에 정식 도메인을 추가하세요. (현재 *.vercel.app / localhost / github.io 허용)
const ALLOWED_EXACT = [
  'https://nomi-host.github.io',
];
function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin(서버리스와 정적 동일 배포) 등 Origin 없는 요청 허용
  if (ALLOWED_EXACT.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true;
  } catch (_) {}
  return false;
}

// IP별 호출 제한(간단형). Vercel 인스턴스가 살아있는 동안만 카운트되므로
// 완벽하진 않지만, 한 사람이 짧은 시간에 과도하게 호출하는 것을 억제한다.
const RATE_MAX = 10;            // 윈도 동안 허용 횟수
const RATE_WINDOW_MS = 60_000; // 1분
const hits = new Map();         // ip -> [timestamps]

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  // 메모리 누적 방지: 맵이 너무 커지면 정리
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowOrigin = isAllowedOrigin(origin) ? (origin || '*') : ALLOWED_EXACT[0];
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  // origin 제한
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'forbidden origin' });
    return;
  }

  // IP별 호출 제한
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.status(429).json({ error: '너무 많은 요청입니다. 잠시 후 다시 시도하세요.' });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: 'no GEMINI_API_KEY' }); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    const prompt = body.prompt;
    if (!prompt) { res.status(400).json({ error: 'no prompt' }); return; }
    // 비정상적으로 긴 프롬프트 차단(비용 폭주 방지)
    if (typeof prompt !== 'string' || prompt.length > 2000) {
      res.status(400).json({ error: 'prompt too long' });
      return;
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
      + MODEL + ':generateContent?key=' + encodeURIComponent(key);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json', // 프롬프트가 'JSON으로만' 요청 → 순수 JSON 응답
          thinkingConfig: { thinkingBudget: 0 }, // 사고 토큰 끔(속도/비용/응답 안정)
        },
      }),
    });

    const text = await r.text();
    if (!r.ok) { res.status(502).json({ error: 'gemini error', status: r.status, detail: text.slice(0, 500) }); return; }

    const data = JSON.parse(text);
    const cand = (data.candidates && data.candidates[0]) || null;
    let out = '';
    const parts = (cand && cand.content && cand.content.parts) || [];
    for (const p of parts) { if (typeof p.text === 'string') out += p.text; }
    const clean = out.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!clean) { res.status(502).json({ error: 'gemini empty', detail: text.slice(0, 500) }); return; }

    try { res.status(200).json(JSON.parse(clean)); }
    catch (e) { res.status(200).json({ text: clean }); }
  } catch (e) {
    res.status(500).json({ error: 'proxy error', detail: String(e && e.message ? e.message : e) });
  }
};
