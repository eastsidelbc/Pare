//  WebView.swift — Pare iOS shell
//  What: the full-screen browser view that shows https://pare.gg.
//  How it fits: PareApp → RootView → PareWebView. Bridge.swift receives messages from the page.
//  React analogy: a component wrapping an <iframe>; Coordinator ≈ its event handlers.
//  Swift tip: UIViewRepresentable is how SwiftUI hosts an older UIKit view (WKWebView).

import SafariServices
import SwiftUI
import UIKit
import WebKit

struct PareWebView: UIViewRepresentable {
    let shell: ShellState

    func makeCoordinator() -> Coordinator {
        Coordinator(shell: shell)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Persistent storage, so pare:* localStorage (comparisons, favorites) survives relaunches.
        config.websiteDataStore = .default()
        // This value replaces WebKit's default UA ending ("Mobile/15E148"), so keep that token and add ours after it.
        config.applicationNameForUserAgent = "Mobile/15E148 \(AppConfig.uaToken)/\(AppConfig.version)"
        config.userContentController.add(context.coordinator.bridge, name: AppConfig.bridgeName)

        let webView = WKWebView(frame: .zero, configuration: config)

        // Paint BgDeep everywhere before the page draws: no white flash.
        let background = UIColor(resource: .bgDeep)
        webView.isOpaque = false
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        webView.underPageBackgroundColor = background

        // App-shell rule: header/nav stay put, no rubber-band, no swipe-back through tab history.
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsLinkPreview = false

        #if DEBUG
        webView.isInspectable = true // Safari → Develop → <device> → pare.gg
        #endif

        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        shell.webView = webView
        webView.load(URLRequest(url: AppConfig.homeURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: AppConfig.bridgeName)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let shell: ShellState
        let bridge: Bridge

        /// Network failures that mean "show the offline screen". -999 (cancelled) is not here, so it's ignored.
        private static let offlineErrorCodes: Set<Int> = [
            NSURLErrorNotConnectedToInternet,
            NSURLErrorNetworkConnectionLost,
            NSURLErrorTimedOut,
            NSURLErrorCannotFindHost,
            NSURLErrorCannotConnectToHost,
            NSURLErrorDNSLookupFailed,
        ]

        init(shell: ShellState) {
            self.shell = shell
            self.bridge = Bridge(shell: shell)
        }

        // MARK: Navigation policy

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void
        ) {
            decisionHandler(policy(for: navigationAction, in: webView))
        }

        /// pare.gg → stays in the app. mailto/tel → system. Other web links → Safari sheet. Anything else → blocked.
        private func policy(for action: WKNavigationAction, in webView: WKWebView) -> WKNavigationActionPolicy {
            guard let url = action.request.url else { return .cancel }
            // Embedded frames load as they would in Safari; only the main view is locked to pare.gg.
            if let frame = action.targetFrame, !frame.isMainFrame { return .allow }
            // A target=_blank pare.gg link is allowed here, then createWebViewWith loads it in the main view.
            if AppConfig.isInApp(url) { return .allow }
            openOutside(url, from: webView)
            return .cancel
        }

        /// target=_blank links and window.open: no popup windows, same rules as above.
        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                if AppConfig.isInApp(url) {
                    webView.load(navigationAction.request)
                } else {
                    openOutside(url, from: webView)
                }
            }
            return nil
        }

        private func openOutside(_ url: URL, from webView: WKWebView) {
            switch url.scheme?.lowercased() {
            case "mailto", "tel":
                UIApplication.shared.open(url)
            case "https", "http":
                presentFromTop(SFSafariViewController(url: url), from: webView)
            default:
                break
            }
        }

        // MARK: Loading + offline

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            shell.isOffline = false
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handleLoadError(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handleLoadError(error)
        }

        private func handleLoadError(_ error: Error) {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain, Self.offlineErrorCodes.contains(nsError.code) {
                shell.isOffline = true
            }
        }

        /// iOS killed the page's process (usually memory pressure). Reload instead of showing a blank screen.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            shell.retry()
        }
    }
}

/// Present a screen (Safari sheet, share sheet) on top of whatever is showing in `view`'s window.
func presentFromTop(_ viewController: UIViewController, from view: UIView) {
    guard var top = view.window?.rootViewController else { return }
    while let presented = top.presentedViewController {
        top = presented
    }
    top.present(viewController, animated: true)
}
