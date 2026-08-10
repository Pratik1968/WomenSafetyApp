import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import {
  Settings as SettingsIcon,
  Users,
  HeartPulse,
  Watch,
  Lock,
  CircleHelp,
  Info,
  LogOut,
  Moon,
  Globe,
  Bell,
  ShieldCheck,
  Trash2,
} from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { Dialog } from "../components/ds/Dialog";
import { NavBar } from "../components/ds/NavBar";
import { ProfileCard } from "../components/ds/ProfileCard";
import { SectionHeader } from "../components/ds/SectionHeader";
import { SettingRow } from "../components/ds/SettingRow";
import { Toggle } from "../components/ds/Toggle";
import { BottomNav, type TabKey } from "../components/app/BottomNav";

export type ProfileState = "default" | "updated";

const USER = {
  firstName: "Aisha Patel",
  initials: "AP",
  phone: "+91 98450 33127",
};

export function ProfileScreen({
  onTab,
  onSettings,
  onPrivacy,
  onAssistant,
  onSos,
}: {
  onTab?: (t: TabKey) => void;
  onSettings?: () => void;
  onPrivacy?: () => void;
  onAssistant?: () => void;
  onSos?: () => void;
}) {
  return (
    <View style={styles.screen}>
      <NavBar
        title="Profile"
        action={
          <Pressable onPress={onSettings} accessibilityLabel="Settings" style={styles.settingsIconBtn}>
            <SettingsIcon size={18} color={colors.foreground} />
          </Pressable>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProfileCard initials={USER.initials} name={USER.firstName} meta={`${USER.phone} · Verified`} />

        <View style={styles.statsGrid}>
          {[
            { label: "Journeys", value: "34" },
            { label: "Contacts", value: "4" },
            { label: "Reports", value: "6" },
          ].map((s) => (
            <Card key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Safety profile" />
          <Card style={styles.listCard}>
            <SettingRow icon={<Users size={17} color={colors.primary} />} title="Emergency contacts" subtitle="4 of 5 added" />
            <SettingRow icon={<HeartPulse size={17} color={colors.primary} />} title="Medical information" subtitle="Blood group B+ · 1 allergy" />
            <SettingRow
              icon={<Watch size={17} color={colors.primary} />}
              title="Connected devices"
              subtitle="Apple Watch · connected"
              trailing={<Badge tone="success">Live</Badge>}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Preferences" />
          <Card style={styles.listCard}>
            <SettingRow icon={<SettingsIcon size={17} color={colors.primary} />} title="Settings" subtitle="Theme, language, notifications" onPress={onSettings} />
            <SettingRow icon={<Lock size={17} color={colors.primary} />} title="Data & privacy" subtitle="See what we keep — and wipe it" onPress={onPrivacy} />
            <SettingRow icon={<CircleHelp size={17} color={colors.primary} />} title="Support" subtitle="We reply within a day" />
            <SettingRow icon={<Info size={17} color={colors.primary} />} title="About Aegis" subtitle="Version 1.0.4" />
          </Card>
        </View>

        <View style={styles.section}>
          <Card style={styles.listCard}>
            <SettingRow icon={<LogOut size={17} color={colors.destructive} />} title="Log out" tone="danger" trailing={<View />} />
          </Card>
        </View>
      </ScrollView>

      <BottomNav active="profile" onSelect={onTab} onAssistant={onAssistant} onSos={onSos} />
    </View>
  );
}

export function SettingsScreen({
  onBack,
  onPrivacy,
}: {
  onBack?: () => void;
  onPrivacy?: () => void;
}) {
  const [dark, setDark] = useState(false);
  const [alerts, setAlerts] = useState(true);

  return (
    <View style={styles.screen}>
      <NavBar title="Settings" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SectionHeader title="Appearance" />
        <Card style={styles.listCard}>
          <SettingRow
            icon={<Moon size={17} color={colors.primary} />}
            title="Dark mode"
            subtitle="Easier on the eyes at night"
            trailing={<Toggle on={dark} onChange={setDark} />}
          />
          <SettingRow icon={<Globe size={17} color={colors.primary} />} title="Language" subtitle="English (India)" />
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Notifications" />
          <Card style={styles.listCard}>
            <SettingRow
              icon={<Bell size={17} color={colors.primary} />}
              title="Area alerts"
              subtitle="When reports rise near you"
              trailing={<Toggle on={alerts} onChange={setAlerts} />}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Privacy" />
          <Card style={styles.listCard}>
            <SettingRow icon={<Lock size={17} color={colors.primary} />} title="Data & privacy" subtitle="What we keep, and for how long" onPress={onPrivacy} />
            <SettingRow icon={<Trash2 size={17} color={colors.destructive} />} title="Delete account" subtitle="Removes everything, permanently" tone="danger" />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

export function DataPrivacyScreen({
  state = "default",
  onBack,
}: {
  state?: "default" | "confirm" | "wiped";
  onBack?: () => void;
}) {
  return (
    <View style={styles.screen}>
      <NavBar title="Data & privacy" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.privacyHeroCard}>
          <Lock size={24} color={colors.primary} />
          <Text style={styles.privacyHeroTitle}>Your data is yours. Only yours.</Text>
          <Text style={styles.privacyHeroSub}>
            We never sell, share or advertise on your data. Your location is visible only to chosen contacts.
          </Text>
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Wipe your data" />
          <Card style={styles.wipeCard}>
            <Text style={styles.wipeText}>You can erase everything Aegis has collected at any time.</Text>
            <View style={styles.wipeButtons}>
              <AppButton variant="destructive" size="md">
                Wipe all my data
              </AppButton>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  settingsIconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  statsGrid: { flexDirection: "row", gap: 10, marginVertical: 16 },
  statCard: { flex: 1, padding: 14, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  section: { marginBottom: 20 },
  listCard: { padding: 4 },
  privacyHeroCard: { padding: 20, gap: 8, backgroundColor: `${colors.primary}10`, marginBottom: 16 },
  privacyHeroTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  privacyHeroSub: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20 },
  wipeCard: { padding: 16, gap: 12 },
  wipeText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  wipeButtons: { marginTop: 4 },
});
