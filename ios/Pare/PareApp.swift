//  PareApp.swift — Pare iOS shell
//  What: the app's entry point, its shared state (ShellState) and the root screen (RootView).
//  How it fits: PareApp → RootView → PareWebView, with OfflineView and SettingsView layered on top.
//  React analogy: `index.tsx` + `<App />`; ShellState ≈ a small context store, RootView ≈ the layout component.
//  Swift tip: `@Observable` makes a class's properties reactive. Views that read them re-render on change.

import SwiftUI
import WebKit

@main
struct PareApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

/// State shared by the web view, the offline screen and the settings sheet. One per window.
@Observable
@MainActor
final class ShellState {
    var isOffline = false
    var showSettings = false

    /// Set by PareWebView when it's created. Weak so the state never keeps a dead web view alive.
    @ObservationIgnored weak var webView: WKWebView?

    /// Reload the current page, or the home page if nothing has loaded yet (offline cold launch).
    func retry() {
        guard let webView else { return }
        if webView.url == nil {
            webView.load(URLRequest(url: AppConfig.homeURL))
        } else {
            webView.reload()
        }
    }

    /// Load a pare.gg path, e.g. "/privacy", in the main web view.
    func navigate(to path: String) {
        guard let url = URL(string: path, relativeTo: AppConfig.homeURL)?.absoluteURL,
              AppConfig.isInApp(url) else { return }
        webView?.load(URLRequest(url: url))
    }
}

struct RootView: View {
    // @State here (not in PareApp) gives each iPad window its own web view + state.
    @State private var shell = ShellState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            Color(.bgDeep).ignoresSafeArea()
            // The web page handles safe areas itself (viewport-fit=cover + env(safe-area-*)).
            PareWebView(shell: shell).ignoresSafeArea()
            if shell.isOffline {
                OfflineView(shell: shell)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: shell.isOffline)
        .sheet(isPresented: $shell.showSettings) {
            SettingsView(shell: shell)
        }
        .preferredColorScheme(.dark)
        .onChange(of: scenePhase) { _, phase in
            // Coming back to the app while offline → try again automatically.
            if phase == .active && shell.isOffline { shell.retry() }
        }
        .onOpenURL { _ in
            // Phase W (universal links): map pare.gg URLs to shell.navigate(to:).
        }
    }
}
