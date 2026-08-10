/**
 * Centralized API Error Handler
 * Formats Timeout, 401, 403, 404, 500, No Internet, and Server Down errors gracefully.
 */

import { AxiosError } from 'axios';
import { logger } from '../utils/logger';

export interface FormattedApiError {
  code: string;
  message: string;
  status?: number;
  isNetworkError: boolean;
  isTimeout: boolean;
}

export function handleApiError(error: unknown): FormattedApiError {
  if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string; detail?: string }>;

    // Timeout Error
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      logger.error('API Request Timeout');
      return {
        code: 'TIMEOUT',
        message: 'Request timed out. Please check your network connection and try again.',
        isNetworkError: true,
        isTimeout: true,
      };
    }

    // No Internet / Network Failure
    if (!axiosError.response) {
      logger.error('API Network Failure / Server Down:', axiosError.message);
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to reach Aegis servers. Please verify internet connection.',
        isNetworkError: true,
        isTimeout: false,
      };
    }

    // HTTP Status Code Error Handling
    const status = axiosError.response.status;
    const serverMessage = axiosError.response.data?.detail || axiosError.response.data?.message;

    switch (status) {
      case 401:
        return {
          code: 'UNAUTHORIZED',
          status: 401,
          message: serverMessage || 'Session expired. Please sign in again.',
          isNetworkError: false,
          isTimeout: false,
        };
      case 403:
        return {
          code: 'FORBIDDEN',
          status: 403,
          message: serverMessage || 'Access denied. You do not have permission for this resource.',
          isNetworkError: false,
          isTimeout: false,
        };
      case 404:
        return {
          code: 'NOT_FOUND',
          status: 404,
          message: serverMessage || 'Requested safety resource was not found.',
          isNetworkError: false,
          isTimeout: false,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: 'SERVER_ERROR',
          status,
          message: serverMessage || 'Aegis backend is currently unavailable. Using offline safety fallback.',
          isNetworkError: true,
          isTimeout: false,
        };
      default:
        return {
          code: `HTTP_${status}`,
          status,
          message: serverMessage || `Request failed with status code ${status}.`,
          isNetworkError: false,
          isTimeout: false,
        };
    }
  }

  // Unknown non-Axios error
  const fallbackMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage,
    isNetworkError: false,
    isTimeout: false,
  };
}
