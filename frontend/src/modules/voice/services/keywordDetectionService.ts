/**
 * Reusable Keyword Detection Service
 * Encapsulates multi-language phrase matching algorithms and threshold evaluations.
 */

import {
  KeywordDetectionResult,
  EmergencyKeywordDictionary,
  DEFAULT_KEYWORD_DICTIONARY,
  evaluateKeywordMatch,
} from '../utils/keywordMatcher';
import { SupportedLanguage } from '../types/voiceRecognition.types';
import { logger } from '../../../utils/logger';

export class KeywordDetectionService {
  private static instance: KeywordDetectionService;
  private dictionary: EmergencyKeywordDictionary = { ...DEFAULT_KEYWORD_DICTIONARY };
  private confidenceThreshold: number = 0.6; // 60% default

  private constructor() {
    logger.info('KeywordDetectionService initialized with English, Telugu, and Hindi emergency phrases.');
  }

  public static getInstance(): KeywordDetectionService {
    if (!KeywordDetectionService.instance) {
      KeywordDetectionService.instance = new KeywordDetectionService();
    }
    return KeywordDetectionService.instance;
  }

  /**
   * Evaluate speech transcript against emergency dictionary
   */
  public detectKeywords(
    transcript: string,
    language: SupportedLanguage = 'en-US',
    threshold?: number
  ): KeywordDetectionResult {
    const activeThreshold = threshold ?? this.confidenceThreshold;
    logger.info(`Evaluating transcript [${transcript}] in [${language}] with threshold [${activeThreshold}]...`);

    const result = evaluateKeywordMatch(transcript, language, this.dictionary, activeThreshold);
    if (result.detected) {
      logger.info(`🚨 Emergency Phrase Detected: "${result.keyword}" (Confidence: ${Math.round(result.confidence * 100)}%)`);
    }
    return result;
  }

  /**
   * Set global detection confidence threshold (0.0 to 1.0)
   */
  public setThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  /**
   * Register a new emergency keyword phrase dynamically
   */
  public registerKeyword(language: SupportedLanguage, newKeyword: string): void {
    if (!this.dictionary[language]) {
      this.dictionary[language] = [];
    }
    if (!this.dictionary[language].includes(newKeyword)) {
      this.dictionary[language].push(newKeyword);
      logger.info(`Added new emergency keyword phrase "${newKeyword}" to [${language}] dictionary.`);
    }
  }

  /**
   * Retrieve list of registered emergency keywords for a language locale
   */
  public getKeywords(language: SupportedLanguage): string[] {
    return this.dictionary[language] || [];
  }
}

export const keywordDetectionService = KeywordDetectionService.getInstance();
