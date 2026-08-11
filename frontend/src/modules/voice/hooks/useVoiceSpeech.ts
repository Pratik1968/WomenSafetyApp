/**
 * Custom Hook for Speech-to-Text Recognition Lifecycle & Transcripts
 * Manages live speech states, partial stream buffers, language selection, and volume levels.
 */

import { useState, useEffect, useCallback } from 'react';
import { SpeechRecognitionState, SupportedLanguage } from '../types/voiceRecognition.types';
import { voiceRecognitionService } from '../services/voiceRecognitionService';
import { formatErrorForUser } from '../../../errors/errorHandler';

export const useVoiceSpeech = (): {
  recognitionState: SpeechRecognitionState;
  isListening: boolean;
  recognizedText: string;
  partialText: string;
  currentLanguage: SupportedLanguage;
  volumeLevel: number;
  speechError: string | null;
  startListening: (locale?: SupportedLanguage) => Promise<void>;
  stopListening: () => Promise<void>;
  cancelListening: () => Promise<void>;
  changeLanguage: (lang: SupportedLanguage) => void;
} => {
  const [recognitionState, setRecognitionState] = useState<SpeechRecognitionState>('IDLE');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [partialText, setPartialText] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en-US');
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentLanguage(voiceRecognitionService.getCurrentLanguage());

    const unsubState = voiceRecognitionService.onStateChange(state => {
      setRecognitionState(state);
    });

    const unsubText = voiceRecognitionService.onTextChange((text, partial) => {
      setRecognizedText(text);
      setPartialText(partial);
    });

    const unsubVol = voiceRecognitionService.onVolumeChange(vol => {
      setVolumeLevel(vol);
    });

    const unsubErr = voiceRecognitionService.onError(err => {
      setSpeechError(err);
    });

    return () => {
      unsubState();
      unsubText();
      unsubVol();
      unsubErr();
    };
  }, []);

  const startListening = useCallback(async (locale?: SupportedLanguage) => {
    try {
      setSpeechError(null);
      await voiceRecognitionService.startListening(locale);
    } catch (err) {
      const formatted = formatErrorForUser(err);
      setSpeechError(formatted.userMessage);
    }
  }, []);

  const stopListening = useCallback(async () => {
    await voiceRecognitionService.stopListening();
  }, []);

  const cancelListening = useCallback(async () => {
    await voiceRecognitionService.cancelListening();
  }, []);

  const changeLanguage = useCallback((lang: SupportedLanguage) => {
    voiceRecognitionService.setLanguage(lang);
    setCurrentLanguage(lang);
  }, []);

  return {
    recognitionState,
    isListening: recognitionState === 'LISTENING',
    recognizedText,
    partialText,
    currentLanguage,
    volumeLevel,
    speechError,
    startListening,
    stopListening,
    cancelListening,
    changeLanguage,
  };
};
