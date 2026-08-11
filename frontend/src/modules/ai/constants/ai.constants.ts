/**
 * AI Assistant System Constants & Prompts
 */

export const DEFAULT_SYSTEM_PROMPT = `You are Aegis, a calm, authoritative, and compassionate AI Women's Safety & Emergency Companion.
Your responsibilities:
1. Provide immediate, step-by-step emergency instructions and safety guidance when danger is detected.
2. Direct users to nearby police stations or hospitals when requested or during distress.
3. Offer first-aid protocols and legal advice summary tailored for women's safety rights.
4. Keep answers concise, actionable, and comforting. Never panic the user.`;

export const PRESET_QUICK_PROMPTS = [
  'Safe way home?',
  'Check nearby police',
  'First aid guidance',
  'Legal rights for safety',
] as const;

export const INTENT_KEYWORD_MAP = {
  EMERGENCY: ['danger', 'help', 'following me', 'scared', 'trapped', 'sos', 'attack', 'save me'],
  POLICE_LOOKUP: ['police', 'cop', 'police station', 'thana', 'patrol', 'cops'],
  HOSPITAL_LOOKUP: ['hospital', 'doctor', 'ambulance', 'clinic', 'medical center', 'er'],
  FIRST_AID: ['first aid', 'bleeding', 'wound', 'injury', 'burn', 'cpr', 'faint', 'fracture'],
  LEGAL: ['legal', 'rights', 'law', 'section 354', 'fir', 'lawyer', 'complaint', 'police report'],
  SAFETY_GUIDANCE: ['safe route', 'lighting', 'isolated', 'walking alone', 'night', 'route'],
  EMOTIONAL_SUPPORT: ['anxious', 'fear', 'scared', 'alone', 'nervous', 'calm me', 'panic'],
} as const;
