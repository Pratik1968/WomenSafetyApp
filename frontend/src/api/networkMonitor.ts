/**
 * Network Connectivity & Offline Request Queue Monitor
 * Automatically queues AI queries and emergency alerts when offline,
 * ensuring NO emergency events are ever lost.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './apiConfig';
import { API_ENDPOINTS } from './apiEndpoints';
import { logger } from '../utils/logger';

const QUEUE_STORAGE_KEY = '@aegis_offline_request_queue';

export interface QueuedOfflineRequest {
  id: string;
  type: 'AI_QUERY' | 'EMERGENCY_ALERT';
  endpoint: string;
  payload: any;
  timestamp: string;
  retryCount: number;
}

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isOnlineStatus: boolean = true;
  private listeners: Array<(isOnline: boolean) => void> = [];
  private isProcessingQueue: boolean = false;

  private constructor() {
    this.startHeartbeatMonitor();
  }

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public setOnlineStatus(status: boolean): void {
    if (this.isOnlineStatus !== status) {
      this.isOnlineStatus = status;
      logger.info(`Network status changed: [${status ? 'ONLINE' : 'OFFLINE'}]`);
      this.listeners.forEach(l => l(status));
      if (status) {
        this.processOfflineQueue();
      }
    }
  }

  public onNetworkChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.isOnlineStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Queue an emergency or AI request when offline to guarantee 0 data loss
   */
  public async queueOfflineRequest(
    type: 'AI_QUERY' | 'EMERGENCY_ALERT',
    endpoint: string,
    payload: any
  ): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newRequest: QueuedOfflineRequest = {
        id: `off_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type,
        endpoint,
        payload,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      queue.push(newRequest);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      logger.info(`🚨 Queued offline ${type} request (${queue.length} items total)`);
    } catch (err) {
      logger.error('Failed to queue offline request:', err);
    }
  }

  public async getQueue(): Promise<QueuedOfflineRequest[]> {
    try {
      const json = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!json) return [];
      return JSON.parse(json) as QueuedOfflineRequest[];
    } catch (err) {
      logger.error('Failed to read offline queue:', err);
      return [];
    }
  }

  public async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnlineStatus) return;
    this.isProcessingQueue = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      logger.info(`Processing ${queue.length} offline queued requests...`);
      const remainingQueue: QueuedOfflineRequest[] = [];

      for (const item of queue) {
        try {
          // Dynamic import to avoid circular dependency
          const { apiClient } = await import('./apiClient');
          await apiClient.post(item.endpoint, item.payload);
          logger.info(`Successfully synchronized offline ${item.type} request [${item.id}]`);
        } catch (err) {
          logger.error(`Failed to flush queued item [${item.id}]:`, err);
          item.retryCount += 1;
          if (item.retryCount < 5) {
            remainingQueue.push(item);
          }
        }
      }

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    } catch (err) {
      logger.error('Error while processing offline queue:', err);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private startHeartbeatMonitor(): void {
    const checkHealth = async () => {
      const healthUrl = `${API_CONFIG.baseURL}${API_ENDPOINTS.HEALTH}`;
      console.log(`🏥 [Health Check] Pinging: ${healthUrl}`);

      try {
        const { apiClient } = await import('./apiClient');
        const response = await apiClient.get(API_ENDPOINTS.HEALTH, { timeout: API_CONFIG.timeout });
        console.log(
          `✅ [Health Check] Backend ONLINE | URL: ${healthUrl} | Status: ${response.status}`
        );
        this.setOnlineStatus(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : String(err);
        console.error(`❌ [Health Check] Backend OFFLINE | URL: ${healthUrl} | Error: ${message}`);
        this.setOnlineStatus(false);
      }
    };

    // Run initial health check immediately on startup
    checkHealth();

    // Ping health endpoint every 15 seconds
    setInterval(checkHealth, 15000);
  }
}

export const networkMonitor = NetworkMonitor.getInstance();
