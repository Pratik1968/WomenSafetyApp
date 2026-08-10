import AsyncStorage from "@react-native-async-storage/async-storage";
import { PhoneContact } from "../data/mock";

const EMERGENCY_CONTACTS_STORAGE_KEY = "@aegis_emergency_contacts";

/**
 * Storage service for emergency contacts using AsyncStorage.
 * This module encapsulates all storage operations so it can easily
 * be swapped for backend API calls without changing UI code.
 */
export const contactStorageService = {
  /**
   * Retrieves stored emergency contacts from local storage.
   */
  async getStoredEmergencyContacts(): Promise<PhoneContact[]> {
    try {
      const json = await AsyncStorage.getItem(EMERGENCY_CONTACTS_STORAGE_KEY);
      if (!json) return [];
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to load emergency contacts from storage:", error);
      return [];
    }
  },

  /**
   * Saves emergency contacts to local storage.
   */
  async saveEmergencyContacts(contacts: PhoneContact[]): Promise<void> {
    try {
      const json = JSON.stringify(contacts);
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_STORAGE_KEY, json);
    } catch (error) {
      console.warn("Failed to save emergency contacts to storage:", error);
    }
  },

  /**
   * Clears emergency contacts from local storage.
   */
  async clearEmergencyContacts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EMERGENCY_CONTACTS_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear emergency contacts from storage:", error);
    }
  },
};
