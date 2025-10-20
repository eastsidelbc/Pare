//
// ProgressBar.swift
// Pare
//
// Horizontal progress bar for WebView loading.
// React Equivalent: Progress bar component (similar to NProgress)
//

import SwiftUI

/// Horizontal progress bar
/// Similar to NProgress or React progress bar component
struct ProgressBar: View {
    
    // MARK: - Properties
    
    let value: Double // 0.0 to 1.0
    
    var barColor: Color = .blue
    var backgroundColor: Color = .clear
    
    // MARK: - Body
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background
                Rectangle()
                    .fill(backgroundColor)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                
                // Progress
                Rectangle()
                    .fill(barColor)
                    .frame(
                        width: geometry.size.width * CGFloat(min(max(value, 0), 1)),
                        height: geometry.size.height
                    )
                    .animation(.easeInOut(duration: 0.2), value: value)
            }
        }
    }
}

// MARK: - Preview

#Preview("Empty") {
    VStack(spacing: 20) {
        ProgressBar(value: 0.0, barColor: .blue)
            .frame(height: 3)
        
        Text("0% Complete")
            .font(.caption)
    }
    .padding()
}

#Preview("Half") {
    VStack(spacing: 20) {
        ProgressBar(value: 0.5, barColor: .purple)
            .frame(height: 3)
        
        Text("50% Complete")
            .font(.caption)
    }
    .padding()
}

#Preview("Complete") {
    VStack(spacing: 20) {
        ProgressBar(value: 1.0, barColor: .green)
            .frame(height: 3)
        
        Text("100% Complete")
            .font(.caption)
    }
    .padding()
}

#Preview("All States") {
    VStack(spacing: 20) {
        VStack(spacing: 8) {
            ProgressBar(value: 0.0, barColor: .blue)
                .frame(height: 3)
            Text("Starting")
                .font(.caption2)
        }
        
        VStack(spacing: 8) {
            ProgressBar(value: 0.3, barColor: .purple)
                .frame(height: 3)
            Text("Loading...")
                .font(.caption2)
        }
        
        VStack(spacing: 8) {
            ProgressBar(value: 0.7, barColor: .orange)
                .frame(height: 3)
            Text("Almost there")
                .font(.caption2)
        }
        
        VStack(spacing: 8) {
            ProgressBar(value: 1.0, barColor: .green)
                .frame(height: 3)
            Text("Complete")
                .font(.caption2)
        }
    }
    .padding()
}

