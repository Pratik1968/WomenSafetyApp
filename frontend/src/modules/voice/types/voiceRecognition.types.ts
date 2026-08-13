/**
 * Speech Recognition Types, State Machine & Language Locales
 */

export type SpeechRecognitionState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR';

export type SupportedLanguage = 'en-US' | 'te-IN' | 'hi-IN';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  flagIcon: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', label: 'English (US)', nativeName: 'English', flagIcon: '🇺🇸' },
  { code: 'te-IN', label: 'Telugu (India)', nativeName: 'తెలుగు', flagIcon: '🇮🇳' },
  { code: 'hi-IN', label: 'Hindi (India)', nativeName: 'हिन्दी', flagIcon: '🇮🇳' },
];

export interface SpeechResultsEvent {
  value?: string[];
}

export interface SpeechErrorEvent {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface SpeechVolumeChangeEvent {
  value?: number;
}
