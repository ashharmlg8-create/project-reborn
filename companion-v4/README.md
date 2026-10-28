# Reborn Companion V4 — offline-first development branch

This is a new standalone **V4 development prototype**, not a replacement for the original V3.25 Companion.

## Run locally

Serve this directory with a static local server, e.g. open a terminal in \`companion-v4\` and run:

\`\`\`sh
python -m http.server 8080
\`\`\`

Open http://localhost:8080. The app uses browser localStorage under a **new, isolated key**. It does not read V3.25 browser storage or access ChatGPT account Memory.

## PWA / install

Host these files over HTTPS (for example GitHub Pages from this branch) or localhost. If your browser offers an **Install app** option, use it. SVG-only manifest icon compatibility varies; PNG icons and device/browser installation tests are still required before calling installability verified. The service worker caches the static app shell for offline use; **localStorage is separate per origin/browser/profile**.

## Data and privacy

No cloud database, AI model, push notifications, sign-in, server-side encryption or cross-device sync exists in this build. Browser localStorage stores personal records **unencrypted**. Avoid storing highly sensitive information on shared devices. Private Session mode blocks new app-state writes; it does **not** change browser caching or ChatGPT/platform privacy settings.

Use **Backup → Export** regularly and save the JSON somewhere private. Import only accepts the new \`reborn-v4-persistent\` format; V3.21/V3.25 exports are not automatically imported. Merge keeps existing records when IDs or dates conflict. Before any migration from the old app, obtain a valid export with real records and audit it.

## Testing

Open \`tests.html\` in a browser (or serve it under localhost) to run the app-core regression suite. Browser cross-device tests, backup power-loss tests and production security evaluation are pending.

## Branch isolation

This code lives under \`companion-v4/\` on a separate development branch. It does not modify existing V3.25 deployment or the repository's main branch.
