/**
 * Journey Context — Safety Mode Module
 *
 * Owns the entire voice-to-emergency pipeline DURING an active journey.
 *
 * Responsibilities:
 *  - Start / end journeys via journeyService
 *  - Listen to VoiceContext transcripts and forward them to journeyService.evaluateTranscript()
 *  - Expose emergencyActive flag and the latest JourneyEmergencyEvent to SafetyModeScreens
 *  - Manage live location tracking lifecycle
 *
 * Explicitly NOT responsible for:
 *  - Calling Gemini or any LLM
 *  - Navigating to AssistantScreen or any chat screen
 *  - Anything related to AIContext
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ActiveJourney, JourneyConfig, JourneyEmergencyEvent } from '../modules/safetyMode/types/journey.types';
import { journeyService } from '../modules/safetyMode/services/journeyService';
import { safetyForegroundBridge } from '../modules/voice/services/safetyForegroundBridge';
import { useVoiceState } from './VoiceContext';
import { firebaseAuthService } from '../infrastructure/auth/firebaseAuthService';
import { logger } from '../utils/logger';

interface JourneyContextType {
  /** Whether a journey is currently running (ACTIVE or EMERGENCY state) */
  isJourneyActive: boolean;
  /** Full active journey object, null when no journey is running */
  currentJourney: ActiveJourney | null;
  /** True when an emergency keyword was detected during this journey */
  emergencyActive: boolean;
  /** The most recent emergency event (null if none yet) */
  latestEmergencyEvent: JourneyEmergencyEvent | null;
  /** Start a new monitored journey with the given configuration */
  startJourney: (config: JourneyConfig) => Promise<void>;
  /** End the current journey and stop all tracking */
  endJourney: () => void;
  /** Sensitivity threshold for keyword detection (0.0 – 1.0) */
  sensitivityThreshold: number;
  setSensitivityThreshold: (v: number) => void;
}

const JourneyContext = createContext<JourneyContextType>({
  isJourneyActive: false,
  currentJourney: null,
  emergencyActive: false,
  latestEmergencyEvent: null,
  startJourney: async () => {},
  endJourney: () => {},
  sensitivityThreshold: 0.6,
  setSensitivityThreshold: () => {},
});

export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentJourney, setCurrentJourney] = useState<ActiveJourney | null>(null);
  const [sensitivityThreshold, setSensitivityThreshold] = useState<number>(0.6);

  // VoiceContext feeds us raw transcripts
  const { recognizedText, partialText, currentLanguage } = useVoiceState();

  // Track the last transcript forwarded to avoid re-evaluation on every render
  const lastForwardedText = useRef<string>('');

  // ── Subscribe to journeyService & native bridge emergency events ───────────
  useEffect(() => {
    const unsubJourney = journeyService.onJourneyChange((journey) => {
      setCurrentJourney(journey ? { ...journey } : null);
    });

    const unsubBridgeEmergency = safetyForegroundBridge.onEmergencyKeyword((data) => {
      logger.warn(`[JourneyContext] Emergency event received: "${data.keyword}"`);
      const active = journeyService.getActiveJourney();
      if (active) {
        setCurrentJourney({ ...active });
      }
    });

    return () => {
      unsubJourney();
      unsubBridgeEmergency();
    };
  }, []);

  // ── Forward voice transcripts to journeyService during an active journey ─
  useEffect(() => {
    const activeText = (recognizedText || partialText || '').trim();
    if (!activeText || activeText === lastForwardedText.current) return;
    if (!journeyService.isActive()) return;

    lastForwardedText.current = activeText;

    (async () => {
      const userId = (await firebaseAuthService.getCurrentUserId()) || 'anonymous';
      await journeyService.evaluateTranscript(
        activeText,
        currentLanguage,
        userId,
        sensitivityThreshold
      );
    })();
  }, [recognizedText, partialText, currentLanguage, sensitivityThreshold]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isJourneyActive = journeyService.isActive();

  const emergencyActive =
    currentJourney?.state === 'EMERGENCY' ||
    (currentJourney?.emergencyEvents.length ?? 0) > 0;

  const latestEmergencyEvent: JourneyEmergencyEvent | null =
    currentJourney?.emergencyEvents.length
      ? currentJourney.emergencyEvents[currentJourney.emergencyEvents.length - 1]
      : null;

  // ── Journey control functions ─────────────────────────────────────────────
  const startJourney = async (config: JourneyConfig): Promise<void> => {
    try {
      const userId = (await firebaseAuthService.getCurrentUserId()) || 'anonymous';
      lastForwardedText.current = '';
      await journeyService.startJourney(config, userId, currentLanguage);
      logger.info('[JourneyContext] Journey started via context.');
    } catch (err) {
      logger.error('[JourneyContext] Failed to start journey:', err);
    }
  };

  const endJourney = (): void => {
    journeyService.endJourney();
    lastForwardedText.current = '';
    logger.info('[JourneyContext] Journey ended via context.');
  };

  return (
    <JourneyContext.Provider
      value={{
        isJourneyActive,
        currentJourney,
        emergencyActive,
        latestEmergencyEvent,
        startJourney,
        endJourney,
        sensitivityThreshold,
        setSensitivityThreshold,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
};

export const useJourney = (): JourneyContextType => useContext(JourneyContext);
