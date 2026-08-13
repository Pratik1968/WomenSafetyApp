/**
 * Custom React Hook for Unified AI Assistant
 * Provides access to AIContext state and actions.
 */

import { useAIState } from '../context/AIContext';

export const useAI = () => {
  const {
    messages,
    assistantState,
    isThinking,
    isOnline,
    networkError,
    currentIntent,
    sendChatMessage,
    processVoiceQuery,
    clearHistory,
    loadSession,
  } = useAIState();

  return {
    messages,
    assistantState,
    isThinking,
    isOnline,
    networkError,
    currentIntent,
    sendChatMessage,
    processVoiceQuery,
    clearHistory,
    loadSession,
  };
};
