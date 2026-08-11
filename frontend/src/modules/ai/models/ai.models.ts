/**
 * AI Domain Data Models & Factory Helpers
 */

import { AIMessage, AIMessageRole, AISafetyIntent, AIConversationSession } from '../types/ai.types';

export const createAIMessage = (
  role: AIMessageRole,
  content: string,
  intent?: AISafetyIntent,
  actionPayload?: AIMessage['actionPayload']
): AIMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  role,
  content,
  timestamp: new Date().toISOString(),
  intent,
  actionPayload,
});

export const createConversationSession = (userId: string): AIConversationSession => {
  const now = new Date().toISOString();
  return {
    id: `conv_${userId}_${Date.now()}`,
    userId,
    messages: [
      createAIMessage(
        'assistant',
        "Hi, I'm Aegis, your AI Safety Companion. How can I help protect or assist you today?",
        'NORMAL_CHAT'
      ),
    ],
    createdAt: now,
    updatedAt: now,
  };
};
