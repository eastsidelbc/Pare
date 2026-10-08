//  SettingsView.swift — Pare iOS shell
//  What: the native Settings sheet (About, Privacy, support email, version, NFL disclaimer).
//  How it fits: RootView shows it when ShellState.showSettings is true (the web sends "openSettings").
//  React analogy: a modal component; `dismiss()` ≈ calling the modal's onClose prop.
//  Swift tip: `List` + `Section` gives the standard iOS grouped table look, with 44pt rows for free.

import SwiftUI

struct SettingsView: View {
    let shell: ShellState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        open("/about")
                    } label: {
                        Label("About Pare", systemImage: "info.circle")
                    }
                    Button {
                        open("/privacy")
                    } label: {
                        Label("Privacy Policy", systemImage: "hand.raised")
                    }
                }

                Section {
                    if let mail = URL(string: "mailto:\(AppConfig.supportEmail)") {
                        Link(destination: mail) {
                            Label(AppConfig.supportEmail, systemImage: "envelope")
                        }
                    }
                    LabeledContent("Version", value: "\(AppConfig.version) (\(AppConfig.build))")
                } header: {
                    Text("Support")
                } footer: {
                    Text("Not affiliated with the NFL or its teams.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    /// Close the sheet, then show the page in the main web view.
    private func open(_ path: String) {
        dismiss()
        shell.navigate(to: path)
    }
}

#Preview {
    SettingsView(shell: ShellState())
        .preferredColorScheme(.dark)
}
