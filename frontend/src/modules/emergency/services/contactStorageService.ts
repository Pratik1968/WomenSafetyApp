/**
 * Storage Service for Emergency Contacts Persistence using AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PhoneContact } from "../../../data/mock";

const CONTACTS_STORAGE_KEY = "@aegis_emergency_contacts";

export const contactStorageService = {
  async getStoredEmergencyContacts(): Promise<PhoneContact[]> {
    try {
      const json = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      if (!json) return [];
      return JSON.parse(json) as PhoneContact[];
    } catch (err) {
      console.error("Failed to read emergency contacts from storage", err);
      return [];
    }
  },

  async saveEmergencyContacts(contacts: PhoneContact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    } catch (err) {
      console.error("Failed to save emergency contacts to storage", err);
    }
  },

  async clearEmergencyContacts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONTACTS_STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear emergency contacts from storage", err);
    }
  },
};
