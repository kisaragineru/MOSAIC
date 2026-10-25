/**
 * Fetching someone else's web page for a link preview, without letting a link reach places it
 * shouldn't (SSRF): only http(s) on the standard ports; every address the name resolves to must
 * be public (no loopback, private, link-local, carrier-grade NAT, multicast or reserved ranges,
 * IPv4 or IPv6); the connection goes to the address that was checked; redirects are followed by
 * hand (at most 3) and checked again; a short timeout; and a hard cap on the bytes read.
 */
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export class FetchRefused extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "FetchRefused";
  }
}

/** Is this IP address on the public internet? */
export function isPublicAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number, number, number];
    if (a === 0 || a === 10 || a === 127) return false; // "this", private, loopback
    if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
    if (a === 169 && b === 254) return false; // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return false; // private
    if (a === 192 && b === 168) return false; // private
    if (a === 192 && b === 0) return false; // IETF protocol assignments / documentation
    if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
    if (a === 198 && b === 51) return false; // documentation
    if (a === 203 && b === 0) return false; // documentation
    if (a >= 224) return false; // multicast, reserved, broadcast
    return true;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return false;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped) return isPublicAddress(mapped[1]!);
    if (/^(fc|fd)/.test(v)) return false; // unique local
    if (/^fe[89ab]/.test(v)) return false; // link-local
    if (/^ff/.test(v)) return false; // multicast
    if (v.startsWith("2001:db8") || v.startsWith("64:ff9b") || v.startsWith("100:")) return false; // documentation, NAT64, discard
    return true;
  }
  return false;
}

/** Hosts a test may reach despite being local (never set in production). */
function allowedForTests(host: string) {
  const allow = process.env.LINK_PREVIEW_TEST_HOSTS;
  return !!allow && process.env.DEV_TOOLS === "on" && allow.split(",").map((s) => s.trim()).includes(host);
}

/** The URL if it may be fetched at all (scheme, port, credentials), else a refusal. */
export function checkUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new FetchRefused("bad_url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchRefused("scheme");
  if (u.username || u.password) throw new FetchRefused("credentials");
  const test = allowedForTests(u.host);
  if (u.port && !test && !((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443"))) throw new FetchRefused("port");
  return u;
}

/** Resolve a name to one public address (all of its addresses must be public). */
async function resolvePublic(host: string, test: boolean): Promise<{ address: string; family: number }> {
  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare)) {
    if (!test && !isPublicAddress(bare)) throw new FetchRefused("private_address");
    return { address: bare, family: net.isIPv6(bare) ? 6 : 4 };
  }
  const all = await lookup(bare, { all: true, verbatim: true }).catch(() => {
    throw new FetchRefused("dns");
  });
  if (!all.length) throw new FetchRefused("dns");
  if (!test && all.some((a) => !isPublicAddress(a.address))) throw new FetchRefused("private_address");
  return all[0]!;
}

export interface Fetched {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
}

const USER_AGENT = "Mozilla/5.0 (compatible; MOSAIC-LinkPreview/1.0)";

/** GET one URL (no redirect following), connecting only to the checked address. */
function getOnce(u: URL, maxBytes: number, timeoutMs: number, accept: string): Promise<Fetched & { location: string | null }> {
  const test = allowedForTests(u.host);
  return resolvePublic(u.hostname, test).then(
    (addr) =>
      new Promise((resolve, reject) => {
        const lib = u.protocol === "https:" ? https : http;
        const req = lib.request(
          {
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port || undefined,
            path: `${u.pathname}${u.search}`,
            method: "GET",
            headers: { "User-Agent": USER_AGENT, Accept: accept, "Accept-Language": "ja,en;q=0.8" },
            // Connect to the address we checked, whatever the name resolves to by then.
            lookup: ((_h: string, o: { all?: boolean }, cb: (err: Error | null, address: unknown, family?: number) => void) =>
              o?.all ? cb(null, [{ address: addr.address, family: addr.family }]) : cb(null, addr.address, addr.family)) as never,
            timeout: timeoutMs,
            servername: net.isIP(u.hostname) ? undefined : u.hostname,
          },
          (res) => {
            const status = res.statusCode ?? 0;
            const location = status >= 300 && status < 400 ? (res.headers.location ?? null) : null;
            const declared = Number(res.headers["content-length"] ?? 0);
            if (declared > maxBytes) {
              res.destroy();
              return reject(new FetchRefused("too_large"));
            }
            const chunks: Buffer[] = [];
            let size = 0;
            res.on("data", (c: Buffer) => {
              size += c.length;
              if (size > maxBytes) {
                // Enough for a preview: keep what we have (the head of a page is at the top).
                chunks.push(c.subarray(0, Math.max(0, maxBytes - (size - c.length))));
                res.destroy();
                resolve({ url: u.toString(), status, contentType: String(res.headers["content-type"] ?? ""), body: Buffer.concat(chunks), location });
                return;
              }
              chunks.push(c);
            });
            res.on("end", () => resolve({ url: u.toString(), status, contentType: String(res.headers["content-type"] ?? ""), body: Buffer.concat(chunks), location }));
            res.on("error", reject);
          },
        );
        req.on("timeout", () => req.destroy(new FetchRefused("timeout")));
        req.on("error", reject);
        req.end();
      }),
  );
}

/** GET a URL, following up to 3 redirects, each one checked like the first. */
export async function safeFetch(raw: string, opts: { maxBytes: number; timeoutMs?: number; accept: string }): Promise<Fetched> {
  let u = checkUrl(raw);
  for (let hop = 0; hop <= 3; hop++) {
    const r = await getOnce(u, opts.maxBytes, opts.timeoutMs ?? 4000, opts.accept);
    if (!r.location) return r;
    u = checkUrl(new URL(r.location, u).toString());
  }
  throw new FetchRefused("too_many_redirects");
}
