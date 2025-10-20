//
//  SettingsTab.swift
//  Pare
//

import SwiftUI
import WebKit
import UIKit

struct SettingsTab: View {
    // MARK: - Properties
    
    @ObservedObject var webViewModel: WebViewModel
    
    // Sync directly with UserDefaults - changes persist and sync with HomeTab
    @AppStorage("enablePullToRefresh") private var enablePullToRefresh = true
    @AppStorage("openLinksExternally") private var openLinksExternally = true
    @State private var showClearCacheAlert = false

    var body: some View {
        NavigationView {
            Form {

                // MARK: Environment
                Section {
                    Picker("Environment", selection: $webViewModel.environment) {
                        ForEach(WebViewModel.Environment.allCases, id: \.self) { env in
                            Text(env.rawValue).tag(env)
                        }
                    }
                    // iOS 16-compatible change handler
                    .onChange(of: webViewModel.environment) { newEnv in
                        // If your WebViewModel has a helper to swap base and reload, call it.
                        // Otherwise, a simple "go home" is fine.
                        webViewModel.resetToHome()
                    }

                    HStack {
                        Text("Base URL")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(webViewModel.environment.baseURL)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .lineLimit(1)
                    }
                } header: {
                    Text("Environment")
                } footer: {
                    Text("Switch between local development (localhost:4000) and production.")
                }

                // MARK: Features
                Section {
                    Toggle("Pull to Refresh", isOn: $enablePullToRefresh)
                    
                    Toggle("Open Links Externally", isOn: $openLinksExternally)
                } header: {
                    Text("Features")
                } footer: {
                    Text("Enable native pull-to-refresh and open external links in Safari View.")
                }

                // MARK: Actions
                Section {
                    Button {
                        showClearCacheAlert = true
                    } label: {
                        Label("Clear Web Cache", systemImage: "trash")
                            .foregroundColor(.red)
                    }

                    Button {
                        webViewModel.resetToHome()
                    } label: {
                        Label("Go to Home", systemImage: "house")
                    }

                    Button {
                        UIApplication.shared.open(webViewModel.currentURL)
                    } label: {
                        Label("Open in Safari", systemImage: "safari")
                    }
                } header: {
                    Text("Actions")
                }

                // MARK: App Info
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("\(Config.appVersion) (\(Config.buildNumber))")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Bundle ID")
                        Spacer()
                        Text(Config.bundleIdentifier)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Build Type")
                        Spacer()
                        Text(Config.isDebug ? "Debug" : "Release")
                            .foregroundColor(Config.isDebug ? .orange : .green)
                    }
                } header: {
                    Text("App Info")
                }
            }
            .navigationTitle("Settings")
            .alert("Clear Web Cache?", isPresented: $showClearCacheAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Clear", role: .destructive) { clearWebCache() }
            } message: {
                Text("This will clear all cached website data and cookies.")
            }
        }
    }

    // MARK: - Helpers

    private func clearWebCache() {
        let store = WKWebsiteDataStore.default()
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        let since = Date(timeIntervalSince1970: 0)

        store.removeData(ofTypes: types, modifiedSince: since) {
            print("✅ [Settings] Web cache cleared")
            webViewModel.resetToHome()
        }
    }
}
