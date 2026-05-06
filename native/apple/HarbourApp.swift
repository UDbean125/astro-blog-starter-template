// Harbour — iOS / iPadOS / macOS (Catalyst) shell
// Edit `appURL` below to point at your deployed Harbour instance.

import SwiftUI
import WebKit
import AVFoundation

let appURL = URL(string: "https://harbour.app")!  // <-- change me

@main
struct HarbourApp: App {
    init() {
        // Allow TTS to keep playing when the app is backgrounded.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.allowBluetooth, .allowAirPlay])
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    var body: some Scene {
        WindowGroup {
            HarbourWebView(url: appURL)
                .ignoresSafeArea(.container, edges: .top)
        }
    }
}

struct HarbourWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.preferences.javaScriptCanOpenWindowsAutomatically = true

        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.allowsBackForwardNavigationGestures = true
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.isInspectable = true     // allow Safari Web Inspector when in dev
        wv.backgroundColor = UIColor(red: 0.99, green: 0.98, blue: 0.95, alpha: 1)
        wv.scrollView.backgroundColor = wv.backgroundColor
        wv.uiDelegate = context.coordinator
        wv.navigationDelegate = context.coordinator
        wv.load(URLRequest(url: url))
        return wv
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate {
        // Open external links in the system browser, keep app links in the WebView.
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url, navigationAction.targetFrame == nil {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        // Handle window.open via the share sheet
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url { UIApplication.shared.open(url) }
            return nil
        }
    }
}
