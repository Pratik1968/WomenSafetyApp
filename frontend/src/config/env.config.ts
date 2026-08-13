/**
 * Environment Configuration & Startup Validator
 * Loads and verifies required environment variables.
 */

import { ConfigurationError } from '../errors/AppError';

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  IS_PRODUCTION: boolean;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new ConfigurationError(
      `Missing required environment variable: [${key}]. Please check your .env file or configuration.`
    );
  }
  return value;
};

export const loadEnvConfig = (): EnvConfig => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    SUPABASE_URL: getEnvVariable('SUPABASE_URL', 'https://supabase.co'),
    SUPABASE_ANON_KEY: getEnvVariable('SUPABASE_ANON_KEY', 'anon-key'),
    FIREBASE_API_KEY: getEnvVariable('FIREBASE_API_KEY', 'firebase-api-key'),
    FIREBASE_PROJECT_ID: getEnvVariable('FIREBASE_PROJECT_ID', 'women-safety-app'),
    IS_PRODUCTION: isProd,
  };
};

export const envConfig = loadEnvConfig();
