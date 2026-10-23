# Security & privacy design

## Principles
Private by default · least data · the user's own judgement wins · nothing leaves without consent ·
everything exportable and deletable.

## Authentication
- Email + password, argon2id (m=19 MiB, t=2, p=1); constant-time path for unknown emails.
- Sessions: 256-bit random token in an `httpOnly`, `SameSite=Lax` cookie (`__Host-` + `Secure` on HTTPS);
  only `sha256(token)` is stored; 30-day expiry; expired sessions deleted on use;
  password change signs out other sessions; logout deletes the session row.
- Rate limits in PostgreSQL (hashed keys): login per IP and per account, registration, share-link
  opening, AI calls, exports.
- Not implemented: email verification, password reset by email, MFA (need an email provider).

## Authorization (defence in depth)
1. Every server action/route resolves the session server-side; pages under `(app)` require a user.
2. Services always filter by `user_id` and verify ownership of referenced rows.
3. **PostgreSQL Row Level Security**: the web app connects as `mosaic_app` (no BYPASSRLS, owns
   nothing). Each request runs in a transaction with `set_config('app.user_id', …, true)`; every
   personal table has `user_id = app_current_user_id()` policies.
4. **Composite foreign keys** `(parent_id, user_id)` prevent attaching rows to another user's records
   (FK checks bypass RLS, so this is enforced separately).
5. Cross-user operations (login lookup, share links, consented comparison) go only through narrow
   `SECURITY DEFINER` functions with pinned `search_path` that re-check participation and consent.
Tests cover reading/updating/deleting other users' rows by id, forged `user_id`, forged foreign
keys, anonymous access, role privilege escalation, and identity leakage across pooled connections.

## Sharing & comparison
- Share tokens: 256-bit random, only SHA-256 stored, shown once, carried in the URL **fragment**
  (never sent to servers, never in Referer), moved to `sessionStorage` and removed from the address bar.
- Expiry (1–30 days), optional max uses, owner revocation (also ends sessions opened through it).
- Opening a link grants nothing. Each participant consents to explicit scopes; the purpose and
  exact data per scope are shown first; consent text version stored.
- Only the **intersection** of scopes is used; only answers the respondent marked "allow in
  comparisons"; only derived Tử Vi fields (never birth date/time). Diaries, people notes and free
  text are never read. Unanswered ≠ different. No total score.
- Results readable by the two participants only, and only while active; revocation deletes them.

## Web security
- Nonce-based CSP (`script-src 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`,
  `form-action 'self'`, `object-src 'none'`), `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy: same-origin` (not `no-referrer`: that makes browsers send `Origin: null` on form POSTs), `Permissions-Policy`, HSTS on HTTPS, `Cache-Control: private, no-store`.
- Server Actions: Next.js Origin/Host check. Export route: explicit same-origin check (Origin or
  `Sec-Fetch-Site`). All input validated with zod; React escaping; no `dangerouslySetInnerHTML`.
- Redirect targets restricted to same-site relative paths.

## Logging
- Errors are logged as name + SQLSTATE only. Every DB error is converted at the transaction
  boundary (`withUser`/`withAnon`) into a `DbError` carrying only the SQLSTATE and, for an allow-list
  of codes, PostgreSQL's value-free primary message. Drizzle's original message (which embeds query
  parameters) and PostgreSQL's `detail` never leave `src/server/db/tx.ts` (AUD-01).
- Audit events record actions (login, export, share created/revoked, consent, deletion) with ids only.

## AI
- Off unless the server has `ANTHROPIC_API_KEY` **and** the user opts in **and** submits the AI form
  from the site itself (`Sec-Fetch-Site: same-origin`; cross-site links never trigger it — AUD-02).
- Only short excerpts (≤280 chars, ≤40 items) of the records relevant to that question are sent.
- Output must cite evidence ids that exist; otherwise discarded. AI text is never stored, so deleted
  records can never resurface through a cached summary. Tử Vi placement never uses AI.

## Deletion & export
- Delete a memory, answer, preference, person (with everything about them), birth data, or the whole
  account (password + typed confirmation; cascades through all tables, ends comparisons).
- Tendency claims are recomputed in the same transaction as any answer change/deletion.
- Full JSON export (`/settings` → POST `/api/export`), rate limited, recorded in `data_export_jobs`.

## Data at rest
Rely on the database provider's disk encryption; encrypt backups with GPG (see DEPLOYMENT.md).
Application-level field encryption is not implemented.
