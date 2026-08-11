/**
 * Error Handling Utility
 * Standardizes API, Network, and Device Integration errors into clean ApiError objects.
 */

import { ApiError } from '../types/api';

export class AppError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;

  constructor(message: string, code = 'UNKNOWN_ERROR', statusCode?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function parseError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;

    // Handle Axios error structure safely
    if (errObj.response) {
      return {
        code: errObj.response.data?.code || 'API_RESPONSE_ERROR',
        message: errObj.response.data?.message || errObj.message || 'Server request failed',
        statusCode: errObj.response.status,
        details: errObj.response.data,
      };
    }

    if (errObj.request) {
      return {
        code: 'NETWORK_TIMEOUT',
        message: 'Unable to connect to safety servers. Please check your internet connection.',
      };
    }

    if (errObj.message) {
      return {
        code: errObj.code || 'CLIENT_ERROR',
        message: errObj.message,
      };
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.',
  };
}
