/**
 * Health Check Endpoint
 * 
 * Required for iOS App Store compliance and production monitoring.
 * Returns basic health status and version information.
 * 
 * Usage:
 * - iOS: Check backend availability before making data requests
 * - Monitoring: Uptime checks from external services
 * - DevOps: Kubernetes/Docker health probes
 * 
 * Response: Always returns 200 OK with current status
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const timestamp = new Date().toISOString();
  
  // Calculate uptime (if available)
  const uptime = process.uptime ? Math.floor(process.uptime()) : 0;
  
  // Basic health check response
  const health = {
    ok: true,
    version: '1.0.0',
    timestamp,
    uptime,
    endpoints: {
      offense: 'available',
      defense: 'available'
    },
    environment: process.env.NODE_ENV || 'development'
  };
  
  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
      'X-Health-Check': 'ok'
    },
    status: 200
  });
}

