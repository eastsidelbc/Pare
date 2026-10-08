//
// WebViewModel.swift
// Pare
//
// State management for WKWebView.
// React Equivalent: useState/useReducer for WebView state
//

import Foundation
import SwiftUI
import WebKit

/// Manages WebView state and navigation
/// Similar to React's useState for managing WebView-related state
@MainActor
class WebViewModel: ObservableObject {
    // MARK: - Published State
    
    /// Current URL being loaded
    @Published var currentURL: URL
    
    /// Can navigate back?
    @Published var canGoBack: Bool = false
    
    /// Can navigate forward?
    @Published var canGoForward: Bool = false
    
    /// Loading progress (0.0 to 1.0)
    @Published var estimatedProgress: Double = 0.0
    
    /// Is currently loading?
    @Published var isLoading: Bool = false
    
    /// Current page title
    @Published var pageTitle: String = ""
    
    /// Active environment
    @Published var environment: Environment = .dev
    
    /// User agent string
    var userAgent: String = ""
    
    // MARK: - Environment
    
    enum Environment: String, CaseIterable {
        case dev = "Development"
        case prod = "Production"
        
        var baseURL: String {
            switch self {
            case .dev:
                return Config.devBaseURL
            case .prod:
                return Config.prodBaseURL
            }
        }
    }
    
    // MARK: - Initialization
    
    init() {
        // Start with dev environment
        self.environment = .dev
        self.currentURL = URL(string: "\(Config.activeBaseURL)/compare")!
        
        // Detect environment from Config
        if Config.isRelease {
            self.environment = .prod
        }
        
        print("🌐 [WebViewModel] Initialized with URL: \(currentURL.absoluteString)")
    }
    
    // MARK: - Navigation Methods
    
    /// Get home URL for current environment
    func homeURL() -> URL {
        URL(string: "\(environment.baseURL)/compare")!
    }
    
    /// Switch environment
    func switchEnvironment(_ newEnvironment: Environment) {
        guard newEnvironment != environment else { return }
        environment = newEnvironment
        currentURL = homeURL()
        print("🌐 [WebViewModel] Switched to \(newEnvironment.rawValue): \(currentURL.absoluteString)")
    }
    
    /// Update navigation state from WKWebView
    func updateNavigationState(from webView: WKWebView) {
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
        estimatedProgress = webView.estimatedProgress
        isLoading = webView.isLoading
        pageTitle = webView.title ?? ""
        
        if let url = webView.url {
            currentURL = url
        }
    }
    
    /// Reset to home
    func resetToHome() {
        currentURL = homeURL()
        print("🌐 [WebViewModel] Reset to home: \(currentURL.absoluteString)")
    }
}

