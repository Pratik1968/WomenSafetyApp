/**
 * Contact Notification Service — Safety Mode Module
 *
 * Provides a swappable IContactNotificationService interface.
 * The current implementation is SIMULATED: it logs notifications per contact
 * and does not call any real push/SMS/email service.
 *
 * To replace with a real implementation later:
 *   1. Create a class that implements IContactNotificationService
 *   2. Replace the `contactNotificationService` export singleton
 *   3. Safety Mode logic (JourneyContext) requires zero changes
 */

import { JourneyContact, JourneyEmergencyEvent } from '../types/journey.types';
import { logger } from '../../../utils/logger';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IContactNotificationService {
  /**
   * Notify a list of contacts about an emergency event.
   * Implementations MUST be safe to call even with an empty contacts array.
   */
  notifyContacts(
    contacts: JourneyContact[],
    event: JourneyEmergencyEvent
  ): Promise<void>;
}

// ─── Simulated Implementation ────────────────────────────────────────────────

class SimulatedContactNotificationService implements IContactNotificationService {
  async notifyContacts(
    contacts: JourneyContact[],
    event: JourneyEmergencyEvent
  ): Promise<void> {
    if (contacts.length === 0) {
      logger.warn('[ContactNotificationService] No contacts selected for this journey — skipping notification.');
      return;
    }

    logger.info(
      `[ContactNotificationService] 🚨 Simulating emergency notification to ${contacts.length} contact(s) | keyword: "${event.detectedKeyword}" | journeyId: ${event.journeyId}`
    );

    for (const contact of contacts) {
      // Simulate per-contact notification (SMS / push in real impl)
      const message =
        `🚨 EMERGENCY ALERT from Aegis Safety App\n` +
        `${contact.name}, your contact needs help!\n` +
        `Keyword detected: "${event.detectedKeyword}"\n` +
        `Location: ${event.location.address || `${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`}\n` +
        `Time: ${new Date(event.timestamp).toLocaleTimeString()}\n` +
        `Journey ID: ${event.journeyId}`;

      console.log(
        `📱 [ContactNotificationService] Simulated notification → ${contact.name} (${contact.relation}):\n${message}`
      );

      logger.info(
        `[ContactNotificationService] ✅ Notification simulated for ${contact.name} (${contact.relation})`
      );
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/**
 * Swap this singleton to replace the simulated implementation with a real one.
 * JourneyContext imports only IContactNotificationService — zero changes needed there.
 */
export const contactNotificationService: IContactNotificationService =
  new SimulatedContactNotificationService();
