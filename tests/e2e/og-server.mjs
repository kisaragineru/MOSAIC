// A stand-in web page with an Open Graph card, for the link preview E2E test (local only), and a
// stand-in Google / Facebook sign-in (authorization code flow) for the sign-in E2E test.
import { createHash, randomUUID } from "node:crypto";
import http from "node:http";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const port = Number(process.env.OG_PORT ?? 4599);

// The account the next sign-in returns (set by the test), the codes handed out, the tokens issued.
const next = { google: null, facebook: null };
const codes = new Map();
const tokens = new Map();
const SECRETS = { google: "test-google-secret", facebook: "test-facebook-secret" };

function body(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(new URLSearchParams(b)));
  });
}

async function oauth(req, res, url) {
  const [, provider, step] = url.pathname.split("/");
  const json = (code, v) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(v));
  };
  if (step === "next") {
    next[provider] = Object.fromEntries(url.searchParams);
    return json(200, { ok: true });
  }
  if (step === "auth") {
    const back = new URL(url.searchParams.get("redirect_uri"));
    back.searchParams.set("state", url.searchParams.get("state") ?? "");
    if (!next[provider] || next[provider].deny) {
      back.searchParams.set("error", "access_denied");
    } else {
      const code = randomUUID();
      codes.set(code, { provider, who: next[provider], challenge: url.searchParams.get("code_challenge"), redirect: url.searchParams.get("redirect_uri") });
      back.searchParams.set("code", code);
    }
    res.writeHead(302, { Location: back.toString() });
    return res.end();
  }
  if (step === "token") {
    const f = await body(req);
    const c = codes.get(f.get("code"));
    codes.delete(f.get("code"));
    if (!c || c.provider !== provider || f.get("client_secret") !== SECRETS[provider] || f.get("redirect_uri") !== c.redirect) return json(400, { error: "invalid_grant" });
    // Google: the verifier must match the challenge sent at the start (PKCE).
    if (provider === "google" && createHash("sha256").update(f.get("code_verifier") ?? "").digest("base64url") !== c.challenge) return json(400, { error: "invalid_grant" });
    const token = randomUUID();
    tokens.set(token, c.who);
    return json(200, { access_token: token, token_type: "Bearer" });
  }
  const who = tokens.get((req.headers.authorization ?? "").replace("Bearer ", ""));
  if (!who) return json(401, { error: "invalid_token" });
  if (provider === "google") return json(200, { sub: who.sub, email: who.email, email_verified: who.verified !== "0", name: who.name });
  return json(200, { id: who.sub, name: who.name, ...(who.email ? { email: who.email } : {}) });
}

/**
 * A stand-in for the Anthropic Messages API, so AI-on screens are exercised in tests without a real
 * key or network. It answers by what the system prompt asks for, with clearly fake text.
 */
function anthropic(req, res) {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    const system = String(body.system ?? "");
    const user = String(body.messages?.[0]?.content ?? "");
    let out = {};
    if (system.includes("will read it")) out = { paragraphs: [`[AI共有] ${JSON.parse(user).part}を見せる相手向けに書き直した文章です。`] };
    else if (system.includes("light novel")) out = { paragraphs: [`[AI] ${JSON.parse(user).episode?.title ?? ""}の場面を書き直した物語です。`, "[AI] もう一段落。"] };
    else if (system.includes("user manual")) out = { paragraphs: [`[AI] ${JSON.parse(user).chapter?.title ?? ""}を書き直した文章です。`] };
    else if (system.includes("translate one chat message")) out = { same: false, translation: `[AI訳] ${user.replace(/<\/?message>/g, "").trim()}` };
    else if (system.includes("self-introduction")) out = { text: "[AI] 自己紹介の下書きです。" };
    else if (system.includes("translate a short personal story")) {
      // Marks each piece with the language asked for, e.g. "[en] ハナの物語".
      const lang = /\((ja|en|vi)\)/.exec(system)?.[1] ?? "?";
      const m = (x) => `[${lang}] ${x}`;
      const u = JSON.parse(user);
      out = u.paragraphs
        ? { title: m(u.title), paragraphs: u.paragraphs.map(m) }
        : { title: m(u.title), subtitle: m(u.subtitle), note: u.note ? m(u.note) : "", summary: u.summary.map(m), answers: u.answers.map((x) => ({ q: m(x.q), a: m(x.a) })) };
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: "msg_e2e", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text: JSON.stringify(out) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/v1/messages" && req.method === "POST") return void anthropic(req, res);
    if (url.pathname.startsWith("/google/") || url.pathname.startsWith("/facebook/")) return void oauth(req, res, url);
    if (req.url?.startsWith("/card.png")) {
      res.writeHead(200, { "Content-Type": "image/png" });
      return res.end(PNG);
    }
    if (req.url?.startsWith("/health")) {
      res.writeHead(200);
      return res.end("ok");
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><head><title>fallback</title>
<meta property="og:title" content="夕焼けの丘">
<meta property="og:description" content="週末に見つけた、きれいな空の写真です。">
<meta property="og:site_name" content="Photo Diary">
<meta property="og:image" content="/card.png">
</head><body>hello</body></html>`);
  })
  .listen(port, "127.0.0.1");
