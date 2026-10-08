//
// AppCoordinator.swift
// Pare
//
// App-level state coordination and navigation.
// React Equivalent: Context API or Redux store for global app state
//

import Foundation
import SwiftUI

/// Coordinates app-level state and navigation
/// Similar to React Context for global state management
@MainActor
class AppCoordinator: ObservableObject {
    // MARK: - Published State
    
    /// Selected tab index
    @Published var selectedTab: Tab = .home
    
    /// Show settings sheet
    @Published var showSettings: Bool = false
    
    /// Show debug sheet
    @Published var showDebug: Bool = false
    
    /// App-level error message
    @Published var errorMessage: String?
    
    /// Show error alert
    @Published var showError: Bool = false
    
    // MARK: - Tab Definition
    
    enum Tab: Int, CaseIterable {
        case home = 0
        case settings = 1
        case debug = 2
        
        var title: String {
            switch self {
            case .home: return "Home"
            case .settings: return "Settings"
            case .debug: return "Debug"
            }
        }
        
        var icon: String {
            switch self {
            case .home: return "house.fill"
            case .settings: return "gearshape.fill"
            case .debug: return "ladybug.fill"
            }
        }
    }
    
    // MARK: - Initialization
    
    init() {
        // Print configuration on launch
        if Config.enableDebugLogging {
            Config.printConfiguration()
        }
    }
    
    // MARK: - Navigation Methods
    
    /// Navigate to specific tab
    func navigateTo(_ tab: Tab) {
        selectedTab = tab
    }
    
    /// Show error message
    func showError(_ message: String) {
        errorMessage = message
        showError = true
    }
    
    /// Clear error
    func clearError() {
        errorMessage = nil
        showError = false
    }
}

