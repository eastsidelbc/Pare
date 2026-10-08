//
// WebViewContainer.swift
// Pare
//
// SwiftUI wrapper for WKWebView with pull-to-refresh, progress bar, and external link handling.
// React Equivalent: Custom component wrapping an iframe with enhanced features
//

import SwiftUI
import WebKit
import SafariServices

/// SwiftUI container for WKWebView with iOS-native features
/// Similar to React component with useEffect hooks for lifecycle management
struct WebViewContainer: UIViewRepresentable {
    
    // MARK: - Properties
    
    @ObservedObject var viewModel: WebViewModel
    let enablePullToRefresh: Bool
    let openLinksExternally: Bool
    
    // MARK: - UIViewRepresentable
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        
        // Configure bridge
        let bridge = PareBridge(viewModel: viewModel)
        config.userContentController.add(bridge, name: PareBridge.handlerName)
        
        // Inject JavaScript at document start
        let script = WKUserScript(
            source: PareBridge.getInjectionScript(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(script)
        
        // Configure preferences
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        // Create WebView
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        
        // Set custom user agent
        let customUA = "Pare-iOS/\(Config.appVersion) (iPhone; iOS \(UIDevice.current.systemVersion))"
        webView.customUserAgent = customUA
        viewModel.userAgent = customUA
        
        // Add pull-to-refresh if enabled
        if enablePullToRefresh {
            let refreshControl = UIRefreshControl()
            refreshControl.addTarget(
                context.coordinator,
                action: #selector(Coordinator.handleRefresh(_:)),
                for: .valueChanged
            )
            webView.scrollView.addSubview(refreshControl)
            webView.scrollView.bounces = true
        }
        
        // KVO for progress
        webView.addObserver(
            context.coordinator,
            forKeyPath: #keyPath(WKWebView.estimatedProgress),
            options: .new,
            context: nil
        )
        
        webView.addObserver(
            context.coordinator,
            forKeyPath: #keyPath(WKWebView.isLoading),
            options: .new,
            context: nil
        )
        
        webView.addObserver(
            context.coordinator,
            forKeyPath: #keyPath(WKWebView.title),
            options: .new,
            context: nil
        )
        
        // Initial load
        let request = URLRequest(url: viewModel.currentURL)
        webView.load(request)
        
        print("🌐 [WebViewContainer] Created WebView with URL: \(viewModel.currentURL.absoluteString)")
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // Reload if URL changed externally
        if let currentURL = webView.url, currentURL != viewModel.currentURL {
            let request = URLRequest(url: viewModel.currentURL)
            webView.load(request)
            print("🌐 [WebViewContainer] Reloading with new URL: \(viewModel.currentURL.absoluteString)")
        }
    }
    
    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        // Remove observers
        webView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        webView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.isLoading))
        webView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.title))
    }
    
    // MARK: - Coordinator
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: WebViewContainer
        
        init(_ parent: WebViewContainer) {
            self.parent = parent
        }
        
        // MARK: - Pull to Refresh
        
        @objc func handleRefresh(_ refreshControl: UIRefreshControl) {
            if let webView = refreshControl.superview?.superview as? WKWebView {
                webView.reload()
                print("🔄 [WebViewContainer] Pull-to-refresh triggered")
            }
            
            // End refreshing after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                refreshControl.endRefreshing()
            }
        }
        
        // MARK: - KVO
        
        override func observeValue(
            forKeyPath keyPath: String?,
            of object: Any?,
            change: [NSKeyValueChangeKey : Any]?,
            context: UnsafeMutableRawPointer?
        ) {
            guard let webView = object as? WKWebView else { return }
            
            DispatchQueue.main.async {
                self.parent.viewModel.updateNavigationState(from: webView)
            }
        }
        
        // MARK: - WKNavigationDelegate
        
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            
            // Handle external links
            if parent.openLinksExternally {
                // Check if target="_blank" or external domain
                let isNewWindow = navigationAction.targetFrame == nil
                let isExternal = url.host != parent.viewModel.currentURL.host
                
                if isNewWindow || (isExternal && navigationAction.navigationType == .linkActivated) {
                    // Open in Safari
                    openInSafari(url)
                    decisionHandler(.cancel)
                    return
                }
            }
            
            print("🌐 [Navigation] Allowing: \(url.absoluteString)")
            decisionHandler(.allow)
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            print("🌐 [Navigation] Started loading")
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("🌐 [Navigation] Finished loading: \(webView.url?.absoluteString ?? "unknown")")
            
            // Stop refresh control if active
            if let refreshControl = webView.scrollView.subviews.first(where: { $0 is UIRefreshControl }) as? UIRefreshControl {
                refreshControl.endRefreshing()
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("❌ [Navigation] Failed: \(error.localizedDescription)")
            
            // Stop refresh control
            if let refreshControl = webView.scrollView.subviews.first(where: { $0 is UIRefreshControl }) as? UIRefreshControl {
                refreshControl.endRefreshing()
            }
        }
        
        // MARK: - WKUIDelegate
        
        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            // Handle window.open() - open in Safari
            if let url = navigationAction.request.url {
                openInSafari(url)
            }
            return nil
        }
        
        // MARK: - Helper Methods
        
        private func openInSafari(_ url: URL) {
            print("🌐 [External Link] Opening in Safari: \(url.absoluteString)")
            
            // Get the scene
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = windowScene.windows.first?.rootViewController else {
                // Fallback: open in system Safari
                UIApplication.shared.open(url)
                return
            }
            
            // Use SFSafariViewController for in-app browsing
            let safariVC = SFSafariViewController(url: url)
            rootViewController.present(safariVC, animated: true)
        }
    }
}

// MARK: - Public Methods Extension

extension WebViewContainer {
    /// Navigate back
    func goBack(_ webView: WKWebView) {
        webView.goBack()
    }
    
    /// Navigate forward
    func goForward(_ webView: WKWebView) {
        webView.goForward()
    }
    
    /// Reload
    func reload(_ webView: WKWebView) {
        webView.reload()
    }
}

