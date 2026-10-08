//
// DebugTab.swift
// Pare
//
// Native Debug tools for development.
// React Equivalent: DevTools panel with debugging utilities
//

import SwiftUI
import WebKit

/// Debug tab with development tools
/// Similar to React DevTools with debugging utilities
struct DebugTab: View {
    
    // MARK: - Properties
    
    @ObservedObject var webViewModel: WebViewModel
    @State private var consoleLogs: [String] = []
    
    // MARK: - Body
    
    var body: some View {
        NavigationView {
            Form {
                // Current State Section
                Section {
                    LabeledContent("Current URL") {
                        Text(webViewModel.currentURL.absoluteString)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .lineLimit(2)
                    }
                    
                    LabeledContent("Page Title") {
                        Text(webViewModel.pageTitle.isEmpty ? "N/A" : webViewModel.pageTitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    LabeledContent("Loading") {
                        if webViewModel.isLoading {
                            ProgressView()
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                    
                    LabeledContent("Progress") {
                        Text("\(Int(webViewModel.estimatedProgress * 100))%")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("Current State")
                }
                
                // Navigation Section
                Section {
                    HStack {
                        Button {
                            // TODO: Access webView to go back
                        } label: {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                        .disabled(!webViewModel.canGoBack)
                        
                        Spacer()
                        
                        Button {
                            // TODO: Access webView to go forward
                        } label: {
                            Text("Forward")
                            Image(systemName: "chevron.right")
                        }
                        .disabled(!webViewModel.canGoForward)
                    }
                    
                    Button {
                        // TODO: Access webView to reload
                    } label: {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Reload")
                        }
                    }
                    
                    Button {
                        webViewModel.resetToHome()
                    } label: {
                        HStack {
                            Image(systemName: "house")
                            Text("Reset to Home")
                        }
                    }
                } header: {
                    Text("Navigation")
                }
                
                // WebView Info Section
                Section {
                    LabeledContent("User Agent") {
                        Text(webViewModel.userAgent)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(3)
                    }
                    
                    LabeledContent("Environment") {
                        Text(webViewModel.environment.rawValue)
                            .foregroundColor(.blue)
                    }
                    
                    LabeledContent("Base URL") {
                        Text(webViewModel.environment.baseURL)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("WebView Info")
                }
                
                // Debug Actions Section
                Section {
                    Button {
                        resetWebView()
                    } label: {
                        HStack {
                            Image(systemName: "arrow.counterclockwise")
                            Text("Reset WebView State")
                        }
                        .foregroundColor(.orange)
                    }
                    
                    Button {
                        printDebugInfo()
                    } label: {
                        HStack {
                            Image(systemName: "doc.text")
                            Text("Print Debug Info")
                        }
                    }
                } header: {
                    Text("Debug Actions")
                } footer: {
                    Text("Reset clears all cookies, cache, and local storage")
                }
                
                // Console Logs Section
                Section {
                    if consoleLogs.isEmpty {
                        Text("No console logs yet")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    } else {
                        ForEach(consoleLogs.indices, id: \.self) { index in
                            Text(consoleLogs[index])
                                .font(.system(.caption, design: .monospaced))
                                .foregroundColor(.primary)
                        }
                    }
                } header: {
                    HStack {
                        Text("Console Logs")
                        Spacer()
                        if !consoleLogs.isEmpty {
                            Button("Clear") {
                                consoleLogs.removeAll()
                            }
                            .font(.caption)
                        }
                    }
                } footer: {
                    Text("Logs from JavaScript via PareBridge")
                }
            }
            .navigationTitle("Debug")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Config.printConfiguration()
                    } label: {
                        Image(systemName: "info.circle")
                    }
                }
            }
        }
    }
    
    // MARK: - Methods
    
    private func resetWebView() {
        Task {
            let dataStore = WKWebsiteDataStore.default()
            let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
            let date = Date(timeIntervalSince1970: 0)
            
            await dataStore.removeData(ofTypes: dataTypes, modifiedSince: date)
            print("✅ [Debug] WebView state reset")
            
            // Reset to home
            webViewModel.resetToHome()
            consoleLogs.append("✅ WebView state reset")
        }
    }
    
    private func printDebugInfo() {
        print("📱 === DEBUG INFO ===")
        Config.printConfiguration()
        print("   Current URL: \(webViewModel.currentURL.absoluteString)")
        print("   Page Title: \(webViewModel.pageTitle)")
        print("   Can Go Back: \(webViewModel.canGoBack)")
        print("   Can Go Forward: \(webViewModel.canGoForward)")
        print("   Loading: \(webViewModel.isLoading)")
        print("   Progress: \(Int(webViewModel.estimatedProgress * 100))%")
        print("   User Agent: \(webViewModel.userAgent)")
        print("===================")
        
        consoleLogs.append("📱 Debug info printed to console")
    }
}

// MARK: - Preview

#Preview {
    DebugTab(webViewModel: WebViewModel())
}

