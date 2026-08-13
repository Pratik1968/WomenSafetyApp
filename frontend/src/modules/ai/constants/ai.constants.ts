/**
 * AI Assistant System Constants & Prompts
 */

export const DEFAULT_SYSTEM_PROMPT = `You are Aegis, a calm, authoritative, and compassionate AI Women's Safety & Emergency Companion.
Your responsibilities:
1. Provide immediate, actionable safety instructions and comfort when a user is in danger or feels unsafe.
2. Provide nearby police station and hospital directions when requested.
3. Offer first-aid protocols and legal advice summary tailored for women's safety rights.
4. Keep answers concise, actionable, and comforting. Never panic the user.`;

export const PRESET_QUICK_PROMPTS = [
  'Safe way home?',
  'Check nearby police',
  'First aid guidance',
  'Legal rights for safety',
] as const;

export const INTENT_KEYWORD_MAP = {
  EMERGENCY: [
    'emergency',
    'sos',
    'attack',
    'save me',
    'immediate danger',
    'in danger',
    'trapped',
    'help me',
    'need emergency help',
    'under attack',
  ],
  POLICE_LOOKUP: ['police', 'cop', 'police station', 'thana', 'patrol', 'cops', 'nearby police', 'nearest police'],
  HOSPITAL_LOOKUP: ['hospital', 'doctor', 'ambulance', 'clinic', 'medical center', 'medical aid', 'emergency room', 'nearest hospital'],
  FIRST_AID: ['first aid', 'bleeding', 'wound', 'injury', 'burn', 'cpr', 'faint', 'fracture', 'cpr steps'],
  LEGAL: ['legal', 'rights', 'law', 'section 354', 'fir', 'zero fir', 'lawyer', 'complaint', 'police report', 'harassed', 'stalked'],
  SAFETY_GUIDANCE: [
    'following me',
    'being followed',
    'someone is following',
    'think someone is following',
    'followed',
    'feel unsafe',
    'feels unsafe',
    'unsafe',
    'scared',
    'threatening',
    'threat',
    'suspicious',
    'stalker',
    'stalking',
    'cab driver',
    'taxi driver',
    'auto driver',
    'alone',
    'safe route',
    'safety guidance',
    'lighting',
    'isolated',
    'walking alone',
    'night',
    'route',
    'what should i do',
    'directions',
    'share location',
    'share my location',
  ],
  EMOTIONAL_SUPPORT: ['anxious', 'fear', 'nervous', 'calm me', 'panic', 'stress', 'so scared', 'terrified'],
} as const;
