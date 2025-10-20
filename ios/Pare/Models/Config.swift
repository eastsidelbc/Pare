//
// Config.swift
// Pare
//
// Reads configuration from xcconfig files and provides typed access to app settings.
// React Equivalent: process.env.NEXT_PUBLIC_* environment variables
//

import Foundation

/// App configuration values read from xcconfig and Info.plist
struct Config {
    // MARK: - Base URLs
    
    /// Development base URL (localhost:4000)
    static let devBaseURL = "http://localhost:4000"
    
    /// Production base URL (TODO: Replace with actual prod domain)
    static let prodBaseURL = "https://pare-nfl.app"
    
    // MARK: - Active Configuration
    
    /// Active base URL based on build configuration
    /// Debug builds use devBaseURL, Release builds use prodBaseURL
    static var activeBaseURL: String {
        #if DEBUG
        return devBaseURL
        #else
        return prodBaseURL
        #endif
    }
    
    // MARK: - App Info
    
    /// App display name (from Info.plist)
    static var appName: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "Pare"
    }
    
    /// App version (marketing version)
    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
    }
    
    /// Build number
    static var buildNumber: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
    }
    
    /// Bundle identifier
    static var bundleIdentifier: String {
        Bundle.main.bundleIdentifier ?? "com.OptimusCashLLC.pare"
    }
    
    // MARK: - Build Configuration
    
    /// Is this a debug build?
    static var isDebug: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
    
    /// Is this a release build?
    static var isRelease: Bool {
        !isDebug
    }
    
    // MARK: - Feature Flags
    
    /// Enable debug logging
    static var enableDebugLogging: Bool {
        isDebug
    }
    
    // UserDefaults keys
    private static let kPullToRefresh = "enablePullToRefresh"
    private static let kOpenExternally = "openLinksExternally"
    
    /// Enable pull-to-refresh (can be toggled in Settings)
    static var enablePullToRefresh: Bool {
        get {
            UserDefaults.standard.object(forKey: kPullToRefresh) as? Bool ?? true
        }
        set {
            UserDefaults.standard.set(newValue, forKey: kPullToRefresh)
        }
    }
    
    /// Open external links in Safari (can be toggled in Settings)
    static var openLinksExternally: Bool {
        get {
            UserDefaults.standard.object(forKey: kOpenExternally) as? Bool ?? true
        }
        set {
            UserDefaults.standard.set(newValue, forKey: kOpenExternally)
        }
    }
    
    // MARK: - Helper Methods
    
    /// Print current configuration (for debugging)
    static func printConfiguration() {
        print("📱 Pare Configuration")
        print("   App Name: \(appName)")
        print("   Version: \(appVersion) (\(buildNumber))")
        print("   Bundle ID: \(bundleIdentifier)")
        print("   Build: \(isDebug ? "Debug" : "Release")")
        print("   Base URL: \(activeBaseURL)")
        print("   Pull-to-Refresh: \(enablePullToRefresh)")
        print("   External Links: \(openLinksExternally)")
    }
}

