/**
 * Emergency Distress Keyword Constants & Presets
 */

export const EMERGENCY_KEYWORDS = [
  'HELP',
  'SAVE ME',
  'EMERGENCY',
  'STOP NOW',
  'MAYDAY',
  'POLICE',
  'DANGER',
] as const;

export type EmergencyKeyword = typeof EMERGENCY_KEYWORDS[number];
