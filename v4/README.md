# Reborn Companion V4 — Pistachio Alpha

**Status:** Runnable *development alpha*, **not** a verified production release. No original V3.25 data/source is changed.

## Run locally
Requires a recent web browser and Python or any static file server.
```sh
cd v4
python -m http.server 8080
```
Open http://localhost:8080

Do not open via file:// — encrypted IndexedDB/WebCrypto needs HTTPS or localhost.

## Automated domain tests
Requires Node.js 20+:
```sh
cd v4
npm test
```
Tests are written in `tests/core.test.mjs`. Browser E2E tests have **not yet been run** in this chat session. Static source checks run here do not establish that the full UI works.

## Architecture
- `src/core.mjs`: validation, dates, paise-based money math, scheduling, weekly summaries and nudge eligibility. Pure deterministic operations, no AI.
- `src/vault.mjs`: new independent IndexedDB namespace, AES-256-GCM with PBKDF2 (310,000 SHA-256 iterations), random salt/nonce, revision-based conflict checks, encrypted backup/restore to an *empty* V4 vault only.
- `src/app.mjs`: responsive Pistachio UI covering Today, Capture, Tasks, Planner, Money, Habits, Goals, Journal, Review, World Model, Coaching, Nudges and Privacy.
- `index.html` and `styles.css`: standalone UI.

## Privacy and legacy migration
- This V4 alpha uses a **new independent database name**. Original V3.25 has not been read, modified, migrated or deployed over.
- The old transfer JSON metadata reported version 3.21, not V3.25.
- Demo entries are not persistent. The encrypted vault starts empty; users must explicitly create/unlock it.
- Passwords are not saved; recovery is impossible without the original password and a correct encrypted backup.
- Backups may be restored only if no V4 vault exists on the new isolated origin.
- No external API calls, AI service, cloud sync, email, background reminder deliveries or analytics.
- All private information remains local to the browser and active session/vault; treat local device compromise, malicious extensions, XSS and forgotten passwords as real security threats.

## Known gaps / not to claim
- There is **no actual LLM or validated crisis safety classifier**. The router is a deterministic UX-only fallback and **must not authorize tools**.
- I3 estimate/actual per task-type training, full energy windows and deadline prediction are not yet integrated.
- The original Blueprint's I6 policy includes 7-day nudge frequency decay; review the current rule for edge cases before deploying real delivery.
- No functioning scheduled notifications, real-world context connections, push messages, full I7–I9 evaluation, browser E2E, independent security review or accessibility audit.
- No PWA service worker at this stage. App needs a local HTTP server.
- Changes have not passed a real Chromium browser run in this chat. Do not put live sensitive data into an unreviewed alpha build.

## Next gates
1. Run Node unit tests and fix any failures.
2. Implement browser E2E via Playwright: first load, navigation, form submission, vault create/reload/unlock/restore, cross-tab compare-and-swap, mobile keyboard navigation.
3. Add schema migration and safer per-operation undo.
4. Consolidate full I1–I9 with validated safety/privacy and actual user-controlled AI gateway when authorized.
5. Deploy V4 to an isolated origin only after approved release gates.

## Required source blueprint
`life-companion-v4-intelligence-layer.md` from the user's handoff Library. This repo does not include the user's private files or account archive.
