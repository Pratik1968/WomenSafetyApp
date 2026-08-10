/**
 * Voice Module Context Provider
 * Strictly responsible for: Microphone, Speech Recognition, and Transcript generation.
 * NO keyword detection logic, NO AI logic, NO emergency logic.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SpeechRecognitionState, SupportedLanguage } from '../modules/voice/types/voiceRecognition.types';
import { voiceRecognitionService } from '../modules/voice/services/voiceRecognitionService';
import { logger } from '../utils/logger';

interface VoiceContextType {
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
  resetVoiceState: () => void;
}

const VoiceContext = createContext<VoiceContextType>({
  recognitionState: 'IDLE',
  isListening: false,
  recognizedText: '',
  partialText: '',
  currentLanguage: 'en-US',
  volumeLevel: 0,
  speechError: null,
  startListening: async () => {},
  stopListening: async () => {},
  cancelListening: async () => {},
  changeLanguage: () => {},
  resetVoiceState: () => {},
});

export const VoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [recognitionState, setRecognitionState] = useState<SpeechRecognitionState>('IDLE');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [partialText, setPartialText] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en-US');
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    logger.info('Initializing VoiceContext speech recognition listeners...');

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

  const startListening = async (locale?: SupportedLanguage): Promise<void> => {
    try {
      setSpeechError(null);
      const lang = locale || currentLanguage;
      await voiceRecognitionService.startListening(lang);
    } catch (err: any) {
      logger.error('Failed to start listening in VoiceContext:', err);
      setSpeechError(err.message || 'Failed to start speech recognition.');
    }
  };

  const stopListening = async (): Promise<void> => {
    try {
      await voiceRecognitionService.stopListening();
    } catch (err: any) {
      logger.error('Failed to stop listening in VoiceContext:', err);
    }
  };

  const cancelListening = async (): Promise<void> => {
    try {
      await voiceRecognitionService.cancelListening();
      setRecognizedText('');
      setPartialText('');
    } catch (err: any) {
      logger.error('Failed to cancel listening in VoiceContext:', err);
    }
  };

  const changeLanguage = (lang: SupportedLanguage): void => {
    voiceRecognitionService.setLanguage(lang);
    setCurrentLanguage(lang);
  };

  const resetVoiceState = (): void => {
    setRecognizedText('');
    setPartialText('');
    setSpeechError(null);
  };

  return (
    <VoiceContext.Provider
      value={{
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
        resetVoiceState,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoiceState = (): VoiceContextType => useContext(VoiceContext);
