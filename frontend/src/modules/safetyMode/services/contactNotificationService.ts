/**
 * Contact Notification Service — Safety Mode Module
 *
 * Provides a swappable IContactNotificationService interface.
 */

import { JourneyContact, JourneyEmergencyEvent } from '../types/journey.types';
import { logger } from '../../../utils/logger';

export interface IContactNotificationService {
  /**
   * Notify a list of contacts about an emergency event.
   */
  notifyContacts(
    contacts: JourneyContact[],
    event: JourneyEmergencyEvent
  ): Promise<void>;
}

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
      `[ContactNotificationService] 🚨 Dispatching emergency notification to ${contacts.length} contact(s) | keyword: "${event.detectedKeyword}" | journeyId: ${event.journeyId}`
    );

    for (const contact of contacts) {
      const message =
        `🚨 EMERGENCY ALERT from WomenSafty App\n` +
        `${contact.name}, your contact needs help!\n` +
        `Keyword detected: "${event.detectedKeyword}"\n` +
        `Location: ${event.location.address || `${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`}\n` +
        `Time: ${new Date(event.timestamp).toLocaleTimeString()}\n` +
        `Journey ID: ${event.journeyId}`;

      console.log(
        `📱 [ContactNotificationService] Notification → ${contact.name} (${contact.relation}):\n${message}`
      );

      logger.info(
        `[ContactNotificationService] ✅ Notification processed for ${contact.name} (${contact.relation})`
      );
    }
  }
}

export const contactNotificationService: IContactNotificationService =
  new SimulatedContactNotificationService();
