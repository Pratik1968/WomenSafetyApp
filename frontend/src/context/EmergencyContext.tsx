/**
 * Emergency Module Context Provider
 * Responsible for: manual emergency dispatch, emergency history, and SOS button events.
 *
 * Voice keyword detection during a Safety Mode journey is handled exclusively by JourneyContext.
 * This context has NO dependency on VoiceContext or keyword detection.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EmergencySource, EmergencyPayload, EmergencyResponse, emergencyService } from '../services/emergencyService';
import { firebaseAuthService } from '../infrastructure/auth/firebaseAuthService';
import { logger } from '../utils/logger';

interface EmergencyContextType {
  lastEmergency: EmergencyResponse | null;
  emergencyHistory: EmergencyResponse[];
  sensitivityThreshold: number;
  setSensitivityThreshold: (threshold: number) => void;
  triggerEmergency: (source: EmergencySource, payload: Partial<EmergencyPayload>) => Promise<EmergencyResponse>;
  clearHistory: () => void;
}

const EmergencyContext = createContext<EmergencyContextType>({
  lastEmergency: null,
  emergencyHistory: [],
  sensitivityThreshold: 0.6,
  setSensitivityThreshold: () => {},
  triggerEmergency: async () => ({
    success: false,
    emergencyId: '',
    source: 'VOICE',
    timestamp: '',
    payload: { userId: '', timestamp: '', source: 'VOICE' },
    status: 'FAILED',
  }),
  clearHistory: () => {},
});

export const EmergencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lastEmergency, setLastEmergency] = useState<EmergencyResponse | null>(null);
  const [emergencyHistory, setEmergencyHistory] = useState<EmergencyResponse[]>([]);
  const [sensitivityThreshold, setSensitivityThreshold] = useState<number>(0.6);

  useEffect(() => {
    logger.info('Initializing EmergencyContext — subscribing to emergencyService events...');
    const unsubscribe = emergencyService.onEmergencyEvent((last, history) => {
      setLastEmergency(last);
      setEmergencyHistory(history);
    });
    return () => unsubscribe();
  }, []);

  // NOTE: Voice keyword detection during a Safety Mode journey is handled
  // exclusively by JourneyContext → journeyService.evaluateTranscript().
  // EmergencyContext does NOT listen to VoiceContext transcripts.

  const triggerEmergency = async (
    source: EmergencySource,
    payload: Partial<EmergencyPayload>
  ): Promise<EmergencyResponse> => {
    logger.info('EmergencyContext triggerEmergency called:', source);
    // userId must be supplied by the caller (from firebaseAuthService.getCurrentUserId())
    // EmergencyService will warn if missing
    return emergencyService.triggerEmergency(source, payload);
  };

  const clearHistory = () => {
    emergencyService.clearHistory();
    setLastEmergency(null);
    setEmergencyHistory([]);
  };

  return (
    <EmergencyContext.Provider
      value={{
        lastEmergency,
        emergencyHistory,
        sensitivityThreshold,
        setSensitivityThreshold,
        triggerEmergency,
        clearHistory,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = (): EmergencyContextType => useContext(EmergencyContext);
