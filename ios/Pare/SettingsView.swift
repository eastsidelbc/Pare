//  SettingsView.swift — Pare iOS shell
//  What: the native Settings sheet (About, Privacy, support email, version, NFL disclaimer).
//  How it fits: RootView shows it when ShellState.showSettings is true (the Home header gear sends "openSettings").
//  Look: Settings round 1 pick "S2" — the stock iOS grouped list, tinted Pare gold on BgDeep, half height.
//  React analogy: a modal component; `dismiss()` ≈ calling the modal's onClose prop.
//  Swift tip: `List` + `Section` gives the standard iOS grouped table look, with 44pt rows,
//             VoiceOver and Dynamic Type for free. We only recolor it.

import SwiftUI

struct SettingsView: View {
    let shell: ShellState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    linkRow("About Pare", icon: "info.circle") { open("/about") }
                    linkRow("Privacy Policy", icon: "checkmark.shield") { open("/privacy") }
                }
                .listRowBackground(Color.pareRow)
                .listRowSeparatorTint(.pareHairline)

                Section {
                    if let mail = URL(string: "mailto:\(AppConfig.supportEmail)") {
                        Link(destination: mail) {
                            LabeledContent {
                                Text(AppConfig.supportEmail)
                            } label: {
                                Label {
                                    Text("Email support").foregroundStyle(.primary)
                                } icon: {
                                    Image(systemName: "envelope").foregroundStyle(Color.pareGold)
                                }
                            }
                        }
                    }
                    LabeledContent("Version", value: "\(AppConfig.version) (\(AppConfig.build))")
                } header: {
                    Text("Support")
                } footer: {
                    Text("Pare™ is made by Pare LLC. Not affiliated with the NFL or its teams.")
                }
                .listRowBackground(Color.pareRow)
                .listRowSeparatorTint(.pareHairline)
            }
            .scrollContentBackground(.hidden)   // let BgDeep show instead of the system grey
            .background(Color(.bgDeep))
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
        .tint(.pareGold)
        // Half height with a grab handle; can be dragged to full (large text sizes need the room).
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Color(.bgDeep))
    }

    /// A row that opens a pare.gg page: gold icon, white title, grey chevron.
    private func linkRow(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Label {
                    Text(title).foregroundStyle(.primary)
                } icon: {
                    Image(systemName: icon).foregroundStyle(Color.pareGold)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    /// Close the sheet, then show the page in the main web view.
    private func open(_ path: String) {
        dismiss()
        shell.navigate(to: path)
    }
}

/// Pare web tokens, mirrored for this sheet (values from app/globals.css).
private extension Color {
    /// --gold-bright #F5C842
    static let pareGold = Color(red: 245.0 / 255, green: 200.0 / 255, blue: 66.0 / 255)
    /// --card-deep-b #121724
    static let pareRow = Color(red: 18.0 / 255, green: 23.0 / 255, blue: 36.0 / 255)
    /// --hairline #1B2030
    static let pareHairline = Color(red: 27.0 / 255, green: 32.0 / 255, blue: 48.0 / 255)
}

#Preview {
    SettingsView(shell: ShellState())
        .preferredColorScheme(.dark)
}
