/**
 * Emergency Dispatch & Event Publisher Service
 * Handles emergency event broadcasting, dispatch status logging, and backend API synchronization.
 */

import { EmergencySource, EmergencyPayload, EmergencyResponse } from '../types/emergency.types';
import { apiClient } from '../../../api/apiClient';
import { API_ENDPOINTS } from '../../../api/apiEndpoints';
import { networkMonitor } from '../../../api/networkMonitor';
import { locationService } from '../../location/services/locationService';
import { logger } from '../../../utils/logger';

export type { EmergencySource, EmergencyPayload, EmergencyResponse };

export class EmergencyService {
  private static instance: EmergencyService;
  private listeners: Array<(event: EmergencyResponse, history: EmergencyResponse[]) => void> = [];
  private history: EmergencyResponse[] = [];
  private lastEmergency: EmergencyResponse | null = null;

  private constructor() {
    logger.info('EmergencyService initialized.');
  }

  public static getInstance(): EmergencyService {
    if (!EmergencyService.instance) {
      EmergencyService.instance = new EmergencyService();
    }
    return EmergencyService.instance;
  }

  public async triggerEmergency(
    source: EmergencySource,
    payload: Partial<EmergencyPayload>
  ): Promise<EmergencyResponse> {
    logger.info(`🚨 Emergency Triggered! Source: [${source}]`, { userId: payload.userId, keyword: payload.detectedKeyword });

    let locationData = payload.location;
    if (!locationData) {
      try {
        const liveLoc = await locationService.getCurrentLocation();
        if (liveLoc) {
          locationData = {
            latitude: liveLoc.coordinates.latitude,
            longitude: liveLoc.coordinates.longitude,
            address: liveLoc.address?.formattedAddress || 'Location unavailable',
          };
        }
      } catch (err) {
        logger.warn('Failed to acquire live GPS for emergency trigger:', err);
      }
    }

    if (!payload.userId) {
      logger.warn('[EmergencyService] No userId provided — emergency may not be attributed correctly.');
    }

    const fullPayload: EmergencyPayload = {
      userId: payload.userId ?? 'anonymous',
      timestamp: payload.timestamp || new Date().toISOString(),
      source,
      location: locationData || { latitude: 12.9716, longitude: 77.5946, address: 'Location unavailable' },
      detectedKeyword: payload.detectedKeyword,
      recognizedText: payload.recognizedText,
      confidence: payload.confidence,
      language: payload.language,
      pressType: payload.pressType,
      connectedDevice: payload.connectedDevice,
      audioClipUri: payload.audioClipUri,
      batteryLevel: payload.batteryLevel ?? undefined,
      journeyId: payload.journeyId,
      contacts: payload.contacts,
    };

    const response: EmergencyResponse = {
      success: true,
      emergencyId: `emg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      source,
      timestamp: fullPayload.timestamp,
      payload: fullPayload,
      status: 'DISPATCHED',
    };

    // Store locally immediately so UI can react
    this.lastEmergency = response;
    this.history.unshift(response);
    this.notifyListeners(response);

    // POST to FastAPI backend — queue offline if network fails
    try {
      console.log(`📤 [EmergencyService] POST ${API_ENDPOINTS.EMERGENCY_ALERT}`);
      await apiClient.post(API_ENDPOINTS.EMERGENCY_ALERT, fullPayload);
      logger.info('🚨 Emergency alert dispatched to backend successfully.');
    } catch (err) {
      logger.error('[EmergencyService] Backend dispatch failed — queuing for retry:', err);
      response.status = 'QUEUED_OFFLINE';
      await networkMonitor.queueOfflineRequest('EMERGENCY_ALERT', API_ENDPOINTS.EMERGENCY_ALERT, fullPayload);
    }

    return response;
  }

  public onEmergencyEvent(
    listener: (event: EmergencyResponse, history: EmergencyResponse[]) => void
  ): () => void {
    this.listeners.push(listener);
    if (this.lastEmergency) {
      listener(this.lastEmergency, this.history);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getHistory(): EmergencyResponse[] {
    return [...this.history];
  }

  public getLastEmergency(): EmergencyResponse | null {
    return this.lastEmergency;
  }

  public clearHistory(): void {
    this.history = [];
    this.lastEmergency = null;
    logger.info('Emergency history cleared.');
  }

  private notifyListeners(event: EmergencyResponse): void {
    this.listeners.forEach(l => l(event, [...this.history]));
  }
}

export const emergencyService = EmergencyService.getInstance();
