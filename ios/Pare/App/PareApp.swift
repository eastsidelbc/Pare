//
// PareApp.swift
// Pare
//
// Main app entry point.
// React Equivalent: ReactDOM.render() or Next.js _app.tsx
//

import SwiftUI

@main
struct PareApp: App {
    // MARK: - App Coordinator
    
    /// Global app state coordinator
    /// Similar to React Context Provider
    @StateObject private var coordinator = AppCoordinator()
    
    // MARK: - Body
    
    var body: some Scene {
        WindowGroup {
            PareTabView()
                .environmentObject(coordinator)
                .alert("Error", isPresented: $coordinator.showError) {
                    Button("OK") {
                        coordinator.clearError()
                    }
                } message: {
                    if let errorMessage = coordinator.errorMessage {
                        Text(errorMessage)
                    }
                }
        }
    }
}

