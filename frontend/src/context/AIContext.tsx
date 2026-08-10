/**
 * Unified AI Assistant Context Provider
 *
 * Handles user-initiated chat and voice queries ONLY.
 * This context has NO connection to Safety Mode, keyword detection,
 * or emergency events. Emergency handling is owned by JourneyContext.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AIMessage, AIAssistantState, AISafetyIntent, AIConversationSession } from '../modules/ai/types/ai.types';
import { aiService } from '../modules/ai/services/aiService';
import { firebaseAuthService } from '../infrastructure/auth/firebaseAuthService';
import { useVoiceState } from './VoiceContext';
import { logger } from '../utils/logger';
import { networkMonitor } from '../api/networkMonitor';

interface AIContextType {
  messages: AIMessage[];
  assistantState: AIAssistantState;
  isThinking: boolean;
  isOnline: boolean;
  networkError: string | null;
  currentIntent: AISafetyIntent;
  sendChatMessage: (text: string) => Promise<void>;
  processVoiceQuery: (transcript: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const AIContext = createContext<AIContextType>({
  messages: [],
  assistantState: 'IDLE',
  isThinking: false,
  isOnline: true,
  networkError: null,
  currentIntent: 'NORMAL_CHAT',
  sendChatMessage: async () => {},
  processVoiceQuery: async () => {},
  clearHistory: async () => {},
  loadSession: async () => {},
});

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [assistantState, setAssistantState] = useState<AIAssistantState>('IDLE');
  const [currentIntent, setCurrentIntent] = useState<AISafetyIntent>('NORMAL_CHAT');
  const [isOnline, setIsOnline] = useState<boolean>(networkMonitor.isOnline());
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = networkMonitor.onNetworkChange((online) => {
      setIsOnline(online);
      setNetworkError(online ? null : 'Aegis Backend Offline — Request queued for auto-retry.');
    });
    return () => unsub();
  }, []);

  const { isListening } = useVoiceState();

  // Synchronize listening state with VoiceContext
  useEffect(() => {
    if (isListening && assistantState !== 'LISTENING') {
      setAssistantState('LISTENING');
    } else if (!isListening && assistantState === 'LISTENING') {
      setAssistantState('IDLE');
    }
  }, [isListening]);

  const getCurrentUserId = async (): Promise<string> => {
    return (await firebaseAuthService.getCurrentUserId()) || 'anonymous';
  };

  const loadSession = async (): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      const session = await aiService.getSession(userId);
      setMessages(session.messages);
    } catch (err) {
      logger.error('Failed to load AI Session:', err);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const sendChatMessage = async (text: string): Promise<void> => {
    if (!text || !text.trim()) return;
    try {
      setAssistantState('THINKING');
      const userId = await getCurrentUserId();
      const result = await aiService.processUserQuery(userId, text, { source: 'CHAT' });

      setMessages(result.session.messages);
      setCurrentIntent(result.assistantMessage.intent || 'NORMAL_CHAT');
      setAssistantState('IDLE');
    } catch (err) {
      logger.error('Failed to process chat query:', err);
      setAssistantState('IDLE');
    }
  };

  const processVoiceQuery = async (transcript: string): Promise<void> => {
    if (!transcript || !transcript.trim()) return;
    try {
      setAssistantState('THINKING');
      const userId = await getCurrentUserId();
      const result = await aiService.processUserQuery(userId, transcript, { source: 'VOICE' });

      setMessages(result.session.messages);
      setCurrentIntent(result.assistantMessage.intent || 'NORMAL_CHAT');
      setAssistantState('SPEAKING');

      // Return to idle after speech response completes
      setTimeout(() => setAssistantState('IDLE'), 2000);
    } catch (err) {
      logger.error('Failed to process voice query:', err);
      setAssistantState('IDLE');
    }
  };

  const clearHistory = async (): Promise<void> => {
    try {
      const userId = await getCurrentUserId();
      const newSession = await aiService.clearHistory(userId);
      setMessages(newSession.messages);
      setAssistantState('IDLE');
      setCurrentIntent('NORMAL_CHAT');
    } catch (err) {
      logger.error('Failed to clear AI conversation history:', err);
    }
  };

  return (
    <AIContext.Provider
      value={{
        messages,
        assistantState,
        isThinking: assistantState === 'THINKING',
        isOnline,
        networkError,
        currentIntent,
        sendChatMessage,
        processVoiceQuery,
        clearHistory,
        loadSession,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAIState = (): AIContextType => useContext(AIContext);
