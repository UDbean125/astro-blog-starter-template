# Harbour Native App Wrappers

Harbour is built as a Progressive Web App. To submit to the App Store / Play Store, this folder contains thin native wrappers that point at your deployed Harbour URL.

## What's here

```
native/
  apple/        ← Xcode project (iOS, iPadOS, macOS via Catalyst)
  android/      ← Android Studio project (Trusted Web Activity)
  README.md
```

You only need to do this once per platform. The actual app updates ship from the web — your native shell just hosts the same PWA.

## 1) Apple (iOS / iPadOS / macOS)

**Requirements:** Mac with Xcode 15+, an Apple Developer account ($99/yr).

1. `cd native/apple`
2. Open `Harbour.xcodeproj` in Xcode.
3. Select the `Harbour` target → **Signing & Capabilities** → set **Team** to your Apple Developer team. Xcode will auto-generate a provisioning profile.
4. In `HarbourApp.swift`, change `appURL` to your deployed Harbour URL (e.g. `https://my.harbour.app`).
5. **Run** to test on a simulator or device. The app launches in a fullscreen `WKWebView` with file downloads, share sheet integration, and audio background playback enabled.
6. Build for **Mac (Designed for iPad)** or enable **Mac Catalyst** in the target settings to ship a macOS version from the same code.
7. **Product → Archive** → upload to App Store Connect.

The included Info.plist has:
- `UIBackgroundModes: audio` — keeps TTS playing when the app is backgrounded.
- `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` — placeholders so the Safari Web Speech voice list works.
- App Transport Security defaults — only HTTPS allowed.

### iPad-specific
- Multi-window scenes are supported (Split View / Stage Manager).
- Apple Pencil highlighting works through the underlying selection APIs.

### Apple TV (tvOS)
Skipped intentionally. tvOS has no WebView; a separate Swift/SwiftUI client would be required and reading long-form on TV is rare. If you change your mind, ask and we'll scaffold a tvOS audio-only "Now Playing" target that streams the TTS audio for queued articles.

## 2) Android (Phones, Tablets, Chromebooks)

**Requirements:** Android Studio Hedgehog+, a Google Play Developer account ($25 one-time).

The wrapper is a **Trusted Web Activity (TWA)** — a tiny native shell that opens your PWA in a Custom Tab without browser chrome. This is Google's recommended path for shipping a PWA to Play.

1. Install Bubblewrap globally:  `npm i -g @bubblewrap/cli`
2. `cd native/android`
3. Edit `twa-manifest.json` and replace `host` and `start_url` with your deployed Harbour URL.
4. Run: `bubblewrap update && bubblewrap build`
5. Bubblewrap produces a signed APK and a Play-store-ready AAB.
6. Upload `app-release-bundle.aab` to Play Console.

For Digital Asset Links verification (so the URL bar disappears), upload `assetlinks.json` to your Harbour deployment at `/.well-known/assetlinks.json`. Bubblewrap prints the JSON to use; we've included a template at `native/android/assetlinks.template.json`.

### Chromebook
ChromeOS runs Android apps natively, so the same APK installs there. No extra work.

## 3) Why a thin native wrapper instead of porting?

- The PWA already does ~98% of what a native app does (offline, install, push, share-target, file system).
- Native wrappers ensure App Store / Play Store distribution and let users install through familiar channels.
- A single PWA + thin shells is far cheaper to maintain than parallel native ports.
- All product features (TTS, highlights, search, sync) live in the web app and update instantly without store review.
