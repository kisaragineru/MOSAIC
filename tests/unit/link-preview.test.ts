import { describe, expect, it } from "vitest";
import { firstUrl } from "@/components/link-card";
import { decodeHtml, parsePreview } from "@/server/link-preview/parse";
import { checkUrl, FetchRefused, isPublicAddress } from "@/server/link-preview/safe-fetch";

describe("link preview safety", () => {
  it("only public addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "ff02::1"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) expect(isPublicAddress(ip), ip).toBe(true);
    expect(isPublicAddress("not-an-ip")).toBe(false);
  });

  it("only http(s) on standard ports, without credentials", () => {
    expect(checkUrl("https://vt.tiktok.com/ZSgxDomeP/").hostname).toBe("vt.tiktok.com");
    for (const bad of ["file:///etc/passwd", "ftp://example.com/", "javascript:alert(1)", "https://user:pw@example.com/", "http://example.com:8080/", "gopher://x", "not a url"]) {
      expect(() => checkUrl(bad), bad).toThrow(FetchRefused);
    }
  });
});

describe("reading a page's card", () => {
  it("prefers Open Graph, then Twitter, then title and description; resolves the image", () => {
    const html = `<html><head><title>Fallback &amp; title</title>
      <meta name="description" content="plain description">
      <meta property="og:title" content="OG &quot;title&quot;">
      <meta content="Shop" property="og:site_name">
      <meta name="twitter:image" content="/img/card.png">
      <script>var x = '<meta property="og:title" content="evil">'</script>
      </head><body><meta property="og:title" content="not in head"></body></html>`;
    expect(parsePreview(html, "https://example.com/a/b")).toEqual({ title: 'OG "title"', description: "plain description", siteName: "Shop", image: "https://example.com/img/card.png" });
    expect(parsePreview("<title>Only title</title>", "https://example.com")).toEqual({ title: "Only title", description: null, siteName: null, image: null });
    expect(parsePreview('<head><meta property="og:image" content="javascript:alert(1)"></head>', "https://example.com").image).toBeNull();
  });

  it("decodes the page's own charset", () => {
    const sjis = Buffer.from([0x82, 0xb1, 0x82, 0xf1, 0x82, 0xc9, 0x82, 0xbf, 0x82, 0xcd]); // こんにちは
    const html = Buffer.concat([Buffer.from('<head><meta charset="Shift_JIS"><title>'), sjis, Buffer.from("</title></head>")]);
    expect(parsePreview(decodeHtml(html, "text/html"), "https://example.jp").title).toBe("こんにちは");
  });

  it("finds the first link in a message", () => {
    expect(firstUrl("見て https://vt.tiktok.com/ZSgxDomeP/ すごい")).toBe("https://vt.tiktok.com/ZSgxDomeP/");
    expect(firstUrl("（https://example.com/a）。")).toBe("https://example.com/a");
    expect(firstUrl("リンクなし")).toBeNull();
  });
});
