import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLinkPreview, getLinkPreviewImage } from "@/server/services/link-preview";
import { makeUser } from "../helpers/factory";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
let server: http.Server;
let port = 0;
let hits = 0;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hits++;
    const path = (req.url ?? "").split("?")[0];
    if (path === "/page") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<html><head><meta property="og:title" content="夕焼けの写真"><meta property="og:description" content="きれいな空"><meta property="og:image" content="/card.png"><meta property="og:site_name" content="Photo"></head></html>`);
    } else if (path === "/card.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(PNG);
    } else if (path === "/to-metadata") {
      res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data/" });
      res.end();
    } else if (path === "/fake-image") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<head><meta property="og:title" content="x"><meta property="og:image" content="/svg"></head>`);
    } else if (path === "/svg") {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end("<svg onload=alert(1)></svg>");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as { port: number }).port;
});
afterAll(() => {
  server.close();
});

describe("link previews", () => {
  it("are refused for local addresses, unless a test allows that one host", async () => {
    const u = await makeUser();
    process.env.DEV_TOOLS = "on";
    delete process.env.LINK_PREVIEW_TEST_HOSTS;
    hits = 0;
    // A non-standard port is refused outright; a local name on the standard port resolves to a private address.
    await expect(getLinkPreview(u.userId, `http://127.0.0.1:${port}/page`)).rejects.toMatchObject({ code: "bad_url" });
    expect(await getLinkPreview(u.userId, "http://localhost/")).toBeNull();
    expect(await getLinkPreview(u.userId, "http://127.0.0.1/")).toBeNull();
    expect(hits).toBe(0); // nothing was even requested
    await expect(getLinkPreview(u.userId, "file:///etc/passwd")).rejects.toMatchObject({ code: "bad_url" });
  });

  it("fetch the card once, serve its image from here, and never follow a redirect to a private address", async () => {
    const u = await makeUser();
    process.env.DEV_TOOLS = "on";
    process.env.LINK_PREVIEW_TEST_HOSTS = `127.0.0.1:${port}`;
    hits = 0;
    // A fresh path (the refused fetch above is remembered as failed for a day).
    const p = await getLinkPreview(u.userId, `http://127.0.0.1:${port}/page?x=1#top`);
    expect(p).toMatchObject({ title: "夕焼けの写真", description: "きれいな空", siteName: "Photo", host: "127.0.0.1" });
    expect(p!.image).toMatch(/^\/api\/link-preview\/image\/[0-9a-f]{64}$/);
    const img = await getLinkPreviewImage(u.userId, p!.image!.split("/").pop()!);
    expect(img!.mime).toBe("image/png");
    expect(hits).toBe(2);
    // Cached: another person asking doesn't fetch again.
    const other = await makeUser();
    expect((await getLinkPreview(other.userId, `http://127.0.0.1:${port}/page?x=1`))!.title).toBe("夕焼けの写真");
    expect(hits).toBe(2);
    // A redirect to the cloud metadata address is refused.
    expect(await getLinkPreview(u.userId, `http://127.0.0.1:${port}/to-metadata`)).toBeNull();
    // An "image" that isn't one is dropped (the card stays, without it).
    expect((await getLinkPreview(u.userId, `http://127.0.0.1:${port}/fake-image`))!.image).toBeNull();
    delete process.env.LINK_PREVIEW_TEST_HOSTS;
  });
});
