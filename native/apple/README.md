# Harbour — Apple Wrapper

This folder contains a minimal SwiftUI shell that hosts the Harbour PWA in a `WKWebView`. One codebase, three platforms (iOS, iPadOS, macOS via Catalyst).

## Quick start

```bash
# 1. Generate the Xcode project (run on your Mac)
cd native/apple
xcodegen generate          # if you have xcodegen installed
# or open Xcode → File → New → Project → "App" → drag the .swift / Info.plist files in
```

If you don't have xcodegen, the simplest path:

1. In Xcode: **File → New → Project → iOS → App** (Interface: SwiftUI, Language: Swift). Bundle ID: `app.harbour.ios`.
2. Replace the generated `*App.swift` with `HarbourApp.swift` from this folder.
3. Replace `Info.plist` with the one here.
4. Set `appURL` in `HarbourApp.swift` to your deployed Harbour URL.
5. **Signing & Capabilities** → set Team. Add capabilities: **Background Modes** → Audio.
6. **Run** to a simulator or device.

## Mac Catalyst (macOS)

In the target's **General** tab, tick **Mac (Designed for iPad)** *or* **Optimize Interface for Mac** for full Catalyst.

## Submitting

1. Bump `CFBundleVersion` in Info.plist.
2. **Product → Archive** → **Distribute App** → App Store Connect.
3. Add screenshots, description, privacy nutrition labels (Harbour collects no data beyond what's stored locally).

## tvOS

Not included in this scaffold. tvOS apps cannot host WKWebView for content; reading long-form on a TV is unusual. Ask if you want a separate tvOS audio-only client.
