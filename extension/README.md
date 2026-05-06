# Harbour Browser Extension (Chrome / Edge / Brave / Safari)

One-click save from any tab to your Harbour library. Works in any Chromium browser today; on Safari it ships through Xcode (one-time wrap).

## Install in Chrome / Edge / Brave (dev)

1. Run `node ../scripts/gen-ext-icons.mjs` once (generates `/extension/icons/*`).
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** → choose this `extension/` folder.
5. Click the puzzle icon → pin **Save to Harbour**.

You can package for the Chrome Web Store via `Pack extension` in `chrome://extensions`.

## Install in Safari (macOS / iOS)

Apple requires Safari extensions to be packaged inside an app via Xcode. The web-extension code (this folder) is identical; the wrap is just a one-time conversion:

```bash
xcrun safari-web-extension-converter ./extension --app-name "Harbour" --bundle-identifier app.harbour.safariext
```

That command generates an Xcode project. Open it, set your team in **Signing & Capabilities**, and **Run** on a Mac to load the extension on macOS Safari, or run on a connected iPhone/iPad for the iOS Safari extension.

To submit to the App Store, archive and upload via Xcode → Window → Organizer.

## Configuration

- The extension has a **Harbour URL** field in the popup. Set it to your deployed Harbour URL (e.g. `https://my.harbour.app`). Defaults to `https://harbour.app`.
- The setting is synced via `chrome.storage.sync` so it follows your browser profile.

## Keyboard

- `Cmd/Ctrl+Shift+S` — save current tab.
- Right-click any link → "Save link to Harbour".
- Right-click any page → "Save page to Harbour".
