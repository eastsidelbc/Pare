//  AppConfig.swift — Pare iOS shell
//  What: the one place for the app's fixed values (site URL, allowed hosts, UA token, support email, version).
//  How it fits: every other file reads from here instead of repeating a string.
//  React analogy: a `config.ts` that exports constants.
//  Swift tip: a caseless `enum` can't be instantiated, so it works as a namespace for `static` values.

import Foundation

enum AppConfig {
    /// The page the shell opens on launch.
    static let homeURL = URL(string: "https://pare.gg")!

    /// Hosts that load inside the app. Anything else opens in a Safari sheet.
    static let inAppHosts: Set<String> = ["pare.gg", "www.pare.gg"]

    /// Appended to the WebKit user agent as `Pare-iOS/<version>`.
    /// Must equal `IOS_APP_UA_TOKEN` in lib/platform.ts, which is how the web hides its footer in the app.
    static let uaToken = "Pare-iOS"

    /// JS side: `window.webkit.messageHandlers.pare.postMessage({ type, ... })`.
    static let bridgeName = "pare"

    static let supportEmail = "support@pare.gg"

    /// Marketing version (1.0) and build number (1), read from the target's General tab.
    static let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    static let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"

    /// True for https URLs on a Pare host: the only pages allowed in the main view.
    static func isInApp(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "https", let host = url.host()?.lowercased() else { return false }
        return inAppHosts.contains(host)
    }
}
