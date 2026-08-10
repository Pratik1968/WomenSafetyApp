import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { ShieldCheck, ShieldOff, UserCog } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { Badge } from "../components/ds/Badge";
import { AppButton } from "../components/ds/AppButton";
import { AppInput } from "../components/ds/Field";
import { BottomSheet } from "../components/ds/BottomSheet";
import { SkeletonLine } from "../components/ds/SkeletonLine";
import { EmptyState } from "../components/ds/EmptyState";
import { AdminWebOnly } from "./AdminDashboardScreen";
import { listUsers, updateUser } from "../data/admin";
import type { Profile } from "../data/models";
import { formatDate } from "../data/format";

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AdminUsersScreen({ onBack }: { onBack?: () => void }) {
  if (Platform.OS !== "web") return <AdminWebOnly onBack={onBack} />;
  return <AdminUsersContent onBack={onBack} />;
}

export function AdminUsersContent({ onBack }: { onBack?: () => void }) {
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  function load(q?: string) {
    setUsers(null);
    setError(null);
    listUsers(q ? { q } : undefined)
      .then(setUsers)
      .catch((e) => setError(e?.message ?? "Could not load users"));
  }

  useEffect(() => {
    load();
  }, []);

  async function applyPatch(patch: { status?: string; is_admin?: boolean }) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await updateUser(selected.id, patch);
      setUsers((prev) => (prev ?? []).map((u) => (u.id === updated.id ? updated : u)));
      setSelected(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <NavBar title="User management" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <AppInput value={query} onChangeText={setQuery} placeholder="Search name or phone" />
            </View>
            <AppButton size="md" onPress={() => load(query)}>
              Search
            </AppButton>
          </View>

          {error ? (
            <Card style={styles.card}>
              <Text style={styles.errTitle}>{error.includes("admin") ? "Admins only" : "Couldn’t load users"}</Text>
              <Text style={styles.errBody}>{error}</Text>
            </Card>
          ) : users === null ? (
            <Card style={styles.card}>
              <SkeletonLine style={{ width: "50%" }} />
              <SkeletonLine style={{ width: "70%", marginTop: 12 }} />
            </Card>
          ) : users.length === 0 ? (
            <EmptyState title="No users found" body="Try a different search, or seed demo data into your database." />
          ) : (
            <View style={styles.list}>
              {users.map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(u.full_name)}</Text>
                  </View>
                  <View style={styles.userText}>
                    <Text style={styles.userName}>{u.full_name ?? "Unnamed user"}</Text>
                    <Text style={styles.userMeta}>{u.phone ?? "no phone"} · joined {formatDate(u.created_at)}</Text>
                  </View>
                  <View style={styles.userBadges}>
                    {u.is_admin ? <Badge tone="brand">Admin</Badge> : null}
                    <Badge tone={u.status === "suspended" ? "emergency" : "success"}>{u.status}</Badge>
                  </View>
                  <AppButton variant="secondary" size="sm" onPress={() => setSelected(u)}>
                    Manage
                  </AppButton>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name ?? "Manage user"}>
        {selected ? (
          <View style={styles.sheet}>
            <AppButton
              variant="secondary"
              size="md"
              loading={busy}
              leading={selected.status === "suspended" ? <ShieldCheck size={16} color={colors.foreground} /> : <ShieldOff size={16} color={colors.foreground} />}
              onPress={() => applyPatch({ status: selected.status === "suspended" ? "active" : "suspended" })}
            >
              {selected.status === "suspended" ? "Reactivate account" : "Suspend account"}
            </AppButton>
            <AppButton
              size="md"
              loading={busy}
              leading={<UserCog size={16} color={colors.primaryForeground} />}
              onPress={() => applyPatch({ is_admin: !selected.is_admin })}
            >
              {selected.is_admin ? "Revoke admin" : "Make admin"}
            </AppButton>
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  container: { width: "100%", maxWidth: 1040, alignSelf: "center", marginTop: 8 },
  searchRow: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 16 },
  list: { gap: 10 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  userText: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  userMeta: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  userBadges: { flexDirection: "row", gap: 8 },
  card: { padding: 16 },
  errTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  errBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
  sheet: { gap: 12, paddingBottom: 8 },
});
