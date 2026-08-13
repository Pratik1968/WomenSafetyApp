/**
 * React Hook interface for KeywordDetectionService
 */

import { useState, useCallback } from 'react';
import { keywordDetectionService } from '../services/keywordDetectionService';
import { KeywordDetectionResult } from '../utils/keywordMatcher';
import { SupportedLanguage } from '../../voice/types/voiceRecognition.types';

export function useKeywordDetection(initialLanguage: SupportedLanguage = 'en-US') {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [lastResult, setLastResult] = useState<KeywordDetectionResult | null>(null);

  const evaluateTranscript = useCallback(
    (text: string, threshold?: number) => {
      const result = keywordDetectionService.detectKeywords(text, language, threshold);
      setLastResult(result);
      return result;
    },
    [language]
  );

  const registerNewKeyword = useCallback(
    (newKeyword: string) => {
      keywordDetectionService.registerKeyword(language, newKeyword);
    },
    [language]
  );

  const getActiveKeywords = useCallback(() => {
    return keywordDetectionService.getKeywords(language);
  }, [language]);

  return {
    language,
    setLanguage,
    lastResult,
    evaluateTranscript,
    registerNewKeyword,
    getActiveKeywords,
  };
}
