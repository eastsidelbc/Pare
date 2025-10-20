//
// HomeTab.swift
// Pare
//
// Home tab containing the main WKWebView.
// React Equivalent: Main route component that renders the app
//

import SwiftUI

/// Home tab with WebView and progress bar
/// Similar to React component that renders main app content
struct HomeTab: View {
    
    // MARK: - Properties
    
    @ObservedObject var viewModel: WebViewModel
    
    // Sync directly with UserDefaults so changes in Settings are reflected immediately
    @AppStorage("enablePullToRefresh") private var enablePullToRefresh = true
    @AppStorage("openLinksExternally") private var openLinksExternally = true
    
    // MARK: - Body
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Progress bar
                if viewModel.isLoading {
                    ProgressBar(value: viewModel.estimatedProgress)
                        .frame(height: 3)
                        .animation(.easeInOut, value: viewModel.estimatedProgress)
                }
                
                // WebView
                WebViewContainer(
                    viewModel: viewModel,
                    enablePullToRefresh: enablePullToRefresh,
                    openLinksExternally: openLinksExternally
                )
                .edgesIgnoringSafeArea(.bottom)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack {
                        Image(systemName: "shield.fill")
                            .foregroundColor(.purple)
                        Text("Pare")
                            .font(.headline)
                    }
                }
                
                // Optional: Back/Forward buttons
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        // Access webView through coordinator
                        // TODO: Implement back navigation
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                    .disabled(!viewModel.canGoBack)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Loading") {
    HomeTab(viewModel: {
        let vm = WebViewModel()
        vm.isLoading = true
        vm.estimatedProgress = 0.6
        return vm
    }())
}

#Preview("Loaded") {
    HomeTab(viewModel: WebViewModel())
}

