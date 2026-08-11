import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BottomSheet } from "../ds/BottomSheet";
import { SelectRow } from "../ds/SelectRow";
import { AppButton } from "../ds/AppButton";
import { FieldLabel } from "../ds/Field";
import { RELATIONSHIP_OPTIONS, normalizeRelationship } from "../../hooks/useEmergencyContacts";
import type { PhoneContact } from "../../data/mock";
import { colors } from "../../theme/tokens";

export function formatRelationLabel(relation: string): string {
  if (!relation) return "Other";
  return relation
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatContactSubtitle(contact: PhoneContact): string {
  const parts = [formatRelationLabel(contact.relation)];
  if (contact.priority) parts.push(`Priority ${contact.priority}`);
  parts.push(contact.phone);
  return parts.join(" · ");
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "First to notify",
  2: "Second to notify",
  3: "Third to notify",
  4: "Fourth to notify",
  5: "Fifth to notify",
};

export function nextAvailablePriority(contacts: PhoneContact[]): number {
  const used = new Set(contacts.map((c) => c.priority).filter(Boolean));
  for (let i = 1; i <= 5; i++) {
    if (!used.has(i)) return i;
  }
  return Math.min(contacts.length + 1, 5);
}

export function ContactDetailsSheet({
  open,
  onClose,
  contact,
  mode,
  existingContacts,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  contact: PhoneContact | null;
  mode: "add" | "edit";
  existingContacts: PhoneContact[];
  onSave: (relation: string, priority: number) => void;
}) {
  const [relation, setRelation] = useState("FRIEND");
  const relationRef = useRef("FRIEND");
  const [priority, setPriority] = useState(1);

  const selectRelation = (nextRelation: string) => {
    const normalized = normalizeRelationship(nextRelation, "FRIEND");
    relationRef.current = normalized;
    setRelation(normalized);
  };

  useEffect(() => {
    if (!open || !contact) return;
    const normalized = normalizeRelationship(contact.relation, "FRIEND");
    selectRelation(mode === "add" && normalized === "OTHER" ? "FRIEND" : normalized);
  }, [open, contact?.id, contact?.relation, mode]);

  useEffect(() => {
    if (!open || !contact) return;
    setPriority(contact.priority ?? nextAvailablePriority(existingContacts));
  }, [open, contact?.id, contact?.priority, existingContacts]);

  const priorityOptions = useMemo(() => {
    return [1, 2, 3, 4, 5].map((value) => {
      const takenBy = existingContacts.find(
        (c) => c.priority === value && c.id !== contact?.id
      );
      const description = takenBy
        ? `${PRIORITY_LABELS[value]} · currently ${takenBy.name}`
        : PRIORITY_LABELS[value];
      return { value, description };
    });
  }, [contact?.id, existingContacts]);

  if (!contact) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Contact details" : "Edit contact"}
    >
      <View style={styles.contactHeader}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
      </View>

      <FieldLabel>Relationship</FieldLabel>
      <View style={styles.optionGroup}>
        {RELATIONSHIP_OPTIONS.map((option) => (
          <SelectRow
            key={option}
            label={formatRelationLabel(option)}
            selected={relation === option}
            onPress={() => selectRelation(option)}
          />
        ))}
      </View>

      <FieldLabel>Notify priority</FieldLabel>
      <View style={styles.optionGroup}>
        {priorityOptions.map(({ value, description }) => (
          <SelectRow
            key={value}
            label={`Priority ${value}`}
            description={description}
            selected={priority === value}
            onPress={() => setPriority(value)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton onPress={() => onSave(normalizeRelationship(relationRef.current, "FRIEND"), priority)}>
          {mode === "add" ? "Add contact" : "Save changes"}
        </AppButton>
        <AppButton variant="ghost" size="md" onPress={onClose}>
          Cancel
        </AppButton>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contactHeader: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  contactName: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.foreground,
  },
  contactPhone: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  optionGroup: {
    gap: 8,
    marginBottom: 16,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
});
