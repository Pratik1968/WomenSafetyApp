import { useState, useEffect, useCallback } from "react";
import * as Contacts from "expo-contacts/legacy";
import { PhoneContact } from "../data/mock";
import { contactStorageService } from "../services/contactStorageService";
import { API_BASE_URL } from "../api/config";
import { getMyProfile } from "../services/profileService";
import { getAuthHeader } from "../services/firebaseConfig";

export type PermissionStatus = "undetermined" | "granted" | "denied";

export const RELATIONSHIP_OPTIONS = [
  "MOTHER",
  "FATHER",
  "BROTHER",
  "SISTER",
  "HUSBAND",
  "WIFE",
  "GUARDIAN",
  "FRIEND",
  "OTHER",
] as const;
export type RelationshipOption = (typeof RELATIONSHIP_OPTIONS)[number];

export function normalizeRelationship(value?: string | null, fallback: RelationshipOption = "OTHER"): RelationshipOption {
  if (!value) return fallback;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "BEST_FRIEND") return "FRIEND";
  return RELATIONSHIP_OPTIONS.includes(normalized as RelationshipOption)
    ? (normalized as RelationshipOption)
    : fallback;
}


export function formatContact(raw: any, relation: string = "OTHER"): PhoneContact {
  const name = raw.name || [raw.firstName, raw.lastName].filter(Boolean).join(" ") || "Contact";
  const words = name.trim().split(/\s+/);
  const initials = (
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : words[0] ? words[0].substring(0, 2) : "EC"
  ).toUpperCase();

  let phone = "";
  if (Array.isArray(raw.phoneNumbers) && raw.phoneNumbers.length > 0) {
    phone = raw.phoneNumbers[0].number || raw.phoneNumbers[0].digits || "";
  } else if (typeof raw.phone === "string") {
    phone = raw.phone;
  }

  return {
    id: raw.id || `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    initials,
    phone: phone || "No number",
    relation: normalizeRelationship(raw.relationship || raw.relation || relation),
    priority: raw.priority ?? undefined,
  };
}

export function useEmergencyContacts(initialContacts: PhoneContact[] = [], options?: { skipProfileFetch?: boolean }) {
  const skipProfileFetch = options?.skipProfileFetch ?? false;
  const [contacts, setContacts] = useState<PhoneContact[]>(initialContacts);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [deviceContacts, setDeviceContacts] = useState<PhoneContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBackendContacts = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency/contacts/user/${userId}`, {
        headers: await getAuthHeader(),
      });
      if (!response.ok) {
        console.warn(`Failed to load contacts: backend returned ${response.status}`);
        return;
      }
      const data = await response.json();
      const formatted: PhoneContact[] = data.map((item: any) => ({
        ...formatContact(item, item.relationship),
        priority: item.priority ?? undefined,
      }));
      setContacts(formatted);
      await contactStorageService.saveEmergencyContacts(formatted);
    } catch (err) {
      console.warn("Failed to load contacts from backend:", err);
    }
  }, []);

  const refreshContacts = useCallback(async () => {
    if (initialContacts && initialContacts.length > 0) return;
    if (skipProfileFetch) {
      const stored = await contactStorageService.getStoredEmergencyContacts();
      if (stored && stored.length > 0) {
        setContacts(stored);
      }
      return;
    }

    const profile = await getMyProfile();
    const userId = profile?.id;
    if (userId) {
      await loadBackendContacts(userId);
    } else {
      const stored = await contactStorageService.getStoredEmergencyContacts();
      if (stored && stored.length > 0) {
        setContacts(stored);
      }
    }
  }, [initialContacts, loadBackendContacts, skipProfileFetch]);

  // Load profile and this user's saved contacts from the backend
  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  const checkPermission = useCallback(async () => {
    try {
      if (typeof Contacts?.getPermissionsAsync !== "function") {
        return "undetermined";
      }
      const { status } = await Contacts.getPermissionsAsync();
      const mapped: PermissionStatus = status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
      setPermissionStatus(mapped);
      return mapped;
    } catch {
      return "undetermined";
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (typeof Contacts?.requestPermissionsAsync !== "function") {
        setPermissionStatus("granted");
        setIsLoading(false);
        return true;
      }
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        setPermissionStatus("granted");
        setIsLoading(false);
        return true;
      } else {
        setPermissionStatus("denied");
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      setPermissionStatus("denied");
      setError("Unable to request contacts permission.");
      setIsLoading(false);
      return false;
    }
  }, []);

  const fetchDeviceContacts = useCallback(async (): Promise<PhoneContact[]> => {
    try {
      if (typeof Contacts?.getContactsAsync !== "function") {
        return [];
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      if (data && data.length > 0) {
        const formatted = data
          .filter((c) => c.name || c.firstName || c.phoneNumbers?.length)
          .map((c) => formatContact(c));
        setDeviceContacts(formatted);
        return formatted;
      }
    } catch (err) {
      console.warn("Failed to fetch device contacts:", err);
    }
    return [];
  }, []);

  const pickNativeContact = useCallback(async (): Promise<PhoneContact | null> => {
    if (contacts.length >= 5) {
      setError("Maximum limit of 5 emergency contacts reached.");
      return null;
    }
    setIsLoading(true);
    try {
      if (typeof Contacts?.presentContactPickerAsync === "function") {
        const picked = await Contacts.presentContactPickerAsync();
        if (picked) {
          const formatted = formatContact(picked);
          return formatted;
        }
      }
    } catch (err) {
      console.warn("Native contact picker presented error/cancelled:", err);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [contacts.length]);

  const addContact = useCallback(
    async (contact: PhoneContact, relationship: string = "FRIEND", priority?: number): Promise<boolean> => {
      if (contacts.length >= 5) {
        setError("Maximum limit of 5 emergency contacts reached.");
        return false;
      }
      const exists = contacts.some((c) => c.id === contact.id || (c.phone && c.phone === contact.phone));
      if (exists) return false;

      const profile = await getMyProfile();
      const priorityNum = priority ?? contacts.length + 1;
      const normalizedRelationship = normalizeRelationship(relationship, "FRIEND");
      const updatedContact = { ...contact, relation: normalizedRelationship, priority: priorityNum };

      if (profile?.id) {
        try {
          const response = await fetch(`${API_BASE_URL}/emergency/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
            body: JSON.stringify({
              user_id: profile.id,
              name: contact.name,
              phone: contact.phone,
              relationship: normalizedRelationship,
              priority: priorityNum,
            }),
          });
          if (!response.ok) {
            const body = await response.text().catch(() => "");
            setError("Couldn't save this contact online - it's stored on this device for now.");
            console.warn(`Could not save contact to backend (${response.status}):`, body);
          }
        } catch (err) {
          setError("Couldn't save this contact online - it's stored on this device for now.");
          console.warn("Could not save contact to backend:", err);
        }
      }

      const updated = [...contacts, updatedContact];
      setContacts(updated);
      await contactStorageService.saveEmergencyContacts(updated);
      return true;
    },
    [contacts]
  );

  const updateContact = useCallback(
    async (id: string, updates: { relation?: string; priority?: number }) => {
      const existing = contacts.find((c) => c.id === id);
      if (!existing) return false;

      const relation = normalizeRelationship(updates.relation ?? existing.relation, "FRIEND");
      const priority = updates.priority ?? existing.priority ?? 1;
      const updatedContact = { ...existing, relation, priority };

      const profile = await getMyProfile();
      if (profile?.id && !id.startsWith("c_")) {
        try {
          const response = await fetch(`${API_BASE_URL}/emergency/contacts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
            body: JSON.stringify({
              relationship: relation,
              priority,
            }),
          });
          if (!response.ok) {
            setError("Couldn't update this contact online - changes are saved on this device.");
            console.warn(`Could not update contact on backend (${response.status})`);
          }
        } catch (err) {
          setError("Couldn't update this contact online - changes are saved on this device.");
          console.warn("Could not update contact on backend:", err);
        }
      }

      const updated = contacts.map((c) => (c.id === id ? updatedContact : c));
      setContacts(updated);
      await contactStorageService.saveEmergencyContacts(updated);
      return true;
    },
    [contacts]
  );

  const removeContact = useCallback(
    async (id: string) => {
      const profile = await getMyProfile();
      if (profile?.id && !id.startsWith("c_")) {
        try {
          const response = await fetch(`${API_BASE_URL}/emergency/contacts/${id}`, {
            method: "DELETE",
            headers: await getAuthHeader(),
          });
          if (!response.ok && response.status !== 404) {
            console.warn(`Could not remove contact from backend (${response.status})`);
          }
        } catch (err) {
          console.warn("Could not remove contact from backend:", err);
        }
      }
      const updated = contacts.filter((c) => c.id !== id);
      setContacts(updated);
      await contactStorageService.saveEmergencyContacts(updated);
    },
    [contacts]
  );

  const toggleContact = useCallback(
    async (contact: PhoneContact, relationship: string = "FRIEND") => {
      const exists = contacts.some((c) => c.id === contact.id || (c.phone && c.phone === contact.phone));
      if (exists) {
        await removeContact(contact.id);
      } else {
        await addContact(contact, normalizeRelationship(relationship, "FRIEND"));
      }
    },
    [contacts, addContact, removeContact]
  );

  return {
    contacts,
    setContacts,
    permissionStatus,
    setPermissionStatus,
    deviceContacts,
    isLoading,
    error,
    checkPermission,
    requestPermission,
    fetchDeviceContacts,
    pickNativeContact,
    refreshContacts,
    addContact,
    updateContact,
    removeContact,
    toggleContact,
    isMaxReached: contacts.length >= 5,
  };
}

