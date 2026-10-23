# Pre-release audit — 2026-10-23

Scope: branch `claude/mosaic-personal-database-pnxy71` at `801afb7` plus the fixes listed below.
Method: source review, re-running all existing tests, adversarial probes (DB, HTTP, browser),
new regression tests. No production system, real Anthropic API key, email provider or
non-Chromium browser was available; anything depending on those is marked **unverified**.

**Verdict: limited beta only (限定ベータなら可). Not a production candidate yet** — see the open
High items (account recovery, Tử Vi reference verification, legal review, backup key management/ops).

## Findings

| ID | Sev. | Status | Finding | Location |
|---|---|---|---|---|
| AUD-01 | High | **Fixed** | DB errors carried SQL **parameters** (diary text, search terms, session-token hashes) in `Error.message`; Next.js logs uncaught render errors verbatim. Reproduced in real `next start` logs (`params: <token hash>`) by forcing `statement_timeout=1ms` on a dev DB. | `src/server/db/tx.ts` |
| AUD-02 | Medium | **Fixed** | `/insights?kind=…&ai=1` sent record excerpts to the AI provider on a plain GET; a cross-site link carries the `SameSite=Lax` cookie, so a third-party page could trigger an AI send for an opted-in user. Now requires `Sec-Fetch-Site: same-origin`. | `src/app/(app)/insights/page.tsx` |
| AUD-04 | Medium | **Fixed** | Concurrent answers by one user raced in tendency recomputation (23505 / 40P01) and **rolled back the answer** (reproduced 3/3). Serialized with a per-user transaction advisory lock. | `src/server/services/tendencies.ts` |
| AUD-05 | High | **Fixed (script)** / Open (ops) | Backups were unencrypted unless an env var was set; restore failed (“checksum mismatch”) when run from another directory. Now encryption is mandatory unless explicitly overridden, checksums are path-independent. Key custody, schedule, off-site copy and restore drills are not set up. | `scripts/backup.sh`, `scripts/restore.sh` |
| AUD-06 | High | Open | No account recovery and no email verification. A forgotten password = permanent loss of a lifetime of records; unverified emails allow squatting and make safe recovery impossible to add later without re-verification. | `src/server/services/account.ts` |
| AUD-07 | High | Open | Tử Vi correctness is established only against one independent library (iztro, Chinese tradition) and hand derivations. No published Vietnamese reference charts checked. VN-specific rules verified by hand only: Hỏa/Linh direction, Thiên Thương/Thiên Sứ, Giải Thần, Thiên Y, Kiếp Sát. Calendar meridian for births outside Vietnam (UTC+7 applied to the local civil date) is a methodological choice not confirmed by an expert. Brightness, Thiên Quý, Tiểu Hạn etc. not computed. | `src/lib/tuvi/*`, `docs/TUVI_RULESET.md` |
| AUD-08 | High | Open | Legal/compliance work not done (see §Legal). | — |
| AUD-03 | Medium | Open (config) | Without `TRUST_PROXY=1`, all registrations share one bucket (10/hour for the whole service — reproduced) and there is no per-IP login limit. On Netlify use `TRUST_PROXY=1` with `CLIENT_IP_HEADER=x-nf-client-connection-ip` (added after the audit; unit-tested, not verified on Netlify). | `src/server/auth/session.ts` |
| AUD-09 | Medium | Open | Per-account login limit (8 / 15 min) lets anyone lock a known email out for 15 minutes. | `src/server/auth/rate-limit.ts` |
| AUD-10 | Medium | Open | Live Anthropic API unverified (incl. `fallbacks: "default"` beta). Exercised only through the SDK against a local stub. | `src/server/ai/claude.ts` |
| AUD-11 | Medium | Open | No monitoring/alerting, health endpoint, incident process; `rate_limit_buckets` and expired `sessions` are never purged. | — |
| AUD-12 | Medium | Open | Only Chromium (mobile profile) tested; no Safari/Firefox, no screen-reader test; no load test beyond a short local run. | — |
| AUD-13 | Medium | **Fixed** | Timeline list was silently capped at 200 entries without paging. | `src/app/(app)/memories/page.tsx` |
| AUD-14 | Low | Open | `mosaic_app` may UPDATE/INSERT `comparison_results` for a session it participates in (reproduced at DB level). Not reachable through the UI; matters only if app code is compromised. | `drizzle/0001_rls_and_functions.sql` |
| AUD-15 | Low | Open | Registration reveals whether an email exists (rate-limited). | `account.ts` |
| AUD-16 | Low | Open | AI output validation checks that cited ids exist, not that the text is supported by them. | `reflection.ts` |
| AUD-17 | Low | Open | Export contains the text of still-sealed letters (user's own data; intentional, but undocumented to users). | `export.ts` |
| AUD-18 | Low | Open | Dev-only dependency advisories: esbuild ≤0.24.2 (via drizzle-kit), braces ≤3.0.3 (via eslint). `pnpm audit --prod`: 0. | `pnpm-lock.yaml` |
| AUD-19 | Low | **Fixed** | WCAG AA colour contrast failures (axe) on Tử Vi chart and settings footer. | `src/components/*` |
| AUD-20 | Low | Open | Sessions: fixed 30-day lifetime, no idle timeout, no session list / sign-out-everywhere (except via password change). | `account.ts` |
| AUD-21 | Low | Open (doc) | DB password inside the URL is visible in the process list during backups; use `.pgpass`. | `scripts/backup.sh` |
| AUD-22 | Low | **Fixed** | AI refusal / malformed output reported as “temporarily unavailable”; worst-case AI latency in a page render ≈ 3 min. Now explicit reasons and ≈ 60 s bound. | `src/server/ai/claude.ts` |
| AUD-23 | Low | Open | Only the consent-text *version id* is stored, not the text; no record of privacy-policy acceptance at sign-up. | `comparison_consents`, `account.ts` |
| AUD-24 | Info | Fixed (doc) | `docs/STATUS.md` claimed CI was never run; GitHub Actions run 39914230085 actually passed all steps incl. E2E. | `docs/STATUS.md` |

No Critical issue was found in the audited scope. This is not a guarantee of absence.

## Checks that passed (with evidence)
- IDOR / other users' data: integration tests (read/update/delete by id, forged `user_id`, forged FK) + browser test (third user → 404 on comparison and memory URLs).
- Every `"use server"` export checks the session except register/login/locale (scripted check).
- Server Actions with forged `Origin` rejected (HTTP probe + E2E); export route rejects foreign origins.
- Stored XSS: `<script>`, `<svg onload>`, `<img onerror>` in diary, tag and display name are HTML-escaped (HTTP probe).
- SQL injection: no `sql.raw`; all queries parameterized; LIKE wildcards escaped (tested).
- Session fixation: arbitrary cookie values are not accepted; login always issues a new random token.
- Share links: hash-only storage, expiry, max uses, revocation cascade, two-sided scoped consent, private-answer exclusion, no score (integration + E2E).
- AI: only the question's evidence is sent — no email, birth data, unrelated diary, person notes or user id (stub-provider test); injected/unknown citations rejected; 500/refusal/garbage fall back to deterministic output.
- Backups: encrypted round trip, tamper detection, restore from another directory, RLS still enforced after restore, identical row counts and content hash.
- Tử Vi: day-30 births (not covered before) agree with iztro on Mệnh and main stars (>100 charts).

## Legal — technical items for counsel (no legal conclusions drawn here)
Applicable framework to be confirmed by Vietnamese counsel: the Law on Personal Data Protection
(2025; to my knowledge in force from 2026-01-01) and its implementing decree(s), Decree 13/2023/ND-CP
(and how it is superseded/transitioned), the Law on Data (2024), the Cybersecurity Law and Decree
53/2022 (data localisation), plus the law of any other country where users live. Questions:
1. Lawful basis and consent design at sign-up (separate consents for diary storage, Tử Vi birth data, AI processing, comparisons); consent records must be stored (currently only comparison consent versions).
2. Sensitive data: diaries may contain health, religion, sexual life, etc.; is the service processing "sensitive personal data" and what extra measures/impact assessments apply?
3. Records about third parties (people, gifts, conversations) and their transfer to an AI provider.
4. Cross-border transfer: hosting location and Anthropic (US) — impact assessment dossiers, filing/notification duties.
5. Children: minimum age / guardian consent; there is no age gate.
6. Data-subject rights timelines (access/export, correction, deletion, withdrawal) — export and deletion exist; response SLAs and identity checks do not.
7. Retention: deleted data persists in backups until rotation — retention schedule and disclosure.
8. Breach notification duties and timelines — no incident process yet.
9. Whether a local representative, DPO, or registration is required.
10. Content of privacy policy / terms (processors, AI, Tử Vi disclaimer).
