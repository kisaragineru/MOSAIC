import { existsSync, readFileSync } from "node:fs";

/** Minimal .env loader for CLI scripts (Next.js loads env files itself). Existing env wins. */
export function loadEnv(files = [".env.local", ".env"]) {
  for (const f of files) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || m[1] === undefined) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
    }
  }
}
