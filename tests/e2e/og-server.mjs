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

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
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
