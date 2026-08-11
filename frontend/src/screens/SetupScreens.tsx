import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, KeyboardAvoidingView, Platform, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Plus, Search, Trash2, UserRound } from "lucide-react-native";
import { NavBar } from "../components/ds/NavBar";
import { Card } from "../components/ds/Card";
import { ProgressBar } from "../components/ds/ProgressBar";
import { SelectRow } from "../components/ds/SelectRow";
import { AppButton } from "../components/ds/AppButton";
import { AppInput, FieldLabel } from "../components/ds/Field";
import { EmptyState } from "../components/ds/EmptyState";
import { BottomSheet } from "../components/ds/BottomSheet";
import { ListItem } from "../components/ds/ListItem";
import { Badge } from "../components/ds/Badge";
import { SuccessCheck } from "../components/ds/SuccessCheck";
import { AuroraHalo } from "../components/ds/Aurora";
import { PHONE_CONTACTS, type PhoneContact } from "../data/mock";
import { useEmergencyContacts } from "../hooks/useEmergencyContacts";
import {
  ContactDetailsSheet,
  formatContactSubtitle,
  nextAvailablePriority,
} from "../components/app/ContactDetailsSheet";
import { colors } from "../theme/tokens";

export const SETUP_STEPS = 6;

/* ------------------------------------------------ shell */

function SetupShell({
  step,
  title,
  subtitle,
  onBack,
  onSkip,
  footer,
  children,
  scroll,
}: {
  step: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSkip?: () => void;
  footer: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll ? { contentContainerStyle: styles.bodyScrollContent } : { style: styles.body };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <NavBar
          onBack={onBack}
          action={
            onSkip ? (
              <Pressable onPress={onSkip}>
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            ) : undefined
          }
        />
        <View style={styles.header}>
          <ProgressBar value={step / SETUP_STEPS} />
          <Text style={styles.stepCaption}>
            Step {step} of {SETUP_STEPS}
          </Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <Body {...bodyProps}>{children}</Body>

        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------------------------------- 1. Name */

export function SetupNameScreen({
  state = "empty",
  onBack,
  onNext,
  onSkip,
}: {
  state?: "empty" | "filled";
  onBack?: () => void;
  onNext?: (name: string) => void;
  onSkip?: () => void;
}) {
  const [name, setName] = useState(state === "filled" ? "Rama Krishna" : "");
  const ok = name.trim().length >= 2;

  return (
    <SetupShell
      step={1}
      title="What should we call you?"
      subtitle="This is the name your emergency contacts will see."
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <AppButton disabled={!ok} onPress={() => onNext?.(name.trim())}>
          Continue
        </AppButton>
      }
    >
      <FieldLabel>Full name</FieldLabel>
      <AppInput value={name} onChangeText={setName} placeholder="Rama Krishna" autoComplete="name" />
    </SetupShell>
  );
}

/* ------------------------------------------ 2. Gender */

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

export function SetupGenderScreen({
  state = "empty",
  onBack,
  onNext,
  onSkip,
}: {
  state?: "empty" | "selected";
  onBack?: () => void;
  onNext?: (gender: string) => void;
  onSkip?: () => void;
}) {
  const [value, setValue] = useState<string | null>(state === "selected" ? "Female" : null);

  return (
    <SetupShell
      step={2}
      title="How do you identify?"
      subtitle="Used only to personalise safety guidance. Never shared."
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <AppButton disabled={!value} onPress={() => onNext?.(value || "")}>
          Continue
        </AppButton>
      }
    >
      <View style={styles.stack}>
        {GENDERS.map((g) => (
          <SelectRow key={g} label={g} selected={value === g} onPress={() => setValue(g)} />
        ))}
      </View>
    </SetupShell>
  );
}

/* -------------------------------------- 3. Blood group */

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export function SetupBloodScreen({
  state = "empty",
  onBack,
  onNext,
  onSkip,
}: {
  state?: "empty" | "selected";
  onBack?: () => void;
  onNext?: (bloodGroup: string) => void;
  onSkip?: () => void;
}) {
  const [value, setValue] = useState<string | null>(state === "selected" ? "O+" : null);

  return (
    <SetupShell
      step={3}
      title="Your blood group"
      subtitle="Responders see this the moment an SOS is raised."
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <AppButton disabled={!value} onPress={() => onNext?.(value || "")}>
          Continue
        </AppButton>
      }
    >
      <View style={styles.bloodGrid}>
        {BLOOD.map((b) => (
          <Pressable
            key={b}
            onPress={() => setValue(b)}
            style={[styles.bloodCell, value === b ? styles.bloodCellSelected : styles.bloodCellIdle]}
          >
            <Text style={[styles.bloodCellText, b === "Unknown" && styles.bloodCellTextSmall, value === b && styles.bloodCellTextSelected]}>
              {b}
            </Text>
          </Pressable>
        ))}
      </View>
    </SetupShell>
  );
}

/* ---------------------------------------------- 4. DOB */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ROW_HEIGHT = 48;

function WheelColumn({ items, active, onSelect }: { items: string[]; active: number; onSelect: (i: number) => void }) {
  const scrollRef = useRef<ScrollView>(null);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.y / ROW_HEIGHT);
      onSelect(Math.max(0, Math.min(items.length - 1, index)));
    },
    [items.length, onSelect],
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheelColumn}
      contentContainerStyle={styles.wheelColumnContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW_HEIGHT}
      decelerationRate="fast"
      contentOffset={{ x: 0, y: active * ROW_HEIGHT }}
      onMomentumScrollEnd={handleMomentumEnd}
    >
      {items.map((item, i) => (
        <View key={item} style={styles.wheelRow}>
          <Text
            style={[
              styles.wheelItem,
              i === active ? styles.wheelItemActive : Math.abs(i - active) === 1 ? styles.wheelItemNear : styles.wheelItemFar,
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function SetupDobScreen({ onBack, onNext }: { onBack?: () => void; onNext?: (dob: string) => void }) {
  const [day, setDay] = useState(13);
  const [month, setMonth] = useState(7);
  const [year, setYear] = useState(24);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);
  const years = useMemo(() => Array.from({ length: 60 }, (_, i) => String(1975 + i)), []);

  const handleContinue = () => {
    const formattedDob = `${years[year]}-${String(month + 1).padStart(2, "0")}-${String(days[day]).padStart(2, "0")}`;
    onNext?.(formattedDob);
  };

  return (
    <SetupShell
      step={4}
      title="When were you born?"
      subtitle="Helps responders confirm your identity quickly."
      onBack={onBack}
      footer={<AppButton onPress={handleContinue}>Continue</AppButton>}
    >
      <Card tone="plain" style={styles.wheelCard}>
        <View style={styles.wheelRail} pointerEvents="none" />
        <View style={styles.wheelRow2}>
          <WheelColumn items={days} active={day} onSelect={setDay} />
          <WheelColumn items={MONTHS} active={month} onSelect={setMonth} />
          <WheelColumn items={years} active={year} onSelect={setYear} />
        </View>
      </Card>
      <Text style={styles.dobCaption}>
        {days[day]} {MONTHS[month]} {years[year]}
      </Text>
    </SetupShell>
  );
}

/* --------------------------------- 5. Emergency contacts */

export type ContactsState = "empty" | "filled" | "max";

export function SetupContactsScreen({
  state,
  onBack,
  onNext,
  onSkip,
}: {
  state?: ContactsState;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
}) {
  const initial = useMemo(() => {
    if (state === "filled") return PHONE_CONTACTS.slice(0, 2);
    if (state === "max") return PHONE_CONTACTS.slice(0, 5);
    return [];
  }, [state]);

  const {
    contacts,
    permissionStatus,
    deviceContacts,
    requestPermission,
    fetchDeviceContacts,
    pickNativeContact,
    addContact,
    updateContact,
    removeContact,
    isMaxReached,
  } = useEmergencyContacts(initial, { skipProfileFetch: !state });

  const effectivePermission = state ? "granted" : permissionStatus;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMode, setDetailsMode] = useState<"add" | "edit">("add");
  const [pendingContact, setPendingContact] = useState<PhoneContact | null>(null);

  const openAddDetails = (contact: PhoneContact) => {
    setPendingContact({ ...contact, priority: nextAvailablePriority(contacts) });
    setDetailsMode("add");
    setDetailsOpen(true);
    setSheetOpen(false);
  };

  const openEditDetails = (contact: PhoneContact) => {
    setPendingContact(contact);
    setDetailsMode("edit");
    setDetailsOpen(true);
  };

  const handleSaveDetails = async (relation: string, priority: number) => {
    if (!pendingContact) return;
    if (detailsMode === "add") {
      await addContact(pendingContact, relation, priority);
    } else {
      await updateContact(pendingContact.id, { relation, priority });
    }
    setDetailsOpen(false);
    setPendingContact(null);
  };

  const handleSelectContacts = async () => {
    if (effectivePermission !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    const picked = await pickNativeContact();
    if (picked) {
      openAddDetails(picked);
      return;
    }

    await fetchDeviceContacts();
    setSheetOpen(true);
  };

  const handleOpenSheet = async () => {
    if (effectivePermission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await fetchDeviceContacts();
    setSheetOpen(true);
  };

  const availableList = permissionStatus === "granted" ? deviceContacts : PHONE_CONTACTS;
  const filteredResults = availableList.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SetupShell
      step={5}
      title="Choose trusted contacts"
      subtitle="People you'd want alerted the second something goes wrong."
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <>
          <AppButton disabled={contacts.length === 0} onPress={onNext}>
            Continue
          </AppButton>
          {contacts.length > 0 ? (
            <Text style={styles.contactsCaption}>{contacts.length}/5 contacts added</Text>
          ) : null}
        </>
      }
    >
      {effectivePermission === "denied" ? (
        <EmptyState
          illustration={<UserRound color={colors.warning} size={36} strokeWidth={1.4} />}
          title="Permission denied"
          body="Contacts permission is required to select emergency contacts for SOS alerts."
          action={
            <View style={{ gap: 8, width: "100%", alignItems: "center" }}>
              <AppButton size="md" onPress={handleSelectContacts}>
                Try Again
              </AppButton>
              <AppButton variant="ghost" size="md" onPress={onSkip || onNext}>
                Skip for Now
              </AppButton>
            </View>
          }
        />
      ) : contacts.length === 0 ? (
        <EmptyState
          illustration={<UserRound color={colors.primary} size={40} strokeWidth={1.5} />}
          title="No contacts yet"
          body="Choose trusted emergency contacts who will be notified during an emergency."
          action={
            <AppButton size="md" leading={<Plus size={18} color={colors.primaryForeground} />} onPress={handleSelectContacts}>
              Select Emergency Contacts
            </AppButton>
          }
        />
      ) : (
        <View style={styles.contactsList}>
          {contacts.map((c) => (
            <ListItem
              key={c.id}
              icon={<Text style={styles.contactInitials}>{c.initials}</Text>}
              title={c.name}
              subtitle={formatContactSubtitle(c)}
              onPress={() => openEditDetails(c)}
              trailing={
                <Pressable
                  accessibilityLabel="Remove contact"
                  accessibilityRole="button"
                  onPress={() => removeContact(c.id)}
                  hitSlop={8}
                >
                  <Trash2 size={18} color={`${colors.mutedForeground}b3`} />
                </Pressable>
              }
            />
          ))}
          {isMaxReached ? (
            <Text style={styles.contactsMax}>You've reached the maximum of 5 contacts.</Text>
          ) : (
            <Pressable onPress={handleSelectContacts} style={styles.contactsAdd}>
              <Plus size={18} color={colors.primary} />
              <Text style={styles.contactsAddText}>Add a contact</Text>
            </Pressable>
          )}
        </View>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Import from contacts">
        <View style={styles.searchRow}>
          <Search size={18} color={colors.mutedForeground} />
          <View style={styles.searchInputWrap}>
            <AppInput value={query} onChangeText={setQuery} placeholder="Search contacts" />
          </View>
        </View>
        {filteredResults.length === 0 ? (
          <Text style={{ textAlign: "center", color: colors.mutedForeground, paddingVertical: 24, fontSize: 14 }}>
            No contacts found.
          </Text>
        ) : (
          filteredResults.map((c) => {
            const picked = contacts.some((x) => x.id === c.id || (x.phone && x.phone === c.phone));
            return (
              <ListItem
                key={c.id}
                icon={<Text style={styles.contactInitials}>{c.initials}</Text>}
                title={c.name}
                subtitle={c.phone}
                selected={picked}
                onPress={() => {
                  if (picked) {
                    const existing = contacts.find((x) => x.id === c.id || (x.phone && x.phone === c.phone));
                    if (existing) openEditDetails(existing);
                  } else {
                    openAddDetails(c);
                  }
                }}
                trailing={
                  <View style={[styles.checkCircle, picked ? styles.checkCirclePicked : styles.checkCircleIdle]}>
                    {picked ? <Check size={16} color={colors.background} /> : null}
                  </View>
                }
              />
            );
          })
        )}
      </BottomSheet>

      <ContactDetailsSheet
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setPendingContact(null);
        }}
        contact={pendingContact}
        mode={detailsMode}
        existingContacts={contacts}
        onSave={handleSaveDetails}
      />
    </SetupShell>
  );
}

/* ------------------------------------------ 6. Medical */

export function SetupMedicalScreen({
  state = "empty",
  onBack,
  onNext,
  onSkip,
}: {
  state?: "empty" | "filled";
  onBack?: () => void;
  onNext?: (medicalInfo: { allergies: string; conditions: string; notes: string }) => void;
  onSkip?: () => void;
}) {
  const filled = state === "filled";
  const [allergies, setAllergies] = useState(filled ? "Penicillin, peanuts" : "");
  const [conditions, setConditions] = useState(filled ? "Asthma" : "");
  const [notes, setNotes] = useState(filled ? "Carries an inhaler in her bag." : "");

  return (
    <SetupShell
      step={6}
      title="Medical information"
      subtitle="Optional, but it can save minutes when every second counts."
      onBack={onBack}
      onSkip={onSkip}
      scroll
      footer={<AppButton onPress={() => onNext?.({ allergies, conditions, notes })}>Continue</AppButton>}
    >
      <View style={styles.medicalStack}>
        <View>
          <FieldLabel>Allergies</FieldLabel>
          <AppInput value={allergies} onChangeText={setAllergies} placeholder="Penicillin, peanuts" />
        </View>
        <View>
          <FieldLabel>Medical conditions</FieldLabel>
          <AppInput value={conditions} onChangeText={setConditions} placeholder="Asthma, diabetes" />
        </View>
        <View>
          <FieldLabel>Emergency notes</FieldLabel>
          <View style={styles.notesBox}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Anything a responder should know"
              placeholderTextColor={`${colors.mutedForeground}b3`}
              style={styles.notesInput}
            />
          </View>
        </View>
      </View>
    </SetupShell>
  );
}

/* ------------------------------------- Setup complete */

export function SetupCompleteScreen({ onDone }: { onDone?: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.completeCenter}>
        <SuccessCheck size={128} />
        <Text style={styles.completeTitle}>You're all set</Text>
        <Text style={styles.completeBody}>Aegis is ready. You can change any of this later in your profile.</Text>
      </View>
      <View style={styles.footer}>
        <AppButton onPress={onDone}>Go to Home</AppButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  skip: { paddingRight: 8, fontSize: 15, fontWeight: "500", color: colors.mutedForeground },
  header: { paddingHorizontal: 32, paddingTop: 4 },
  stepCaption: { marginTop: 12, fontSize: 13, fontWeight: "500", letterSpacing: 0.52, textTransform: "uppercase", color: colors.mutedForeground },
  title: { marginTop: 12, fontSize: 28, lineHeight: 32, fontWeight: "600", letterSpacing: -0.84, color: colors.foreground },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 26, color: colors.mutedForeground },
  body: { flex: 1, paddingHorizontal: 32, paddingTop: 28 },
  bodyScrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 28 },
  footer: { paddingHorizontal: 32, paddingTop: 16, paddingBottom: 16 },
  stack: { gap: 12 },
  bloodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bloodCell: { width: "31%", height: 74, alignItems: "center", justifyContent: "center", borderRadius: 20, borderWidth: 1 },
  bloodCellIdle: { borderColor: colors.border, backgroundColor: colors.surface },
  bloodCellSelected: { borderColor: `${colors.primary}73`, backgroundColor: `${colors.primary}0f` },
  bloodCellText: { fontSize: 19, fontWeight: "600", letterSpacing: -0.19, color: colors.foreground },
  bloodCellTextSmall: { fontSize: 15, fontWeight: "500" },
  bloodCellTextSelected: { color: colors.primary },
  wheelCard: { position: "relative", overflow: "hidden", padding: 0 },
  wheelRail: {
    position: "absolute",
    left: 12,
    right: 12,
    top: "50%",
    height: 48,
    marginTop: -24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${colors.border}cc`,
    backgroundColor: `${colors.primary}0d`,
  },
  wheelRow2: { flexDirection: "row", paddingHorizontal: 8 },
  wheelColumn: { flex: 1, height: 176 },
  wheelColumnContent: { paddingVertical: 64 },
  wheelRow: { height: ROW_HEIGHT, alignItems: "center", justifyContent: "center" },
  wheelItem: { fontSize: 19, color: colors.foreground },
  wheelItemActive: { fontWeight: "600" },
  wheelItemNear: { color: colors.mutedForeground },
  wheelItemFar: { color: `${colors.mutedForeground}73` },
  dobCaption: { marginTop: 16, textAlign: "center", fontSize: 15, color: colors.mutedForeground },
  contactsCaption: { marginTop: 16, textAlign: "center", fontSize: 13, color: colors.mutedForeground },
  contactsList: { gap: 8 },
  contactInitials: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  contactsMax: { paddingHorizontal: 12, paddingTop: 8, fontSize: 14, color: colors.mutedForeground },
  contactsAdd: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  contactsAddText: { fontSize: 16, fontWeight: "500", color: colors.primary },
  searchRow: {
    marginHorizontal: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  searchInputWrap: { flex: 1 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checkCircleIdle: { borderWidth: 1, borderColor: colors.border },
  checkCirclePicked: { backgroundColor: colors.primary },
  medicalStack: { gap: 20, paddingBottom: 8 },
  notesBox: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 },
  notesInput: { fontSize: 17, lineHeight: 24, color: colors.foreground, textAlignVertical: "top" },
  completeCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  completeTitle: { marginTop: 32, fontSize: 30, lineHeight: 34, fontWeight: "600", letterSpacing: -0.9, color: colors.foreground, textAlign: "center" },
  completeBody: { marginTop: 12, fontSize: 16, lineHeight: 26, color: colors.mutedForeground, textAlign: "center" },
});
