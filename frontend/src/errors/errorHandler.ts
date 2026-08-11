/**
 * Centralized Error Formatter & Human-Readable Message Translator
 */

import { AppError } from './AppError';

export interface FormattedError {
  userMessage: string;
  code: string;
  timestamp: number;
}

export const formatErrorForUser = (error: unknown): FormattedError => {
  if (error instanceof AppError) {
    return {
      userMessage: error.message,
      code: error.code,
      timestamp: error.timestamp,
    };
  }

  if (error instanceof Error) {
    return {
      userMessage: error.message || 'An unexpected error occurred.',
      code: 'SYSTEM_ERROR',
      timestamp: Date.now(),
    };
  }

  return {
    userMessage: 'An unknown system exception was encountered.',
    code: 'UNKNOWN_EXCEPTION',
    timestamp: Date.now(),
  };
};
