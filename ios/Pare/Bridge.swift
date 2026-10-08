//  Bridge.swift — Pare iOS shell
//  What: receives messages the pare.gg page posts to the app (share, haptic, openSettings) and acts on them.
//  How it fits: PareWebView registers this under the name "pare"; the web calls
//               window.webkit?.messageHandlers?.pare?.postMessage({ type: "share", url, title }).
//  React analogy: a `window.addEventListener("message", ...)` handler with a switch on `type` and an allow-list.
//  Swift tip: `message.body` arrives as `Any`. `as? [String: Any]` safely tries to read it as a JSON object.

import UIKit
import WebKit

final class Bridge: NSObject, WKScriptMessageHandler {
    private weak var shell: ShellState?

    init(shell: ShellState) {
        self.shell = shell
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Only trust the top-level pare.gg page, never an embedded frame or another site.
        let origin = message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame,
              origin.protocol == "https",
              AppConfig.inAppHosts.contains(origin.host.lowercased()),
              let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }

        switch type {
        case "share":
            share(body, from: message.webView)
        case "haptic":
            if let raw = body["style"] as? String, let style = HapticStyle(rawValue: raw) {
                style.play()
            }
        case "openSettings":
            shell?.showSettings = true
        default:
            #if DEBUG
            print("[Bridge] ignored message type:", type)
            #endif
        }
    }

    /// `{ type: "share", url: "https://pare.gg/compare?away=KC&home=BUF", title?: "KC vs BUF" }`
    private func share(_ body: [String: Any], from webView: WKWebView?) {
        guard let webView,
              let raw = body["url"] as? String,
              let url = URL(string: raw),
              AppConfig.isInApp(url) else { return }

        var items: [Any] = [url]
        if let title = (body["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty {
            items.insert(String(title.prefix(200)), at: 0)
        }

        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        // iPad shows the share sheet as a popover, which crashes without an anchor. Center it on the page.
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = webView
            popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        presentFromTop(sheet, from: webView)
    }
}

/// `{ type: "haptic", style: "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error" }`
private enum HapticStyle: String {
    case light, medium, heavy, selection, success, warning, error

    func play() {
        switch self {
        case .light: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .medium: UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case .heavy: UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case .selection: UISelectionFeedbackGenerator().selectionChanged()
        case .success: UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .warning: UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error: UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}
