/**
 * trackingUrl.ts
 *
 * Helper to generate universal, domain-based live tracking URLs for SMS and link sharing.
 * Independent of local dev IP addresses.
 */

import { API_BASE_URL } from "../api/config";

export function getPublicTrackingUrl(sessionId: string): string {
  // Active Public HTTPS Live Tunnel Link
  return `https://aegis-women-safety.loca.lt/track.html?sessionId=${sessionId}`;
}
