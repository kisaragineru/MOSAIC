# Implementation status (honest list)

See also the pre-release audit: [AUDIT.md](AUDIT.md).

## Implemented and covered by automated tests
- Registration, login, logout, password change, account deletion; DB-backed rate limits
- PostgreSQL schema with RLS for the runtime role, composite ownership FKs, SECURITY DEFINER entry points
- Memories/timeline: short notes, 10 kinds, versioned edits (append-only), tags, people links, event dates,
  sealed letters to the future, accent-insensitive search, filters, permanent deletion
- Daily Discovery: 48 curated bilingual questions (5 formats + conditional follow-ups), deterministic
  daily selection (cooldowns, sensitivity spacing, information gaps), skip / re-answer / correction /
  "did your view change?", full history, per-answer privacy, deletion
- Tendency model: evidence ids, ≥3 signals, mixed-state, recency decay, confidence < 1, confirm/reject/note,
  recomputed on every change (deleted evidence disappears immediately)
- Tử Vi engine + ruleset documentation (see TUVI_RULESET.md), stored charts with versions, rule-based
  interpretation, unknown-hour exploration, explicit late-Tý / leap-month choices
- Important people: preferences with source provenance and history, conversations/notes, shared events,
  gifts, important dates, in-app reminders; deterministic evidence-cited gift suggestions
- QR/share links, two-sided scoped consent, comparison (Tử Vi tradition / preferences & values / hints),
  revocation, share revocation cascade
- Evidence-first reflections; optional Claude reflection with citation validation (code path for the
  "not configured" fallback is tested; a **live API call was not made** — no API key in this environment)
- JSON export; backup/restore scripts (round-trip tested locally)
- Mobile-first UI in Vietnamese and English (Japanese can be added in `src/lib/i18n`)

## Test runs performed (see final report for counts)
- `pnpm test` — unit + integration against real PostgreSQL 16
- `pnpm test:e2e` — Playwright (Chromium, Pixel 7 profile) against `next start` production build
- `pnpm lint`, `pnpm typecheck`, `pnpm build`

## Not implemented
- Email verification, password reset by email, MFA (need an email provider)
- Push / email notifications (reminders are in-app only)
- AI-written Tử Vi interpretation and AI gift-explanation text (rule-based text only)
- Stored history of AI reflections (intentionally not stored)
- Japanese dictionary (structure ready)
- Star brightness, Thiên Quý, Tiểu Hạn, Lưu niên stars and the other items listed in TUVI_RULESET.md §2
- Application-level field encryption; admin tooling; account recovery without password
- Public profile pages (results are participant-only; no "publish to profile" option exists)

## CI
- GitHub Actions run 39914230085 (commit 801afb7) passed typecheck, lint, unit/integration and E2E.

## Not verified
- Tử Vi charts against published Vietnamese practitioner charts (verified against iztro + hand derivations)
- Live Anthropic API behaviour (structured output / refusal fallback) — code typechecks against SDK 1.1.0
- Deployment on a real hosting provider / managed PostgreSQL; load and performance testing
- Accessibility audit with assistive technology; browsers other than Chromium

## Before production
1. Provision production PostgreSQL (backups/PITR, disk encryption), run bootstrap/migrate/seed.
2. Set `APP_ORIGIN` (https), `TRUST_PROXY=1`, `RATE_LIMIT_SALT`; never expose `MIGRATION_DATABASE_URL` to the app.
3. Add email provider → verification + password reset; consider MFA.
4. Domain-expert review of the Tử Vi ruleset with published reference charts; decide Thiên Quý & brightness.
5. Privacy policy / terms (data controller, AI processor disclosure, retention), Vietnamese legal review
   (Decree 13/2023 on personal data protection) and any other applicable jurisdictions.
6. Schedule encrypted backups + restore drill; monitoring/alerting (without logging personal data).
7. Security review / penetration test; dependency update policy.
