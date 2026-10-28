# Implementation status (honest list)

Last reviewed: 2026-10-28. See also the pre-release audit: [AUDIT.md](AUDIT.md) (a snapshot from
2026-10-23; some of its open items have since been addressed, as noted below), the handover notes
[引き継ぎ.md](引き継ぎ.md) and the philosophy review's progress table
([PHILOSOPHY_REVIEW.md](PHILOSOPHY_REVIEW.md) §6).

## Implemented and covered by automated tests
- Registration, login, logout, password change, account deletion; DB-backed rate limits
- Sign-in with Google or Facebook alongside email; sign-up kept for people (hidden field, signed
  form time, optional Cloudflare Turnstile); invite-only mode (`REGISTRATION_CODE`, invite codes),
  people arriving through a story or share link need no code
- Password recovery: a one-time link issued by an admin; by email once Resend is configured
- PostgreSQL schema with RLS for the runtime role, composite ownership FKs, SECURITY DEFINER entry points
- Memories/timeline: short notes, versioned edits (append-only), tags, people links, event dates,
  photos/videos (gallery or camera), sealed letters to the future, accent-insensitive search,
  filters, per-record audience (only me / relationships / every connection), permanent deletion
- Replies under records (one thread for everyone who can see the record); messages and groups,
  link previews, translation of a message under the original
- Daily Discovery: curated questions (5 formats + conditional follow-ups), deterministic daily
  selection, skip / re-answer / correction / "did your view change?", full history, per-answer
  privacy, deletion
- Tendency model, insights, the manual (template + optional AI rewrite, shared per preset only once
  approved), the story at the end of the manual, monthly look back, the year's story on the birthday
- Tử Vi engine + ruleset documentation (see TUVI_RULESET.md), 14 type illustrations, type quiz for an
  unknown birth hour, pair readings for two connected people
- Important people: private notebook (preferences with provenance, conversations, shared events,
  gifts, important dates, reminders), evidence-cited gift ideas
- Connections: QR/links (also from a saved QR picture), connect without choosing what to show,
  calling card seen by every connection (type and bio by default; never the chart), scoped
  two-sided consent for comparisons, revocation, "how others see you"
- Works: the story handed over as a work with a link per person, readable before signing up,
  translated into the reader's language, "opened" notice, connect in one tap from the end
- Gift boxes: records and letters written for a child, a printable book, copied into the child's
  own records on receipt (see ギフトボックス仕様.md)
- Push notifications for messages; in-app notice tray
- Admin page (`ADMIN_EMAILS`): numbers-only overview, users list, beta testers, launch checklist,
  development tools (only with `DEV_TOOLS=on`, admins only)
- Privacy policy and terms of use pages, open to everyone
- JSON export; backup/restore scripts (round-trip tested locally)
- Mobile-first UI in Japanese, English and Vietnamese (`src/lib/i18n/messages/`)

## Test runs performed
- `npx vitest run` — unit + integration against real PostgreSQL 16 (2026-10-28: 422 passed)
- `npx playwright test` — Playwright (Chromium, Pixel 7 profile) against a `next start` production
  build (2026-10-28: 65 tests, all passed per the handover notes)
- `npx tsc --noEmit -p .`, `npx eslint`, `pnpm build`

## Not implemented
- Email verification at sign-up, MFA
- Email notifications (push and in-app only)
- Gift boxes' next step (see the end of ギフトボックス仕様.md)
- Star brightness, Thiên Quý, Tiểu Hạn, Lưu niên stars and the other items listed in TUVI_RULESET.md §2
- Application-level field encryption
- Public profile pages (intentional: MOSAIC is for chosen people only)

## Not verified
- Tử Vi charts against published Vietnamese practitioner charts (verified against iztro + hand derivations)
- Load and performance testing; accessibility audit with assistive technology; browsers other than Chromium

## Production
- Live at https://mosaicdiary.app (Netlify + Neon), behind a shared password (HTTP Basic auth) while
  being tried. What is left before opening is in 外部サービス設定.md and the admin page's launch checklist.
- Still open from the audit: Vietnamese legal review (AUD-08), Tử Vi reference charts (AUD-07),
  backup key custody / schedule / restore drills (AUD-05), monitoring (AUD-11).
