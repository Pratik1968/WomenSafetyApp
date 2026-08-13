/**
 * Safety Intent Parser Wrapper
 * Delegates to IntentAnalyzer for 8-intent classification.
 */

import { AISafetyIntent } from '../types/ai.types';
import { intentAnalyzer } from './aiIntentAnalyzer';

export const parseSafetyIntent = (text: string): AISafetyIntent => {
  return intentAnalyzer.analyzeIntent(text).intent;
};
