/**
 * Emergency Contacts Hook — module-level re-export.
 *
 * The canonical implementation lives in src/hooks/useEmergencyContacts.ts
 * (Supabase-backed version with real-time sync from origin/main).
 *
 * Kept here for backward-compatibility with imports inside
 * src/modules/emergency/... that reference the module-local path.
 */

export * from '../../../hooks/useEmergencyContacts';
