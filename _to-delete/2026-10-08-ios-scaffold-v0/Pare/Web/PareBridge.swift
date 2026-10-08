//
// PareBridge.swift
// Pare
//
// JavaScript bridge for iOS ↔ Web communication.
// React Equivalent: window.postMessage() for cross-context communication
//

import Foundation
import WebKit

/// Handles JavaScript bridge communication between iOS and Web
/// Similar to React's postMessage API for iframe communication
@MainActor
class PareBridge: NSObject, WKScriptMessageHandler {
    
    // MARK: - Properties
    
    /// Weak reference to WebView model
    weak var viewModel: WebViewModel?
    
    /// Message handler name (accessible in JS as window.webkit.messageHandlers.pareBridge)
    static let handlerName = "pareBridge"
    
    // MARK: - Initialization
    
    init(viewModel: WebViewModel? = nil) {
        self.viewModel = viewModel
        super.init()
    }
    
    // MARK: - WKScriptMessageHandler
    
    /// Receives messages from JavaScript
    /// Web calls: window.webkit.messageHandlers.pareBridge.postMessage({...})
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == Self.handlerName else { return }
        
        print("🌉 [PareBridge] Received message from web: \(message.body)")
        
        // Parse message body
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            print("⚠️ [PareBridge] Invalid message format")
            return
        }
        
        // Handle actions
        handleAction(action, data: body["data"])
    }
    
    // MARK: - Action Handlers
    
    /// Handle bridge actions
    private func handleAction(_ action: String, data: Any?) {
        switch action {
        case "log":
            // Console.log relay
            if let message = data as? String {
                print("📝 [Web Console] \(message)")
            }
            
        case "openSettings":
            // Open native settings
            print("⚙️ [PareBridge] Open settings requested")
            // TODO: Implement settings navigation
            
        case "shareTeam":
            // Native share sheet
            if let teamData = data as? [String: Any] {
                print("📤 [PareBridge] Share team: \(teamData)")
                // TODO: Implement native share
            }
            
        case "clearCache":
            // Clear web cache
            print("🗑️ [PareBridge] Clear cache requested")
            clearWebCache()
            
        default:
            print("⚠️ [PareBridge] Unknown action: \(action)")
        }
    }
    
    // MARK: - Helper Methods
    
    /// Clear web cache
    private func clearWebCache() {
        let dataStore = WKWebsiteDataStore.default()
        let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
        let date = Date(timeIntervalSince1970: 0)
        
        dataStore.removeData(ofTypes: dataTypes, modifiedSince: date) {
            print("✅ [PareBridge] Web cache cleared")
        }
    }
    
    // MARK: - JavaScript Injection
    
    /// Get JavaScript to inject at document start
    /// Makes bridge available as window.PareBridge
    static func getInjectionScript() -> String {
        """
        // Pare iOS Bridge
        // Makes iOS shell detectable and provides native communication
        
        window.isIOSShell = true;
        
        window.PareBridge = {
            // Send message to iOS
            postMessage: function(action, data) {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.pareBridge) {
                    window.webkit.messageHandlers.pareBridge.postMessage({
                        action: action,
                        data: data
                    });
                } else {
                    console.warn('PareBridge not available');
                }
            },
            
            // Helper methods
            log: function(message) {
                this.postMessage('log', message);
            },
            
            openSettings: function() {
                this.postMessage('openSettings');
            },
            
            shareTeam: function(teamData) {
                this.postMessage('shareTeam', teamData);
            },
            
            clearCache: function() {
                this.postMessage('clearCache');
            }
        };
        
        console.log('✅ Pare iOS Bridge initialized');
        """
    }
}

