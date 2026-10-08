//  OfflineView.swift — Pare iOS shell
//  What: the full-screen "You're offline" message with a Retry button.
//  How it fits: RootView layers it over the web view while ShellState.isOffline is true.
//  React analogy: `{isOffline && <OfflineScreen onRetry={retry} />}`.
//  Swift tip: `VStack` stacks views top to bottom, like a flex column.

import SwiftUI

struct OfflineView: View {
    let shell: ShellState

    var body: some View {
        ZStack {
            Color(.bgDeep).ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 44, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
                Text("You're offline")
                    .font(.title2.bold())
                Text("Pare needs a connection for scores and stats. Check your connection and try again.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button {
                    shell.retry()
                } label: {
                    Text("Retry")
                        .font(.headline)
                        .foregroundStyle(Color(.bgDeep)) // dark text on gold reads better than white
                        .frame(minWidth: 120, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .padding(.top, 8)
            }
            .padding(32)
        }
    }
}

#Preview {
    OfflineView(shell: ShellState())
        .preferredColorScheme(.dark)
}
