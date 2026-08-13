/**
 * Reusable Supabase Client Singleton Setup
 * Configures connection parameters using validated environment variables.
 */

import { logger } from '../../utils/logger';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseClientFactory {
  private static instance: SupabaseClientFactory;
  public readonly config: SupabaseConfig;

  private constructor() {
    this.config = {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    };
    if (!this.config.url || !this.config.anonKey) {
      logger.warn('Supabase client initialized without EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY set.');
    }
    logger.info('Supabase client initialized with endpoint:', this.config.url);
  }

  public static getInstance(): SupabaseClientFactory {
    if (!SupabaseClientFactory.instance) {
      SupabaseClientFactory.instance = new SupabaseClientFactory();
    }
    return SupabaseClientFactory.instance;
  }
}

export const supabaseClient = SupabaseClientFactory.getInstance();
