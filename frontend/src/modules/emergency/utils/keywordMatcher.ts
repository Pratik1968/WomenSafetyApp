/**
 * Pure, Unit-Testable Text Normalizer & Emergency Keyword Matching Engine
 * Supports Multi-language phrase dictionaries for English, Telugu, and Hindi.
 */

import { SupportedLanguage } from '../../voice/types/voiceRecognition.types';

export interface KeywordDetectionResult {
  detected: boolean;
  keyword: string | null;
  confidence: number; // 0.0 to 1.0
  language: string;
}

export type EmergencyKeywordDictionary = Record<SupportedLanguage, string[]>;

/**
 * Multi-Language Emergency Keyword Dictionary
 */
export const DEFAULT_KEYWORD_DICTIONARY: EmergencyKeywordDictionary = {
  'en-US': [
    'Help',
    'Help me',
    'Save me',
    'Emergency',
    'Call Police',
    'I am in danger',
    'Someone is following me',
  ],
  'te-IN': [
    'సహాయం',
    'నన్ను కాపాడండి',
    'ప్రమాదం',
    'పోలీసులకు కాల్ చేయండి',
  ],
  'hi-IN': [
    'बचाओ',
    'मदद',
    'पुलिस को बुलाओ',
    'मैं खतरे में हूँ',
  ],
};

/**
 * Unit-Testable Helper: Normalize text by converting to lowercase, removing punctuation,
 * and collapsing repeated spaces.
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"“„]/g, '') // Strip punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .trim();
};

/**
 * Unit-Testable Helper: Calculate match confidence score (0.0 to 1.0)
 */
export const calculateMatchScore = (normalizedInput: string, normalizedTarget: string): number => {
  if (!normalizedInput || !normalizedTarget) return 0.0;

  // Exact match
  if (normalizedInput === normalizedTarget) return 1.0;

  // Input contains full target phrase
  if (normalizedInput.includes(normalizedTarget)) return 0.95;

  // Target phrase contains input (for short speech snippets)
  if (normalizedTarget.includes(normalizedInput) && normalizedInput.length >= 3) return 0.85;

  // Word token overlap matching
  const inputWords = new Set(normalizedInput.split(' '));
  const targetWords = normalizedTarget.split(' ');
  const matchedCount = targetWords.filter(w => inputWords.has(w)).length;

  if (targetWords.length > 0 && matchedCount > 0) {
    const ratio = matchedCount / targetWords.length;
    return Math.min(0.9, ratio * 0.9);
  }

  return 0.0;
};

/**
 * Evaluate raw transcript text against emergency phrase dictionary for a target locale
 */
export const evaluateKeywordMatch = (
  rawTranscript: string,
  language: SupportedLanguage = 'en-US',
  dictionary: EmergencyKeywordDictionary = DEFAULT_KEYWORD_DICTIONARY,
  confidenceThreshold: number = 0.6
): KeywordDetectionResult => {
  const normalizedInput = normalizeText(rawTranscript);

  if (!normalizedInput) {
    return {
      detected: false,
      keyword: null,
      confidence: 0.0,
      language,
    };
  }

  const targetKeywords = dictionary[language] || dictionary['en-US'];
  let bestMatchKeyword: string | null = null;
  let highestConfidence = 0.0;

  for (const keyword of targetKeywords) {
    const normalizedKeyword = normalizeText(keyword);
    const score = calculateMatchScore(normalizedInput, normalizedKeyword);

    if (score > highestConfidence) {
      highestConfidence = score;
      bestMatchKeyword = keyword;
    }
  }

  const isDetected = highestConfidence >= confidenceThreshold;

  return {
    detected: isDetected,
    keyword: isDetected ? bestMatchKeyword : null,
    confidence: highestConfidence,
    language,
  };
};
