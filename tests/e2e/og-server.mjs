// A stand-in web page with an Open Graph card, for the link preview E2E test (local only).
import http from "node:http";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const port = Number(process.env.OG_PORT ?? 4599);

http
  .createServer((req, res) => {
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
