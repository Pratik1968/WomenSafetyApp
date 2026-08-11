/**
 * Custom Hook for Emergency Keyword Detection & Matching Evaluation
 * Exposes live detection results, evaluation routines, and keyword registration methods.
 */

import { useState, useCallback } from 'react';
import { KeywordDetectionResult } from '../utils/keywordMatcher';
import { keywordDetectionService } from '../services/keywordDetectionService';
import { SupportedLanguage } from '../types/voiceRecognition.types';

export const useKeywordDetection = (): {
  detectionResult: KeywordDetectionResult | null;
  evaluateText: (text: string, language?: SupportedLanguage, threshold?: number) => KeywordDetectionResult;
  registerKeyword: (language: SupportedLanguage, newKeyword: string) => void;
  getKeywords: (language: SupportedLanguage) => string[];
} => {
  const [detectionResult, setDetectionResult] = useState<KeywordDetectionResult | null>(null);

  const evaluateText = useCallback(
    (text: string, language: SupportedLanguage = 'en-US', threshold?: number): KeywordDetectionResult => {
      const result = keywordDetectionService.detectKeywords(text, language, threshold);
      setDetectionResult(result);
      return result;
    },
    []
  );

  const registerKeyword = useCallback((language: SupportedLanguage, newKeyword: string) => {
    keywordDetectionService.registerKeyword(language, newKeyword);
  }, []);

  const getKeywords = useCallback((language: SupportedLanguage): string[] => {
    return keywordDetectionService.getKeywords(language);
  }, []);

  return {
    detectionResult,
    evaluateText,
    registerKeyword,
    getKeywords,
  };
};
