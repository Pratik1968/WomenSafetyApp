// Holds the current admin session token (from admin_users login) in memory. Kept dependency-free so
// `callFn` can read it without importing the higher-level `adminAuth` module — which imports
// `callFn` — avoiding an import cycle.
let current: string | null = null;

export function getAdminToken(): string | null {
  return current;
}

export function setAdminToken(token: string | null): void {
  current = token;
}
