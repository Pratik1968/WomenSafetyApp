import { useState, useEffect, useCallback } from "react";
import * as Contacts from "expo-contacts/legacy";
import { PhoneContact } from "../data/mock";
import { contactStorageService } from "../services/contactStorageService";
import { supabase } from "../services/supabaseClient";
import { getMyProfile } from "../services/profileService";

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
    relation: raw.relationship || raw.relation || relation,
  };
}

export function useEmergencyContacts(initialContacts: PhoneContact[] = []) {
  const [contacts, setContacts] = useState<PhoneContact[]>(initialContacts);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [deviceContacts, setDeviceContacts] = useState<PhoneContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSupabaseContacts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("priority", { ascending: true });

      if (!error && data) {
        const formatted: PhoneContact[] = data.map((item: any) => formatContact(item, item.relationship));
        setContacts(formatted);
        await contactStorageService.saveEmergencyContacts(formatted);
      }
    } catch (err) {
      console.warn("Failed to load contacts from Supabase:", err);
    }
  }, []);

  // Load profile and setup real-time contacts sync
  useEffect(() => {
    let channel: any = null;
    (async () => {
      if (initialContacts && initialContacts.length > 0) return;

      const profile = await getMyProfile();
      const userId = profile?.id;
      if (userId) {
        await loadSupabaseContacts(userId);

        channel = supabase
          .channel("emergency_contacts_changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "emergency_contacts", filter: `user_id=eq.${userId}` },
            () => loadSupabaseContacts(userId)
          )
          .subscribe();
      } else {
        const stored = await contactStorageService.getStoredEmergencyContacts();
        if (stored && stored.length > 0) {
          setContacts(stored);
        }
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [initialContacts, loadSupabaseContacts]);

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
      const updatedContact = { ...contact, relation: relationship };

      if (profile?.id) {
        const priorityNum = priority ?? contacts.length + 1;
        const { error: dbError } = await supabase.from("emergency_contacts").insert({
          user_id: profile.id,
          name: contact.name,
          phone: contact.phone,
          relationship: relationship,
          priority: priorityNum,
        });

        if (dbError) {
          console.warn("Could not save contact to Supabase:", dbError.message);
        }
      }

      const updated = [...contacts, updatedContact];
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
        await supabase.from("emergency_contacts").delete().eq("id", id);
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
        await addContact(contact, relationship);
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
    addContact,
    removeContact,
    toggleContact,
    isMaxReached: contacts.length >= 5,
  };
}
