# Harbour ⚓

A calm place for the things you want to read later.

Harbour is a read-later app inspired by the best of Matter, Pocket, and Raindrop.io. Save links, read or listen, highlight passages, organize with tags and nested collections — all from one beautifully simple interface.

Built on Astro + Cloudflare Workers. Stores articles client-side (IndexedDB) so the entire library is yours. Ships as a PWA installable on every modern OS, plus a Chrome/Safari extension and thin native wrappers for the App Store and Play Store.

## Features

- **Save anything** — paste a URL, use the bookmarklet, or one-click save with the browser extension
- **Read it your way** — clean reading view with adjustable font, size, line height, and column width
- **Listen to it** — built-in text-to-speech using the system voices on every platform
- **Highlight + take notes** — four colors, optional notes, easy export
- **Organize** — tags, nested collections, search, bulk edit
- **Find duplicates** — automatic deduplication across saves
- **Bring your data** — JSON import/export; nothing leaves your device unless you want it to
- **Offline first** — full PWA, works without a network once installed
- **Bold, friendly UI** — big buttons, big icons, generous spacing, instant dark mode

## Project structure

```
src/
  pages/                # Routes (Library, Reader, Highlights, Tags, Collections, Settings, /api/extract)
  components/           # Sidebar, Topbar, AddArticleModal, CommandBar, Icon
  layouts/AppLayout.astro
  lib/                  # types, db (IndexedDB), readability, settings, util, icons, toast
  scripts/app.ts        # Global client runtime (theme, shortcuts, modals)
  styles/global.css     # Design system

public/
  manifest.webmanifest  # PWA manifest with share-target + protocol-handler
  sw.js                 # Service worker (app-shell caching)
  icons/                # PWA icons (generated via scripts/gen-icons.mjs)
  favicon.svg, og-default.svg

extension/              # Chrome/Edge/Brave/Safari Web Extension (MV3)
native/                 # Apple (iOS/iPadOS/macOS) + Android (TWA) wrappers
scripts/                # Build helpers (icon generation)
```

## Develop

```bash
npm install
npm run dev          # http://localhost:4321
```

Other useful scripts:

```bash
npm run build        # production build
npm run preview      # build + serve via wrangler dev
npm run deploy       # deploy to Cloudflare Workers
npm run icons        # regenerate PWA + extension icons
```

## Deploy (Cloudflare Workers)

The repo already has a Cloudflare Workers integration. Pushing to `main` triggers an automatic build & deploy. To deploy from the CLI:

```bash
npm run deploy
```

The Cloudflare adapter exposes the `/api/extract` server endpoint as a Worker route so URL fetches bypass CORS.

## Browser extensions

See [`extension/README.md`](./extension/README.md). Manifest V3 — works in Chrome, Edge, Brave, Arc, and (via Xcode wrap) Safari on macOS/iOS.

## Native apps

See [`native/README.md`](./native/README.md). Thin SwiftUI / TWA shells over the deployed PWA. One-time Xcode and Android Studio wrap, then App Store / Play Store distribution.

## Why local-first storage?

Read-later apps fail when their backend goes away (RIP Pocket, July 2025). Harbour keeps your library in IndexedDB on your device — fast, offline, and yours. Backups are a JSON export away. The Cloudflare Worker is only used for the URL fetcher; everything else runs in your browser.

## License

MIT.
