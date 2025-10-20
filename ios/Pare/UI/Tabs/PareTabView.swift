//
// PareTabView.swift
// Pare
//
// Main tab container with Home, Settings, and Debug tabs.
// React Equivalent: Bottom navigation component with route switching
//

import SwiftUI

/// Main tab view container
/// Similar to React Router with bottom navigation
struct PareTabView: View {
    
    // MARK: - Environment
    
    @EnvironmentObject var coordinator: AppCoordinator
    @StateObject private var webViewModel = WebViewModel()
    
    // MARK: - Body
    
    var body: some View {
        TabView(selection: $coordinator.selectedTab) {
            // Home Tab: WebView
            HomeTab(viewModel: webViewModel)
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(AppCoordinator.Tab.home)
            
            // Settings Tab: Native SwiftUI
            SettingsTab(webViewModel: webViewModel)
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(AppCoordinator.Tab.settings)
            
            // Debug Tab: Native SwiftUI
            DebugTab(webViewModel: webViewModel)
                .tabItem {
                    Label("Debug", systemImage: "ladybug.fill")
                }
                .tag(AppCoordinator.Tab.debug)
        }
        .accentColor(.purple) // Pare brand color
    }
}

// MARK: - Preview

#Preview {
    PareTabView()
        .environmentObject(AppCoordinator())
}

