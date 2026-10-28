# MOSAIC

**A lifetime, piece by piece.** — *Every piece of you matters.*

MOSAIC is a private, long-term personal database: record the small pieces of your life, answer one
small question a day, keep notes about the people you care about, read your Tử Vi chart, and —
only when both people agree — compare with someone via a QR code.
It is not a social network and it does not tell you who you are; it keeps your records so that
*you* can look back and understand.

## Features
| Area | What works |
|---|---|
| Timeline | Short notes or full entries (thoughts, feelings, memories, decisions + reasons, goals, dreams, regrets, achievements, values, sealed letters to future you). Edits keep every earlier version. Tags, people, dates, accent-insensitive search. |
| Daily Discovery | One curated question a day (5 formats, follow-ups), skip anytime, re-answer/correct with full history and “did your view change?”. |
| Insights | Rule-based tendencies with the answers behind them, uncertainty and your own confirm/reject; evidence-first reflections (“what changed?”, “what do I value?”, patterns, past beliefs, a relationship over time). Optional AI reflection that must cite your records. |
| Tử Vi | Deterministic Vietnamese Tử Vi engine (lunar calendar UTC+7, 12 palaces, Mệnh/Thân, Cục, 14 main stars, 30+ auxiliary stars, Tứ Hóa, Tuần/Triệt, rings, Đại Hạn), documented ruleset, rule-based interpretation. |
| People | Preferences with *where you learned it* (they said / observed / guess / unverified), conversations, shared events, gifts and reactions, important dates & reminders, evidence-based gift ideas. |
| QR & comparison | Revocable share links/QR, two-sided scoped consent, comparison in three areas without any total score, revoke anytime. |
| Your data | JSON export of everything, per-record deletion, full account deletion. |

Languages: 日本語, English, Tiếng Việt.

## Stack
Next.js 16 (App Router, Server Actions) · TypeScript · PostgreSQL 16 with Row Level Security ·
Drizzle ORM · zod · Tailwind CSS 4 · Vitest (real-DB integration tests) · Playwright · optional
Anthropic Claude API.

## Quick start (local)
```bash
pnpm install
# roles + databases (local PostgreSQL)
sudo -u postgres psql -v owner_pw=owner_dev_pw -v app_pw=app_dev_pw -v dbname=mosaic_dev -f scripts/db-bootstrap.sql
cp .env.example .env.local   # then set the passwords / URLs
pnpm db:migrate && pnpm db:seed
pnpm dev                      # http://localhost:3000
```

## Scripts
`pnpm dev | build | start | lint | typecheck | test | test:e2e | db:migrate | db:seed` ·
`scripts/backup.sh` · `scripts/restore.sh` · `scripts/db-reset-local.sh` (local only)

## Layout
```
src/app/              routes (pages, server actions, /api/export), proxy.ts = CSP & headers
src/server/           db (schema, RLS transactions), auth, services (business logic), ai
src/lib/tuvi/         calendar, can-chi, ruleset, engine, interpretation (pure, deterministic)
src/lib/discovery/    question selection, answer validation, tendency model (pure)
src/lib/compare/      comparison logic (pure)
src/content/          question bank, preference categories
drizzle/              SQL migrations (0001 = RLS, roles' grants, SECURITY DEFINER functions)
tests/unit|integration|e2e
docs/                 see Documentation below
```

## Documentation
- [Tử Vi ruleset & verification](docs/TUVI_RULESET.md)
- [Security & privacy design](docs/SECURITY.md)
- [Deployment, environment variables, backup & restore](docs/DEPLOYMENT.md)
- [Implementation status — implemented / not implemented / not verified](docs/STATUS.md)
- [Handover notes for a new session (Japanese)](docs/引き継ぎ.md)
- Concept, decisions and the philosophy review (Japanese): [CONCEPT](docs/CONCEPT.md) ·
  [DECISIONS](docs/DECISIONS.md) · [PHILOSOPHY_REVIEW](docs/PHILOSOPHY_REVIEW.md)
- [Gift boxes (Japanese)](docs/ギフトボックス仕様.md) · [External services the operator sets up (Japanese)](docs/外部サービス設定.md)

Tử Vi content is a traditional interpretation, not scientific fact or prediction.
