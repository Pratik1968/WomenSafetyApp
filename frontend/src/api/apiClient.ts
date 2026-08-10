/**
 * Central Production Axios API Client Instance
 * Configured with Base URL, 10s Timeout, Auth Interceptors,
 * Request/Response Logging, Response Error Formatters, and Retry Strategy.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from './apiConfig';
import { handleApiError, FormattedApiError } from './apiErrorHandler';
import { firebaseAuthService } from '../infrastructure/auth/firebaseAuthService';
import { networkMonitor } from './networkMonitor';
import { logger } from '../utils/logger';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
  _retryCount?: number;
}

// Create Central Axios Instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

// Request Interceptor: Attach Auth ID Token and Log Request Metadata
apiClient.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    config.metadata = { startTime: Date.now() };

    try {
      const token = await firebaseAuthService.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      logger.warn('Failed to retrieve Auth ID Token for request:', err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Status Logging + Error Formatting
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    networkMonitor.setOnlineStatus(true);
    return response;
  },
  async (error) => {
    const config = (error.config || {}) as CustomAxiosRequestConfig;
    const formattedError: FormattedApiError = handleApiError(error);

    if (formattedError.isNetworkError) {
      networkMonitor.setOnlineStatus(false);
    }

    // Retry Strategy ONLY for idempotent GET requests (max 2 retries)
    const isGet = config?.method?.toUpperCase() === 'GET';
    if (config && isGet && formattedError.isNetworkError && (!config._retryCount || config._retryCount < API_CONFIG.maxRetries)) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelayMs * config._retryCount!));
      return apiClient(config);
    }

    return Promise.reject(formattedError);
  }
);
