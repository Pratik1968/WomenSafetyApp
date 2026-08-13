/**
 * Conversation Repository for Persistence
 * Stores and retrieves AI conversation sessions using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIConversationSession } from '../types/ai.types';
import { logger } from '../../../utils/logger';

const STORAGE_PREFIX = '@womensafty_ai_conversation_';

export class ConversationRepository {
  private static instance: ConversationRepository;

  private constructor() {}

  public static getInstance(): ConversationRepository {
    if (!ConversationRepository.instance) {
      ConversationRepository.instance = new ConversationRepository();
    }
    return ConversationRepository.instance;
  }

  public async getSession(userId: string): Promise<AIConversationSession | null> {
    try {
      const json = await AsyncStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      if (!json) return null;
      return JSON.parse(json) as AIConversationSession;
    } catch (err) {
      logger.error('Failed to load AI Conversation session from storage:', err);
      return null;
    }
  }

  public async saveSession(session: AIConversationSession): Promise<void> {
    try {
      session.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${session.userId}`, JSON.stringify(session));
    } catch (err) {
      logger.error('Failed to save AI Conversation session to storage:', err);
    }
  }

  public async clearSession(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
    } catch (err) {
      logger.error('Failed to clear AI Conversation session from storage:', err);
    }
  }
}

export const conversationRepository = ConversationRepository.getInstance();
